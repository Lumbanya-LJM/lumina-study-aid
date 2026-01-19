import React, { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import lmvLogo from "@/assets/lmv-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { saveOfflineRecording, getOfflineRecording, isOfflineSupported } from "@/lib/offlineStorage";

interface SecureVideoPlayerProps {
  classId: string;
  title?: string;
  onError?: (error: string) => void;
  className?: string;
  initialProgress?: number;
  onProgressUpdate?: (progress: number, duration: number, completed: boolean) => void;
  showDownload?: boolean;
}

const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  classId,
  title,
  onError,
  className,
  initialProgress = 0,
  onProgressUpdate,
  showDownload = true,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [hasSetInitialProgress, setHasSetInitialProgress] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedProgressRef = useRef<number>(0);
  const blobUrlRef = useRef<string | null>(null);

  // Check if recording is already downloaded
  useEffect(() => {
    const checkDownloaded = async () => {
      if (!isOfflineSupported()) return;
      try {
        const offline = await getOfflineRecording(classId);
        if (offline) {
          setIsDownloaded(true);
        }
      } catch (e) {
        console.error("Error checking offline status:", e);
      }
    };
    checkDownloaded();
  }, [classId]);

  useEffect(() => {
    let mounted = true;
    
    const loadVideo = async () => {
      setLoading(true);
      setError(null);

      try {
        // First check if we have an offline copy
        if (isOfflineSupported()) {
          const offlineRecording = await getOfflineRecording(classId);
          if (offlineRecording && offlineRecording.blob) {
            console.log("Loading from offline storage");
            const blobUrl = URL.createObjectURL(offlineRecording.blob);
            blobUrlRef.current = blobUrl;
            
            if (mounted && videoRef.current) {
              videoRef.current.src = blobUrl;
              setIsDownloaded(true);
              setLoading(false);
              return;
            }
          }
        }

        // Get the current session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Please log in to view recordings");
        }

        // Use a token-in-query playback URL so the <video> element can request range chunks.
        // (The video element cannot send Authorization headers.)
        const playbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-recording?` +
          new URLSearchParams({
            classId,
            action: "stream",
            token: session.access_token,
          }).toString();

        if (mounted && videoRef.current) {
          videoRef.current.src = playbackUrl;
        }
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load recording";
        console.error("Video load error:", message);
        setError(message);
        onError?.(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadVideo();

    return () => {
      mounted = false;
      // Clean up blob URL when component unmounts
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [classId, onError]);

  // Prevent right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("contextmenu", handleContextMenu);
      return () => container.removeEventListener("contextmenu", handleContextMenu);
    }
  }, []);

  // Auto-hide controls
  useEffect(() => {
    const hideControls = () => {
      if (isPlaying) {
        setShowControls(false);
      }
    };

    if (showControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(hideControls, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // Save progress with debounce
  const saveProgress = useCallback((time: number, videoDuration: number, isCompleted: boolean) => {
    // Only save if progress changed significantly (more than 5 seconds)
    if (Math.abs(time - lastSavedProgressRef.current) < 5 && !isCompleted) {
      return;
    }
    
    lastSavedProgressRef.current = time;
    onProgressUpdate?.(time, videoDuration, isCompleted);
  }, [onProgressUpdate]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      const videoDuration = videoRef.current.duration;
      setCurrentTime(time);
      
      // Debounced progress save
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
      progressSaveTimeoutRef.current = setTimeout(() => {
        const completed = videoDuration > 0 && time >= videoDuration - 10; // Consider complete if within 10s of end
        saveProgress(time, videoDuration, completed);
      }, 2000); // Save every 2 seconds max
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      
      // Set initial progress if we have one and haven't set it yet
      if (initialProgress > 0 && !hasSetInitialProgress && initialProgress < videoDuration - 10) {
        videoRef.current.currentTime = initialProgress;
        setCurrentTime(initialProgress);
        setHasSetInitialProgress(true);
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      saveProgress(videoRef.current.duration, videoRef.current.duration, true);
    }
  };

  // Cleanup on unmount - save final progress
  useEffect(() => {
    return () => {
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
      // Save final progress on unmount
      if (videoRef.current && duration > 0) {
        const completed = currentTime >= duration - 10;
        onProgressUpdate?.(currentTime, duration, completed);
      }
    };
  }, [currentTime, duration, onProgressUpdate]);

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  // Download for offline viewing
  const handleDownload = async () => {
    if (!isOfflineSupported()) {
      toast({
        title: "Not Supported",
        description: "Offline downloads are not supported on this device.",
        variant: "destructive",
      });
      return;
    }

    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in to download recordings");
      }

      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-recording?classId=${classId}&action=stream`;
      
      toast({
        title: "Downloading...",
        description: "Please wait while the recording is saved for offline viewing.",
      });

      const response = await fetch(streamUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download recording");
      }

      const blob = await response.blob();
      
      await saveOfflineRecording({
        id: classId,
        title: title || "Recording",
        blob,
        downloadedAt: Date.now(),
        duration: duration || 0,
      });

      setIsDownloaded(true);
      toast({
        title: "Download Complete",
        description: "Recording saved! You can watch it offline from the Downloads tab.",
      });
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Could not download recording.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className={cn("bg-black rounded-lg flex items-center justify-center aspect-video", className)}>
        <div className="text-center text-white p-4">
          <p className="text-red-400 mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden aspect-video select-none",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-2" />
            <p className="text-white/70 text-sm">Loading recording...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onError={(e) => {
          console.error("Video element error:", e);
          setError("Playback error. Please try again.");
        }}
        playsInline
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Download Protection Overlay - deters screen capture tools */}
      <div className="absolute inset-0 pointer-events-none z-[5]">
        {/* Multiple watermarks positioned across the video */}
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
        {/* Center watermark */}
        <div className="flex items-center justify-center h-full">
          <img 
            src={lmvLogo} 
            alt="" 
            className="w-32 h-32 md:w-40 md:h-40 opacity-15 rotate-[-15deg] select-none"
            draggable={false}
          />
        </div>
        {/* Invisible protection layer that triggers screen capture detection */}
        <div 
          className="absolute inset-0 mix-blend-difference opacity-0"
          style={{ 
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.01) 10px, rgba(255,255,255,0.01) 20px)'
          }}
        />
      </div>

      {/* Custom Controls */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Click to play/pause overlay */}
        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {!isPlaying && !loading && (
            <div className="w-20 h-20 bg-primary/80 rounded-full flex items-center justify-center">
              <Play className="h-10 w-10 text-white ml-1" />
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
          {/* Progress bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={handleRestart}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-8 w-8"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="w-0 group-hover:w-20 overflow-hidden transition-all duration-200">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              <span className="text-white/80 text-sm ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {title && (
                <span className="text-white/70 text-sm mr-4 hidden sm:block truncate max-w-xs">
                  {title}
                </span>
              )}
              
              {/* Download button */}
              {showDownload && isOfflineSupported() && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-white hover:bg-white/20 h-8 w-8",
                    isDownloaded && "text-green-400"
                  )}
                  onClick={handleDownload}
                  disabled={downloading || isDownloaded}
                  title={isDownloaded ? "Downloaded for offline" : "Download for offline"}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isDownloaded ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={handleFullscreen}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureVideoPlayer;