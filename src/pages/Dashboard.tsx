import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, BarChart3 } from 'lucide-react';
import CategoryCard from '@/components/CategoryCard';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  color: string;
  totalGoals: number;
  completedGoals: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const colors = [
    '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#EC4899', '#6366F1', '#14B8A6', '#F97316'
  ];

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id);

      if (categoriesError) throw categoriesError;

      const categoriesWithStats = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { data: goalsData } = await supabase
            .from('goals')
            .select('completed')
            .eq('category_id', category.id);

          const totalGoals = goalsData?.length || 0;
          const completedGoals = goalsData?.filter(g => g.completed).length || 0;

          return {
            id: category.id,
            name: category.name,
            color: category.color,
            totalGoals,
            completedGoals,
          };
        })
      );

      setCategories(categoriesWithStats);
    } catch (error: any) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { error } = await supabase
      .from('categories')
      .insert([
        {
          user_id: user?.id,
          name: newCategoryName,
          color: randomColor,
        },
      ]);

    if (error) {
      toast.error('Failed to create category');
    } else {
      toast.success('Category created!');
      setNewCategoryName('');
      setOpen(false);
      fetchCategories();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">GoalTracker</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.email?.split('@')[0]}!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/progress')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Progress
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Categories</h2>
            <p className="text-muted-foreground">
              Organize your goals by category and track your progress
            </p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow">
                <Plus className="h-4 w-4 mr-2" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new category to organize your goals
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    placeholder="e.g., Work, Gym, Family"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary">
                  Create Category
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No categories yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first category to start tracking your goals
            </p>
            <Button onClick={() => setOpen(true)} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} {...category} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Target({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
