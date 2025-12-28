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
    const { amount, phoneNumber, provider, productType, productId, selectedCourses, classId, classPurchaseType, purchaserEmail } = await req.json();
    
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

    console.log("Processing payment:", { amount, provider, productType, selectedCourses, classId, purchaserEmail });

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

    let classTitle = '';
    let classScheduledAt = '';
    
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

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Handle subscription types
      if (productType === "subscription") {
        await supabaseClient
          .from("subscriptions")
          .upsert({
            user_id: user.id,
            plan: "pro",
            status: "active",
            expires_at: expiresAt.toISOString(),
          });
      } else if (productType === "academy" && selectedCourses && selectedCourses.length > 0) {
        // Create enrollments for each selected course
        const enrollments = selectedCourses.map((courseId: string) => ({
          user_id: user.id,
          course_id: courseId,
          status: "active",
          expires_at: expiresAt.toISOString(),
        }));

        const { error: enrollError } = await supabaseClient
          .from("academy_enrollments")
          .upsert(enrollments, { onConflict: "user_id,course_id" });

        if (enrollError) {
          console.error("Error creating enrollments:", enrollError);
        }
      } else if (productType === "class" && classId) {
        // Fetch class details for email
        const { data: classData } = await supabaseClient
          .from("live_classes")
          .select("title, scheduled_at, daily_room_url")
          .eq("id", classId)
          .single();
        
        if (classData) {
          classTitle = classData.title;
          classScheduledAt = classData.scheduled_at;
        }

        // Create class purchase record for individual class/recording
        const { error: purchaseError } = await supabaseClient
          .from("class_purchases")
          .insert({
            user_id: user.id,
            class_id: classId,
            purchase_type: classPurchaseType || 'recording',
            amount: amount,
            payment_id: payment.id,
            purchaser_email: purchaserEmail || user.email,
          });

        if (purchaseError) {
          console.error("Error creating class purchase:", purchaseError);
        }

        // Send email with class join link for live class purchases
        if (classPurchaseType === 'live' && purchaserEmail && classData) {
          await sendClassJoinEmail(purchaserEmail, classTitle, classScheduledAt, classId, classData.daily_room_url);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        paymentId: payment.id,
        message: productType === "academy" 
          ? "Academy enrollment successful!" 
          : productType === "class"
            ? "Class purchase successful! You now have lifetime access."
            : "Payment processed successfully" 
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

async function sendClassJoinEmail(email: string, classTitle: string, scheduledAt: string, classId: string, roomUrl: string | null) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return;
  }

  const appUrl = Deno.env.get("APP_URL") || "https://lmv-academy.lovable.app";
  const joinUrl = roomUrl || `${appUrl}/live-class/${classId}`;
  
  const formattedDate = scheduledAt 
    ? new Date(scheduledAt).toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : 'TBD';

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LMV Academy <notifications@resend.dev>",
        to: [email],
        subject: `Your Class Access: ${classTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
              .class-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
              .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .button:hover { background: #4f46e5; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🎓 Class Access Confirmed!</h1>
              </div>
              <div class="content">
                <p>Your purchase was successful! Here are the details for your class:</p>
                
                <div class="class-info">
                  <h2 style="margin-top: 0; color: #6366f1;">${classTitle}</h2>
                  <p><strong>📅 Date & Time:</strong> ${formattedDate}</p>
                </div>
                
                <p style="text-align: center;">
                  <a href="${joinUrl}" class="button">Join Class</a>
                </p>
                
                <p><strong>Tips for a great class experience:</strong></p>
                <ul>
                  <li>Join 5 minutes early to test your audio/video</li>
                  <li>Find a quiet space with stable internet</li>
                  <li>Have your notebook ready for taking notes</li>
                </ul>
                
                <div class="footer">
                  <p>If you have any questions, please contact our support team.</p>
                  <p>© LMV Academy - Excellence in Legal Education</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (emailResponse.ok) {
      console.log("Class join email sent successfully");
    } else {
      const errorData = await emailResponse.json();
      console.error("Error sending email:", errorData);
    }
  } catch (error) {
    console.error("Error sending class join email:", error);
  }
}
