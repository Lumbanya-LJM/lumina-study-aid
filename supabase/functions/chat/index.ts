import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to extract text from PDF base64 using simple pattern matching
async function extractPdfText(base64Data: string): Promise<string> {
  try {
    // Remove data URL prefix if present
    const pdfBase64 = base64Data.replace(/^data:application\/pdf;base64,/, '');
    
    // Decode base64 to binary
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Simple PDF text extraction - look for text streams
    const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Extract text between stream markers and clean it up
    const textMatches: string[] = [];
    
    // Match text in PDF streams - look for readable text patterns
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi;
    let match;
    while ((match = streamRegex.exec(pdfText)) !== null) {
      const streamContent = match[1];
      // Extract text from Tj and TJ operators (PDF text operators)
      const tjMatches = streamContent.match(/\(([^)]+)\)\s*Tj/g);
      if (tjMatches) {
        tjMatches.forEach(m => {
          const text = m.replace(/\(([^)]+)\)\s*Tj/, '$1');
          if (text.length > 1 && /[a-zA-Z]/.test(text)) {
            textMatches.push(text);
          }
        });
      }
      
      // Also try TJ arrays
      const tjArrayMatches = streamContent.match(/\[([^\]]+)\]\s*TJ/gi);
      if (tjArrayMatches) {
        tjArrayMatches.forEach(m => {
          const innerText = m.match(/\(([^)]+)\)/g);
          if (innerText) {
            innerText.forEach(t => {
              const text = t.replace(/[()]/g, '');
              if (text.length > 1 && /[a-zA-Z]/.test(text)) {
                textMatches.push(text);
              }
            });
          }
        });
      }
    }
    
    // Also extract any readable ASCII text that looks like content
    const readableText = pdfText.match(/[\x20-\x7E]{20,}/g) || [];
    const filteredReadable = readableText.filter(t => 
      /[a-zA-Z]{3,}/.test(t) && // Has meaningful words
      !/^[0-9\s.]+$/.test(t) && // Not just numbers
      !t.includes('PDF-') && // Not PDF headers
      !t.includes('obj') && // Not PDF objects
      !t.includes('endobj')
    );
    
    const allText = [...textMatches, ...filteredReadable].join(' ');
    
    // Clean up the text
    const cleanedText = allText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '')
      .trim();
    
    if (cleanedText.length > 50) {
      console.log("Extracted PDF text length:", cleanedText.length);
      return cleanedText;
    }
    
    return "";
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "";
  }
}

// Helper to process multimodal content and extract PDF text
async function processMessageContent(content: any): Promise<{ textContent: string; imageUrls: any[] }> {
  let textContent = "";
  const imageUrls: any[] = [];
  
  if (typeof content === 'string') {
    return { textContent: content, imageUrls: [] };
  }
  
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === 'text') {
        textContent += part.text + "\n";
      } else if (part.type === 'image_url' && part.image_url?.url) {
        const url = part.image_url.url;
        
        // Check if it's a PDF
        if (url.startsWith('data:application/pdf')) {
          console.log("Processing PDF attachment...");
          const extractedText = await extractPdfText(url);
          if (extractedText) {
            textContent += `\n\n[Extracted PDF Content]:\n${extractedText}\n\n`;
          } else {
            // If extraction failed, note that we have a PDF but couldn't extract text
            textContent += "\n\n[PDF Document attached - text extraction was limited. Please describe what you see or ask me to analyze specific parts.]\n\n";
            // Still include the PDF for vision analysis as fallback
            imageUrls.push(part);
          }
        } else {
          // It's an image - keep for vision processing
          imageUrls.push(part);
        }
      }
    }
  }
  
  return { textContent: textContent.trim(), imageUrls };
}

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

// Tool definitions for Lumina's in-app actions
const LUMINA_TOOLS = [
  {
    type: "function",
    function: {
      name: "add_study_task",
      description: "Add a new study task to the user's planner. Use this when the user asks to add, schedule, or create a task.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The task title" },
          description: { type: "string", description: "Optional task description" },
          scheduled_date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today if not specified." },
          scheduled_time: { type: "string", description: "Time in HH:MM format (24h). Optional." },
          duration_minutes: { type: "number", description: "Estimated duration in minutes. Default 30." },
          task_type: { type: "string", enum: ["study", "revision", "assignment", "reading", "practice"], description: "Type of task" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a study task as completed. Use when user says they finished a task.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The UUID of the task to complete" },
          task_title: { type: "string", description: "If task_id not known, provide the task title to find and complete" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing study task. Use when user wants to reschedule, rename, or modify a task.",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Current task title to find the task" },
          new_title: { type: "string", description: "New title if renaming" },
          new_date: { type: "string", description: "New date in YYYY-MM-DD format if rescheduling" },
          new_time: { type: "string", description: "New time in HH:MM format if changing time" },
          new_description: { type: "string", description: "New description if updating" },
          new_duration: { type: "number", description: "New duration in minutes" }
        },
        required: ["task_title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a study task. Use when user wants to remove or cancel a task.",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Task title to find and delete" }
        },
        required: ["task_title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_week_schedule",
      description: "Get the user's tasks and schedule for the entire week. Use when asked about this week's plan.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_today_schedule",
      description: "Get the user's tasks and schedule for today. Use when asked about today's plan or what to study.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "create_flashcard_deck",
      description: "Create and save a new flashcard deck from the current topic. Use when user asks to save or create flashcards.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Deck title" },
          subject: { type: "string", description: "Subject area (e.g., Contract Law, Criminal Law)" },
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" }
              },
              required: ["question", "answer"]
            },
            description: "Array of flashcard objects with question and answer"
          }
        },
        required: ["title", "subject", "cards"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_quiz",
      description: "Create and save a practice quiz. Use when user asks to save a quiz for later practice.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Quiz title" },
          subject: { type: "string", description: "Subject area" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "number", description: "Index of correct option (0-based)" },
                explanation: { type: "string" }
              },
              required: ["question", "options", "correct_answer"]
            }
          }
        },
        required: ["title", "subject", "questions"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_journal_entry",
      description: "Create a reflective journal entry for the user. Use when they want to save thoughts or reflections.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The journal entry content" },
          mood: { type: "string", enum: ["great", "good", "okay", "struggling", "stressed"], description: "Current mood" }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_user_progress",
      description: "Get the user's study progress statistics. Use when asked about progress, stats, or achievements.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_classes",
      description: "Get the user's upcoming live classes. Use when asked about classes or schedule.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_files",
      description: "Get list of files the user has uploaded to their StudyLocker. Use when user wants to create study materials from their own uploaded files or notes.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["notes", "past_papers", "videos", "other"], description: "Filter by file category. Optional." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_course_materials",
      description: "Get study materials uploaded by tutors for courses the user is enrolled in. Use when user wants to create flashcards or quizzes from course materials or tutor-uploaded files.",
      parameters: {
        type: "object",
        properties: {
          course_name: { type: "string", description: "Filter by course name. Optional - if not provided, returns materials from all enrolled courses." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_file_content",
      description: "Fetch the text content from a specific file URL. Use after getting file list to read content for generating study materials.",
      parameters: {
        type: "object",
        properties: {
          file_url: { type: "string", description: "The URL of the file to fetch content from" },
          file_name: { type: "string", description: "The name of the file for context" }
        },
        required: ["file_url", "file_name"]
      }
    }
  }
];

