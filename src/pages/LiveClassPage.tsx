import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMeetingAssistant } from "@/hooks/useMeetingAssistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MeetingAssistantPanel } from "@/components/liveclass/MeetingAssistantPanel";
import { Loader2, Video, ArrowLeft, Clock, Mic, Camera, Users, PhoneOff, MonitorUp, ExternalLink, Minimize2, Maximize2, Home, Crown, PictureInPicture2, Circle, Sparkles, Timer, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import lmvLogo from "@/assets/lmv-logo.png";

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStarting, setRecordingStarting] = useState(false);
  const [classDuration, setClassDuration] = useState(0);
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);
  const [showAssistantPanel, setShowAssistantPanel] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Meeting assistant hook for AI features
  const {
    meetingId: aiMeetingId,
    transcriptLines,
    isQueryingAssistant,
    createMeeting: createAiMeeting,
    ingestTranscript,
    queryAssistant,
    endMeeting: endAiMeeting
  } = useMeetingAssistant();

  // Get user display name from profile
  const getUserName = useCallback(() => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  }, [user]);

  // Format duration as HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

        // Load participant count from database
        const { count } = await supabase
          .from("class_participants")
          .select("*", { count: "exact", head: true })
          .eq("class_id", classId)
          .is("left_at", null);
        
        setParticipantCount(count || 0);

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

  // Duration timer
  useEffect(() => {
    if (inCall && liveClass?.started_at) {
      const startTime = new Date(liveClass.started_at).getTime();
      
      const updateDuration = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setClassDuration(elapsed);
      };

      updateDuration(); // Initial update
      durationIntervalRef.current = setInterval(updateDuration, 1000);

      return () => {
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
      };
    }
  }, [inCall, liveClass?.started_at]);

  // Subscribe to participant changes in realtime
  useEffect(() => {
    if (!classId || !inCall) return;

    const channel = supabase
      .channel(`participants-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_participants',
          filter: `class_id=eq.${classId}`
        },
        async () => {
          // Refetch participant count
          const { count } = await supabase
            .from("class_participants")
            .select("*", { count: "exact", head: true })
            .eq("class_id", classId)
            .is("left_at", null);
          
          setParticipantCount(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, inCall]);

  // Listen for Daily.co iframe messages including transcription
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
      if (event.data?.action === "recording-started") {
        setIsRecording(true);
        setRecordingStarting(false);
      }
      if (event.data?.action === "recording-stopped") {
        setIsRecording(false);
      }
      
      // Handle transcription events for AI assistant
      if (event.data?.action === "transcription-message" && aiAssistEnabled && aiMeetingId) {
        const { text, participantId, userName } = event.data;
        if (text && text.trim()) {
          ingestTranscript(userName || participantId || 'Unknown', text);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [aiAssistEnabled, aiMeetingId, ingestTranscript]);

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

      // Update class status to live if it was scheduled and user is host
      if (liveClass.status === "scheduled" && isHost) {
        await supabase
          .from("live_classes")
          .update({
            status: "live",
            started_at: new Date().toISOString(),
          })
          .eq("id", liveClass.id);

        setLiveClass(prev => prev ? { ...prev, status: "live", started_at: new Date().toISOString() } : null);

        // Notify enrolled students that class is now live
        if (liveClass.course_id) {
          try {
            const { data: enrollments } = await supabase
              .from('academy_enrollments')
              .select('user_id')
              .eq('course_id', liveClass.course_id)
              .eq('status', 'active');

            if (enrollments && enrollments.length > 0) {
              const userIds = enrollments.map(e => e.user_id);
              console.log(`Notifying ${userIds.length} students that class is live`);

              // Send push notifications
              await supabase.functions.invoke('send-push-notification', {
                body: {
                  userIds,
                  payload: {
                    title: '🔴 Class is Live!',
                    body: `${liveClass.title} has started. Join now!`,
                    tag: 'live-class',
                    data: { classId: liveClass.id, url: `/class/${liveClass.id}` }
                  }
                }
              });

              // Send email notifications
              await supabase.functions.invoke('send-student-notification', {
                body: {
                  classId: liveClass.id,
                  courseId: liveClass.course_id,
                  classTitle: liveClass.title,
                  scheduledAt: new Date().toISOString(),
                  type: 'class_live'
                }
              });

              // Create tutor update for visibility on student portal
              await supabase
                .from('tutor_updates')
                .insert({
                  course_id: liveClass.course_id,
                  tutor_id: liveClass.host_id,
                  title: `🔴 Live Now: ${liveClass.title}`,
                  content: liveClass.description || 'The tutor is now live! Join the class.',
                  update_type: 'class',
                  class_time: new Date().toISOString(),
                  class_link: liveClass.daily_room_url || null,
                  is_published: true
                });
            }
          } catch (notifyError) {
            console.error('Error notifying students about live class:', notifyError);
          }
        }
      }

      // Record participation
      await supabase.from("class_participants").upsert({
        class_id: liveClass.id,
        user_id: user?.id,
        joined_at: new Date().toISOString(),
      }, {
        onConflict: 'class_id,user_id'
      }).select();

      setInCall(true);
      
      console.log("[LiveClass] User joined meeting", {
        isHost,
        roomName: liveClass.daily_room_name,
        classId: liveClass.id,
        userId: user?.id,
      });

      // Auto-start recording for hosts after joining (no manual steps)
      if (isHost && liveClass.daily_room_name) {
        console.log("[LiveClass] Host detected - auto-starting recording...");
        setRecordingStarting(true);

        const MAX_ATTEMPTS = 20; // ~60s (20 * 3s)
        const ATTEMPT_DELAY_MS = 3000;

        const startRecordingWithRetries = async (attempt: number) => {
          console.log(`[LiveClass] Auto-recording attempt ${attempt}/${MAX_ATTEMPTS}`);

          const { data: recData, error: recError } = await supabase.functions.invoke("daily-room", {
            body: {
              action: "start-recording",
              roomName: liveClass.daily_room_name,
            },
          });

          if (recError || !recData?.success) {
            const retryable = Boolean(recData?.retryable);
            console.warn("[LiveClass] Auto-recording failed", {
              attempt,
              retryable,
              error: recError?.message,
              details: recData,
            });

            if (retryable && attempt < MAX_ATTEMPTS) {
              setTimeout(() => startRecordingWithRetries(attempt + 1), ATTEMPT_DELAY_MS);
              return;
            }

            setRecordingStarting(false);
            toast({
              title: "Recording",
              description:
                recData?.error ||
                "Recording could not be started automatically. Please try again in a moment.",
            });
            return;
          }

          console.log("[LiveClass] Recording started", recData);
          setIsRecording(true);
          setRecordingStarting(false);
        };

        // Small delay so the host fully connects before we start recording
        setTimeout(() => startRecordingWithRetries(1), 1000);
      } else {
        console.log("[LiveClass] Not auto-starting recording:", { isHost, hasRoomName: !!liveClass.daily_room_name });
      }

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

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    setInCall(false);
    setMeetingToken(null);
    setIsRecording(false);
    toast({
      title: "Left Class",
      description: "You have left the video call.",
    });
  };


  const handleStartRecording = async () => {
    if (!liveClass?.daily_room_name) return;

    try {
      setRecordingStarting(true);

      const MAX_ATTEMPTS = 10; // manual retry window (~30s)
      const ATTEMPT_DELAY_MS = 3000;

      const attemptStart = async (attempt: number): Promise<void> => {
        console.log(`[LiveClass] Manual start recording attempt ${attempt}/${MAX_ATTEMPTS}`);

        const { data, error } = await supabase.functions.invoke("daily-room", {
          body: {
            action: "start-recording",
            roomName: liveClass.daily_room_name,
          },
        });

        if (error || !data?.success) {
          const retryable = Boolean(data?.retryable);
          if (retryable && attempt < MAX_ATTEMPTS) {
            setTimeout(() => void attemptStart(attempt + 1), ATTEMPT_DELAY_MS);
            return;
          }

          setRecordingStarting(false);
          toast({
            title: "Recording",
            description: data?.error || error?.message || "Failed to start recording.",
            variant: "destructive",
          });
          return;
        }

        setIsRecording(true);
        setRecordingStarting(false);
        toast({
          title: "Recording Started",
          description: data?.alreadyRecording
            ? "A recording was already running."
            : "Recording has started.",
        });
      };

      void attemptStart(1);
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingStarting(false);
      toast({
        title: "Recording",
        description: "Failed to start recording.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async () => {
    if (!liveClass?.daily_room_name) return;

    try {
      const { data, error } = await supabase.functions.invoke("daily-room", {
        body: {
          action: "stop-recording",
          roomName: liveClass.daily_room_name,
        },
      });

      if (error || data?.success === false) {
        toast({
          title: "Recording",
          description: data?.error || error?.message || "Failed to stop recording.",
          variant: "destructive",
        });
        return;
      }

      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "The recording will be processed shortly.",
      });
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Recording",
        description: "Failed to stop recording.",
        variant: "destructive",
      });
    }
  };

  const toggleAiAssist = async () => {
    if (!aiAssistEnabled && liveClass && user?.id) {
      // Create AI meeting session when enabling
      await createAiMeeting(liveClass.id, liveClass.title, user.id);
      setShowAssistantPanel(true);
    } else if (aiAssistEnabled) {
      await endAiMeeting();
      setShowAssistantPanel(false);
    }
    setAiAssistEnabled(!aiAssistEnabled);
    toast({
      title: aiAssistEnabled ? "AI Assist Disabled" : "AI Assist Enabled",
      description: aiAssistEnabled 
        ? "AI note-taking has been turned off." 
        : "AI will take notes and generate a summary. Open the panel to interact.",
    });
  };

  const handleEndClass = async () => {
    if (!liveClass) return;

    setEnding(true);

    try {
      // Stop recording via Daily.co API
      if (liveClass.daily_room_name && isRecording) {
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

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      toast({
        title: "Class Ended",
        description: "The recording will be processed and available shortly.",
      });

      // Trigger recording sync after a delay to allow Daily.co to process
      // First sync after 15s, then again after 45s if still not ready
      setTimeout(async () => {
        console.log("[LiveClass] Triggering first recording sync (15s after class end)...");
        try {
          const { data } = await supabase.functions.invoke("sync-recordings");
          console.log("[LiveClass] First sync result:", data?.results);
          
          // If still not synced, try again in 30 more seconds
          if (data?.results?.synced === 0 && data?.results?.notReady > 0) {
            setTimeout(async () => {
              console.log("[LiveClass] Triggering second recording sync (45s after class end)...");
              const { data: retryData } = await supabase.functions.invoke("sync-recordings");
              console.log("[LiveClass] Second sync result:", retryData?.results);
            }, 30000);
          }
        } catch (syncError) {
          console.error("[LiveClass] Recording sync failed:", syncError);
        }
      }, 15000);

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
            {isRecording && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            <span className="text-xs font-medium truncate">{liveClass.title}</span>
            {isHost && <Crown className="w-3 h-3 text-primary flex-shrink-0" />}
            <span className="text-xs text-muted-foreground font-mono">{formatDuration(classDuration)}</span>
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
          {/* Download Protection Overlay - deters screen capture */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-2 left-2 opacity-15">
              <img src={lmvLogo} alt="" className="w-8 h-8 rotate-[-10deg] select-none" draggable={false} />
            </div>
            <div className="absolute top-2 right-2 opacity-15">
              <img src={lmvLogo} alt="" className="w-8 h-8 rotate-[10deg] select-none" draggable={false} />
            </div>
            <div className="flex items-center justify-center h-full">
              <img src={lmvLogo} alt="" className="w-16 h-16 opacity-15 rotate-[-15deg] select-none" draggable={false} />
            </div>
          </div>
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
                {/* Duration counter */}
                <div className="flex items-center gap-1.5 text-sm bg-muted/50 px-2.5 py-1 rounded-full">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-medium">{formatDuration(classDuration)}</span>
                </div>
                
                {/* Recording indicator */}
                {isRecording && (
                  <div className="flex items-center gap-1.5 text-sm bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full">
                    <Circle className="h-3 w-3 fill-red-500 animate-pulse" />
                    <span className="font-medium">REC</span>
                  </div>
                )}
                
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
            {(liveClass.started_at || liveClass.scheduled_at) && !inCall && (
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
              {/* Download Protection Overlay - deters screen capture */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-4 left-4 opacity-10">
                  <img src={lmvLogo} alt="" className="w-12 h-12 rotate-[-10deg] select-none" draggable={false} />
                </div>
                <div className="absolute top-4 right-4 opacity-10">
                  <img src={lmvLogo} alt="" className="w-12 h-12 rotate-[10deg] select-none" draggable={false} />
                </div>
                <div className="absolute bottom-20 left-4 opacity-10">
                  <img src={lmvLogo} alt="" className="w-12 h-12 rotate-[5deg] select-none" draggable={false} />
                </div>
                <div className="absolute bottom-20 right-4 opacity-10">
                  <img src={lmvLogo} alt="" className="w-12 h-12 rotate-[-5deg] select-none" draggable={false} />
                </div>
                <div className="flex items-center justify-center h-full">
                  <img src={lmvLogo} alt="" className="w-32 h-32 md:w-40 md:h-40 opacity-15 rotate-[-15deg] select-none" draggable={false} />
                </div>
              </div>
            </div>

            {/* Bottom controls bar */}
            <div className="bg-card border-t p-4">
              <div className="flex items-center justify-center gap-3 max-w-2xl mx-auto flex-wrap">
                {/* AI Assist Toggle */}
                <Button
                  variant={aiAssistEnabled ? "default" : "outline"}
                  size="lg"
                  onClick={toggleAiAssist}
                  className={cn("gap-2", aiAssistEnabled && "bg-primary")}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Assist
                </Button>

                {/* Show/Hide AI Panel */}
                {aiAssistEnabled && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowAssistantPanel(!showAssistantPanel)}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {showAssistantPanel ? 'Hide Panel' : 'Show Panel'}
                  </Button>
                )}

                {/* Recording controls - Host only */}
                {isHost && (
                  <>
                    {isRecording ? (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleStopRecording}
                        className="gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
                      >
                        <Circle className="h-4 w-4 fill-red-500" />
                        Stop Recording
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleStartRecording}
                        disabled={recordingStarting}
                        className="gap-2"
                      >
                        {recordingStarting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Starting Recording…
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4" />
                            Start Recording
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}

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

            {/* AI Meeting Assistant Panel */}
            <MeetingAssistantPanel
              meetingId={aiMeetingId}
              isOpen={showAssistantPanel && aiAssistEnabled}
              onClose={() => setShowAssistantPanel(false)}
              transcriptLines={transcriptLines}
              onQueryAssistant={queryAssistant}
              isQueryingAssistant={isQueryingAssistant}
            />
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
                              {isHost 
                                ? (liveClass.status === 'live' ? "Re-join Class" : "Start Class")
                                : "Join Class"
                              }
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
                        <h3 className="font-medium text-sm">Recording Controls Available</h3>
                        <p className="text-xs text-muted-foreground">
                          {isHost 
                            ? "You can start/stop recording during the class. AI will generate a summary after."
                            : "The host can record this class. The recording and AI summary will be available after class."
                          }
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
