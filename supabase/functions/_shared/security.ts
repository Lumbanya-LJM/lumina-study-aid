import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Validates the user's JWT from the Authorization header.
 * Returns the user object if successful, or null if authentication fails.
 */
export async function validateUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error("[security] Missing Authorization header");
    return null;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[security] Supabase environment variables not configured");
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error("[security] Invalid or expired token:", error?.message);
    return null;
  }

  return user;
}

/**
 * Checks if a user has Admin, Moderator, or Tutor privileges.
 * Admin/Moderator status is checked in public.user_roles.
 * Tutor status is checked by presence in public.academy_courses.
 */
export async function checkAdminOrTutor(supabase: SupabaseClient, userId: string): Promise<boolean> {
  // 1. Check user_roles for admin or moderator
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"]);

  if (roleError) {
    console.error("[security] Error checking user roles:", roleError);
  } else if (roleData && roleData.length > 0) {
    console.log(`[security] User ${userId} has administrative role: ${roleData[0].role}`);
    return true;
  }

  // 2. Check if user is a tutor assigned to any course
  const { data: courseData, error: courseError } = await supabase
    .from("academy_courses")
    .select("id")
    .eq("tutor_id", userId)
    .limit(1);

  if (courseError) {
    console.error("[security] Error checking tutor status:", courseError);
  } else if (courseData && courseData.length > 0) {
    console.log(`[security] User ${userId} is an authorized tutor`);
    return true;
  }

  console.warn(`[security] User ${userId} does not have required permissions`);
  return false;
}