// Tool execution functions
async function executeToolCall(supabase: any, userId: string, toolName: string, args: any): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    switch (toolName) {
      case "add_study_task": {
        const { data, error } = await supabase
          .from('study_tasks')
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description || null,
            scheduled_date: args.scheduled_date || today,
            scheduled_time: args.scheduled_time || null,
            duration_minutes: args.duration_minutes || 30,
            task_type: args.task_type || 'study',
            completed: false
          })
          .select()
          .single();
        
        if (error) throw error;
        return { success: true, message: `Task "${args.title}" added to your planner for ${args.scheduled_date || 'today'}!`, task: data };
      }
      
      case "complete_task": {
        let taskId = args.task_id;
        
        // If no ID, try to find by title
        if (!taskId && args.task_title) {
          const { data: tasks } = await supabase
            .from('study_tasks')
            .select('id, title')
            .eq('user_id', userId)
            .eq('completed', false)
            .ilike('title', `%${args.task_title}%`)
            .limit(1);
          
          if (tasks && tasks.length > 0) {
            taskId = tasks[0].id;
          }
        }
        
        if (!taskId) {
          return { success: false, message: "I couldn't find that task. Could you be more specific about which task to complete?" };
        }
        
        const { error } = await supabase
          .from('study_tasks')
          .update({ completed: true })
          .eq('id', taskId)
          .eq('user_id', userId);
        
        if (error) throw error;
        
        // Increment tasks_completed in profile
        await supabase.rpc('increment_counter', { row_id: userId, column_name: 'tasks_completed' }).catch(() => {});
        
        return { success: true, message: "Great job! I've marked that task as complete. Keep up the momentum!" };
      }
      
      case "update_task": {
        // Find the task by title
        const { data: tasks } = await supabase
          .from('study_tasks')
          .select('id, title')
          .eq('user_id', userId)
          .ilike('title', `%${args.task_title}%`)
          .limit(1);
        
        if (!tasks || tasks.length === 0) {
          return { success: false, message: `I couldn't find a task matching "${args.task_title}". Could you be more specific?` };
        }
        
        const taskId = tasks[0].id;
        const updates: any = {};
        
        if (args.new_title) updates.title = args.new_title;
        if (args.new_date) updates.scheduled_date = args.new_date;
        if (args.new_time) updates.scheduled_time = args.new_time;
        if (args.new_description) updates.description = args.new_description;
        if (args.new_duration) updates.duration_minutes = args.new_duration;
        
        if (Object.keys(updates).length === 0) {
          return { success: false, message: "No updates specified. What would you like to change about this task?" };
        }
        
        const { error } = await supabase
          .from('study_tasks')
          .update(updates)
          .eq('id', taskId)
          .eq('user_id', userId);
        
        if (error) throw error;
        
        const changesList = [];
        if (args.new_title) changesList.push(`renamed to "${args.new_title}"`);
        if (args.new_date) changesList.push(`rescheduled to ${args.new_date}`);
        if (args.new_time) changesList.push(`time changed to ${args.new_time}`);
        if (args.new_description) changesList.push("description updated");
        if (args.new_duration) changesList.push(`duration set to ${args.new_duration} minutes`);
        
        return { success: true, message: `Done! Task "${tasks[0].title}" has been ${changesList.join(', ')}.` };
      }
      
      case "delete_task": {
        // Find the task by title
        const { data: tasks } = await supabase
          .from('study_tasks')
          .select('id, title')
          .eq('user_id', userId)
          .ilike('title', `%${args.task_title}%`)
          .limit(1);
        
        if (!tasks || tasks.length === 0) {
          return { success: false, message: `I couldn't find a task matching "${args.task_title}". Could you be more specific?` };
        }
        
        const { error } = await supabase
          .from('study_tasks')
          .delete()
          .eq('id', tasks[0].id)
          .eq('user_id', userId);
        
        if (error) throw error;
        
        return { success: true, message: `Task "${tasks[0].title}" has been removed from your planner.` };
      }
      
      case "get_week_schedule": {
        const startOfWeek = new Date();
        const endOfWeek = new Date();
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        
        const { data: tasks } = await supabase
          .from('study_tasks')
          .select('*')
          .eq('user_id', userId)
          .gte('scheduled_date', startOfWeek.toISOString().split('T')[0])
          .lte('scheduled_date', endOfWeek.toISOString().split('T')[0])
          .order('scheduled_date', { ascending: true })
          .order('scheduled_time', { ascending: true });
        
        const { data: classes } = await supabase
          .from('live_classes')
          .select('id, title, scheduled_at, course_id')
          .gte('scheduled_at', startOfWeek.toISOString())
          .lte('scheduled_at', endOfWeek.toISOString())
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true });
        
        // Group tasks by date
        const tasksByDate: Record<string, any[]> = {};
        (tasks || []).forEach((t: any) => {
          const date = t.scheduled_date;
          if (!tasksByDate[date]) tasksByDate[date] = [];
          tasksByDate[date].push(t);
        });
        
        return {
          success: true,
          tasksByDate,
          classes: classes || [],
          totalTasks: tasks?.length || 0,
          totalClasses: classes?.length || 0,
          summary: `This week you have ${tasks?.length || 0} tasks and ${classes?.length || 0} classes scheduled.`
        };
      }
      
      case "get_today_schedule": {
        const { data: tasks } = await supabase
          .from('study_tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('scheduled_date', today)
          .order('scheduled_time', { ascending: true });
        
        const { data: classes } = await supabase
          .from('live_classes')
          .select('id, title, scheduled_at, course_id')
          .gte('scheduled_at', `${today}T00:00:00`)
          .lte('scheduled_at', `${today}T23:59:59`)
          .eq('status', 'scheduled');
        
        return {
          success: true,
          tasks: tasks || [],
          classes: classes || [],
          summary: `You have ${tasks?.length || 0} tasks and ${classes?.length || 0} classes scheduled for today.`
        };
      }
      
      case "create_flashcard_deck": {
        // Transform cards from question/answer to front/back format expected by FlashcardsPage
        const transformedCards = args.cards.map((card: any, index: number) => ({
          id: index + 1,
          front: card.question,
          back: card.answer,
          hint: card.hint || undefined
        }));
        
        const { data, error } = await supabase
          .from('flashcard_decks')
          .insert({
            user_id: userId,
            title: args.title,
            subject: args.subject,
            cards: transformedCards,
            next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return { 
          success: true, 
          message: `✅ Created flashcard deck **"${args.title}"** with ${args.cards.length} cards!\n\n👉 **[Start Studying Now →](/flashcards/${data.id})**\n\nYou can also find it anytime in your Flashcards section.`, 
          deck_id: data.id,
          link: `/flashcards/${data.id}`
        };
      }
      
      case "create_quiz": {
        // Transform questions to use camelCase format expected by QuizPage
        const transformedQuestions = args.questions.map((q: any, index: number) => ({
          id: index + 1,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation || ""
        }));
        
        const { data, error } = await supabase
          .from('quizzes')
          .insert({
            user_id: userId,
            title: args.title,
            subject: args.subject,
            questions: transformedQuestions,
            total_questions: transformedQuestions.length
          })
          .select()
          .single();
        
        if (error) throw error;
        return { 
          success: true, 
          message: `✅ Created quiz **"${args.title}"** with ${args.questions.length} questions!\n\n👉 **[Take Quiz Now →](/quiz/${data.id})**\n\nYou can also find it anytime in your Quiz section.`, 
          quiz_id: data.id,
          link: `/quiz/${data.id}`
        };
      }
      
      case "create_journal_entry": {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: userId,
            content: args.content,
            mood: args.mood || null,
            is_private: true
          })
          .select()
          .single();
        
        if (error) throw error;
        return { success: true, message: "I've saved that reflection to your journal. Taking time to reflect is a powerful study habit!" };
      }
      
      case "get_user_progress": {
        const { data: profile } = await supabase
          .from('profiles')
          .select('streak_days, total_study_hours, tasks_completed, cases_read')
          .eq('user_id', userId)
          .single();
        
        const { count: flashcardCount } = await supabase
          .from('flashcard_decks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        const { count: quizCount } = await supabase
          .from('quizzes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        return {
          success: true,
          stats: {
            streak_days: profile?.streak_days || 0,
            study_hours: profile?.total_study_hours || 0,
            tasks_completed: profile?.tasks_completed || 0,
            cases_read: profile?.cases_read || 0,
            flashcard_decks: flashcardCount || 0,
            quizzes_taken: quizCount || 0
          }
        };
      }
      
      case "get_upcoming_classes": {
        const now = new Date().toISOString();
        const { data: classes } = await supabase
          .from('live_classes')
          .select(`
            id, title, description, scheduled_at, status,
            academy_courses(name)
          `)
          .gte('scheduled_at', now)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true })
          .limit(5);
        
        return {
          success: true,
          classes: classes || [],
          summary: classes?.length ? `You have ${classes.length} upcoming classes.` : "No upcoming classes scheduled."
        };
      }
      
      case "get_my_files": {
        let query = supabase
          .from('user_files')
          .select('id, file_name, file_url, file_type, category, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (args.category) {
          query = query.eq('category', args.category);
        }
        
        const { data: files, error } = await query;
        
        if (error) throw error;
        
        if (!files || files.length === 0) {
          return {
            success: true,
            files: [],
            message: "You haven't uploaded any files to your StudyLocker yet. Upload notes, past papers, or other study materials to generate flashcards and quizzes from them!"
          };
        }
        
        return {
          success: true,
          files: files.map((f: any) => ({
            id: f.id,
            name: f.file_name,
            url: f.file_url,
            type: f.file_type,
            category: f.category
          })),
          message: `Found ${files.length} file(s) in your StudyLocker. You can ask me to create flashcards or a quiz from any of these.`
        };
      }
      
      case "get_course_materials": {
        // First get user's enrolled courses
        const { data: enrollments } = await supabase
          .from('academy_enrollments')
          .select('course_id, academy_courses(id, name)')
          .eq('user_id', userId)
          .eq('status', 'active');
        
        if (!enrollments || enrollments.length === 0) {
          return {
            success: true,
            materials: [],
            message: "You're not enrolled in any courses yet. Enroll in a course to access tutor-uploaded materials."
          };
        }
        
        const courseIds = enrollments.map((e: any) => e.course_id);
        const courseNames = enrollments.map((e: any) => e.academy_courses?.name || 'Unknown');
        
        // Filter by course name if provided
        let filteredCourseIds = courseIds;
        if (args.course_name) {
          const matchingEnrollment = enrollments.find((e: any) => 
            e.academy_courses?.name?.toLowerCase().includes(args.course_name.toLowerCase())
          );
          if (matchingEnrollment) {
            filteredCourseIds = [matchingEnrollment.course_id];
          }
        }
        
        // Get course materials
        const { data: materials, error } = await supabase
          .from('course_materials')
          .select('id, title, file_url, file_type, description, course_id, academy_courses(name)')
          .in('course_id', filteredCourseIds)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        
        if (!materials || materials.length === 0) {
          return {
            success: true,
            materials: [],
            message: args.course_name 
              ? `No materials found for "${args.course_name}". The tutor may not have uploaded any yet.`
              : "No course materials available yet. Your tutors will upload materials as the course progresses."
          };
        }
        
        return {
          success: true,
          materials: materials.map((m: any) => ({
            id: m.id,
            title: m.title,
            url: m.file_url,
            type: m.file_type,
            description: m.description,
            course: m.academy_courses?.name
          })),
          enrolled_courses: courseNames,
          message: `Found ${materials.length} course material(s). You can ask me to create flashcards or a quiz from any of these.`
        };
      }
      
      case "get_file_content": {
        try {
          const fileUrl = args.file_url;
          const fileName = args.file_name;
          
          console.log(`Fetching content from: ${fileName} - ${fileUrl}`);
          
          // Check file type
          const isTextFile = /\.(txt|md|json|csv)$/i.test(fileName);
          const isPdf = /\.pdf$/i.test(fileName);
          
          if (!isTextFile && !isPdf) {
            return {
              success: false,
              message: `Cannot extract text from ${fileName}. I can read text files (.txt, .md) and PDFs. For other file types, please describe the content you want me to use.`
            };
          }
          
          // Fetch the file content
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`);
          }
          
          if (isTextFile) {
            // For text files, just read as text
            const textContent = await response.text();
            console.log(`Extracted ${textContent.length} chars from text file`);
            return {
              success: true,
              content: textContent.slice(0, 50000), // Limit to 50k chars
              message: `Successfully extracted content from "${fileName}". Here's the content to use for generating study materials.`
            };
          }
          
          if (isPdf) {
            // For PDFs, use the improved extraction
            try {
              const arrayBuffer = await response.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              
              console.log(`Loading PDF document, size: ${bytes.length} bytes`);
              
              // Decode to text for parsing
              const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
              
              // Enhanced PDF text extraction
              const extractedParts: string[] = [];
              
              // Method 1: Extract from stream objects using Tj/TJ operators
              const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi;
              let match;
              while ((match = streamRegex.exec(pdfText)) !== null) {
                const streamContent = match[1];
                
                // Extract Tj text
                const tjMatches = streamContent.match(/\(([^)]+)\)\s*Tj/g);
                if (tjMatches) {
                  tjMatches.forEach(m => {
                    const text = m.replace(/\(([^)]+)\)\s*Tj/, '$1')
                      .replace(/\\n/g, '\n')
                      .replace(/\\r/g, '')
                      .replace(/\\t/g, ' ');
                    if (text.length > 1 && /[a-zA-Z]/.test(text)) {
                      extractedParts.push(text);
                    }
                  });
                }
                
                // Extract TJ array text
                const tjArrayMatches = streamContent.match(/\[([^\]]+)\]\s*TJ/gi);
                if (tjArrayMatches) {
                  tjArrayMatches.forEach(m => {
                    const innerText = m.match(/\(([^)]*)\)/g);
                    if (innerText) {
                      const combined = innerText
                        .map(t => t.replace(/[()]/g, ''))
                        .filter(t => t.length > 0)
                        .join('');
                      if (combined.length > 1 && /[a-zA-Z]/.test(combined)) {
                        extractedParts.push(combined);
                      }
                    }
                  });
                }
              }
              
              // Method 2: Look for readable text patterns
              const readableMatches = pdfText.match(/[\x20-\x7E]{15,}/g) || [];
              const filteredReadable = readableMatches.filter(t => 
                /[a-zA-Z]{4,}/.test(t) && // Has meaningful words
                !/^[0-9\s.]+$/.test(t) && // Not just numbers
                !t.includes('PDF-') &&
                !t.includes('obj') &&
                !t.includes('endobj') &&
                !t.includes('/Type') &&
                !t.includes('/Font') &&
                !t.includes('stream') &&
                !t.includes('xref') &&
                t.split(/\s+/).length >= 3 // At least 3 words
              );
              extractedParts.push(...filteredReadable);
              
              // Combine and clean
              let fullText = extractedParts.join(' ')
                .replace(/\s+/g, ' ')
                .replace(/([.!?])\s*/g, '$1\n')
                .trim();
              
              console.log(`Extracted ${fullText.length} chars from PDF`);
              
              if (fullText.length < 100) {
                return {
                  success: false,
                  message: `The PDF "${fileName}" appears to be image-based or scanned. I couldn't extract readable text. Please copy and paste the key content manually, or describe the topics covered.`
                };
              }
              
              return {
                success: true,
                content: fullText.slice(0, 50000), // Limit to 50k chars
                message: `Successfully extracted content from "${fileName}". Ready to generate study materials from this content.`
              };
            } catch (pdfError) {
              console.error("PDF parsing error:", pdfError);
              return {
                success: false,
                message: `Could not extract text from "${fileName}". The PDF may be image-based or encrypted. Please copy and paste the key content you want me to use.`
              };
            }
          }
          
          return {
            success: false,
            message: `Unsupported file type for "${fileName}".`
          };
        } catch (error) {
          console.error("Error fetching file content:", error);
          return {
            success: false,
            message: `Could not access "${args.file_name}". Please try sharing the key topics or content manually.`
          };
        }
      }
      
      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { success: false, message: `Failed to execute ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Helper to get comprehensive user context
async function getUserContext(supabase: any, userId: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  try {
    // Fetch all user data in parallel
    const [profileRes, tasksRes, classesRes, filesRes, enrollmentsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('study_tasks').select('*').eq('user_id', userId).eq('scheduled_date', today).order('scheduled_time'),
      supabase.from('live_classes').select('id, title, scheduled_at, status, academy_courses(name)')
        .gte('scheduled_at', now).eq('status', 'scheduled').order('scheduled_at').limit(3),
      supabase.from('user_files').select('file_name, category').eq('user_id', userId).limit(10),
      supabase.from('academy_enrollments').select('course_id, academy_courses(name)').eq('user_id', userId).eq('status', 'active')
    ]);
    
    const profile = profileRes.data;
    const tasks = tasksRes.data || [];
    const classes = classesRes.data || [];
    const files = filesRes.data || [];
    const enrollments = enrollmentsRes.data || [];
    
    let context = "\n\n## 🎯 CURRENT USER CONTEXT (Use this to personalize responses)\n\n";
    
    // Profile info with school context
    const userSchool = profile?.school || 'law';
    
    // School configuration for dynamic personality
    const schoolConfigs: Record<string, {
      name: string;
      role: string;
      tone: string[];
      contextPreference: string[];
      statsLabel: string;
    }> = {
      law: {
        name: 'LMV Law',
        role: 'Premium legal study mentor & case-law guide',
        tone: ['analytical', 'ethical', 'professional', 'supportive'],
        contextPreference: ['case law', 'statutes', 'legal reasoning', 'exam prep support (not writing assignments)'],
        statsLabel: 'Cases Read',
      },
      business: {
        name: 'LMV Business',
        role: 'Business learning coach — practical, strategy-focused, entrepreneurial-minded',
        tone: ['commercially aware', 'growth oriented', 'structured', 'motivational', 'professional'],
        contextPreference: ['economics', 'accounting', 'management', 'entrepreneurship', 'case-based analysis'],
        statsLabel: 'Reports Reviewed',
      },
      health: {
        name: 'LMV Health',
        role: 'Health sciences study mentor — clinically aware & evidence-based',
        tone: ['calm', 'precise', 'safety-oriented', 'supportive', 'empathetic'],
        contextPreference: ['anatomy', 'physiology', 'nursing', 'public health', 'ethical patient-first language'],
        statsLabel: 'Cases Studied',
      },
    };
    
    const schoolConfig = schoolConfigs[userSchool] || schoolConfigs.law;
    
    if (profile) {
      context += `### Student Profile\n`;
      context += `- Name: ${profile.full_name || 'Student'}\n`;
      context += `- School: ${schoolConfig.name}\n`;
      context += `- Institution: ${profile.university || 'Not set'}\n`;
      context += `- Year of Study: ${profile.year_of_study || 'Not set'}\n`;
      context += `- Study Streak: ${profile.streak_days || 0} days 🔥\n`;
      context += `- Total Study Hours: ${profile.total_study_hours || 0}\n`;
      context += `- Tasks Completed: ${profile.tasks_completed || 0}\n`;
      context += `- ${schoolConfig.statsLabel}: ${profile.cases_read || 0}\n`;
      context += `\n`;
      
      // Add discipline-specific guidance based on school
      context += `### DISCIPLINE CONTEXT: ${userSchool.toUpperCase()}\n`;
      context += `**Your Role:** ${schoolConfig.role}\n`;
      context += `**Tone:** Be ${schoolConfig.tone.join(', ')}\n`;
      context += `**Context Preference:** Focus on ${schoolConfig.contextPreference.join(', ')}\n\n`;
      
      if (userSchool === 'law') {
        context += `Adapt your responses to:\n`;
        context += `- Focus on legal reasoning and case analysis\n`;
        context += `- Use legal terminology and IRAC methodology\n`;
        context += `- Reference statutes, cases, and legal principles\n`;
        context += `- Cite cases using proper legal citation format when available\n`;
        context += `- Emphasize precision, structured argumentation, and professional ethics\n\n`;
      } else if (userSchool === 'business') {
        context += `Adapt your responses to:\n`;
        context += `- Focus on practical business application and analytical thinking\n`;
        context += `- Use business terminology (reports, analysis, frameworks)\n`;
        context += `- Reference business concepts, financial principles, and management strategies\n`;
        context += `- Apply frameworks like SWOT, Porter's Five Forces, PESTLE when relevant\n`;
        context += `- Emphasize data-driven decision making and ethical business practices\n\n`;
      } else if (userSchool === 'health') {
        context += `Adapt your responses to:\n`;
        context += `- Focus on clinical reasoning, evidence-based practice, and patient care\n`;
        context += `- Use medical terminology precisely while ensuring accessibility\n`;
        context += `- Reference anatomy, physiology, and clinical guidelines\n`;
        context += `- Always prioritize patient safety and ethical considerations\n`;
        context += `- Use empathetic, calm, and supportive language\n\n`;
      }
    }
    
    // Today's tasks
    context += `### Today's Schedule (${today})\n`;
    if (tasks.length > 0) {
      const pending = tasks.filter((t: any) => !t.completed);
      const completed = tasks.filter((t: any) => t.completed);
      context += `- Pending tasks: ${pending.length}\n`;
      context += `- Completed tasks: ${completed.length}\n`;
      pending.forEach((t: any) => {
        context += `  • ${t.title}${t.scheduled_time ? ` at ${t.scheduled_time}` : ''} (${t.task_type})\n`;
      });
    } else {
      context += "- No tasks scheduled for today\n";
    }
    context += "\n";
    
    // Upcoming classes
    context += `### Upcoming Classes\n`;
    if (classes.length > 0) {
      classes.forEach((c: any) => {
        const date = new Date(c.scheduled_at).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        context += `- ${c.title} (${date})\n`;
      });
    } else {
      context += "- No upcoming classes\n";
    }
    context += "\n";
    
    // Enrolled courses
    if (enrollments.length > 0) {
      context += `### Enrolled Courses\n`;
      enrollments.forEach((e: any) => {
        context += `- ${e.academy_courses?.name || 'Unknown course'}\n`;
      });
      context += "\n";
    }
    
    // StudyLocker files
    if (files.length > 0) {
      context += `### StudyLocker Files\n`;
      files.forEach((f: any) => {
        context += `- ${f.file_name} (${f.category || 'other'})\n`;
      });
      context += "\n";
    }
    
    context += `### Available Actions\n`;
    context += `You can execute these actions for the user:\n`;
    context += `- Add study tasks to their planner\n`;
    context += `- Update existing tasks (reschedule, rename, change details)\n`;
    context += `- Delete/remove tasks from their planner\n`;
    context += `- Mark tasks as completed\n`;
    context += `- Get today's schedule or this week's schedule\n`;
    context += `- Create and save flashcard decks\n`;
    context += `- Create and save practice quizzes\n`;
    context += `- Create journal entries\n`;
    context += `- Show their progress and statistics\n`;
    context += `- Show upcoming classes\n\n`;
    context += `When the user asks to do any of these, USE THE APPROPRIATE TOOL to actually perform the action.\n`;
    context += `IMPORTANT: If a user says things like "add X to my schedule", "reschedule Y", "remove Z from my tasks", "what's on my plate today" - USE TOOLS!\n`;
    
    return context;
  } catch (error) {
    console.error("Error fetching user context:", error);
    return "";
  }
}

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

    // Get comprehensive user context
    const userContext = await getUserContext(supabase, authenticatedUserId);

    // Get the last user message for analysis - handle both string and multimodal content
    const lastUserMessageObj = messages.filter((m: any) => m.role === 'user').pop();
    let lastUserMessage = "";
    let hasPdfContent = false;
    let extractedPdfText = "";
    
    if (lastUserMessageObj) {
      if (typeof lastUserMessageObj.content === 'string') {
        lastUserMessage = lastUserMessageObj.content;
      } else if (Array.isArray(lastUserMessageObj.content)) {
        // Extract text from multimodal content and process PDFs
        const processed = await processMessageContent(lastUserMessageObj.content);
        lastUserMessage = processed.textContent;
        
        // Check if we extracted PDF content
        if (lastUserMessage.includes('[Extracted PDF Content]')) {
          hasPdfContent = true;
          const pdfMatch = lastUserMessage.match(/\[Extracted PDF Content\]:\n([\s\S]*?)\n\n/);
          if (pdfMatch) {
            extractedPdfText = pdfMatch[1];
          }
        }
      }
    }
    
    console.log("Last user message length:", lastUserMessage.length, "| Has PDF:", hasPdfContent);
    
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

    // Build dynamic sections for the prompt
    let researchSection = '';
    if (researchContext) {
      researchSection = '\n## ✅ VERIFIED RESEARCH RESULTS\n**The following information comes from authoritative sources. You MAY cite this with confidence:**\n\n' + researchContext;
      if (researchSources) {
        researchSection += '\n\n### Verified Sources:\n' + researchSources;
      }
    } else {
      researchSection = '\n## ⚠️ NO VERIFIED RESEARCH AVAILABLE\nNo external research was performed for this query. You MUST:\n- Base your response on general principles ONLY\n- NOT cite specific case names or citations unless from verified research\n- Provide search links for the student to find authoritative sources themselves\n- Clearly indicate when information should be verified';
    }

    // Get user's school for personalization
    const userSchoolFromContext = userContext.includes('School: LMV Law') ? 'law' : 
                                   userContext.includes('School: LMV Business') ? 'business' : 
                                   userContext.includes('School: LMV Health') ? 'health' : 'law';

    // Condensed prompt for simple queries (faster processing)
    const buildSimplePrompt = () => {
      let prompt = 'You are Lumina, an AI study companion at LMV Academy. ';
      prompt += 'Be professional, encouraging, and helpful. ';
      if (userSchoolFromContext === 'law') {
        prompt += 'Focus on legal reasoning and case law. ';
      } else if (userSchoolFromContext === 'business') {
        prompt += 'Focus on business concepts and practical applications. ';
      } else if (userSchoolFromContext === 'health') {
        prompt += 'Focus on clinical reasoning and evidence-based practice. ';
      }
      prompt += 'Use Markdown for formatting. Be concise but thorough. ';
      prompt += 'DO NOT write assignments or provide professional advice. ';
      prompt += 'Cite sources when available.';
      return prompt;
    };

    // Build full system prompt for complex queries
    let systemPrompt = 'You are Lumina, an elite AI study companion for students at Luminary Innovision Academy (LMV). ';
    systemPrompt += 'LMV has three schools: Law, Business, and Health Sciences. ';
    systemPrompt += 'Your persona adapts to each discipline while maintaining core qualities: professional, encouraging, and highly knowledgeable.\n\n';
    
    systemPrompt += '## DISCIPLINE-ADAPTIVE PERSONALITY\n\n';
    systemPrompt += '### LMV Law Students\n';
    systemPrompt += '**Role:** Premium legal study mentor & case-law guide\n';
    systemPrompt += '**Tone:** Analytical, ethical, professional, supportive\n';
    systemPrompt += '**Focus:** Case law, statutes, legal reasoning, exam prep support\n\n';
    
    systemPrompt += '### LMV Business Students\n';
    systemPrompt += '**Role:** Business learning coach — practical, strategy-focused, entrepreneurial-minded\n';
    systemPrompt += '**Tone:** Commercially aware, growth oriented, structured, motivational, professional\n';
    systemPrompt += '**Focus:** Economics, accounting, management, entrepreneurship, case-based business analysis\n\n';
    
    systemPrompt += '### LMV Health Students\n';
    systemPrompt += '**Role:** Health sciences study mentor — clinically aware & evidence-based\n';
    systemPrompt += '**Tone:** Calm, precise, safety-oriented, supportive, empathetic\n';
    systemPrompt += '**Focus:** Anatomy, physiology, nursing, public health, ethical patient-first language\n\n';
    
    systemPrompt += '## CORE DIRECTIVES\n\n';
    systemPrompt += '### 1. Primary Goal: Be Genuinely Helpful\n';
    systemPrompt += 'Your fundamental purpose is to help students learn efficiently. When they ask questions, provide substantive answers with sources. When they need information, find it and share it.\n\n';
    systemPrompt += '### 2. Tone & Persona\n';
    systemPrompt += '- **Professional & Knowledgeable:** Your language is clear, articulate, and authoritative.\n';
    systemPrompt += '- **Supportive & Encouraging:** You are a partner in the student\'s learning journey.\n';
    systemPrompt += '- **Helpful & Efficient:** You help students save time by providing direct, useful information.\n';
    systemPrompt += '- **Discipline-Aware:** Adapt your tone and terminology to match the student\'s school.\n\n';
    systemPrompt += '### 3. Response Formatting\n';
    systemPrompt += 'Use Markdown effectively: Bold for key terms, Italics for emphasis, Headings for hierarchy, and lists to break down information.\n\n';
    
    systemPrompt += '## WHAT YOU SHOULD DO\n\n';
    systemPrompt += '### Actively Help Students By:\n';
    systemPrompt += '- **Answering Academic Questions:** Provide substantive answers with proper citations and sources.\n';
    systemPrompt += '- **Providing Information:** Share relevant facts, principles, and authoritative sources.\n';
    systemPrompt += '- **Synthesizing Information:** Combine search results and knowledge to give comprehensive answers.\n';
    systemPrompt += '- **Creating Study Materials:** Generate flashcards, quizzes, and summaries.\n';
    systemPrompt += '- **Explaining Concepts:** Provide detailed, clear explanations tailored to the discipline.\n\n';
    
    systemPrompt += '## ETHICAL BOUNDARIES (CRITICAL - All Disciplines)\n\n';
    systemPrompt += '### Prohibited Actions:\n';
    systemPrompt += '- DO NOT write complete assignments, essays, or coursework for grading.\n';
    systemPrompt += '- DO NOT provide answers to active exam questions.\n';
    systemPrompt += '- DO NOT facilitate clear academic misconduct or plagiarism.\n';
    systemPrompt += '- DO NOT provide prohibited professional advice (legal advice, medical diagnosis, financial advice).\n';
    systemPrompt += '- DO NOT compromise patient safety, legal integrity, or ethical business practices.\n\n';
    systemPrompt += '### Always Prioritize:\n';
    systemPrompt += '- Academic integrity and honest learning\n';
    systemPrompt += '- Safety and ethical considerations\n';
    systemPrompt += '- Guiding students to learn, not circumvent the learning process\n\n';
    systemPrompt += '### Note: These are PERMITTED and encouraged:\n';
    systemPrompt += '- ✅ Answering questions about academic topics with sources\n';
    systemPrompt += '- ✅ Providing citations, principles, and authoritative information\n';
    systemPrompt += '- ✅ Helping with research and finding information\n';
    systemPrompt += '- ✅ Explaining concepts in detail\n';
    systemPrompt += '- ✅ Creating study materials (flashcards, quizzes, summaries)\n\n';
    
    systemPrompt += '## SOURCE ATTRIBUTION (CRITICAL)\n\n';
    systemPrompt += 'When providing information:\n';
    systemPrompt += '1. **Always cite sources** - Include links or references where information came from\n';
    systemPrompt += '2. **Indicate confidence** - Note whether info is from verified search or general knowledge\n';
    systemPrompt += '3. **Provide verification links** - Give ZambiaLII search links when relevant\n';
    systemPrompt += '4. **Never fabricate** - Do not invent case names, citations, or holdings\n\n';
    systemPrompt += 'If uncertain about specifics, say so clearly and provide search links for verification.\n\n';
    
    systemPrompt += '## 🛠️ IN-APP TOOL CAPABILITIES\n\n';
    systemPrompt += 'You have access to tools that let you perform actions in the app. When the user asks you to do something (add a task, create flashcards, etc.), USE THE APPROPRIATE TOOL. Do not just describe what you would do - actually do it!\n\n';
    systemPrompt += '### Available Tools:\n';
    systemPrompt += '- **add_study_task**: Add tasks to the user\'s study planner\n';
    systemPrompt += '- **complete_task**: Mark a task as completed\n';
    systemPrompt += '- **get_today_schedule**: Show today\'s tasks and classes\n';
    systemPrompt += '- **create_flashcard_deck**: Create and save flashcards\n';
    systemPrompt += '- **create_quiz**: Create and save practice quizzes\n';
    systemPrompt += '- **create_journal_entry**: Save a reflective journal entry\n';
    systemPrompt += '- **get_user_progress**: Show study statistics and achievements\n';
    systemPrompt += '- **get_upcoming_classes**: Show upcoming live classes\n';
    systemPrompt += '- **get_my_files**: Access user\'s StudyLocker files\n';
    systemPrompt += '- **get_course_materials**: Access tutor-uploaded course materials\n';
    systemPrompt += '- **get_file_content**: Read content from uploaded files\n\n';
    systemPrompt += 'When you use a tool, confirm what you did to the user.\n\n';
    
    systemPrompt += researchSection + '\n\n';
    systemPrompt += userContext;
    systemPrompt += '\n**IMPORTANT**: Be helpful! When students ask questions, provide substantive answers with sources. It\'s better to give information with proper attribution than to be overly cautious and unhelpful.';

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
Generate 5-10 flashcards and SAVE THEM using the create_flashcard_deck tool.

