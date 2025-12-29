import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, Award, Briefcase, Clock, Upload, FileText, X, Users, Check, Calendar, User, Scale, Heart, GraduationCap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { LMVSchool, getSchoolConfig, getSchoolIcon, getDisciplineText, SCHOOL_CONFIGS } from '@/config/schools';
import { getStoredSchool } from '@/hooks/useSchoolTheme';

interface DocumentUpload {
  name: string;
  type: string;
  file: File | null;
  customName?: string;
  url?: string;
  required: boolean;
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
  const [selectedSchool, setSelectedSchool] = useState<LMVSchool>(() => getStoredSchool());
  
  const schoolConfig = getSchoolConfig(selectedSchool);
  const SchoolIcon = getSchoolIcon(selectedSchool);
  const disciplineTexts = getDisciplineText(selectedSchool);
  
  const [formData, setFormData] = useState({
    qualifications: '',
    experience: '',
    subjects: [] as string[],
    otherSubject: '',
    isEmployed: 'no' as 'yes' | 'no',
    timeFlexibility: '',
    preferredTeachingTimes: '',
    motivation: '',
    targetStudents: [] as string[],
    selectedCourses: [] as string[],
    dateOfBirth: '',
    sex: '' as 'male' | 'female' | '',
    agreePrivacyPolicy: false,
    agreeDataConsent: false,
    // Discipline-specific fields (Law)
    calledToBar: 'no' as 'yes' | 'no',
    yearsAtBar: '',
    practiceArea: '',
    // Discipline-specific fields (Business)
    industryExperience: '',
    businessSpecialty: '',
    professionalCertifications: '',
    // Discipline-specific fields (Health)
    healthDiscipline: '',
    clinicalExperience: '',
    professionalRegistration: '',
  });
  
  // Initialize documents based on school
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [otherQualifications, setOtherQualifications] = useState<DocumentUpload[]>([]);

  // Update documents when school changes
  useEffect(() => {
    const docTypes = schoolConfig.tutorApplication.documentTypes;
    setDocuments(docTypes.map(doc => ({
      name: doc.name,
      type: doc.id,
      file: null,
      required: doc.required,
    })));
  }, [selectedSchool]);

