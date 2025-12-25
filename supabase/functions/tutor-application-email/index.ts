import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

const baseStyles = `
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
  .header { background: linear-gradient(135deg, #2A5A6A 0%, #1a3d47 100%); padding: 40px 30px; text-align: center; }
  .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
  .tagline { color: rgba(255, 255, 255, 0.8); font-size: 14px; }
  .content { padding: 40px 30px; }
  h1 { color: #ffffff; font-size: 24px; margin: 0 0 20px 0; }
  p { color: #b8b8b8; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
  .footer { padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); }
  .footer p { color: #666; font-size: 12px; margin: 0; }
  .info-box { background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin: 20px 0; }
  .success-box { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 20px; border-radius: 12px; margin: 20px 0; }
  .success-box p { color: #4ade80; margin: 0; }
  .warning-box { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 20px; border-radius: 12px; margin: 20px 0; }
  .warning-box p { color: #f87171; }
  ul { color: #b8b8b8; padding-left: 20px; margin: 0 0 20px 0; }
  li { margin-bottom: 12px; }
  .highlight { color: #4ecdc4; }
  .credentials { background: rgba(78, 205, 196, 0.1); border: 1px solid rgba(78, 205, 196, 0.3); padding: 20px; border-radius: 12px; margin: 20px 0; }
  .credentials p { margin: 8px 0; color: #4ecdc4; }
`;

const getSubmittedEmail = (applicantName: string) => `
  <!DOCTYPE html>
  <html>
  <head><style>${baseStyles}</style></head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">LMV ACADEMY</div>
        <div class="tagline">Luminary Innovision Academy</div>
      </div>
      <div class="content">
        <h1>Application Received! 📋</h1>
        <p>Dear ${applicantName},</p>
        <p>Thank you for applying to become a tutor at LMV Academy! We have received your application and our team will review it shortly.</p>
        <p>You will be notified via email and push notification once a decision has been made.</p>
        <div class="info-box">
          <p style="color: #ffffff; font-weight: bold; margin-bottom: 15px;">What to expect:</p>
          <ul>
            <li>Our team will review your qualifications and experience</li>
            <li>This typically takes 2-5 business days</li>
            <li>You'll receive an email with the outcome</li>
          </ul>
        </div>
        <p>Best regards,<br><strong class="highlight">The LMV Academy Team</strong></p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
        <p>Questions? Contact us at admin@lmvacademy.com</p>
      </div>
    </div>
  </body>
  </html>
`;

const getAdminNotificationEmail = (applicantName: string, applicantEmail: string) => `
  <!DOCTYPE html>
  <html>
  <head><style>${baseStyles}</style></head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">LMV ACADEMY</div>
        <div class="tagline">Admin Notification</div>
      </div>
      <div class="content">
        <h1>New Tutor Application 📝</h1>
        <p>A new tutor application has been submitted:</p>
        <div class="info-box">
          <p><strong>Name:</strong> ${applicantName}</p>
          <p><strong>Email:</strong> ${applicantEmail}</p>
        </div>
        <p>Please review the application in the admin dashboard.</p>
        <p>Best regards,<br>LMV Academy System</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
`;