Format each card as:
**Q:** [Clear, specific question]
**A:** [Concise but complete answer]

Focus on key principles, definitions, elements of offences/torts, and important case ratios.
After generating, USE THE TOOL to save them so the user can review later.`;
    } else if (action === 'quiz') {
      systemPrompt += `

## Current Task: Practice Quiz
Create a quiz with 5 multiple choice questions and SAVE IT using the create_quiz tool.
Each question should have 4 options and a clear correct answer with explanation.
USE THE TOOL to save the quiz so the user can take it later.`;
    } else if (action === 'zambialii') {
      systemPrompt += `

## Current Task: Legal Research & Case Finding
The student is looking for legal information or cases. Your role is to:

1. **Provide direct answers** if you have reliable information from web search results
2. **Share case names and citations** when you have verified information
3. **Explain the legal principles** involved in the topic
4. **Provide ZambiaLII search links** for further research:
   - https://zambialii.org/zm/judgment?search_api_fulltext=[url-encoded search terms]

**APPROACH:**
- ✅ If research results contain case information, share it with proper citations
- ✅ Explain what the leading cases establish
- ✅ Provide specific search links for verification
- ✅ Share well-known landmark cases you're confident about
- ✅ Always include sources for any case information

**CAUTION:**
- ⚠️ If no verified information is available, clearly state this
- ⚠️ Distinguish between verified search results and general knowledge
- ⚠️ Provide verification links so students can confirm information`;
    } else if (action === 'journal') {
      systemPrompt += `

