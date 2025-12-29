import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getEmailTemplate } from '../_shared/email-template.ts';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrollmentConfirmationRequest {
  userId: string;
  studentEmail: string;
  studentName: string;
  courseIds: string[];
}

interface Course {
  id: string;
  name: string;
  institution: string | null;
}

interface Tutor {
  full_name: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, studentEmail, studentName, courseIds }: EnrollmentConfirmationRequest = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch course details
    const { data: courses, error: coursesError } = await supabase
      .from('academy_courses')
      .select('id, name, institution')
      .in('id', courseIds);

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      throw coursesError;
    }

    // Fetch tutors for these courses (from approved tutor applications with matching courses)
    const { data: tutorApplications, error: tutorsError } = await supabase
      .from('tutor_applications')
      .select('full_name, email, selected_courses')
      .eq('status', 'approved');

    if (tutorsError) {
      console.error('Error fetching tutors:', tutorsError);
    }

    // Find tutors who teach any of the enrolled courses
    // Note: selected_courses stores course names, not UUIDs
    const assignedTutors: { course: Course; tutor: Tutor | null }[] = [];
    
    for (const course of courses || []) {
      let assignedTutor: Tutor | null = null;
      
      if (tutorApplications) {
        for (const app of tutorApplications) {
          // Match by course name since selected_courses contains names
          if (app.selected_courses && app.selected_courses.includes(course.name)) {
            assignedTutor = { full_name: app.full_name, email: app.email };
            break;
          }
        }
      }
      
      assignedTutors.push({ course, tutor: assignedTutor });
    }

    // Build course list HTML
    const courseListHtml = assignedTutors.map(({ course, tutor }) => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 12px; text-align: left;">
          <strong>${course.name}</strong>
          <br/>
          <span style="color: #666; font-size: 12px;">${course.institution || 'General'}</span>
        </td>
        <td style="padding: 12px; text-align: left;">
          ${tutor 
            ? `<span style="color: #16a34a;">${tutor.full_name}</span><br/><span style="font-size: 12px; color: #666;">${tutor.email}</span>` 
            : '<span style="color: #f59e0b;">Pending assignment</span>'
          }
        </td>
      </tr>
    `).join('');

    const emailContent = `
      <p>Congratulations! You have successfully enrolled in the following course(s) at Luminary Innovision Academy:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 12px; text-align: left; font-size: 14px; color: #333;">Course</th>
            <th style="padding: 12px; text-align: left; font-size: 14px; color: #333;">Assigned Tutor</th>
          </tr>
        </thead>
        <tbody>
          ${courseListHtml}
        </tbody>
      </table>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #166534; font-size: 14px; margin: 0;">
          <strong>What's Next?</strong><br/>
          Log in to your Lumina Academy dashboard to access course materials, attend live classes, and connect with your tutors.
        </p>
      </div>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>The Luminary Innovision Team</strong>
      </p>
    `;

    const emailHtml = getEmailTemplate({
      title: '🎓 Enrollment Confirmed!',
      name: studentName,
      content: emailContent,
    });

    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `LMV Academy <${fromEmail}>`,
        to: [studentEmail],
        subject: "🎓 Your Course Enrollment is Confirmed!",
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Enrollment confirmation email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-enrollment-confirmation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
