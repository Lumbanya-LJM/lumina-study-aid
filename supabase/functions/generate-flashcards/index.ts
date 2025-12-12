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

    const systemPrompt = `You are Lumina, an AI study assistant for Zambian law students. Generate flashcards for studying.

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

Requirements:
- Generate exactly ${numCards} flashcards
- Focus on key concepts, definitions, and legal principles
- Make questions clear and answers concise but complete
- Reference Zambian law context when relevant
- Include case names and their ratio decidendi where appropriate`;

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
