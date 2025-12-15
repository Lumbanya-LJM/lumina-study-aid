import React from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ArrowLeft, Mail, MessageCircle, ExternalLink, FileText, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SupportPage: React.FC = () => {
  const navigate = useNavigate();

  const supportOptions = [
    {
      icon: MessageCircle,
      title: 'Chat with Lumina',
      description: 'Get instant help from your AI study buddy',
      action: () => navigate('/chat'),
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'support@luminarystudy.com',
      action: () => window.open('mailto:support@luminarystudy.com'),
    },
    {
      icon: FileText,
      title: 'FAQs',
      description: 'Find answers to common questions',
      action: () => {},
    },
    {
      icon: ExternalLink,
      title: 'Terms of Service',
      description: 'Read our terms and conditions',
      action: () => {},
    },
    {
      icon: ExternalLink,
      title: 'Privacy Policy',
      description: 'Learn how we protect your data',
      action: () => {},
    },
  ];

  return (
    <MobileLayout showNav={false}>
      <div className="py-6 safe-top">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Help & Support</h1>
        </div>

        {/* Help Card */}
        <div className="gradient-primary rounded-2xl p-5 mb-6 shadow-glow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-foreground">Need Help?</h2>
              <p className="text-sm text-primary-foreground/80">We're here to assist you</p>
            </div>
          </div>
        </div>

        {/* Support Options */}
        <div className="space-y-3">
          {supportOptions.map((option, index) => (
            <button
              key={index}
              onClick={option.action}
              className="w-full bg-card rounded-2xl p-4 border border-border/50 shadow-card flex items-center gap-4 hover:shadow-premium transition-all text-left"
            >
              <div className="p-3 rounded-xl bg-primary/10">
                <option.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{option.title}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Luminary Study v1.0.0
        </p>
      </div>
    </MobileLayout>
  );
};

export default SupportPage;
