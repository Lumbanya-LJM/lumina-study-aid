import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateUser, checkAdminOrTutor, corsHeaders } from "../_shared/security.ts";

interface GetUserEmailsRequest {
  userIds: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user using JWT
    const user = await validateUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Create Supabase admin client for role checks and auth access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 3. Authorize user (Admin, Moderator, or Tutor)
    const isAuthorized = await checkAdminOrTutor(supabase, user.id);
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden: Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 4. Parse and validate payload
    const { userIds }: GetUserEmailsRequest = await req.json();

    if (!userIds || userIds.length === 0) {
      return new Response(JSON.stringify({ emails: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Limit to 50 users to prevent abuse and PII mass-harvesting
    const MAX_USERS = 50;
    const targetUserIds = userIds.slice(0, MAX_USERS);
    
    if (userIds.length > MAX_USERS) {
      console.warn(`[get-user-emails] Request for ${userIds.length} users truncated to ${MAX_USERS}`);
    }

    console.log(`[get-user-emails] User ${user.id} fetching emails for ${targetUserIds.length} users`);

    // 5. Fetch users in parallel for performance (Promise.all)
    const emailPromises = targetUserIds.map(async (userId) => {
      try {
        const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
        
        if (!error && userData?.user?.email) {
          return {
            user_id: userId,
            email: userData.user.email
          };
        }
      } catch (err) {
        console.log(`[get-user-emails] Could not fetch email for user ${userId}:`, err);
      }
      return null;
    });

    const results = await Promise.all(emailPromises);
    const emails = results.filter((e): e is { user_id: string; email: string } => e !== null);

    console.log(`[get-user-emails] Successfully fetched ${emails.length} emails`);

    return new Response(JSON.stringify({ emails }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[get-user-emails] Error:", error);
    // Secure error response: don't leak internals to client
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
