import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateUser, checkAdminOrTutor } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetUserEmailsRequest {
  userIds: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the user
    const { user, supabase: userClient } = await validateUser(req);

    // 2. Check authorization (Admin, Moderator, or Tutor)
    const isAuthorized = await checkAdminOrTutor(userClient, user.id);
    if (!isAuthorized) {
      console.warn(`[get-user-emails] Unauthorized access attempt by user ${user.id}`);
      return new Response(JSON.stringify({ error: "Unauthorized: Access restricted to admins and tutors" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userIds }: GetUserEmailsRequest = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ emails: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Limit to 50 users per request to prevent PII leakage and Auth API rate limiting
    const limitedUserIds = userIds.slice(0, 50);
    console.log(`[get-user-emails] Fetching emails for ${limitedUserIds.length} users (requested ${userIds.length})`);

    // Create Supabase admin client for accessing auth.users
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch emails in parallel for better performance
    const emailResults = await Promise.all(
      limitedUserIds.map(async (userId) => {
        try {
          const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!error && userData?.user?.email) {
            return { user_id: userId, email: userData.user.email };
          }
        } catch (err) {
          console.error(`[get-user-emails] Could not fetch email for user ${userId}:`, err);
        }
        return null;
      })
    );

    const emails = emailResults.filter((e): e is { user_id: string; email: string } => e !== null);
    console.log(`[get-user-emails] Successfully fetched ${emails.length} emails`);

    return new Response(JSON.stringify({ emails }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[get-user-emails] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const status = errorMessage === "Unauthorized" || errorMessage === "No authorization header" ? 401 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage === "Unauthorized" || errorMessage === "No authorization header" ? errorMessage : "Internal server error" }),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
