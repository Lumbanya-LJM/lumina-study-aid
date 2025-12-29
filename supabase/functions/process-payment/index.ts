import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Process mobile money payment with Lenco API
async function processLencoMobileMoneyPayment(
  amount: number,
  phoneNumber: string,
  provider: string,
  reference: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const LENCO_API_KEY = Deno.env.get("LENCO_API_KEY");
  
  if (!LENCO_API_KEY) {
    console.error("Lenco API key not configured");
    return { success: false, error: "Payment gateway not configured" };
  }

  try {
    console.log("Initiating Lenco mobile money payment:", { amount, provider, reference });
    
    const response = await fetch("https://api.lenco.co/access/v1/transactions/momo/collect", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LENCO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: "ZMW",
        phone: phoneNumber,
        network: provider.toUpperCase(),
        reference: reference,
        narration: "LMV Academy Payment",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lenco API error:", response.status, errorText);
      return { success: false, error: "Payment request failed. Please try again." };
    }

    const data = await response.json();
    console.log("Lenco mobile money response:", data);

    if (data.status === "success" || data.status === "pending") {
      return { 
        success: true, 
        transactionId: data.data?.reference || data.data?.transactionId || reference 
      };
    }

    return { success: false, error: data.message || "Payment failed" };
  } catch (error) {
    console.error("Lenco mobile money payment error:", error);
    return { success: false, error: "Payment gateway error. Please try again." };
  }
}

