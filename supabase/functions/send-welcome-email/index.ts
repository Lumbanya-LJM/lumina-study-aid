import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Luminary Study <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to Luminary Study! 🎓",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #0d5c63 0%, #1a7a82 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Luminary Study</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your AI-powered study companion</p>
              </div>
              
              <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px;">
                <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 22px;">Hi ${fullName || 'there'}! 👋</h2>
                
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
                  Thank you for joining Luminary Study! We're excited to help you excel in your academic journey.
                </p>
                
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
                  Here's what you can do with Lumina, your AI study buddy:
                </p>
                
                <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px; margin: 0 0 25px 0;">
                  <li>📚 Generate flashcards from your study materials</li>
                  <li>📝 Create quizzes to test your knowledge</li>
                  <li>⚖️ Get AI-powered case summaries</li>
                  <li>📅 Build personalized study schedules</li>
                  <li>🎯 Track your progress and streaks</li>
                </ul>
                
                <p style="color: #888; font-size: 14px; text-align: center; margin: 30px 0 0 0;">
                  Happy studying! 📖<br>
                  <strong>The Luminary Study Team</strong>
                </p>
              </div>
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                © 2025 Luminary Study. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await res.json();
    console.log("Welcome email response:", data);

    if (!res.ok) {
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify(data), {
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
