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

    // Get classes scheduled to start in the next 15 minutes
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);

    const { data: upcomingClasses, error: classesError } = await supabase
      .from("live_classes")
      .select("id, title, course_id, scheduled_at")
      .eq("status", "scheduled")
      .gte("scheduled_at", fifteenMinutesFromNow.toISOString())
      .lt("scheduled_at", twentyMinutesFromNow.toISOString());

    if (classesError) {
      console.error("Error fetching classes:", classesError);
      throw classesError;
    }

    console.log(`Found ${upcomingClasses?.length || 0} classes starting soon`);

    const notifications: { userId: string; classTitle: string }[] = [];

    for (const liveClass of upcomingClasses || []) {
      if (!liveClass.course_id) continue;

      // Get enrolled students for this course
      const { data: enrollments, error: enrollError } = await supabase
        .from("academy_enrollments")
        .select("user_id")
        .eq("course_id", liveClass.course_id)
        .eq("status", "active");

      if (enrollError) {
        console.error("Error fetching enrollments:", enrollError);
        continue;
      }

      for (const enrollment of enrollments || []) {
        notifications.push({
          userId: enrollment.user_id,
          classTitle: liveClass.title,
        });
      }
    }

    console.log(`Sending ${notifications.length} reminder notifications`);

    // Send push notifications
    for (const notification of notifications) {
      // Get user's push subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", notification.userId);

      if (subscriptions && subscriptions.length > 0) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userIds: [notification.userId],
              title: "Class Starting Soon!",
              body: `${notification.classTitle} starts in 15 minutes`,
              icon: "/pwa-192x192.png",
              data: { type: "class_reminder" },
            },
          });
        } catch (err) {
          console.error("Error sending notification:", err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
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
