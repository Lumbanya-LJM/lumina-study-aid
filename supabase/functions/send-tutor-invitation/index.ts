import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  fullName?: string;
  selectedCourses?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (!isAdmin) {
      throw new Error("Only admins can send tutor invitations");
    }

    const { email, fullName, selectedCourses }: InvitationRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Generate a unique invitation token
    const invitationToken = crypto.randomUUID();

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation } = await supabase
      .from("tutor_invitations")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvitation) {
      throw new Error("A pending invitation already exists for this email");
    }

    // Create the invitation record
    const { data: invitation, error: insertError } = await supabase
      .from("tutor_invitations")
      .insert({
        email: email.toLowerCase(),
        full_name: fullName,
        selected_courses: selectedCourses || [],
        invitation_token: invitationToken,
        invited_by: user.id,
        status: "pending"
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating invitation:", insertError);
      throw new Error("Failed to create invitation");
    }

    // Get the app URL from environment or use a default
    const appUrl = Deno.env.get("APP_URL") || "https://lmv.lovable.app";
    const invitationLink = `${appUrl}/auth?invitation=${invitationToken}`;

    // Get the from email from environment or use default
    const smtpFrom = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    const fromEmail = `LMV Academy <${smtpFrom}>`;

    console.log("Sending invitation email from:", fromEmail, "to:", email);

    // Send the invitation email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "You're Invited to Join LMV Academy as a Tutor!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tutor Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to LMV Academy!</h1>
          </div>
          
          <div style="background: #1a1a2e; padding: 30px; border: 1px solid #2d2d44; border-top: none; border-radius: 0 0 12px 12px; color: #e5e5e5;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${fullName ? `Dear ${fullName},` : 'Hello,'}
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You have been invited to join <strong style="color: #14b8a6;">LMV Academy</strong> as a tutor! We're excited to have you share your knowledge and expertise with our students.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 30px;">
              Click the button below to accept your invitation and create your tutor account:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #a0a0a0; margin-top: 30px;">
              This invitation link will expire in 7 days. If you have any questions, please contact our support team.
            </p>
            
            <p style="font-size: 14px; color: #a0a0a0; margin-top: 20px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #2d2d44; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #666; text-align: center;">
              © ${new Date().getFullYear()} LMV Academy. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Still return success for the invitation record, but warn about email
      return new Response(
        JSON.stringify({ 
          success: true, 
          invitation: invitation,
          message: "Invitation created but email delivery failed",
          emailError: emailError.message
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Invitation email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation: invitation,
        message: "Invitation sent successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-tutor-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
