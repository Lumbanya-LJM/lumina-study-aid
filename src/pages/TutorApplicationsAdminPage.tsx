import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  ChevronUp
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

  const getCoursesByIds = (courseIds: string[] | null) => {
    if (!courseIds || courseIds.length === 0) return { undergraduate: [], ziale: [] };
    
    const selectedCourses = courses.filter(c => courseIds.includes(c.id));
    return {
      undergraduate: selectedCourses.filter(c => c.institution !== 'ZIALE'),
      ziale: selectedCourses.filter(c => c.institution === 'ZIALE')
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

      // Set the password for the user in Supabase Auth
      const { error: passwordSetError } = await supabase.functions.invoke('set-tutor-password', {
        body: {
          userId: application.user_id,
          password: temporaryPassword,
        },
      });

      if (passwordSetError) {
        // Log the detailed error for debugging
        console.error('Password set error:', passwordSetError);
        throw new Error(`Failed to set password: An internal error occurred.`);
      }
      
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
    } catch (error) {
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
    } catch (error) {
      console.error('Error rejecting:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to reject application',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
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

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Tutor Applications</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Access Denied</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-center px-6">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold">Admin Access Required</h2>
          <p className="text-muted-foreground">You don't have permission to view this page</p>
        </div>
      </div>
    );
  }

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Tutor Applications</h1>
        </div>
        <Badge variant="secondary">{pendingCount} pending</Badge>
      </div>
      <div className="p-4 space-y-4">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tutor applications yet</p>
            </CardContent>
          </Card>
        ) : (
          applications.map((app) => {
            const { undergraduate, ziale } = getCoursesByIds(app.selected_courses);
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
                  {(undergraduate.length > 0 || ziale.length > 0) && (
                    <Collapsible
                      open={isCoursesExpanded}
                      onOpenChange={() => setExpandedCourses(isCoursesExpanded ? null : app.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">
                              Selected Courses ({undergraduate.length + ziale.length})
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
                              Undergraduate Courses ({undergraduate.length})
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
                        {ziale.length > 0 && (
                          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <p className="text-xs font-medium text-accent-foreground mb-2">
                              ZIALE Courses ({ziale.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {ziale.map((course) => (
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
      </div>
    </div>
  );
};

export default TutorApplicationsAdminPage;
