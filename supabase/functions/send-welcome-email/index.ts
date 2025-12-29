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
  school?: 'law' | 'business' | 'health';
}

// School-specific content and branding
const getSchoolContent = (school?: 'law' | 'business' | 'health') => {
  const schoolData = {
    law: {
      name: 'LMV Law',
      subject: 'Welcome to LMV Law! ⚖️',
      fromName: 'LMV Law Academy',
      features: `
        <li>⚖️ Get AI-powered case summaries and legal research</li>
        <li>📚 Generate flashcards from legal materials</li>
        <li>📝 Create quizzes on constitutional law, contract law, and more</li>
        <li>🎓 Access expert-led live classes from practising lawyers</li>
        <li>📅 Build personalized study schedules for bar exams</li>
        <li>🎯 Track your progress and study streaks</li>
      `,
      intro: "Thank you for joining LMV Law! We're excited to help you excel in your legal studies and professional development.",
    },
    business: {
      name: 'LMV Business',
      subject: 'Welcome to LMV Business! 📊',
      fromName: 'LMV Business Academy',
      features: `
        <li>📊 Master business analytics and financial concepts</li>
        <li>📚 Generate flashcards for economics and management</li>
        <li>📝 Test your knowledge on accounting, marketing, and strategy</li>
        <li>🎓 Access expert-led live classes from industry professionals</li>
        <li>📅 Build personalized study schedules for your business courses</li>
        <li>🎯 Track your progress and achieve your career goals</li>
      `,
      intro: "Thank you for joining LMV Business! We're excited to help you develop the business acumen and leadership skills for success.",
    },
    health: {
      name: 'LMV Health',
      subject: 'Welcome to LMV Health! 🏥',
      fromName: 'LMV Health Academy',
      features: `
        <li>🏥 Master clinical concepts and medical terminology</li>
        <li>📚 Generate flashcards for anatomy, pharmacology, and more</li>
        <li>📝 Test your knowledge on patient care and diagnostics</li>
        <li>🎓 Access expert-led live classes from healthcare professionals</li>
        <li>📅 Build personalized study schedules for medical exams</li>
        <li>🎯 Track your progress toward clinical excellence</li>
      `,
      intro: "Thank you for joining LMV Health! We're excited to help you achieve clinical excellence and compassionate patient care.",
    },
  };

  // Default to general LMV content if no school specified
  const defaultContent = {
    name: 'LMV Academy',
    subject: 'Welcome to LMV Academy! 🎓',
    fromName: 'LMV Academy',
    features: `
      <li>📚 Generate flashcards from your study materials</li>
      <li>📝 Create quizzes to test your knowledge</li>
      <li>⚖️ Get AI-powered summaries and research</li>
      <li>🎓 Access expert-led live classes</li>
      <li>📅 Build personalized study schedules</li>
      <li>🎯 Track your progress and streaks</li>
    `,
    intro: "Thank you for joining LMV Academy! We're excited to help you excel in your academic journey.",
  };

  return school ? schoolData[school] : defaultContent;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, school }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to ${email} for school: ${school || 'general'}`);

    const schoolContent = getSchoolContent(school);

    const emailContent = `
      <p>${schoolContent.intro}</p>
      <p>Here's what you can do with <span class="highlight">Lumina</span>, your AI study buddy:</p>
      <ul>
        ${schoolContent.features}
      </ul>
      <p>Happy studying! 📖</p>
      <p><strong>The ${schoolContent.name} Team</strong></p>
    `;

    const emailHtml = getEmailTemplate({
      title: 'Welcome! 👋',
      name: fullName,
      content: emailContent,
      school: school,
    });

    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    
    const emailResponse = await resend.emails.send({
      from: `${schoolContent.fromName} <${fromEmail}>`,
      to: [email],
      subject: schoolContent.subject,
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
