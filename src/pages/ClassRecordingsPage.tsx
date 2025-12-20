import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  Play,
  Clock,
  Calendar,
  Users,
  BookOpen,
  ChevronLeft,
  Search,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";

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

const ClassRecordingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [liveClasses, setLiveClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadClasses();

    // Subscribe to live class updates - handle incrementally
    const channel = supabase
      .channel("live-classes-recordings")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_classes",
        },
        (payload) => {
          const newClass = payload.new as ClassRecording & UpcomingClass;
          if (newClass.status === 'live') {
            setLiveClasses(prev => [newClass as UpcomingClass, ...prev]);
          } else if (newClass.status === 'scheduled') {
            setUpcomingClasses(prev => [newClass as UpcomingClass, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_classes",
        },
        (payload) => {
          const updated = payload.new as ClassRecording & UpcomingClass & { status: string };
          if (updated.status === 'ended' && updated.recording_url) {
            // Add to recordings, remove from live/upcoming
            setRecordings(prev => {
              const exists = prev.some(r => r.id === updated.id);
              if (exists) return prev;
              return [updated as ClassRecording, ...prev];
            });
            setLiveClasses(prev => prev.filter(c => c.id !== updated.id));
            setUpcomingClasses(prev => prev.filter(c => c.id !== updated.id));
          } else if (updated.status === 'live') {
            setUpcomingClasses(prev => prev.filter(c => c.id !== updated.id));
            setLiveClasses(prev => {
              const exists = prev.some(c => c.id === updated.id);
              if (exists) return prev.map(c => c.id === updated.id ? updated as UpcomingClass : c);
              return [updated as UpcomingClass, ...prev];
            });
          } else if (updated.status === 'ended') {
            setLiveClasses(prev => prev.filter(c => c.id !== updated.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "live_classes",
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setRecordings(prev => prev.filter(r => r.id !== deleted.id));
          setLiveClasses(prev => prev.filter(c => c.id !== deleted.id));
          setUpcomingClasses(prev => prev.filter(c => c.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadClasses = async () => {
    try {
      // Load recordings (ended classes with recordings)
      const { data: recordingsData } = await supabase
        .from("live_classes")
        .select("*, academy_courses(name)")
        .eq("status", "ended")
        .not("recording_url", "is", null)
        .order("ended_at", { ascending: false });

      setRecordings(recordingsData || []);

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
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setLoading(false);
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
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Classes</h1>
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
                    onClick={() => navigate(`/class/${liveClass.id}`)}
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

        {/* Tabs */}
        <Tabs defaultValue="recordings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recordings" className="gap-2">
              <Video className="h-4 w-4" />
              Recordings
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming
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
                {filteredRecordings.map((recording) => (
                  <Card
                    key={recording.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      if (recording.recording_url) {
                        window.open(recording.recording_url, "_blank");
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="relative h-20 w-32 bg-muted rounded-lg flex items-center justify-center shrink-0">
                          <Play className="h-8 w-8 text-muted-foreground" />
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
                            navigate(`/class/${upcomingClass.id}`)
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
    </MobileLayout>
  );
};

export default ClassRecordingsPage;
