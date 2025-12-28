import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log("Daily webhook received:", JSON.stringify(payload, null, 2));

    const eventType = payload.type;
    const roomName = payload.room_name || payload.payload?.room_name;

    // Handle recording.ready-to-download event
    if (eventType === "recording.ready-to-download") {
      console.log("Recording ready to download for room:", roomName);

      const recordingData = payload.payload;
      const recordingUrl = recordingData.download_link;
      const durationSeconds = recordingData.duration || 0;
      const recordingId = recordingData.recording_id;

      // Find the live class by room name
      const { data: liveClass, error: findError } = await supabase
        .from("live_classes")
        .select("id, course_id, title, host_id")
        .eq("daily_room_name", roomName)
        .maybeSingle();

      if (findError) {
        console.error("Error finding live class:", findError);
        throw findError;
      }

      if (!liveClass) {
        console.log("No live class found for room:", roomName);
        return new Response(JSON.stringify({ success: true, message: "No matching class found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Found live class:", liveClass.id, liveClass.title);

      // Update the live class with recording info
      const { error: updateError } = await supabase
        .from("live_classes")
        .update({
          recording_url: recordingUrl,
          recording_duration_seconds: durationSeconds,
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", liveClass.id);

      if (updateError) {
        console.error("Error updating live class:", updateError);
        throw updateError;
      }

      console.log("Live class updated with recording URL");

      // Try to get and save transcription
      const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
      if (DAILY_API_KEY && recordingId) {
        try {
          console.log("Fetching transcription for recording:", recordingId);
          
          const transcriptResponse = await fetch(
            `https://api.daily.co/v1/recordings/${recordingId}/transcript`,
            {
              headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
            }
          );

          if (transcriptResponse.ok) {
            const transcript = await transcriptResponse.json();
            console.log("Transcription fetched successfully");

            // Save transcripts to database
            if (transcript.segments && transcript.segments.length > 0) {
              const transcriptEntries = transcript.segments.map((segment: any) => ({
                class_id: liveClass.id,
                content: segment.text,
                timestamp_ms: Math.floor(segment.start * 1000),
                speaker_name: segment.speaker || "Unknown",
              }));

              const { error: transcriptError } = await supabase
                .from("class_transcripts")
                .insert(transcriptEntries);

              if (transcriptError) {
                console.error("Error saving transcripts:", transcriptError);
              } else {
                console.log("Saved", transcriptEntries.length, "transcript segments");
              }
            }

            // Generate AI summary using Lovable AI
            if (LOVABLE_API_KEY && transcript.segments?.length > 0) {
              console.log("Generating AI summary...");
              
              const fullTranscript = transcript.segments
                .map((s: any) => `${s.speaker || 'Speaker'}: ${s.text}`)
                .join("\n");

              try {
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
                        content: `You are an AI assistant that summarizes educational class recordings. 
                        Create a concise summary including:
                        1. Main topics covered
                        2. Key points and takeaways (as bullet points)
                        3. Any action items or assignments mentioned
                        
                        Format the response as JSON with these fields:
                        - summary: string (2-3 paragraph overview)
                        - key_points: string[] (list of key points)
                        - topics_covered: string[] (list of main topics)`,
                      },
                      {
                        role: "user",
                        content: `Please summarize this class recording transcript for "${liveClass.title}":\n\n${fullTranscript.substring(0, 15000)}`,
                      },
                    ],
                  }),
                });

                if (aiResponse.ok) {
                  const aiData = await aiResponse.json();
                  const summaryContent = aiData.choices?.[0]?.message?.content;
                  
                  if (summaryContent) {
                    // Try to parse as JSON, fallback to plain text
                    let parsedSummary;
                    try {
                      parsedSummary = JSON.parse(summaryContent);
                    } catch {
                      parsedSummary = {
                        summary: summaryContent,
                        key_points: [],
                        topics_covered: [],
                      };
                    }

                    // Save AI summary
                    const { error: summaryError } = await supabase
                      .from("class_ai_summaries")
                      .insert({
                        class_id: liveClass.id,
                        summary: parsedSummary.summary || summaryContent,
                        key_points: parsedSummary.key_points || [],
                        topics_covered: parsedSummary.topics_covered || [],
                      });

                    if (summaryError) {
                      console.error("Error saving AI summary:", summaryError);
                    } else {
                      console.log("AI summary saved successfully");
                    }
                  }
                } else {
                  console.error("AI summary request failed:", await aiResponse.text());
                }
              } catch (aiError) {
                console.error("Error generating AI summary:", aiError);
              }
            }
          } else {
            console.log("Transcription not available yet");
          }
        } catch (transcriptError) {
          console.error("Error fetching transcription:", transcriptError);
        }
      }

      // Send push notification to enrolled students
      if (liveClass.course_id) {
        try {
          const { data: enrollments } = await supabase
            .from("academy_enrollments")
            .select("user_id")
            .eq("course_id", liveClass.course_id)
            .eq("status", "active");

          if (enrollments && enrollments.length > 0) {
            const userIds = enrollments.map((e) => e.user_id);
            console.log("Notifying", userIds.length, "enrolled students about recording");

            await supabase.functions.invoke("send-push-notification", {
              body: {
                userIds,
                payload: {
                  title: "📹 Class Recording Available",
                  body: `The recording for "${liveClass.title}" is now available!`,
                  icon: "/pwa-192x192.png",
                  data: {
                    type: "recording_ready",
                    classId: liveClass.id,
                    url: "/recordings",
                  },
                },
              },
            });
          }
        } catch (notifyError) {
          console.error("Error sending notifications:", notifyError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Recording processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle meeting.ended event
    if (eventType === "meeting.ended") {
      console.log("Meeting ended for room:", roomName);

      // Update class status to ended
      const { error: updateError } = await supabase
        .from("live_classes")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("daily_room_name", roomName)
        .eq("status", "live");

      if (updateError) {
        console.error("Error updating class status:", updateError);
      } else {
        console.log("Class status updated to ended");
      }

      return new Response(
        JSON.stringify({ success: true, message: "Meeting end processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle transcription.ready event
    if (eventType === "transcription.ready") {
      console.log("Transcription ready for recording:", payload.payload?.recording_id);
      // Transcription will be fetched when recording.ready-to-download fires
      return new Response(
        JSON.stringify({ success: true, message: "Transcription event received" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log other events for debugging
    console.log("Unhandled event type:", eventType);
    return new Response(
      JSON.stringify({ success: true, message: `Event ${eventType} acknowledged` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Daily webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
