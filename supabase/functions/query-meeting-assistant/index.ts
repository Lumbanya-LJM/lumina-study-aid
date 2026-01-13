import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSystemPrompt(kind: string): string {
  if (kind === "summary") {
    return `Based on the provided meeting transcript, please create a concise summary. Your summary should include:
1. Key discussion points.
2. Decisions made.
3. Action items assigned.

Keep the summary within six sentences. Structure it in clear, digestible parts for easy understanding.
Rely solely on information from the transcript; do not infer or add information not explicitly mentioned.
Exclude any square brackets, tags, or timestamps from the summary.`;
  }

  if (kind === "action_items") {
    return `Extract all action items mentioned in the transcript.
Return them as a numbered list.
For each action item include: (i) the task, (ii) the assigned person (if mentioned), (iii) deadline (if mentioned).
Do not infer any missing information.`;
  }

  if (kind === "clean_transcript") {
    return `Rewrite the transcript into clean, readable English.
Fix punctuation and broken sentence fragments.
Preserve the speakers and ordering.
Do not add content that was not said.`;
  }

  // custom query
  return `Answer the user's question using ONLY the transcript context.
If the answer is not in the transcript, say: "I cannot find that in the transcript so far."`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    const { meeting_id, kind, custom_query, user_id } = body ?? {};

    if (!meeting_id || !kind) {
      return new Response(JSON.stringify({ error: "meeting_id and kind are required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) Check cache for summary (30 second TTL)
    if (kind === "summary") {
      const { data: cached } = await supabase
        .from("assistant_outputs")
        .select("content, created_at")
        .eq("meeting_id", meeting_id)
        .eq("kind", "summary")
        .order("created_at", { ascending: false })
        .limit(1);

      if (cached && cached.length > 0) {
        const last = cached[0];
        const ageMs = Date.now() - new Date(last.created_at).getTime();
        if (ageMs < 30_000) {
          console.log(`Returning cached summary for meeting ${meeting_id}`);
          return new Response(
            JSON.stringify({ ok: true, cached: true, answer: last.content }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      }
    }

    // 2) Fetch transcript context
    const { data: lines, error: linesError } = await supabase
      .from("transcript_lines")
      .select("speaker_name,text,ts")
      .eq("meeting_id", meeting_id)
      .order("ts", { ascending: true })
      .limit(250);

    if (linesError) {
      console.error("Transcript fetch error:", linesError);
      return new Response(JSON.stringify({ error: `Transcript fetch error: ${linesError.message}` }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (!lines || lines.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No transcript context saved yet. Speak in the call (with transcription enabled) then try again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const ctx = lines
      .map((l) => `[${l.speaker_name}] ${l.text}`)
      .join("\n");

    console.log(`Building context from ${lines.length} transcript lines`);

    // 3) Store the query row
    const { data: queryRow, error: queryErr } = await supabase
      .from("assistant_queries")
      .insert({
        meeting_id,
        user_id: user_id ?? null,
        kind,
        query: kind === "custom" ? (custom_query ?? null) : null,
      })
      .select("*")
      .single();

    if (queryErr) {
      console.error("Query insert error:", queryErr);
      return new Response(JSON.stringify({ error: queryErr.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 4) Call Lovable AI (using gemini-2.5-flash for speed)
    const prompt = kind === "custom"
      ? `Transcript:\n${ctx}\n\nUser question:\n${custom_query ?? ""}`
      : `Transcript:\n${ctx}`;

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: getSystemPrompt(kind) },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content?.trim() ?? "No answer returned.";

    console.log(`Generated ${kind} response for meeting ${meeting_id}`);

    // 5) Save output to cache
    const { error: outErr } = await supabase.from("assistant_outputs").insert({
      meeting_id,
      query_id: queryRow.id,
      kind,
      content: answer,
    });

    if (outErr) {
      console.error("Output insert error:", outErr);
      // Continue anyway, we have the answer
    }

    return new Response(JSON.stringify({ ok: true, cached: false, answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: `Unexpected error: ${String(e)}` }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
