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

        // Find a completed recording with download link
        const completedRecording = recordings.find(
          (r: any) => r.status === "completed" && r.download_link
        );

        if (!completedRecording) {
          console.log(`Recording not ready for ${liveClass.daily_room_name} - status: ${recordings[0]?.status}`);
          results.notReady++;
          continue;
        }

        console.log(`Found completed recording for ${liveClass.title}: ${completedRecording.id}`);

        // Update the live class with recording info
        const { error: updateError } = await supabase
          .from("live_classes")
          .update({
            recording_url: completedRecording.download_link,
            recording_duration_seconds: completedRecording.duration || 0,
          })
          .eq("id", liveClass.id);

        if (updateError) {
          console.error(`Error updating class ${liveClass.id}:`, updateError);
          results.errors++;
          continue;
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

        console.log(`Successfully synced recording for: ${liveClass.title}`);
        results.synced++;

        // Try to fetch and save transcription
        if (completedRecording.id) {
          try {
            const transcriptResponse = await fetch(
              `https://api.daily.co/v1/recordings/${completedRecording.id}/transcript`,
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
              }
            }
          } catch (transcriptError) {
            console.error(`Error fetching transcript for ${liveClass.id}:`, transcriptError);
          }
        }

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