  // Load courses on mount and when school changes
  useEffect(() => {
    loadCourses();
  }, [selectedSchool]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('academy_courses')
        .select('id, name, description, institution')
        .eq('is_active', true)
        .eq('school', selectedSchool)
        .order('institution')
        .order('name');

      if (error) throw error;
      setCourses(data || []);
      // Clear selected courses when school changes
      setFormData(prev => ({ ...prev, selectedCourses: [], targetStudents: [] }));
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

  // Course selection
  const selectedCourseCount = formData.selectedCourses.length;
  const maxCourses = 3;

  const toggleCourse = (courseId: string) => {
    if (formData.selectedCourses.includes(courseId)) {
      setFormData(prev => ({
        ...prev,
        selectedCourses: prev.selectedCourses.filter(id => id !== courseId)
      }));
    } else if (selectedCourseCount < maxCourses) {
      setFormData(prev => ({
        ...prev,
        selectedCourses: [...prev.selectedCourses, courseId]
      }));
    }
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
    setOtherQualifications(prev => [...prev, { name: '', type: 'other', file: null, customName: '', required: false }]);
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

  // Check if law-specific credentials are required
  const requiresBarAdmission = () => {
    if (selectedSchool !== 'law') return false;
    // Check if any selected target students require bar admission
    return formData.targetStudents.some(cat => {
      const category = schoolConfig.tutorApplication.targetStudentCategories.find(c => c.id === cat);
      return category?.requiresCredential === 'calledToBar';
    });
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

    // Validate course selection
    if (formData.selectedCourses.length === 0) {
      toast({
        title: 'Select Courses',
        description: 'Please select at least one course you want to teach',
        variant: 'destructive'
      });
      return;
    }

    // Validate bar admission for Law tutors teaching ZIALE
    if (requiresBarAdmission() && formData.calledToBar !== 'yes') {
      toast({
        title: 'Bar Admission Required',
        description: 'You must be called to the bar to teach bar course students',
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

    // Validate required documents
    const requiredDocs = documents.filter(d => d.required);
    const missingDocs = requiredDocs.filter(d => !d.file);
    if (missingDocs.length > 0) {
      toast({
        title: 'Document Required',
        description: `Please upload: ${missingDocs.map(d => d.name).join(', ')}`,
        variant: 'destructive'
      });
      return;
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

      // Prepare discipline-specific data
      const disciplineData: Record<string, any> = {};
      if (selectedSchool === 'law') {
        disciplineData.called_to_bar = formData.calledToBar === 'yes';
        disciplineData.years_at_bar = formData.calledToBar === 'yes' && formData.yearsAtBar ? parseInt(formData.yearsAtBar) : null;
      }

      const { data: insertedApp, error } = await supabase
        .from('tutor_applications')
        .insert({
          user_id: userId,
          email: email,
          full_name: fullName,
          qualifications: formData.qualifications,
          experience: formData.experience,
          subjects: [],
          status: 'pending',
          is_employed: formData.isEmployed === 'yes',
          time_flexibility: formData.timeFlexibility,
          preferred_teaching_times: formData.preferredTeachingTimes,
          motivation: formData.motivation,
          documents: uploadedDocs,
          target_students: formData.targetStudents,
          selected_courses: formData.selectedCourses,
          date_of_birth: formData.dateOfBirth,
          sex: formData.sex,
          ...disciplineData,
        })
        .select('id')
        .single();

      if (error) throw error;

      const applicationId = insertedApp?.id ? insertedApp.id.substring(0, 8).toUpperCase() : 'N/A';

      // Send email notification
      await supabase.functions.invoke('tutor-application-email', {
        body: {
          type: 'submitted',
          applicantName: fullName,
          applicantEmail: email,
          adminEmail: 'mulengalumbanya@gmail.com',
          applicationId: applicationId,
          school: selectedSchool,
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

  // Render discipline-specific fields
  const renderDisciplineFields = () => {
    if (selectedSchool === 'law') {
      return (
        <>
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

          {formData.calledToBar === 'yes' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="yearsAtBar">Years at the bar</Label>
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
              <div className="space-y-2">
                <Label htmlFor="practiceArea">Primary practice area</Label>
                <Select
                  value={formData.practiceArea}
                  onValueChange={(value) => setFormData({ ...formData, practiceArea: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select practice area" />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolConfig.tutorApplication.fields.find(f => f.id === 'practiceArea')?.options?.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </>
      );
    }

    if (selectedSchool === 'business') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="businessSpecialty">Business specialty</Label>
            <Select
              value={formData.businessSpecialty}
              onValueChange={(value) => setFormData({ ...formData, businessSpecialty: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your specialty" />
              </SelectTrigger>
              <SelectContent>
                {schoolConfig.tutorApplication.fields.find(f => f.id === 'businessSpecialty')?.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="industryExperience">Industry experience (years)</Label>
            <Input
              id="industryExperience"
              type="number"
              min="0"
              max="50"
              placeholder="Years of industry experience"
              value={formData.industryExperience}
              onChange={(e) => setFormData({ ...formData, industryExperience: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="professionalCertifications">Professional certifications</Label>
            <Textarea
              id="professionalCertifications"
              placeholder="E.g., CA, ACCA, CFA, CPA, etc."
              value={formData.professionalCertifications}
              onChange={(e) => setFormData({ ...formData, professionalCertifications: e.target.value })}
              rows={2}
            />
          </div>
        </>
      );
    }

    if (selectedSchool === 'health') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="healthDiscipline">Health discipline</Label>
            <Select
              value={formData.healthDiscipline}
              onValueChange={(value) => setFormData({ ...formData, healthDiscipline: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your discipline" />
              </SelectTrigger>
              <SelectContent>
                {schoolConfig.tutorApplication.fields.find(f => f.id === 'healthDiscipline')?.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicalExperience">Clinical experience (years)</Label>
            <Input
              id="clinicalExperience"
              type="number"
              min="0"
              max="50"
              placeholder="Years of clinical experience"
              value={formData.clinicalExperience}
              onChange={(e) => setFormData({ ...formData, clinicalExperience: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="professionalRegistration">Professional registration body</Label>
            <Input
              id="professionalRegistration"
              placeholder="E.g., HPCZ, Nursing Council of Zambia"
              value={formData.professionalRegistration}
              onChange={(e) => setFormData({ ...formData, professionalRegistration: e.target.value })}
            />
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 w-full max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className={cn(
          "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center",
          "bg-gradient-to-br from-primary to-primary/70"
        )}>
          <SchoolIcon className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Tutor Application</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Apply to become a {schoolConfig.name} tutor
        </p>
      </div>

      {/* School Selection */}
      <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <GraduationCap className="w-4 h-4" />
          Select Your Discipline
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(SCHOOL_CONFIGS).map((school) => {
            const Icon = getSchoolIcon(school.id);
            const isSelected = selectedSchool === school.id;
            return (
              <button
                key={school.id}
                type="button"
                onClick={() => setSelectedSchool(school.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all flex flex-col items-center gap-2",
                  isSelected 
                    ? "bg-primary/10 border-primary/50" 
                    : "bg-secondary/50 border-border/50 hover:border-primary/30"
                )}
              >
                <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                  {school.name.replace('LMV ', '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Personal Information */}
      <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <User className="w-4 h-4" />
          Personal Information
        </Label>
        
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
            <p className="text-xs text-muted-foreground">Age: {age} years old</p>
          )}
        </div>

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
          Choose up to {maxCourses} courses from {schoolConfig.name}
        </p>
        
        {loadingCourses ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No courses available for {schoolConfig.name} yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 rounded-lg border border-border/50 bg-secondary/20">
            {courses.map((course) => {
              const isSelected = formData.selectedCourses.includes(course.id);
              const canSelect = isSelected || selectedCourseCount < maxCourses;
              return (
                <div
                  key={course.id}
                  onClick={() => canSelect && toggleCourse(course.id)}
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
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">{course.name}</span>
                      {course.institution && (
                        <span className="text-xs text-muted-foreground ml-2">({course.institution})</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {selectedCourseCount > 0 && (
          <p className="text-xs text-primary font-medium">
            {selectedCourseCount} course(s) selected
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
          {schoolConfig.tutorApplication.targetStudentCategories.map((category) => (
            <div key={category.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Checkbox
                id={`target-${category.id}`}
                checked={formData.targetStudents.includes(category.id)}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({
                    ...prev,
                    targetStudents: checked 
                      ? [...prev.targetStudents, category.id] 
                      : prev.targetStudents.filter(t => t !== category.id)
                  }));
                }}
              />
              <label htmlFor={`target-${category.id}`} className="cursor-pointer flex-1">
                <span className="font-medium">{category.label}</span>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </label>
            </div>
          ))}
        </div>
        {requiresBarAdmission() && formData.calledToBar !== 'yes' && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <Scale className="w-3 h-3" />
            You must be called to the bar to teach bar course students
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
          placeholder={disciplineTexts.qualificationsPlaceholder}
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
          placeholder={disciplineTexts.experiencePlaceholder}
          value={formData.experience}
          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          rows={3}
          required
        />
      </div>

      {/* Discipline-Specific Fields */}
      <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <SchoolIcon className="w-4 h-4" />
          {schoolConfig.name} Specific
        </Label>
        {renderDisciplineFields()}
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

      {/* Motivation */}
      <div className="space-y-2">
        <Label htmlFor="motivation" className="flex items-center gap-2">
          Motivation for Tutoring
          <span className="text-xs text-muted-foreground">(300 words max)</span>
        </Label>
        <Textarea
          id="motivation"
          placeholder={disciplineTexts.motivationPlaceholder}
          value={formData.motivation}
          onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
          rows={4}
          required
        />
        <p className={`text-xs ${countWords(formData.motivation) > 300 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {countWords(formData.motivation)}/300 words
        </p>
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
                  placeholder="Name of qualification"
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
        disabled={loading || !formData.agreePrivacyPolicy || !formData.agreeDataConsent || formData.selectedCourses.length === 0}
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