## Current Task: Journal Response
The student is sharing their thoughts or feelings. Respond with empathy and validation.
If they want to save their reflection, USE THE create_journal_entry tool to save it.`;
    }

    // Determine model based on query complexity - prioritize speed
    // Use faster gemini-3-flash-preview for most queries (best speed/quality balance)
    // Only use heavier model for research synthesis and complex document analysis
    const isHeavyTask = (needsResearch && researchContext) || (hasPdfContent && extractedPdfText.length > 5000);
    const model = isHeavyTask ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";
    
    console.log("Sending request to AI Gateway with action:", action || "general chat", "| Research mode:", needsResearch, "| Has images:", hasImages, "| Model:", model, "| Tools enabled: true");
    
    // Add image/document analysis context if attachments are present
    let attachmentAnalysisPrompt = "";
    if (hasImages || hasPdfContent) {
      attachmentAnalysisPrompt = `

## DOCUMENT & IMAGE ANALYSIS MODE
The user has shared one or more files (images or documents). You should:
1. **Carefully analyze** the visual content of each image
2. **Extract and read text** from documents, PDFs, notes, or screenshots
3. **Describe** what you see in detail if asked
4. **Provide relevant study guidance** based on the content
5. **Answer questions** about the content accurately
6. **For legal documents**: Identify case names, citations, legal principles, and key holdings
7. **For notes/handwritten content**: Transcribe and help organize the content
8. **For diagrams/charts**: Explain what they represent

