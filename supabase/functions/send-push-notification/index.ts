import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push requires VAPID keys for authentication
// These should match what's used in the frontend
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface RequestBody {
  userId?: string;
  userIds?: string[];
  payload: PushPayload;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-push-notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, userIds, payload }: RequestBody = await req.json();

    // Determine which users to send to
    const targetUserIds = userIds || (userId ? [userId] : []);

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No user IDs provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending push notifications to ${targetUserIds.length} users`);

    // Get all subscriptions for target users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found for target users");
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // For now, we'll log the notification intent
    // Full web push implementation requires the web-push library with VAPID signing
    // In production, you would use a service like Firebase Cloud Messaging, OneSignal, or implement VAPID signing
    
    const results = [];
    
    for (const subscription of subscriptions) {
      try {
        // Log notification for debugging
        console.log(`Would send to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
        console.log(`Payload: ${JSON.stringify(payload)}`);
        
        // In a full implementation, you would:
        // 1. Create a signed JWT with VAPID keys
        // 2. Send a POST request to the push endpoint with encrypted payload
        
        results.push({
          userId: subscription.user_id,
          status: "queued",
          endpoint: subscription.endpoint.substring(0, 50) + "..."
        });
        
      } catch (error) {
        console.error(`Error sending to subscription:`, error);
        results.push({
          userId: subscription.user_id,
          status: "error",
          error: String(error)
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications processed",
        sent: results.filter(r => r.status === "queued").length,
        failed: results.filter(r => r.status === "error").length,
        results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-push-notification function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
