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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Json } from '@/integrations/supabase/types';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
  questions: Question[];
}

interface EditQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz;
  onSave: (updatedQuiz: Quiz) => void;
}

export const EditQuizModal: React.FC<EditQuizModalProps> = ({
  open,
  onOpenChange,
  quiz,
  onSave,
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(quiz.title);
  const [subject, setSubject] = useState(quiz.subject);
  const [questions, setQuestions] = useState<Question[]>(quiz.questions);
  const [saving, setSaving] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    setTitle(quiz.title);
    setSubject(quiz.subject);
    setQuestions(quiz.questions);
    setExpandedQuestion(null);
  }, [quiz]);

  const addQuestion = () => {
    const newId = Math.max(0, ...questions.map(q => q.id)) + 1;
    setQuestions([...questions, {
      id: newId,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    }]);
    setExpandedQuestion(newId);
  };

  const updateQuestion = (id: number, field: keyof Question, value: any) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const updateOption = (questionId: number, optionIndex: number, value: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? { ...q, options: q.options.map((opt, i) => i === optionIndex ? value : opt) }
        : q
    ));
  };

  const removeQuestion = (id: number) => {
    if (questions.length <= 1) {
      toast({
        variant: "destructive",
        title: "Cannot remove",
        description: "A quiz must have at least one question."
      });
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
    if (expandedQuestion === id) {
      setExpandedQuestion(null);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Title is required" });
      return;
    }

    const validQuestions = questions.filter(q =>
      q.question.trim() &&
      q.options.every(opt => opt.trim()) &&
      q.explanation.trim()
    );

    if (validQuestions.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "At least one complete question is required" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({
          title: title.trim(),
          subject: subject.trim(),
          questions: validQuestions as unknown as Json,
          total_questions: validQuestions.length,
        })
        .eq('id', quiz.id);

      if (error) throw error;

      const updatedQuiz = {
        ...quiz,
        title: title.trim(),
        subject: subject.trim(),
        questions: validQuestions,
        total_questions: validQuestions.length
      };
      onSave(updatedQuiz);
      toast({ title: "Saved", description: "Quiz updated successfully" });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Quiz</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Constitutional Law"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <h3 className="font-medium text-foreground">Questions ({questions.length})</h3>
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </Button>
        </div>

        <ScrollArea className="flex-1 max-h-[400px] pr-4">
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-secondary/50 rounded-xl overflow-hidden"
              >
                {/* Question Header - Always visible */}
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
                  <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
                  <span className="flex-1 text-sm text-foreground truncate">
                    {question.question || 'New question...'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeQuestion(question.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Expanded Content */}
                {expandedQuestion === question.id && (
                  <div className="p-4 pt-0 space-y-4 border-t border-border/50">
                    <div>
                      <Label className="text-xs">Question</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                        placeholder="Enter the question"
                        className="min-h-[60px] resize-none"
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block">Options (select the correct answer)</Label>
                      <RadioGroup
                        value={question.correctAnswer.toString()}
                        onValueChange={(value) => updateQuestion(question.id, 'correctAnswer', parseInt(value))}
                      >
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <RadioGroupItem value={optIndex.toString()} id={`q${question.id}-opt${optIndex}`} />
                            <Input
                              value={option}
                              onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-xs">Explanation</Label>
                      <Textarea
                        value={question.explanation}
                        onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                        placeholder="Explain why this is the correct answer"
                        className="min-h-[60px] resize-none"
                      />
                    </div>
                  </div>
                )}
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
