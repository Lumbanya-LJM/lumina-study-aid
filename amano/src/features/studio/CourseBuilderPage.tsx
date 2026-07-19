import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Save, Trash2, Video } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fadeRise, staggerParent } from "@/design-system/motion";
import { verticals } from "@/data/sample/catalog";
import { toast } from "sonner";
import { useStudio, type DraftCourse, type DraftModule } from "./store";

const levels = ["Beginner", "Intermediate", "Advanced"] as const;

export default function CourseBuilderPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { drafts, upsertDraft } = useStudio();
  const existing = drafts.find((d) => d.id === draftId);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? "");
  const [verticalId, setVerticalId] = useState(existing?.verticalId ?? "law");
  const [level, setLevel] = useState<DraftCourse["level"]>(existing?.level ?? "Beginner");
  const [price, setPrice] = useState(existing?.priceZmw?.toString() ?? "");
  const [modules, setModules] = useState<DraftModule[]>(
    existing?.modules ?? [{ id: crypto.randomUUID(), title: "Getting started", lessons: ["Welcome to the course"] }]
  );

  const save = () => {
    if (!title.trim()) return toast.error("Give the course a title first.");
    upsertDraft({
      id: existing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      verticalId,
      level,
      priceZmw: price ? Number(price) : null,
      modules,
      status: existing?.status ?? "Draft",
      updatedAt: "",
    });
    toast.success("Draft saved.");
    navigate("/instructor/courses");
  };

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="mx-auto max-w-3xl space-y-8">
      <motion.header variants={fadeRise}>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {existing ? "Edit course" : "New course"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Outline first, video later — a clear curriculum is what earns enrolments.
        </p>
      </motion.header>

      {/* Basics */}
      <motion.section variants={fadeRise} className="card-raise space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="title">Course title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mining Procurement in Practice" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="One sentence on the outcome students get" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Academy</Label>
            <Select value={verticalId} onValueChange={setVerticalId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {verticals.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as DraftCourse["level"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {levels.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (ZMW)</Label>
            <Input id="price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Blank = Amano Pro" />
          </div>
        </div>
      </motion.section>

      {/* Curriculum outline */}
      <motion.section variants={fadeRise} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-foreground">Curriculum</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setModules((m) => [...m, { id: crypto.randomUUID(), title: `Module ${m.length + 1}`, lessons: [] }])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add module
          </Button>
        </div>

        {modules.map((mod, mi) => (
          <div key={mod.id} className="card-raise space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Input
                value={mod.title}
                onChange={(e) =>
                  setModules((ms) => ms.map((m) => (m.id === mod.id ? { ...m, title: e.target.value } : m)))
                }
                className="font-semibold"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete module"
                onClick={() => setModules((ms) => ms.filter((m) => m.id !== mod.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-1.5">
              {mod.lessons.map((lesson, li) => (
                <li key={li} className="flex items-center gap-2">
                  <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={lesson}
                    onChange={(e) =>
                      setModules((ms) =>
                        ms.map((m) =>
                          m.id === mod.id
                            ? { ...m, lessons: m.lessons.map((l, i) => (i === li ? e.target.value : l)) }
                            : m
                        )
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove lesson"
                    onClick={() =>
                      setModules((ms) =>
                        ms.map((m) =>
                          m.id === mod.id ? { ...m, lessons: m.lessons.filter((_, i) => i !== li) } : m
                        )
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setModules((ms) =>
                  ms.map((m) => (m.id === mod.id ? { ...m, lessons: [...m.lessons, `Lesson ${m.lessons.length + 1}`] } : m))
                )
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add lesson
            </Button>
            <p className="text-xs text-muted-foreground">
              Module {mi + 1} · {mod.lessons.length} lessons — video upload, quizzes and
              assignments attach here once the outline is approved.
            </p>
          </div>
        ))}
      </motion.section>

      <motion.footer variants={fadeRise} className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/instructor/courses")}>
          Cancel
        </Button>
        <Button variant="gold" onClick={save}>
          <Save className="h-4 w-4" /> Save draft
        </Button>
      </motion.footer>
    </motion.div>
  );
}
