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
        // Parse the scheduled time and format it correctly for CAT timezone
        // The scheduledAt is stored in UTC, so we need to display it in Africa/Lusaka timezone
        let formattedTime = 'Time TBD';
        if (scheduledAt) {
          const date = new Date(scheduledAt);
          // Format date parts manually to avoid timezone conversion issues
          const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Africa/Lusaka'
          };
          formattedTime = new Intl.DateTimeFormat('en-ZM', options).format(date);
        }

        let title = '';
        let content = '';

        switch (updateType) {
          case 'scheduled':
            title = '📅 New Class Scheduled';
            content = `
              <p>A new class has been scheduled for your course!</p>
              <div style="background: linear-gradient(135deg, #1a3a4a 0%, #0d2633 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; border-left: 4px solid #4ade80;">
                <p style="margin: 0 0 10px 0; color: #e2e8f0;"><strong style="color: #4ade80;">Class:</strong> ${classTitle}</p>
                <p style="margin: 0; color: #e2e8f0;"><strong style="color: #4ade80;">When:</strong> ${formattedTime} (CAT)</p>
              </div>
              <p>Make sure to mark your calendar and prepare any questions you may have!</p>
              <p style="margin-top: 20px;">Open the LMV Academy app to view class details and join when it's time.</p>
            `;
            break;
          case 'updated':
            title = '📝 Class Updated';
            content = `
              <p>The class <strong style="color: #4ade80;">${classTitle}</strong> has been updated.</p>
              <div style="background: linear-gradient(135deg, #1a3a4a 0%, #0d2633 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; border-left: 4px solid #fbbf24;">
                <p style="margin: 0 0 10px 0; color: #e2e8f0;"><strong style="color: #fbbf24;">Class:</strong> ${classTitle}</p>
                <p style="margin: 0; color: #e2e8f0;"><strong style="color: #fbbf24;">New Time:</strong> ${formattedTime} (CAT)</p>
              </div>
              <p>Please update your calendar with the new details. Open the app for more information.</p>
            `;
            break;
          case 'cancelled':
            title = '❌ Class Cancelled';
            content = `
              <p>We regret to inform you that the class <strong style="color: #ef4444;">${classTitle}</strong> has been cancelled.</p>
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