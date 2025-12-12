import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ArrowLeft, UserPlus, Mail, ChevronRight, X, Share2, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { WeeklyProgressReport } from '@/components/reports/WeeklyProgressReport';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface Partner {
  id: string;
  partner_name: string | null;
  partner_email: string;
  relationship: string | null;
  status: string | null;
}

interface Profile {
  full_name: string | null;
  university: string | null;
  year_of_study: number | null;
  streak_days: number | null;
  tasks_completed: number | null;
  total_study_hours: number | null;
  cases_read: number | null;
}

const PartnerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [email, setEmail] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [role, setRole] = useState<'parent' | 'mentor' | 'friend'>('parent');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Weekly stats for report
  const [weeklyStats, setWeeklyStats] = useState({
    streakDays: 0,
    studyHours: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    casesRead: 0,
    quizzesCompleted: 0,
    flashcardsReviewed: 0,
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch partners
      const { data: partnersData, error: partnersError } = await supabase
        .from('accountability_partners')
        .select('*')
        .eq('user_id', user.id);

      if (partnersError) throw partnersError;
      setPartners(partnersData || []);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      setProfile(profileData);

      // Fetch weekly tasks
      const { data: tasksData } = await supabase
        .from('study_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

      // Fetch quizzes completed this week
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', weekStart.toISOString())
        .lte('completed_at', weekEnd.toISOString());

      // Fetch flashcard decks reviewed this week
      const { data: flashcardsData } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', user.id)
        .not('last_reviewed_at', 'is', null)
        .gte('last_reviewed_at', weekStart.toISOString())
        .lte('last_reviewed_at', weekEnd.toISOString());

      const completedTasks = tasksData?.filter(t => t.completed).length || 0;
      const totalTasks = tasksData?.length || 0;

      setWeeklyStats({
        streakDays: profileData?.streak_days || 0,
        studyHours: profileData?.total_study_hours || 0,
        tasksCompleted: completedTasks,
        totalTasks: totalTasks,
        casesRead: profileData?.cases_read || 0,
        quizzesCompleted: quizzesData?.length || 0,
        flashcardsReviewed: flashcardsData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = async () => {
    if (!user || !email) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('accountability_partners')
        .insert({
          user_id: user.id,
          partner_email: email,
          partner_name: partnerName || null,
          relationship: role,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Partner Added!",
        description: `Invitation sent to ${email}`,
      });

      setEmail('');
      setPartnerName('');
      setShowAddModal(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add partner.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePartner = async (partnerId: string) => {
    try {
      const { error } = await supabase
        .from('accountability_partners')
        .delete()
        .eq('id', partnerId);

      if (error) throw error;

      toast({
        title: "Partner Removed",
        description: "The partner has been removed.",
      });

      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove partner.",
      });
    }
  };

  const handleShareReport = async () => {
    const reportText = `📚 Weekly Progress Report
${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}

Student: ${profile?.full_name || 'Law Student'}
University: ${profile?.university || 'N/A'}

📊 This Week's Stats:
🔥 Study Streak: ${weeklyStats.streakDays} days
⏱️ Study Hours: ${weeklyStats.studyHours.toFixed(1)} hrs
✅ Tasks: ${weeklyStats.tasksCompleted}/${weeklyStats.totalTasks} completed
📖 Cases Read: ${weeklyStats.casesRead}
🎯 Quizzes: ${weeklyStats.quizzesCompleted}
📝 Flashcard Decks Reviewed: ${weeklyStats.flashcardsReviewed}

Powered by Luminary Study 🇿🇲`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Weekly Progress Report',
          text: reportText,
        });
        toast({
          title: "Report Shared!",
          description: "Your progress report has been shared.",
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(reportText);
      toast({
        title: "Copied to Clipboard!",
        description: "Share this report with your accountability partner.",
      });
    }
  };

  const roles = [
    { id: 'parent' as const, label: 'Parent / Guardian' },
    { id: 'mentor' as const, label: 'Mentor / Tutor' },
    { id: 'friend' as const, label: 'Study Buddy' },
  ];

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-5 py-4 safe-top border-b border-border bg-background">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground flex-1">Accountability Partner</h1>
            <button 
              onClick={() => setShowAddModal(true)}
              className="p-2 rounded-xl bg-primary text-primary-foreground"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6">
          {/* Info Card */}
          <div className="gradient-primary rounded-2xl p-5 mb-6 shadow-glow">
            <h2 className="text-primary-foreground font-bold text-lg mb-2">Stay Accountable</h2>
            <p className="text-primary-foreground/80 text-sm">
              Your accountability partner receives weekly progress reports and study streaks to help keep you motivated.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Partners List */}
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3">Your Partners</h3>
                
                {partners.length > 0 ? (
                  <div className="space-y-3">
                    {partners.map((partner) => (
                      <div key={partner.id} className="bg-card rounded-2xl p-4 border border-border/50 shadow-card">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                            {(partner.partner_name || partner.partner_email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{partner.partner_name || 'Partner'}</p>
                            <p className="text-xs text-muted-foreground truncate">{partner.partner_email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full capitalize">
                              {partner.relationship || 'partner'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              partner.status === 'active' 
                                ? "bg-green-500/10 text-green-600"
                                : "bg-amber-500/10 text-amber-600"
                            )}>
                              {partner.status === 'active' ? 'Active' : 'Pending'}
                            </span>
                            <button
                              onClick={() => handleRemovePartner(partner.id)}
                              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-secondary rounded-2xl">
                    <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No partners added yet</p>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="mt-3 text-primary text-sm font-medium"
                    >
                      Add your first partner
                    </button>
                  </div>
                )}
              </div>

              {/* Weekly Report Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Weekly Report</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowReportModal(true)}
                      className="text-primary text-sm font-medium"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={handleShareReport}
                      className="flex items-center gap-1 text-primary text-sm font-medium"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
                
                <WeeklyProgressReport
                  studentName={profile?.full_name || 'Law Student'}
                  university={profile?.university || undefined}
                  yearOfStudy={profile?.year_of_study || undefined}
                  weekStartDate={format(weekStart, 'MMM d')}
                  weekEndDate={format(weekEnd, 'MMM d, yyyy')}
                  stats={weeklyStats}
                />
              </div>
            </>
          )}
        </div>

        {/* Add Partner Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-end justify-center">
            <div className="bg-background rounded-t-3xl w-full max-w-md p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground">Add Partner</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Partner Name Input */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">Partner's Name</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g., Mom, Dad, Dr. Smith"
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground text-sm"
                />
              </div>

              {/* Email Input */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@email.com"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground text-sm"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-2 block">Relationship</label>
                <div className="space-y-2">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl transition-all",
                        role === r.id
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-secondary border-2 border-transparent"
                      )}
                    >
                      <span className="font-medium text-foreground">{r.label}</span>
                      {role === r.id && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <ChevronRight className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleAddPartner}
                disabled={!email || submitting}
                className={cn(
                  "w-full py-4 gradient-primary rounded-xl text-primary-foreground font-semibold shadow-glow transition-all",
                  (!email || submitting) ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                )}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding...
                  </span>
                ) : (
                  'Add Partner'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Report Preview Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-background p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Report Preview</h2>
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-4">
                <WeeklyProgressReport
                  studentName={profile?.full_name || 'Law Student'}
                  university={profile?.university || undefined}
                  yearOfStudy={profile?.year_of_study || undefined}
                  weekStartDate={format(weekStart, 'MMM d')}
                  weekEndDate={format(weekEnd, 'MMM d, yyyy')}
                  stats={weeklyStats}
                />
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    handleShareReport();
                  }}
                  className="w-full mt-4 py-4 gradient-primary rounded-xl text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default PartnerPage;