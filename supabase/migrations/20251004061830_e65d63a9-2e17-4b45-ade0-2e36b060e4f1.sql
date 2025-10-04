-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'Target',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('daily', 'weekly', 'monthly')),
  completed BOOLEAN DEFAULT FALSE,
  goal_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goals
CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.categories
      WHERE categories.id = goals.category_id
      AND categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own goals"
  ON public.goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories
      WHERE categories.id = goals.category_id
      AND categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.categories
      WHERE categories.id = goals.category_id
      AND categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.categories
      WHERE categories.id = goals.category_id
      AND categories.user_id = auth.uid()
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create index for better query performance
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_goals_category_id ON public.goals(category_id);
CREATE INDEX idx_goals_goal_date ON public.goals(goal_date);
CREATE INDEX idx_goals_timeframe ON public.goals(timeframe);