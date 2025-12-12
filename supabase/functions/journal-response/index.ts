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
    const { content, mood } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const moodContext = {
      happy: "The student seems to be in a positive mood. Celebrate their success!",
      neutral: "The student seems to be doing okay. Offer gentle encouragement.",
      sad: "The student seems to be struggling. Be extra supportive and empathetic.",
    };

    const systemPrompt = `You are Lumina, a caring AI companion for Zambian law students at Luminary Innovision Academy. 
A student has shared a journal entry with you. ${moodContext[mood as keyof typeof moodContext] || moodContext.neutral}

Respond with:
1. Acknowledgment of their feelings
2. Empathy and understanding
3. Words of encouragement specific to their situation
4. A practical tip or reminder (if appropriate)
5. End on a hopeful, motivating note

Keep your response warm, personal, and concise (2-3 short paragraphs). Use their name if mentioned.
Remember: You're not just an AI - you're their supportive study companion who genuinely cares about their wellbeing and success.`;

    console.log("Generating journal response for mood:", mood);

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
          { role: "user", content: content },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate response");
    }

    const data = await response.json();
    const generatedResponse = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ response: generatedResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Journal response error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});