import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getEmailTemplate } from '../_shared/email-template.ts';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyTutorEnrollmentRequest {
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  courseIds: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentUserId, studentName, studentEmail, courseIds }: NotifyTutorEnrollmentRequest = await req.json();

    console.log(`[notify-tutor-enrollment] Processing enrollment for student: ${studentName} (${studentUserId})`);
    console.log(`[notify-tutor-enrollment] Course IDs: ${courseIds.join(', ')}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch course details
    const { data: courses, error: coursesError } = await supabase
      .from('academy_courses')
      .select('id, name, institution, school')
      .in('id', courseIds);

    if (coursesError) {
      console.error('[notify-tutor-enrollment] Error fetching courses:', coursesError);
      throw coursesError;
    }

    if (!courses || courses.length === 0) {
      console.log('[notify-tutor-enrollment] No courses found for IDs:', courseIds);
      return new Response(JSON.stringify({ success: true, message: 'No courses found' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get course names for matching with tutor applications
    const courseNames = courses.map(c => c.name);
    console.log(`[notify-tutor-enrollment] Course names: ${courseNames.join(', ')}`);

    // Fetch approved tutor applications that include any of these courses
    const { data: tutorApplications, error: tutorsError } = await supabase
      .from('tutor_applications')
      .select('user_id, full_name, email, selected_courses')
      .eq('status', 'approved');

    if (tutorsError) {
      console.error('[notify-tutor-enrollment] Error fetching tutors:', tutorsError);
      throw tutorsError;
    }

    // Find tutors who teach any of the enrolled courses
    const tutorsToNotify: { tutorName: string; tutorEmail: string; courses: string[] }[] = [];
    
    for (const app of tutorApplications || []) {
      if (!app.selected_courses) continue;
      
      // Find matching courses (selected_courses contains course names)
      const matchingCourses = courseNames.filter(name => 
        app.selected_courses.includes(name)
      );
      
      if (matchingCourses.length > 0) {
        tutorsToNotify.push({
          tutorName: app.full_name,
          tutorEmail: app.email,
          courses: matchingCourses
        });
      }
    }

    console.log(`[notify-tutor-enrollment] Found ${tutorsToNotify.length} tutors to notify`);

    if (tutorsToNotify.length === 0) {
      console.log('[notify-tutor-enrollment] No tutors assigned to these courses');
      return new Response(JSON.stringify({ success: true, message: 'No tutors to notify' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get the school for branding (use first course's school)
    const school = courses[0]?.school || 'law';
    const schoolName = school === 'law' ? 'Lumina Law' : 
                       school === 'health' ? 'Lumina Health' : 
                       school === 'business' ? 'Lumina Business' : 'Lumina Academy';

    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";

    // Send email to each tutor
    const emailPromises = tutorsToNotify.map(async (tutor) => {
      const courseListHtml = tutor.courses.map(courseName => `
        <li style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
          <strong>${courseName}</strong>
        </li>
      `).join('');

      const emailContent = `
        <p>Great news! A new student has enrolled in your course(s).</p>
        
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); border-radius: 12px; padding: 20px; margin: 20px 0; color: white;">
          <h3 style="margin: 0 0 10px 0; color: white;">New Student</h3>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: white;">${studentName}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; color: white;">${studentEmail}</p>
        </div>
        
        <h3 style="color: #333; margin-top: 20px;">Enrolled Course(s):</h3>
        <ul style="list-style: none; padding: 0; margin: 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          ${courseListHtml}
        </ul>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #166534; font-size: 14px; margin: 0;">
            <strong>💡 Tip:</strong> Log in to your Tutor Dashboard to view all enrolled students and access quick contact options.
          </p>
        </div>
        
        <p>Keep up the great work!</p>
        <p style="margin-top: 30px;">
          Best regards,<br/>
          <strong>The ${schoolName} Team</strong>
        </p>
      `;

      const emailHtml = getEmailTemplate({
        title: '🎓 New Student Enrolled!',
        name: tutor.tutorName,
        content: emailContent,
      });

      console.log(`[notify-tutor-enrollment] Sending email to tutor: ${tutor.tutorEmail}`);

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${schoolName} <${fromEmail}>`,
          to: [tutor.tutorEmail],
          subject: `🎓 New Student Enrolled: ${studentName}`,
          html: emailHtml,
        }),
      });

      const emailResult = await emailResponse.json();
      console.log(`[notify-tutor-enrollment] Email sent to ${tutor.tutorEmail}:`, emailResult);
      
      return { tutor: tutor.tutorEmail, result: emailResult };
    });

    const emailResults = await Promise.all(emailPromises);

    console.log(`[notify-tutor-enrollment] Successfully notified ${emailResults.length} tutors`);

    return new Response(JSON.stringify({ 
      success: true, 
      tutorsNotified: emailResults.length,
      results: emailResults 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[notify-tutor-enrollment] Error:", error);
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
