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
    const { classId } = await req.json();
    console.log("Auto-creating recurring class for ended class:", classId);

    if (!classId) {
      throw new Error("classId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the ended class
    const { data: endedClass, error: fetchError } = await supabase
      .from("live_classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (fetchError || !endedClass) {
      console.error("Failed to fetch ended class:", fetchError);
      throw new Error("Class not found");
    }

    console.log("Ended class details:", {
      id: endedClass.id,
      is_recurring: endedClass.is_recurring,
      recurrence_day: endedClass.recurrence_day,
      recurrence_time: endedClass.recurrence_time,
    });

    // Check if this is a recurring class
    if (!endedClass.is_recurring || !endedClass.recurrence_day || !endedClass.recurrence_time) {
      console.log("Class is not recurring, skipping auto-creation");
      return new Response(
        JSON.stringify({ success: true, message: "Not a recurring class" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate next occurrence date
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDay = dayMap[endedClass.recurrence_day.toLowerCase()];
    if (targetDay === undefined) {
      throw new Error(`Invalid recurrence day: ${endedClass.recurrence_day}`);
    }

    // Get next week's date for the same day
    const today = new Date();
    const currentDay = today.getUTCDay();
    let daysUntilNext = targetDay - currentDay;
    if (daysUntilNext <= 0) {
      daysUntilNext += 7; // Next week
    }

    const nextDate = new Date(today);
    nextDate.setUTCDate(today.getUTCDate() + daysUntilNext);

    // Parse the recurrence time (format: "HH:MM:SS" or "HH:MM")
    const timeParts = endedClass.recurrence_time.split(":");
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    // Set the time (assuming CAT timezone - UTC+2)
    nextDate.setUTCHours(hours - 2, minutes, 0, 0);

    console.log("Next class scheduled for:", nextDate.toISOString());

    // Create new Daily.co room
    let roomName = `lumina-${Date.now()}`;
    let roomUrl = "";

    if (dailyApiKey) {
      try {
        const roomData = {
          name: roomName,
          privacy: "private",
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            enable_transcription_storage: true,
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor(nextDate.getTime() / 1000) + (4 * 60 * 60), // Expires 4 hours after scheduled time
            eject_at_room_exp: true,
            enable_prejoin_ui: true,
            enable_network_ui: true,
            enable_knocking: false,
            lang: "en",
          },
        };

        console.log("Creating new Daily room for recurring class:", roomData);

        const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${dailyApiKey}`,
          },
          body: JSON.stringify(roomData),
        });

        if (roomResponse.ok) {
          const room = await roomResponse.json();
          roomName = room.name;
          roomUrl = room.url;
          console.log("Daily room created:", { roomName, roomUrl });
        } else {
          const errorText = await roomResponse.text();
          console.error("Failed to create Daily room:", errorText);
        }
      } catch (roomError) {
        console.error("Error creating Daily room:", roomError);
      }
    }

    // Create the new recurring class
    const newClassData = {
      title: endedClass.title,
      description: endedClass.description,
      host_id: endedClass.host_id,
      course_id: endedClass.course_id,
      status: "scheduled",
      scheduled_at: nextDate.toISOString(),
      daily_room_name: roomName,
      daily_room_url: roomUrl || `https://lumina-app.daily.co/${roomName}`,
      is_recurring: true,
      recurrence_day: endedClass.recurrence_day,
      recurrence_time: endedClass.recurrence_time,
      recurrence_description: endedClass.recurrence_description,
      live_class_price: endedClass.live_class_price,
      recording_price: endedClass.recording_price,
      is_purchasable: endedClass.is_purchasable,
    };

    console.log("Creating new recurring class:", newClassData);

    const { data: newClass, error: insertError } = await supabase
      .from("live_classes")
      .insert(newClassData)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create recurring class:", insertError);
      throw insertError;
    }

    console.log("New recurring class created:", newClass.id);

    // Notify enrolled students about the new recurring class
    if (newClass.course_id) {
      try {
        // Get tutor name
        const { data: tutorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", endedClass.host_id)
          .single();

        const notificationResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-student-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: "recurring_class_created",
              courseId: newClass.course_id,
              data: {
                title: newClass.title,
                description: newClass.description,
                classId: newClass.id,
                scheduledAt: nextDate.toISOString(),
                tutorName: tutorProfile?.full_name || "Your Tutor",
              },
            }),
          }
        );

        if (notificationResponse.ok) {
          const notifResult = await notificationResponse.json();
          console.log("Student notifications sent:", notifResult);
        } else {
          console.error("Failed to send notifications:", await notificationResponse.text());
        }
      } catch (notifError) {
        console.error("Error sending notifications:", notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Recurring class created",
        newClassId: newClass.id,
        scheduledAt: nextDate.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-create recurring class error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