const getApprovedEmail = (applicantName: string, applicantEmail: string, temporaryPassword?: string) => {
  const credentialsSection = temporaryPassword ? `
    <div class="credentials">
      <p style="font-weight: bold; margin-bottom: 15px;">Your Login Credentials:</p>
      <p><strong>Email:</strong> ${applicantEmail}</p>
      <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
    </div>
    <p style="color: #f87171;"><strong>Important:</strong> Please change your password after your first login for security.</p>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">LMV ACADEMY</div>
          <div class="tagline">Welcome to Luminary Teach</div>
        </div>
        <div class="content">
          <h1>🎉 Congratulations!</h1>
          <p>Dear ${applicantName},</p>
          <p>We are thrilled to inform you that your application to become a tutor at LMV Academy has been <strong style="color: #4ade80;">approved</strong>!</p>
          <div class="success-box">
            <p>🌟 You're now part of our elite teaching team!</p>
          </div>
          ${credentialsSection}
          <p>As a Luminary Tutor, you now have access to:</p>
          <div class="info-box">
            <ul>
              <li><strong>Create and manage courses</strong> - Design comprehensive law courses for students</li>
              <li><strong>Host live classes</strong> - Conduct interactive video sessions with students</li>
              <li><strong>Upload course materials</strong> - Share notes, case summaries, and resources</li>
              <li><strong>Post updates</strong> - Keep your students informed with announcements</li>
              <li><strong>Track student progress</strong> - Monitor enrollment and engagement</li>
            </ul>
          </div>
          <p>To get started, log in to your account and look for the <strong>"Teach"</strong> button in the Academy section.</p>
          <p style="color: #4ecdc4; font-weight: bold; font-size: 18px; text-align: center; margin-top: 30px;">Welcome to the team! 🚀</p>
          <p>Best regards,<br><strong class="highlight">The LMV Academy Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
          <p>Questions? Contact us at admin@lmvacademy.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getRejectedEmail = (applicantName: string, rejectionReason?: string) => `
  <!DOCTYPE html>
  <html>
  <head><style>${baseStyles}</style></head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">LMV ACADEMY</div>
        <div class="tagline">Luminary Innovision Academy</div>
      </div>
      <div class="content">
        <h1>Application Update</h1>
        <p>Dear ${applicantName},</p>
        <p>Thank you for your interest in becoming a tutor at LMV Academy.</p>
        <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
        ${rejectionReason ? `
          <div class="warning-box">
            <p><strong>Reason:</strong></p>
            <p>${rejectionReason}</p>
          </div>
        ` : ''}
        <p>You are welcome to apply again in the future if your circumstances change.</p>
        <p>Thank you for your understanding.</p>
        <p>Best regards,<br><strong class="highlight">The LMV Academy Team</strong></p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
        <p>Questions? Contact us at admin@lmvacademy.com</p>
      </div>
    </div>
  </body>
  </html>
`;

const sendEmail = async (to: string, subject: string, html: string) => {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST")!,
      port: 465,
      tls: true,
      auth: {
        username: Deno.env.get("SMTP_USER")!,
        password: Deno.env.get("SMTP_PASS")!,
      },
    },
  });

  try {
    await client.send({
      from: Deno.env.get("SMTP_FROM")!,
      to: to,
      subject: subject,
      html: html,
    });
    console.log(`Email sent to ${to}`);
    try { client.close(); } catch (_) {}
    return { success: true };
  } catch (error: any) {
    console.error("SMTP Error:", error);
    try { client.close(); } catch (_) {}
    throw error;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, applicantName, applicantEmail, adminEmail, rejectionReason, temporaryPassword }: EmailRequest = await req.json();
    
    console.log(`Processing ${type} email for ${applicantEmail}`);

    if (type === 'submitted') {
      // Email to applicant
      await sendEmail(
        applicantEmail,
        "Tutor Application Received - LMV Academy",
        getSubmittedEmail(applicantName)
      );

      // Email to admin if provided
      if (adminEmail) {
        await sendEmail(
          adminEmail,
          `New Tutor Application: ${applicantName}`,
          getAdminNotificationEmail(applicantName, applicantEmail)
        );
      }
    } else if (type === 'approved') {
      await sendEmail(
        applicantEmail,
        "🎉 Congratulations! Your Tutor Application is Approved - LMV Academy",
        getApprovedEmail(applicantName, applicantEmail, temporaryPassword)
      );
    } else if (type === 'rejected') {
      await sendEmail(
        applicantEmail,
        "Tutor Application Update - LMV Academy",
        getRejectedEmail(applicantName, rejectionReason)
      );
    }

    console.log("Email(s) sent successfully");

    return new Response(JSON.stringify({ success: true }), {
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
