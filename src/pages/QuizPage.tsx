import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LuminaAvatar } from '@/components/lumina/LuminaAvatar';
import { 
  ArrowLeft, 
  Brain, 
  Trophy, 
  CheckCircle, 
  XCircle, 
  ChevronRight,
  Sparkles,
  Clock,
  RotateCcw
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  total_questions: number;
  score?: number;
  completed_at?: string;
}

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    if (quizId) {
      loadQuiz(quizId);
    } else {
      loadRecentQuizzes();
    }
  }, [quizId]);

  const loadQuiz = async (id: string) => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error loading quiz:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load quiz" });
      return;
    }

    if (!data) {
      toast({ variant: "destructive", title: "Error", description: "Quiz not found" });
      navigate('/quiz');
      return;
    }

    setQuiz({
      ...data,
      questions: data.questions as unknown as Question[]
    });
  };

  const loadRecentQuizzes = async () => {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setRecentQuizzes(data.map(q => ({
        ...q,
        questions: q.questions as unknown as Question[]
      })));
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a topic" });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic, numQuestions: 5 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate quiz');
      }

      const quizData = await response.json();
      setQuiz({
        ...quizData,
        questions: quizData.questions as Question[]
      });
      setTopic('');
      toast({ title: "Quiz ready!", description: "Let's test your knowledge" });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to generate quiz" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    if (answerIndex === quiz?.questions[currentQuestion].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = async () => {
    if (!quiz) return;
    
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsComplete(true);
      // Save score to database
      await supabase
        .from('quizzes')
        .update({ 
          score, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', quiz.id);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsComplete(false);
  };

  // Quiz selection screen
  if (!quiz) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen px-5 py-6 safe-top">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Quiz Mode</h1>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <LuminaAvatar size="md" />
            <div className="bg-secondary rounded-2xl rounded-bl-md p-4 flex-1">
              <p className="text-sm text-foreground">
                Ready to test your knowledge? Enter a topic and I'll create a personalized quiz for you!
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
            <label className="text-sm font-medium text-foreground mb-2 block">Quiz Topic</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Contract Law, Tort of Negligence"
              className="mb-4"
            />
            <Button 
              onClick={generateQuiz} 
              disabled={isGenerating || !topic.trim()}
              className="w-full gradient-primary"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Quiz
                </>
              )}
            </Button>
          </div>

          {recentQuizzes.length > 0 && (
            <div>
              <h2 className="font-semibold text-foreground mb-4">Recent Quizzes</h2>
              <div className="space-y-3">
                {recentQuizzes.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/quiz/${q.id}`)}
                    className="w-full bg-card rounded-2xl p-4 border border-border/50 text-left hover:shadow-premium transition-all flex items-center gap-4"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      q.completed_at ? "bg-success/10" : "bg-primary/10"
                    )}>
                      {q.completed_at ? (
                        <Trophy className="w-5 h-5 text-success" />
                      ) : (
                        <Brain className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{q.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.total_questions} questions • {q.subject}
                        {q.score !== null && ` • Score: ${q.score}/${q.total_questions}`}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </MobileLayout>
    );
  }

  // Quiz complete screen
  if (isComplete) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen items-center justify-center px-5 py-6">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full gradient-primary mx-auto mb-6 flex items-center justify-center shadow-glow">
              <Trophy className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Quiz Complete!</h1>
            <p className="text-muted-foreground mb-8">Great effort on your study session</p>
            
            <div className="bg-card rounded-3xl p-8 border border-border/50 mb-8">
              <div className="text-6xl font-bold text-gradient mb-2">{percentage}%</div>
              <p className="text-muted-foreground">
                {score} out of {quiz.questions.length} correct
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={restartQuiz} variant="outline" className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Quiz
              </Button>
              <Button onClick={() => { setQuiz(null); loadRecentQuizzes(); }} className="w-full gradient-primary">
                New Quiz
              </Button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Active quiz screen
  const question = quiz.questions[currentQuestion];
  
  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen px-5 py-6 safe-top">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {currentQuestion + 1}/{quiz.questions.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-secondary rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full gradient-primary transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground mb-6 leading-relaxed">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isCorrect = index === question.correctAnswer;
              const isSelected = index === selectedAnswer;
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left transition-all",
                    showResult
                      ? isCorrect
                        ? "bg-success/10 border-success text-foreground"
                        : isSelected
                        ? "bg-destructive/10 border-destructive text-foreground"
                        : "bg-card border-border/50 text-muted-foreground"
                      : isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border/50 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      showResult
                        ? isCorrect
                          ? "bg-success text-success-foreground"
                          : isSelected
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-secondary text-muted-foreground"
                        : isSelected
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {showResult ? (
                        isCorrect ? <CheckCircle className="w-4 h-4" /> : isSelected ? <XCircle className="w-4 h-4" /> : String.fromCharCode(65 + index)
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </div>
                    <span className="flex-1">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showResult && (
            <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/20">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Explanation: </span>
                {question.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Next button */}
        {showResult && (
          <Button onClick={nextQuestion} className="w-full gradient-primary mt-6">
            {currentQuestion < quiz.questions.length - 1 ? "Next Question" : "See Results"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </MobileLayout>
  );
};

export default QuizPage;