If the content is legal in nature, apply your legal expertise to help the student understand it.`;
    }
    
    // If we have extracted PDF text, add it to the context
    if (hasPdfContent && extractedPdfText) {
      attachmentAnalysisPrompt += `

## EXTRACTED PDF DOCUMENT CONTENT
The following text was extracted from a PDF document the user uploaded:

---
${extractedPdfText.substring(0, 15000)}
${extractedPdfText.length > 15000 ? '\n\n[Document truncated - showing first 15000 characters]' : ''}
---

Please analyze this document content and help the student with their query about it.`;
    }

    // Check if this is likely a simple conversational query (no tools needed)
    const isSimpleQuery = !action && 
      !needsResearch && 
      !hasImages && 
      !hasPdfContent &&
      lastUserMessage.length < 200 &&
      !lastUserMessage.toLowerCase().includes('add') &&
      !lastUserMessage.toLowerCase().includes('schedule') &&
      !lastUserMessage.toLowerCase().includes('task') &&
      !lastUserMessage.toLowerCase().includes('flashcard') &&
      !lastUserMessage.toLowerCase().includes('quiz') &&
      !lastUserMessage.toLowerCase().includes('journal');

    // For simple queries, stream directly without tool handling for maximum speed
    if (isSimpleQuery) {
      const simplePrompt = buildSimplePrompt();
      console.log("Fast path: Simple query, streaming directly | Model:", model, "| Prompt length:", simplePrompt.length);
      
      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: simplePrompt },
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!streamResponse.ok) {
        const errorText = await streamResponse.text();
        console.error("AI gateway error:", streamResponse.status, errorText);
        
        if (streamResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (streamResponse.status === 402) {
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

      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // For complex queries with potential tool usage, use non-streaming first
    console.log("Tool path: Complex query | Model:", model, "| Action:", action || "general", "| Research:", needsResearch, "| Images:", hasImages);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt + attachmentAnalysisPrompt },
          ...messages,
        ],
        tools: LUMINA_TOOLS,
        tool_choice: "auto",
        stream: false,
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

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message;
    
    // Check if the AI wants to use tools
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("Tool calls detected:", assistantMessage.tool_calls.length);
      
      // Execute all tool calls
      const toolResults: any[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
        }
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        const result = await executeToolCall(supabase, authenticatedUserId, toolName, toolArgs);
        console.log(`Tool result:`, result);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
      }
      
      // Send tool results back to AI for final response
      const followUpMessages = [
        { role: "system", content: systemPrompt + attachmentAnalysisPrompt },
        ...messages,
        assistantMessage,
        ...toolResults
      ];
      
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: followUpMessages,
          stream: true, // Stream the final response
        }),
      });
      
      if (!followUpResponse.ok) {
        console.error("Follow-up response error:", followUpResponse.status);
        // Return a simple response with tool results
        const toolSummary = toolResults.map(r => JSON.parse(r.content).message || "Action completed").join("\n");
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: toolSummary } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
        );
      }
      
      return new Response(followUpResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
    
    // No tool calls - stream the response normally
    // Since we already have the response (non-streaming), convert it to SSE format
    const content = assistantMessage?.content || "";
    
    // Create a streaming response from the non-streamed content
    // Use smaller chunks for smoother word-by-word streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send content word by word for smoother streaming
        const words = content.split(/(\s+)/);
        for (const word of words) {
          if (word) {
            const data = JSON.stringify({ choices: [{ delta: { content: word } }] });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });
    
    return new Response(stream, {
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
