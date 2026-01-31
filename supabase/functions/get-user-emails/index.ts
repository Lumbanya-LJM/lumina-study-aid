import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create a client with the user's JWT to verify identity and check permissions
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Authorization check: User must be an Admin, Moderator, or a Tutor with at least one assigned course
    const { data: isAdmin } = await userClient.rpc('has_role', { _role: 'admin', _user_id: user.id });
    const { data: isModerator } = await userClient.rpc('has_role', { _role: 'moderator', _user_id: user.id });

    const { data: courses } = await userClient
      .from('academy_courses')
      .select('id')
      .eq('tutor_id', user.id)
      .limit(1);

    const isTutor = courses && courses.length > 0;

    if (!isAdmin && !isModerator && !isTutor) {
      console.log(`[get-user-emails] Forbidden: User ${user.id} attempted unauthorized access`);
      return new Response(JSON.stringify({ error: "Forbidden: Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userIds }: GetUserEmailsRequest = await req.json();

    if (!Array.isArray(userIds)) {
      return new Response(JSON.stringify({ error: "Invalid payload: userIds must be an array" }), {
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

    if (userIds.length > 500) {
      return new Response(JSON.stringify({ error: "Request too large: maximum 500 userIds allowed" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[get-user-emails] Authorized access by ${user.id}. Fetching emails for ${userIds.length} users`);

    // Use admin client to fetch emails from auth.users (requires service role)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const emails: { user_id: string; email: string }[] = [];
    
    for (const userId of userIds) {
      try {
        const { data: userData, error } = await adminClient.auth.admin.getUserById(userId);
        if (!error && userData?.user?.email) {
          emails.push({ user_id: userId, email: userData.user.email });
        }
      } catch (err) {
        console.log(`[get-user-emails] Could not fetch email for user ${userId}`);
      }
    }

    return new Response(JSON.stringify({ emails }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[get-user-emails] Error:", error);
    // Fail securely by not leaking internal error details
    return new Response(JSON.stringify({ error: "An internal server error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
