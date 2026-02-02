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
    const user = await validateUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Authorize the user (admin, moderator, or tutor)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const isAuthorized = await checkAdminOrTutor(supabase, user.id);
    if (!isAuthorized) {
      console.warn(`[get-user-emails] Unauthorized access attempt by user ${user.id}`);
      return new Response(JSON.stringify({ error: "Forbidden: Privileged access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userIds }: GetUserEmailsRequest = await req.json();

    // 3. Validate input
    if (!userIds || !Array.isArray(userIds)) {
      return new Response(JSON.stringify({ error: "Invalid input: userIds must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (userIds.length > 50) {
      return new Response(JSON.stringify({ error: "Too many user IDs: maximum 50 allowed per request" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ emails: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[get-user-emails] Fetching emails for ${userIds.length} users, requested by ${user.email}`);

    // Fetch users in parallel using admin API
    const emailPromises = userIds.map(async (userId) => {
      try {
        const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
        if (!error && userData?.user?.email) {
          return { user_id: userId, email: userData.user.email };
        }
      } catch (err) {
        console.log(`[get-user-emails] Could not fetch email for user ${userId}:`, err);
      }
      return null;
    });

    const results = await Promise.all(emailPromises);
    const emails = results.filter((r): r is { user_id: string; email: string } => r !== null);

    console.log(`[get-user-emails] Successfully fetched ${emails.length} emails`);

    return new Response(JSON.stringify({ emails }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[get-user-emails] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
