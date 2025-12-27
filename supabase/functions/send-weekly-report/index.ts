import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailTemplate } from '../_shared/email-template.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(now);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekStartStr = startOfWeek.toISOString().split('T')[0];
    const weekEndStr = endOfWeek.toISOString().split('T')[0];

    console.log(`Processing reports for week: ${weekStartStr} to ${weekEndStr}`);

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
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", partner.user_id)
          .single();

        const studentName = (profile as Profile)?.full_name || "A Luminary Student";
        const university = (profile as Profile)?.university || "University";
        const yearOfStudy = (profile as Profile)?.year_of_study || "";

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

        const emailContent = `
          <p>Here's the weekly progress update for <strong class="highlight">${studentName}</strong>:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="width: 120px; height: 120px; border-radius: 50%; background: #f0f2f5; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px; font-weight: 700; color: #1b263b;">${completionRate}%</span>
            </div>
            <p style="color: #666; margin: 0;">Completion Rate</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 15px; text-align: center; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 600; color: #2a6fdb;">${stats.tasksCompleted}/${stats.totalTasks}</div>
                <div style="font-size: 12px; color: #666; margin-top: 8px;">Tasks Completed</div>
              </td>
              <td style="padding: 15px; text-align: center; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 600; color: #2a6fdb;">${stats.quizzesTaken}</div>
                <div style="font-size: 12px; color: #666; margin-top: 8px;">Quizzes Taken</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 15px; text-align: center; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 600; color: #2a6fdb;">${stats.flashcardsReviewed}</div>
                <div style="font-size: 12px; color: #666; margin-top: 8px;">Flashcards Reviewed</div>
              </td>
              <td style="padding: 15px; text-align: center; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 600; color: #2a6fdb;">${stats.studyHours}h</div>
                <div style="font-size: 12px; color: #666; margin-top: 8px;">Study Hours</div>
              </td>
            </tr>
          </table>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
            <p style="margin: 0 0 10px 0;"><strong>Student:</strong> ${studentName}</p>
            <p style="margin: 0 0 10px 0;"><strong>University:</strong> ${university}${yearOfStudy ? ` • ${yearOfStudy}` : ''}</p>
            <p style="margin: 0;"><strong>Week:</strong> ${weekStartStr} to ${weekEndStr}</p>
          </div>
        `;

        const emailHtml = getEmailTemplate({
            title: '📊 Weekly Progress Report',
            name: partner.partner_name,
            content: emailContent,
        });

        const fromEmail = Deno.env.get("SMTP_FROM") || "onboarding@resend.dev";
        
        await resend.emails.send({
          from: `LMV Academy <${fromEmail}>`,
          to: [partner.partner_email],
          subject: `📊 Weekly Progress Report for ${studentName}`,
          html: emailHtml,
        });
        
        console.log(`Email sent to ${partner.partner_email}`);
        emailResults.push({ partner: partner.partner_email, status: "sent" });

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
