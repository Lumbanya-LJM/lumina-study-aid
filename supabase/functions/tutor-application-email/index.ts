import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailTemplate } from '../_shared/email-template.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface EmailRequest {
  type: 'submitted' | 'approved' | 'rejected';
  applicantName: string;
  applicantEmail: string;
  adminEmail?: string;
  rejectionReason?: string;
  temporaryPassword?: string;
  applicationId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, applicantName, applicantEmail, adminEmail, rejectionReason, temporaryPassword, applicationId }: EmailRequest = await req.json();
    
    console.log(`Processing ${type} email for ${applicantEmail}${applicationId ? ` (Application ID: ${applicationId})` : ''}`);
    
    const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";

    if (type === 'submitted') {
        const submittedContent = `
            <p>Thank you for applying to become a tutor at LMV Academy! We have received your application and our team will review it shortly.</p>
            ${applicationId ? `
                <div style="background: #f0f2f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                    <p style="font-weight: bold; margin-bottom: 10px;">Your Application ID:</p>
                    <p style="font-size: 24px; letter-spacing: 2px; text-align: center; color: #1b263b;">${applicationId}</p>
                </div>
                <p style="font-size: 12px; color: #666;">Please keep this ID for your records. You may reference it in future communications.</p>
            ` : ''}
            <p>You will be notified via email and push notification once a decision has been made.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                <p style="font-weight: bold; margin-bottom: 15px;">What to expect:</p>
                <ul>
                    <li>Our team will review your qualifications and experience</li>
                    <li>This typically takes 2-5 business days</li>
                    <li>You'll receive an email with the outcome</li>
                </ul>
            </div>
            <p>Best regards,<br><strong>The LMV Academy Team</strong></p>
        `;
        const submittedEmailHtml = getEmailTemplate({ title: 'Application Received! 📋', name: applicantName, content: submittedContent });

        await resend.emails.send({
            from: `LMV Academy <${fromEmail}>`,
            to: [applicantEmail],
            subject: `Tutor Application Received${applicationId ? ` - ID: ${applicationId}` : ''} - LMV Academy`,
            html: submittedEmailHtml,
        });

        if (adminEmail) {
            const adminContent = `
                <p>A new tutor application has been submitted:</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                    <p><strong>Name:</strong> ${applicantName}</p>
                    <p><strong>Email:</strong> ${applicantEmail}</p>
                </div>
                <p>Please review the application in the admin dashboard.</p>
                <p>Best regards,<br>LMV Academy System</p>
            `;
            const adminEmailHtml = getEmailTemplate({ title: 'New Tutor Application 📝', content: adminContent });

            await resend.emails.send({
                from: `LMV Academy <${fromEmail}>`,
                to: [adminEmail],
                subject: `New Tutor Application: ${applicantName}${applicationId ? ` (ID: ${applicationId})` : ''}`,
                html: adminEmailHtml,
            });
        }
    } else if (type === 'approved') {
        // For approved tutors - they already have an account, just inform them about tutor access
        const approvedContent = `
            <p>We are thrilled to inform you that your application to become a tutor at LMV Academy has been <strong style="color: #16a34a;">approved</strong>!</p>
            <div class="info-box">
                <p>🌟 You're now part of our elite teaching team!</p>
            </div>
            <p>As a Luminary Tutor, you now have access to:</p>
            <ul>
                <li><strong>Create and manage courses</strong></li>
                <li><strong>Host live classes</strong></li>
                <li><strong>Upload course materials</strong></li>
                <li><strong>Post updates</strong></li>
                <li><strong>Track student progress</strong></li>
            </ul>
            <div class="info-box">
                <p><strong>How to access your Tutor Dashboard:</strong></p>
                <p>1. Log in to LMV Academy using your existing account credentials</p>
                <p>2. Look for the <strong>role switcher</strong> in the sidebar menu</p>
                <p>3. Select <strong>"Tutor Dashboard"</strong> to access your teaching portal</p>
            </div>
            <p style="font-weight: bold; font-size: 18px; text-align: center; margin-top: 30px; color: #2A5A6A;">Welcome to the team! 🚀</p>
            <p>Best regards,<br><strong>The LMV Academy Team</strong></p>
        `;
        const approvedEmailHtml = getEmailTemplate({ title: '🎉 Congratulations!', name: applicantName, content: approvedContent });

        await resend.emails.send({
            from: `LMV Academy <${fromEmail}>`,
            to: [applicantEmail],
            subject: "🎉 Congratulations! Your Tutor Application is Approved - LMV Academy",
            html: approvedEmailHtml,
        });
    } else if (type === 'rejected') {
        const rejectedContent = `
            <p>Thank you for your interest in becoming a tutor at LMV Academy.</p>
            <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            ${rejectionReason ? `
                <div style="background: #fff1f2; border: 1px solid #ffdde1; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="color: #be123c;"><strong>Reason:</strong></p>
                    <p style="color: #be123c;">${rejectionReason}</p>
                </div>
            ` : ''}
            <p>You are welcome to apply again in the future if your circumstances change.</p>
            <p>Thank you for your understanding.</p>
            <p>Best regards,<br><strong>The LMV Academy Team</strong></p>
        `;
        const rejectedEmailHtml = getEmailTemplate({ title: 'Application Update', name: applicantName, content: rejectedContent });

        await resend.emails.send({
            from: `LMV Academy <${fromEmail}>`,
            to: [applicantEmail],
            subject: "Tutor Application Update - LMV Academy",
            html: rejectedEmailHtml,
        });
    }

    console.log("Email(s) sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in tutor-application-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
