import { create } from "zustand";
import { persist } from "zustand/middleware";
import { allLessons } from "@/data/sample/curriculum";

/**
 * Learning-state store (prototype persistence).
 * Same repository shapes the Supabase implementation will serve later.
 */

export interface CertificateRecord {
  courseId: string;
  serial: string;
  issuedAt: string; // ISO date
}

interface LearnState {
  /** courseId -> completed lesson ids */
  completed: Record<string, string[]>;
  /** courseId -> enrolled */
  enrolled: string[];
  /** courseId -> last opened lesson id */
  lastLesson: Record<string, string>;
  /** courseId -> best quiz score (percent) */
  quizScores: Record<string, number>;
  certificates: CertificateRecord[];
  notes: Record<string, string>; // lessonId -> note text

  enroll: (courseId: string) => void;
  openLesson: (courseId: string, lessonId: string) => void;
  toggleComplete: (courseId: string, lessonId: string) => void;
  recordQuiz: (courseId: string, score: number) => void;
  claimCertificate: (courseId: string) => CertificateRecord;
  saveNote: (lessonId: string, text: string) => void;
}

let serialCounter = 4821;

export const useLearn = create<LearnState>()(
  persist(
    (set, get) => ({
      // seeded so a fresh prototype already feels lived-in
      completed: {
        c1: ["c1-s0-l0", "c1-s0-l1", "c1-s0-l2", "c1-s1-l0", "c1-s1-l1"],
        c8: ["c8-s0-l0", "c8-s0-l1", "c8-s0-l2", "c8-s1-l0", "c8-s1-l1", "c8-s1-l2", "c8-s2-l0", "c8-s2-l1", "c8-s2-l2", "c8-s3-l0", "c8-s3-l1"],
        c3: ["c3-s0-l0", "c3-s0-l1", "c3-s0-l2", "c3-s1-l0"],
      },
      enrolled: ["c1", "c3", "c8"],
      lastLesson: { c1: "c1-s1-l1", c3: "c3-s1-l0", c8: "c8-s3-l1" },
      quizScores: {},
      certificates: [],
      notes: {},

      enroll: (courseId) =>
        set((s) =>
          s.enrolled.includes(courseId)
            ? s
            : { enrolled: [...s.enrolled, courseId] }
        ),

      openLesson: (courseId, lessonId) =>
        set((s) => ({ lastLesson: { ...s.lastLesson, [courseId]: lessonId } })),

      toggleComplete: (courseId, lessonId) =>
        set((s) => {
          const done = s.completed[courseId] ?? [];
          const next = done.includes(lessonId)
            ? done.filter((id) => id !== lessonId)
            : [...done, lessonId];
          return { completed: { ...s.completed, [courseId]: next } };
        }),

      recordQuiz: (courseId, score) =>
        set((s) => ({
          quizScores: {
            ...s.quizScores,
            [courseId]: Math.max(score, s.quizScores[courseId] ?? 0),
          },
        })),

      claimCertificate: (courseId) => {
        const existing = get().certificates.find((c) => c.courseId === courseId);
        if (existing) return existing;
        const record: CertificateRecord = {
          courseId,
          serial: `AMN-${new Date().getFullYear()}-${String(serialCounter++).padStart(6, "0")}`,
          issuedAt: new Date().toISOString(),
        };
        set((s) => ({ certificates: [...s.certificates, record] }));
        return record;
      },

      saveNote: (lessonId, text) =>
        set((s) => ({ notes: { ...s.notes, [lessonId]: text } })),
    }),
    { name: "amano.learn" }
  )
);

/* Selectors */
export function courseProgress(
  state: Pick<LearnState, "completed">,
  courseId: string
): number {
  const total = allLessons(courseId).length;
  if (!total) return 0;
  const done = state.completed[courseId]?.length ?? 0;
  return Math.round((done / total) * 100);
}
