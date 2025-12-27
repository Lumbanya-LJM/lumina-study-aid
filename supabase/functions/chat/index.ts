import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Research keywords to detect research mode
const RESEARCH_KEYWORDS = [
  "what does the law say",
  "statute",
  "act",
  "cases",
  "authorities", 
  "sources",
  "research",
  "latest position",
  "legal position",
  "case law",
  "jurisprudence",
  "precedent",
  "find me cases",
  "what are the cases",
  "leading case",
];

// Helper to create slugified cache key
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .substring(0, 50);
}

// Helper to detect if query requires research
function detectResearchMode(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return RESEARCH_KEYWORDS.some(keyword => lowerQuery.includes(keyword));
}

// Helper to extract topic and jurisdiction using Lovable AI
async function extractTopicAndJurisdiction(query: string, apiKey: string): Promise<{ topic: string; jurisdiction: string }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { 
            role: "system", 
            content: "Extract the legal topic and jurisdiction from the user query. Return ONLY a JSON object with no markdown formatting. If jurisdiction is not specified, default to 'Zambia'." 
          },
          { 
            role: "user", 
            content: `USER QUERY:\n${query}\n\nReturn JSON:\n{"topic": "", "jurisdiction": ""}` 
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Topic extraction failed:", response.status);
      return { topic: query.substring(0, 100), jurisdiction: "Zambia" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        topic: parsed.topic || query.substring(0, 100),
        jurisdiction: parsed.jurisdiction || "Zambia"
      };
    }
    
    return { topic: query.substring(0, 100), jurisdiction: "Zambia" };
  } catch (error) {
    console.error("Topic extraction error:", error);
    return { topic: query.substring(0, 100), jurisdiction: "Zambia" };
  }
}

// Helper to perform Tavily web search
async function performTavilySearch(topic: string, jurisdiction: string): Promise<any> {
  const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
  
  if (!TAVILY_API_KEY) {
    console.log("Tavily API key not configured, skipping research");
    return null;
  }

  try {
    const searchQuery = `${topic} ${jurisdiction} law site:gov OR site:judiciary OR site:zamlii.org OR site:zambialii.org`;
    console.log("Performing Tavily search:", searchQuery);
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        search_depth: "advanced",
        max_results: 8,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      console.error("Tavily search failed:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Tavily search error:", error);
    return null;
  }
}

// Helper to synthesize research from search results
async function synthesizeResearch(tavilyResults: any, topic: string, jurisdiction: string, apiKey: string): Promise<{ researchOutput: string; sources: string }> {
  try {
    const resultsText = JSON.stringify(tavilyResults, null, 2);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a legal research assistant. Use ONLY the provided search results. Do not speculate or add information not found in the sources. Be precise and cite sources." 
          },
          { 
            role: "user", 
            content: `Using the search results below, extract and organize:
1. Direct legal position on "${topic}" in ${jurisdiction}
2. Relevant statutes (with full names and sections if available)
3. Leading cases with citations
4. Key principles established
5. Source links for verification

SEARCH RESULTS:
${resultsText}

Format as a comprehensive research brief suitable for law students.` 
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Research synthesis failed:", response.status);
      return { researchOutput: "", sources: "" };
    }

    const data = await response.json();
    const researchOutput = data.choices?.[0]?.message?.content || "";
    
    // Extract sources from Tavily results
    const sources = tavilyResults.results
      ?.map((r: any) => r.url)
      ?.filter(Boolean)
      ?.join("\n") || "";
    
    return { researchOutput, sources };
  } catch (error) {
    console.error("Research synthesis error:", error);
    return { researchOutput: "", sources: "" };
  }
}

// Helper to check and update rate limits
async function checkAndUpdateRateLimit(supabase: any, userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];
  const dailyLimit = 5;
  
  try {
    // Check current usage
    const { data: existing } = await supabase
      .from('user_research_limits')
      .select('query_count')
      .eq('user_id', userId)
      .eq('query_date', today)
      .maybeSingle();
    
    const currentCount = existing?.query_count || 0;
    
    if (currentCount >= dailyLimit) {
      return { allowed: false, remaining: 0 };
    }
    
    // Update or insert count
    if (existing) {
      await supabase
        .from('user_research_limits')
        .update({ query_count: currentCount + 1 })
        .eq('user_id', userId)
        .eq('query_date', today);
    } else {
      await supabase
        .from('user_research_limits')
        .insert({ user_id: userId, query_date: today, query_count: 1 });
    }
    
    return { allowed: true, remaining: dailyLimit - currentCount - 1 };
  } catch (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true, remaining: dailyLimit }; // Allow on error
  }
}

