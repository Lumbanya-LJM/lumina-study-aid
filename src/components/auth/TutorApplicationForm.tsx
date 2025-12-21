import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, Award, Briefcase } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const availableSubjects = [
  'Constitutional Law',
  'Criminal Law',
  'Contract Law',
  'Tort Law',
  'Property Law',
  'Administrative Law',
  'Company Law',
  'Family Law',
  'Evidence Law',
  'Legal Practice',
];

interface TutorApplicationFormProps {
  userId: string;
  email: string;
  fullName: string;
  onSuccess: () => void;
}

const TutorApplicationForm: React.FC<TutorApplicationFormProps> = ({
  userId,
  email,
  fullName,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    qualifications: '',
    experience: '',
    subjects: [] as string[]
  });

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.subjects.length === 0) {
      toast({
        title: 'Select Subjects',
        description: 'Please select at least one subject you can teach',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tutor_applications')
        .insert({
          user_id: userId,
          email: email,
          full_name: fullName,
          qualifications: formData.qualifications,
          experience: formData.experience,
          subjects: formData.subjects,
          status: 'pending'
        });

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('tutor-application-email', {
        body: {
          type: 'submitted',
          applicantName: fullName,
          applicantEmail: email
        }
      });

      toast({
        title: 'Application Submitted!',
        description: 'Your tutor application is pending admin review.',
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Tutor Application</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete your application to become a Luminary tutor
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualifications" className="flex items-center gap-2">
          <Award className="w-4 h-4" />
          Qualifications
        </Label>
        <Textarea
          id="qualifications"
          placeholder="List your educational qualifications, degrees, certifications..."
          value={formData.qualifications}
          onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience" className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Teaching Experience
        </Label>
        <Textarea
          id="experience"
          placeholder="Describe your teaching or legal practice experience..."
          value={formData.experience}
          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          rows={3}
          required
        />
      </div>

      <div className="space-y-3">
        <Label>Subjects You Can Teach</Label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {availableSubjects.map((subject) => (
            <div
              key={subject}
              className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
            >
              <Checkbox
                id={subject}
                checked={formData.subjects.includes(subject)}
                onCheckedChange={() => toggleSubject(subject)}
              />
              <label
                htmlFor={subject}
                className="text-sm cursor-pointer flex-1"
              >
                {subject}
              </label>
            </div>
          ))}
        </div>
        {formData.subjects.length > 0 && (
          <p className="text-xs text-primary">
            {formData.subjects.length} subject(s) selected
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </span>
        ) : (
          'Submit Application'
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your application will be reviewed by administrators. You'll be notified once approved.
      </p>
    </form>
  );
};

export default TutorApplicationForm;
