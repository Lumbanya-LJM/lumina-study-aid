import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Video } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  name: string;
}

interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (classId: string, roomName: string) => void;
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    scheduledDate: undefined as Date | undefined,
    scheduledTime: "",
  });

  useEffect(() => {
    const loadCourses = async () => {
      if (!user) return;

      // Get tutor's approved application to find their assigned courses
      const { data: tutorApp } = await supabase
        .from("tutor_applications")
        .select("selected_courses")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();

      // Note: selected_courses stores course names, not UUIDs
      const tutorCourseNames = tutorApp?.selected_courses || [];

      if (tutorCourseNames.length > 0) {
        const { data } = await supabase
          .from("academy_courses")
          .select("id, name")
          .eq("is_active", true)
          .in("name", tutorCourseNames);
        setCourses(data || []);
      } else {
        setCourses([]);
      }
    };
    loadCourses();
  }, [user]);

  const handleCreate = async () => {
    if (!formData.title) {
      toast({
        title: "Title Required",
        description: "Please enter a class title.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create Daily.co room
      const { data: roomData, error: roomError } = await supabase.functions.invoke(
        "daily-room",
        {
          body: { 
            action: "create", 
            title: formData.title,
            expiresInMinutes: 180,
          },
        }
      );

      if (roomError || !roomData?.success) {
        throw new Error(roomError?.message || roomData?.error || "Failed to create video room");
      }

      // Calculate scheduled datetime
      let scheduledAt = null;
      if (formData.scheduledDate && formData.scheduledTime) {
        const [hours, minutes] = formData.scheduledTime.split(":").map(Number);
        const scheduled = new Date(formData.scheduledDate);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledAt = scheduled.toISOString();
      }

      // Create class record in database
      const { data: classData, error: classError } = await supabase
        .from("live_classes")
        .insert({
          title: formData.title,
          description: formData.description,
          course_id: formData.courseId || null,
          host_id: user?.id,
          daily_room_name: roomData.roomName,
          daily_room_url: roomData.roomUrl,
          status: scheduledAt ? "scheduled" : "live",
          scheduled_at: scheduledAt,
          started_at: scheduledAt ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (classError) {
        throw new Error(classError.message);
      }

      toast({
        title: "Class Created",
        description: scheduledAt
          ? "Your class has been scheduled."
          : "Your class is now live!",
      });

      onCreated(classData.id, roomData.roomName);
    } catch (error) {
      console.error("Create class error:", error);
      toast({
        title: "Failed to Create Class",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Create Live Class
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Class Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Constitutional Law Review"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What will this class cover?"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Course (Optional)</Label>
            <Select
              value={formData.courseId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, courseId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduledDate
                      ? format(formData.scheduledDate, "PPP")
                      : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.scheduledDate}
                    onSelect={(date) =>
                      setFormData((prev) => ({ ...prev, scheduledDate: date }))
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, scheduledTime: e.target.value }))
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Leave date and time empty to start the class immediately.
          </p>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : formData.scheduledDate ? (
                "Schedule Class"
              ) : (
                "Start Now"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClassModal;
