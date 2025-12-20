import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LiveClassRoom from "@/components/liveclass/LiveClassRoom";
import { Loader2 } from "lucide-react";

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  daily_room_name: string;
  daily_room_url: string;
  host_id: string;
  status: string;
  course_id: string | null;
}

const LiveClassPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [liveClass, setLiveClass] = useState<LiveClass | null>(null);

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
          navigate("/academy");
          return;
        }

        setLiveClass(data);

        // Update class status to live if it was scheduled
        if (data.status === "scheduled" && data.host_id === user?.id) {
          await supabase
            .from("live_classes")
            .update({
              status: "live",
              started_at: new Date().toISOString(),
            })
            .eq("id", classId);
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
    <LiveClassRoom
      classId={liveClass.id}
      roomName={liveClass.daily_room_name}
      roomUrl={liveClass.daily_room_url}
      classTitle={liveClass.title}
      isHost={isHost}
      onLeave={() => navigate("/academy")}
    />
  );
};

export default LiveClassPage;
