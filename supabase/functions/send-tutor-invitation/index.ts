import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEmailTemplate } from "../_shared/email-template.ts";

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

    let invitation;

    if (existingInvitation) {
      // Update existing invitation with new token and details
      const { data: updatedInvitation, error: updateError } = await supabase
        .from("tutor_invitations")
        .update({
          full_name: fullName,
          selected_courses: selectedCourses || [],
          invitation_token: invitationToken,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq("id", existingInvitation.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating invitation:", updateError);
        throw new Error("Failed to update invitation");
      }
      invitation = updatedInvitation;
      console.log("Updated existing invitation for:", email);
    } else {
      // Create new invitation record
      const { data: newInvitation, error: insertError } = await supabase
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
      invitation = newInvitation;
      console.log("Created new invitation for:", email);
    }

    // Get the app URL from environment - use custom domain as default
    const appUrl = Deno.env.get("APP_URL") || "https://app.lmvacademy.com";
    const invitationLink = `${appUrl}/auth?invitation=${invitationToken}`;

    // Get the from email from environment or use default
    const smtpFrom = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
    const fromEmail = `LMV Academy <${smtpFrom}>`;

    console.log("Sending invitation email from:", fromEmail, "to:", email, "with link:", invitationLink);

    // Generate email content using the shared template
    const emailContent = `
      <p>You have been invited to join <strong>LMV Academy</strong> as a tutor! We're excited to have you share your knowledge and expertise with our students.</p>
      
      <p>As a tutor at LMV Academy, you'll have the opportunity to:</p>
      <ul>
        <li>Teach and mentor aspiring legal professionals</li>
        <li>Schedule and conduct live classes</li>
        <li>Share course materials and resources</li>
        <li>Track student progress and engagement</li>
      </ul>
      
      <p>Click the button below to accept your invitation and create your tutor account:</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" class="button">Accept Invitation</a>
      </p>
      
      <div class="info-box">
        <p><strong>Note:</strong> This invitation link will expire in 7 days. If you have any questions, please contact our support team.</p>
      </div>
      
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    `;

    const emailHtml = getEmailTemplate({
      title: "You're Invited to Join as a Tutor!",
      name: fullName,
      content: emailContent,
    });

    // Send the invitation email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "You're Invited to Join LMV Academy as a Tutor!",
      html: emailHtml,
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
