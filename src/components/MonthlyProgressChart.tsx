import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  timeframe: 'daily' | 'weekly' | 'monthly';
  month_start_date?: string;
}

interface MonthlyProgressChartProps {
  goals: Goal[];
  selectedDate?: Date;
}

export default function MonthlyProgressChart({ goals: allGoals, selectedDate }: MonthlyProgressChartProps) {
  let goals = allGoals.filter(g => g.timeframe === 'monthly');
  
  // Filter by selected date's month if provided
  if (selectedDate) {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    goals = goals.filter(g => g.month_start_date?.split('T')[0] === monthStartStr);
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
        <CardTitle>Monthly Goals</CardTitle>
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
