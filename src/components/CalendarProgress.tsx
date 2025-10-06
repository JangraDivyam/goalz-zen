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
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
}

export default function CalendarProgress({ goals, currentDate, selectedDate, onSelectDate }: CalendarProgressProps) {
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
    const isSelected = selectedDate && props.date.toDateString() === selectedDate.toDateString();
    const hasGoals = progress !== null;
    const isComplete = progress === 100;
    
    return (
      <div className={`relative w-full h-full flex items-center justify-center ${
        isToday ? 'bg-primary/10 rounded-full' : ''
      } ${isSelected ? 'ring-2 ring-primary rounded-full' : ''}`}>
        <span className={`${isToday ? 'font-bold text-primary' : 'text-foreground'} ${isSelected ? 'font-bold' : ''}`}>
          {props.date.getDate()}
        </span>
        {hasGoals && (
          <div 
            className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: isComplete ? 'hsl(var(--success))' : 'hsl(var(--primary))',
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
          selected={selectedDate || currentDate}
          onSelect={(date) => onSelectDate?.(date || currentDate)}
          month={selectedDate || currentDate}
          className="rounded-md border pointer-events-auto"
          components={{
            DayContent: renderDay
          }}
        />
        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/10 border-2 border-primary" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span>All goals completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Has goals</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
