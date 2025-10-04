import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Target, CheckCircle2, Calendar } from 'lucide-react';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Stats {
  totalCategories: number;
  totalGoals: number;
  completedGoals: number;
  dailyProgress: number;
  weeklyProgress: number;
  monthlyProgress: number;
}

export default function Progress() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCategories: 0,
    totalGoals: 0,
    completedGoals: 0,
    dailyProgress: 0,
    weeklyProgress: 0,
    monthlyProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user?.id);

      if (categoriesError) throw categoriesError;

      // Fetch all goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('timeframe, completed, category_id')
        .in('category_id', categoriesData?.map(c => c.id) || []);

      if (goalsError) throw goalsError;

      const totalGoals = goalsData?.length || 0;
      const completedGoals = goalsData?.filter(g => g.completed).length || 0;

      // Calculate progress by timeframe
      const dailyGoals = goalsData?.filter(g => g.timeframe === 'daily') || [];
      const weeklyGoals = goalsData?.filter(g => g.timeframe === 'weekly') || [];
      const monthlyGoals = goalsData?.filter(g => g.timeframe === 'monthly') || [];

      const dailyProgress = dailyGoals.length > 0 
        ? (dailyGoals.filter(g => g.completed).length / dailyGoals.length) * 100 
        : 0;
      
      const weeklyProgress = weeklyGoals.length > 0
        ? (weeklyGoals.filter(g => g.completed).length / weeklyGoals.length) * 100
        : 0;
      
      const monthlyProgress = monthlyGoals.length > 0
        ? (monthlyGoals.filter(g => g.completed).length / monthlyGoals.length) * 100
        : 0;

      setStats({
        totalCategories: categoriesData?.length || 0,
        totalGoals,
        completedGoals,
        dailyProgress,
        weeklyProgress,
        monthlyProgress,
      });
    } catch (error: any) {
      toast.error('Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const overallProgress = stats.totalGoals > 0 
    ? (stats.completedGoals / stats.totalGoals) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Progress Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Target className="h-8 w-8 text-primary" />
                    <span className="text-3xl font-bold">{stats.totalCategories}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-secondary" />
                    <span className="text-3xl font-bold">{stats.totalGoals}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <span className="text-3xl font-bold text-success">
                      {stats.completedGoals}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Overall Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <span className="text-3xl font-bold">
                      {Math.round(overallProgress)}%
                    </span>
                    <ProgressBar value={overallProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeframe Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Daily Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{Math.round(stats.dailyProgress)}%</span>
                  </div>
                  <ProgressBar value={stats.dailyProgress} className="h-3" />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-secondary" />
                    Weekly Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{Math.round(stats.weeklyProgress)}%</span>
                  </div>
                  <ProgressBar value={stats.weeklyProgress} className="h-3" />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    Monthly Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{Math.round(stats.monthlyProgress)}%</span>
                  </div>
                  <ProgressBar value={stats.monthlyProgress} className="h-3" />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
