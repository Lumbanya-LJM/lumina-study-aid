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
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";

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

const ClassRecordingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [pendingRecordings, setPendingRecordings] = useState<ClassRecording[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [liveClasses, setLiveClasses] = useState<UpcomingClass[]>([]);
  const [watchHistory, setWatchHistory] = useState<Map<string, WatchHistory>>(new Map());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecording, setSelectedRecording] = useState<ClassRecording | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      // Load recordings (ended classes with recordings)
      const { data: recordingsData } = await supabase
        .from("live_classes")
        .select("*, academy_courses(name)")
        .eq("status", "ended")
        .not("recording_url", "is", null)
        .order("ended_at", { ascending: false });

      setRecordings(recordingsData || []);

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

  // Poll for pending recordings every 30 seconds
  useEffect(() => {
    if (pendingRecordings.length === 0) return;

    const interval = setInterval(async () => {
      console.log("Checking for pending recordings...");
      
      for (const pending of pendingRecordings) {
        try {
          const { data } = await supabase.functions.invoke("daily-room", {
            body: {
              action: "get-recordings",
              roomName: pending.daily_room_name,
            },
          });

          if (data?.recordings?.length > 0) {
            console.log(`Recording now available for class ${pending.id}`);
            loadClasses();
            break;
          }
        } catch (error) {
          console.error("Error checking recording status:", error);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [pendingRecordings, loadClasses]);

  const handleSyncRecordings = async () => {
    setSyncing(true);
    try {
      // Check for recordings on all pending classes
      let syncedCount = 0;
      
      for (const pending of pendingRecordings) {
        if (!pending.daily_room_name) continue;
        
        const { data } = await supabase.functions.invoke("daily-room", {
          body: {
            action: "get-recordings",
            roomName: pending.daily_room_name,
          },
        });

        if (data?.recordings?.length > 0) {
          syncedCount++;
        }
      }

      if (syncedCount > 0) {
        toast({
          title: "Recordings Synced",
          description: `${syncedCount} new recording(s) are now available.`,
        });
        loadClasses();
      } else {
        toast({
          title: "No New Recordings",
          description: "All recordings are up to date or still processing.",
        });
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recordings" className="gap-2">
              <Video className="h-4 w-4" />
              Recordings
              {recordings.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {recordings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming
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
                  return (
                    <Card
                      key={recording.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedRecording(recording)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
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
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
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
          <div className="p-4 pt-2">
            {selectedRecording && (
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
            )}
            <p className="text-xs text-muted-foreground text-center mt-3">
              This recording is protected and can only be viewed within the Lumina app
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default ClassRecordingsPage;