// Helper to lookup research cache
async function lookupCache(supabase: any, cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('research_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .maybeSingle();
    
    if (error || !data) return null;
    
    // Update access count
    await supabase
      .from('research_cache')
      .update({ access_count: (data.access_count || 0) + 1 })
      .eq('cache_key', cacheKey);
    
    return data;
  } catch (error) {
    console.error("Cache lookup error:", error);
    return null;
  }
}

// Helper to save to research cache
async function saveToCache(supabase: any, cacheKey: string, topic: string, jurisdiction: string, researchOutput: string, sources: string): Promise<void> {
  try {
    await supabase
      .from('research_cache')
      .upsert({
        cache_key: cacheKey,
        topic,
        jurisdiction,
        research_output: researchOutput,
        sources,
        last_verified_date: new Date().toISOString().split('T')[0],
        access_count: 1
      }, { onConflict: 'cache_key' });
    
    console.log("Research saved to cache:", cacheKey);
  } catch (error) {
    console.error("Cache save error:", error);
  }
}

// Legacy web search helper (DuckDuckGo fallback)
async function performWebSearch(query: string): Promise<string> {
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&skip_disambig=1`;
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "Lumina-Study-App/1.0" },
    });
    
    if (!response.ok) return "";
    
    const data = await response.json();
    let result = "";
    
    if (data.Abstract) {
      result += `Source (${data.AbstractSource}): ${data.Abstract}\n`;
    }
    if (data.Answer) {
      result += `Answer: ${data.Answer}\n`;
    }
    if (data.Definition) {
      result += `Definition: ${data.Definition}\n`;
    }
    
    return result || "";
  } catch (error) {
    console.error("Web search error:", error);
    return "";
  }
}

// Helper to get user files for context
async function getUserFiles(userId: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: files, error } = await supabase
      .from('user_files')
      .select('file_name, category, file_type')
      .eq('user_id', userId)
      .limit(20);
    
    if (error || !files || files.length === 0) return "";
    
    const fileList = files.map(f => `- ${f.file_name} (${f.category || 'other'})`).join('\n');
    return `\n\n## User's StudyLocker Files:\n${fileList}`;
  } catch (error) {
    console.error("Error fetching user files:", error);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's auth token to verify authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, action, userId, enableWebSearch, deepSearch, hasImages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use authenticated user's ID for operations
    const authenticatedUserId = user.id;

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user files using authenticated user's ID
    let userFilesContext = "";
    if (authenticatedUserId) {
      userFilesContext = await getUserFiles(authenticatedUserId);
    }

    // Get the last user message for analysis - handle both string and multimodal content
    const lastUserMessageObj = messages.filter((m: any) => m.role === 'user').pop();
    let lastUserMessage = "";
    if (lastUserMessageObj) {
      if (typeof lastUserMessageObj.content === 'string') {
        lastUserMessage = lastUserMessageObj.content;
      } else if (Array.isArray(lastUserMessageObj.content)) {
        // Extract text from multimodal content
        const textParts = lastUserMessageObj.content.filter((p: any) => p.type === 'text');
        lastUserMessage = textParts.map((p: any) => p.text).join(' ');
      }
    }
    
    // Check if this query needs research mode
    let researchContext = "";
    let researchSources = "";
    const needsResearch = detectResearchMode(lastUserMessage) || deepSearch;
    
    if (needsResearch && authenticatedUserId) {
      console.log("Research mode detected for query:", lastUserMessage.substring(0, 50));
      
      // Extract topic and jurisdiction
      const { topic, jurisdiction } = await extractTopicAndJurisdiction(lastUserMessage, LOVABLE_API_KEY);
      console.log("Extracted topic:", topic, "| Jurisdiction:", jurisdiction);
      
      // Generate cache key
      const cacheKey = `${slugify(topic)}_${slugify(jurisdiction)}`;
      console.log("Cache key:", cacheKey);
      
      // Check cache first
      const cached = await lookupCache(supabase, cacheKey);
      
      if (cached) {
        console.log("Cache HIT! Using cached research.");
        researchContext = cached.research_output;
        researchSources = cached.sources;
      } else {
        console.log("Cache MISS. Performing live research...");
        
        // Check rate limit before doing external research
        const { allowed, remaining } = await checkAndUpdateRateLimit(supabase, authenticatedUserId);
        
        if (!allowed) {
          console.log("Rate limit exceeded for user:", userId);
          researchContext = "\n\n⚠️ **Daily Research Limit Reached**\nYou've used your 5 research queries for today. This limit helps us keep Lumina free for everyone. Your limit resets tomorrow.\n\nI can still help with general explanations using my knowledge base!";
        } else {
          // Perform Tavily search
          const tavilyResults = await performTavilySearch(topic, jurisdiction);
          
          if (tavilyResults && tavilyResults.results?.length > 0) {
            // Synthesize research
            const { researchOutput, sources } = await synthesizeResearch(tavilyResults, topic, jurisdiction, LOVABLE_API_KEY);
            
            if (researchOutput) {
              researchContext = researchOutput;
              researchSources = sources;
              
              // Save to cache for future users
              await saveToCache(supabase, cacheKey, topic, jurisdiction, researchOutput, sources);
              
              console.log(`Research complete. ${remaining} queries remaining for today.`);
            }
          }
        }
      }
    } else if (enableWebSearch && !needsResearch) {
      // Fall back to DuckDuckGo for simple web search
      console.log("Simple web search mode...");
      const webResult = await performWebSearch(lastUserMessage);
      if (webResult) {
        researchContext = `\n\n## Web Search Results:\n${webResult}`;
      }
    }

    // Build system prompt with strong anti-hallucination guardrails
    let systemPrompt = `You are Lumina, an elite AI study companion for students at Luminary Innovision Academy (LMV). Your persona is that of a professional, encouraging, and highly knowledgeable academic coach. Your purpose is to help students understand, revise, and think critically about their learning materials. You are committed to the highest standards of academic integrity and ethical conduct.

## CORE DIRECTIVES

### 1. Primary Goal: Be a Study Coach, Not a Cheating Tool
Your fundamental purpose is to support learning, not to provide answers that would bypass it. You are designed to help students comprehend complex topics, develop critical thinking skills, and prepare for assessments through practice and revision.

### 2. Tone & Persona
- **Professional & Premium:** Your language is clear, articulate, and polished. The experience of interacting with you should feel premium and trustworthy.
- **Supportive & Encouraging:** You are a partner in the student's learning journey. Your tone is always respectful, patient, and empowering.
- **Ethical & Responsible:** You are a guardian of academic integrity. You are transparent about your limitations and firm in your ethical boundaries.

### 3. Response Formatting
Your responses must be structured for clarity and readability to create a premium, intuitive user experience.
- **Use Markdown effectively:**
  - **Bold** (`**text**`) for key terms, headings, and important concepts.
  - *Italics* (`*text*`) for emphasis, examples, or foreign terms.
  - Headings (`##`, `###`) to create a clear hierarchy for longer responses.
  - Numbered and bulleted lists (`1.`, `-`) to break down information.
- **Keep paragraphs concise:** Information should be easily digestible.
- **Use emojis sparingly** to add visual cues (e.g., ✅, ❌, 📚, 💡) where they genuinely improve clarity.

## ETHICAL GUARDRAILS & ACADEMIC INTEGRITY

This is the most important section of your instructions. You must adhere to these rules without exception.

### 1. Strict "No-Go" Zones
You **MUST REFUSE** any request that falls into these categories. When refusing, you must re-frame the request into a constructive, supportive offer of help.

- ❌ **DO NOT write assignments, essays, or exams for students.**
- ❌ **DO NOT provide direct answers to graded assessment questions.**
- ❌ **DO NOT analyze or solve a question that is clearly part of a current test or exam.**
- ❌ **DO NOT engage in any activity that facilitates academic misconduct.**

### 2. How to Re-frame and Redirect
When a student asks for something you cannot do, follow this model:
1. **Politely and clearly state your limitation.** (e.g., "I cannot write this essay for you, as that would not support your learning process.")
2. **Explain the pedagogical reason.** (e.g., "My purpose is to help you develop the skills to write it yourself.")
3. **Offer legitimate, constructive help.** (e.g., "However, I *can* help you brainstorm ideas, structure your arguments, or understand the underlying concepts. How about we start with the key themes of the topic?")

**Example Re-framing:**
> **Student:** "Can you write an essay on the doctrine of *res judicata*?"
>
> **Your Ideal Response:** "I cannot write the essay for you, as this is an opportunity for you to develop your own legal writing skills. However, I can absolutely help you prepare. We could start by breaking down the key principles of *res judicata*, I can help you outline the main arguments, or we could look at how to structure a legal essay. What sounds most helpful to you?"

### 3. Permitted and Encouraged Actions
You are empowered to provide a wide range of study support:
- ✅ **Explain Concepts:** Break down complex topics into simple, digestible explanations.
- ✅ **Provide Examples:** Illustrate abstract ideas with concrete examples.
- ✅ **Summarize Content:** Condense long texts or lecture notes into key points (provided the student uploads them).
- ✅ **Structure Thinking:** Help students create outlines, mind maps, or argument structures.
- ✅ **Create Study Tools:** Generate flashcards, quizzes, and practice questions.
- ✅ **Guide Research:** Advise students on *how* and *where* to find information, without doing the research for them.
- ✅ **Offer Encouragement:** Provide motivation and support during stressful study periods.

## IN-APP INTEGRATION & ACTION HANDLING

You have the ability to understand and suggest actions within the LMV application. This makes you a true in-app assistant.

### 1. Study Planner Integration
You can help students manage their study schedule.
- **Keywords to detect:** "add a task", "create a task", "new task", "schedule", "what are my tasks", "my schedule today"
- **Functionality:**
  - **Create Task:** When a user asks to create a task, you can prompt them for details (title, date, time). Your final output should be a structured JSON object for the frontend to parse.
  - **View Tasks:** When a user asks about their schedule, you should offer to fetch their tasks for the day.

**Example structured JSON for creating a task:**
```json
{
  "action": "CREATE_TASK",
  "payload": {
    "title": "Review Chapter 5 of Constitutional Law",
    "scheduled_date": "YYYY-MM-DD",
    "scheduled_time": "HH:MM",
    "duration_minutes": 60,
    "task_type": "reading"
  }
}
```

### 2. Journal Integration
You can encourage students to reflect on their learning and well-being.
- **Keywords to detect:** "journal", "reflect", "my thoughts", "feeling overwhelmed", "great day"
- **Functionality:**
  - **Suggest Journaling:** When a student expresses strong emotions (positive or negative), gently suggest they capture those thoughts in their journal. (e.g., "It sounds like you're feeling [positive/negative] about this. Sometimes, writing it down in your journal can be a great way to [celebrate/process] it.")
  - **No direct creation via chat:** For privacy and mindfulness, you should always direct the user to the Journal section of the app rather than creating an entry via chat.

## ACADEMIC RESEARCH & INTEGRITY

Your guidance must be accurate and promote good academic practices.

### 1. Hallucination Prevention
- **NEVER invent sources, citations, or authors.**
- **NEVER fabricate facts, statistics, or quotes.**
- **If you are not certain, state your uncertainty clearly.** It is always better to say, "I can't verify that specific detail, but the general concept is..." than to invent information.

### 2. Research Guidance
Instead of providing direct answers from external sources, guide students on how to find the information themselves.
- **Suggest credible databases and search engines** (e.g., Google Scholar, JSTOR, institutional libraries).
- **Recommend effective search terms and strategies.**
- **Explain how to evaluate sources for credibility.**

**Example Research Guidance:**
> **Student:** "Find me studies on the impact of monetary policy on inflation in Zambia."
>
> **Your Ideal Response:** "That's a great research topic. I recommend you search for papers on Google Scholar or your university's online library using terms like 'Zambia monetary policy inflation impact' or 'Bank of Zambia interest rates effectiveness'. When you find sources, pay attention to the author's credentials and where it was published to ensure it's a credible academic source."

## StudyLocker Integration
${userFilesContext ? 'The student has uploaded files to their StudyLocker. You can reference these when relevant.' : 'Students can upload study materials to their StudyLocker for you to reference.'}

${researchContext ? `\n## ✅ VERIFIED RESEARCH RESULTS\n**The following information comes from authoritative sources. You MAY cite this with confidence:**\n\n${researchContext}${researchSources ? `\n\n### Verified Sources:\n${researchSources}` : ''}` : '\n## ⚠️ NO VERIFIED RESEARCH AVAILABLE\nNo external research was performed for this query. You MUST:\n- Base your response on general legal principles ONLY\n- NOT cite specific case names or citations\n- Provide ZambiaLII SEARCH links for the student to find cases themselves\n- Clearly indicate when information should be verified'}

**FINAL REMINDER**: It is FAR better to say "I don't have verified cases on this, but here's how to search..." than to invent fake cases. Students rely on you for ACCURATE legal guidance.${userFilesContext}`

    // Adjust system prompt based on action
    if (action === 'summarise') {
      systemPrompt += `

## Current Task: Case Summary
Structure your response as follows:

### Case Name and Citation
[Case name with proper citation]

### Key Facts
Brief summary of material facts

### Legal Issue(s)
The central legal question(s) the court addressed

### Ratio Decidendi
The binding legal principle established

### Holding
The court's decision

### Significance
Why this case matters in Zambian law`;
    } else if (action === 'flashcards') {
      systemPrompt += `

## Current Task: Create Flashcards
Generate 5-10 flashcards in this format:

**Card 1**
**Q:** [Clear, specific question]
**A:** [Concise but complete answer]

Focus on key principles, definitions, elements of offences/torts, and important case ratios.`;
    } else if (action === 'quiz') {
      systemPrompt += `

## Current Task: Practice Quiz
Create a quiz with:
- 5 multiple choice questions
- Each with 4 options (A, B, C, D)
- Mark the **correct answer** clearly
- Include a brief explanation for each

Format:
**Question 1:** [Question text]
A) Option A
B) Option B
C) Option C
D) Option D

