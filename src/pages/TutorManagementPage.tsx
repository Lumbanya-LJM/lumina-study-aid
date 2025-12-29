import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  UserPlus, 
  Mail, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle,
  Users,
  BookOpen,
  GraduationCap,
  RefreshCw,
  Send
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  selected_courses: string[];
  status: string;
  created_at: string;
  profile?: {
    avatar_url: string | null;
    bio: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  full_name: string | null;
  selected_courses: string[];
  status: string;
  created_at: string;
  expires_at: string;
}

interface Course {
  id: string;
  name: string;
  institution: string;
  tutor_id: string | null;
}

const UNDERGRADUATE_COURSES = [
  "Constitutional Law",
  "Criminal Law", 
  "Contract Law",
  "Tort Law",
  "Property Law",
  "Administrative Law",
  "Company Law",
  "Family Law",
  "Evidence Law",
  "Equity and Trusts",
  "Land Law",
  "Jurisprudence",
  "International Law",
  "Labour Law",
  "Intellectual Property Law",
  "Environmental Law",
  "Human Rights Law"
];

const ZIALE_COURSES = [
  "Legal Practice",
  "Civil Procedure",
  "Criminal Procedure",
  "Legal Ethics",
  "Conveyancing",
  "Drafting",
  "Advocacy",
  "Legal Research",
  "Professional Conduct"
];

