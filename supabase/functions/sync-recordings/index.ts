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
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting recording sync...");

    // Get all ended classes without recordings
    const { data: pendingClasses, error: fetchError } = await supabase
      .from("live_classes")
      .select("id, title, daily_room_name, course_id, host_id, description")
      .eq("status", "ended")
      .is("recording_url", null)
      .not("daily_room_name", "is", null)
      .order("ended_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching pending classes:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingClasses?.length || 0} classes pending recording sync`);

    const results = {
      synced: 0,
      notReady: 0,
      noRecording: 0,
      errors: 0,
    };

    for (const liveClass of pendingClasses || []) {
      try {
        console.log(`Checking recordings for: ${liveClass.title} (${liveClass.daily_room_name})`);

        // Fetch recordings from Daily API
        const response = await fetch(
          `https://api.daily.co/v1/recordings?room_name=${liveClass.daily_room_name}`,
          {
            headers: {
              Authorization: `Bearer ${DAILY_API_KEY}`,
            },
          }
        );

        if (!response.ok) {
          console.error(`Failed to fetch recordings for ${liveClass.daily_room_name}:`, response.status);
          results.errors++;
          continue;
        }

        const data = await response.json();
        const recordings = data.data || [];

        if (recordings.length === 0) {
          console.log(`No recordings found for ${liveClass.daily_room_name}`);
          results.noRecording++;
          continue;
        }

        console.log(`Found ${recordings.length} recordings for ${liveClass.daily_room_name}`);
        console.log(`Recording statuses: ${recordings.map((r: any) => r.status).join(', ')}`);

        // Find a completed/finished recording with download link
        // Daily.co uses "finished" status when processing is complete
        const completedRecording = recordings.find(
          (r: any) => (r.status === "finished" || r.status === "completed") && r.download_link
        );

        if (!completedRecording) {
          // Check if there's a recording still processing
          const processingRecording = recordings.find(
            (r: any) => r.status === "s3" || r.status === "processing" || r.status === "finished"
          );
          
          if (processingRecording) {
            console.log(`Recording processing for ${liveClass.daily_room_name} - status: ${processingRecording.status}`);
            
            // If status is "finished" but no download_link, try to get it directly
            if (processingRecording.status === "finished" && processingRecording.id) {
              console.log(`Fetching individual recording details for: ${processingRecording.id}`);
              
              const recordingDetailRes = await fetch(
                `https://api.daily.co/v1/recordings/${processingRecording.id}`,
                {
                  headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
                }
              );
              
              if (recordingDetailRes.ok) {
                const recordingDetail = await recordingDetailRes.json();
                console.log(`Recording detail status: ${recordingDetail.status}, has download_link: ${!!recordingDetail.download_link}`);
                
                if (recordingDetail.download_link) {
                  // We got the download link, process this recording
                  await processRecording(supabase, liveClass, recordingDetail, DAILY_API_KEY, LOVABLE_API_KEY);
                  results.synced++;
                  continue;
                }
              }
            }
          }
          
          console.log(`Recording not ready for ${liveClass.daily_room_name}`);
          results.notReady++;
          continue;
        }

        console.log(`Found completed recording for ${liveClass.title}: ${completedRecording.id}`);

        await processRecording(supabase, liveClass, completedRecording, DAILY_API_KEY, LOVABLE_API_KEY);
        results.synced++;

      } catch (classError) {
        console.error(`Error processing class ${liveClass.id}:`, classError);
        results.errors++;
      }
    }

    console.log("Sync complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Recording sync complete",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync recordings error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processRecording(
  supabase: any,
  liveClass: any,
  recording: any,
  DAILY_API_KEY: string,
  LOVABLE_API_KEY: string | undefined
) {
  console.log(`Processing recording ${recording.id} for class ${liveClass.title}`);

  // Update the live class with recording info
  const { error: updateError } = await supabase
    .from("live_classes")
    .update({
      recording_url: recording.download_link,
      recording_duration_seconds: recording.duration || 0,
    })
    .eq("id", liveClass.id);

  if (updateError) {
    console.error(`Error updating class ${liveClass.id}:`, updateError);
    throw updateError;
  }

  console.log(`Updated recording URL for: ${liveClass.title}`);

  // Fetch and save transcription
  if (recording.id) {
    try {
      console.log(`Fetching transcript for recording ${recording.id}`);
      
      const transcriptResponse = await fetch(
        `https://api.daily.co/v1/recordings/${recording.id}/transcript`,
        {
          headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
        }
      );

      if (transcriptResponse.ok) {
        const transcript = await transcriptResponse.json();
        
        if (transcript.segments && transcript.segments.length > 0) {
          const transcriptEntries = transcript.segments.map((segment: any) => ({
            class_id: liveClass.id,
            content: segment.text,
            timestamp_ms: Math.floor(segment.start * 1000),
            speaker_name: segment.speaker || "Unknown",
          }));

          await supabase.from("class_transcripts").insert(transcriptEntries);
          console.log(`Saved ${transcriptEntries.length} transcript segments for ${liveClass.title}`);

          // Generate AI summary
          if (LOVABLE_API_KEY) {
            await generateAISummary(supabase, liveClass, transcript.segments, LOVABLE_API_KEY);
          }
        }
      } else {
        console.log(`Transcript not available for recording ${recording.id}`);
      }
    } catch (transcriptError) {
      console.error(`Error fetching transcript for ${liveClass.id}:`, transcriptError);
    }
  }

  // Send notifications to enrolled students
  if (liveClass.course_id) {
    try {
      const { data: enrollments } = await supabase
        .from("academy_enrollments")
        .select("user_id")
        .eq("course_id", liveClass.course_id)
        .eq("status", "active");

      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map((e: any) => e.user_id);
        console.log(`Notifying ${userIds.length} students about recording for ${liveClass.title}`);

        // Send push notifications
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

        // Send email notifications
        await supabase.functions.invoke("send-student-notification", {
          body: {
            type: "recording_ready",
            courseId: liveClass.course_id,
            data: {
              title: liveClass.title,
              classId: liveClass.id,
              description: liveClass.description || undefined,
            },
          },
        });
      }
    } catch (notifyError) {
      console.error(`Error sending notifications for ${liveClass.id}:`, notifyError);
    }
  }
}

async function generateAISummary(
  supabase: any,
  liveClass: any,
  segments: any[],
  LOVABLE_API_KEY: string
) {
  try {
    console.log(`Generating AI summary for ${liveClass.title}`);
    
    const fullTranscript = segments
      .map((s: any) => `${s.speaker || 'Speaker'}: ${s.text}`)
      .join("\n");

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

        await supabase
          .from("class_ai_summaries")
          .insert({
            class_id: liveClass.id,
            summary: parsedSummary.summary || summaryContent,
            key_points: parsedSummary.key_points || [],
            topics_covered: parsedSummary.topics_covered || [],
          });

        console.log(`AI summary saved for ${liveClass.title}`);
      }
    } else {
      console.error(`AI summary request failed:`, await aiResponse.text());
    }
  } catch (aiError) {
    console.error(`Error generating AI summary for ${liveClass.id}:`, aiError);
  }
}