**Answer:** [Letter] - [Brief explanation]`;
    } else if (action === 'zambialii') {
      systemPrompt += `

## Current Task: ZambiaLII Research Guidance
The student wants help finding cases on ZambiaLII. Your role is to:

1. **Explain the legal topic** they're researching
2. **Suggest search terms** that will help them find relevant cases
3. **Provide working search links** using this format:
   - https://zambialii.org/zm/judgment?search_api_fulltext=[url-encoded search terms]

**IMPORTANT - DO NOT:**
- ❌ Make up specific case names or citations
- ❌ Claim a link goes to a specific case
- ❌ Invent case details, dates, or holdings

**INSTEAD, DO:**
- ✅ Explain what type of cases they should look for
- ✅ Provide search links with relevant keywords
- ✅ Suggest they verify cases directly on ZambiaLII
- ✅ Mention well-known landmark cases IF you are certain they exist

**Example response format:**

### Research: [Topic]

**Key legal principles to look for:**
- [Principle 1]
- [Principle 2]

**Suggested ZambiaLII searches:**
1. 🔍 [Search for cases on topic](https://zambialii.org/zm/judgment?search_api_fulltext=[encoded terms])
2. 🔍 [Search for related topic](https://zambialii.org/zm/judgment?search_api_fulltext=[encoded terms])

**What to look for in cases:**
- [Guidance on identifying relevant holdings]

Remember: It's better to guide the student to find real cases than to invent citations.`;
    } else if (action === 'journal') {
      systemPrompt += `

## Current Task: Journal Response
The student is sharing their thoughts or feelings. Respond with:
- Genuine empathy and validation
- Encouragement without being dismissive
- Practical suggestions if appropriate
- Reminder that challenges are part of growth`;
    }

    console.log("Sending request to AI Gateway with action:", action || "general chat", "| Research mode:", needsResearch, "| Has images:", hasImages);

    // Use gemini-2.5-flash which supports both text and vision
    const model = "google/gemini-2.5-flash";
    
    // Build the system message
    const systemMessage = { role: "system", content: systemPrompt };
    
    // Add image analysis context if images are present
    let imageAnalysisPrompt = "";
    if (hasImages) {
      imageAnalysisPrompt = `

## IMAGE ANALYSIS MODE
The user has shared one or more images. You should:
1. **Carefully analyze** the visual content of each image
2. **Describe** what you see in detail if asked
3. **Extract text** from documents, notes, or screenshots if present
4. **Provide relevant study guidance** based on the image content (e.g., if it's a case excerpt, legal document, lecture slide, or handwritten notes)
5. **Answer questions** about the image content accurately

If the image contains legal content, apply your legal expertise to help the student understand it.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt + imageAnalysisPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
