import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import CalendarProgress from '@/components/CalendarProgress';
import DailyProgressChart from '@/components/DailyProgressChart';
import WeeklyProgressChart from '@/components/WeeklyProgressChart';
import MonthlyProgressChart from '@/components/MonthlyProgressChart';

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  timeframe: 'daily' | 'weekly' | 'monthly';
  goal_date: string;
  completed_at: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function CategoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (user && id) {
      fetchCategoryAndGoals();
      syncGoals();
    }
  }, [user, id]);

  const syncGoals = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-goals');
      if (error) throw error;
      if (data?.currentDate) {
        setCurrentDate(new Date(data.currentDate));
      }
    } catch (error) {
      console.error('Error syncing goals:', error);
    }
  };

  // Set up realtime subscription for goals
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`goals-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `category_id=eq.${id}`,
        },
        (payload) => {
          console.log('Realtime goal update:', payload);
          fetchCategoryAndGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchCategoryAndGoals = async () => {
    try {
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('category_id', id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;
      setGoals((goalsData || []) as Goal[]);
    } catch (error: any) {
      toast.error('Failed to load category');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGoal.trim()) return;

    const { error } = await supabase
      .from('goals')
      .insert([
        {
          category_id: id,
          title: newGoal,
          timeframe: activeTab,
          completed: false,
        },
      ]);

    if (error) {
      toast.error('Failed to add goal');
    } else {
      toast.success('Goal added!');
      setNewGoal('');
      fetchCategoryAndGoals();
    }
  };

  const handleToggleGoal = async (goalId: string, completed: boolean) => {
    const { error } = await supabase
      .from('goals')
      .update({ 
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null
      })
      .eq('id', goalId);

    if (error) {
      toast.error('Failed to update goal');
    } else {
      fetchCategoryAndGoals();
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      toast.error('Failed to delete goal');
    } else {
      toast.success('Goal deleted');
      fetchCategoryAndGoals();
    }
  };

  const filteredGoals = goals.filter(goal => goal.timeframe === activeTab);
  const completedCount = filteredGoals.filter(g => g.completed).length;
  const progress = filteredGoals.length > 0 ? (completedCount / filteredGoals.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

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
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category?.color }}
              />
              <h1 className="text-2xl font-bold">{category?.name}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Progress Overview */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Overview */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {completedCount} of {filteredGoals.length} goals completed
                    </span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Progress Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DailyProgressChart goals={goals} />
              <WeeklyProgressChart goals={goals} />
              <MonthlyProgressChart goals={goals} />
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="lg:col-span-1">
            <CalendarProgress goals={goals} currentDate={currentDate} />
          </div>
        </div>

        {/* Goals Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {/* Add Goal Form */}
            <Card className="border-0 shadow-card">
              <CardContent className="pt-6">
                <form onSubmit={handleAddGoal} className="flex gap-2">
                  <Input
                    placeholder={`Add a new ${activeTab} goal...`}
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                  />
                  <Button type="submit" className="bg-gradient-primary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Goals List */}
            <div className="space-y-3">
              {filteredGoals.length === 0 ? (
                <Card className="border-0 shadow-card">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No {activeTab} goals yet. Add one above!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredGoals.map((goal) => (
                  <Card
                    key={goal.id}
                    className="border-0 shadow-card hover:shadow-elevated transition-shadow"
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={goal.completed}
                          onCheckedChange={() => handleToggleGoal(goal.id, goal.completed)}
                          className="h-5 w-5"
                        />
                        <span
                          className={`flex-1 ${
                            goal.completed
                              ? 'line-through text-muted-foreground'
                              : 'text-foreground'
                          }`}
                        >
                          {goal.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
