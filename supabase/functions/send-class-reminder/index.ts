import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const getEmailHtml = (notification: StudentNotification, formattedTime: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px; }
      .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
      .header { background: linear-gradient(135deg, #2A5A6A 0%, #1a3d47 100%); padding: 40px 30px; text-align: center; }
      .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
      .tagline { color: rgba(255, 255, 255, 0.8); font-size: 14px; }
      .content { padding: 40px 30px; }
      h1 { color: #ffffff; font-size: 24px; margin: 0 0 20px 0; }
      p { color: #b8b8b8; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
      .button { display: inline-block; background: linear-gradient(135deg, #2A5A6A 0%, #3d7a8a 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
      .info-box { background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin: 20px 0; }
      .info-item { color: #b8b8b8; margin: 10px 0; }
      .footer { padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); }
      .footer p { color: #666; font-size: 12px; margin: 0; }
      .urgent { color: #ff6b6b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">LMV ACADEMY</div>
        <div class="tagline">Luminary Innovision Academy</div>
      </div>
      <div class="content">
        <h1>${notification.minutesUntil === 5 ? '<span class="urgent">🔴 Class Starting Soon!</span>' : '📚 Class Reminder'}</h1>
        <p>Hi ${notification.fullName},</p>
        <p>
          ${notification.minutesUntil === 5 
            ? `Your class <strong style="color: #4ecdc4;">${notification.classTitle}</strong> is starting in just <strong class="urgent">5 minutes</strong>!`
            : `This is a friendly reminder that your class <strong style="color: #4ecdc4;">${notification.classTitle}</strong> starts in <strong>30 minutes</strong>.`
          }
        </p>
        <div class="info-box">
          <div class="info-item">📅 <strong>Class:</strong> ${notification.classTitle}</div>
          <div class="info-item">⏰ <strong>Time:</strong> ${formattedTime}</div>
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
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
        <p>Excellence in Legal Education 🇿🇲</p>
      </div>
    </div>
  </body>
  </html>
`;

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

      // Send email reminder via Zoho SMTP
      try {
        const formattedTime = new Date(notification.scheduledAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const emailHtml = getEmailHtml(notification, formattedTime);

        const client = new SMTPClient({
          connection: {
            hostname: Deno.env.get("SMTP_HOST")!,
            port: 465,
            tls: true,
            auth: {
              username: Deno.env.get("SMTP_USER")!,
              password: Deno.env.get("SMTP_PASS")!,
            },
          },
        });

        await client.send({
          from: Deno.env.get("SMTP_FROM")!,
          to: notification.email,
          subject: notification.minutesUntil === 5 
            ? `🔴 ${notification.classTitle} is starting in 5 minutes!`
            : `📚 Reminder: ${notification.classTitle} starts at ${formattedTime}`,
          html: emailHtml,
        });
        try { client.close(); } catch (_) {}
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
  } catch (error: any) {
    console.error("Error in send-class-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
