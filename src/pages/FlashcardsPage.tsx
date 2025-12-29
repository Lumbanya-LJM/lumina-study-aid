import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { 
  ArrowLeft, 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle,
  Pencil,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLuminaTaskNotification } from '@/hooks/useLuminaTaskNotification';
import { EditFlashcardDeckModal } from '@/components/flashcards/EditFlashcardDeckModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Card {
  id: number;
  front: string;
  back: string;
  hint?: string;
}

interface Deck {
  id: string;
  title: string;
  subject: string;
  cards: Card[];
  mastered_count: number;
  last_reviewed_at?: string;
  next_review_at?: string;
}

const FlashcardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { deckId } = useParams();
  const { toast } = useToast();
  const { notifyFlashcardsReady } = useLuminaTaskNotification();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [recentDecks, setRecentDecks] = useState<Deck[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (deckId) {
      loadDeck(deckId);
    } else {
      loadRecentDecks();
    }
  }, [deckId]);

  const loadDeck = async (id: string) => {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error loading deck:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load flashcards" });
      return;
    }

    if (!data) {
      toast({ variant: "destructive", title: "Error", description: "Flashcard deck not found" });
      navigate('/flashcards');
      return;
    }

    setDeck({
      ...data,
      cards: data.cards as unknown as Card[]
    });
  };

  const loadRecentDecks = async () => {
    const { data } = await supabase
      .from('flashcard_decks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setRecentDecks(data.map(d => ({
        ...d,
        cards: d.cards as unknown as Card[]
      })));
    }
  };

  const generateFlashcards = async () => {
    if (!topic.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a topic" });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic, numCards: 10 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate flashcards');
      }

      const deckData = await response.json();
      setDeck({
        ...deckData,
        cards: deckData.cards as Card[]
      });
      setTopic('');
      notifyFlashcardsReady(deckData.title);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to generate flashcards" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKnown = async () => {
    if (!deck) return;
    setMasteredCards(prev => [...prev, deck.cards[currentCard].id]);
    nextCard();
  };

  const handleUnknown = () => {
    nextCard();
  };

  const nextCard = () => {
    if (!deck) return;
    setIsFlipped(false);
    
    if (currentCard < deck.cards.length - 1) {
      setTimeout(() => setCurrentCard(prev => prev + 1), 200);
    } else {
      // Session complete - save progress
      saveMasteredCount();
    }
  };

  const saveMasteredCount = async () => {
    if (!deck) return;
    await supabase
      .from('flashcard_decks')
      .update({ 
        mastered_count: masteredCards.length,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Next day
      })
      .eq('id', deck.id);
  };

  const restartDeck = () => {
    setCurrentCard(0);
    setIsFlipped(false);
    setMasteredCards([]);
  };

  const handleDeleteDeck = async (id: string) => {
    try {
      const { error } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Deleted", description: "Flashcard deck deleted successfully" });
      
      // If we're viewing the deleted deck, go back to list
      if (deck?.id === id) {
        setDeck(null);
        navigate('/flashcards');
      }
      
      // Refresh the list
      loadRecentDecks();
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete deck" });
    } finally {
      setDeleteDialogOpen(false);
      setDeckToDelete(null);
    }
  };

  const confirmDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeckToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeckSave = (updatedDeck: Deck) => {
    setDeck(updatedDeck);
    loadRecentDecks();
  };

  // Deck selection screen
  if (!deck) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen py-6 safe-top">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Flashcards</h1>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <LuminaAvatar size="md" />
            <div className="bg-secondary rounded-2xl rounded-bl-md p-4 flex-1">
              <p className="text-sm text-foreground">
                Flashcards use spaced repetition to help you remember concepts longer. What would you like to study?
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
            <label className="text-sm font-medium text-foreground mb-2 block">Topic</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Criminal Law Defences"
              className="mb-4"
            />
            <Button 
              onClick={generateFlashcards} 
              disabled={isGenerating || !topic.trim()}
              className="w-full gradient-primary"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Creating Flashcards...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Generate Flashcards
                </>
              )}
            </Button>
          </div>

          {recentDecks.length > 0 && (
            <div>
              <h2 className="font-semibold text-foreground mb-4">Your Decks</h2>
              <div className="space-y-3">
                {recentDecks.map((d) => (
                  <div
                    key={d.id}
                    className="w-full bg-card rounded-2xl p-4 border border-border/50 text-left hover:shadow-premium transition-all flex items-center gap-4"
                  >
                    <button
                      onClick={() => navigate(`/flashcards/${d.id}`)}
                      className="flex items-center gap-4 flex-1"
                    >
                      <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.cards.length} cards • {d.mastered_count || 0} mastered
                        </p>
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/flashcards/${d.id}`)}>
                          <ChevronRight className="w-4 h-4 mr-2" />
                          Study
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => confirmDelete(d.id, e)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Flashcard Deck?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the flashcard deck and all its cards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deckToDelete && handleDeleteDeck(deckToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MobileLayout>
    );
  }

  // Session complete
  if (currentCard >= deck.cards.length) {
    const masteredPercentage = Math.round((masteredCards.length / deck.cards.length) * 100);
    
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen items-center justify-center px-5 py-6">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-success/10 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Session Complete!</h1>
            <p className="text-muted-foreground mb-8">Great job reviewing your flashcards</p>
            
            <div className="bg-card rounded-3xl p-8 border border-border/50 mb-8">
              <div className="text-6xl font-bold text-gradient mb-2">{masteredPercentage}%</div>
              <p className="text-muted-foreground">
                {masteredCards.length} of {deck.cards.length} cards mastered
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={restartDeck} variant="outline" className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Review Again
              </Button>
              <Button onClick={() => { setDeck(null); loadRecentDecks(); }} className="w-full gradient-primary">
                New Deck
              </Button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Active flashcard review
  const card = deck.cards[currentCard];
  
  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen py-6 safe-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="text-sm text-muted-foreground">
            {currentCard + 1} / {deck.cards.length}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Deck
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => confirmDelete(deck.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Deck
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-secondary rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full gradient-primary transition-all duration-300"
            style={{ width: `${((currentCard + 1) / deck.cards.length) * 100}%` }}
          />
        </div>

        {/* Flashcard */}
        <div className="flex-1 flex items-center justify-center">
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className={cn(
              "w-full aspect-[3/4] max-h-[400px] rounded-3xl border shadow-premium cursor-pointer transition-all duration-500 transform-gpu",
              "flex items-center justify-center p-8 text-center",
              isFlipped 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-card border-border/50"
            )}
            style={{ 
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            <div style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
              {isFlipped ? (
                <div>
                  <p className="text-sm opacity-70 mb-4">Answer</p>
                  <p className="text-xl font-medium leading-relaxed">{card.back}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Tap to flip</p>
                  <p className="text-xl font-medium text-foreground leading-relaxed">{card.front}</p>
                  {card.hint && (
                    <p className="text-sm text-muted-foreground mt-4 italic">Hint: {card.hint}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {isFlipped && (
          <div className="flex gap-4 mt-8">
            <Button 
              onClick={handleUnknown}
              variant="outline"
              className="flex-1 py-6 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <ThumbsDown className="w-5 h-5 mr-2" />
              Still Learning
            </Button>
            <Button 
              onClick={handleKnown}
              className="flex-1 py-6 bg-success hover:bg-success/90 text-success-foreground"
            >
              <ThumbsUp className="w-5 h-5 mr-2" />
              Got It!
            </Button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditFlashcardDeckModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        deck={deck}
        onSave={handleDeckSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard Deck?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the flashcard deck and all its cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deckToDelete && handleDeleteDeck(deckToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default FlashcardsPage;
