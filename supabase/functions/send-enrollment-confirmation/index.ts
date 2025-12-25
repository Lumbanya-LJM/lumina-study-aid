import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const assignedTutors: { course: Course; tutor: Tutor | null }[] = [];
    
    for (const course of courses || []) {
      let assignedTutor: Tutor | null = null;
      
      if (tutorApplications) {
        for (const app of tutorApplications) {
          if (app.selected_courses && app.selected_courses.includes(course.id)) {
            assignedTutor = { full_name: app.full_name, email: app.email };
            break;
          }
        }
      }
      
      assignedTutors.push({ course, tutor: assignedTutor });
    }

    // Build course list HTML
    const courseListHtml = assignedTutors.map(({ course, tutor }) => `
      <tr style="border-bottom: 1px solid #eee;">
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

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Enrollment Confirmation</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🎓 Enrollment Confirmed!</h1>
        </div>
        
        <div style="background: #fff; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="color: #333; font-size: 16px;">Dear ${studentName},</p>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Congratulations! You have successfully enrolled in the following course(s) at Luminary Innovision Academy:
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #f8f8f8;">
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
          
          <p style="color: #666; font-size: 14px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Best regards,<br/>
            <strong style="color: #333;">The Luminary Innovision Team</strong>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Luminary Innovision Academy. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

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
  } catch (error: any) {
    console.error("Error in send-enrollment-confirmation:", error);
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
