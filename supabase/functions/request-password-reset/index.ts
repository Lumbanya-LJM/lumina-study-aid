import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const getEmailTemplate = (resetUrl: string, userName: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
        .header { background: linear-gradient(135deg, #2A5A6A 0%, #1a3d47 100%); padding: 40px 30px; text-align: center; }
        .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
        .tagline { color: rgba(255, 255, 255, 0.8); font-size: 14px; }
        .content { padding: 40px 30px; }
        h1 { color: #ffffff; font-size: 24px; margin: 0 0 20px 0; }
        p { color: #b8b8b8; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #2A5A6A 0%, #3d7a8a 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .footer { padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); }
        .footer p { color: #666; font-size: 12px; margin: 0; }
        .warning { background: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .warning p { color: #ffc107; margin: 0; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">LMV ACADEMY</div>
          <div class="tagline">Luminary Innovision Academy</div>
        </div>
        <div class="content">
          <h1>Password Reset Request 🔐</h1>
          <p>Hello${userName ? ` ${userName}` : ''},</p>
          <p>We received a request to reset your password for your LMV Academy account. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <div class="warning">
            <p>⚠️ This link expires in 1 hour. If you didn't request a password reset, please ignore this email.</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
          <p>Questions? Contact us at admin@lmvacademy.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Password reset requested for: ${email}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists in auth.users (using admin API)
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error checking user:", userError);
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a reset link will be sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = userData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.log(`No user found with email: ${email}`);
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a reset link will be sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Clean up old tokens for this email
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("email", email.toLowerCase());

    // Store the token
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing token:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to process request" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build reset URL
    const appUrl = "https://app.lmvacademy.com";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Get user's name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const userName = profile?.full_name || "";

    // Send email via Resend
    const emailHtml = getEmailTemplate(resetUrl, userName);

    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    
    const emailResponse = await resend.emails.send({
      from: `LMV Academy <${fromEmail}>`,
      to: [email],
      subject: "Reset Your Password — LMV Academy",
      html: emailHtml,
    });

    console.log("Password reset email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "If an account exists with this email, a reset link will be sent." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in request-password-reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
