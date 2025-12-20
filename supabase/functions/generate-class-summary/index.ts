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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { classId } = await req.json();

    console.log("Generating summary for class:", classId);

    // Fetch all transcripts for this class
    const { data: transcripts, error: transcriptError } = await supabase
      .from("class_transcripts")
      .select("*")
      .eq("class_id", classId)
      .order("timestamp_ms", { ascending: true });

    if (transcriptError) {
      throw new Error(`Failed to fetch transcripts: ${transcriptError.message}`);
    }

    // Fetch class details
    const { data: classData, error: classError } = await supabase
      .from("live_classes")
      .select("*, academy_courses(name)")
      .eq("id", classId)
      .single();

    if (classError) {
      throw new Error(`Failed to fetch class: ${classError.message}`);
    }

    // Combine transcripts into a single text
    const fullTranscript = transcripts
      ?.map((t) => `${t.speaker_name || "Speaker"}: ${t.content}`)
      .join("\n") || "No transcript available.";

    // Generate summary using AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are Lumina, an AI assistant for Zambian law students. You just attended a live class and need to create a comprehensive summary to help students consolidate their learning.

Create a summary that includes:
1. **Class Overview**: A brief description of what was covered
2. **Key Points**: The main concepts and principles discussed (as a JSON array)
3. **Topics Covered**: The specific topics addressed (as a JSON array)
4. **Important Takeaways**: What students should remember
5. **Study Recommendations**: Suggestions for further study

Format your response as JSON with the following structure:
{
  "summary": "A comprehensive paragraph summarizing the class...",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "topics_covered": ["Topic 1", "Topic 2", "Topic 3"],
  "takeaways": "What students should remember...",
  "study_recommendations": "Suggestions for further study..."
}`,
          },
          {
            role: "user",
            content: `Class Title: ${classData.title}
Course: ${classData.academy_courses?.name || "General"}
Description: ${classData.description || "No description"}

Transcript:
${fullTranscript.substring(0, 15000)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error("AI API error:", error);
      throw new Error("Failed to generate summary");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || "";

    // Parse the JSON response
    let parsedContent;
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsedContent = {
        summary: content,
        key_points: [],
        topics_covered: [],
      };
    }

    // Save the summary to the database
    const { data: summary, error: summaryError } = await supabase
      .from("class_ai_summaries")
      .insert({
        class_id: classId,
        summary: parsedContent.summary || content,
        key_points: parsedContent.key_points || [],
        topics_covered: parsedContent.topics_covered || [],
      })
      .select()
      .single();

    if (summaryError) {
      console.error("Failed to save summary:", summaryError);
      throw new Error(`Failed to save summary: ${summaryError.message}`);
    }

    console.log("Summary generated and saved:", summary.id);

    return new Response(
      JSON.stringify({
        success: true,
        summary: parsedContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate summary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
