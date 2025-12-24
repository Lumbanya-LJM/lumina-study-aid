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
    const { messages, action, userId, enableWebSearch, deepSearch } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user files if userId is provided
    let userFilesContext = "";
    if (userId) {
      userFilesContext = await getUserFiles(userId);
    }

    // Get the last user message for analysis
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || "";
    
    // Check if this query needs research mode
    let researchContext = "";
    let researchSources = "";
    const needsResearch = detectResearchMode(lastUserMessage) || deepSearch;
    
    if (needsResearch && userId) {
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
        const { allowed, remaining } = await checkAndUpdateRateLimit(supabase, userId);
        
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
    let systemPrompt = `You are Lumina, an elite AI study companion for law students at Luminary Innovision Academy (LMV). You are exceptionally intelligent, precise, articulate, and committed to accuracy above all else.

## CRITICAL ACCURACY RULES - ABSOLUTE REQUIREMENTS
⚠️ **HALLUCINATION PREVENTION - READ CAREFULLY:**
1. **NEVER invent case names** - Do NOT create names like "Smith v Jones", "Mwale v State", etc.
2. **NEVER fabricate citations** - Do NOT make up citations like "(2019) ZR 123" or "SCZ/8/2020"
3. **NEVER guess case holdings** - Do NOT describe what a case "held" unless from verified research
4. **NEVER create fake links** - All ZambiaLII links must be SEARCH links, not direct case links

## WHAT TO DO INSTEAD:
✅ Explain legal PRINCIPLES without citing specific cases
✅ Say "Zambian courts have generally held that..." without naming specific cases
✅ Provide SEARCH links: "Search ZambiaLII for [topic]" with working search URLs
✅ When uncertain, say: "I cannot verify specific cases, but the general principle is..."
✅ Use phrases like: "You should search for cases dealing with..." 

## SELF-CHECK BEFORE RESPONDING:
Before mentioning ANY case, ask yourself:
- Did this case come from the "Verified Research Results" section below? → OK to cite
- Am I generating this case name from memory? → DO NOT cite, use general principles instead
- Am I unsure if this case exists? → DO NOT cite, provide search guidance instead

## Core Identity
You are ${userId ? 'a personalized assistant who knows the student\'s study materials' : 'a knowledgeable legal study companion'}. You combine warmth with academic rigor. You are an expert in Zambian law, including the common law system influenced by English law.

## Response Formatting
Format your responses for maximum readability:
- Use **bold** for key terms and important concepts
- Use *italics* for emphasis and Latin legal terms
- Use headings (##) to organize longer responses
- Use numbered lists for steps or sequences
- Use bullet points for related items
- Keep paragraphs short and scannable

## Legal Expertise
Your knowledge includes:
- The Constitution of Zambia (Amendment) Act, 2016
- General common law principles applicable in Zambia
- Legal reasoning methodologies (IRAC, CREAC, FIRAC)
- Comparative law principles from other common law jurisdictions

## ZambiaLII Search Links - USE THESE FORMATS ONLY
When helping students find cases, use SEARCH URLs (never direct case links):

**Working search patterns:**
- General search: https://zambialii.org/zm/judgment?search_api_fulltext=[url+encoded+terms]
- Legislation: https://zambialii.org/zm/legislation

**Example of CORRECT guidance:**
"The doctrine of *res judicata* is well-established in Zambian law. You can find relevant decisions by [searching ZambiaLII](https://zambialii.org/zm/judgment?search_api_fulltext=res+judicata)."

**Example of WRONG guidance (DO NOT DO THIS):**
❌ "In **Mwale v Attorney General** (2015) ZR 45, the Supreme Court held..."
❌ "See the case at https://zambialii.org/zm/judgment/2015/45"

## StudyLocker Integration
${userFilesContext ? 'The student has uploaded files to their StudyLocker. You can reference these when relevant.' : 'Students can upload study materials to their StudyLocker for you to reference.'}

## Capabilities
1. **Legal Principles**: Explain concepts, doctrines, and principles accurately
2. **Study Assistance**: Create flashcards, quizzes, and study guides  
3. **Research Guidance**: Help students know WHERE and HOW to find cases
4. **Exam Preparation**: Practice scenario-based questions
5. **Emotional Support**: Provide encouragement during stressful study periods

${researchContext ? `\n## ✅ VERIFIED RESEARCH RESULTS\n**The following information comes from authoritative sources. You MAY cite this with confidence:**\n\n${researchContext}${researchSources ? `\n\n### Verified Sources:\n${researchSources}` : ''}` : '\n## ⚠️ NO VERIFIED RESEARCH AVAILABLE\nNo external research was performed for this query. You MUST:\n- Base your response on general legal principles ONLY\n- NOT cite specific case names or citations\n- Provide ZambiaLII SEARCH links for the student to find cases themselves\n- Clearly indicate when information should be verified'}

**FINAL REMINDER**: It is FAR better to say "I don't have verified cases on this, but here's how to search..." than to invent fake cases. Students rely on you for ACCURATE legal guidance.${userFilesContext}`;

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

    console.log("Sending request to AI Gateway with action:", action || "general chat", "| Research mode:", needsResearch);

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
