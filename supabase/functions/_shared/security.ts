import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Validates the user's JWT from the Authorization header.
 * Uses an auth-aware client to verify identity via auth.getUser().
 */
export const validateUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "Missing Authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: "Invalid or expired token" };
  }

  return { user, error: null };
};

/**
 * Performs RBAC checks to see if a user has Admin, Moderator, or Tutor permissions.
 * Uses a service role client to bypass RLS for these checks.
 */
export const checkAdminOrTutor = async (supabase: SupabaseClient, userId: string) => {
  // 1. Check user_roles table for Admin or Moderator roles
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    console.error("[security] Error checking user roles:", rolesError);
  } else if (roles) {
    const hasPrivilegedRole = roles.some((r) =>
      ["admin", "moderator"].includes(r.role)
    );
    if (hasPrivilegedRole) return true;
  }

  // 2. Check if the user is a tutor for any academy course
  const { data: course, error: courseError } = await supabase
    .from("academy_courses")
    .select("id")
    .eq("tutor_id", userId)
    .limit(1)
    .maybeSingle();

  if (courseError) {
    console.error("[security] Error checking tutor status:", courseError);
  }

  return !!course;
};
