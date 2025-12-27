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

interface StudentNotification {
  userId: string;
  email: string;
  fullName: string;
  classTitle: string;
  minutesUntil: number;
  classId: string;
  scheduledAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking for upcoming classes to send reminders...");

    const now = new Date();
    const notifications: StudentNotification[] = [];

    // Check for classes starting in ~30 minutes (28-32 min window)
    const thirtyMinWindowStart = new Date(now.getTime() + 28 * 60 * 1000);
    const thirtyMinWindowEnd = new Date(now.getTime() + 32 * 60 * 1000);

    const { data: thirtyMinClasses, error: thirtyMinError } = await supabase
      .from("live_classes")
      .select("id, title, course_id, scheduled_at")
      .eq("status", "scheduled")
      .gte("scheduled_at", thirtyMinWindowStart.toISOString())
      .lt("scheduled_at", thirtyMinWindowEnd.toISOString());

    if (thirtyMinError) {
      console.error("Error fetching 30-min classes:", thirtyMinError);
    } else {
      console.log(`Found ${thirtyMinClasses?.length || 0} classes starting in ~30 minutes`);
      
      for (const liveClass of thirtyMinClasses || []) {
        if (!liveClass.course_id) continue;

        const { data: enrollments } = await supabase
          .from("academy_enrollments")
          .select("user_id")
          .eq("course_id", liveClass.course_id)
          .eq("status", "active");

        for (const enrollment of enrollments || []) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", enrollment.user_id)
            .maybeSingle();

          const { data: { user: userData } } = await supabase.auth.admin.getUserById(enrollment.user_id);

          if (userData?.email) {
            notifications.push({
              userId: enrollment.user_id,
              email: userData.email,
              fullName: profile?.full_name || "Student",
              classTitle: liveClass.title,
              minutesUntil: 30,
              classId: liveClass.id,
              scheduledAt: liveClass.scheduled_at,
            });
          }
        }
      }
    }

    // Check for classes starting in ~5 minutes (3-7 min window)
    const fiveMinWindowStart = new Date(now.getTime() + 3 * 60 * 1000);
    const fiveMinWindowEnd = new Date(now.getTime() + 7 * 60 * 1000);

    const { data: fiveMinClasses, error: fiveMinError } = await supabase
      .from("live_classes")
      .select("id, title, course_id, scheduled_at")
      .eq("status", "scheduled")
      .gte("scheduled_at", fiveMinWindowStart.toISOString())
      .lt("scheduled_at", fiveMinWindowEnd.toISOString());

    if (fiveMinError) {
      console.error("Error fetching 5-min classes:", fiveMinError);
    } else {
      console.log(`Found ${fiveMinClasses?.length || 0} classes starting in ~5 minutes`);
      
      for (const liveClass of fiveMinClasses || []) {
        if (!liveClass.course_id) continue;

        const { data: enrollments } = await supabase
          .from("academy_enrollments")
          .select("user_id")
          .eq("course_id", liveClass.course_id)
          .eq("status", "active");

        for (const enrollment of enrollments || []) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", enrollment.user_id)
            .maybeSingle();

          const { data: { user: userData } } = await supabase.auth.admin.getUserById(enrollment.user_id);

          if (userData?.email) {
            notifications.push({
              userId: enrollment.user_id,
              email: userData.email,
              fullName: profile?.full_name || "Student",
              classTitle: liveClass.title,
              minutesUntil: 5,
              classId: liveClass.id,
              scheduledAt: liveClass.scheduled_at,
            });
          }
        }
      }
    }

    console.log(`Sending ${notifications.length} reminder notifications`);

    let pushSent = 0;
    let emailSent = 0;

    // Send notifications
    for (const notification of notifications) {
      // Send push notification
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userIds: [notification.userId],
            title: notification.minutesUntil === 5 ? "🔴 Class Starting Soon!" : "📚 Class Reminder",
            body: `${notification.classTitle} starts in ${notification.minutesUntil} minutes`,
            icon: "/pwa-192x192.png",
            data: { 
              type: "class_reminder",
              classId: notification.classId,
            },
          },
        });
        pushSent++;
      } catch (err) {
        console.error("Error sending push notification:", err);
      }

      // Send email reminder via Resend
      try {
        const formattedTime = new Date(notification.scheduledAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const title = notification.minutesUntil === 5 ? '🔴 Class Starting Soon!' : '📚 Class Reminder';
        const content = `
          <p>
            ${notification.minutesUntil === 5
              ? `Your class <strong class="highlight">${notification.classTitle}</strong> is starting in just <strong class="highlight">5 minutes</strong>!`
              : `This is a friendly reminder that your class <strong class="highlight">${notification.classTitle}</strong> starts in <strong>30 minutes</strong>.`
            }
          </p>
          <div style="background: #f0f2f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
            <p style="margin: 0 0 10px 0;"><strong>Class:</strong> ${notification.classTitle}</p>
            <p style="margin: 0;"><strong>Time:</strong> ${formattedTime}</p>
          </div>
          <p>
            ${notification.minutesUntil === 5
              ? "Join now to make sure you don't miss anything!"
              : "Make sure to prepare and be ready on time!"
            }
          </p>
          <div style="text-align: center;">
            <a href="https://app.lmvacademy.com/class/${notification.classId}" class="button">Join Class Now</a>
          </div>
        `;

        const emailHtml = getEmailTemplate({
          title,
          name: notification.fullName,
          content,
        });

        const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";

        await resend.emails.send({
          from: `LMV Academy <${fromEmail}>`,
          to: [notification.email],
          subject: notification.minutesUntil === 5 
            ? `🔴 ${notification.classTitle} is starting in 5 minutes!`
            : `📚 Reminder: ${notification.classTitle} starts at ${formattedTime}`,
          html: emailHtml,
        });
        emailSent++;
      } catch (err) {
        console.error("Error sending email:", err);
      }
    }

    console.log(`Sent ${pushSent} push notifications and ${emailSent} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
        pushSent,
        emailSent,
        thirtyMinClasses: thirtyMinClasses?.length || 0,
        fiveMinClasses: fiveMinClasses?.length || 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-class-reminder function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
