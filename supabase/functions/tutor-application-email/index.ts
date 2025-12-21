import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'submitted' | 'approved' | 'rejected';
  applicantName: string;
  applicantEmail: string;
  adminEmail?: string;
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, applicantName, applicantEmail, adminEmail, rejectionReason }: EmailRequest = await req.json();

    let emailResponse;

    if (type === 'submitted') {
      // Email to applicant
      await resend.emails.send({
        from: "LMV Academy <onboarding@resend.dev>",
        to: [applicantEmail],
        subject: "Tutor Application Received - LMV Academy",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Application Received!</h1>
            <p>Dear ${applicantName},</p>
            <p>Thank you for applying to become a tutor at LMV Academy! We have received your application and our team will review it shortly.</p>
            <p>You will be notified via email and push notification once a decision has been made.</p>
            <p>What to expect:</p>
            <ul>
              <li>Our team will review your qualifications and experience</li>
              <li>This typically takes 2-5 business days</li>
              <li>You'll receive an email with the outcome</li>
            </ul>
            <p>Best regards,<br>The LMV Academy Team</p>
          </div>
        `,
      });

      // Email to admin if provided
      if (adminEmail) {
        await resend.emails.send({
          from: "LMV Academy <onboarding@resend.dev>",
          to: [adminEmail],
          subject: `New Tutor Application: ${applicantName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #7c3aed;">New Tutor Application</h1>
              <p>A new tutor application has been submitted:</p>
              <ul>
                <li><strong>Name:</strong> ${applicantName}</li>
                <li><strong>Email:</strong> ${applicantEmail}</li>
              </ul>
              <p>Please review the application in the admin dashboard.</p>
              <p>Best regards,<br>LMV Academy System</p>
            </div>
          `,
        });
      }

      emailResponse = { success: true, message: 'Submission emails sent' };
    } else if (type === 'approved') {
      emailResponse = await resend.emails.send({
        from: "LMV Academy <onboarding@resend.dev>",
        to: [applicantEmail],
        subject: "Congratulations! Your Tutor Application is Approved - LMV Academy",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">🎉 Welcome to Luminary Teach!</h1>
            <p>Dear ${applicantName},</p>
            <p>Congratulations! Your application to become a tutor at LMV Academy has been <strong>approved</strong>!</p>
            <p>You now have access to Luminary Teach where you can:</p>
            <ul>
              <li>Create and manage courses</li>
              <li>Host live classes with video conferencing</li>
              <li>Upload course materials</li>
              <li>Post updates for your students</li>
              <li>Track student enrollment and progress</li>
            </ul>
            <p>To get started, log in to your account and look for the "Teach" button in the Academy section.</p>
            <p>Welcome to the team!</p>
            <p>Best regards,<br>The LMV Academy Team</p>
          </div>
        `,
      });
    } else if (type === 'rejected') {
      emailResponse = await resend.emails.send({
        from: "LMV Academy <onboarding@resend.dev>",
        to: [applicantEmail],
        subject: "Tutor Application Update - LMV Academy",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Application Update</h1>
            <p>Dear ${applicantName},</p>
            <p>Thank you for your interest in becoming a tutor at LMV Academy.</p>
            <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
            <p>You are welcome to apply again in the future if your circumstances change.</p>
            <p>Thank you for your understanding.</p>
            <p>Best regards,<br>The LMV Academy Team</p>
          </div>
        `,
      });
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in tutor-application-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
