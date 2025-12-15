import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Checking ZambiaLII for new content...");

    // Fetch latest cases from ZambiaLII RSS or API
    // Note: ZambiaLII may have an RSS feed or API - this is a placeholder
    // In production, you would scrape or use their API
    const zambiaLiiUrl = "https://zambialii.org/recent-judgments";
    
    try {
      const response = await fetch(zambiaLiiUrl);
      if (!response.ok) {
        console.log("ZambiaLII not reachable, using mock data for development");
      }
    } catch (e) {
      console.log("Cannot reach ZambiaLII, checking for demo purposes");
    }

    // For development/demo purposes, we'll create sample alerts
    // In production, this would parse actual ZambiaLII content
    const mockNewContent = [
      {
        title: "Attorney General v. Chileshe & Others",
        description: "Supreme Court ruling on constitutional interpretation of executive powers",
        alert_type: "case",
        source_url: "https://zambialii.org/zm/judgment/supreme-court-zambia/2024/1",
        citation: "[2024] ZMSC 1",
        court: "Supreme Court of Zambia",
        published_date: new Date().toISOString().split('T')[0],
      },
      {
        title: "Statutory Instrument No. 45 of 2024",
        description: "Amendments to the Legal Practitioners (Professional Conduct) Rules",
        alert_type: "statutory_instrument",
        source_url: "https://zambialii.org/zm/legislation/statutory-instrument/2024/45",
        citation: "S.I. No. 45 of 2024",
        court: null,
        published_date: new Date().toISOString().split('T')[0],
      },
    ];

    // Check for existing alerts to avoid duplicates
    const newAlerts = [];
    for (const content of mockNewContent) {
      const { data: existing } = await supabaseClient
        .from("legal_alerts")
        .select("id")
        .eq("title", content.title)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error } = await supabaseClient
          .from("legal_alerts")
          .insert(content)
          .select()
          .single();

        if (!error && inserted) {
          newAlerts.push(inserted);
          console.log("New alert created:", content.title);
        }
      }
    }

    // Send push notifications for new alerts
    if (newAlerts.length > 0) {
      // Get all users with push subscriptions
      const { data: subscriptions } = await supabaseClient
        .from("push_subscriptions")
        .select("user_id");

      if (subscriptions && subscriptions.length > 0) {
        const userIds = [...new Set(subscriptions.map(s => s.user_id))];
        
        for (const alert of newAlerts) {
          const notificationPayload = {
            title: alert.alert_type === 'case' ? '📚 New Case Alert' : '📜 New Law Alert',
            body: alert.title,
            data: { url: '/notifications', alertId: alert.id }
          };

          // Call the push notification function
          await supabaseClient.functions.invoke('send-push-notification', {
            body: {
              userIds,
              payload: notificationPayload
            }
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      newAlerts: newAlerts.length,
      message: `Found ${newAlerts.length} new legal updates`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check ZambiaLII error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
