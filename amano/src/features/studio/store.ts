import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Draft courses authored in the Course Builder (prototype persistence).
 *  Publishing submits to the admin review queue per the architecture —
 *  drafts therefore live in the studio, not the public catalogue. */

export interface DraftModule {
  id: string;
  title: string;
  lessons: string[];
}

export interface DraftCourse {
  id: string;
  title: string;
  subtitle: string;
  verticalId: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  priceZmw: number | null;
  modules: DraftModule[];
  status: "Draft" | "In review";
  updatedAt: string;
}

interface StudioState {
  drafts: DraftCourse[];
  upsertDraft: (draft: DraftCourse) => void;
  deleteDraft: (id: string) => void;
  submitForReview: (id: string) => void;
}

export const useStudio = create<StudioState>()(
  persist(
    (set) => ({
      drafts: [
        {
          id: "draft-negotiation",
          title: "Commercial Negotiation Masterclass",
          subtitle: "Close better deals for Zambian clients",
          verticalId: "law",
          level: "Advanced",
          priceZmw: 520,
          modules: [
            { id: "m1", title: "Preparing the ground", lessons: ["Reading the other side", "Setting your walk-away"] },
            { id: "m2", title: "At the table", lessons: ["Anchoring and concessions", "Handling deadlock"] },
          ],
          status: "Draft",
          updatedAt: "2026-07-12",
        },
      ],
      upsertDraft: (draft) =>
        set((s) => ({
          drafts: [
            { ...draft, updatedAt: new Date().toISOString().slice(0, 10) },
            ...s.drafts.filter((d) => d.id !== draft.id),
          ],
        })),
      deleteDraft: (id) =>
        set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
      submitForReview: (id) =>
        set((s) => ({
          drafts: s.drafts.map((d) =>
            d.id === id ? { ...d, status: "In review" as const } : d
          ),
        })),
    }),
    { name: "amano.studio" }
  )
);
