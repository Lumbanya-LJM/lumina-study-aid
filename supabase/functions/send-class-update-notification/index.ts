import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const getEmailHtml = (
  studentName: string,
  classTitle: string,
  scheduledAt: string | null,
  meetingLink: string | null,
  updateType: 'scheduled' | 'updated' | 'cancelled'
) => {
  const formattedTime = scheduledAt 
    ? new Date(scheduledAt).toLocaleString('en-ZM', { 
        timeZone: 'Africa/Lusaka',
        dateStyle: 'full',
        timeStyle: 'short'
      })
    : 'Time TBD';

  const getTitle = () => {
    switch (updateType) {
      case 'scheduled':
        return '<span class="scheduled">📅 New Class Scheduled!</span>';
      case 'updated':
        return '<span class="updated">📝 Class Updated</span>';
      case 'cancelled':
        return '<span class="cancelled">❌ Class Cancelled</span>';
    }
  };

  const getMessage = () => {
    switch (updateType) {
      case 'scheduled':
        return `Great news! A new class <strong style="color: #4ecdc4;">${classTitle}</strong> has been scheduled. Mark your calendar!`;
      case 'updated':
        return `The class <strong style="color: #4ecdc4;">${classTitle}</strong> has been updated. Please review the new details below.`;
      case 'cancelled':
        return `We regret to inform you that the class <strong style="color: #4ecdc4;">${classTitle}</strong> has been cancelled.`;
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
        .header { background: linear-gradient(135deg, #2A5A6A 0%, #1a3d47 100%); padding: 40px 30px; text-align: center; }
        .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
        .tagline { color: rgba(255, 255, 255, 0.8); font-size: 14px; }
        .content { padding: 40px 30px; }
        h1 { color: #ffffff; font-size: 24px; margin: 0 0 20px 0; }
        p { color: #b8b8b8; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #2A5A6A 0%, #3d7a8a 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .info-box { background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin: 20px 0; }
        .info-item { color: #b8b8b8; margin: 10px 0; }
        .footer { padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); }
        .footer p { color: #666; font-size: 12px; margin: 0; }
        .scheduled { color: #4ecdc4; }
        .updated { color: #f0ad4e; }
        .cancelled { color: #ff6b6b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">LMV ACADEMY</div>
          <div class="tagline">Luminary Innovision Academy</div>
        </div>
        <div class="content">
          <h1>${getTitle()}</h1>
          <p>Hi ${studentName},</p>
          <p>${getMessage()}</p>
          ${updateType !== 'cancelled' ? `
            <div class="info-box">
              <div class="info-item">📅 <strong>Class:</strong> ${classTitle}</div>
              <div class="info-item">⏰ <strong>Time:</strong> ${formattedTime} (CAT)</div>
              ${meetingLink ? `<div class="info-item">🔗 <strong>Link:</strong> <a href="${meetingLink}" style="color: #4ecdc4;">${meetingLink}</a></div>` : ''}
            </div>
            <p>${updateType === 'scheduled' ? 'Add this to your calendar and prepare for the class!' : 'Make sure to update your calendar with the new details!'}</p>
            <div style="text-align: center;">
              <a href="https://app.lmvacademy.com/home" class="button">View in App</a>
            </div>
          ` : `
            <p>We apologize for any inconvenience. Please check the app for updates or contact your tutor for more information.</p>
          `}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
          <p>Excellence in Legal Education 🇿🇲</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

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
        const emailHtml = getEmailHtml(
          student.fullName,
          classTitle,
          scheduledAt,
          meetingLink,
          updateType as 'scheduled' | 'updated' | 'cancelled'
        );

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