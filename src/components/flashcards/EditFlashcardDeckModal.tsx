import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Json } from '@/integrations/supabase/types';

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
}

interface EditFlashcardDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Deck;
  onSave: (updatedDeck: Deck) => void;
}

export const EditFlashcardDeckModal: React.FC<EditFlashcardDeckModalProps> = ({
  open,
  onOpenChange,
  deck,
  onSave,
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(deck.title);
  const [subject, setSubject] = useState(deck.subject);
  const [cards, setCards] = useState<Card[]>(deck.cards);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(deck.title);
    setSubject(deck.subject);
    setCards(deck.cards);
  }, [deck]);

  const addCard = () => {
    const newId = Math.max(0, ...cards.map(c => c.id)) + 1;
    setCards([...cards, { id: newId, front: '', back: '', hint: '' }]);
  };

  const updateCard = (id: number, field: keyof Card, value: string) => {
    setCards(cards.map(card => 
      card.id === id ? { ...card, [field]: value } : card
    ));
  };

  const removeCard = (id: number) => {
    if (cards.length <= 1) {
      toast({
        variant: "destructive",
        title: "Cannot remove",
        description: "A deck must have at least one card."
      });
      return;
    }
    setCards(cards.filter(card => card.id !== id));
  };

  const handleSave = async () => {
    // Validate
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Title is required" });
      return;
    }

    const validCards = cards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "At least one complete card is required" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('flashcard_decks')
        .update({
          title: title.trim(),
          subject: subject.trim(),
          cards: validCards as unknown as Json,
        })
        .eq('id', deck.id);

      if (error) throw error;

      const updatedDeck = { ...deck, title: title.trim(), subject: subject.trim(), cards: validCards };
      onSave(updatedDeck);
      toast({ title: "Saved", description: "Flashcard deck updated successfully" });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving deck:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Flashcard Deck</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Deck Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter deck title"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Criminal Law"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <h3 className="font-medium text-foreground">Cards ({cards.length})</h3>
          <Button variant="outline" size="sm" onClick={addCard}>
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        </div>

        <ScrollArea className="flex-1 max-h-[400px] pr-4">
          <div className="space-y-4">
            {cards.map((card, index) => (
              <div key={card.id} className="bg-secondary/50 rounded-xl p-4 relative group">
                <div className="flex items-start gap-2 mb-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-1 opacity-50" />
                  <span className="text-sm font-medium text-muted-foreground">Card {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => removeCard(card.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Front (Question)</Label>
                    <Textarea
                      value={card.front}
                      onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                      placeholder="Enter the question or term"
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Back (Answer)</Label>
                    <Textarea
                      value={card.back}
                      onChange={(e) => updateCard(card.id, 'back', e.target.value)}
                      placeholder="Enter the answer or definition"
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hint (Optional)</Label>
                    <Input
                      value={card.hint || ''}
                      onChange={(e) => updateCard(card.id, 'hint', e.target.value)}
                      placeholder="Optional hint"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
