import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Video, ExternalLink, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
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
          .single();

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

  const handleJoinMeeting = async () => {
    if (!liveClass?.daily_room_url) {
      toast({
        title: "No Meeting Link",
        description: "This class doesn't have a valid Zoom meeting link.",
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

      // Open Zoom meeting in new tab
      window.open(liveClass.daily_room_url, "_blank");

      toast({
        title: "Joining Zoom Meeting",
        description: "The Zoom meeting is opening in a new tab.",
      });
    } catch (error) {
      console.error("Error joining meeting:", error);
    } finally {
      setJoining(false);
    }
  };

  const handleEndClass = async () => {
    if (!liveClass) return;

    setEnding(true);

    try {
      // End the Zoom meeting
      if (liveClass.daily_room_name) {
        console.log("Ending Zoom meeting:", liveClass.daily_room_name);
        
        const { error: endError } = await supabase.functions.invoke("zoom-meeting", {
          body: {
            action: "end-meeting",
            meetingId: liveClass.daily_room_name,
          },
        });

        if (endError) {
          console.error("Error ending Zoom meeting:", endError);
        }
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

      // Try to get recordings (will likely return "processing" status)
      if (liveClass.daily_room_name) {
        const { data: recordingData } = await supabase.functions.invoke("zoom-meeting", {
          body: {
            action: "get-recordings",
            meetingId: liveClass.daily_room_name,
            classId: liveClass.id,
          },
        });

        console.log("Recording status:", recordingData);

        if (recordingData?.status === "pending" || recordingData?.status === "processing") {
          toast({
            title: "Class Ended Successfully",
            description: "The recording is being processed and will be available shortly.",
          });
        } else if (recordingData?.status === "available") {
          toast({
            title: "Class Ended",
            description: "Recording saved successfully!",
          });
        } else {
          toast({
            title: "Class Ended",
            description: "Recording will be available once Zoom finishes processing.",
          });
        }
      } else {
        toast({
          title: "Class Ended",
          description: "The class has been ended successfully.",
        });
      }

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/academy")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Academy
        </Button>

        <Card className="border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Video className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wide">
                {liveClass.status === "live" ? "🔴 Live Now" : "Scheduled"}
              </span>
            </div>
            <CardTitle className="text-2xl">{liveClass.title}</CardTitle>
            {liveClass.description && (
              <p className="text-muted-foreground mt-2">{liveClass.description}</p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Class Info */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              {liveClass.started_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Started {format(new Date(liveClass.started_at), "h:mm a")}
                </div>
              )}
              {liveClass.scheduled_at && liveClass.status === "scheduled" && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Scheduled for {format(new Date(liveClass.scheduled_at), "PPp")}
                </div>
              )}
            </div>

            {/* Join Button */}
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="w-full max-w-sm gradient-primary"
                onClick={handleJoinMeeting}
                disabled={joining || !liveClass.daily_room_url}
              >
                {joining ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Opening Zoom...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Join Zoom Meeting
                  </>
                )}
              </Button>

              {!liveClass.daily_room_url && (
                <p className="text-xs text-destructive text-center">
                  No meeting link available. Please contact the host.
                </p>
              )}

              <p className="text-xs text-muted-foreground text-center">
                The meeting will open in a new tab. Make sure you have Zoom installed.
              </p>
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Host Controls
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleEndClass}
                  disabled={ending}
                >
                  {ending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Ending Class...
                    </>
                  ) : (
                    "End Class"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Recording will be automatically saved after class ends
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">How to join:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click "Join Zoom Meeting" above</li>
              <li>If prompted, allow your browser to open Zoom</li>
              <li>If you don't have Zoom installed, you can join from browser</li>
              <li>Turn on your camera and microphone when ready</li>
            </ol>
          </CardContent>
        </Card>

        {/* Recording Info Card */}
        <Card className="mt-4 border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="font-medium">Auto-Recording Enabled</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This class is being recorded automatically. The recording will be available 
              in the Class Recordings section shortly after the class ends.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveClassPage;
