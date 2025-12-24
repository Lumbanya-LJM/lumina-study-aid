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
  temporaryPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, applicantName, applicantEmail, adminEmail, rejectionReason, temporaryPassword }: EmailRequest = await req.json();
    
    console.log(`Processing ${type} email for ${applicantEmail}`);

    let emailResponse;

    if (type === 'submitted') {
      // Email to applicant
      await resend.emails.send({
        from: "LMV Academy <admin@lmvacademy.com>",
        to: [applicantEmail],
        subject: "Tutor Application Received - LMV Academy",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed; margin-bottom: 10px;">Application Received!</h1>
            </div>
            <p style="color: #374151; font-size: 16px;">Dear ${applicantName},</p>
            <p style="color: #374151; font-size: 16px;">Thank you for applying to become a tutor at LMV Academy! We have received your application and our team will review it shortly.</p>
            <p style="color: #374151; font-size: 16px;">You will be notified via email and push notification once a decision has been made.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #374151; font-weight: bold; margin-bottom: 10px;">What to expect:</p>
              <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Our team will review your qualifications and experience</li>
                <li style="margin-bottom: 8px;">This typically takes 2-5 business days</li>
                <li style="margin-bottom: 8px;">You'll receive an email with the outcome</li>
              </ul>
            </div>
            <p style="color: #374151; font-size: 16px;">Best regards,<br><strong>The LMV Academy Team</strong></p>
          </div>
        `,
      });

      // Email to admin if provided
      if (adminEmail) {
        await resend.emails.send({
          from: "LMV Academy <admin@lmvacademy.com>",
          to: [adminEmail],
          subject: `New Tutor Application: ${applicantName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #7c3aed;">New Tutor Application</h1>
              <p style="color: #374151;">A new tutor application has been submitted:</p>
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 8px 0;"><strong>Name:</strong> ${applicantName}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> ${applicantEmail}</p>
              </div>
              <p style="color: #374151;">Please review the application in the admin dashboard.</p>
              <p style="color: #374151;">Best regards,<br>LMV Academy System</p>
            </div>
          `,
        });
      }

      emailResponse = { success: true, message: 'Submission emails sent' };
    } else if (type === 'approved') {
      // Include credentials if provided
      const credentialsSection = temporaryPassword ? `
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Your Login Credentials</h3>
          <p style="margin-bottom: 8px;"><strong>Email/Username:</strong> ${applicantEmail}</p>
          <p style="margin-bottom: 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        </div>
        <p style="color: #dc2626; font-size: 14px;"><strong>Important:</strong> Please change your password after your first login for security.</p>
      ` : '';
      
      emailResponse = await resend.emails.send({
        from: "LMV Academy <admin@lmvacademy.com>",
        to: [applicantEmail],
        subject: "🎉 Congratulations! Your Tutor Application is Approved - LMV Academy",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px; margin-bottom: 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🎉 Congratulations!</h1>
              <p style="color: #e9d5ff; margin-top: 10px; font-size: 18px;">Welcome to Luminary Teach</p>
            </div>
            
            <p style="color: #374151; font-size: 16px;">Dear ${applicantName},</p>
            
            <p style="color: #374151; font-size: 16px;">We are thrilled to inform you that your application to become a tutor at LMV Academy has been <strong style="color: #22c55e;">approved</strong>!</p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #166534; margin: 0; font-weight: bold;">🌟 You're now part of our elite teaching team!</p>
            </div>
            
            ${credentialsSection}
            
            <p style="color: #374151; font-size: 16px;">As a Luminary Tutor, you now have access to:</p>
            <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;"><strong>Create and manage courses</strong> - Design comprehensive law courses for students</li>
                <li style="margin-bottom: 10px;"><strong>Host live classes</strong> - Conduct interactive video sessions with students</li>
                <li style="margin-bottom: 10px;"><strong>Upload course materials</strong> - Share notes, case summaries, and resources</li>
                <li style="margin-bottom: 10px;"><strong>Post updates</strong> - Keep your students informed with announcements</li>
                <li style="margin-bottom: 10px;"><strong>Track student progress</strong> - Monitor enrollment and engagement</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">To get started, log in to your account and look for the <strong>"Teach"</strong> button in the Academy section.</p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="color: #7c3aed; font-weight: bold; margin: 0; font-size: 18px;">Welcome to the team! 🚀</p>
              <p style="color: #6b7280; margin-top: 10px; margin-bottom: 0;">We're excited to have you help shape the future of legal education.</p>
            </div>
            
            <p style="color: #374151; font-size: 16px;">Best regards,<br><strong>The LMV Academy Team</strong></p>
          </div>
        `,
      });
    } else if (type === 'rejected') {
      emailResponse = await resend.emails.send({
        from: "LMV Academy <admin@lmvacademy.com>",
        to: [applicantEmail],
        subject: "Tutor Application Update - LMV Academy",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed;">Application Update</h1>
            </div>
            <p style="color: #374151; font-size: 16px;">Dear ${applicantName},</p>
            <p style="color: #374151; font-size: 16px;">Thank you for your interest in becoming a tutor at LMV Academy.</p>
            <p style="color: #374151; font-size: 16px;">After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            ${rejectionReason ? `
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #991b1b; font-weight: bold; margin-bottom: 8px;">Reason:</p>
                <p style="color: #7f1d1d; margin: 0;">${rejectionReason}</p>
              </div>
            ` : ''}
            <p style="color: #374151; font-size: 16px;">You are welcome to apply again in the future if your circumstances change.</p>
            <p style="color: #374151; font-size: 16px;">Thank you for your understanding.</p>
            <p style="color: #374151; font-size: 16px;">Best regards,<br><strong>The LMV Academy Team</strong></p>
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
