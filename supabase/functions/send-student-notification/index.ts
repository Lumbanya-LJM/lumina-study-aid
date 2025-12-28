import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getEmailTemplate } from '../_shared/email-template.ts';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationType = 
  | 'recording_ready'
  | 'class_scheduled'
  | 'new_material'
  | 'tutor_update'
  | 'recurring_class_created';

interface NotificationRequest {
  type: NotificationType;
  courseId: string;
  data: {
    title: string;
    description?: string;
    classId?: string;
    scheduledAt?: string;
    tutorName?: string;
    materialTitle?: string;
    updateType?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-student-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, courseId, data }: NotificationRequest = await req.json();
    
    console.log(`Processing ${type} notification for course ${courseId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('academy_courses')
      .select('name, institution')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      throw new Error('Course not found');
    }

    // Get all enrolled students for this course
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
      console.log('No enrolled students for this course');
      return new Response(
        JSON.stringify({ success: true, message: 'No students to notify', sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userIds = enrollments.map(e => e.user_id);
    console.log(`Found ${userIds.length} enrolled students`);

    // Get user emails from auth.users (via profiles for display names)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Build a map of user profiles
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Get user emails from auth admin API
    const emailResults: { email: string; name: string }[] = [];
    
    for (const userId of userIds) {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (!userError && userData?.user?.email) {
          const profile = profileMap.get(userId);
          emailResults.push({
            email: userData.user.email,
            name: profile?.full_name || userData.user.email.split('@')[0],
          });
        }
      } catch (err) {
        console.error(`Error fetching user ${userId}:`, err);
      }
    }

    if (emailResults.length === 0) {
      console.log('No valid email addresses found');
      return new Response(
        JSON.stringify({ success: true, message: 'No valid emails', sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate email content based on notification type
    const { subject, emailContent } = generateEmailContent(type, data, course.name);
    
    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    const appUrl = Deno.env.get("APP_URL") || "https://lmvacademy.app";

    let successCount = 0;
    let failCount = 0;

    // Send emails to all students
    for (const { email, name } of emailResults) {
      try {
        const emailHtml = getEmailTemplate({
          title: getEmailTitle(type),
          name,
          content: emailContent.replace('{APP_URL}', appUrl),
        });

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `LMV Academy <${fromEmail}>`,
            to: [email],
            subject,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          successCount++;
          console.log(`Email sent to ${email}`);
        } else {
          failCount++;
          const error = await emailResponse.text();
          console.error(`Failed to send to ${email}:`, error);
        }
      } catch (err) {
        failCount++;
        console.error(`Error sending to ${email}:`, err);
      }
    }

    console.log(`Notification complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        total: emailResults.length 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-student-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function getEmailTitle(type: NotificationType): string {
  switch (type) {
    case 'recording_ready':
      return '📹 Class Recording Available';
    case 'class_scheduled':
      return '📅 New Class Scheduled';
    case 'new_material':
      return '📚 New Course Material';
    case 'tutor_update':
      return '📢 Tutor Update';
    case 'recurring_class_created':
      return '🔄 Next Recurring Class Scheduled';
    default:
      return '🔔 Course Notification';
  }
}

function generateEmailContent(
  type: NotificationType, 
  data: NotificationRequest['data'],
  courseName: string
): { subject: string; emailContent: string } {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBA';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  switch (type) {
    case 'recording_ready':
      return {
        subject: `📹 Recording Available: ${data.title}`,
        emailContent: `
          <p>Great news! The recording for your class is now available to watch.</p>
          <div class="info-box">
            <p><strong>Class:</strong> ${data.title}</p>
            <p><strong>Course:</strong> ${courseName}</p>
            ${data.tutorName ? `<p><strong>Tutor:</strong> ${data.tutorName}</p>` : ''}
          </div>
          <p>You can watch the recording at your convenience and review the key concepts covered.</p>
          <p style="text-align: center;">
            <a href="{APP_URL}/recordings" class="button">Watch Recording</a>
          </p>
          <p>Recording will include any AI-generated summaries and key points to help you study.</p>
        `,
      };

    case 'class_scheduled':
      return {
        subject: `📅 New Class: ${data.title}`,
        emailContent: `
          <p>A new class has been scheduled for your course!</p>
          <div class="info-box">
            <p><strong>Class:</strong> ${data.title}</p>
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>When:</strong> ${formatDate(data.scheduledAt)}</p>
            ${data.tutorName ? `<p><strong>Tutor:</strong> ${data.tutorName}</p>` : ''}
          </div>
          ${data.description ? `<p>${data.description}</p>` : ''}
          <p style="text-align: center;">
            <a href="{APP_URL}/liveclass" class="button">View Class Details</a>
          </p>
          <p>Make sure to mark your calendar and prepare any questions you may have!</p>
        `,
      };

    case 'new_material':
      return {
        subject: `📚 New Material: ${data.materialTitle || data.title}`,
        emailContent: `
          <p>Your tutor has uploaded new learning material for your course.</p>
          <div class="info-box">
            <p><strong>Material:</strong> ${data.materialTitle || data.title}</p>
            <p><strong>Course:</strong> ${courseName}</p>
            ${data.tutorName ? `<p><strong>Uploaded by:</strong> ${data.tutorName}</p>` : ''}
          </div>
          ${data.description ? `<p>${data.description}</p>` : ''}
          <p style="text-align: center;">
            <a href="{APP_URL}/academy" class="button">View Course Materials</a>
          </p>
          <p>We recommend reviewing new materials promptly to stay on track with your studies.</p>
        `,
      };

    case 'tutor_update':
      return {
        subject: `📢 Update from your tutor: ${data.title}`,
        emailContent: `
          <p>Your tutor has shared an important update.</p>
          <div class="info-box">
            <p><strong>Subject:</strong> ${data.title}</p>
            <p><strong>Course:</strong> ${courseName}</p>
            ${data.updateType ? `<p><strong>Type:</strong> ${data.updateType}</p>` : ''}
            ${data.tutorName ? `<p><strong>From:</strong> ${data.tutorName}</p>` : ''}
          </div>
          ${data.description ? `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;">${data.description}</p></div>` : ''}
          <p style="text-align: center;">
            <a href="{APP_URL}/academy" class="button">View Full Update</a>
          </p>
        `,
      };

    case 'recurring_class_created':
      return {
        subject: `🔄 Next ${data.title} class scheduled`,
        emailContent: `
          <p>Your next recurring class has been automatically scheduled!</p>
          <div class="info-box">
            <p><strong>Class:</strong> ${data.title}</p>
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>When:</strong> ${formatDate(data.scheduledAt)}</p>
            ${data.tutorName ? `<p><strong>Tutor:</strong> ${data.tutorName}</p>` : ''}
          </div>
          <p>This is a recurring class that meets at the same time each week. Mark your calendar!</p>
          <p style="text-align: center;">
            <a href="{APP_URL}/academy" class="button">View Class Schedule</a>
          </p>
        `,
      };

    default:
      return {
        subject: `🔔 Course Notification: ${courseName}`,
        emailContent: `
          <p>You have a new notification for your course.</p>
          <div class="info-box">
            <p><strong>Course:</strong> ${courseName}</p>
          </div>
          <p style="text-align: center;">
            <a href="{APP_URL}/academy" class="button">View Details</a>
          </p>
        `,
      };
  }
}

serve(handler);
