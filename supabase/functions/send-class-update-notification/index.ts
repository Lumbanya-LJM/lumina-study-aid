import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEmailTemplate } from '../_shared/email-template.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClassUpdateRequest {
  classId: string;
  courseId: string;
  classTitle: string;
  scheduledAt: string | null;
  meetingLink: string | null;
  updateType: 'scheduled' | 'updated' | 'cancelled';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { classId, courseId, classTitle, scheduledAt, meetingLink, updateType }: ClassUpdateRequest = await req.json();

    console.log('Sending class update notification:', { classId, courseId, classTitle, updateType });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from('academy_enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('status', 'active');

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      throw enrollError;
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('No enrolled students found');
      return new Response(
        JSON.stringify({ success: true, message: 'No students to notify' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get student profiles
    const userIds = enrollments.map(e => e.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Get user emails from auth
    const students: { userId: string; email: string; fullName: string }[] = [];
    
    for (const userId of userIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        const profile = profiles?.find(p => p.user_id === userId);
        students.push({
          userId,
          email: userData.user.email,
          fullName: profile?.full_name || 'Student'
        });
      }
    }

    console.log(`Found ${students.length} students to notify`);

    // Send emails using Resend API directly
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const student of students) {
      try {
        const formattedTime = scheduledAt
          ? new Date(scheduledAt).toLocaleString('en-ZM', {
              timeZone: 'Africa/Lusaka',
              dateStyle: 'full',
              timeStyle: 'short'
            })
          : 'Time TBD';

        let title = '';
        let content = '';

        switch (updateType) {
          case 'scheduled':
            title = '📅 New Class Scheduled!';
            content = `
              <p>Great news! A new class <strong class="highlight">${classTitle}</strong> has been scheduled. Mark your calendar!</p>
              <div style="background: #f0f2f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                <p style="margin: 0 0 10px 0;"><strong>Class:</strong> ${classTitle}</p>
                <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime} (CAT)</p>
                ${meetingLink ? `<p style="margin: 0;"><strong>Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
              </div>
              <p>Add this to your calendar and prepare for the class!</p>
              <div style="text-align: center;"><a href="https://app.lmvacademy.com/home" class="button">View in App</a></div>
            `;
            break;
          case 'updated':
            title = '📝 Class Updated';
            content = `
              <p>The class <strong class="highlight">${classTitle}</strong> has been updated. Please review the new details below.</p>
              <div style="background: #f0f2f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                <p style="margin: 0 0 10px 0;"><strong>Class:</strong> ${classTitle}</p>
                <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime} (CAT)</p>
                ${meetingLink ? `<p style="margin: 0;"><strong>Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
              </div>
              <p>Make sure to update your calendar with the new details!</p>
              <div style="text-align: center;"><a href="https://app.lmvacademy.com/home" class="button">View in App</a></div>
            `;
            break;
          case 'cancelled':
            title = '❌ Class Cancelled';
            content = `
              <p>We regret to inform you that the class <strong class="highlight">${classTitle}</strong> has been cancelled.</p>
              <p>We apologize for any inconvenience. Please check the app for updates or contact your tutor for more information.</p>
            `;
            break;
        }

        const emailHtml = getEmailTemplate({
          title,
          name: student.fullName,
          content,
        });

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `LMV Academy <${fromEmail}>`,
            to: [student.email],
            subject: updateType === 'cancelled'
              ? `❌ Class Cancelled: ${classTitle}`
              : updateType === 'scheduled'
                ? `📅 New Class Scheduled: ${classTitle}`
                : `📝 Class Updated: ${classTitle}`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          emailsSent++;
          console.log(`Email sent to ${student.email}`);
        } else {
          const errorData = await emailResponse.text();
          console.error(`Failed to send email to ${student.email}:`, errorData);
          emailsFailed++;
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${student.email}:`, emailError);
        emailsFailed++;
      }
    }

    console.log(`Notification complete: ${emailsSent} sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        emailsFailed,
        totalStudents: students.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error('Error in send-class-update-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);