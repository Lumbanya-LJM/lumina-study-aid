import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking for upcoming classes to send reminders...");

    const now = new Date();
    const notifications: { userId: string; classTitle: string; minutesUntil: number; classId: string }[] = [];

    // Check for classes starting in ~30 minutes (28-32 min window)
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
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
          notifications.push({
            userId: enrollment.user_id,
            classTitle: liveClass.title,
            minutesUntil: 30,
            classId: liveClass.id,
          });
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
          notifications.push({
            userId: enrollment.user_id,
            classTitle: liveClass.title,
            minutesUntil: 5,
            classId: liveClass.id,
          });
        }
      }
    }

    console.log(`Sending ${notifications.length} reminder notifications`);

    // Send push notifications
    for (const notification of notifications) {
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
      } catch (err) {
        console.error("Error sending notification:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
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
