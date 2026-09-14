import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const problemId: string | undefined = body.problemId;
    const side: string = body.side === "respondent" ? "respondent" : "appellant";
    const submissionType: string = body.submissionType === "oral" ? "oral" : "memorial";
    const content: string = (body.content ?? "").toString().trim();

    if (!problemId || content.length < 50) {
      return new Response(
        JSON.stringify({ error: "A problem and a submission of at least 50 characters are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (content.length > 20000) {
      return new Response(JSON.stringify({ error: "Submission is too long (max 20,000 characters)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: problem, error: problemError } = await supabase
      .from("moot_problems")
      .select("*")
      .eq("id", problemId)
      .maybeSingle();

    if (problemError || !problem) {
      return new Response(JSON.stringify({ error: "Moot problem not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authorities = Array.isArray(problem.authorities) ? problem.authorities : [];
    const issues = Array.isArray(problem.issues) ? problem.issues : [];

    const systemPrompt = `You are a senior Zambian moot court judge and advocacy coach grading a law student's ${
      submissionType === "oral" ? "oral submission transcript" : "written memorial"
    } for the ${side}.

Grade strictly but constructively against this rubric, each scored out of 20:
1. Issue identification and framing
2. Legal argument and reasoning
3. Use and accuracy of authorities (Zambian statutes and case law)
4. Structure, clarity and style
5. Persuasiveness and courtroom craft (including anticipating judicial questions)

Never invent case names or citations. If the student cites an authority that does not exist or is misapplied, say so explicitly.

Return ONLY valid JSON in this exact shape:
{
  "score": <0-100 integer, the sum of the five criteria>,
  "rubric": [{"criterion": "...", "score": <0-20>, "comment": "..."}],
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "feedback": "<2-4 paragraph judge's feedback addressed to the student>",
  "judicial_questions": ["...", "..."]
}`;

    const userPrompt = `MOOT PROBLEM: ${problem.title}
Area of law: ${problem.area_of_law}
Court: ${problem.court ?? "N/A"}
Authority this problem is based on: ${problem.citation ?? "N/A"}

FACTS:
${problem.facts}

ISSUES:
${issues.map((i: string, n: number) => `${n + 1}. ${i}`).join("\n")}

APPELLANT POSITION: ${problem.appellant_position ?? "N/A"}
RESPONDENT POSITION: ${problem.respondent_position ?? "N/A"}

KEY AUTHORITIES:
${authorities
  .map((a: any) => `- ${a.name} ${a.citation ? `(${a.citation})` : ""}: ${a.principle ?? ""}`)
  .join("\n")}

HOW THE REAL COURT RULED: ${problem.ruling_summary ?? "N/A"}

STUDENT SUBMISSION (${side}, ${submissionType}):
"""
${content}
"""`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests right now. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up to continue grading." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, errText);
      throw new Error("Grading service error");
    }

    const aiJson = await aiResponse.json();
    const raw: string = aiJson.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }
    if (!parsed) throw new Error("Could not read the grading result");

    const rubric = Array.isArray(parsed.rubric) ? parsed.rubric : [];
    const score = Math.max(
      0,
      Math.min(
        100,
        Number.isFinite(parsed.score)
          ? Math.round(parsed.score)
          : rubric.reduce((sum: number, r: any) => sum + (Number(r.score) || 0), 0)
      )
    );

    const feedbackText = [
      parsed.feedback ?? "",
      Array.isArray(parsed.judicial_questions) && parsed.judicial_questions.length
        ? `\n\nQuestions from the bench to prepare for:\n${parsed.judicial_questions
            .map((q: string) => `• ${q}`)
            .join("\n")}`
        : "",
    ].join("");

    const { data: saved, error: saveError } = await supabase
      .from("moot_submissions")
      .insert({
        user_id: userId,
        problem_id: problemId,
        side,
        submission_type: submissionType,
        content,
        score,
        max_score: 100,
        rubric,
        feedback: feedbackText,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        status: "graded",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error", saveError);
      throw new Error("Could not save the graded submission");
    }

    return new Response(JSON.stringify({ submission: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("grade-moot-submission error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
