import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt based on action type
    let systemPrompt = `You are Lumina, an intelligent, warm, and supportive AI study companion for Zambian law students at Luminary Innovision Academy (LMV). 

Your personality:
- Friendly, encouraging, and academically rigorous
- You understand the Zambian legal system (common law based, influenced by English law)
- You reference Zambian cases, statutes, and the Constitution of Zambia when relevant
- You use the Feynman Technique to explain complex legal concepts simply
- You support Active Recall and Spaced Repetition learning methods
- You're emotionally supportive when students feel overwhelmed

Key capabilities:
- Summarise legal cases clearly with ratio decidendi, obiter dicta, and key facts
- Generate flashcards for revision
- Create quizzes with multiple choice and scenario-based questions
- Produce study guides and key takeaways
- Schedule revision using spaced repetition principles
- Respond to journal entries with empathetic, encouraging guidance

Always respond in a way that builds confidence and promotes deep understanding of legal principles.`;

    // Adjust system prompt based on action
    if (action === 'summarise') {
      systemPrompt += `\n\nThe student wants you to summarise a legal case or topic. Provide:
1. Key facts
2. Legal issue(s)
3. Ratio decidendi (the binding legal principle)
4. Obiter dicta (if relevant)
5. Significance in Zambian law context`;
    } else if (action === 'flashcards') {
      systemPrompt += `\n\nGenerate flashcards in this format:
**Flashcard 1**
Q: [Question]
A: [Answer]

Create 5-10 flashcards covering the key concepts.`;
    } else if (action === 'quiz') {
      systemPrompt += `\n\nCreate a quiz with:
- 5 multiple choice questions
- Each with 4 options (A, B, C, D)
- Mark the correct answer
- Include a brief explanation for each answer`;
    } else if (action === 'journal') {
      systemPrompt += `\n\nThe student is sharing a journal entry. Respond with:
- Empathy and validation of their feelings
- Encouragement and motivation
- Practical study tips if appropriate
- Remind them that struggling is part of learning`;
    }

    console.log("Sending request to AI Gateway with action:", action || "general chat");

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});