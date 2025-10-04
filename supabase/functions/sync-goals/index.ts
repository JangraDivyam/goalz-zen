import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get current date info
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Sunday start
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const weekStartStr = currentWeekStart.toISOString().split('T')[0];
    const monthStartStr = currentMonthStart.toISOString().split('T')[0];

    console.log('Syncing goals for user:', user.id);
    console.log('Current week start:', weekStartStr);
    console.log('Current month start:', monthStartStr);

    // Get user's categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id);

    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No categories found',
          currentDate: now.toISOString(),
          weekStart: weekStartStr,
          monthStart: monthStartStr,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categoryIds = categories.map(c => c.id);

    // Reset weekly goals if new week
    const { data: weeklyGoals } = await supabase
      .from('goals')
      .select('*')
      .in('category_id', categoryIds)
      .eq('timeframe', 'weekly')
      .neq('week_start_date', weekStartStr);

    if (weeklyGoals && weeklyGoals.length > 0) {
      console.log(`Resetting ${weeklyGoals.length} weekly goals`);
      await supabase
        .from('goals')
        .update({
          completed: false,
          completed_at: null,
          week_start_date: weekStartStr,
        })
        .in('category_id', categoryIds)
        .eq('timeframe', 'weekly')
        .neq('week_start_date', weekStartStr);
    }

    // Reset monthly goals if new month
    const { data: monthlyGoals } = await supabase
      .from('goals')
      .select('*')
      .in('category_id', categoryIds)
      .eq('timeframe', 'monthly')
      .neq('month_start_date', monthStartStr);

    if (monthlyGoals && monthlyGoals.length > 0) {
      console.log(`Resetting ${monthlyGoals.length} monthly goals`);
      await supabase
        .from('goals')
        .update({
          completed: false,
          completed_at: null,
          month_start_date: monthStartStr,
        })
        .in('category_id', categoryIds)
        .eq('timeframe', 'monthly')
        .neq('month_start_date', monthStartStr);
    }

    return new Response(
      JSON.stringify({
        message: 'Goals synced successfully',
        currentDate: now.toISOString(),
        weekStart: weekStartStr,
        monthStart: monthStartStr,
        weeklyGoalsReset: weeklyGoals?.length || 0,
        monthlyGoalsReset: monthlyGoals?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing goals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
