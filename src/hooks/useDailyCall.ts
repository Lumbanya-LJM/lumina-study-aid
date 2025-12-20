import { useState, useCallback, useEffect, useRef } from "react";
import DailyIframe, { DailyCall, DailyEventObjectParticipant } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  audio: boolean;
  video: boolean;
  screen: boolean;
  local: boolean;
}

interface UseDailyCallOptions {
  classId: string;
  roomName: string;
  userName: string;
  userId: string;
  isHost: boolean;
  onTranscript?: (text: string, speakerName: string) => void;
  onCallEnded?: () => void;
}

export const useDailyCall = (options: UseDailyCallOptions) => {
  const { classId, roomName, userName, userId, isHost, onTranscript, onCallEnded } = options;
  const { toast } = useToast();
  
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("idle");
  
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateParticipants = useCallback((call: DailyCall) => {
    const dailyParticipants = call.participants();
    const mapped: Participant[] = Object.entries(dailyParticipants).map(([id, p]) => ({
      id,
      user_id: p.user_id || id,
      user_name: p.user_name || "Guest",
      audio: p.audio !== false,
      video: p.video !== false,
      screen: !!p.screen,
      local: p.local || false,
    }));
    setParticipants(mapped);
  }, []);

  const joinCall = useCallback(async () => {
    if (callObject) return;

    try {
      setConnectionState("connecting");
      
      // Get meeting token from edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("daily-room", {
        body: { 
          action: "get-token", 
          roomName, 
          userId, 
          userName 
        },
      });

      if (tokenError || !tokenData?.token) {
        throw new Error(tokenError?.message || "Failed to get meeting token");
      }

      // Create Daily call object
      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true,
      });

      // Set up event handlers
      call.on("joined-meeting", () => {
        console.log("Joined meeting");
        setIsJoined(true);
        setConnectionState("connected");
        updateParticipants(call);
        
        // Record participation
        supabase.from("class_participants").insert({
          class_id: classId,
          user_id: userId,
        }).then(({ error }) => {
          if (error) console.error("Failed to record participation:", error);
        });
      });

      call.on("left-meeting", () => {
        console.log("Left meeting");
        setIsJoined(false);
        setConnectionState("disconnected");
        onCallEnded?.();
      });

      call.on("participant-joined", () => {
        updateParticipants(call);
      });

      call.on("participant-left", () => {
        updateParticipants(call);
      });

      call.on("participant-updated", () => {
        updateParticipants(call);
      });

      call.on("recording-started", () => {
        setIsRecording(true);
        toast({
          title: "Recording Started",
          description: "This class is now being recorded.",
        });
      });

      call.on("recording-stopped", () => {
        setIsRecording(false);
        toast({
          title: "Recording Stopped",
          description: "Class recording has been saved.",
        });
      });

      call.on("transcription-message", (event: any) => {
        if (event.text && onTranscript) {
          const speakerName = event.participantId 
            ? call.participants()[event.participantId]?.user_name || "Speaker"
            : "Speaker";
          onTranscript(event.text, speakerName);
          
          // Save transcript to database
          supabase.from("class_transcripts").insert({
            class_id: classId,
            speaker_name: speakerName,
            speaker_id: event.participantId,
            content: event.text,
            timestamp_ms: Date.now(),
          }).then(({ error }) => {
            if (error) console.error("Failed to save transcript:", error);
          });
        }
      });

      call.on("error", (error) => {
        console.error("Daily call error:", error);
        setConnectionState("error");
        toast({
          title: "Connection Error",
          description: "There was an error with the video call.",
          variant: "destructive",
        });
      });

      setCallObject(call);

      // Join the room
      await call.join({
        url: `https://lumina.daily.co/${roomName}`,
        token: tokenData.token,
      });

      // Start transcription if host
      if (isHost) {
        try {
          await call.startTranscription();
          console.log("Transcription started");
        } catch (err) {
          console.error("Failed to start transcription:", err);
        }
      }

    } catch (error) {
      console.error("Failed to join call:", error);
      setConnectionState("error");
      toast({
        title: "Failed to Join",
        description: error instanceof Error ? error.message : "Could not join the class",
        variant: "destructive",
      });
    }
  }, [callObject, roomName, userId, userName, classId, isHost, onTranscript, onCallEnded, updateParticipants, toast]);

  const leaveCall = useCallback(async () => {
    if (!callObject) return;

    try {
      // Update participation record
      await supabase
        .from("class_participants")
        .update({ 
          left_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - Date.now()) / 1000),
        })
        .eq("class_id", classId)
        .eq("user_id", userId)
        .is("left_at", null);

      await callObject.leave();
      callObject.destroy();
      setCallObject(null);
      setIsJoined(false);
      setParticipants([]);
    } catch (error) {
      console.error("Failed to leave call:", error);
    }
  }, [callObject, classId, userId]);

  const toggleMute = useCallback(() => {
    if (!callObject) return;
    const newMuted = !isMuted;
    callObject.setLocalAudio(!newMuted);
    setIsMuted(newMuted);
  }, [callObject, isMuted]);

  const toggleVideo = useCallback(() => {
    if (!callObject) return;
    const newVideoOff = !isVideoOff;
    callObject.setLocalVideo(!newVideoOff);
    setIsVideoOff(newVideoOff);
  }, [callObject, isVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    if (!callObject) return;

    try {
      if (isScreenSharing) {
        await callObject.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await callObject.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error("Screen share error:", error);
      toast({
        title: "Screen Share Error",
        description: "Could not share screen. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [callObject, isScreenSharing, toast]);

  const startRecording = useCallback(async () => {
    if (!callObject || !isHost) return;

    try {
      await callObject.startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Recording Error",
        description: "Could not start recording.",
        variant: "destructive",
      });
    }
  }, [callObject, isHost, toast]);

  const stopRecording = useCallback(async () => {
    if (!callObject || !isHost) return;

    try {
      await callObject.stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  }, [callObject, isHost]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callObject) {
        callObject.leave();
        callObject.destroy();
      }
    };
  }, [callObject]);

  return {
    callObject,
    participants,
    isJoined,
    isRecording,
    isMuted,
    isVideoOff,
    isScreenSharing,
    connectionState,
    containerRef,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
  };
};
