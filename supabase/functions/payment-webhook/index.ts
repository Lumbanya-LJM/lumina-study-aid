import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lenco-signature",
};

// Verify Lenco webhook signature
function verifyLencoSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Send payment confirmation email
async function sendPaymentConfirmationEmail(
  email: string, 
  amount: number, 
  productType: string,
  status: 'completed' | 'failed'
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return;
  }

  const smtpFrom = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
  const fromEmail = `LMV Academy <${smtpFrom}>`;
  
  const productDescription = productType === 'subscription' 
    ? 'Pro Subscription' 
    : productType === 'academy' 
      ? 'Academy Enrollment' 
      : 'Class Purchase';

  const subject = status === 'completed' 
    ? `Payment Confirmed - ${productDescription}`
    : `Payment Failed - ${productDescription}`;

  const html = status === 'completed' ? `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .success-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 20px; }
        .amount { font-size: 32px; font-weight: bold; color: #10b981; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; background: #f8f9fa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Payment Confirmed!</h1>
        </div>
        <div class="content">
          <span class="success-badge">Payment Successful</span>
          <p>Great news! Your payment has been confirmed and your account has been updated.</p>
          <div class="amount">K${amount.toFixed(2)}</div>
          <p><strong>Product:</strong> ${productDescription}</p>
          <p>You now have full access to your purchase. Log in to start using your new features!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LMV Academy - Excellence in Education</p>
        </div>
      </div>
    </body>
    </html>
  ` : `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .failed-badge { display: inline-block; background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 20px; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; background: #f8f9fa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">❌ Payment Failed</h1>
        </div>
        <div class="content">
          <span class="failed-badge">Payment Unsuccessful</span>
          <p>Unfortunately, your payment of K${amount.toFixed(2)} for ${productDescription} could not be processed.</p>
          <p>This could be due to:</p>
          <ul>
            <li>Insufficient funds</li>
            <li>Network timeout</li>
            <li>Payment was declined</li>
          </ul>
          <p>Please try again or contact support if the issue persists.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LMV Academy - Excellence in Education</p>
        </div>
      </div>
    </body>
    </html>
  `;

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
        subject,
        html,
      }),
    });
    console.log("Payment confirmation email sent");
  } catch (error) {
    console.error("Error sending payment confirmation email:", error);
  }
}

