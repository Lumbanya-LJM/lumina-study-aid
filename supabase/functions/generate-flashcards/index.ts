import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Discipline-specific configuration
const disciplineConfigs: Record<string, {
  name: string;
  systemPromptIntro: string;
  accuracyRequirements: string;
  questionFormulation: string;
  answerFormulation: string;
}> = {
  law: {
    name: 'Law',
    systemPromptIntro: 'You are Lumina, an expert AI study assistant for LMV Law students with deep knowledge of legal principles, case law, and legislation. Generate accurate, well-researched flashcards for studying.',
    accuracyRequirements: `CRITICAL ACCURACY REQUIREMENTS:
- ACCURACY IS PARAMOUNT: Every answer must be factually correct and legally sound
- For legal terms: Provide precise definitions as recognized in law
- For case law: Include accurate case names, courts, years, and the correct ratio decidendi
- For statutes: Reference the correct legislation with proper citations
- For doctrines/principles: Explain the established legal position, not interpretations
- Answers should be comprehensive but concise (2-4 sentences for definitions, more for complex principles)
- Include relevant exceptions, qualifications, or limitations where applicable
- When referencing jurisdiction-specific law, be precise about the jurisdiction`,
    questionFormulation: `QUESTION FORMULATION:
- Ask clear, specific questions that have definitive answers
- Avoid ambiguous questions with multiple valid answers
- Use standard legal terminology
- For case law cards, ask about the legal principle established, not obscure details`,
    answerFormulation: `ANSWER FORMULATION:
- Start with the direct answer to the question
- Include supporting elements (case names, statute sections, key elements)
- Use proper legal citation format where applicable
- Hints should guide toward the answer without giving it away`
  },
  business: {
    name: 'Business',
    systemPromptIntro: 'You are Lumina, an expert AI study assistant for LMV Business students with deep knowledge of economics, management, accounting, and entrepreneurship. Generate accurate, practical flashcards for studying.',
    accuracyRequirements: `CRITICAL ACCURACY REQUIREMENTS:
- ACCURACY IS PARAMOUNT: Every answer must be factually correct and academically sound
- For business terms: Provide precise definitions as recognized in business studies
- For theories/models: Include accurate names, authors/developers, and key components
- For accounting concepts: Reference proper standards and practices
- For economic principles: Explain established theories with correct attribution
- Answers should be comprehensive but concise (2-4 sentences for definitions, more for complex concepts)
- Include real-world applications and examples where relevant
- Reference business frameworks (SWOT, Porter's, PESTLE, etc.) when applicable`,
    questionFormulation: `QUESTION FORMULATION:
- Ask clear, specific questions that test understanding
- Include scenario-based questions for practical application
- Use standard business terminology
- For theoretical cards, ask about principles and applications`,
    answerFormulation: `ANSWER FORMULATION:
- Start with the direct answer to the question
- Include supporting elements (formulas, frameworks, key components)
- Use proper business terminology
- Hints should guide toward the answer without giving it away`
  },
  health: {
    name: 'Health Sciences',
    systemPromptIntro: 'You are Lumina, an expert AI study assistant for LMV Health students with deep knowledge of anatomy, physiology, nursing, and public health. Generate accurate, evidence-based flashcards for studying.',
    accuracyRequirements: `CRITICAL ACCURACY REQUIREMENTS:
- ACCURACY IS PARAMOUNT: Every answer must be factually correct and clinically sound
- For medical terms: Provide precise definitions using proper medical terminology
- For anatomy/physiology: Include accurate structures, functions, and relationships
- For clinical concepts: Reference evidence-based practices and guidelines
- For pharmacology: Include accurate drug classes, mechanisms, and considerations
- Answers should be comprehensive but concise, prioritizing patient safety
- Include clinical relevance and practical applications
- Always prioritize accuracy - incorrect medical information can harm patients`,
    questionFormulation: `QUESTION FORMULATION:
- Ask clear, specific questions that test clinical understanding
- Include scenario-based questions for clinical reasoning
- Use proper medical terminology
- For clinical cards, focus on patient care and safety`,
    answerFormulation: `ANSWER FORMULATION:
- Start with the direct answer to the question
- Include supporting clinical details
- Use proper medical terminology with explanations where needed
- Hints should guide toward the answer without giving it away`
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, subject, numCards = 10, school } = await req.json();
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

    // Get user's school from profile if not provided
    let userSchool = school || 'law';
    if (!school) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('school')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.school) {
        userSchool = profile.school;
      }
    }

    const config = disciplineConfigs[userSchool] || disciplineConfigs.law;

    console.log(`Generating flashcards for topic: ${topic}, school: ${userSchool}`);

    const systemPrompt = `${config.systemPromptIntro}

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

Generate exactly ${numCards} flashcards.

${config.accuracyRequirements}

${config.questionFormulation}

${config.answerFormulation}`;

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
          { role: "user", content: `Generate flashcards on: ${topic}\nSubject: ${subject || config.name}` },
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
        subject: subject || config.name,
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
