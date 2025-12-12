-- Create quizzes table for AI-generated quizzes
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  score INTEGER,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own quizzes" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own quizzes" ON public.quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = user_id);

-- Create flashcard_decks table
CREATE TABLE public.flashcard_decks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]',
  mastered_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own flashcard decks" ON public.flashcard_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own flashcard decks" ON public.flashcard_decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own flashcard decks" ON public.flashcard_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own flashcard decks" ON public.flashcard_decks FOR DELETE USING (auth.uid() = user_id);

-- Create payments table for MoneyUnify transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  payment_method TEXT NOT NULL DEFAULT 'mobile_money',
  provider TEXT NOT NULL DEFAULT 'mtn',
  phone_number TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  product_type TEXT NOT NULL,
  product_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);

-- Create subscriptions table for premium access
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger for payments updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();