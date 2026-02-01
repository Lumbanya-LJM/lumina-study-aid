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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });

    // RBAC Check: Only admins, moderators, or tutors (assigned to a course) can access emails
    const [{ data: roles }, { data: courses }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'moderator']),
      supabaseAdmin.from('academy_courses').select('id').eq('tutor_id', user.id).limit(1)
    ]);

    if (!(roles?.length || courses?.length)) {
      console.warn(`[get-user-emails] Unauthorized access attempt by user ${user.id}`);
      return new Response(JSON.stringify({ error: "Unauthorized access" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { userIds }: GetUserEmailsRequest = await req.json();
    if (!Array.isArray(userIds) || userIds.length > 50) return new Response(JSON.stringify({ error: "Invalid userIds (max 50)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[get-user-emails] Authorized access by ${user.id}. Fetching emails for ${userIds.length} users`);
    const emails = [];
    for (const userId of userIds) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!error && data?.user?.email) emails.push({ user_id: userId, email: data.user.email });
    }

    return new Response(JSON.stringify({ emails }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("[get-user-emails] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
