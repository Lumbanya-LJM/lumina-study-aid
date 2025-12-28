import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserContext {
  userId: string;
  fullName: string;
  todayTasks: Array<{ title: string; scheduled_time: string | null }>;
  recentMood: string | null;
  recentConversationSummary: string | null;
  streakDays: number;
  upcomingClasses: Array<{ title: string; scheduled_at: string }>;
}

async function generatePersonalizedMessage(context: UserContext, apiKey: string): Promise<string> {
  const firstName = context.fullName?.split(' ')[0] || 'there';
  
  const systemPrompt = `You are Lumina, a warm, encouraging AI study companion for law students. 
Generate a brief, personalized morning check-in message (2-3 sentences max).
Be warm but not overly enthusiastic. Reference specific details when available.
If the student had a tough time recently (based on mood/conversations), be supportive.
If they have tasks or classes today, briefly mention them.
Keep it conversational and authentic - like a caring friend checking in.`;

  const userPrompt = `Generate a morning check-in for ${firstName}:
- Today's tasks: ${context.todayTasks.length > 0 ? context.todayTasks.map(t => t.title).join(', ') : 'None scheduled'}
- Recent mood: ${context.recentMood || 'Unknown'}
- Recent conversation theme: ${context.recentConversationSummary || 'No recent conversations'}
- Study streak: ${context.streakDays} days
- Upcoming classes today: ${context.upcomingClasses.length > 0 ? context.upcomingClasses.map(c => c.title).join(', ') : 'None'}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return `Good morning, ${firstName}! Ready to tackle another day of learning? 📚`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `Good morning, ${firstName}! Let's make today count! 📚`;
  } catch (error) {
    console.error("Error generating message:", error);
    return `Good morning, ${firstName}! Wishing you a productive study session today! 📚`;
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("lumina-daily-checkin function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("user_id");

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscribed users found");
      return new Response(
        JSON.stringify({ message: "No subscribed users", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userIds = [...new Set(subscriptions.map(s => s.user_id))];
    console.log(`Processing ${userIds.length} users`);

    const today = new Date().toISOString().split('T')[0];
    const results = [];

    for (const userId of userIds) {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, streak_days")
          .eq("user_id", userId)
          .single();

        // Get today's tasks
        const { data: tasks } = await supabase
          .from("study_tasks")
          .select("title, scheduled_time")
          .eq("user_id", userId)
          .eq("scheduled_date", today)
          .eq("completed", false)
          .limit(5);

        // Get recent journal entry for mood
        const { data: journal } = await supabase
          .from("journal_entries")
          .select("mood, content")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Get recent conversation summary
        const { data: recentMessages } = await supabase
          .from("chat_messages")
          .select("content, role")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        // Get today's classes
        const { data: classes } = await supabase
          .from("live_classes")
          .select("title, scheduled_at")
          .gte("scheduled_at", `${today}T00:00:00`)
          .lte("scheduled_at", `${today}T23:59:59`)
          .eq("status", "scheduled")
          .limit(3);

        // Summarize recent conversations
        let conversationSummary = null;
        if (recentMessages && recentMessages.length > 0) {
          const userMessages = recentMessages
            .filter(m => m.role === "user")
            .map(m => m.content)
            .join(" ");
          if (userMessages.length > 0) {
            conversationSummary = userMessages.substring(0, 200);
          }
        }

        const context: UserContext = {
          userId,
          fullName: profile?.full_name || "Student",
          todayTasks: tasks || [],
          recentMood: journal?.mood || null,
          recentConversationSummary: conversationSummary,
          streakDays: profile?.streak_days || 0,
          upcomingClasses: classes || [],
        };

        // Generate personalized message
        const message = await generatePersonalizedMessage(context, lovableApiKey);

        // Send push notification via existing function
        const notificationPayload = {
          userId,
          payload: {
            title: "☀️ Good Morning from Lumina",
            body: message,
            icon: "/pwa-192x192.png",
            badge: "/favicon.png",
            tag: `lumina-checkin-${today}`,
            data: {
              url: "/chat",
              type: "lumina-checkin"
            }
          }
        };

        // Call the send-push-notification function internally
        const { data: pushResult, error: pushError } = await supabase.functions.invoke(
          "send-push-notification",
          { body: notificationPayload }
        );

        if (pushError) {
          console.error(`Error sending notification to ${userId}:`, pushError);
          results.push({ userId, status: "error", error: pushError.message });
        } else {
          console.log(`Notification sent to ${userId}`);
          results.push({ userId, status: "sent", message: message.substring(0, 50) });
        }

      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        results.push({ userId, status: "error", error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Daily check-ins processed",
        total: userIds.length,
        sent: results.filter(r => r.status === "sent").length,
        failed: results.filter(r => r.status === "error").length,
        results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in lumina-daily-checkin:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
