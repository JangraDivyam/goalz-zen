import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayContentProps } from 'react-day-picker';

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  timeframe: 'daily' | 'weekly' | 'monthly';
  goal_date: string;
  completed_at: string | null;
}

interface CalendarProgressProps {
  goals: Goal[];
  currentDate: Date;
}

export default function CalendarProgress({ goals, currentDate }: CalendarProgressProps) {
  // Calculate progress for each day
  const getDayProgress = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dailyGoals = goals.filter(
      g => g.timeframe === 'daily' && g.goal_date?.split('T')[0] === dateStr
    );
    if (dailyGoals.length === 0) return null;
    const completed = dailyGoals.filter(g => g.completed).length;
    return (completed / dailyGoals.length) * 100;
  };

  const renderDay = (props: DayContentProps) => {
    const progress = getDayProgress(props.date);
    const isToday = props.date.toDateString() === currentDate.toDateString();
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span className={isToday ? 'font-bold' : ''}>{props.date.getDate()}</span>
        {progress !== null && (
          <div 
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
            style={{
              backgroundColor: progress === 100 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              opacity: 0.6
            }}
          />
        )}
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Progress Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={currentDate}
          month={currentDate}
          className="rounded-md border pointer-events-auto"
          components={{
            DayContent: renderDay
          }}
        />
      </CardContent>
    </Card>
  );
}
