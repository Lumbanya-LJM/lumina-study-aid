import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function validateUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace("Bearer ", "");

  if (token === supabaseServiceKey) return { id: "service-role", role: "admin" };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Invalid or expired token");
  return user;
}

export async function checkAdminOrTutor(supabase: SupabaseClient, userId: string) {
  if (userId === "service-role") return true;

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (roles?.some((r: { role: string }) => r.role === "admin" || r.role === "moderator")) return true;

  const { data: courses } = await supabase.from("academy_courses").select("id").eq("tutor_id", userId).limit(1);
  return !!(courses && courses.length > 0);
}
