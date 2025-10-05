import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  timeframe: 'daily' | 'weekly' | 'monthly';
  week_start_date?: string;
  month_start_date?: string;
}

interface WeeklyProgressChartProps {
  goals: Goal[];
  selectedDate?: Date;
}

export default function WeeklyProgressChart({ goals: allGoals, selectedDate }: WeeklyProgressChartProps) {
  let goals = allGoals.filter(g => g.timeframe === 'weekly');
  
  // Filter by selected date's week if provided
  if (selectedDate) {
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    goals = goals.filter(g => g.week_start_date?.split('T')[0] === weekStartStr);
  }
  
  const completed = goals.filter(g => g.completed).length;
  const incomplete = goals.length - completed;

  const data = [
    { name: 'Completed', value: completed, fill: 'hsl(var(--primary))' },
    { name: 'Incomplete', value: incomplete, fill: 'hsl(var(--muted))' }
  ];

  const chartConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--primary))",
    },
    incomplete: {
      label: "Incomplete",
      color: "hsl(var(--muted))",
    },
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle>Weekly Goals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {completed} of {goals.length} completed
            </p>
            <p className="text-2xl font-bold">
              {goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0}%
            </p>
          </div>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
