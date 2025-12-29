import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Discipline-specific summarization configuration
const disciplineConfigs: Record<string, {
  name: string;
  documentType: string;
  systemPromptIntro: string;
  summaryStructure: string;
}> = {
  law: {
    name: 'Law',
    documentType: 'legal case',
    systemPromptIntro: 'You are an expert legal scholar specializing in case law analysis. Your task is to provide clear, structured summaries of legal cases for law students.',
    summaryStructure: `When summarizing a case, always include:
1. **Case Citation**: Name and reference of the case
2. **Court**: Which court delivered the judgment
3. **Key Facts**: Brief summary of the material facts
4. **Issues**: The legal questions before the court
5. **Held**: The court's decision
6. **Ratio Decidendi**: The legal principle established
7. **Relevance**: Why this case is important for students`
  },
  business: {
    name: 'Business',
    documentType: 'business case study',
    systemPromptIntro: 'You are an expert business analyst specializing in case study analysis. Your task is to provide clear, structured summaries of business cases for students.',
    summaryStructure: `When summarizing a business case, always include:
1. **Case Title**: Name and context of the case
2. **Company/Organization**: The entity involved
3. **Key Facts**: Brief summary of the situation
4. **Business Problem**: The core challenge or opportunity
5. **Analysis**: Key factors and considerations
6. **Outcome/Solution**: What was decided or implemented
7. **Key Takeaways**: Business principles and lessons learned`
  },
  health: {
    name: 'Health Sciences',
    documentType: 'clinical case',
    systemPromptIntro: 'You are an expert clinical educator specializing in case study analysis. Your task is to provide clear, structured summaries of clinical cases for health sciences students.',
    summaryStructure: `When summarizing a clinical case, always include:
1. **Case Overview**: Brief patient presentation
2. **Chief Complaint**: Primary reason for presentation
3. **History & Findings**: Relevant history and examination findings
4. **Differential Diagnosis**: Conditions considered
5. **Diagnosis**: Final diagnosis and reasoning
6. **Management**: Treatment approach
7. **Learning Points**: Key clinical principles and takeaways

Note: Maintain patient confidentiality and use this for educational purposes only.`
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseText, school } = await req.json();

    if (!caseText || caseText.length < 100) {
      return new Response(
        JSON.stringify({ error: "Content must be at least 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    console.log(`Summarizing ${config.documentType}, text length: ${caseText.length}, school: ${userSchool}`);

    const systemPrompt = `${config.systemPromptIntro}

${config.summaryStructure}

Keep the summary concise but comprehensive. Use clear, simple language suitable for students.`;

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
          { 
            role: "user", 
            content: `Please summarize the following ${config.documentType}:\n\n${caseText.substring(0, 15000)}` 
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate summary" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Unable to generate summary.";

    console.log("Summary generated successfully");

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in summarize function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
