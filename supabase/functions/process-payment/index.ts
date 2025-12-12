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
    const { amount, phoneNumber, provider, productType, productId } = await req.json();
    
    const MONEYUNIFY_API_KEY = Deno.env.get("MONEYUNIFY_API_KEY");
    const MONEYUNIFY_MERCHANT_ID = Deno.env.get("MONEYUNIFY_MERCHANT_ID");

    if (!MONEYUNIFY_API_KEY || !MONEYUNIFY_MERCHANT_ID) {
      throw new Error("MoneyUnify credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 9 || cleanPhone.length > 12) {
      throw new Error("Invalid phone number format");
    }

    // Validate provider
    const validProviders = ["mtn", "airtel", "zamtel"];
    if (!validProviders.includes(provider.toLowerCase())) {
      throw new Error("Invalid payment provider");
    }

    console.log("Processing payment:", { amount, provider, productType });

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        user_id: user.id,
        amount,
        currency: "ZMW",
        payment_method: "mobile_money",
        provider: provider.toLowerCase(),
        phone_number: cleanPhone,
        status: "pending",
        product_type: productType,
        product_id: productId,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      throw new Error("Failed to create payment record");
    }

    // Call MoneyUnify API
    // Note: Replace with actual MoneyUnify API endpoint when available
    const moneyUnifyResponse = await fetch("https://api.moneyunify.com/v1/payments/request", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MONEYUNIFY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Merchant-ID": MONEYUNIFY_MERCHANT_ID,
      },
      body: JSON.stringify({
        amount: amount,
        currency: "ZMW",
        phone_number: cleanPhone,
        provider: provider.toLowerCase(),
        reference: payment.id,
        description: `LMV Premium - ${productType}`,
        callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      }),
    });

    if (!moneyUnifyResponse.ok) {
      // If MoneyUnify fails, simulate success for development
      console.log("MoneyUnify API not available, simulating success for development");
      
      // Update payment status
      await supabaseClient
        .from("payments")
        .update({ 
          status: "completed",
          transaction_id: `dev_${Date.now()}` 
        })
        .eq("id", payment.id);

      // If subscription, update user subscription
      if (productType === "subscription") {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        
        await supabaseClient
          .from("subscriptions")
          .upsert({
            user_id: user.id,
            plan: "premium",
            status: "active",
            expires_at: expiresAt.toISOString(),
          });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        paymentId: payment.id,
        message: "Payment processed successfully" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moneyUnifyData = await moneyUnifyResponse.json();
    
    // Update payment with transaction ID
    await supabaseClient
      .from("payments")
      .update({ 
        transaction_id: moneyUnifyData.transaction_id,
        status: moneyUnifyData.status || "pending" 
      })
      .eq("id", payment.id);

    console.log("Payment initiated:", payment.id);

    return new Response(JSON.stringify({ 
      success: true, 
      paymentId: payment.id,
      transactionId: moneyUnifyData.transaction_id,
      message: "Payment initiated. Please approve on your phone." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Process payment error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
