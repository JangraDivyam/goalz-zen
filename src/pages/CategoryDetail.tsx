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
  week_start_date?: string;
  month_start_date?: string;
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeRemaining, setTimeRemaining] = useState({
    hoursLeftToday: 0,
    daysLeftThisWeek: 0,
    daysLeftThisMonth: 0,
  });

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

  // Calculate time remaining and update every minute
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      
      // Hours left today
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const hoursLeft = Math.ceil((endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      // Days left this week (Sunday is end of week)
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
      
      // Days left this month
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysLeftMonth = lastDayOfMonth - now.getDate() + 1;
      
      setTimeRemaining({
        hoursLeftToday: hoursLeft,
        daysLeftThisWeek: daysUntilSunday,
        daysLeftThisMonth: daysLeftMonth,
      });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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

    const goalData: any = {
      category_id: id,
      title: newGoal,
      timeframe: activeTab,
      completed: false,
    };

    // Set appropriate date fields based on timeframe and selected date
    if (activeTab === 'daily') {
      goalData.goal_date = selectedDate.toISOString().split('T')[0];
    } else if (activeTab === 'weekly') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      goalData.week_start_date = weekStart.toISOString().split('T')[0];
    } else if (activeTab === 'monthly') {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      goalData.month_start_date = monthStart.toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('goals')
      .insert([goalData]);

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

  const filteredGoals = goals.filter(goal => {
    if (goal.timeframe !== activeTab) return false;
    
    // Filter by selected date
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    
    if (activeTab === 'daily') {
      return goal.goal_date?.split('T')[0] === selectedDateStr;
    } else if (activeTab === 'weekly') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      return goal.week_start_date?.split('T')[0] === weekStartStr;
    } else if (activeTab === 'monthly') {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      return goal.month_start_date?.split('T')[0] === monthStartStr;
    }
    
    return false;
  });
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
              <div className="space-y-2">
                <DailyProgressChart goals={goals} selectedDate={selectedDate} />
                <p className="text-xs text-muted-foreground text-center">
                  Hours left today: <span className="font-semibold text-foreground">{timeRemaining.hoursLeftToday}h</span>
                </p>
              </div>
              <div className="space-y-2">
                <WeeklyProgressChart goals={goals} selectedDate={selectedDate} />
                <p className="text-xs text-muted-foreground text-center">
                  Days left this week: <span className="font-semibold text-foreground">{timeRemaining.daysLeftThisWeek}d</span>
                </p>
              </div>
              <div className="space-y-2">
                <MonthlyProgressChart goals={goals} selectedDate={selectedDate} />
                <p className="text-xs text-muted-foreground text-center">
                  Days left this month: <span className="font-semibold text-foreground">{timeRemaining.daysLeftThisMonth}d</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="lg:col-span-1">
            <CalendarProgress 
              goals={goals} 
              currentDate={currentDate} 
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <Card className="border-0 shadow-card mt-4">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Viewing data for:
                  </p>
                  <p className="text-lg font-bold">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {selectedDate.toDateString() !== currentDate.toDateString() && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedDate(currentDate)}
                      className="mt-2"
                    >
                      Back to Today
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
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
                <form onSubmit={handleAddGoal} className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Add a new ${activeTab} goal for ${selectedDate.toLocaleDateString()}...`}
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                    />
                    <Button type="submit" className="bg-gradient-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedDate.toDateString() !== currentDate.toDateString() && (
                    <p className="text-xs text-muted-foreground">
                      Adding goal for selected date: {selectedDate.toLocaleDateString()}
                    </p>
                  )}
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
