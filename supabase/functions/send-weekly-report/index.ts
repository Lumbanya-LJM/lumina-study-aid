import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Partner {
  id: string;
  user_id: string;
  partner_name: string;
  partner_email: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  university: string | null;
  year_of_study: string | null;
}

interface WeeklyStats {
  tasksCompleted: number;
  totalTasks: number;
  quizzesTaken: number;
  flashcardsReviewed: number;
  studyHours: number;
  journalEntries: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-weekly-report function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the start and end of last week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(now);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekStartStr = startOfWeek.toISOString().split('T')[0];
    const weekEndStr = endOfWeek.toISOString().split('T')[0];

    console.log(`Processing reports for week: ${weekStartStr} to ${weekEndStr}`);

    // Get all accountability partners
    const { data: partners, error: partnersError } = await supabase
      .from("accountability_partners")
      .select("*");

    if (partnersError) {
      console.error("Error fetching partners:", partnersError);
      throw partnersError;
    }

    if (!partners || partners.length === 0) {
      console.log("No accountability partners found");
      return new Response(JSON.stringify({ message: "No partners to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${partners.length} accountability partners`);

    const emailResults = [];

    for (const partner of partners as Partner[]) {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", partner.user_id)
          .single();

        const studentName = (profile as Profile)?.full_name || "A Luminary Student";
        const university = (profile as Profile)?.university || "University";
        const yearOfStudy = (profile as Profile)?.year_of_study || "";

        // Get weekly stats
        const { count: tasksCompleted } = await supabase
          .from("study_tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", partner.user_id)
          .eq("completed", true)
          .gte("created_at", startOfWeek.toISOString());

        const { count: totalTasks } = await supabase
          .from("study_tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", partner.user_id)
          .gte("created_at", startOfWeek.toISOString());

        const { count: quizzesTaken } = await supabase
          .from("quizzes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", partner.user_id)
          .gte("created_at", startOfWeek.toISOString());

        const { data: flashcardDecks } = await supabase
          .from("flashcard_decks")
          .select("cards_reviewed")
          .eq("user_id", partner.user_id)
          .gte("last_reviewed", startOfWeek.toISOString());

        const flashcardsReviewed = flashcardDecks?.reduce((sum, deck) => sum + (deck.cards_reviewed || 0), 0) || 0;

        const { data: studySessions } = await supabase
          .from("study_sessions")
          .select("duration_minutes")
          .eq("user_id", partner.user_id)
          .gte("created_at", startOfWeek.toISOString());

        const studyMinutes = studySessions?.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0;
        const studyHours = Math.round(studyMinutes / 60 * 10) / 10;

        const { count: journalEntries } = await supabase
          .from("journal_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", partner.user_id)
          .gte("created_at", startOfWeek.toISOString());

        const stats: WeeklyStats = {
          tasksCompleted: tasksCompleted || 0,
          totalTasks: totalTasks || 0,
          quizzesTaken: quizzesTaken || 0,
          flashcardsReviewed,
          studyHours,
          journalEntries: journalEntries || 0,
        };

        const completionRate = stats.totalTasks > 0 
          ? Math.round((stats.tasksCompleted / stats.totalTasks) * 100) 
          : 0;

        // Send email
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Weekly Progress Report</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); border-radius: 16px; padding: 32px; color: white; text-align: center; margin-bottom: 24px;">
                <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">📚 Luminary Study</h1>
                <p style="margin: 0; opacity: 0.9; font-size: 14px;">Weekly Progress Report</p>
              </div>
              
              <div style="background: white; border-radius: 16px; padding: 32px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <p style="margin: 0 0 16px 0; color: #52525b; font-size: 16px;">
                  Hello ${partner.partner_name},
                </p>
                <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px;">
                  Here's the weekly progress update for <strong>${studentName}</strong>:
                </p>
                
                <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); border-radius: 50%; width: 80px; height: 80px; line-height: 80px; color: white; font-size: 24px; font-weight: 700;">
                      ${completionRate}%
                    </div>
                    <p style="margin: 8px 0 0 0; color: #71717a; font-size: 14px;">Completion Rate</p>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: white; border-radius: 8px;">
                      <div style="font-size: 24px; font-weight: 700; color: #0d9488;">${stats.tasksCompleted}/${stats.totalTasks}</div>
                      <div style="font-size: 12px; color: #71717a;">Tasks Completed</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: white; border-radius: 8px;">
                      <div style="font-size: 24px; font-weight: 700; color: #0d9488;">${stats.quizzesTaken}</div>
                      <div style="font-size: 12px; color: #71717a;">Quizzes Taken</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: white; border-radius: 8px;">
                      <div style="font-size: 24px; font-weight: 700; color: #0d9488;">${stats.flashcardsReviewed}</div>
                      <div style="font-size: 12px; color: #71717a;">Flashcards Reviewed</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: white; border-radius: 8px;">
                      <div style="font-size: 24px; font-weight: 700; color: #0d9488;">${stats.studyHours}h</div>
                      <div style="font-size: 12px; color: #71717a;">Study Hours</div>
                    </div>
                  </div>
                </div>
                
                <div style="border-top: 1px solid #e4e4e7; padding-top: 16px;">
                  <p style="margin: 0; color: #71717a; font-size: 14px;">
                    <strong>Student:</strong> ${studentName}<br>
                    <strong>University:</strong> ${university}${yearOfStudy ? ` • ${yearOfStudy}` : ''}<br>
                    <strong>Week:</strong> ${weekStartStr} to ${weekEndStr}
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; color: #a1a1aa; font-size: 12px;">
                <p style="margin: 0;">Sent from Luminary Study</p>
                <p style="margin: 4px 0 0 0;">Empowering Zambian students to excel</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Luminary Study <onboarding@resend.dev>",
            to: [partner.partner_email],
            subject: `📊 Weekly Progress Report for ${studentName}`,
            html: emailHtml,
          }),
        });

        const emailData = await emailResponse.json();

        console.log(`Email sent to ${partner.partner_email}:`, emailData);
        emailResults.push({ partner: partner.partner_email, status: "sent", response: emailData });

      } catch (partnerError) {
        console.error(`Error processing partner ${partner.partner_email}:`, partnerError);
        emailResults.push({ partner: partner.partner_email, status: "error", error: String(partnerError) });
      }
    }

    return new Response(JSON.stringify({ 
      message: "Weekly reports processed",
      results: emailResults 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-weekly-report function:", errorMessage);
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
