import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to ${email}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
          .header { background: linear-gradient(135deg, #2A5A6A 0%, #1a3d47 100%); padding: 40px 30px; text-align: center; }
          .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
          .tagline { color: rgba(255, 255, 255, 0.8); font-size: 14px; }
          .content { padding: 40px 30px; }
          h1 { color: #ffffff; font-size: 24px; margin: 0 0 20px 0; }
          p { color: #b8b8b8; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
          ul { color: #b8b8b8; padding-left: 20px; margin: 0 0 20px 0; }
          li { margin-bottom: 12px; line-height: 1.5; }
          .footer { padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); }
          .footer p { color: #666; font-size: 12px; margin: 0; }
          .highlight { color: #4ecdc4; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">LMV ACADEMY</div>
            <div class="tagline">Luminary Innovision Academy</div>
          </div>
          <div class="content">
            <h1>Welcome${fullName ? `, ${fullName}` : ''}! 👋</h1>
            <p>Thank you for joining LMV Academy! We're excited to help you excel in your academic journey.</p>
            <p>Here's what you can do with <span class="highlight">Lumina</span>, your AI study buddy:</p>
            <ul>
              <li>📚 Generate flashcards from your study materials</li>
              <li>📝 Create quizzes to test your knowledge</li>
              <li>⚖️ Get AI-powered case summaries</li>
              <li>📅 Build personalized study schedules</li>
              <li>🎯 Track your progress and streaks</li>
            </ul>
            <p>Happy studying! 📖</p>
            <p style="color: #4ecdc4;"><strong>The LMV Academy Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
            <p>Questions? Contact us at admin@lmvacademy.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST")!,
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });

    try {
      await client.send({
        from: Deno.env.get("SMTP_FROM")!,
        to: email,
        subject: "Welcome to LMV Academy! 🎓",
        html: emailHtml,
      });
      console.log("Welcome email sent successfully to:", email);
      try { client.close(); } catch (_) {}
    } catch (smtpError: any) {
      console.error("SMTP Error:", smtpError);
      try { client.close(); } catch (_) {}
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
