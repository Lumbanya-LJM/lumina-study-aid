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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds }: GetUserEmailsRequest = await req.json();

    if (!userIds || userIds.length === 0) {
      return new Response(JSON.stringify({ emails: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[get-user-emails] Fetching emails for ${userIds.length} users`);

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch users from auth.users using admin API
    const emails: { user_id: string; email: string }[] = [];
    
    for (const userId of userIds) {
      try {
        const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
        
        if (!error && userData?.user?.email) {
          emails.push({
            user_id: userId,
            email: userData.user.email
          });
        }
      } catch (err) {
        console.log(`[get-user-emails] Could not fetch email for user ${userId}:`, err);
      }
    }

    console.log(`[get-user-emails] Successfully fetched ${emails.length} emails`);

    return new Response(JSON.stringify({ emails }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[get-user-emails] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
