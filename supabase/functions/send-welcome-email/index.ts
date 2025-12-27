import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailTemplate } from '../_shared/email-template.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const emailContent = `
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
      <p><strong>The LMV Academy Team</strong></p>
    `;

    const emailHtml = getEmailTemplate({
      title: 'Welcome! 👋',
      name: fullName,
      content: emailContent,
    });

    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    
    const emailResponse = await resend.emails.send({
      from: `LMV Academy <${fromEmail}>`,
      to: [email],
      subject: "Welcome to LMV Academy! 🎓",
      html: emailHtml,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error sending welcome email:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
