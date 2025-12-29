import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Check, 
  X, 
  Clock, 
  User, 
  Mail, 
  Award, 
  Briefcase, 
  BookOpen,
  ArrowLeft,
  Loader2,
  AlertCircle,
  GraduationCap,
  Calendar,
  ChevronDown,
  ChevronUp,
  Settings,
  Save,
  UserPlus,
  Search
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Course {
  id: string;
  name: string;
  institution: string | null;
}

interface TutorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  qualifications: string | null;
  experience: string | null;
  subjects: string[] | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  selected_courses: string[] | null;
  date_of_birth: string | null;
  sex: string | null;
}

const TutorApplicationsAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<string | null>(null);
  
  // Course assignment modal state
  const [editingCourses, setEditingCourses] = useState<TutorApplication | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [savingCourses, setSavingCourses] = useState(false);
  
  // Direct add tutor modal state
  const [showAddTutorModal, setShowAddTutorModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [addTutorCourses, setAddTutorCourses] = useState<string[]>([]);
  const [addingTutor, setAddingTutor] = useState(false);
  const [noUserFound, setNoUserFound] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadApplications();
      loadCourses();
    }
  }, [isAdmin]);

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('academy_courses')
        .select('id, name, institution')
        .eq('is_active', true);

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  // Note: selected_courses stores course names, not UUIDs
  // Categorize courses by whether they're professional/postgraduate vs university level
  const getCoursesByNames = (courseNames: string[] | null) => {
    if (!courseNames || courseNames.length === 0) return { undergraduate: [], professional: [] };
    
    const selectedCourses = courses.filter(c => courseNames.includes(c.name));
    // Professional institutions: ZIALE (Law), ZICPA (Business), Medical/Nursing School (Health)
    const professionalInstitutions = ['ZIALE', 'ZICPA', 'Medical School', 'Nursing School'];
    return {
      undergraduate: selectedCourses.filter(c => !professionalInstitutions.includes(c.institution || '')),
      professional: selectedCourses.filter(c => professionalInstitutions.includes(c.institution || ''))
    };
  };

  const calculateAge = (dob: string | null): number | null => {
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

  // Generate a random temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleApprove = async (application: TutorApplication) => {
    setProcessingId(application.id);
    try {
      // Generate temporary password
      const temporaryPassword = generateTempPassword();
      
      // Update application status
      const { error: updateError } = await supabase
        .from('tutor_applications')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Grant moderator role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: application.user_id,
          role: 'moderator'
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Send push notification
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: application.user_id,
          payload: {
            title: 'Application Approved! 🎉',
            body: 'Your tutor application has been approved. Check your email for login credentials!',
            tag: 'tutor-approval'
          }
        }
      });

      // Send email notification with temporary password
      await supabase.functions.invoke('tutor-application-email', {
        body: {
          type: 'approved',
          applicantName: application.full_name,
          applicantEmail: application.email,
          temporaryPassword: temporaryPassword
        }
      });

      toast({
        title: 'Tutor Approved',
        description: `${application.full_name} is now a tutor. Login credentials sent via email.`,
      });

      loadApplications();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve application',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      const application = applications.find(a => a.id === applicationId);
      
      const { error } = await supabase
        .from('tutor_applications')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'Application not approved at this time'
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Send notifications
      if (application) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: application.user_id,
            payload: {
              title: 'Application Update',
              body: 'Your tutor application has been reviewed. Please check your account for details.',
              tag: 'tutor-rejection'
            }
          }
        });

        // Send email notification
        await supabase.functions.invoke('tutor-application-email', {
          body: {
            type: 'rejected',
            applicantName: application.full_name,
            applicantEmail: application.email,
            rejectionReason: rejectionReason || undefined
          }
        });
      }

      toast({
        title: 'Application Rejected',
        description: 'The applicant has been notified',
      });
      
      setShowRejectModal(null);
      setRejectionReason('');
      loadApplications();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject application',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openCourseEditor = (application: TutorApplication) => {
    setEditingCourses(application);
    // Convert existing course names to the same format for display
    setSelectedCourseIds(application.selected_courses || []);
  };

  const handleSaveCourses = async () => {
    if (!editingCourses) return;
    
    setSavingCourses(true);
    try {
      // IMPORTANT: Save course NAMES, not IDs - the system uses name-based matching
      const selectedCourseNames = courses
        .filter(course => selectedCourseIds.includes(course.name))
        .map(course => course.name);
      
      const { error } = await supabase
        .from('tutor_applications')
        .update({ selected_courses: selectedCourseNames })
        .eq('id', editingCourses.id);

      if (error) throw error;

      toast({
        title: 'Courses Updated',
        description: `${editingCourses.full_name}'s courses have been updated.`,
      });

      setEditingCourses(null);
      loadApplications();
    } catch (error: any) {
      console.error('Error updating courses:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update courses',
        variant: 'destructive'
      });
    } finally {
      setSavingCourses(false);
    }
  };

  // Toggle by course NAME for proper syncing
  const toggleCourseSelection = (courseName: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseName)
        ? prev.filter(name => name !== courseName)
        : [...prev, courseName]
    );
  };

  const searchUserByEmail = async () => {
    if (!searchEmail.trim()) return;
    
    setSearchingUser(true);
    setNoUserFound(false);
    setFoundUser(null);
    
    try {
      // First check if there's an existing tutor application with this email
      const { data: existingApps } = await supabase
        .from('tutor_applications')
        .select('user_id, email, full_name')
        .ilike('email', `%${searchEmail.trim()}%`)
        .limit(5);

      if (existingApps && existingApps.length > 0) {
        const app = existingApps[0];
        setFoundUser({
          id: app.user_id,
          email: app.email,
          full_name: app.full_name
        });
        return;
      }

      // Search in profiles by name
      const { data: profilesByName } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .ilike('full_name', `%${searchEmail.trim()}%`)
        .limit(5);

      if (profilesByName && profilesByName.length > 0) {
        const profile = profilesByName[0];
        setFoundUser({
          id: profile.user_id,
          email: searchEmail.trim(), // Use search term as email hint
          full_name: profile.full_name
        });
        return;
      }

      // No user found, show manual entry option
      setNoUserFound(true);
    } catch (error) {
      console.error('Error searching user:', error);
      setNoUserFound(true);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleAddTutorDirectly = async () => {
    const userId = foundUser?.id;
    const userEmail = manualEntry ? manualEmail.trim() : foundUser?.email;
    const userName = manualEntry ? manualName.trim() : foundUser?.full_name;
    
    if (!userEmail) {
      toast({
        title: 'Email Required',
        description: 'Please provide the tutor email.',
        variant: 'destructive'
      });
      return;
    }
    
    setAddingTutor(true);
    try {
      // For manual entry without a found user, we need to create a placeholder
      if (manualEntry && !userId) {
        // Create tutor application record without user_id link (they'll need to register)
        // For now, we require the user to exist in the system
        toast({
          title: 'User Not Found',
          description: 'Please search for an existing user or ask them to sign up first.',
          variant: 'destructive'
        });
        setAddingTutor(false);
        return;
      }

      if (!userId) {
        toast({
          title: 'Error',
          description: 'Please select a user first.',
          variant: 'destructive'
        });
        setAddingTutor(false);
        return;
      }

      // Check if already a tutor
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'moderator')
        .maybeSingle();

      if (existingRole) {
        toast({
          title: 'Already a Tutor',
          description: `${userName || userEmail} is already a tutor.`,
          variant: 'destructive'
        });
        setAddingTutor(false);
        return;
      }

      // Create or update tutor application record
      const { data: existingApp } = await supabase
        .from('tutor_applications')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingApp) {
        // Update existing application
        await supabase
          .from('tutor_applications')
          .update({
            status: 'approved',
            selected_courses: addTutorCourses,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', existingApp.id);
      } else {
        // Create new application record marked as approved
        await supabase
          .from('tutor_applications')
          .insert({
            user_id: userId,
            email: userEmail,
            full_name: userName || 'Tutor',
            status: 'approved',
            selected_courses: addTutorCourses,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString()
          });
      }

      // Grant moderator role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'moderator'
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      toast({
        title: 'Tutor Added',
        description: `${userName || userEmail} has been added as a tutor with ${addTutorCourses.length} course(s).`,
      });

      // Reset and close modal
      setShowAddTutorModal(false);
      setSearchEmail('');
      setFoundUser(null);
      setAddTutorCourses([]);
      setManualEntry(false);
      setManualName('');
      setManualEmail('');
      loadApplications();
    } catch (error: any) {
      console.error('Error adding tutor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add tutor',
        variant: 'destructive'
      });
    } finally {
      setAddingTutor(false);
    }
  };

  const toggleAddTutorCourse = (courseId: string) => {
    setAddTutorCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const navigate = useNavigate();

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  
  // Separate courses by institution type
  const professionalInstitutions = ['ZIALE', 'ZICPA', 'Medical School', 'Nursing School'];
  const undergraduateCourses = courses.filter(c => !professionalInstitutions.includes(c.institution || ''));
  const professionalCourses = courses.filter(c => professionalInstitutions.includes(c.institution || ''));

  return (
    <AdminLayout
      title="Tutor Management"
      subtitle={`${pendingCount} pending · ${approvedCount} approved`}
      mobileTitle="Tutors"
      showSidebar={false}
      showBackButton={true}
    >
      <div className="space-y-4">
        {/* Add Tutor Button */}
        <div className="flex justify-end">
          <Button onClick={() => setShowAddTutorModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Tutor Directly
          </Button>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingCount > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved
              {approvedCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">{approvedCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          {['pending', 'approved', 'rejected'].map((status) => (
            <TabsContent key={status} value={status} className="mt-4 space-y-4">
              {applications.filter(a => a.status === status).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No {status} applications
                    </p>
                  </CardContent>
                </Card>
              ) : (
                applications.filter(a => a.status === status).map((app) => {
            const { undergraduate, professional } = getCoursesByNames(app.selected_courses);
            const age = calculateAge(app.date_of_birth);
            const isCoursesExpanded = expandedCourses === app.id;
            
            return (
              <Card key={app.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <User className="w-4 h-4" />
                        {app.full_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {app.email}
                      </CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Personal Info */}
                  {(app.date_of_birth || app.sex) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {app.sex && (
                        <Badge variant="outline" className="capitalize">
                          {app.sex}
                        </Badge>
                      )}
                      {app.date_of_birth && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(app.date_of_birth).toLocaleDateString()}
                          {age !== null && ` (${age} yrs)`}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Selected Courses */}
                  {(undergraduate.length > 0 || professional.length > 0) && (
                    <Collapsible
                      open={isCoursesExpanded}
                      onOpenChange={() => setExpandedCourses(isCoursesExpanded ? null : app.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">
                              Selected Courses ({undergraduate.length + professional.length})
                            </span>
                          </div>
                          {isCoursesExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-2">
                        {undergraduate.length > 0 && (
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              University Courses ({undergraduate.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {undergraduate.map((course) => (
                                <Badge key={course.id} variant="secondary" className="text-xs">
                                  {course.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {professional.length > 0 && (
                          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <p className="text-xs font-medium text-accent-foreground mb-2">
                              Professional Courses ({professional.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {professional.map((course) => (
                                <Badge key={course.id} className="bg-accent/20 text-accent-foreground text-xs">
                                  {course.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {app.qualifications && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <Award className="w-3 h-3" /> Qualifications
                      </p>
                      <p className="text-sm">{app.qualifications}</p>
                    </div>
                  )}
                  
                  {app.experience && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <Briefcase className="w-3 h-3" /> Experience
                      </p>
                      <p className="text-sm">{app.experience}</p>
                    </div>
                  )}
                  
                  {app.subjects && app.subjects.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <BookOpen className="w-3 h-3" /> Subjects
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {app.subjects.map((subject) => (
                          <Badge key={subject} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {app.rejection_reason && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-xs font-medium text-destructive mb-1">Rejection Reason</p>
                      <p className="text-sm text-destructive/80">{app.rejection_reason}</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </p>

                  {app.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => handleApprove(app)}
                        disabled={processingId === app.id}
                        className="flex-1"
                        size="sm"
                      >
                        {processingId === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => setShowRejectModal(app.id)}
                        disabled={processingId === app.id}
                        className="flex-1"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}

                  {/* Edit Courses Button for approved tutors */}
                  {app.status === 'approved' && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCourseEditor(app)}
                        className="w-full"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Assigned Courses
                      </Button>
                    </div>
                  )}

                  {/* Reject Modal */}
                  {showRejectModal === app.id && (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                      <p className="text-sm font-medium">Rejection Reason (optional)</p>
                      <Textarea
                        placeholder="Explain why the application was rejected..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setShowRejectModal(null);
                            setRejectionReason('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleReject(app.id)}
                          disabled={processingId === app.id}
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Course Assignment Dialog */}
      <Dialog open={!!editingCourses} onOpenChange={() => setEditingCourses(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Manage Courses for {editingCourses?.full_name}
            </DialogTitle>
            <DialogDescription>
              Select which courses this tutor can teach. They will be able to create classes and materials for these courses.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-6">
              {undergraduateCourses.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Undergraduate Courses</Label>
                  <div className="space-y-2">
                    {undergraduateCourses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`undergrad-${course.id}`}
                          checked={selectedCourseIds.includes(course.name)}
                          onCheckedChange={() => toggleCourseSelection(course.name)}
                        />
                        <Label
                          htmlFor={`undergrad-${course.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {course.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {professionalCourses.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Professional Courses
                    <Badge variant="secondary" className="text-xs">ZIALE/ZICA/Medical</Badge>
                  </Label>
                  <div className="space-y-2">
                    {professionalCourses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-accent/30 hover:bg-accent/10 transition-colors"
                      >
                        <Checkbox
                          id={`prof-${course.id}`}
                          checked={selectedCourseIds.includes(course.name)}
                          onCheckedChange={() => toggleCourseSelection(course.name)}
                        />
                        <Label
                          htmlFor={`prof-${course.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {course.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {courses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No courses available</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="text-sm text-muted-foreground">
              {selectedCourseIds.length} course{selectedCourseIds.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingCourses(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCourses}
                disabled={savingCourses}
              >
                {savingCourses ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tutor Directly Dialog */}
      <Dialog open={showAddTutorModal} onOpenChange={setShowAddTutorModal}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Tutor Directly
            </DialogTitle>
            <DialogDescription>
              Add an existing user as a tutor without requiring them to apply. Search by their email address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search by email */}
            <div className="space-y-2">
              <Label>Search User by Email</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter user email..."
                  value={searchEmail}
                  onChange={(e) => {
                    setSearchEmail(e.target.value);
                    setNoUserFound(false);
                    setFoundUser(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && searchUserByEmail()}
                />
                <Button
                  variant="outline"
                  onClick={searchUserByEmail}
                  disabled={searchingUser || !searchEmail.trim()}
                >
                  {searchingUser ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {noUserFound && (
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <p className="text-sm text-muted-foreground">
                  No user found with that email. Make sure the user has signed up first.
                </p>
              </div>
            )}

            {foundUser && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">{foundUser.full_name || 'Unknown Name'}</p>
                      <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                    </div>
                    <Check className="w-5 h-5 text-green-500 ml-auto" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Assign Courses</Label>
                  <ScrollArea className="max-h-[200px] pr-4">
                    <div className="space-y-2">
                      {undergraduateCourses.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Undergraduate</p>
                          {undergraduateCourses.map((course) => (
                            <div
                              key={course.id}
                              className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={`add-${course.id}`}
                                checked={addTutorCourses.includes(course.id)}
                                onCheckedChange={() => toggleAddTutorCourse(course.id)}
                              />
                              <Label htmlFor={`add-${course.id}`} className="flex-1 cursor-pointer text-sm">
                                {course.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {professionalCourses.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs text-muted-foreground font-medium">Professional</p>
                          {professionalCourses.map((course) => (
                            <div
                              key={course.id}
                              className="flex items-center space-x-3 p-2 rounded-lg border border-accent/30 hover:bg-accent/10 transition-colors"
                            >
                              <Checkbox
                                id={`add-${course.id}`}
                                checked={addTutorCourses.includes(course.id)}
                                onCheckedChange={() => toggleAddTutorCourse(course.id)}
                              />
                              <Label htmlFor={`add-${course.id}`} className="flex-1 cursor-pointer text-sm">
                                {course.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    {addTutorCourses.length} course{addTutorCourses.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddTutorModal(false);
                setSearchEmail('');
                setFoundUser(null);
                setAddTutorCourses([]);
                setNoUserFound(false);
                setManualEntry(false);
                setManualName('');
                setManualEmail('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTutorDirectly}
              disabled={!foundUser || addingTutor}
            >
              {addingTutor ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Add as Tutor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TutorApplicationsAdminPage;
