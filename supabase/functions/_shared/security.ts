import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Validates the user's JWT from the request Authorization header.
 * Returns the user object if valid, throws an error otherwise.
 */
export async function validateUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: authHeader } },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Invalid token");
  }

  return user;
}

/**
 * Checks if a user has admin/moderator roles or is a tutor for a course.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkAdminOrTutor(supabase: any, userId: string) {
  // Check if user is admin or moderator
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"])
    .maybeSingle();

  if (roleData) {
    return true;
  }

  // Check if user is a tutor for any course
  const { data: courseData } = await supabase
    .from("academy_courses")
    .select("id")
    .eq("tutor_id", userId)
    .limit(1)
    .maybeSingle();

  if (courseData) {
    return true;
  }

  return false;
}
