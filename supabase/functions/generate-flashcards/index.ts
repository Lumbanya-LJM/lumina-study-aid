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
    const { topic, subject, numCards = 10 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("Generating flashcards for topic:", topic);

    const systemPrompt = `You are Lumina, an expert AI study assistant for Zambian law students with deep knowledge of legal principles, case law, and Zambian legislation. Generate accurate, well-researched flashcards for studying.

Return a valid JSON object with this exact structure:
{
  "title": "Deck title",
  "cards": [
    {
      "id": 1,
      "front": "Question or term",
      "back": "Answer or definition",
      "hint": "Optional hint"
    }
  ]
}

CRITICAL ACCURACY REQUIREMENTS:
- Generate exactly ${numCards} flashcards
- ACCURACY IS PARAMOUNT: Every answer must be factually correct and legally sound
- For legal terms: Provide precise definitions as recognized in Zambian law and common law jurisdictions
- For case law: Include accurate case names, courts, years, and the correct ratio decidendi
- For statutes: Reference the correct Zambian legislation (e.g., Penal Code Cap 87, Constitution of Zambia)
- For doctrines/principles: Explain the established legal position, not interpretations
- Answers should be comprehensive but concise (2-4 sentences for definitions, more for complex principles)
- Include relevant exceptions, qualifications, or limitations where applicable
- For Zambian-specific topics, prioritize Zambian case law and legislation over foreign sources
- When in doubt about a specific Zambian position, reference the common law position and note it applies in Zambia

QUESTION FORMULATION:
- Ask clear, specific questions that have definitive answers
- Avoid ambiguous questions with multiple valid answers
- Use standard legal terminology
- For case law cards, ask about the legal principle established, not obscure details

ANSWER FORMULATION:
- Start with the direct answer to the question
- Include supporting elements (case names, statute sections, key elements)
- Use proper legal citation format where applicable
- Hints should guide toward the answer without giving it away`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate flashcards on: ${topic}\nSubject: ${subject || "Law"}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate flashcards");
    }

    const aiResponse = await response.json();
    const deckData = JSON.parse(aiResponse.choices[0].message.content);

    // Calculate next review date (spaced repetition - start in 1 day)
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 1);

    const { data: deck, error: insertError } = await supabaseClient
      .from("flashcard_decks")
      .insert({
        user_id: user.id,
        title: deckData.title || `Flashcards: ${topic}`,
        subject: subject || "Law",
        cards: deckData.cards,
        next_review_at: nextReview.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving flashcards:", insertError);
      throw new Error("Failed to save flashcards");
    }

    console.log("Flashcards generated and saved:", deck.id);

    return new Response(JSON.stringify(deck), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate flashcards error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
