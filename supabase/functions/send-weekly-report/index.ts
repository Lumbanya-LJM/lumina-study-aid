import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

const getEmailHtml = (
  partnerName: string,
  studentName: string,
  university: string,
  yearOfStudy: string,
  stats: WeeklyStats,
  completionRate: number,
  weekStartStr: string,
  weekEndStr: string
) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px; }
      .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
      .header { background: linear-gradient(135deg, #2A5A6A 0%, #1a3d47 100%); padding: 40px 30px; text-align: center; }
      .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
      .tagline { color: rgba(255, 255, 255, 0.8); font-size: 14px; }
      .content { padding: 40px 30px; }
      h1 { color: #ffffff; font-size: 24px; margin: 0 0 20px 0; }
      p { color: #b8b8b8; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
      .footer { padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); }
      .footer p { color: #666; font-size: 12px; margin: 0; }
      .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
      .stat-card { background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; text-align: center; }
      .stat-value { font-size: 28px; font-weight: 700; color: #4ecdc4; }
      .stat-label { font-size: 12px; color: #888; margin-top: 8px; }
      .completion-circle { width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #2A5A6A 0%, #3d7a8a 100%); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
      .completion-value { font-size: 28px; font-weight: 700; color: #ffffff; }
      .info-box { background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin: 20px 0; }
      .info-item { color: #888; margin: 8px 0; font-size: 14px; }
      .highlight { color: #4ecdc4; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">LMV ACADEMY</div>
        <div class="tagline">Weekly Progress Report</div>
      </div>
      <div class="content">
        <h1>📊 Weekly Progress Report</h1>
        <p>Hello ${partnerName},</p>
        <p>Here's the weekly progress update for <strong class="highlight">${studentName}</strong>:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div class="completion-circle">
            <span class="completion-value">${completionRate}%</span>
          </div>
          <p style="color: #888; margin: 0;">Completion Rate</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.tasksCompleted}/${stats.totalTasks}</div>
            <div class="stat-label">Tasks Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.quizzesTaken}</div>
            <div class="stat-label">Quizzes Taken</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.flashcardsReviewed}</div>
            <div class="stat-label">Flashcards Reviewed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.studyHours}h</div>
            <div class="stat-label">Study Hours</div>
          </div>
        </div>
        
        <div class="info-box">
          <div class="info-item"><strong>Student:</strong> ${studentName}</div>
          <div class="info-item"><strong>University:</strong> ${university}${yearOfStudy ? ` • ${yearOfStudy}` : ''}</div>
          <div class="info-item"><strong>Week:</strong> ${weekStartStr} to ${weekEndStr}</div>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} LMV Academy. All rights reserved.</p>
        <p>Empowering Zambian students to excel 🇿🇲</p>
      </div>
    </div>
  </body>
  </html>
`;

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

        const emailHtml = getEmailHtml(
          partner.partner_name,
          studentName,
          university,
          yearOfStudy,
          stats,
          completionRate,
          weekStartStr,
          weekEndStr
        );

        await resend.emails.send({
          from: "LMV Academy <noreply@lmvacademy.com>",
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