export default function TutorManagementPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("tutors");
  
  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteSelectedCourses, setInviteSelectedCourses] = useState<string[]>([]);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Edit courses dialog state
  const [editCoursesDialogOpen, setEditCoursesDialogOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [editSelectedCourses, setEditSelectedCourses] = useState<string[]>([]);
  const [savingCourses, setSavingCourses] = useState(false);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      loadData();
    }
  }, [adminLoading, isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load ALL users with moderator role (tutors from any source)
      const { data: moderatorRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "moderator");

      if (rolesError) throw rolesError;

      const tutorsList: Tutor[] = [];
      
      if (moderatorRoles && moderatorRoles.length > 0) {
        const userIds = moderatorRoles.map(r => r.user_id);
        
        // Get profiles for all moderators
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, bio")
          .in("user_id", userIds);

        // Get tutor applications for those who applied
        const { data: applications } = await supabase
          .from("tutor_applications")
          .select("user_id, full_name, email, selected_courses, created_at")
          .in("user_id", userIds)
          .eq("status", "approved");

        // Get tutor invitations for those who were invited
        const { data: acceptedInvites } = await supabase
          .from("tutor_invitations")
          .select("user_id, full_name, email, selected_courses, created_at")
          .in("user_id", userIds)
          .eq("status", "accepted");

        // Get courses assigned to each tutor
        const { data: coursesWithTutors } = await supabase
          .from("academy_courses")
          .select("id, name, tutor_id")
          .in("tutor_id", userIds);

        // Build tutor list from all moderators
        for (const role of moderatorRoles) {
          const profile = profiles?.find(p => p.user_id === role.user_id);
          const application = applications?.find(a => a.user_id === role.user_id);
          const invitation = acceptedInvites?.find(i => i.user_id === role.user_id);
          
          // Get courses assigned to this tutor
          const assignedCourseNames = coursesWithTutors
            ?.filter(c => c.tutor_id === role.user_id)
            .map(c => c.name) || [];
          
          // Combine selected courses from application/invitation with assigned courses
          const selectedCourses = [
            ...(application?.selected_courses || []),
            ...(invitation?.selected_courses || []),
            ...assignedCourseNames
          ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

          tutorsList.push({
            id: role.user_id, // Use user_id as id for tutors without applications
            user_id: role.user_id,
            full_name: application?.full_name || invitation?.full_name || profile?.full_name || "Unknown Tutor",
            email: application?.email || invitation?.email || "",
            selected_courses: selectedCourses,
            status: "approved",
            created_at: application?.created_at || invitation?.created_at || role.created_at,
            profile: profile ? { avatar_url: profile.avatar_url, bio: profile.bio } : undefined
          });
        }
      }

      // Sort by created_at descending
      tutorsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTutors(tutorsList);

      // Load invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("tutor_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);

      // Load courses with assigned tutors
      const { data: coursesData, error: coursesError } = await supabase
        .from("academy_courses")
        .select("id, name, institution, tutor_id")
        .eq("is_active", true);

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setSendingInvite(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const response = await supabase.functions.invoke("send-tutor-invitation", {
        body: {
          email: inviteEmail,
          fullName: inviteFullName,
          selectedCourses: inviteSelectedCourses
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send invitation");
      }

      toast.success("Invitation sent successfully!");
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteFullName("");
      setInviteSelectedCourses([]);
      loadData();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      // Delete old invitation and create new one
      await supabase
        .from("tutor_invitations")
        .delete()
        .eq("id", invitation.id);

      const response = await supabase.functions.invoke("send-tutor-invitation", {
        body: {
          email: invitation.email,
          fullName: invitation.full_name,
          selectedCourses: invitation.selected_courses
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to resend invitation");
      }

      toast.success("Invitation resent successfully!");
      loadData();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error(error.message || "Failed to resend invitation");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("tutor_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation withdrawn");
      loadData();
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to withdraw invitation");
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to permanently delete this invitation?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("tutor_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation deleted");
      loadData();
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      toast.error("Failed to delete invitation");
    }
  };

  const handleClearInvitationHistory = async () => {
    if (!confirm("Are you sure you want to delete all non-pending invitations (cancelled, expired, accepted)?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("tutor_invitations")
        .delete()
        .neq("status", "pending");

      if (error) throw error;

      toast.success("Invitation history cleared");
      loadData();
    } catch (error: any) {
      console.error("Error clearing history:", error);
      toast.error("Failed to clear history");
    }
  };

  const handleEditCourses = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setEditSelectedCourses(tutor.selected_courses || []);
    setEditCoursesDialogOpen(true);
  };

  const handleSaveCourses = async () => {
    if (!selectedTutor) return;

    setSavingCourses(true);
    try {
      // Try to update tutor_applications if they have one (optional - not all tutors have applications)
      await supabase
        .from("tutor_applications")
        .update({ selected_courses: editSelectedCourses })
        .eq("user_id", selectedTutor.user_id)
        .eq("status", "approved");

      // Also try to update tutor_invitations if they were invited
      await supabase
        .from("tutor_invitations")
        .update({ selected_courses: editSelectedCourses })
        .eq("user_id", selectedTutor.user_id)
        .eq("status", "accepted");

      // Update academy_courses to assign this tutor
      // First, remove this tutor from courses they're no longer assigned to
      const previousCourses = selectedTutor.selected_courses || [];
      const removedCourses = previousCourses.filter(c => !editSelectedCourses.includes(c));
      
      for (const courseName of removedCourses) {
        const course = courses.find(c => c.name === courseName);
        if (course && course.tutor_id === selectedTutor.user_id) {
          await supabase
            .from("academy_courses")
            .update({ tutor_id: null })
            .eq("id", course.id);
        }
      }

      // Assign tutor to new courses
      for (const courseName of editSelectedCourses) {
        const course = courses.find(c => c.name === courseName);
        if (course && !course.tutor_id) {
          await supabase
            .from("academy_courses")
            .update({ tutor_id: selectedTutor.user_id })
            .eq("id", course.id);
          
          // Notify enrolled students
          await notifyStudentsOfTutorChange(course.id, selectedTutor.user_id, selectedTutor.full_name, course.name);
        }
      }

      toast.success("Courses updated successfully!");
      setEditCoursesDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving courses:", error);
      toast.error("Failed to update courses");
    } finally {
      setSavingCourses(false);
    }
  };

  const notifyStudentsOfTutorChange = async (courseId: string, tutorId: string, tutorName: string, courseName: string) => {
    try {
      // Get enrolled students
      const { data: enrollments } = await supabase
        .from("academy_enrollments")
        .select("user_id")
        .eq("course_id", courseId)
        .eq("status", "active");

      if (!enrollments || enrollments.length === 0) return;

      const userIds = enrollments.map(e => e.user_id);

      // Send push notifications
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userIds,
          payload: {
            title: "New Tutor Assigned",
            body: `${tutorName} has been assigned as your tutor for ${courseName}`,
            icon: "/pwa-192x192.png",
            data: {
              type: "tutor_assigned",
              courseId,
              tutorId,
              url: `/tutor/${tutorId}`,
            },
          },
        },
      });

      // Send email notifications
      await supabase.functions.invoke("send-student-notification", {
        body: {
          type: "tutor_assigned",
          courseId,
          data: {
            tutorName,
            courseName,
            tutorId,
          },
        },
      });

      console.log(`Notified ${userIds.length} students about tutor assignment`);
    } catch (error) {
      console.error("Error notifying students:", error);
    }
  };

  const handleRemoveTutor = async (tutor: Tutor) => {
    if (!confirm(`Are you sure you want to remove ${tutor.full_name} as a tutor?`)) {
      return;
    }

    try {
      // Remove moderator role - this is the primary action
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", tutor.user_id)
        .eq("role", "moderator");

      if (roleError) throw roleError;

      // Optionally update application status if they have one
      await supabase
        .from("tutor_applications")
        .update({ status: "removed" })
        .eq("user_id", tutor.user_id)
        .eq("status", "approved");

      // Optionally update invitation status if they were invited
      await supabase
        .from("tutor_invitations")
        .update({ status: "revoked" })
        .eq("user_id", tutor.user_id)
        .eq("status", "accepted");

      // Remove them from any assigned courses
      await supabase
        .from("academy_courses")
        .update({ tutor_id: null })
        .eq("tutor_id", tutor.user_id);

      toast.success("Tutor removed successfully");
      loadData();
    } catch (error: any) {
      console.error("Error removing tutor:", error);
      toast.error("Failed to remove tutor");
    }
  };

  const toggleInviteCourse = (course: string) => {
    setInviteSelectedCourses(prev =>
      prev.includes(course)
        ? prev.filter(c => c !== course)
        : [...prev, course]
    );
  };

  const toggleEditCourse = (course: string) => {
    setEditSelectedCourses(prev =>
      prev.includes(course)
        ? prev.filter(c => c !== course)
        : [...prev, course]
    );
  };

  const filteredTutors = tutors.filter(tutor =>
    tutor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvitations = invitations.filter(inv =>
    inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.full_name && inv.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingInvitations = filteredInvitations.filter(inv => inv.status === "pending");
  const acceptedInvitations = filteredInvitations.filter(inv => inv.status === "accepted");
  const expiredOrCancelledInvitations = filteredInvitations.filter(
    inv => inv.status === "cancelled" || new Date(inv.expires_at) < new Date()
  );

  const getStatusBadge = (status: string, expiresAt?: string) => {
    if (status === "pending" && expiresAt && new Date(expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout
      title="Tutor Management"
      subtitle="Manage tutors and send invitations"
      activeTab="tutors"
      showSidebar={false}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tutors.length}</p>
                  <p className="text-sm text-muted-foreground">Active Tutors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingInvitations.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Invitations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{acceptedInvitations.length}</p>
                  <p className="text-sm text-muted-foreground">Accepted Invitations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">Active Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tutors or invitations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Tutor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Invite New Tutor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="tutor@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Full Name</Label>
                    <Input
                      id="invite-name"
                      placeholder="John Doe"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Assign Courses (Optional)</Label>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Undergraduate Courses
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {UNDERGRADUATE_COURSES.map(course => (
                            <div key={course} className="flex items-center space-x-2">
                              <Checkbox
                                id={`invite-ug-${course}`}
                                checked={inviteSelectedCourses.includes(course)}
                                onCheckedChange={() => toggleInviteCourse(course)}
                              />
                              <label htmlFor={`invite-ug-${course}`} className="text-sm cursor-pointer">
                                {course}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          ZIALE Courses
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {ZIALE_COURSES.map(course => (
                            <div key={course} className="flex items-center space-x-2">
                              <Checkbox
                                id={`invite-ziale-${course}`}
                                checked={inviteSelectedCourses.includes(course)}
                                onCheckedChange={() => toggleInviteCourse(course)}
                              />
                              <label htmlFor={`invite-ziale-${course}`} className="text-sm cursor-pointer">
                                {course}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendInvitation} disabled={sendingInvite}>
                    {sendingInvite ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="tutors">
              Active Tutors ({tutors.length})
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Invitations ({invitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tutors" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Tutors</CardTitle>
                <CardDescription>
                  Manage your approved tutors and their course assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredTutors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tutors found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Courses</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[70px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTutors.map(tutor => (
                        <TableRow key={tutor.id}>
                          <TableCell className="font-medium">{tutor.full_name}</TableCell>
                          <TableCell>{tutor.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {tutor.selected_courses?.slice(0, 3).map(course => (
                                <Badge key={course} variant="secondary" className="text-xs">
                                  {course}
                                </Badge>
                              ))}
                              {(tutor.selected_courses?.length || 0) > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{tutor.selected_courses.length - 3} more
                                </Badge>
                              )}
                              {(!tutor.selected_courses || tutor.selected_courses.length === 0) && (
                                <span className="text-muted-foreground text-sm">No courses assigned</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(tutor.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditCourses(tutor)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Courses
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleRemoveTutor(tutor)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Tutor
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Tutor Invitations</CardTitle>
                  <CardDescription>
                    Track and manage sent tutor invitations
                  </CardDescription>
                </div>
                {invitations.some(inv => inv.status !== "pending") && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleClearInvitationHistory}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear History
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredInvitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No invitations sent yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Courses</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[70px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvitations.map(invitation => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>{invitation.full_name || "-"}</TableCell>
                          <TableCell>
                            {getStatusBadge(invitation.status, invitation.expires_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {invitation.selected_courses?.slice(0, 2).map(course => (
                                <Badge key={course} variant="secondary" className="text-xs">
                                  {course}
                                </Badge>
                              ))}
                              {(invitation.selected_courses?.length || 0) > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{invitation.selected_courses.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(invitation.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {invitation.status === "pending" && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleResendInvitation(invitation)}>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Resend
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleCancelInvitation(invitation.id)}
                                      className="text-amber-600"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Withdraw
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteInvitation(invitation.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Courses Dialog */}
      <Dialog open={editCoursesDialogOpen} onOpenChange={setEditCoursesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Courses for {selectedTutor?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Undergraduate Courses
              </p>
              <div className="grid grid-cols-2 gap-2">
                {UNDERGRADUATE_COURSES.map(course => (
                  <div key={course} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-ug-${course}`}
                      checked={editSelectedCourses.includes(course)}
                      onCheckedChange={() => toggleEditCourse(course)}
                    />
                    <label htmlFor={`edit-ug-${course}`} className="text-sm cursor-pointer">
                      {course}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                ZIALE Courses
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ZIALE_COURSES.map(course => (
                  <div key={course} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-ziale-${course}`}
                      checked={editSelectedCourses.includes(course)}
                      onCheckedChange={() => toggleEditCourse(course)}
                    />
                    <label htmlFor={`edit-ziale-${course}`} className="text-sm cursor-pointer">
                      {course}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCoursesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCourses} disabled={savingCourses}>
              {savingCourses ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
