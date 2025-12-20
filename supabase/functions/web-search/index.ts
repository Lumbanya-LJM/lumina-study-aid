import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, searchType = 'quick' } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Web search: "${query}" (type: ${searchType})`);

    // Use DuckDuckGo instant answer API (free, no key needed)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&skip_disambig=1`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Lumina-Study-App/1.0",
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    // Extract relevant information
    const results = {
      abstract: searchData.Abstract || null,
      abstractSource: searchData.AbstractSource || null,
      abstractUrl: searchData.AbstractURL || null,
      answer: searchData.Answer || null,
      answerType: searchData.AnswerType || null,
      definition: searchData.Definition || null,
      definitionSource: searchData.DefinitionSource || null,
      definitionUrl: searchData.DefinitionURL || null,
      relatedTopics: (searchData.RelatedTopics || []).slice(0, 5).map((topic: any) => ({
        text: topic.Text,
        url: topic.FirstURL,
      })).filter((t: any) => t.text),
      results: (searchData.Results || []).slice(0, 5).map((result: any) => ({
        title: result.Text,
        url: result.FirstURL,
      })),
    };

    // For ZambiaLII specific searches
    let zambiaLiiResults: any[] = [];
    if (query.toLowerCase().includes('zambia') || 
        query.toLowerCase().includes('case') || 
        query.toLowerCase().includes('statute') ||
        query.toLowerCase().includes('law')) {
      // Construct ZambiaLII search URL
      zambiaLiiResults = [
        {
          type: 'zambialii',
          searchUrl: `https://zambialii.org/search?q=${encodeURIComponent(query)}`,
          courts: [
            { name: 'Supreme Court', url: `https://zambialii.org/zm/judgment/supreme-court?q=${encodeURIComponent(query)}` },
            { name: 'Constitutional Court', url: `https://zambialii.org/zm/judgment/constitutional-court?q=${encodeURIComponent(query)}` },
            { name: 'Court of Appeal', url: `https://zambialii.org/zm/judgment/court-appeal?q=${encodeURIComponent(query)}` },
            { name: 'High Court', url: `https://zambialii.org/zm/judgment/high-court?q=${encodeURIComponent(query)}` },
          ],
          legislation: `https://zambialii.org/legislation?q=${encodeURIComponent(query)}`,
        }
      ];
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      zambiaLii: zambiaLiiResults,
      query,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Web search error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Search failed",
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
