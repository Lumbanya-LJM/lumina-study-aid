import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, User, GraduationCap, Briefcase, BookOpen, X, Plus } from 'lucide-react';

interface TutorProfile {
  full_name: string | null;
  bio: string | null;
  qualifications: string | null;
  experience: string | null;
  subjects: string[] | null;
  university: string | null;
}

const commonSubjects = [
  'Constitutional Law',
  'Criminal Law',
  'Contract Law',
  'Tort Law',
  'Property Law',
  'Administrative Law',
  'Company Law',
  'Family Law',
  'Labour Law',
  'Land Law',
  'Equity & Trusts',
  'Evidence',
  'Civil Procedure',
  'Criminal Procedure'
];

export const TutorProfileEditor: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [experience, setExperience] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [university, setUniversity] = useState('');
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, bio, qualifications, experience, subjects, university')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setFullName(data.full_name || '');
        setBio(data.bio || '');
        setQualifications(data.qualifications || '');
        setExperience(data.experience || '');
        setSubjects(data.subjects || []);
        setUniversity(data.university || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load profile data.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!fullName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name Required',
        description: 'Please enter your full name.'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          bio: bio.trim() || null,
          qualifications: qualifications.trim() || null,
          experience: experience.trim() || null,
          subjects: subjects.length > 0 ? subjects : null,
          university: university.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your tutor profile has been saved successfully.'
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your profile. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const addSubject = (subject: string) => {
    if (subject && !subjects.includes(subject)) {
      setSubjects([...subjects, subject]);
    }
    setNewSubject('');
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Your public tutor profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="university">Institution / University</Label>
              <Input
                id="university"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g., University of Zambia"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell students about yourself, your teaching style, and what makes you a great tutor..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Qualifications
          </CardTitle>
          <CardDescription>Your academic and professional credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qualifications">Degrees & Certifications</Label>
            <Textarea
              id="qualifications"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="e.g., LLB (University of Zambia), Advocate of the High Court..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Teaching Experience
          </CardTitle>
          <CardDescription>Your relevant teaching and professional experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="experience">Experience Details</Label>
            <Textarea
              id="experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Describe your teaching experience, years of practice, notable achievements..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Subjects You Teach
          </CardTitle>
          <CardDescription>Select or add the subjects you can teach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Subjects */}
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <Badge key={subject} variant="secondary" className="gap-1 pr-1">
                  {subject}
                  <button
                    onClick={() => removeSubject(subject)}
                    className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Common Subjects */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {commonSubjects
                .filter(s => !subjects.includes(s))
                .slice(0, 8)
                .map((subject) => (
                  <Badge
                    key={subject}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => addSubject(subject)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {subject}
                  </Badge>
                ))}
            </div>
          </div>

          {/* Custom Subject */}
          <div className="flex gap-2">
            <Input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Add a custom subject..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSubject(newSubject);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addSubject(newSubject)}
              disabled={!newSubject.trim()}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-4 z-10">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full gradient-primary text-primary-foreground shadow-lg"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
