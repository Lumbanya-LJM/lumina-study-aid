import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Calendar,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { format } from 'date-fns';

interface TutorApplication {
  id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  subjects: string[] | null;
  qualifications: string | null;
}

const TutorApplicationStatus: React.FC = () => {
  const { user } = useAuth();
  const [application, setApplication] = useState<TutorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplication, setHasApplication] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tutor_applications')
          .select('id, status, created_at, reviewed_at, rejection_reason, subjects, qualifications')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching application:', error);
        } else if (data) {
          setApplication(data);
          setHasApplication(true);
        }
      } catch (error) {
        console.error('Error fetching application:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [user]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasApplication) {
    return null;
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          label: 'Under Review',
          description: 'Your application is being reviewed by our team.'
        };
      case 'approved':
        return {
          icon: CheckCircle2,
          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          label: 'Approved',
          description: 'Congratulations! You are now a Luminary Tutor.'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'bg-red-500/10 text-red-600 border-red-500/20',
          label: 'Not Approved',
          description: 'Unfortunately, your application was not approved.'
        };
      default:
        return {
          icon: FileText,
          color: 'bg-muted text-muted-foreground border-border',
          label: status,
          description: 'Application status unknown.'
        };
    }
  };

  const config = getStatusConfig(application?.status || 'pending');
  const StatusIcon = config.icon;

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          Tutor Application Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline" 
            className={`${config.color} flex items-center gap-1.5 px-3 py-1.5`}
          >
            <StatusIcon className="w-4 h-4" />
            {config.label}
          </Badge>
          
          {application?.created_at && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Applied {format(new Date(application.created_at), 'MMM d, yyyy')}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>

        {/* Rejection Reason */}
        {application?.status === 'rejected' && application.rejection_reason && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <p className="text-sm font-medium text-red-600 mb-1">Reason:</p>
            <p className="text-sm text-muted-foreground">{application.rejection_reason}</p>
          </div>
        )}

        {/* Approval Info */}
        {application?.status === 'approved' && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-sm text-emerald-700">
              You now have access to Luminary Teach! Visit the Academy section to start creating courses.
            </p>
          </div>
        )}

        {/* Subjects Applied For */}
        {application?.subjects && application.subjects.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Subjects Applied For:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {application.subjects.map((subject, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Reviewed Date */}
        {application?.reviewed_at && (
          <p className="text-xs text-muted-foreground">
            Reviewed on {format(new Date(application.reviewed_at), 'MMMM d, yyyy')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TutorApplicationStatus;