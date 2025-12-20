import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  Monitor, 
  Users, 
  MessageSquare,
  Circle,
  Settings,
  MoreVertical,
  Hand,
  Maximize,
  Minimize
} from "lucide-react";
import { useDailyCall } from "@/hooks/useDailyCall";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DailyIframe from "@daily-co/daily-js";
import LuminaPostClassModal from "./LuminaPostClassModal";

interface LiveClassRoomProps {
  classId: string;
  roomName: string;
  roomUrl?: string;
  classTitle: string;
  isHost: boolean;
  onLeave?: () => void;
}

interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: Date;
}

const LiveClassRoom: React.FC<LiveClassRoomProps> = ({
  classId,
  roomName,
  roomUrl,
  classTitle,
  isHost,
  onLeave,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPostClassModal, setShowPostClassModal] = useState(false);
  const [classSummary, setClassSummary] = useState<any>(null);

  const handleTranscript = useCallback((text: string, speakerName: string) => {
    setTranscripts((prev) => [
      ...prev,
      { speaker: speakerName, text, timestamp: new Date() },
    ]);
  }, []);

  const handleCallEnded = useCallback(async () => {
    // Generate summary when class ends
    try {
      const { data, error } = await supabase.functions.invoke("generate-class-summary", {
        body: { classId },
      });

      if (error) throw error;

      setClassSummary(data.summary);
      setShowPostClassModal(true);
    } catch (error) {
      console.error("Failed to generate summary:", error);
      // Still show modal even if summary generation fails
      setShowPostClassModal(true);
    }
  }, [classId]);

  const {
    callObject,
    participants,
    isJoined,
    isRecording,
    isMuted,
    isVideoOff,
    isScreenSharing,
    connectionState,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
  } = useDailyCall({
    classId,
    roomName,
    roomUrl,
    userName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student",
    userId: user?.id || "",
    isHost,
    onTranscript: handleTranscript,
    onCallEnded: handleCallEnded,
  });

  // Join call on mount
  useEffect(() => {
    if (!isJoined && connectionState === "idle") {
      joinCall();
    }
  }, [joinCall, isJoined, connectionState]);

  // Handle leaving the call
  const handleLeave = async () => {
    if (isHost && isRecording) {
      await stopRecording();
    }
    await leaveCall();
    
    // Update class status if host
    if (isHost) {
      await supabase
        .from("live_classes")
        .update({ 
          status: "ended", 
          ended_at: new Date().toISOString() 
        })
        .eq("id", classId);
      
      // Fetch recordings and save URL to database
      try {
        await supabase.functions.invoke("daily-room", {
          body: {
            action: "get-recordings",
            roomName,
            classId,
          },
        });
      } catch (error) {
        console.error("Failed to fetch recordings:", error);
      }
    }
    
    handleCallEnded();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (connectionState === "connecting") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Connecting to class...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-medium truncate max-w-[200px] sm:max-w-none">
            {classTitle}
          </h1>
          {isRecording && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-current animate-pulse" />
              Recording
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {participants.length}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4">
          <div className={`grid gap-2 h-full ${
            participants.length === 1 ? "grid-cols-1" :
            participants.length <= 4 ? "grid-cols-2" :
            participants.length <= 9 ? "grid-cols-3" :
            "grid-cols-4"
          }`}>
            {participants.map((participant) => (
              <Card 
                key={participant.id} 
                className={`relative bg-zinc-800 border-zinc-700 overflow-hidden ${
                  participant.local ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="p-0 h-full flex items-center justify-center">
                  {participant.video ? (
                    <video
                      autoPlay
                      playsInline
                      muted={participant.local}
                      className="w-full h-full object-cover"
                      id={`video-${participant.id}`}
                    />
                  ) : (
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="text-2xl bg-zinc-700 text-white">
                        {participant.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-xs text-white bg-black/50 px-2 py-1 rounded truncate">
                      {participant.user_name} {participant.local && "(You)"}
                    </span>
                    <div className="flex gap-1">
                      {!participant.audio && (
                        <MicOff className="h-4 w-4 text-red-400" />
                      )}
                      {participant.screen && (
                        <Monitor className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Side panels */}
        {(showChat || showParticipants || showTranscript) && (
          <div className="w-80 bg-zinc-800 border-l border-zinc-700 flex flex-col">
            {/* Panel tabs */}
            <div className="flex border-b border-zinc-700">
              <button
                className={`flex-1 py-2 text-sm ${showTranscript ? "text-white border-b-2 border-primary" : "text-zinc-400"}`}
                onClick={() => { setShowTranscript(true); setShowChat(false); setShowParticipants(false); }}
              >
                Transcript
              </button>
              <button
                className={`flex-1 py-2 text-sm ${showChat ? "text-white border-b-2 border-primary" : "text-zinc-400"}`}
                onClick={() => { setShowChat(true); setShowTranscript(false); setShowParticipants(false); }}
              >
                Chat
              </button>
              <button
                className={`flex-1 py-2 text-sm ${showParticipants ? "text-white border-b-2 border-primary" : "text-zinc-400"}`}
                onClick={() => { setShowParticipants(true); setShowTranscript(false); setShowChat(false); }}
              >
                People
              </button>
            </div>

            {/* Transcript panel */}
            {showTranscript && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {transcripts.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-8">
                      Live transcription will appear here...
                    </p>
                  ) : (
                    transcripts.map((line, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-primary">
                            {line.speaker}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {line.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300">{line.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Chat panel */}
            {showChat && (
              <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="mb-2">
                      <span className="text-xs font-medium text-primary">{msg.sender}: </span>
                      <span className="text-sm text-zinc-300">{msg.text}</span>
                    </div>
                  ))}
                </ScrollArea>
                <div className="p-2 border-t border-zinc-700">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-zinc-700 border-none rounded px-3 py-2 text-sm text-white placeholder:text-zinc-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatInput.trim()) {
                        // Send chat message through Daily
                        if (callObject) {
                          callObject.sendAppMessage({ text: chatInput }, "*");
                        }
                        setChatMessages((prev) => [
                          ...prev,
                          { sender: user?.user_metadata?.full_name || "You", text: chatInput },
                        ]);
                        setChatInput("");
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Participants panel */}
            {showParticipants && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-zinc-700"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {p.user_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          {p.user_name} {p.local && "(You)"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {p.audio ? (
                          <Mic className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <MicOff className="h-4 w-4 text-red-400" />
                        )}
                        {p.video ? (
                          <Video className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <VideoOff className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 border-t border-zinc-700">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          onClick={toggleMute}
          className="rounded-full h-12 w-12"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant={isVideoOff ? "destructive" : "secondary"}
          size="icon"
          onClick={toggleVideo}
          className="rounded-full h-12 w-12"
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          onClick={toggleScreenShare}
          className="rounded-full h-12 w-12"
        >
          <Monitor className="h-5 w-5" />
        </Button>

        {isHost && (
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className="rounded-full h-12 w-12"
          >
            <Circle className={`h-5 w-5 ${isRecording ? "fill-current" : ""}`} />
          </Button>
        )}

        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowTranscript(!showTranscript && !showChat && !showParticipants ? true : !showTranscript)}
          className="rounded-full h-12 w-12"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowParticipants(!showParticipants)}
          className="rounded-full h-12 w-12"
        >
          <Users className="h-5 w-5" />
        </Button>

        <Button
          variant="destructive"
          size="icon"
          onClick={handleLeave}
          className="rounded-full h-12 w-12 ml-4"
        >
          <Phone className="h-5 w-5 rotate-[135deg]" />
        </Button>
      </div>

      {/* Post-class Lumina modal */}
      <LuminaPostClassModal
        open={showPostClassModal}
        onClose={() => {
          setShowPostClassModal(false);
          onLeave?.();
          navigate("/academy");
        }}
        classTitle={classTitle}
        classId={classId}
        summary={classSummary}
        transcripts={transcripts}
      />
    </div>
  );
};

export default LiveClassRoom;
