import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Video, ArrowLeft, Clock, Mic, MicOff, Camera, CameraOff, Users, PhoneOff } from "lucide-react";
import { format } from "date-fns";

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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callFrameRef = useRef<any>(null);

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
      if (event.data?.action === "participant-counts-updated") {
        setParticipantCount(event.data.participants?.present || 0);
      }
      if (event.data?.action === "left-meeting") {
        setInCall(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleJoinMeeting = async () => {
    if (!liveClass?.daily_room_url) {
      toast({
        title: "No Meeting Room",
        description: "This class doesn't have a valid video room.",
        variant: "destructive",
      });
      return;
    }

    setJoining(true);

    try {
      // Record participation
      await supabase.from("class_participants").insert({
        class_id: liveClass.id,
        user_id: user?.id,
      });

      setInCall(true);

      toast({
        title: "Joining Class",
        description: "Loading the video room...",
      });
    } catch (error) {
      console.error("Error joining meeting:", error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveCall = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ action: "leave" }, "*");
    }
    setInCall(false);
    toast({
      title: "Left Class",
      description: "You have left the video call.",
    });
  };

  const toggleMute = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { action: "set-audio", audio: isMuted },
        "*"
      );
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { action: "set-video", video: isVideoOff },
        "*"
      );
    }
    setIsVideoOff(!isVideoOff);
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

  // Build Daily.co room URL with user name
  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  };

  const getDailyRoomUrl = () => {
    if (!liveClass.daily_room_url) return "";
    const url = new URL(liveClass.daily_room_url);
    url.searchParams.set("t", "token"); // Would need meeting token for production
    url.searchParams.set("userName", getUserName());
    return url.toString();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {!inCall && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/academy")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-wide">
                  {liveClass.status === "live" ? "🔴 Live" : "Scheduled"}
                </span>
              </div>
              <h1 className="font-semibold truncate max-w-md">{liveClass.title}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {inCall && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{participantCount}</span>
              </div>
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
        {inCall ? (
          <>
            {/* Video iframe container */}
            <div className="flex-1 bg-black relative">
              <iframe
                ref={iframeRef}
                src={getDailyRoomUrl()}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full absolute inset-0"
                style={{ border: "none" }}
              />
            </div>

            {/* Controls bar */}
            <div className="bg-card border-t p-4">
              <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full w-14 h-14"
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                  variant={isVideoOff ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full w-14 h-14"
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                </Button>

                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-14 h-14"
                  onClick={handleLeaveCall}
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>

                {isHost && (
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleEndClass}
                    disabled={ending}
                    className="ml-4"
                  >
                    {ending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      "End Class"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Pre-join screen */
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-6">
              <Card className="border-primary/20">
                <CardContent className="pt-6 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Video className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">{liveClass.title}</h2>
                    {liveClass.description && (
                      <p className="text-sm text-muted-foreground">{liveClass.description}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button
                      size="lg"
                      className="w-full gradient-primary"
                      onClick={handleJoinMeeting}
                      disabled={joining || !liveClass.daily_room_url}
                    >
                      {joining ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Video className="h-5 w-5 mr-2" />
                          Join Class
                        </>
                      )}
                    </Button>

                    {!liveClass.daily_room_url && (
                      <p className="text-xs text-destructive text-center">
                        No video room available. Please contact the tutor.
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-2">
                      <Mic className="h-3 w-3" />
                      Make sure your microphone is working
                    </p>
                    <p className="flex items-center gap-2">
                      <Camera className="h-3 w-3" />
                      Camera is optional but encouraged
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Auto-recording info */}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClassPage;
