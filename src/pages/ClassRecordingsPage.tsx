import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  Play,
  Clock,
  Calendar,
  ChevronLeft,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import SecureVideoPlayer from "@/components/recordings/SecureVideoPlayer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClassRecording {
  id: string;
  title: string;
  description: string | null;
  recording_url: string | null;
  recording_duration_seconds: number | null;
  ended_at: string | null;
  course_id: string | null;
  host_id: string;
  status?: string;
  daily_room_name?: string | null;
  is_archived?: boolean;
  academy_courses?: { name: string } | null;
}

interface UpcomingClass {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  daily_room_name: string;
  course_id: string | null;
  status?: string;
  academy_courses?: { name: string } | null;
}

interface WatchHistory {
  class_id: string;
  progress_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  last_watched_at: string;
}

interface AISummary {
  class_id: string;
  summary: string;
  key_points: string[];
  topics_covered: string[];
}

const ClassRecordingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [archivedRecordings, setArchivedRecordings] = useState<ClassRecording[]>([]);
  const [pendingRecordings, setPendingRecordings] = useState<ClassRecording[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [liveClasses, setLiveClasses] = useState<UpcomingClass[]>([]);
  const [watchHistory, setWatchHistory] = useState<Map<string, WatchHistory>>(new Map());
  const [aiSummaries, setAiSummaries] = useState<Map<string, AISummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecording, setSelectedRecording] = useState<ClassRecording | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [editingRecording, setEditingRecording] = useState<ClassRecording | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<ClassRecording | null>(null);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      // Load active recordings (ended classes with recordings, not archived)
      const { data: recordingsData } = await supabase
        .from("live_classes")
        .select("*, academy_courses(name)")
        .eq("status", "ended")
        .eq("is_archived", false)
        .not("recording_url", "is", null)
        .neq("recording_url", "no_recording_available")
        .order("ended_at", { ascending: false });

      setRecordings(recordingsData || []);

      // Load archived recordings (only for hosts)
      const { data: archivedData } = await supabase
        .from("live_classes")
        .select("*, academy_courses(name)")
        .eq("status", "ended")
        .eq("is_archived", true)
        .not("recording_url", "is", null)
        .neq("recording_url", "no_recording_available")
        .order("ended_at", { ascending: false });

      setArchivedRecordings(archivedData || []);

      // Load pending recordings (ended classes without recordings)
      const { data: pendingData } = await supabase
        .from("live_classes")
        .select("*, academy_courses(name)")
        .eq("status", "ended")
        .is("recording_url", null)
        .not("daily_room_name", "is", null)
        .order("ended_at", { ascending: false });

      setPendingRecordings(pendingData || []);

      // Load upcoming scheduled classes
      const { data: upcomingData } = await supabase
        .from("live_classes")
        .select("*, academy_courses(name)")
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true });

      setUpcomingClasses(upcomingData || []);

      // Load live classes
      const { data: liveData } = await supabase
        .from("live_classes")
        .select("*, academy_courses(name)")
        .eq("status", "live")
        .order("started_at", { ascending: false });

      setLiveClasses(liveData || []);

      // Load watch history for the current user
      if (user) {
        const { data: historyData } = await supabase
          .from("recording_watch_history")
          .select("*")
          .eq("user_id", user.id);

        if (historyData) {
          const historyMap = new Map<string, WatchHistory>();
          historyData.forEach((h) => {
            historyMap.set(h.class_id, {
              class_id: h.class_id,
              progress_seconds: h.progress_seconds,
              duration_seconds: h.duration_seconds,
              completed: h.completed,
              last_watched_at: h.last_watched_at,
            });
          });
          setWatchHistory(historyMap);
        }
      }

      // Load AI summaries for all recordings
      if (recordingsData && recordingsData.length > 0) {
        const classIds = recordingsData.map((r) => r.id);
        const { data: summariesData } = await supabase
          .from("class_ai_summaries")
          .select("*")
          .in("class_id", classIds);

        if (summariesData) {
          const summariesMap = new Map<string, AISummary>();
          summariesData.forEach((s) => {
            const keyPoints = Array.isArray(s.key_points) 
              ? s.key_points.map((k) => String(k)) 
              : [];
            const topicsCovered = Array.isArray(s.topics_covered) 
              ? s.topics_covered.map((t) => String(t)) 
              : [];
            summariesMap.set(s.class_id, {
              class_id: s.class_id,
              summary: s.summary,
              key_points: keyPoints,
              topics_covered: topicsCovered,
            });
          });
          setAiSummaries(summariesMap);
        }
      }
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadClasses();

    // Subscribe to live class updates
    const channel = supabase
      .channel("live-classes-recordings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_classes",
        },
        () => {
          // Reload all data on any change
          loadClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadClasses]);

  // Poll for pending recordings every 10 seconds (more aggressive polling)
  useEffect(() => {
    if (pendingRecordings.length === 0) return;

    // Immediately trigger a sync when pending recordings are detected
    const triggerSync = async () => {
      console.log("Triggering sync for pending recordings...");
      try {
        const { data } = await supabase.functions.invoke("sync-recordings");
        console.log("Sync result:", data?.results);
        if (data?.results?.synced > 0) {
          loadClasses();
        }
      } catch (error) {
        console.error("Error syncing recordings:", error);
      }
    };
    
    // Trigger immediately on mount if there are pending recordings
    triggerSync();

    const interval = setInterval(async () => {
      console.log("Checking for pending recordings...");
      
      // Call sync-recordings instead of individual room checks
      try {
        const { data } = await supabase.functions.invoke("sync-recordings");
        
        if (data?.results?.synced > 0) {
          console.log(`${data.results.synced} recordings now available!`);
          loadClasses();
        } else if (data?.results?.notReady > 0) {
          console.log(`${data.results.notReady} recordings still processing...`);
        }
      } catch (error) {
        console.error("Error checking recording status:", error);
      }
    }, 10000); // Poll every 10 seconds instead of 30

    return () => clearInterval(interval);
  }, [pendingRecordings, loadClasses]);

  const handleSyncRecordings = async () => {
    setSyncing(true);
    try {
      // Call the sync-recordings edge function
      const { data, error } = await supabase.functions.invoke("sync-recordings");

      if (error) {
        throw error;
      }

      if (data?.results) {
        const { synced, notReady, noRecording } = data.results;
        
        if (synced > 0) {
          toast({
            title: "Recordings Synced",
            description: `${synced} new recording(s) are now available! Students have been notified.`,
          });
          loadClasses();
        } else if (notReady > 0) {
          toast({
            title: "Recordings Still Processing",
            description: `${notReady} recording(s) are still being processed by Daily.co.`,
          });
        } else {
          toast({
            title: "No New Recordings",
            description: "All recordings are up to date or have no recorded content.",
          });
        }
      }
    } catch (error) {
      console.error("Error syncing recordings:", error);
      toast({
        title: "Sync Failed",
        description: "Could not sync recordings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Open edit modal
  const handleEditRecording = (recording: ClassRecording) => {
    setEditingRecording(recording);
    setEditTitle(recording.title);
    setEditDescription(recording.description || "");
  };

  // Save edited recording
  const handleSaveEdit = async () => {
    if (!editingRecording || !editTitle.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("live_classes")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        })
        .eq("id", editingRecording.id);

      if (error) throw error;

      toast({
        title: "Recording Updated",
        description: "The recording details have been saved.",
      });

      setEditingRecording(null);
      loadClasses();
    } catch (error) {
      console.error("Error updating recording:", error);
      toast({
        title: "Update Failed",
        description: "Could not update recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = (recording: ClassRecording) => {
    setRecordingToDelete(recording);
    setDeleteConfirmOpen(true);
  };

  // Delete recording
  const handleDeleteRecording = async () => {
    if (!recordingToDelete) return;
    
    setDeletingId(recordingToDelete.id);
    try {
      const { error } = await supabase
        .from("live_classes")
        .delete()
        .eq("id", recordingToDelete.id);

      if (error) throw error;

      toast({
        title: "Recording Deleted",
        description: "The recording has been permanently removed.",
      });

      setDeleteConfirmOpen(false);
      setRecordingToDelete(null);
      loadClasses();
    } catch (error) {
      console.error("Error deleting recording:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Archive recording
  const handleArchiveRecording = async (recording: ClassRecording, archive: boolean) => {
    setArchiving(recording.id);
    try {
      const { error } = await supabase
        .from("live_classes")
        .update({ is_archived: archive })
        .eq("id", recording.id);

      if (error) throw error;

      toast({
        title: archive ? "Recording Archived" : "Recording Restored",
        description: archive 
          ? "The recording has been moved to the archive." 
          : "The recording has been restored.",
      });

      loadClasses();
    } catch (error) {
      console.error("Error archiving recording:", error);
      toast({
        title: archive ? "Archive Failed" : "Restore Failed",
        description: "Could not update recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setArchiving(null);
    }
  };

  // Toggle selection for bulk delete
  const toggleBulkSelection = (recordingId: string) => {
    setSelectedForBulk((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recordingId)) {
        newSet.delete(recordingId);
      } else {
        newSet.add(recordingId);
      }
      return newSet;
    });
  };


  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedForBulk.size === 0) return;
    
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from("live_classes")
        .delete()
        .in("id", Array.from(selectedForBulk));

      if (error) throw error;

      toast({
        title: "Recordings Deleted",
        description: `${selectedForBulk.size} recording(s) have been permanently removed.`,
      });

      setBulkDeleteConfirmOpen(false);
      setSelectedForBulk(new Set());
      loadClasses();
    } catch (error) {
      console.error("Error deleting recordings:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete recordings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown duration";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  // Save watch progress to database
  const saveWatchProgress = useCallback(
    async (classId: string, progressSeconds: number, durationSeconds: number, completed: boolean) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from("recording_watch_history")
          .upsert(
            {
              user_id: user.id,
              class_id: classId,
              progress_seconds: Math.floor(progressSeconds),
              duration_seconds: Math.floor(durationSeconds),
              completed,
              last_watched_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,class_id",
            }
          );

        if (error) {
          console.error("Error saving watch progress:", error);
        } else {
          // Update local state
          setWatchHistory((prev) => {
            const newMap = new Map(prev);
            newMap.set(classId, {
              class_id: classId,
              progress_seconds: Math.floor(progressSeconds),
              duration_seconds: Math.floor(durationSeconds),
              completed,
              last_watched_at: new Date().toISOString(),
            });
            return newMap;
          });
        }
      } catch (error) {
        console.error("Error saving watch progress:", error);
      }
    },
    [user]
  );

  // Calculate watch progress percentage
  const getWatchProgress = (classId: string): { percentage: number; completed: boolean; resumeText: string } | null => {
    const history = watchHistory.get(classId);
    if (!history || !history.duration_seconds) return null;

    const percentage = Math.min(100, (history.progress_seconds / history.duration_seconds) * 100);
    const remainingSeconds = history.duration_seconds - history.progress_seconds;
    const remainingMinutes = Math.ceil(remainingSeconds / 60);

    let resumeText = "";
    if (history.completed) {
      resumeText = "Completed";
    } else if (percentage > 0) {
      resumeText = `${remainingMinutes}m left`;
    }

    return { percentage, completed: history.completed, resumeText };
  };

  const filteredRecordings = recordings.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get host recordings count
  const hostRecordingsCount = recordings.filter((r) => r.host_id === user?.id).length;
  const filteredHostRecordings = filteredRecordings.filter((r) => r.host_id === user?.id);
  const allHostSelected = filteredHostRecordings.length > 0 && 
    filteredHostRecordings.every((r) => selectedForBulk.has(r.id));

  // Select all host recordings
  const selectAllHostRecordings = () => {
    if (allHostSelected) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(filteredHostRecordings.map((r) => r.id)));
    }
  };

  if (loading) {

    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Classes</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncRecordings}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Sync</span>
          </Button>
        </div>

        {/* Live Classes Banner */}
        {liveClasses.length > 0 && (
          <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="font-medium text-red-600 dark:text-red-400">
                  Live Now
                </span>
              </div>
              {liveClasses.map((liveClass) => (
                <div
                  key={liveClass.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-medium">{liveClass.title}</h3>
                    {liveClass.academy_courses && (
                      <p className="text-sm text-muted-foreground">
                        {liveClass.academy_courses.name}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => navigate(`/live-class/${liveClass.id}`)}
                    size="sm"
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Join
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Recordings Banner */}
        {pendingRecordings.length > 0 && (
          <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  Processing Recordings
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {pendingRecordings.length} recording(s) are being processed.
                They will appear automatically when ready.
              </p>
              <div className="flex flex-wrap gap-2">
                {pendingRecordings.slice(0, 3).map((pending) => (
                  <Badge key={pending.id} variant="outline" className="text-xs">
                    {pending.title}
                  </Badge>
                ))}
                {pendingRecordings.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{pendingRecordings.length - 3} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="recordings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recordings" className="gap-1 text-xs sm:text-sm">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Recordings</span>
              {recordings.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {recordings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-1 text-xs sm:text-sm">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Archived</span>
              {archivedRecordings.filter(r => r.host_id === user?.id).length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {archivedRecordings.filter(r => r.host_id === user?.id).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Upcoming</span>
              {upcomingClasses.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {upcomingClasses.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recordings" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Bulk selection toolbar - only for hosts */}
            {hostRecordingsCount > 0 && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allHostSelected}
                    onCheckedChange={selectAllHostRecordings}
                    aria-label="Select all your recordings"
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedForBulk.size > 0 
                      ? `${selectedForBulk.size} selected` 
                      : "Select recordings"}
                  </span>
                </div>
                {selectedForBulk.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                    className="h-7 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete ({selectedForBulk.size})
                  </Button>
                )}
              </div>
            )}

            {/* Info about streaming-only */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
              <Video className="h-3 w-3 flex-shrink-0" />
              <span>Recordings stream in-app only • No downloads</span>
            </div>

            {/* Recordings List */}
            {filteredRecordings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Recordings Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Class recordings will appear here after they end.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredRecordings.map((recording) => {
                  const progress = getWatchProgress(recording.id);
                  const summary = aiSummaries.get(recording.id);
                  const isExpanded = expandedSummary === recording.id;
                  
                  return (
                    <Card
                      key={recording.id}
                      className={cn(
                        "overflow-hidden transition-colors",
                        selectedForBulk.has(recording.id) && "ring-2 ring-primary"
                      )}
                    >
                      <CardContent className="p-4">
                        {/* Host actions row with checkbox */}
                        {recording.host_id === user?.id && (
                          <div className="flex items-center justify-between mb-2 -mt-1 -mr-2">
                            <div 
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={selectedForBulk.has(recording.id)}
                                onCheckedChange={() => toggleBulkSelection(recording.id)}
                                aria-label={`Select ${recording.title}`}
                              />
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditRecording(recording)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleArchiveRecording(recording, true)}
                                  disabled={archiving === recording.id}
                                >
                                  {archiving === recording.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Archive className="h-4 w-4 mr-2" />
                                  )}
                                  Archive Recording
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteConfirm(recording)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        
                        <div 
                          className="flex gap-4 cursor-pointer hover:bg-accent/50 rounded-lg -m-2 p-2"
                          onClick={() => setSelectedRecording(recording)}
                        >
                          <div className="relative h-20 w-32 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                            <Play className="h-8 w-8 text-primary" />
                            {/* Progress bar overlay */}
                            {progress && progress.percentage > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                                <div
                                  className={cn(
                                    "h-full transition-all",
                                    progress.completed ? "bg-green-500" : "bg-primary"
                                  )}
                                  style={{ width: `${progress.percentage}%` }}
                                />
                              </div>
                            )}
                            {/* AI Summary indicator */}
                            {summary && (
                              <div className="absolute top-1 right-1 bg-primary/90 rounded-full p-1">
                                <Sparkles className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {recording.title}
                            </h3>
                            {recording.academy_courses && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {recording.academy_courses.name}
                              </Badge>
                            )}
                            
                            {/* AI Brief Description - Always visible */}
                            {summary ? (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                {summary.summary.split('.').slice(0, 2).join('.') + '.'}
                              </p>
                            ) : recording.description ? (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                {recording.description}
                              </p>
                            ) : null}
                            
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(recording.recording_duration_seconds)}
                              </span>
                              {recording.ended_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(recording.ended_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              )}
                              {/* Watch progress indicator */}
                              {progress && (
                                <Badge
                                  variant={progress.completed ? "default" : "outline"}
                                  className={cn(
                                    "text-xs",
                                    progress.completed && "bg-green-500 hover:bg-green-500"
                                  )}
                                >
                                  {progress.resumeText}
                                </Badge>
                              )}
                              {/* AI indicator */}
                              {summary && (
                                <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  AI
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* AI Summary full details */}
                        {summary && (
                          <div className="mt-3 pt-3 border-t">
                            <button
                              className="flex items-center gap-2 text-xs text-primary w-full text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSummary(isExpanded ? null : recording.id);
                              }}
                            >
                              <Sparkles className="h-3 w-3" />
                              <span className="font-medium">
                                {isExpanded ? "Hide Details" : "View Full Summary & Key Points"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 ml-auto" />
                              ) : (
                                <ChevronDown className="h-3 w-3 ml-auto" />
                              )}
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-3 space-y-3 text-sm">
                                <div>
                                  <h4 className="font-medium text-xs mb-1.5 text-foreground">What This Class Covered</h4>
                                  <p className="text-muted-foreground text-xs leading-relaxed">{summary.summary}</p>
                                </div>
                                
                                {summary.key_points.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-xs mb-2 flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      Key Points
                                    </h4>
                                    <ul className="space-y-1">
                                      {summary.key_points.map((point, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                          <span className="text-primary mt-0.5">•</span>
                                          <span>{point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {summary.topics_covered.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {summary.topics_covered.map((topic, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {topic}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Archived Recordings Tab */}
          <TabsContent value="archived" className="space-y-4">
            {archivedRecordings.filter(r => r.host_id === user?.id).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Archived Recordings</h3>
                  <p className="text-sm text-muted-foreground">
                    Archived recordings will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {archivedRecordings
                  .filter(r => r.host_id === user?.id)
                  .map((recording) => (
                    <Card key={recording.id} className="opacity-80">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Archive className="h-3 w-3" />
                            Archived
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleArchiveRecording(recording, false)}
                                disabled={archiving === recording.id}
                              >
                                {archiving === recording.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <ArchiveRestore className="h-4 w-4 mr-2" />
                                )}
                                Restore Recording
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteConfirm(recording)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div 
                          className="flex gap-4 cursor-pointer hover:bg-accent/50 rounded-lg -m-2 p-2"
                          onClick={() => setSelectedRecording(recording)}
                        >
                          <div className="relative h-20 w-32 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/5" />
                            <Play className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{recording.title}</h3>
                            {recording.academy_courses && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {recording.academy_courses.name}
                              </Badge>
                            )}
                            {recording.description && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                {recording.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(recording.recording_duration_seconds)}
                              </span>
                              {recording.ended_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(recording.ended_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingClasses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Upcoming Classes</h3>
                  <p className="text-sm text-muted-foreground">
                    Scheduled classes will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingClasses.map((upcomingClass) => (
                  <Card key={upcomingClass.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{upcomingClass.title}</h3>
                          {upcomingClass.academy_courses && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {upcomingClass.academy_courses.name}
                            </Badge>
                          )}
                          {upcomingClass.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {upcomingClass.description}
                            </p>
                          )}
                          {upcomingClass.scheduled_at && (
                            <div className="flex items-center gap-2 mt-3 text-sm">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>
                                {format(
                                  new Date(upcomingClass.scheduled_at),
                                  "PPP 'at' p"
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/live-class/${upcomingClass.id}`)
                          }
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Secure Video Player Modal */}
      <Dialog open={!!selectedRecording} onOpenChange={() => setSelectedRecording(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="p-4 pb-0 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="pr-8">{selectedRecording?.title}</DialogTitle>
            </div>
            {selectedRecording?.academy_courses && (
              <Badge variant="secondary" className="w-fit text-xs">
                {selectedRecording.academy_courses.name}
              </Badge>
            )}
            {selectedRecording && watchHistory.get(selectedRecording.id) && (
              <p className="text-xs text-muted-foreground mt-1">
                {watchHistory.get(selectedRecording.id)?.completed
                  ? "✓ Completed previously"
                  : `Resuming from ${formatDuration(watchHistory.get(selectedRecording.id)?.progress_seconds || 0)}`}
              </p>
            )}
          </DialogHeader>
          <div className="p-4 pt-2 overflow-y-auto flex-1">
            {selectedRecording && (
              <>
                <SecureVideoPlayer
                  classId={selectedRecording.id}
                  title={selectedRecording.title}
                  initialProgress={watchHistory.get(selectedRecording.id)?.progress_seconds || 0}
                  onProgressUpdate={(progress, duration, completed) => {
                    saveWatchProgress(selectedRecording.id, progress, duration, completed);
                  }}
                  onError={(error) => {
                    toast({
                      title: "Playback Error",
                      description: error,
                      variant: "destructive",
                    });
                  }}
                />
                
                {/* AI Summary in Modal */}
                {aiSummaries.get(selectedRecording.id) && (
                  <Card className="mt-4 bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="font-medium text-sm">AI Summary</h3>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {aiSummaries.get(selectedRecording.id)?.summary}
                      </p>
                      
                      {(aiSummaries.get(selectedRecording.id)?.key_points?.length ?? 0) > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-xs mb-2 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Key Points
                          </h4>
                          <ul className="space-y-2">
                            {aiSummaries.get(selectedRecording.id)?.key_points.map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-primary font-bold mt-0.5">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(aiSummaries.get(selectedRecording.id)?.topics_covered?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="font-medium text-xs mb-2">Topics Covered</h4>
                          <div className="flex flex-wrap gap-2">
                            {aiSummaries.get(selectedRecording.id)?.topics_covered.map((topic, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground text-center mt-3">
              This recording is protected and can only be viewed within the Lumina app
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recording Dialog */}
      <Dialog open={!!editingRecording} onOpenChange={(open) => !open && setEditingRecording(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Recording Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Recording title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description of what this class covered..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecording(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editTitle.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{recordingToDelete?.title}"? This action cannot be undone and the recording will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordingToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecording}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId === recordingToDelete?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedForBulk.size} Recording(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedForBulk.size} recording(s)? This action cannot be undone and the recordings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkDeleteConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default ClassRecordingsPage;