// Send class join email with link
async function sendClassJoinEmail(
  email: string,
  classTitle: string,
  scheduledAt: string,
  classId: string,
  dailyRoomUrl: string | null
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping class join email");
    return;
  }

  const smtpFrom = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
  const fromEmail = `LMV Academy <${smtpFrom}>`;
  const appUrl = Deno.env.get("APP_URL") || "https://app.lmvacademy.com";
  
  const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const joinLink = dailyRoomUrl || `${appUrl}/live-class?classId=${classId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; background: #f8f9fa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🎓 You're Registered!</h1>
        </div>
        <div class="content">
          <h2>${classTitle}</h2>
          <p><strong>📅 Date:</strong> ${formattedDate}</p>
          <p>You've successfully purchased access to this live class. Click the button below to join when the class starts:</p>
          <a href="${joinLink}" class="btn">Join Class</a>
          <p style="color: #6c757d; font-size: 14px;">Save this email - you'll need the link above to join the class.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LMV Academy - Excellence in Education</p>
        </div>
      </div>
    </body>
    </html>
  `;

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
        subject: `You're Registered: ${classTitle}`,
        html,
      }),
    });
    console.log("Class join email sent to:", email);
  } catch (error) {
    console.error("Error sending class join email:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-lenco-signature") || "";
    const webhookSecret = Deno.env.get("LENCO_WEBHOOK_SECRET") || "";

    console.log("Lenco webhook received");

    // CRITICAL: Enforce webhook signature verification
    if (!webhookSecret) {
      console.error("CRITICAL: LENCO_WEBHOOK_SECRET is not configured. Rejecting request.");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!verifyLencoSignature(rawBody, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    console.log("Webhook payload:", JSON.stringify(payload, null, 2));

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Lenco sends different event structures - handle both
    const event = payload.event || payload.type;
    const data = payload.data || payload;
    
    // Extract reference - Lenco uses 'reference' field
    const reference = data.reference || data.transaction_reference || payload.reference;
    const transactionStatus = data.status || payload.status;
    const transactionId = data.transaction_id || data.id || payload.transaction_id;

    console.log("Processing webhook:", { event, reference, transactionStatus, transactionId });

    if (!reference) {
      console.error("Missing payment reference in webhook");
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get payment record
    const { data: payment, error: fetchError } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("id", reference)
      .single();

    if (fetchError || !payment) {
      // Try finding by transaction_id
      const { data: paymentByTxn } = await supabaseClient
        .from("payments")
        .select("*")
        .eq("transaction_id", reference)
        .single();

      if (!paymentByTxn) {
        console.error("Payment not found:", reference);
        return new Response(JSON.stringify({ error: "Payment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const paymentRecord = payment;

    // Map Lenco status to our status
    let newStatus: 'completed' | 'failed' | 'pending';
    const statusLower = transactionStatus?.toLowerCase();
    
    if (statusLower === 'success' || statusLower === 'successful' || statusLower === 'completed') {
      newStatus = 'completed';
    } else if (statusLower === 'failed' || statusLower === 'declined' || statusLower === 'cancelled') {
      newStatus = 'failed';
    } else {
      newStatus = 'pending';
    }

    console.log(`Updating payment ${reference} status to: ${newStatus}`);

    // Update payment status
    const { error: updateError } = await supabaseClient
      .from("payments")
      .update({ 
        status: newStatus,
        transaction_id: transactionId || paymentRecord.transaction_id,
        updated_at: new Date().toISOString()
      })
      .eq("id", paymentRecord.id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw new Error("Failed to update payment status");
    }

    // Get user email for notifications
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("user_id")
      .eq("user_id", paymentRecord.user_id)
      .single();

    // Get user email from auth
    const { data: { user } } = await supabaseClient.auth.admin.getUserById(paymentRecord.user_id);
    const userEmail = user?.email;

    // Handle successful payment - NOW activate products
    if (newStatus === 'completed') {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Parse metadata from payment record
      const metadata = paymentRecord.metadata || {};
      const selectedCourses = metadata.selectedCourses || [];
      const classId = metadata.classId;
      const classPurchaseType = metadata.classPurchaseType;
      const purchaserEmail = metadata.purchaserEmail;

      if (paymentRecord.product_type === 'subscription') {
        // NOW activate Pro subscription
        const { error: subError } = await supabaseClient
          .from("subscriptions")
          .upsert({
            user_id: paymentRecord.user_id,
            plan: "pro",
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        if (subError) {
          console.error("Error activating subscription:", subError);
        } else {
          console.log("Subscription activated for user:", paymentRecord.user_id);
        }
      } else if (paymentRecord.product_type === 'academy' && selectedCourses.length > 0) {
        // NOW create academy enrollments
        const enrollments = selectedCourses.map((courseId: string) => ({
          user_id: paymentRecord.user_id,
          course_id: courseId,
          status: "active",
          expires_at: expiresAt.toISOString(),
        }));

        const { error: enrollError } = await supabaseClient
          .from("academy_enrollments")
          .upsert(enrollments, { onConflict: "user_id,course_id" });

        if (enrollError) {
          console.error("Error creating enrollments:", enrollError);
        } else {
          console.log("Academy enrollments created for user:", paymentRecord.user_id);
          
          // Notify tutors of new enrollment
          try {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('full_name')
              .eq('user_id', paymentRecord.user_id)
              .single();

            const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-tutor-enrollment`;
            await fetch(notifyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
              },
              body: JSON.stringify({
                studentUserId: paymentRecord.user_id,
                studentName: profile?.full_name || 'Student',
                studentEmail: userEmail,
                courseIds: selectedCourses
              })
            });
            console.log("Tutor notification sent for new enrollment");
          } catch (notifyError) {
            console.error("Failed to notify tutors:", notifyError);
          }
        }
      } else if (paymentRecord.product_type === 'class' && classId) {
        // NOW create class purchase
        const { data: classData } = await supabaseClient
          .from("live_classes")
          .select("title, scheduled_at, daily_room_url")
          .eq("id", classId)
          .single();

        const { error: purchaseError } = await supabaseClient
          .from("class_purchases")
          .insert({
            user_id: paymentRecord.user_id,
            class_id: classId,
            purchase_type: classPurchaseType || 'recording',
            amount: paymentRecord.amount,
            payment_id: paymentRecord.id,
            purchaser_email: purchaserEmail || userEmail,
          });

        if (purchaseError) {
          console.error("Error creating class purchase:", purchaseError);
        } else {
          console.log("Class purchase created for user:", paymentRecord.user_id);

          // Send class join email if live class
          if (classPurchaseType === 'live' && purchaserEmail && classData) {
            await sendClassJoinEmail(purchaserEmail, classData.title, classData.scheduled_at, classId, classData.daily_room_url);
          }
        }
      }
    }
    // Failed payments - no cleanup needed since nothing was created

    // Send email notification
    if (userEmail && (newStatus === 'completed' || newStatus === 'failed')) {
      await sendPaymentConfirmationEmail(
        userEmail,
        Number(paymentRecord.amount),
        paymentRecord.product_type,
        newStatus
      );
    }

    console.log("Webhook processed successfully");

    return new Response(JSON.stringify({ 
      success: true,
      status: newStatus,
      paymentId: paymentRecord.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Payment webhook error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
