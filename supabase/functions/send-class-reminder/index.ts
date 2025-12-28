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

interface TutorNotification {
  userId: string;
  email: string;
  fullName: string;
  classTitle: string;
  minutesUntil: number;
  classId: string;
  scheduledAt: string;
  roomUrl: string | null;
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
    console.log("Checking for upcoming classes to send reminders...");

    const now = new Date();
    const studentNotifications: StudentNotification[] = [];
    const tutorNotifications: TutorNotification[] = [];

    // Check for classes starting in exactly 30 minutes (28-32 min window)
    const thirtyMinWindowStart = new Date(now.getTime() + 28 * 60 * 1000);
    const thirtyMinWindowEnd = new Date(now.getTime() + 32 * 60 * 1000);

    const { data: thirtyMinClasses, error: thirtyMinError } = await supabase
      .from("live_classes")
      .select("id, title, course_id, scheduled_at, host_id, daily_room_url")
      .eq("status", "scheduled")
      .gte("scheduled_at", thirtyMinWindowStart.toISOString())
      .lt("scheduled_at", thirtyMinWindowEnd.toISOString());

    if (thirtyMinError) {
      console.error("Error fetching 30-min classes:", thirtyMinError);
    } else {
      console.log(`Found ${thirtyMinClasses?.length || 0} classes starting in ~30 minutes`);
      
      for (const liveClass of thirtyMinClasses || []) {
        // Notify tutor
        const { data: tutorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", liveClass.host_id)
          .maybeSingle();

        const { data: { user: tutorData } } = await supabase.auth.admin.getUserById(liveClass.host_id);

        if (tutorData?.email) {
          tutorNotifications.push({
            userId: liveClass.host_id,
            email: tutorData.email,
            fullName: tutorProfile?.full_name || "Tutor",
            classTitle: liveClass.title,
            minutesUntil: 30,
            classId: liveClass.id,
            scheduledAt: liveClass.scheduled_at,
            roomUrl: liveClass.daily_room_url,
          });
        }

        // Notify students
        if (liveClass.course_id) {
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
              studentNotifications.push({
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
    }

    // Check for classes starting in exactly 5 minutes (3-7 min window)
    const fiveMinWindowStart = new Date(now.getTime() + 3 * 60 * 1000);
    const fiveMinWindowEnd = new Date(now.getTime() + 7 * 60 * 1000);

    const { data: fiveMinClasses, error: fiveMinError } = await supabase
      .from("live_classes")
      .select("id, title, course_id, scheduled_at, host_id, daily_room_url")
      .eq("status", "scheduled")
      .gte("scheduled_at", fiveMinWindowStart.toISOString())
      .lt("scheduled_at", fiveMinWindowEnd.toISOString());

    if (fiveMinError) {
      console.error("Error fetching 5-min classes:", fiveMinError);
    } else {
      console.log(`Found ${fiveMinClasses?.length || 0} classes starting in ~5 minutes`);
      
      for (const liveClass of fiveMinClasses || []) {
        // Notify tutor
        const { data: tutorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", liveClass.host_id)
          .maybeSingle();

        const { data: { user: tutorData } } = await supabase.auth.admin.getUserById(liveClass.host_id);

        if (tutorData?.email) {
          tutorNotifications.push({
            userId: liveClass.host_id,
            email: tutorData.email,
            fullName: tutorProfile?.full_name || "Tutor",
            classTitle: liveClass.title,
            minutesUntil: 5,
            classId: liveClass.id,
            scheduledAt: liveClass.scheduled_at,
            roomUrl: liveClass.daily_room_url,
          });
        }

        // Notify students
        if (liveClass.course_id) {
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
              studentNotifications.push({
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
    }

    console.log(`Sending ${studentNotifications.length} student and ${tutorNotifications.length} tutor reminders`);

    let pushSent = 0;
    let emailSent = 0;

    // Send student notifications
    for (const notification of studentNotifications) {
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

      // Send email reminder
      try {
        const formattedTime = formatTimeZambia(notification.scheduledAt);

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
            <p style="margin: 0;"><strong>Time:</strong> ${formattedTime} (Zambia Time)</p>
          </div>
          <p>
            ${notification.minutesUntil === 5
              ? "Join now to make sure you don't miss anything!"
              : "Make sure to prepare and be ready on time!"
            }
          </p>
          <div style="text-align: center;">
            <a href="https://app.lmvacademy.com/live-class/${notification.classId}" class="button">Join Class Now</a>
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

    // Send tutor notifications
    for (const notification of tutorNotifications) {
      // Send push notification to tutor
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userIds: [notification.userId],
            title: notification.minutesUntil === 5 ? "🔴 Your Class Starts in 5 Minutes!" : "⏰ Class in 30 Minutes",
            body: `${notification.classTitle} - Get ready to start teaching!`,
            icon: "/pwa-192x192.png",
            data: { 
              type: "tutor_class_reminder",
              classId: notification.classId,
            },
          },
        });
        pushSent++;
      } catch (err) {
        console.error("Error sending tutor push notification:", err);
      }

      // Send email reminder to tutor
      try {
        const formattedTime = formatTimeZambia(notification.scheduledAt);
        const hostLink = notification.roomUrl || `https://app.lmvacademy.com/live-class/${notification.classId}`;

        const title = notification.minutesUntil === 5 ? '🔴 Your Class Starts in 5 Minutes!' : '⏰ Class Starting in 30 Minutes';
        const content = `
          <p>
            ${notification.minutesUntil === 5
              ? `Your class <strong class="highlight">${notification.classTitle}</strong> is starting in just <strong class="highlight">5 minutes</strong>!`
              : `This is a reminder that your class <strong class="highlight">${notification.classTitle}</strong> starts in <strong>30 minutes</strong>.`
            }
          </p>
          <div style="background: #f0f2f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
            <p style="margin: 0 0 10px 0;"><strong>Class:</strong> ${notification.classTitle}</p>
            <p style="margin: 0;"><strong>Time:</strong> ${formattedTime} (Zambia Time)</p>
          </div>
          <p>
            ${notification.minutesUntil === 5
              ? "Your students are waiting! Click below to start teaching."
              : "Get ready to engage with your students. Make sure your setup is ready."
            }
          </p>
          <div style="text-align: center;">
            <a href="${hostLink}" class="button">Start Your Class</a>
          </div>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            You can also access your class from the Teach Dashboard in the app.
          </p>
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
            ? `🔴 Your class "${notification.classTitle}" starts in 5 minutes!`
            : `⏰ Reminder: Your class "${notification.classTitle}" at ${formattedTime}`,
          html: emailHtml,
        });
        emailSent++;
      } catch (err) {
        console.error("Error sending tutor email:", err);
      }
    }

    console.log(`Sent ${pushSent} push notifications and ${emailSent} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        studentNotificationsSent: studentNotifications.length,
        tutorNotificationsSent: tutorNotifications.length,
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
