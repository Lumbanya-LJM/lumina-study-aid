import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { LMVLogo } from '@/components/ui/lmv-logo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  TrendingUp,
  BookOpen,
  Brain,
  Target,
  Flame,
  Calendar,
  Clock,
  Trophy,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface WeeklyData {
  day: string;
  hours: number;
  tasks: number;
}

interface QuizScore {
  date: string;
  score: number;
  total: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AnalyticsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'streaks'>('overview');
  
  const [stats, setStats] = useState({
    totalStudyHours: 0,
    tasksCompleted: 0,
    quizzesTaken: 0,
    flashcardsReviewed: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageQuizScore: 0,
  });

  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [activityBreakdown, setActivityBreakdown] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    
    try {
      // Fetch profile stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch study sessions for weekly data
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', weekStart.toISOString());

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('study_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString());

      // Fetch quizzes
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch flashcard decks
      const { data: flashcards } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', user.id);

      // Calculate stats
      const totalStudyMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
      const totalStudyHours = Math.round(totalStudyMinutes / 60 * 10) / 10;
      const tasksCompleted = tasks?.filter(t => t.completed).length || 0;
      const quizzesTaken = quizzes?.length || 0;
      const flashcardsReviewed = flashcards?.reduce((sum, d) => sum + (d.mastered_count || 0), 0) || 0;
      
      // Calculate average quiz score
      const completedQuizzes = quizzes?.filter(q => q.score !== null) || [];
      const averageQuizScore = completedQuizzes.length > 0
        ? Math.round(completedQuizzes.reduce((sum, q) => sum + ((q.score || 0) / q.total_questions * 100), 0) / completedQuizzes.length)
        : 0;

      setStats({
        totalStudyHours,
        tasksCompleted,
        quizzesTaken,
        flashcardsReviewed,
        currentStreak: profile?.streak_days || 0,
        longestStreak: profile?.streak_days || 0, // Would need separate tracking
        averageQuizScore,
      });

      // Generate weekly data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const weeklyStats: WeeklyData[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayHours = sessions?.filter(s => {
          const sessionDate = new Date(s.started_at);
          return sessionDate >= dayStart && sessionDate <= dayEnd;
        }).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
        
        const dayTasks = tasks?.filter(t => {
          const taskDate = new Date(t.created_at);
          return taskDate >= dayStart && taskDate <= dayEnd && t.completed;
        }).length || 0;
        
        weeklyStats.push({
          day: dayName,
          hours: Math.round(dayHours / 60 * 10) / 10,
          tasks: dayTasks,
        });
      }
      setWeeklyData(weeklyStats);

      // Generate quiz scores
      const recentQuizzes = (quizzes || []).slice(0, 5).reverse().map(q => ({
        date: new Date(q.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        score: q.score || 0,
        total: q.total_questions,
      }));
      setQuizScores(recentQuizzes);

      // Activity breakdown
      setActivityBreakdown([
        { name: 'Study Sessions', value: totalStudyHours },
        { name: 'Quizzes', value: quizzesTaken },
        { name: 'Flashcards', value: flashcardsReviewed },
        { name: 'Tasks', value: tasksCompleted },
      ]);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'quizzes' as const, label: 'Quizzes', icon: Brain },
    { id: 'streaks' as const, label: 'Streaks', icon: Flame },
  ];

  const statCards = [
    { label: 'Study Hours', value: stats.totalStudyHours, icon: Clock, suffix: 'h' },
    { label: 'Tasks Done', value: stats.tasksCompleted, icon: Target, suffix: '' },
    { label: 'Quizzes', value: stats.quizzesTaken, icon: Brain, suffix: '' },
    { label: 'Cards Mastered', value: stats.flashcardsReviewed, icon: BookOpen, suffix: '' },
  ];

  return (
    <MobileLayout showNav={false}>
      <div className="py-6 safe-top pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {statCards.map((stat, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-4 border border-border/50 shadow-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stat.value}{stat.suffix}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Weekly Study Hours Chart */}
                <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Weekly Study Hours</h3>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                          }}
                        />
                        <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Activity Breakdown */}
                <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Activity Breakdown</h3>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activityBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {activityBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {activityBreakdown.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quizzes Tab */}
            {activeTab === 'quizzes' && (
              <div className="space-y-6">
                {/* Average Score */}
                <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card text-center">
                  <div className="w-24 h-24 mx-auto rounded-full gradient-primary flex items-center justify-center mb-3">
                    <span className="text-3xl font-bold text-primary-foreground">
                      {stats.averageQuizScore}%
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">Average Quiz Score</p>
                  <p className="text-sm text-muted-foreground">Based on {stats.quizzesTaken} quizzes</p>
                </div>

                {/* Quiz Performance Chart */}
                <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Recent Quiz Scores</h3>
                  </div>
                  {quizScores.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={quizScores}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                            }}
                            formatter={(value, name) => [`${value}/${name === 'score' ? 'total' : ''}`, 'Score']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No quiz data yet</p>
                      <p className="text-sm text-muted-foreground">Take some quizzes to see your progress</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Streaks Tab */}
            {activeTab === 'streaks' && (
              <div className="space-y-6">
                {/* Current Streak */}
                <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-card text-center">
                  <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mb-4 shadow-lg">
                    <div className="text-center">
                      <Flame className="w-8 h-8 text-white mx-auto" />
                      <span className="text-3xl font-bold text-white block">{stats.currentStreak}</span>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">Day Streak</p>
                  <p className="text-sm text-muted-foreground mt-1">Keep studying to maintain your streak!</p>
                </div>

                {/* Streak Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-card text-center">
                    <Trophy className="w-8 h-8 text-warning mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats.longestStreak}</p>
                    <p className="text-xs text-muted-foreground">Longest Streak</p>
                  </div>
                  <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-card text-center">
                    <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats.totalStudyHours}h</p>
                    <p className="text-xs text-muted-foreground">This Week</p>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                  <h4 className="font-semibold text-foreground mb-2">💡 Streak Tips</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Study for at least 15 minutes daily</li>
                    <li>• Complete one task to maintain your streak</li>
                    <li>• Review flashcards before bed for better retention</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default AnalyticsDashboardPage;
