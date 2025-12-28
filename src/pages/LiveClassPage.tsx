import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Video, ArrowLeft, Clock, Mic, Camera, Users, PhoneOff, MonitorUp, ExternalLink, Minimize2, Maximize2, Home, Crown, PictureInPicture2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  daily_room_name: string | null;
  daily_room_url: string | null;
  host_id: string;
  status: string;
  course_id: string | null;
  started_at: string | null;
  scheduled_at: string | null;
}

const LiveClassPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [liveClass, setLiveClass] = useState<LiveClass | null>(null);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get user display name from profile
  const getUserName = useCallback(() => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  }, [user]);

  useEffect(() => {
    const loadClass = async () => {
      if (!classId) {
        navigate("/academy");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("live_classes")
          .select("*")
          .eq("id", classId)
          .maybeSingle();

        if (error || !data) {
          toast({
            title: "Class Not Found",
            description: "This class doesn't exist or has ended.",
            variant: "destructive",
          });
          navigate("/academy");
          return;
        }

        if (data.status === "ended") {
          toast({
            title: "Class Ended",
            description: "This class has already ended.",
          });
          navigate("/recordings");
          return;
        }

        setLiveClass(data);

        // Update class status to live if it was scheduled and user is host
        if (data.status === "scheduled" && data.host_id === user?.id) {
          await supabase
            .from("live_classes")
            .update({
              status: "live",
              started_at: new Date().toISOString(),
            })
            .eq("id", classId);
          
          setLiveClass(prev => prev ? { ...prev, status: "live", started_at: new Date().toISOString() } : null);
        }
      } catch (error) {
        console.error("Error loading class:", error);
        toast({
          title: "Error",
          description: "Failed to load class details.",
          variant: "destructive",
        });
        navigate("/academy");
      } finally {
        setLoading(false);
      }
    };

    loadClass();
  }, [classId, user?.id, navigate, toast]);

  // Listen for Daily.co iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle Daily.co postMessage events
      if (event.data?.action === "participant-counts-updated") {
        setParticipantCount(event.data.participants?.present || 0);
      }
      if (event.data?.action === "left-meeting" || event.data?.action === "meeting-ended") {
        setInCall(false);
        setMeetingToken(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleJoinMeeting = async () => {
    if (!liveClass?.daily_room_url) {
      toast({
        title: "No Meeting Room",
        description: "This class doesn't have a valid video room. Please edit the class to add one.",
        variant: "destructive",
      });
      return;
    }

    // Check if this is a Daily.co room (we can only get tokens for Daily.co rooms)
    const isDailyRoom = liveClass.daily_room_url.includes('daily.co');
    
    if (!isDailyRoom) {
      // For external links (Zoom, Google Meet, etc.), open in new tab
      window.open(liveClass.daily_room_url, '_blank');
      toast({
        title: "Opening External Link",
        description: "The class is using an external meeting platform.",
      });
      return;
    }

    if (!liveClass.daily_room_name) {
      toast({
        title: "Invalid Room Configuration",
        description: "The Daily.co room is not properly configured.",
        variant: "destructive",
      });
      return;
    }

    setJoining(true);

    try {
      const isHost = liveClass.host_id === user?.id;

      // Get meeting token from backend - this authenticates the user
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("daily-room", {
        body: {
          action: "get-token",
          roomName: liveClass.daily_room_name,
          userName: getUserName(),
          userId: user?.id,
          isOwner: isHost, // Host gets owner privileges
        },
      });

      if (tokenError || !tokenData?.success) {
        throw new Error(tokenError?.message || tokenData?.error || "Failed to get meeting token");
      }

      console.log("Meeting token obtained, joining room...");
      setMeetingToken(tokenData.token);

      // Record participation
      await supabase.from("class_participants").upsert({
        class_id: liveClass.id,
        user_id: user?.id,
        joined_at: new Date().toISOString(),
      }, {
        onConflict: 'class_id,user_id'
      }).select();

      setInCall(true);

      toast({
        title: "Joining Class",
        description: "Connecting to video room...",
      });
    } catch (error) {
      console.error("Error joining meeting:", error);
      toast({
        title: "Failed to Join",
        description: error instanceof Error ? error.message : "Could not connect to video room.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveCall = async () => {
    // Update participation end time
    if (user?.id && liveClass?.id) {
      await supabase
        .from("class_participants")
        .update({ left_at: new Date().toISOString() })
        .eq("class_id", liveClass.id)
        .eq("user_id", user.id);
    }

    setInCall(false);
    setMeetingToken(null);
    toast({
      title: "Left Class",
      description: "You have left the video call.",
    });
  };

  const handleEndClass = async () => {
    if (!liveClass) return;

    setEnding(true);

    try {
      // Stop recording via Daily.co API
      if (liveClass.daily_room_name) {
        console.log("Stopping recording for room:", liveClass.daily_room_name);
        
        await supabase.functions.invoke("daily-room", {
          body: {
            action: "stop-recording",
            roomName: liveClass.daily_room_name,
          },
        });
      }

      // Update class status
      const { error: updateError } = await supabase
        .from("live_classes")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", liveClass.id);

      if (updateError) {
        throw updateError;
      }

      // Auto-create next recurring class if applicable
      console.log("Triggering auto-create for recurring class...");
      const { data: recurringResult, error: recurringError } = await supabase.functions.invoke(
        "auto-create-recurring-class",
        { body: { classId: liveClass.id } }
      );

      if (recurringError) {
        console.error("Failed to auto-create recurring class:", recurringError);
      } else if (recurringResult?.newClassId) {
        console.log("Next recurring class created:", recurringResult.newClassId);
        toast({
          title: "Next Class Scheduled",
          description: `Your next recurring class has been automatically scheduled.`,
        });
      }

      toast({
        title: "Class Ended",
        description: "The recording will be processed and available shortly.",
      });

      navigate("/recordings");
    } catch (error) {
      console.error("Error ending class:", error);
      toast({
        title: "Error",
        description: "Failed to end class properly. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading class...</p>
        </div>
      </div>
    );
  }

  if (!liveClass) {
    return null;
  }

  const isHost = liveClass.host_id === user?.id;

  // Build Daily.co room URL with token for authentication
  const getDailyRoomUrl = () => {
    if (!liveClass.daily_room_url || !meetingToken) return "";
    // Add token as query parameter - this authenticates the user
    return `${liveClass.daily_room_url}?t=${meetingToken}`;
  };

  // Handle Picture-in-Picture toggle
  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  // Minimized floating video view
  if (isMinimized && inCall && meetingToken) {
    return (
      <div className="fixed bottom-20 right-4 z-50 w-80 md:w-96 shadow-2xl rounded-xl overflow-hidden border border-border bg-card">
        <div className="bg-card/95 backdrop-blur-sm px-3 py-2 flex items-center justify-between border-b">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-xs font-medium truncate">{liveClass.title}</span>
            {isHost && <Crown className="w-3 h-3 text-primary flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="aspect-video bg-black relative">
          <iframe
            src={getDailyRoomUrl()}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full absolute inset-0"
            style={{ border: "none" }}
          />
        </div>
        <div className="p-2 flex items-center justify-between gap-2 bg-card">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeaveCall}
            className="text-xs h-7"
          >
            <PhoneOff className="h-3 w-3 mr-1" />
            Leave
          </Button>
          {isHost && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndClass}
              disabled={ending}
              className="text-xs h-7"
            >
              {ending ? <Loader2 className="h-3 w-3 animate-spin" /> : "End Class"}
            </Button>
          )}
          <Link to="/home">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              <Home className="h-3 w-3 mr-1" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  liveClass.status === "live" ? "text-red-500" : "text-primary"
                )}>
                  {liveClass.status === "live" ? "🔴 Live" : "Scheduled"}
                </span>
                {isHost && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Host
                  </span>
                )}
              </div>
              <h1 className="font-semibold truncate max-w-md">{liveClass.title}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {inCall && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{participantCount} in class</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="gap-1"
                >
                  <Minimize2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Minimize</span>
                </Button>
              </>
            )}
            {(liveClass.started_at || liveClass.scheduled_at) && (
              <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {liveClass.started_at
                  ? `Started ${format(new Date(liveClass.started_at), "h:mm a")}`
                  : `Scheduled ${format(new Date(liveClass.scheduled_at!), "PPp")}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {inCall && meetingToken ? (
          <>
            {/* Video iframe container - Full embedded experience */}
            <div className="flex-1 bg-black relative">
              <iframe
                ref={iframeRef}
                src={getDailyRoomUrl()}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full absolute inset-0"
                style={{ border: "none" }}
              />
            </div>

            {/* Bottom controls bar */}
            <div className="bg-card border-t p-4">
              <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLeaveCall}
                  className="gap-2"
                >
                  <PhoneOff className="h-4 w-4" />
                  Leave Class
                </Button>

                {isHost && (
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleEndClass}
                    disabled={ending}
                    className="gap-2"
                  >
                    {ending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      <>
                        <MonitorUp className="h-4 w-4" />
                        End Class for All
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setIsMinimized(true)}
                  className="gap-2"
                >
                  <Minimize2 className="h-4 w-4" />
                  Minimize
                </Button>

                {document.pictureInPictureEnabled && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={togglePiP}
                    className="gap-2"
                  >
                    <PictureInPicture2 className="h-4 w-4" />
                    PiP
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Pre-join screen */
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-6">
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-6 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary/10">
                      {isHost ? (
                        <Crown className="h-10 w-10 text-primary" />
                      ) : (
                        <Video className="h-10 w-10 text-primary" />
                      )}
                    </div>
                    {isHost && (
                      <p className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full inline-block">
                        You are the host of this class
                      </p>
                    )}
                    <h2 className="text-xl font-semibold">{liveClass.title}</h2>
                    {liveClass.description && (
                      <p className="text-sm text-muted-foreground">{liveClass.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Joining as <span className="font-medium text-foreground">{getUserName()}</span>
                      {isHost && " (Host)"}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {liveClass.daily_room_url ? (
                      liveClass.daily_room_url.includes('daily.co') ? (
                        <Button
                          size="lg"
                          className="w-full gradient-primary"
                          onClick={handleJoinMeeting}
                          disabled={joining}
                        >
                          {joining ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              {isHost ? <Crown className="h-5 w-5 mr-2" /> : <Video className="h-5 w-5 mr-2" />}
                              {isHost ? "Start Class" : "Join Class"}
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          className="w-full"
                          onClick={() => window.open(liveClass.daily_room_url!, '_blank')}
                        >
                          <ExternalLink className="h-5 w-5 mr-2" />
                          Open Meeting Link
                        </Button>
                      )
                    ) : (
                      <div className="text-center p-4 bg-destructive/10 rounded-lg">
                        <p className="text-sm text-destructive font-medium">
                          No video room available
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isHost 
                            ? "Please add a meeting link to this class."
                            : "The tutor needs to add a meeting link for this class."
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  {liveClass.daily_room_url?.includes('daily.co') && (
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                      <p className="flex items-center gap-2">
                        <Mic className="h-3 w-3" />
                        Your microphone will be requested
                      </p>
                      <p className="flex items-center gap-2">
                        <Camera className="h-3 w-3" />
                        Camera is optional but encouraged
                      </p>
                      <p className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        You'll join with your Lumina name
                      </p>
                      {isHost && (
                        <p className="flex items-center gap-2 text-primary">
                          <Crown className="h-3 w-3" />
                          You have host controls (mute all, remove participants)
                        </p>
                      )}
                    </div>
                  )}

                  {!liveClass.daily_room_url?.includes('daily.co') && liveClass.daily_room_url && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <p className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        This class uses an external meeting platform
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Auto-recording info - only for Daily.co rooms */}
              {liveClass.daily_room_url?.includes('daily.co') && (
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Video className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Auto-Recording Enabled</h3>
                        <p className="text-xs text-muted-foreground">
                          This class is recorded automatically. The recording and AI summary 
                          will be available after the class ends.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation hint */}
              <div className="text-center text-xs text-muted-foreground">
                <p>Tip: You can minimize the class and browse the app while in a meeting</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClassPage;
