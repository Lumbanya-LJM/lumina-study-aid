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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the requester
    let user;
    try {
      user = await validateUser(req);
    } catch (authError) {
      return new Response(
        JSON.stringify({ error: authError instanceof Error ? authError.message : "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 3. Authorize the requester (must be Admin, Moderator, or Tutor)
    const isAuthorized = await checkAdminOrTutor(supabase, user.id);
    if (!isAuthorized) {
      console.warn(`[get-user-emails] Unauthorized access attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { userIds }: GetUserEmailsRequest = await req.json();

    if (!userIds || userIds.length === 0) {
      return new Response(JSON.stringify({ emails: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 4. Input validation: limit the number of user IDs to prevent bulk scraping (PII leakage risk)
    if (userIds.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many user IDs. Maximum 50 allowed per request." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[get-user-emails] Fetching emails for ${userIds.length} users by authorized user ${user.id}`);

    // 5. Fetch users from auth.users using admin API in parallel for better performance
    const emailPromises = userIds.map(async (userId) => {
      try {
        const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
        if (!error && userData?.user?.email) {
          return {
            user_id: userId,
            email: userData.user.email
          };
        }
      } catch (err) {
        console.error(`[get-user-emails] Could not fetch email for user ${userId}:`, err);
      }
      return null;
    });

    const results = await Promise.all(emailPromises);
    const emails = results.filter((result): result is { user_id: string; email: string } => result !== null);

    console.log(`[get-user-emails] Successfully fetched ${emails.length} emails`);

    return new Response(JSON.stringify({ emails }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[get-user-emails] Unexpected error:", error);
    // Secure error handling: don't leak specific error details to the client
    return new Response(
      JSON.stringify({ error: "An internal server error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
