import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ArrowLeft, Check, User, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import luminaAvatar from '@/assets/lumina-avatar.png';

type TabType = 'gender' | 'skin' | 'background';
type Gender = 'female' | 'male';

interface LuminaPreferences {
  gender: Gender;
  skin: number;
  background: number;
}

const CustomizeAvatarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('gender');
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<LuminaPreferences>({
    gender: 'female',
    skin: 0,
    background: 0,
  });

  useEffect(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem('lumina_preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing preferences:', e);
      }
    }
  }, []);

  const tabs = [
    { id: 'gender' as TabType, label: 'Gender' },
    { id: 'skin' as TabType, label: 'Appearance' },
    { id: 'background' as TabType, label: 'Background' },
  ];

  const genderOptions = [
    { id: 'female' as Gender, label: 'Female', description: 'Lumina presents as female', icon: UserRound },
    { id: 'male' as Gender, label: 'Male', description: 'Lumina presents as male', icon: User },
  ];

  const skinOptions = [
    { color: '#FCD5C0', label: 'Light' },
    { color: '#E8B89D', label: 'Light Medium' },
    { color: '#C99067', label: 'Medium' },
    { color: '#8B6652', label: 'Tan' },
    { color: '#5A3825', label: 'Deep' },
    { color: '#3D2314', label: 'Rich' },
  ];

  const backgroundOptions = [
    { color: '#F8FAFC', label: 'Clean White' },
    { color: '#E2E8F0', label: 'Light Grey' },
    { color: '#EFF6FF', label: 'Soft Blue' },
    { color: '#F0F9FF', label: 'Sky' },
    { color: '#FEFCE8', label: 'Warm Cream' },
    { color: '#FDF2F8', label: 'Blush' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save to localStorage
    localStorage.setItem('lumina_preferences', JSON.stringify(preferences));
    
    // Optionally save to database if user is logged in
    if (user) {
      try {
        // Could store in profiles table or a separate preferences table
        // For now, just using localStorage for quick access
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }
    
    toast({
      title: "Preferences Saved",
      description: `Lumina will now appear as ${preferences.gender === 'male' ? 'he' : 'she'} prefers!`,
    });
    
    setIsSaving(false);
    navigate(-1);
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-5 py-4 safe-top border-b border-border bg-background flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Customize Lumina</h1>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 gradient-primary rounded-xl text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Avatar Preview */}
        <div 
          className="flex-shrink-0 p-8 flex flex-col items-center transition-colors duration-300" 
          style={{ backgroundColor: backgroundOptions[preferences.background].color }}
        >
          <div className="relative w-48 h-48 rounded-3xl overflow-hidden shadow-xl border-4 border-background">
            <img
              src={luminaAvatar}
              alt="Lumina Avatar"
              className="w-full h-full object-cover"
            />
            {/* Gender indicator badge */}
            <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-medium shadow-lg">
              {preferences.gender === 'male' ? 'He/Him' : 'She/Her'}
            </div>
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">Lumina</p>
          <p className="text-sm text-muted-foreground">Your AI Study Companion</p>
        </div>

        {/* Customization Options */}
        <div className="flex-1 bg-background rounded-t-3xl -mt-4 relative z-10">
          {/* Tabs */}
          <div className="flex border-b border-border px-5 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 pb-3 text-sm font-medium transition-all border-b-2",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Options */}
          <div className="p-5">
            {activeTab === 'gender' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Choose how Lumina presents and how they will refer to themselves in conversations.
                </p>
                {genderOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setPreferences(prev => ({ ...prev, gender: option.id }))}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all",
                      preferences.gender === option.id
                        ? "gradient-primary text-primary-foreground shadow-glow"
                        : "bg-card border border-border hover:border-primary/30"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      preferences.gender === option.id
                        ? "bg-primary-foreground/20"
                        : "bg-secondary"
                    )}>
                      <option.icon className={cn(
                        "w-6 h-6",
                        preferences.gender === option.id
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn(
                        "font-semibold",
                        preferences.gender === option.id
                          ? "text-primary-foreground"
                          : "text-foreground"
                      )}>
                        {option.label}
                      </p>
                      <p className={cn(
                        "text-sm",
                        preferences.gender === option.id
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}>
                        {option.description}
                      </p>
                    </div>
                    {preferences.gender === option.id && (
                      <Check className="w-5 h-5 text-primary-foreground" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'skin' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {skinOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setPreferences(prev => ({ ...prev, skin: index }))}
                      className={cn(
                        "relative aspect-square rounded-2xl transition-all",
                        preferences.skin === index
                          ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
                          : "ring-1 ring-border hover:ring-2 hover:ring-primary/50"
                      )}
                      style={{ backgroundColor: option.color }}
                    >
                      {preferences.skin === index && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-5 h-5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Selected: {skinOptions[preferences.skin].label}
                </p>
              </>
            )}

            {activeTab === 'background' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {backgroundOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setPreferences(prev => ({ ...prev, background: index }))}
                      className={cn(
                        "relative aspect-square rounded-2xl transition-all",
                        preferences.background === index
                          ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
                          : "ring-1 ring-border hover:ring-2 hover:ring-primary/50"
                      )}
                      style={{ backgroundColor: option.color }}
                    >
                      {preferences.background === index && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-5 h-5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Selected: {backgroundOptions[preferences.background].label}
                </p>
              </>
            )}
          </div>

          {/* Info Card */}
          <div className="px-5 pb-8">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="text-sm text-foreground font-medium mb-1">Make Lumina yours</p>
              <p className="text-xs text-muted-foreground">
                Customize Lumina's appearance and identity to create a study companion that feels personal and supportive. 
                {preferences.gender === 'male' 
                  ? " Lumina will refer to himself with he/him pronouns." 
                  : " Lumina will refer to herself with she/her pronouns."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default CustomizeAvatarPage;
