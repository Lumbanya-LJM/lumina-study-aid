import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      throw new Error("PAYSTACK_SECRET_KEY is not set in environment variables.");
    }

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const hash = createHmac("sha512", paystackSecret).update(body).digest("hex");

    if (hash !== signature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);
    console.log("Payment webhook received and verified:", payload);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { reference, status, transaction_id } = payload;

    if (!reference) {
      throw new Error("Missing payment reference");
    }

    // Get payment record
    const { data: payment, error: fetchError } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("id", reference)
      .single();

    if (fetchError || !payment) {
      console.error("Payment not found:", reference);
      throw new Error("Payment not found");
    }

    // Update payment status
    const newStatus = status === "success" ? "completed" : status === "failed" ? "failed" : "pending";
    
    await supabaseClient
      .from("payments")
      .update({ 
        status: newStatus,
        transaction_id: transaction_id 
      })
      .eq("id", reference);

    // If payment successful and is subscription, update subscription
    if (newStatus === "completed" && payment.product_type === "subscription") {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      
      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: payment.user_id,
          plan: "premium",
          status: "active",
          expires_at: expiresAt.toISOString(),
        });

      console.log("Subscription activated for user:", payment.user_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Payment webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
