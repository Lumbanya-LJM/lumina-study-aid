import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userIds } = await req.json();
    if (!Array.isArray(userIds) || userIds.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid userIds (max 500)" }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Authentication Check
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    // 2. Authorization Check (Admin or Moderator/Tutor)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
      supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "moderator" })
    ]);

    if (!isAdmin && !isModerator) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
    }

    // 3. Fetch Emails in Parallel
    console.log(`[get-user-emails] Fetching ${userIds.length} emails for user ${user.id}`);
    
    const emailResults = await Promise.all(userIds.map(async (userId) => {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        return (!error && data?.user?.email) ? { user_id: userId, email: data.user.email } : null;
      } catch {
        return null;
      }
    }));

    const emails = emailResults.filter((r): r is { user_id: string; email: string } => r !== null);

    return new Response(JSON.stringify({ emails }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[get-user-emails] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
