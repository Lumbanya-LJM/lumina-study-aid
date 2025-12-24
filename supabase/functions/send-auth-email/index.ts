import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailPayload {
  user: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const getEmailTemplate = (type: string, confirmationUrl: string, userName: string) => {
  const baseStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
    .tagline { color: rgba(255, 255, 255, 0.8); font-size: 14px; }
    .content { padding: 40px 30px; }
    h1 { color: #ffffff; font-size: 24px; margin: 0 0 20px 0; }
    p { color: #b8b8b8; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .button:hover { opacity: 0.9; }
    .footer { padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); }
    .footer p { color: #666; font-size: 12px; margin: 0; }
    .warning { background: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .warning p { color: #ffc107; margin: 0; font-size: 14px; }
  `;

  const templates: Record<string, { subject: string; html: string }> = {
    signup: {
      subject: "Welcome to LMV Academy - Confirm Your Email",
      html: `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">LMV ACADEMY</div>
              <div class="tagline">Luminary Innovision Academy</div>
            </div>
            <div class="content">
              <h1>Welcome${userName ? `, ${userName}` : ''}! 🎓</h1>
              <p>Thank you for joining LMV Academy. You're one step away from accessing world-class legal education resources.</p>
              <p>Please confirm your email address to activate your account:</p>
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
              </div>
              <div class="warning">
                <p>⏰ This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
              <p>Questions? Contact us at admin@lmvacademy.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    recovery: {
      subject: "Reset Your LMV Academy Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
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
                <a href="${confirmationUrl}" class="button">Reset Password</a>
              </div>
              <div class="warning">
                <p>⚠️ This link expires in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
              <p>Questions? Contact us at admin@lmvacademy.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    magiclink: {
      subject: "Your LMV Academy Login Link",
      html: `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">LMV ACADEMY</div>
              <div class="tagline">Luminary Innovision Academy</div>
            </div>
            <div class="content">
              <h1>Magic Login Link ✨</h1>
              <p>Hello${userName ? ` ${userName}` : ''},</p>
              <p>Click the button below to securely log in to your LMV Academy account:</p>
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Log In to LMV Academy</a>
              </div>
              <div class="warning">
                <p>⏰ This link expires in 1 hour and can only be used once. If you didn't request this link, please ignore this email.</p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
              <p>Questions? Contact us at admin@lmvacademy.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    email_change: {
      subject: "Confirm Your New Email - LMV Academy",
      html: `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">LMV ACADEMY</div>
              <div class="tagline">Luminary Innovision Academy</div>
            </div>
            <div class="content">
              <h1>Email Change Confirmation 📧</h1>
              <p>Hello${userName ? ` ${userName}` : ''},</p>
              <p>You've requested to change your email address for your LMV Academy account. Please confirm this change:</p>
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Confirm New Email</a>
              </div>
              <div class="warning">
                <p>⚠️ If you didn't request this change, please contact our support team immediately at admin@lmvacademy.com</p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
              <p>Questions? Contact us at admin@lmvacademy.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
  };

  return templates[type] || templates.signup;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AuthEmailPayload = await req.json();
    console.log("Auth email hook received:", payload.email_data.email_action_type);

    const { user, email_data } = payload;
    const { token_hash, redirect_to, email_action_type, site_url } = email_data;

    // Build the confirmation URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || site_url;
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    const userName = user.user_metadata?.full_name || "";
    const template = getEmailTemplate(email_action_type, confirmationUrl, userName);

    const emailResponse = await resend.emails.send({
      from: "LMV Academy <admin@lmvacademy.com>",
      to: [user.email],
      subject: template.subject,
      html: template.html,
    });

    console.log("Auth email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
