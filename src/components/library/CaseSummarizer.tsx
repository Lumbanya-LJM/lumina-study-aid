import React, { useState } from 'react';
import { 
  Scale, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check,
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CaseSummarizerProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const CaseSummarizer: React.FC<CaseSummarizerProps> = ({ 
  onClose,
  isModal = false 
}) => {
  const { toast } = useToast();
  const [caseText, setCaseText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSummarize = async () => {
    if (!caseText.trim()) {
      toast({
        variant: "destructive",
        title: "No text provided",
        description: "Please paste a case to summarize.",
      });
      return;
    }

    setIsLoading(true);
    setSummary('');

    try {
      const { data, error } = await supabase.functions.invoke('summarize-case', {
        body: { caseText: caseText.trim() },
      });

      if (error) {
        console.error('Summarize error:', error);
        
        if (error.message?.includes('429')) {
          toast({
            variant: "destructive",
            title: "Rate Limited",
            description: "Too many requests. Please try again in a moment.",
          });
        } else if (error.message?.includes('402')) {
          toast({
            variant: "destructive",
            title: "Credits Required",
            description: "Please add credits to continue using AI features.",
          });
        } else {
          throw error;
        }
        return;
      }

      setSummary(data.summary || 'Unable to generate summary.');
    } catch (error) {
      console.error('Error summarizing case:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to summarize case. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Summary copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please select and copy manually.",
      });
    }
  };

  const clearAll = () => {
    setCaseText('');
    setSummary('');
  };

  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden",
      isModal && "max-h-[80vh] overflow-y-auto"
    )}>
      {/* Header */}
      <div className="gradient-primary p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-foreground">AI Case Summarizer</h2>
              <p className="text-xs text-primary-foreground/80">Get instant case summaries</p>
            </div>
          </div>
          {isModal && onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
            >
              <X className="w-5 h-5 text-primary-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Paste case text or judgment
          </label>
          <Textarea
            value={caseText}
            onChange={(e) => setCaseText(e.target.value)}
            placeholder="Paste the full case text, judgment, or key excerpts here...&#10;&#10;Tip: You can paste from ZambiaLII or any legal document."
            className="min-h-[200px] resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {caseText.length} characters • Recommended: 500-10,000 characters for best results
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSummarize}
            disabled={isLoading || !caseText.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Summarizing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Summarize Case
              </span>
            )}
          </Button>
          {(caseText || summary) && (
            <Button variant="outline" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary Output */}
      {summary && (
        <div className="px-5 pb-5">
          <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Case Summary</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="px-5 pb-5">
        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Tips for best results:</p>
            <ul className="space-y-0.5">
              <li>• Include the full judgment or key sections</li>
              <li>• AI summaries are for study purposes only</li>
              <li>• Always verify with original sources</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseSummarizer;
