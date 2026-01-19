import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OfflineRecording } from "@/lib/offlineStorage";
import { Play, Pause, X } from "lucide-react";

export function OfflineRecordingDialog({
  recording,
  open,
  onOpenChange,
}: {
  recording: OfflineRecording | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const blobUrl = useMemo(() => {
    if (!recording?.blob) return null;
    return URL.createObjectURL(recording.blob);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Reset play state when switching recordings / closing
  useEffect(() => {
    if (!open) setIsPlaying(false);
  }, [open, recording?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 pb-0 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="pr-8">{recording?.title ?? "Offline Recording"}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 pt-2 overflow-y-auto flex-1">
          {!recording || !blobUrl ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No recording selected.</div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                <video
                  src={blobUrl}
                  controls
                  playsInline
                  className="w-full h-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const v = document.querySelector<HTMLVideoElement>(`video[src='${blobUrl}']`);
                    if (!v) return;
                    if (v.paused) v.play();
                    else v.pause();
                  }}
                  className="gap-2"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Offline recordings play from your device storage.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