// Process bank transfer payment with Lenco API
async function processLencoBankTransferPayment(
  amount: number,
  accountNumber: string,
  bankCode: string,
  accountName: string,
  reference: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const LENCO_API_KEY = Deno.env.get("LENCO_API_KEY");
  
  if (!LENCO_API_KEY) {
    console.error("Lenco API key not configured");
    return { success: false, error: "Payment gateway not configured" };
  }

  try {
    console.log("Initiating Lenco bank transfer payment:", { amount, bankCode, reference });
    
    // For bank transfers, we use Lenco's bank collection endpoint
    const response = await fetch("https://api.lenco.co/access/v1/transactions/bank/collect", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LENCO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: "ZMW",
        accountNumber: accountNumber,
        bankCode: bankCode,
        accountName: accountName,
        reference: reference,
        narration: "LMV Academy Payment",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lenco bank transfer API error:", response.status, errorText);
      return { success: false, error: "Bank transfer request failed. Please try again." };
    }

    const data = await response.json();
    console.log("Lenco bank transfer response:", data);

    if (data.status === "success" || data.status === "pending") {
      return { 
        success: true, 
        transactionId: data.data?.reference || data.data?.transactionId || reference 
      };
    }

    return { success: false, error: data.message || "Bank transfer failed" };
  } catch (error) {
    console.error("Lenco bank transfer payment error:", error);
    return { success: false, error: "Payment gateway error. Please try again." };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      amount, 
      phoneNumber, 
      provider, 
      paymentMethod, // 'mobile_money' or 'bank_transfer'
      accountNumber,
      bankCode,
      accountName,
      productType, 
      productId, 
      selectedCourses, 
      classId, 
      classPurchaseType, 
      purchaserEmail
    } = await req.json();

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

    const paymentMethodType = paymentMethod || 'mobile_money';
    
    console.log("Processing payment:", { amount, paymentMethod: paymentMethodType, productType });

    // Validate based on payment method
    if (paymentMethodType === 'mobile_money') {
      // Validate phone number format
      const cleanPhone = phoneNumber?.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 12) {
        throw new Error("Invalid phone number format");
      }

      // Validate provider
      const validProviders = ["mtn", "airtel", "zamtel"];
      if (!validProviders.includes(provider?.toLowerCase())) {
        throw new Error("Invalid payment provider");
      }
    } else if (paymentMethodType === 'bank_transfer') {
      // Validate bank transfer details
      if (!accountNumber || accountNumber.trim().length < 5) {
        throw new Error("Invalid account number");
      }
      if (!bankCode) {
        throw new Error("Bank code is required");
      }
      if (!accountName || accountName.trim().length < 2) {
        throw new Error("Account name is required");
      }
    } else {
      throw new Error("Invalid payment method");
    }

    // Create payment record
    const cleanPhone = paymentMethodType === 'mobile_money' ? phoneNumber?.replace(/\D/g, "") : null;
    
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        user_id: user.id,
        amount,
        currency: "ZMW",
        payment_method: paymentMethodType,
        provider: paymentMethodType === 'mobile_money' ? provider?.toLowerCase() : bankCode,
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

    // Process payment via Lenco based on payment method
    let paymentResult;
    if (paymentMethodType === 'mobile_money') {
      paymentResult = await processLencoMobileMoneyPayment(amount, cleanPhone!, provider, payment.id);
    } else {
      paymentResult = await processLencoBankTransferPayment(amount, accountNumber, bankCode, accountName, payment.id);
    }

    let classTitle = '';
    let classScheduledAt = '';

    if (!paymentResult.success) {
      // Update payment status to failed
      await supabaseClient
        .from("payments")
        .update({ 
          status: "failed",
          transaction_id: null 
        })
        .eq("id", payment.id);

      throw new Error(paymentResult.error || "Payment processing failed");
    }

    // Payment initiated successfully - update payment record
    await supabaseClient
      .from("payments")
      .update({ 
        transaction_id: paymentResult.transactionId,
        status: "pending" // Will be updated to 'completed' via webhook
      })
      .eq("id", payment.id);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Handle subscription types - create records as pending until webhook confirms
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
      const { data: classData } = await supabaseClient
        .from("live_classes")
        .select("title, scheduled_at, daily_room_url")
        .eq("id", classId)
        .single();
      
      if (classData) {
        classTitle = classData.title;
        classScheduledAt = classData.scheduled_at;
      }

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

      if (classPurchaseType === 'live' && purchaserEmail && classData) {
        await sendClassJoinEmail(purchaserEmail, classTitle, classScheduledAt, classId, classData.daily_room_url);
      }
    }

    // Send receipt email
    await sendReceiptEmail(user.email!, amount, productType, payment.id, paymentMethodType);

    console.log("Payment initiated:", payment.id);

    return new Response(JSON.stringify({ 
      success: true, 
      paymentId: payment.id,
      transactionId: paymentResult.transactionId,
      message: paymentMethodType === 'mobile_money' 
        ? "Payment initiated. Please approve on your phone." 
        : "Bank transfer initiated. Please complete the transfer."
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

async function sendReceiptEmail(email: string, amount: number, productType: string, paymentId: string, paymentMethod: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping receipt email");
    return;
  }

  const smtpFrom = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
  const fromEmail = `LMV Academy <${smtpFrom}>`;
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const productDescription = productType === 'subscription' 
    ? 'Pro Subscription (1 Month)' 
    : productType === 'academy' 
      ? 'Lumina Academy Enrollment' 
      : 'Class Purchase';

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `Payment Receipt - LMV Academy`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .invoice-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e9ecef; }
              .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
              .invoice-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; color: #0d9488; }
              .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; background: #f8f9fa; }
              .badge { display: inline-block; background: #0d9488; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🧾 Payment Receipt</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your purchase!</p>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Your payment has been successfully processed. Here are your receipt details:</p>
                
                <div class="invoice-box">
                  <div class="invoice-row">
                    <span>Receipt Number</span>
                    <span>${paymentId.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div class="invoice-row">
                    <span>Date</span>
                    <span>${date}</span>
                  </div>
                  <div class="invoice-row">
                    <span>Product</span>
                    <span>${productDescription}</span>
                  </div>
                  <div class="invoice-row">
                    <span>Payment Method</span>
                    <span><span class="badge">${paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}</span></span>
                  </div>
                  <div class="invoice-row">
                    <span>Amount Paid</span>
                    <span>K${amount.toFixed(2)}</span>
                  </div>
                </div>
                
                <p>If you have any questions about this receipt, please contact our support team.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} LMV Academy - Excellence in Education</p>
                <p>This is an official receipt for your records.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });
    console.log("Receipt email sent successfully");
  } catch (error) {
    console.error("Error sending receipt email:", error);
  }
}

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

  const smtpFrom = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
  const fromEmail = `LMV Academy <${smtpFrom}>`;

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `Your Class Access: ${classTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #e5e5e5; background: #1a1a2e; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
              .content { background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #2d2d44; border-top: none; }
              .class-info { background: #2d2d44; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
              .button { display: inline-block; background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #a0a0a0; font-size: 14px; }
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
                  <p>© LMV Academy - Excellence in Education</p>
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
