import React, { useState } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ArrowLeft, UserPlus, Mail, Flame, Target, Clock, ChevronRight, X, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Partner {
  id: string;
  name: string;
  email: string;
  role: 'parent' | 'mentor' | 'friend';
  status: 'active' | 'pending';
}

const PartnerPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'parent' | 'mentor' | 'friend'>('parent');

  const partners: Partner[] = [
    { id: '1', name: 'Sarah Johnson', email: 'sarah@email.com', role: 'parent', status: 'active' },
  ];

  const weeklyStats = [
    { icon: Flame, label: 'Study Streak', value: '12 days' },
    { icon: Clock, label: 'Total Hours', value: '24.5 hrs' },
    { icon: Target, label: 'Tasks Completed', value: '47/52' },
  ];

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

          {/* Partners List */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-3">Your Partners</h3>
            
            {partners.length > 0 ? (
              <div className="space-y-3">
                {partners.map((partner) => (
                  <div key={partner.id} className="bg-card rounded-2xl p-4 border border-border/50 shadow-card">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                        {partner.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{partner.name}</p>
                        <p className="text-xs text-muted-foreground">{partner.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full capitalize">
                          {partner.role}
                        </span>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        partner.status === 'active' 
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      )}>
                        {partner.status === 'active' ? 'Active' : 'Pending'}
                      </span>
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
              <h3 className="font-semibold text-foreground">Weekly Report Preview</h3>
              <button className="flex items-center gap-1 text-primary text-sm font-medium">
                <Share2 className="w-4 h-4" />
                Share Now
              </button>
            </div>
            
            <div className="bg-card rounded-2xl border border-border/50 shadow-card p-4">
              <p className="text-xs text-muted-foreground mb-4">
                This report is automatically sent to your partners every Monday
              </p>
              <div className="space-y-3">
                {weeklyStats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <stat.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="flex-1 text-sm text-muted-foreground">{stat.label}</span>
                    <span className="font-semibold text-foreground">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
                onClick={() => setShowAddModal(false)}
                className="w-full py-4 gradient-primary rounded-xl text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-opacity"
              >
                Send Invitation
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default PartnerPage;