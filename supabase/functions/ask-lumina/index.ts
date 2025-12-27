import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { query } = await req.json()

  if (query.includes('create task')) {
    const title = query.replace('create task', '').trim()
    // TODO: Initialize Supabase client
    // const { data, error } = await supabase.from('study_tasks').insert({ title, user_id: req.user.id })
    return new Response(
      JSON.stringify({
        message: `Created task: ${title}`
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } else if (query.includes('get tasks')) {
    // TODO: Initialize Supabase client
    // const { data, error } = await supabase.from('study_tasks').select('*').eq('user_id', req.user.id).eq('scheduled_date', new Date().toISOString().split('T')[0])
    return new Response(
      JSON.stringify({
        message: `Your tasks for today are: ...`
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } else if (query.includes('create journal entry')) {
    const content = query.replace('create journal entry', '').trim()
    // TODO: Initialize Supabase client
    // const { data, error } = await supabase.from('journal_entries').insert({ content, user_id: req.user.id })
    return new Response(
      JSON.stringify({
        message: `Created journal entry: ${content}`
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } else if (query.includes('get journal entries')) {
    // TODO: Initialize Supabase client
    // const { data, error } = await supabase.from('journal_entries').select('*').eq('user_id', req.user.id).eq('created_at', new Date().toISOString().split('T')[0])
    return new Response(
      JSON.stringify({
        message: `Your journal entries for today are: ...`
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } else if (query.includes('read pdf')) {
    // TODO: Implement PDF parsing logic
    return new Response(
      JSON.stringify({
        message: `I have read the PDF and I am ready to answer your questions.`
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } else {
    // Default to chat
  }

  return new Response(
    JSON.stringify({
      message: `You asked: ${query}`
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
