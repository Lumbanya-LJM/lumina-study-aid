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
  requirements: string;
}> = {
  law: {
    name: 'Law',
    systemPromptIntro: 'You are Lumina, an AI study assistant for LMV Law students. Generate a multiple-choice quiz on the given topic.',
    requirements: `Requirements:
- Each question must have exactly 4 options
- correctAnswer is the index (0-3) of the correct option
- Questions should test understanding, not just recall
- Include scenario-based questions where appropriate
- Reference legal principles, cases, and statutes when relevant
- Test analytical reasoning and legal application`
  },
  business: {
    name: 'Business',
    systemPromptIntro: 'You are Lumina, an AI study assistant for LMV Business students. Generate a multiple-choice quiz on the given topic.',
    requirements: `Requirements:
- Each question must have exactly 4 options
- correctAnswer is the index (0-3) of the correct option
- Questions should test understanding and practical application
- Include scenario-based questions with business contexts
- Reference business frameworks, theories, and real-world examples
- Test analytical and strategic thinking`
  },
  health: {
    name: 'Health Sciences',
    systemPromptIntro: 'You are Lumina, an AI study assistant for LMV Health students. Generate a multiple-choice quiz on the given topic.',
    requirements: `Requirements:
- Each question must have exactly 4 options
- correctAnswer is the index (0-3) of the correct option
- Questions should test clinical understanding and reasoning
- Include scenario-based questions with patient care contexts
- Reference anatomy, physiology, and clinical guidelines when relevant
- Prioritize questions that test patient safety and evidence-based practice`
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, subject, numQuestions = 5, school } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user from auth header
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

    console.log(`Generating quiz for topic: ${topic}, subject: ${subject}, school: ${userSchool}`);

    const systemPrompt = `${config.systemPromptIntro}

Return a valid JSON object with this exact structure:
{
  "title": "Quiz title",
  "questions": [
    {
      "id": 1,
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of the correct answer"
    }
  ]
}

Generate exactly ${numQuestions} questions.

${config.requirements}`;

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
          { role: "user", content: `Generate a quiz on: ${topic}\nSubject: ${subject || config.name}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to generate quiz");
    }

    const aiResponse = await response.json();
    const quizData = JSON.parse(aiResponse.choices[0].message.content);

    // Save quiz to database
    const { data: quiz, error: insertError } = await supabaseClient
      .from("quizzes")
      .insert({
        user_id: user.id,
        title: quizData.title || `Quiz: ${topic}`,
        subject: subject || config.name,
        questions: quizData.questions,
        total_questions: quizData.questions.length,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving quiz:", insertError);
      throw new Error("Failed to save quiz");
    }

    console.log("Quiz generated and saved:", quiz.id);

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate quiz error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
