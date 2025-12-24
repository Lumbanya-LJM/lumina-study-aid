import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, Award, Briefcase, Clock, Scale, Upload, FileText, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  'Other',
];

interface DocumentUpload {
  name: string;
  type: 'bachelors_degree' | 'laz_certificate' | 'other';
  file: File | null;
  customName?: string;
  url?: string;
}

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
    subjects: [] as string[],
    otherSubject: '',
    isEmployed: 'no' as 'yes' | 'no',
    timeFlexibility: '',
    preferredTeachingTimes: '',
    calledToBar: 'no' as 'yes' | 'no',
    yearsAtBar: '',
    motivation: ''
  });
  
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { name: "Bachelor's Degree (Required)", type: 'bachelors_degree', file: null },
    { name: "LAZ Practicing Certificate (If applicable)", type: 'laz_certificate', file: null },
  ]);
  
  const [otherQualifications, setOtherQualifications] = useState<DocumentUpload[]>([]);

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleFileChange = (index: number, file: File | null, isOther = false) => {
    if (isOther) {
      setOtherQualifications(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], file };
        return updated;
      });
    } else {
      setDocuments(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], file };
        return updated;
      });
    }
  };

  const addOtherQualification = () => {
    setOtherQualifications(prev => [...prev, { name: '', type: 'other', file: null, customName: '' }]);
  };

  const removeOtherQualification = (index: number) => {
    setOtherQualifications(prev => prev.filter((_, i) => i !== index));
  };

  const updateOtherQualificationName = (index: number, name: string) => {
    setOtherQualifications(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], customName: name };
      return updated;
    });
  };

  const uploadDocument = async (doc: DocumentUpload, userId: string): Promise<string | null> => {
    if (!doc.file) return null;
    
    const fileExt = doc.file.name.split('.').pop();
    const fileName = `${userId}/${doc.type}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('tutor-documents')
      .upload(fileName, doc.file);
      
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
    
    const { data } = supabase.storage.from('tutor-documents').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate subjects
    const actualSubjects = formData.subjects.filter(s => s !== 'Other');
    const hasOtherWithText = formData.subjects.includes('Other') && formData.otherSubject.trim();
    
    if (actualSubjects.length === 0 && !hasOtherWithText) {
      toast({
        title: 'Select Subjects',
        description: 'Please select at least one subject you can teach',
        variant: 'destructive'
      });
      return;
    }

    // Validate motivation word count
    if (countWords(formData.motivation) > 300) {
      toast({
        title: 'Motivation Too Long',
        description: 'Please keep your motivation under 300 words',
        variant: 'destructive'
      });
      return;
    }

    // Validate bachelor's degree upload
    if (!documents[0].file) {
      toast({
        title: 'Document Required',
        description: "Please upload your Bachelor's degree certificate",
        variant: 'destructive'
      });
      return;
    }
    
    const finalSubjects = [...actualSubjects];
    if (hasOtherWithText) {
      finalSubjects.push(formData.otherSubject.trim());
    }

    setLoading(true);
    try {
      // Upload all documents
      const uploadedDocs: Array<{ type: string; name: string; url: string }> = [];
      
      for (const doc of documents) {
        if (doc.file) {
          const url = await uploadDocument(doc, userId);
          if (url) {
            uploadedDocs.push({ type: doc.type, name: doc.name, url });
          }
        }
      }
      
      for (const doc of otherQualifications) {
        if (doc.file && doc.customName) {
          const url = await uploadDocument(doc, userId);
          if (url) {
            uploadedDocs.push({ type: 'other', name: doc.customName, url });
          }
        }
      }

      const { error } = await supabase
        .from('tutor_applications')
        .insert({
          user_id: userId,
          email: email,
          full_name: fullName,
          qualifications: formData.qualifications,
          experience: formData.experience,
          subjects: finalSubjects,
          status: 'pending',
          is_employed: formData.isEmployed === 'yes',
          time_flexibility: formData.timeFlexibility,
          preferred_teaching_times: formData.preferredTeachingTimes,
          called_to_bar: formData.calledToBar === 'yes',
          years_at_bar: formData.calledToBar === 'yes' && formData.yearsAtBar ? parseInt(formData.yearsAtBar) : null,
          motivation: formData.motivation,
          documents: uploadedDocs
        });

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('tutor-application-email', {
        body: {
          type: 'submitted',
          applicantName: fullName,
          applicantEmail: email,
          adminEmail: 'mulengalumbanya@gmail.com'
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
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Tutor Application</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete your application to become a Luminary tutor
        </p>
      </div>

      {/* Qualifications */}
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

      {/* Experience */}
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

      {/* Employment Status */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Are you currently employed?
        </Label>
        <RadioGroup
          value={formData.isEmployed}
          onValueChange={(value: 'yes' | 'no') => setFormData({ ...formData, isEmployed: value })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="employed-yes" />
            <Label htmlFor="employed-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="employed-no" />
            <Label htmlFor="employed-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Time Flexibility */}
      <div className="space-y-2">
        <Label htmlFor="timeFlexibility" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          How flexible are your times?
        </Label>
        <Select
          value={formData.timeFlexibility}
          onValueChange={(value) => setFormData({ ...formData, timeFlexibility: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select flexibility level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="very_flexible">Very Flexible - Available most times</SelectItem>
            <SelectItem value="somewhat_flexible">Somewhat Flexible - Some restrictions</SelectItem>
            <SelectItem value="limited">Limited - Specific hours only</SelectItem>
            <SelectItem value="weekends_only">Weekends Only</SelectItem>
            <SelectItem value="evenings_only">Evenings Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preferred Teaching Times */}
      <div className="space-y-2">
        <Label htmlFor="preferredTimes">When would you prefer to teach?</Label>
        <Textarea
          id="preferredTimes"
          placeholder="E.g., Weekday evenings 6-9pm, Saturday mornings..."
          value={formData.preferredTeachingTimes}
          onChange={(e) => setFormData({ ...formData, preferredTeachingTimes: e.target.value })}
          rows={2}
        />
      </div>

      {/* Called to Bar */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Scale className="w-4 h-4" />
          Have you been called to the bar?
        </Label>
        <RadioGroup
          value={formData.calledToBar}
          onValueChange={(value: 'yes' | 'no') => setFormData({ ...formData, calledToBar: value })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="bar-yes" />
            <Label htmlFor="bar-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="bar-no" />
            <Label htmlFor="bar-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Years at Bar */}
      {formData.calledToBar === 'yes' && (
        <div className="space-y-2">
          <Label htmlFor="yearsAtBar">How many years at the bar?</Label>
          <Input
            id="yearsAtBar"
            type="number"
            min="0"
            max="50"
            placeholder="Enter number of years"
            value={formData.yearsAtBar}
            onChange={(e) => setFormData({ ...formData, yearsAtBar: e.target.value })}
          />
        </div>
      )}

      {/* Motivation */}
      <div className="space-y-2">
        <Label htmlFor="motivation" className="flex items-center gap-2">
          Motivation for Tutoring
          <span className="text-xs text-muted-foreground">(300 words max)</span>
        </Label>
        <Textarea
          id="motivation"
          placeholder="What motivates you to become a tutor? Why do you want to teach law students?"
          value={formData.motivation}
          onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
          rows={4}
          required
        />
        <p className={`text-xs ${countWords(formData.motivation) > 300 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {countWords(formData.motivation)}/300 words
        </p>
      </div>

      {/* Subjects */}
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
        
        {formData.subjects.includes('Other') && (
          <div className="mt-3">
            <Input
              placeholder="Enter the subject you'd like to teach..."
              value={formData.otherSubject}
              onChange={(e) => setFormData({ ...formData, otherSubject: e.target.value })}
              className="w-full"
            />
          </div>
        )}
        
        {formData.subjects.length > 0 && (
          <p className="text-xs text-primary">
            {formData.subjects.filter(s => s !== 'Other').length + (formData.subjects.includes('Other') && formData.otherSubject.trim() ? 1 : 0)} subject(s) selected
          </p>
        )}
      </div>

      {/* Document Uploads */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Required Documents
        </Label>
        
        {documents.map((doc, index) => (
          <div key={doc.type} className="space-y-2">
            <Label className="text-sm font-normal">{doc.name}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                className="flex-1"
              />
              {doc.file && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {doc.file.name.slice(0, 20)}...
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Other Qualifications */}
        <div className="pt-2 border-t border-border/50">
          <Label className="text-sm">Other Relevant Qualifications</Label>
          <p className="text-xs text-muted-foreground mb-3">Add any other academic qualifications</p>
          
          {otherQualifications.map((doc, index) => (
            <div key={index} className="flex items-start gap-2 mb-3 p-3 bg-secondary/30 rounded-lg">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Name of qualification (e.g., Master's in Law)"
                  value={doc.customName}
                  onChange={(e) => updateOtherQualificationName(index, e.target.value)}
                />
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(index, e.target.files?.[0] || null, true)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOtherQualification(index)}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOtherQualification}
            className="w-full"
          >
            + Add Another Qualification
          </Button>
        </div>
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
