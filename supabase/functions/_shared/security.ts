import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Validates the user's JWT from the Authorization header.
 * Returns the user object if valid, otherwise null.
 */
export async function validateUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error("[security] Auth error or user not found:", error?.message);
    return null;
  }
  return user;
}

/**
 * Checks if a user has admin, moderator, or tutor privileges.
 * Admin/Moderator status is checked in user_roles table.
 * Tutor status is checked by seeing if they are a tutor for any course.
 */
export async function checkAdminOrTutor(supabase: SupabaseClient, userId: string) {
  // Check if admin or moderator
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"])
    .maybeSingle();

  if (roleData) return true;

  // Check if tutor for any course
  const { data: tutorData } = await supabase
    .from("academy_courses")
    .select("id")
    .eq("tutor_id", userId)
    .limit(1)
    .maybeSingle();

  return !!tutorData;
}
