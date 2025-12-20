import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to perform web search
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
    
    return result || "No direct answer found from web search.";
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

    // Get user files if userId is provided
    let userFilesContext = "";
    if (userId) {
      userFilesContext = await getUserFiles(userId);
    }

    // Perform web search if enabled and there's a query
    let webSearchContext = "";
    if (enableWebSearch || deepSearch) {
      const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
      if (lastUserMessage) {
        console.log(`Performing ${deepSearch ? 'deep' : 'quick'} web search...`);
        webSearchContext = await performWebSearch(lastUserMessage.content);
        if (webSearchContext) {
          webSearchContext = `\n\n## Web Search Results:\n${webSearchContext}`;
        }
      }
    }

    // Build system prompt based on action type
    let systemPrompt = `You are Lumina, an elite AI study companion for law students at Luminary Innovision Academy (LMV). You are exceptionally intelligent, precise, articulate, and have access to real-time web information.

## Core Identity
You are ${userId ? 'a personalized assistant who knows the student\'s study materials' : 'a knowledgeable legal study companion'}. You combine warmth with academic rigor. You are an expert in Zambian law, including the common law system influenced by English law.

## Response Formatting
Format your responses for maximum readability:
- Use **bold** for key terms, case names, and important concepts
- Use *italics* for emphasis and Latin legal terms
- Use headings (##) to organize longer responses
- Use numbered lists for steps or sequences
- Use bullet points for related items
- Keep paragraphs short and scannable
- Always provide citations with links when discussing cases

## Legal Expertise
Your knowledge includes:
- The Constitution of Zambia (Amendment) Act, 2016
- Zambian Supreme Court and Constitutional Court jurisprudence
- Common law principles applicable in Zambia
- Legal reasoning methodologies (IRAC, CREAC, FIRAC)
- Comparative law from other common law jurisdictions

## Web Search & Citations
When discussing Zambian cases or statutes:
- Provide ZambiaLII links when available: https://zambialii.org/
- For cases, use format: [Case Name] (Year) Citation, available at [ZambiaLII URL]
- For statutes, link to: https://zambialii.org/legislation

## StudyLocker Integration
${userFilesContext ? 'The student has uploaded files to their StudyLocker. You can reference these when relevant.' : 'Students can upload study materials to their StudyLocker for you to reference.'}

## Capabilities
1. **Case Analysis**: Summarize with ratio decidendi, obiter dicta, material facts, and significance
2. **Flashcard Generation**: Create effective study cards using active recall principles
3. **Quiz Creation**: Develop scenario-based multiple choice questions
4. **Study Guides**: Produce comprehensive topic summaries
5. **Research Assistance**: Help find relevant cases and statutes
6. **Emotional Support**: Provide encouragement during stressful study periods

Always maintain academic precision while being conversational and supportive.${userFilesContext}${webSearchContext}`;

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
    } else if (action === 'journal') {
      systemPrompt += `

## Current Task: Journal Response
The student is sharing their thoughts or feelings. Respond with:
- Genuine empathy and validation
- Encouragement without being dismissive
- Practical suggestions if appropriate
- Reminder that challenges are part of growth`;
    }

    console.log("Sending request to AI Gateway with action:", action || "general chat");

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