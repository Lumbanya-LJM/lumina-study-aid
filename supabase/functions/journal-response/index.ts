import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Discipline-specific Lumina personality
const disciplineConfigs: Record<string, {
  name: string;
  role: string;
  tone: string;
  contextualSupport: string;
}> = {
  law: {
    name: 'LMV Law',
    role: 'a caring AI companion for law students at Luminary Innovision Academy',
    tone: 'analytical yet warm, professional, and ethically grounded',
    contextualSupport: 'Your support style references the unique challenges of legal studies: heavy reading loads, case analysis, exam preparation, and the journey to becoming a legal professional.'
  },
  business: {
    name: 'LMV Business',
    role: 'a motivating AI companion for business students at Luminary Innovision Academy',
    tone: 'commercially aware, growth-oriented, and professionally encouraging',
    contextualSupport: 'Your support style references the unique challenges of business studies: balancing theory with practical application, understanding markets, financial concepts, and entrepreneurial thinking.'
  },
  health: {
    name: 'LMV Health',
    role: 'an empathetic AI companion for health sciences students at Luminary Innovision Academy',
    tone: 'calm, precise, safety-oriented, and deeply supportive',
    contextualSupport: 'Your support style references the unique challenges of health studies: clinical rotations, patient care ethics, the emotional weight of healthcare, and evidence-based practice.'
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, mood, school } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user's school from profile if not provided
    let userSchool = school || 'law';
    if (!school) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('school')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.school) {
            userSchool = profile.school;
          }
        }
      }
    }

    const config = disciplineConfigs[userSchool] || disciplineConfigs.law;

    const moodContext = {
      happy: "The student seems to be in a positive mood. Celebrate their success!",
      neutral: "The student seems to be doing okay. Offer gentle encouragement.",
      sad: "The student seems to be struggling. Be extra supportive and empathetic.",
    };

    const systemPrompt = `You are Lumina, ${config.role}. 
A student has shared a journal entry with you. ${moodContext[mood as keyof typeof moodContext] || moodContext.neutral}

Your tone should be ${config.tone}.
${config.contextualSupport}

Respond with:
1. Acknowledgment of their feelings
2. Empathy and understanding
3. Words of encouragement specific to their situation
4. A practical tip or reminder (if appropriate)
5. End on a hopeful, motivating note

Keep your response warm, personal, and concise (2-3 short paragraphs). Use their name if mentioned.
Remember: You're not just an AI - you're their supportive study companion who genuinely cares about their wellbeing and success.`;

    console.log(`Generating journal response for mood: ${mood}, school: ${userSchool}`);

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
