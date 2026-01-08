import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize Zambian phone numbers to E.164 format (260XXXXXXXXX)
function normalizeZambianPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle different formats
  if (digits.startsWith("260")) {
    return digits;
  }
  if (digits.startsWith("0")) {
    // Local format: 0977123456 -> 260977123456
    return "260" + digits.substring(1);
  }
  if (digits.length === 9) {
    // Just the subscriber number: 977123456 -> 260977123456
    return "260" + digits;
  }

  return digits;
}

function resolveZambiaNetwork(normalizedPhone: string, provider: string): "AIRTEL" | "MTN" | "ZAMTEL" {
  const p = (provider || "").toLowerCase();
  if (p === "airtel") return "AIRTEL";
  if (p === "mtn") return "MTN";
  if (p === "zamtel") return "ZAMTEL";

  // Fallback: infer from Zambian prefix (best-effort)
  const local = normalizedPhone.startsWith("260") ? normalizedPhone.slice(3) : normalizedPhone;
  const prefix2 = local.slice(0, 2);
  if (["97", "77"].includes(prefix2)) return "AIRTEL";
  if (["96", "76"].includes(prefix2)) return "MTN";
  if (["95", "75"].includes(prefix2)) return "ZAMTEL";

  // Default to MTN if unknown (won't break validation in UI, but may fail at gateway)
  return "MTN";
}

function normalizeLencoBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.replace(/\/+$/, "");

  // Users sometimes paste full paths (e.g. .../access/v2 or .../access/v2/collections/...).
  // We normalize to the stable host base and then append the required path ourselves.
  return trimmed.replace(/\/access\/v\d+(\/.*)?$/i, "");
}

// Process mobile money payment with Lenco API
async function processLencoMobileMoneyPayment(
  amount: number,
  phoneNumber: string,
  provider: string,
  reference: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const LENCO_API_KEY = Deno.env.get("LENCO_API_KEY");
  const LENCO_BASE_URL_RAW = Deno.env.get("LENCO_BASE_URL") || "https://api.lenco.co";
  const LENCO_BASE_URL = normalizeLencoBaseUrl(LENCO_BASE_URL_RAW);
  console.log("Lenco base URL:", { raw: LENCO_BASE_URL_RAW, normalized: LENCO_BASE_URL });
  if (!LENCO_API_KEY) {
    console.error("Lenco API key not configured");
    return { success: false, error: "Payment gateway not configured" };
  }

  // Normalize phone number
  const normalizedPhone = normalizeZambianPhone(phoneNumber);
  console.log("Normalized phone:", { original: phoneNumber, normalized: normalizedPhone });

  try {
    console.log("Initiating Lenco mobile money payment:", {
      amount,
      provider,
      resolvedNetwork: resolveZambiaNetwork(normalizedPhone, provider),
      reference,
      phone: normalizedPhone,
    });

    const endpoint = `${LENCO_BASE_URL}/access/v2/collections/mobile-money`;
    console.log("Lenco endpoint:", endpoint);

    const network = resolveZambiaNetwork(normalizedPhone, provider);

    const requestBody = {
      amount,
      currency: "ZMW",
      country: "ZM",
      phone: normalizedPhone,
      network,
      // Some Lenco environments expect `operator` instead of `network`.
      operator: network,
      reference,
    };
    console.log("Lenco request body:", JSON.stringify(requestBody));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LENCO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Lenco raw response:", response.status, responseText);

    let payload: any = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const msg = payload?.message || payload?.error || `Lenco API error (${response.status})`;
      console.error("Lenco API error details:", payload ?? responseText);
      return { success: false, error: msg };
    }

    // Lenco v2 response format: { status: boolean, message: string, data: {...} }
    if (!payload?.status) {
      return { success: false, error: payload?.message || "Payment failed" };
    }

    const collectionStatus: string | undefined = payload?.data?.status;
    console.log("Lenco mobile money response:", payload);

    // Treat these as a successfully initiated collection.
    const okStatuses = new Set(["pending", "pay-offline", "otp-required", "successful"]);
    if (!collectionStatus || okStatuses.has(collectionStatus)) {
      return {
        success: true,
        transactionId: payload?.data?.lencoReference || payload?.data?.reference || reference,
      };
    }

    return {
      success: false,
      error: payload?.data?.reasonForFailure || payload?.message || "Payment failed",
    };
  } catch (error) {
    console.error("Lenco mobile money payment error:", error);
    return {
      success: false,
      error: `Payment gateway error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
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
  const LENCO_BASE_URL_RAW = Deno.env.get("LENCO_BASE_URL") || "https://api.lenco.co";
  const LENCO_BASE_URL = normalizeLencoBaseUrl(LENCO_BASE_URL_RAW);
  console.log("Lenco base URL:", { raw: LENCO_BASE_URL_RAW, normalized: LENCO_BASE_URL });

  if (!LENCO_API_KEY) {
    console.error("Lenco API key not configured");
    return { success: false, error: "Payment gateway not configured" };
  }

  try {
    console.log("Initiating Lenco bank transfer payment:", { amount, bankCode, reference });

    const endpoint = `${LENCO_BASE_URL}/access/v2/collections/bank-transfer`;
    console.log("Lenco bank transfer endpoint:", endpoint);

    const requestBody = {
      amount,
      currency: "ZMW",
      accountNumber,
      bankCode,
      accountName,
      reference,
    };
    console.log("Lenco bank transfer request:", JSON.stringify(requestBody));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LENCO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Lenco bank transfer raw response:", response.status, responseText);

    let payload: any = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const msg = payload?.message || payload?.error || `Lenco API error (${response.status})`;
      console.error("Lenco bank transfer API error details:", payload ?? responseText);
      return { success: false, error: msg };
    }

    if (!payload?.status) {
      return { success: false, error: payload?.message || "Bank transfer failed" };
    }

    const collectionStatus: string | undefined = payload?.data?.status;
    console.log("Lenco bank transfer response:", payload);

    const okStatuses = new Set(["pending", "pay-offline", "otp-required", "successful"]);
    if (!collectionStatus || okStatuses.has(collectionStatus)) {
      return {
        success: true,
        transactionId: payload?.data?.lencoReference || payload?.data?.reference || reference,
      };
    }

    return {
      success: false,
      error: payload?.data?.reasonForFailure || payload?.message || "Bank transfer failed",
    };
  } catch (error) {
    console.error("Lenco bank transfer payment error:", error);
    return {
      success: false,
      error: `Payment gateway error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
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

    // Store metadata for webhook to use when payment is confirmed
    // DO NOT activate products here - wait for webhook confirmation
    const metadata = {
      selectedCourses,
      classId,
      classPurchaseType,
      purchaserEmail,
    };

    // Store metadata in payment record for webhook processing
    await supabaseClient
      .from("payments")
      .update({ 
        metadata: metadata
      })
      .eq("id", payment.id);

    // NO subscriptions, enrollments, or purchases are created here
    // They will be created by the payment-webhook ONLY after Lenco confirms payment
    // NO receipt email is sent here - it will be sent by the webhook after confirmation

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
