import React, { useState } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { ArrowLeft, Send, Lock, Unlock, Calendar, Smile, Meh, Frown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const JournalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [entry, setEntry] = useState('');
  const [selectedMood, setSelectedMood] = useState<'happy' | 'neutral' | 'sad' | null>(null);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const moods = [
    { id: 'happy' as const, icon: Smile, label: 'Good', color: 'text-success' },
    { id: 'neutral' as const, icon: Meh, label: 'Okay', color: 'text-warning' },
    { id: 'sad' as const, icon: Frown, label: 'Tough', color: 'text-destructive' },
  ];

  // Fetch journal entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-entries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!entry.trim() || !selectedMood || !user) return;
    if (!session) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to save a journal entry.",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Get AI response for the journal entry
      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journal-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: entry, mood: selectedMood }),
      });

      let luminaResponse = null;
      if (aiResponse.ok) {
        const data = await aiResponse.json();
        luminaResponse = data.response;
      }

      // Save to database
      const { error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          content: entry,
          mood: selectedMood,
          is_private: isPrivate,
          lumina_response: luminaResponse,
        });

      if (error) throw error;

      toast({
        title: "Journal Entry Saved",
        description: "Lumina has responded to your entry.",
      });

      // Reset form and refetch entries
      setEntry('');
      setSelectedMood(null);
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    } catch (error) {
      console.error('Journal error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your journal entry. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-5 py-4 safe-top border-b border-border bg-background">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground flex-1">Journal</h1>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                isPrivate ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}
            >
              {isPrivate ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6">
          {/* New Entry Card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-card mb-6 overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <LuminaAvatar size="sm" isActive />
                <div>
                  <p className="text-sm font-medium text-foreground">How are you feeling today?</p>
                  <p className="text-xs text-muted-foreground">Share your thoughts with Lumina</p>
                </div>
              </div>

              {/* Mood Selection */}
              <div className="flex justify-center gap-4 mb-4">
                {moods.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all",
                      selectedMood === mood.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
                    )}
                  >
                    <mood.icon className={cn("w-8 h-8", mood.color)} />
                    <span className="text-xs text-muted-foreground">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="Write about your day, your studies, your feelings..."
                className="w-full h-32 resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!entry.trim() || !selectedMood || isSubmitting}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    entry.trim() && selectedMood && !isSubmitting
                      ? "gradient-primary text-primary-foreground shadow-glow"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          {isPrivate && (
            <div className="bg-success/5 border border-success/20 rounded-xl p-3 mb-6 flex items-center gap-3">
              <Lock className="w-4 h-4 text-success" />
              <p className="text-xs text-success">Your entries are private and not shared with your accountability partner</p>
            </div>
          )}

          {/* Past Entries */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Past Entries</h2>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 bg-secondary rounded-2xl">
                <p className="text-muted-foreground">No journal entries yet. Start writing!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((pastEntry) => {
                  const MoodIcon = moods.find(m => m.id === pastEntry.mood)?.icon || Meh;
                  const moodColor = moods.find(m => m.id === pastEntry.mood)?.color || 'text-muted-foreground';
                  
                  return (
                    <div key={pastEntry.id} className="bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden">
                      {/* Entry */}
                      <div className="p-4 border-b border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(pastEntry.created_at).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <MoodIcon className={cn("w-5 h-5", moodColor)} />
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{pastEntry.content}</p>
                      </div>

                      {/* Lumina's Response */}
                      {pastEntry.lumina_response && (
                        <div className="p-4 bg-primary/5">
                          <div className="flex items-start gap-3">
                            <LuminaAvatar size="sm" />
                            <div className="flex-1">
                              <p className="text-xs text-primary font-medium mb-1">Lumina's Response</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{pastEntry.lumina_response}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default JournalPage;