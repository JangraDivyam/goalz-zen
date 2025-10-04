import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CategoryCardProps {
  id: string;
  name: string;
  color: string;
  totalGoals: number;
  completedGoals: number;
}

export default function CategoryCard({
  id,
  name,
  color,
  totalGoals,
  completedGoals,
}: CategoryCardProps) {
  const navigate = useNavigate();
  const progress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 border-0 shadow-card overflow-hidden group"
      onClick={() => navigate(`/category/${id}`)}
    >
      <div 
        className="h-2 transition-all duration-300 group-hover:h-3"
        style={{ backgroundColor: color }}
      />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" style={{ color }} />
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Total Goals</span>
            </div>
            <p className="text-2xl font-bold">{totalGoals}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-xs">Completed</span>
            </div>
            <p className="text-2xl font-bold text-success">{completedGoals}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
