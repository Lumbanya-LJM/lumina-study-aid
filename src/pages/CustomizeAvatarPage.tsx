import React, { useState } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import luminaAvatar from '@/assets/lumina-avatar.png';

type TabType = 'skin' | 'hair' | 'outfit' | 'background';

const CustomizeAvatarPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('skin');
  const [selections, setSelections] = useState({
    skin: 0,
    hair: 0,
    outfit: 0,
    background: 0,
  });

  const tabs = [
    { id: 'skin' as TabType, label: 'Skin Tone' },
    { id: 'hair' as TabType, label: 'Hair' },
    { id: 'outfit' as TabType, label: 'Outfit' },
    { id: 'background' as TabType, label: 'Background' },
  ];

  const options = {
    skin: [
      { color: '#FCD5C0', label: 'Light' },
      { color: '#E8B89D', label: 'Light Medium' },
      { color: '#C99067', label: 'Medium' },
      { color: '#8B6652', label: 'Tan' },
      { color: '#5A3825', label: 'Deep' },
      { color: '#3D2314', label: 'Rich' },
    ],
    hair: [
      { color: '#1C1C1C', label: 'Black' },
      { color: '#4A3728', label: 'Dark Brown' },
      { color: '#8B4513', label: 'Auburn' },
      { color: '#D4A574', label: 'Blonde' },
      { color: '#8B7355', label: 'Light Brown' },
      { color: '#2C2C2C', label: 'Charcoal' },
    ],
    outfit: [
      { color: '#1E3A5F', label: 'Navy Blazer' },
      { color: '#2C3E50', label: 'Charcoal Suit' },
      { color: '#34495E', label: 'Steel Grey' },
      { color: '#1A1A2E', label: 'Midnight' },
      { color: '#2D4A3E', label: 'Forest Green' },
      { color: '#3D2914', label: 'Mahogany' },
    ],
    background: [
      { color: '#F8FAFC', label: 'Clean White' },
      { color: '#E2E8F0', label: 'Light Grey' },
      { color: '#EFF6FF', label: 'Soft Blue' },
      { color: '#F0F9FF', label: 'Sky' },
      { color: '#FEFCE8', label: 'Warm Cream' },
      { color: '#FDF2F8', label: 'Blush' },
    ],
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
            onClick={() => navigate(-1)}
            className="px-4 py-2 gradient-primary rounded-xl text-sm font-medium text-primary-foreground"
          >
            Save
          </button>
        </div>

        {/* Avatar Preview */}
        <div className="flex-shrink-0 p-8 flex flex-col items-center" style={{ backgroundColor: options.background[selections.background].color }}>
          <div className="w-48 h-48 rounded-3xl overflow-hidden shadow-xl border-4 border-background">
            <img
              src={luminaAvatar}
              alt="Lumina Avatar"
              className="w-full h-full object-cover"
            />
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

          {/* Options Grid */}
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              {options[activeTab].map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelections(prev => ({ ...prev, [activeTab]: index }))}
                  className={cn(
                    "relative aspect-square rounded-2xl transition-all",
                    selections[activeTab] === index
                      ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
                      : "ring-1 ring-border hover:ring-2 hover:ring-primary/50"
                  )}
                  style={{ backgroundColor: option.color }}
                >
                  {selections[activeTab] === index && (
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
              Selected: {options[activeTab][selections[activeTab]].label}
            </p>
          </div>

          {/* Info Card */}
          <div className="px-5 pb-8">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="text-sm text-foreground font-medium mb-1">Make Lumina yours</p>
              <p className="text-xs text-muted-foreground">
                Customize Lumina's appearance to create a study buddy that feels personal and supportive. Your preferences are saved automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default CustomizeAvatarPage;