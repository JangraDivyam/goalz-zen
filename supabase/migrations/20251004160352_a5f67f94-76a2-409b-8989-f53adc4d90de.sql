-- Add week_start_date and month_start_date columns to goals table
ALTER TABLE public.goals
ADD COLUMN week_start_date date DEFAULT DATE_TRUNC('week', CURRENT_DATE)::date,
ADD COLUMN month_start_date date DEFAULT DATE_TRUNC('month', CURRENT_DATE)::date;

-- Enable realtime for goals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;