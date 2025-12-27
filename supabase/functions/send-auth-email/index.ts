import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailTemplate } from '../_shared/email-template.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token, type, user_metadata } = await req.json();
    
    console.log(`Processing ${type} email for: ${email}`);

    const userName = user_metadata?.full_name || "";
    let subject = "";
    let title = "";
    let content = "";

    switch (type) {
      case 'signup':
        subject = "Welcome to LMV Academy - Confirm Your Email";
        title = `Welcome! 🎓`;
        content = `
          <p>Thank you for joining LMV Academy. You're one step away from accessing world-class legal education resources.</p>
          <p>Please confirm your email address to activate your account:</p>
          <div style="text-align: center;">
            <a href="${token}" class="button">Confirm Email Address</a>
          </div>
          <p>⏰ This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
        `;
        break;
      case 'recovery':
        subject = "Reset Your Password — LMV Academy";
        title = "Password Reset Request 🔐";
        content = `
          <p>We received a request to reset your password for your LMV Academy account. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${token}" class="button">Reset Password</a>
          </div>
          <p>⚠️ This link expires in 1 hour. If you didn't request a password reset, please ignore this email.</p>
        `;
        break;
      case 'magiclink':
        subject = "Your LMV Academy Login Link";
        title = "Magic Login Link ✨";
        content = `
          <p>Click the button below to securely log in to your LMV Academy account:</p>
          <div style="text-align: center;">
            <a href="${token}" class="button">Log In to LMV Academy</a>
          </div>
          <p>⏰ This link expires in 1 hour and can only be used once.</p>
        `;
        break;
      case 'email_change':
        subject = "Confirm Your New Email - LMV Academy";
        title = "Email Change Confirmation 📧";
        content = `
          <p>You've requested to change your email address. Please confirm this change:</p>
          <div style="text-align: center;">
            <a href="${token}" class="button">Confirm New Email</a>
          </div>
          <p>⚠️ If you didn't request this change, please contact support immediately.</p>
        `;
        break;
      default: // Fallback to signup
        subject = "Welcome to LMV Academy - Confirm Your Email";
        title = `Welcome! 🎓`;
        content = `
          <p>Thank you for joining LMV Academy. You're one step away from accessing world-class legal education resources.</p>
          <p>Please confirm your email address to activate your account:</p>
          <div style="text-align: center;">
            <a href="${token}" class="button">Confirm Email Address</a>
          </div>
          <p>⏰ This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
        `;
        break;
    }

    const emailHtml = getEmailTemplate({
        title,
        name: userName,
        content,
    });

    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    
    const emailResponse = await resend.emails.send({
      from: `LMV Academy <${fromEmail}>`,
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    console.log(`${type} email sent successfully:`, emailResponse);

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});
