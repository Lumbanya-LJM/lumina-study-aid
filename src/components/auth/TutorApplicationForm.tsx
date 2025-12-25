import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, Award, Briefcase, Clock, Scale, Upload, FileText, X, Users, Check, Calendar, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

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

interface Course {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
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
    motivation: '',
    targetStudents: [] as ('university' | 'ziale')[],
    selectedUndergraduateCourses: [] as string[],
    selectedZialeCourses: [] as string[],
    dateOfBirth: '',
    sex: '' as 'male' | 'female' | '',
    agreePrivacyPolicy: false,
    agreeDataConsent: false,
  });
  
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { name: "Bachelor's Degree (Required)", type: 'bachelors_degree', file: null },
    { name: "LAZ Practicing Certificate (If applicable)", type: 'laz_certificate', file: null },
  ]);
  
  const [otherQualifications, setOtherQualifications] = useState<DocumentUpload[]>([]);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('academy_courses')
        .select('id, name, description, institution')
        .eq('is_active', true)
        .order('institution')
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(formData.dateOfBirth);

  // Course selection with constraints
  const undergraduateCourses = courses.filter(c => c.institution !== 'ZIALE');
  const zialeCourses = courses.filter(c => c.institution === 'ZIALE');

  const selectedUndergradCount = formData.selectedUndergraduateCourses.length;
  const selectedZialeCount = formData.selectedZialeCourses.length;
  const hasMixedSelection = selectedUndergradCount > 0 && selectedZialeCount > 0;

  // Determine max allowed based on selection pattern
  const getMaxUndergrad = () => {
    if (selectedZialeCount > 0) return 2; // Mixed: max 2 undergrad
    return 3; // Only undergrad: max 3
  };

  const getMaxZiale = () => {
    if (selectedUndergradCount > 0) return 1; // Mixed: max 1 ZIALE
    return 3; // Only ZIALE: max 3
  };

  const canSelectUndergrad = (courseId: string) => {
    if (formData.selectedUndergraduateCourses.includes(courseId)) return true;
    return selectedUndergradCount < getMaxUndergrad();
  };

  const canSelectZiale = (courseId: string) => {
    if (formData.selectedZialeCourses.includes(courseId)) return true;
    return selectedZialeCount < getMaxZiale();
  };

  const toggleUndergraduateCourse = (courseId: string) => {
    if (formData.selectedUndergraduateCourses.includes(courseId)) {
      setFormData(prev => ({
        ...prev,
        selectedUndergraduateCourses: prev.selectedUndergraduateCourses.filter(id => id !== courseId)
      }));
    } else if (canSelectUndergrad(courseId)) {
      setFormData(prev => ({
        ...prev,
        selectedUndergraduateCourses: [...prev.selectedUndergraduateCourses, courseId]
      }));
    }
  };

  const toggleZialeCourse = (courseId: string) => {
    if (formData.selectedZialeCourses.includes(courseId)) {
      setFormData(prev => ({
        ...prev,
        selectedZialeCourses: prev.selectedZialeCourses.filter(id => id !== courseId)
      }));
    } else if (canSelectZiale(courseId)) {
      setFormData(prev => ({
        ...prev,
        selectedZialeCourses: [...prev.selectedZialeCourses, courseId]
      }));
    }
  };

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
    
    // Validate consent
    if (!formData.agreePrivacyPolicy || !formData.agreeDataConsent) {
      toast({
        title: 'Consent Required',
        description: 'Please agree to the privacy policy and data consent to continue',
        variant: 'destructive'
      });
      return;
    }

    // Validate DOB
    if (!formData.dateOfBirth) {
      toast({
        title: 'Date of Birth Required',
        description: 'Please enter your date of birth',
        variant: 'destructive'
      });
      return;
    }

    // Validate sex
    if (!formData.sex) {
      toast({
        title: 'Sex Required',
        description: 'Please select your sex',
        variant: 'destructive'
      });
      return;
    }

    const totalSelectedCourses = formData.selectedUndergraduateCourses.length + formData.selectedZialeCourses.length;

    // Validate course selection
    if (totalSelectedCourses === 0) {
      toast({
        title: 'Select Courses',
        description: 'Please select at least one course you want to teach',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate target students
    if (formData.targetStudents.length === 0) {
      toast({
        title: 'Select Target Students',
        description: 'Please select at least one student category you want to teach',
        variant: 'destructive'
      });
      return;
    }

    // Validate bar admission for ZIALE tutors
    if ((formData.targetStudents.includes('ziale') || formData.selectedZialeCourses.length > 0) && formData.calledToBar !== 'yes') {
      toast({
        title: 'Bar Admission Required',
        description: 'You must be called to the bar to teach ZIALE students',
        variant: 'destructive'
      });
      return;
    }
    
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

    // Combine all selected courses
    const allSelectedCourses = [...formData.selectedUndergraduateCourses, ...formData.selectedZialeCourses];

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

      // Generate application ID (first 8 chars of UUID will be generated by DB)
      const { data: insertedApp, error } = await supabase
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
          documents: uploadedDocs,
          target_students: formData.targetStudents,
          selected_courses: allSelectedCourses,
          date_of_birth: formData.dateOfBirth,
          sex: formData.sex
        })
        .select('id')
        .single();

      if (error) throw error;

      // Get short application ID (first 8 characters of UUID)
      const applicationId = insertedApp?.id ? insertedApp.id.substring(0, 8).toUpperCase() : 'N/A';

      // Send email notification with application ID
      await supabase.functions.invoke('tutor-application-email', {
        body: {
          type: 'submitted',
          applicantName: fullName,
          applicantEmail: email,
          adminEmail: 'mulengalumbanya@gmail.com',
          applicationId: applicationId
        }
      });

      toast({
        title: 'Application Submitted!',
        description: `Your application ID is: ${applicationId}. Check your email for confirmation.`,
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

      {/* Personal Information */}
      <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <User className="w-4 h-4" />
          Personal Information
        </Label>
        
        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date of Birth
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            required
          />
          {age !== null && (
            <p className="text-xs text-muted-foreground">
              Age: {age} years old
            </p>
          )}
        </div>

        {/* Sex */}
        <div className="space-y-2">
          <Label>Sex</Label>
          <RadioGroup
            value={formData.sex}
            onValueChange={(value: 'male' | 'female') => setFormData({ ...formData, sex: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="sex-male" />
              <Label htmlFor="sex-male" className="cursor-pointer">Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="sex-female" />
              <Label htmlFor="sex-female" className="cursor-pointer">Female</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Courses to Teach */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Select Courses to Teach
        </Label>
        <p className="text-xs text-muted-foreground">
          Choose up to 3 courses from one category, or 1 ZIALE + 2 Undergraduate courses
        </p>
        
        {loadingCourses ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Undergraduate Courses Dropdown */}
            {undergraduateCourses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Undergraduate Courses</p>
                  <span className="text-xs text-muted-foreground">
                    {selectedUndergradCount}/{getMaxUndergrad()} selected
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg border border-border/50 bg-secondary/20">
                  {undergraduateCourses.map((course) => {
                    const isSelected = formData.selectedUndergraduateCourses.includes(course.id);
                    const canSelect = canSelectUndergrad(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => canSelect && toggleUndergraduateCourse(course.id)}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          isSelected 
                            ? "bg-primary/10 border-primary/50 cursor-pointer" 
                            : canSelect
                              ? "bg-secondary/50 border-border/50 hover:border-primary/30 cursor-pointer"
                              : "bg-muted/30 border-border/30 opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-medium text-foreground">{course.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ZIALE Courses Dropdown */}
            {zialeCourses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">ZIALE Courses</p>
                    <p className="text-xs text-muted-foreground">Requires bar admission to teach</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedZialeCount}/{getMaxZiale()} selected
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg border border-border/50 bg-secondary/20">
                  {zialeCourses.map((course) => {
                    const isSelected = formData.selectedZialeCourses.includes(course.id);
                    const canSelect = canSelectZiale(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => canSelect && toggleZialeCourse(course.id)}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          isSelected 
                            ? "bg-primary/10 border-primary/50 cursor-pointer" 
                            : canSelect
                              ? "bg-secondary/50 border-border/50 hover:border-primary/30 cursor-pointer"
                              : "bg-muted/30 border-border/30 opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-medium text-foreground">{course.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        
        {(selectedUndergradCount + selectedZialeCount) > 0 && (
          <p className="text-xs text-primary font-medium">
            {selectedUndergradCount + selectedZialeCount} course(s) selected
            {hasMixedSelection && " (Mixed selection: 1 ZIALE + 2 Undergrad max)"}
          </p>
        )}
      </div>

      {/* Target Students */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Who do you want to teach?
        </Label>
        <p className="text-xs text-muted-foreground">Select the student category you want to tutor</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <Checkbox
              id="target-university"
              checked={formData.targetStudents.includes('university')}
              onCheckedChange={(checked) => {
                setFormData(prev => ({
                  ...prev,
                  targetStudents: checked 
                    ? [...prev.targetStudents, 'university'] 
                    : prev.targetStudents.filter(t => t !== 'university')
                }));
              }}
            />
            <label htmlFor="target-university" className="cursor-pointer flex-1">
              <span className="font-medium">University Students</span>
              <p className="text-xs text-muted-foreground">LLB students at universities</p>
            </label>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <Checkbox
              id="target-ziale"
              checked={formData.targetStudents.includes('ziale')}
              onCheckedChange={(checked) => {
                setFormData(prev => ({
                  ...prev,
                  targetStudents: checked 
                    ? [...prev.targetStudents, 'ziale'] 
                    : prev.targetStudents.filter(t => t !== 'ziale')
                }));
              }}
            />
            <label htmlFor="target-ziale" className="cursor-pointer flex-1">
              <span className="font-medium">ZIALE Students</span>
              <p className="text-xs text-muted-foreground">Bar course students (requires bar admission)</p>
            </label>
          </div>
        </div>
        {(formData.targetStudents.includes('ziale') || formData.selectedZialeCourses.length > 0) && formData.calledToBar !== 'yes' && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <Scale className="w-3 h-3" />
            You must be called to the bar to teach ZIALE students
          </p>
        )}
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

      {/* Consent Checkboxes */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <Label className="text-sm font-medium">Terms & Consent</Label>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
          <Checkbox
            id="privacyPolicy"
            checked={formData.agreePrivacyPolicy}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, agreePrivacyPolicy: checked === true }))
            }
            className="mt-0.5"
          />
          <label htmlFor="privacyPolicy" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
            I agree to <span className="text-primary font-medium">Luminary Innovision Academy's Privacy Policy</span>
          </label>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
          <Checkbox
            id="dataConsent"
            checked={formData.agreeDataConsent}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, agreeDataConsent: checked === true }))
            }
            className="mt-0.5"
          />
          <label htmlFor="dataConsent" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
            I consent to the use of my personal data for educational purposes
          </label>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading || !formData.agreePrivacyPolicy || !formData.agreeDataConsent || (formData.selectedUndergraduateCourses.length + formData.selectedZialeCourses.length) === 0}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </span>
        ) : (
          'Submit Application'
        )}
      </Button>

      {(!formData.agreePrivacyPolicy || !formData.agreeDataConsent) && (
        <p className="text-xs text-center text-muted-foreground">
          Please agree to both policies to continue
        </p>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Your application will be reviewed by administrators. You'll receive a confirmation email with your application ID.
      </p>
    </form>
  );
};

export default TutorApplicationForm;
