import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailTemplate } from '../_shared/email-template.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface TutorDaySchedule {
  tutorId: string;
  tutorEmail: string;
  tutorName: string;
  classes: {
    id: string;
    title: string;
    scheduledAt: string;
    roomUrl: string | null;
    courseName: string | null;
  }[];
}

// Helper to format time in Zambia timezone (CAT - UTC+2)
const formatTimeZambia = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lusaka'
  });
};

const formatDateZambia = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lusaka'
  });
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Sending daily schedule emails to tutors with classes today...");

    // Get today's date range in Zambia timezone (CAT - UTC+2)
    // This function is designed to be called at 8am Zambia time
    const now = new Date();
    
    // Calculate start of today in Zambia time (midnight CAT)
    // CAT is UTC+2, so we need to find the UTC time that corresponds to midnight in Zambia
    const zambiaOffset = 2 * 60; // 2 hours in minutes
    const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const zambiaTime = new Date(utcNow + (zambiaOffset * 60 * 1000));
    
    // Get start and end of day in Zambia time
    const startOfDayZambia = new Date(zambiaTime);
    startOfDayZambia.setHours(0, 0, 0, 0);
    
    const endOfDayZambia = new Date(zambiaTime);
    endOfDayZambia.setHours(23, 59, 59, 999);
    
    // Convert back to UTC for database query
    const startOfDayUTC = new Date(startOfDayZambia.getTime() - (zambiaOffset * 60 * 1000));
    const endOfDayUTC = new Date(endOfDayZambia.getTime() - (zambiaOffset * 60 * 1000));
    
    console.log(`Checking for classes between ${startOfDayUTC.toISOString()} and ${endOfDayUTC.toISOString()}`);

    // Get all classes scheduled for today
    const { data: todayClasses, error: classError } = await supabase
      .from("live_classes")
      .select(`
        id, 
        title, 
        host_id, 
        scheduled_at, 
        daily_room_url,
        course_id,
        academy_courses(name)
      `)
      .in("status", ["scheduled", "live"])
      .gte("scheduled_at", startOfDayUTC.toISOString())
      .lte("scheduled_at", endOfDayUTC.toISOString())
      .order("scheduled_at", { ascending: true });

    if (classError) {
      console.error("Error fetching today's classes:", classError);
      throw classError;
    }

    console.log(`Found ${todayClasses?.length || 0} classes scheduled for today`);

    if (!todayClasses || todayClasses.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No classes scheduled for today",
          emailsSent: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Group classes by tutor
    const tutorSchedules = new Map<string, TutorDaySchedule>();

    for (const liveClass of todayClasses) {
      if (!tutorSchedules.has(liveClass.host_id)) {
        // Fetch tutor info
        const { data: tutorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", liveClass.host_id)
          .maybeSingle();

        const { data: { user: tutorData } } = await supabase.auth.admin.getUserById(liveClass.host_id);

        if (tutorData?.email) {
          tutorSchedules.set(liveClass.host_id, {
            tutorId: liveClass.host_id,
            tutorEmail: tutorData.email,
            tutorName: tutorProfile?.full_name || "Tutor",
            classes: [],
          });
        }
      }

      const tutorSchedule = tutorSchedules.get(liveClass.host_id);
      if (tutorSchedule) {
        tutorSchedule.classes.push({
          id: liveClass.id,
          title: liveClass.title,
          scheduledAt: liveClass.scheduled_at,
          roomUrl: liveClass.daily_room_url,
          courseName: (liveClass.academy_courses as any)?.name || null,
        });
      }
    }

    console.log(`Sending daily schedule to ${tutorSchedules.size} tutors`);

    let emailsSent = 0;
    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    const todayFormatted = formatDateZambia(now.toISOString());

    for (const [, schedule] of tutorSchedules) {
      try {
        // Build class schedule HTML
        const classListHtml = schedule.classes.map((cls, index) => {
          const timeFormatted = formatTimeZambia(cls.scheduledAt);
          const hostLink = cls.roomUrl || `https://app.lmvacademy.com/live-class/${cls.id}`;
          
          return `
            <div style="background: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'}; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #0ea5e9;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div>
                  <p style="margin: 0 0 5px 0; font-weight: 600; color: #1a1a1a;">${cls.title}</p>
                  ${cls.courseName ? `<p style="margin: 0; font-size: 12px; color: #666;">Course: ${cls.courseName}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-weight: 600; color: #0ea5e9;">${timeFormatted}</p>
                  <a href="${hostLink}" style="font-size: 12px; color: #0ea5e9;">Start Class →</a>
                </div>
              </div>
            </div>
          `;
        }).join('');

        const title = `📅 Your Teaching Schedule for Today`;
        const content = `
          <p>Good morning! Here's your class schedule for <strong>${todayFormatted}</strong>:</p>
          
          <div style="margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">Today's Classes (${schedule.classes.length})</h3>
            ${classListHtml}
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #0369a1;">
              <strong>💡 Reminder:</strong> You'll receive notifications 30 minutes and 5 minutes before each class starts.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="https://app.lmvacademy.com/teach" class="button">Open Teach Dashboard</a>
          </div>
          
          <p style="font-size: 12px; color: #666; margin-top: 20px; text-align: center;">
            All times shown are in Zambia Time (CAT)
          </p>
        `;

        const emailHtml = getEmailTemplate({
          title,
          name: schedule.tutorName,
          content,
        });

        await resend.emails.send({
          from: `LMV Academy <${fromEmail}>`,
          to: [schedule.tutorEmail],
          subject: `📅 Your ${schedule.classes.length} class${schedule.classes.length > 1 ? 'es' : ''} for ${todayFormatted}`,
          html: emailHtml,
        });

        emailsSent++;
        console.log(`Sent daily schedule to ${schedule.tutorEmail}`);
      } catch (err) {
        console.error(`Error sending schedule to ${schedule.tutorEmail}:`, err);
      }
    }

    console.log(`Successfully sent ${emailsSent} daily schedule emails`);

    return new Response(
      JSON.stringify({
        success: true,
        tutorsNotified: tutorSchedules.size,
        emailsSent,
        totalClasses: todayClasses.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-tutor-daily-schedule function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
