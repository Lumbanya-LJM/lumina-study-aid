import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Validates the user's JWT from the request's Authorization header.
 * This ensures that the requester is a valid, authenticated user.
 *
 * @param req The incoming request object
 * @returns The user object if authentication is successful
 * @throws Error if Authorization header is missing or token is invalid
 */
export async function validateUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Create a client with the user's token to verify identity via Supabase Auth
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error("Auth error:", error);
    throw new Error("Invalid or expired token");
  }

  return user;
}

/**
 * Checks if a user has administrative or instructional permissions.
 * Only Admins, Moderators, and Tutors are allowed to access sensitive PII or perform restricted actions.
 *
 * @param supabase Admin-level Supabase client (service role)
 * @param userId The ID of the user to check
 * @returns boolean indicating if the user is authorized
 */
export async function checkAdminOrTutor(supabase: SupabaseClient, userId: string): Promise<boolean> {
  // 1. Check user_roles table for 'admin' or 'moderator' roles
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    console.error("Error checking user roles:", rolesError);
    return false;
  }

  const hasAdminRole = (roles as { role: string }[])?.some(
    (r) => r.role === "admin" || r.role === "moderator"
  );

  if (hasAdminRole) return true;

  // 2. Check if user is a tutor assigned to any course
  const { data: course, error: courseError } = await supabase
    .from("academy_courses")
    .select("id")
    .eq("tutor_id", userId)
    .limit(1)
    .maybeSingle();

  if (courseError) {
    console.error("Error checking tutor status:", courseError);
    return false;
  }

  return !!course;
}
