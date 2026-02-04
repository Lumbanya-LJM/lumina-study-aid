import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Validates the user's JWT from the request and returns the user object.
 * Also returns a Supabase client initialized with the user's JWT.
 */
export async function validateUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("No authorization header");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Create client with the user's auth header
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { user, supabase };
}

/**
 * Checks if a user has Admin, Moderator or Tutor privileges.
 * Tutors are checked against the academy_courses table.
 */
export async function checkAdminOrTutor(supabase: SupabaseClient, userId: string) {
  // Check for Admin or Moderator roles in user_roles table
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    console.error("[security] Error checking user_roles:", rolesError);
    return false;
  }

  const hasPrivilegedRole = roles?.some(
    (r: { role: string }) => r.role === "admin" || r.role === "moderator"
  );

  if (hasPrivilegedRole) return true;

  // Check if user is a Tutor assigned to any course
  const { data: course, error: courseError } = await supabase
    .from("academy_courses")
    .select("id")
    .eq("tutor_id", userId)
    .limit(1)
    .maybeSingle();

  if (courseError) {
    console.error("[security] Error checking tutor status:", courseError);
    return false;
  }

  return !!course;
}
