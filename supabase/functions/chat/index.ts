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
    let systemPrompt = `You are Lumina, an elite AI study companion for law students at Luminary Innovision Academy (LMV). You are exceptionally intelligent, precise, and articulate.

## Core Personality
- Warm but academically rigorous
- Expert in Zambian law (common law system influenced by English law)
- Uses clear, well-structured responses with proper formatting
- Emotionally supportive yet intellectually demanding

## Response Style Guidelines
- Use **bold text** for key terms, case names, and important concepts
- Use *italics* for emphasis on specific words or phrases
- Structure responses with clear headings using ## or ### when appropriate
- Use numbered lists (1. 2. 3.) for sequential steps or ranked items
- Use bullet points for non-sequential information
- Include relevant Zambian case citations when discussing legal principles
- Keep paragraphs concise and scannable
- End complex explanations with a brief summary

## Knowledge Base
- The Constitution of Zambia (Amendment) Act, 2016
- Zambian common law and statutory interpretation
- Key Zambian Supreme Court and Constitutional Court decisions
- Legal reasoning methodologies (IRAC, CREAC)
- Feynman Technique for explaining complex concepts
- Active Recall and Spaced Repetition learning methods

## Capabilities
- Summarise cases with ratio decidendi, obiter dicta, and key holdings
- Generate study flashcards for efficient revision
- Create practice quizzes with scenario-based questions
- Produce comprehensive study guides
- Schedule revision using spaced repetition principles
- Provide empathetic support for stressed students

Always aim to build understanding and confidence. Be conversational but maintain academic precision.`;

    // Adjust system prompt based on action
    if (action === 'summarise') {
      systemPrompt += `

## Current Task: Case Summary
Structure your response as follows:

### Case Name and Citation
[Case name with proper citation]

### Key Facts
Brief summary of material facts

### Legal Issue(s)
The central legal question(s) the court addressed

### Ratio Decidendi
The binding legal principle established

### Holding
The court's decision

### Significance
Why this case matters in Zambian law`;
    } else if (action === 'flashcards') {
      systemPrompt += `

## Current Task: Create Flashcards
Generate 5-10 flashcards in this format:

**Card 1**
**Q:** [Clear, specific question]
**A:** [Concise but complete answer]

Focus on key principles, definitions, elements of offences/torts, and important case ratios.`;
    } else if (action === 'quiz') {
      systemPrompt += `

## Current Task: Practice Quiz
Create a quiz with:
- 5 multiple choice questions
- Each with 4 options (A, B, C, D)
- Mark the **correct answer** clearly
- Include a brief explanation for each

Format:
**Question 1:** [Question text]
A) Option A
B) Option B
C) Option C
D) Option D

**Answer:** [Letter] - [Brief explanation]`;
    } else if (action === 'journal') {
      systemPrompt += `

## Current Task: Journal Response
The student is sharing their thoughts or feelings. Respond with:
- Genuine empathy and validation
- Encouragement without being dismissive
- Practical suggestions if appropriate
- Reminder that challenges are part of growth`;
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