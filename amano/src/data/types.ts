/**
 * Prototype domain types — a faithful subset of the full model in
 * docs/amano/02-domain-model.md. The sample-data repositories serve these;
 * the production Supabase repositories will serve the same shapes.
 */

export type Role =
  | "student"
  | "instructor"
  | "mentor"
  | "recruiter"
  | "university"
  | "corporate"
  | "admin";

export interface Person {
  id: string;
  handle: string;
  displayName: string;
  headline: string;
  location: string;
  avatarUrl?: string;
  verified?: boolean;
  roles: Role[];
}

export interface Vertical {
  id: string;
  name: string; // "Amano Law"
  slug: string;
  tagline: string;
}

export interface Course {
  id: string;
  verticalId: string;
  title: string;
  slug: string;
  subtitle: string;
  instructorId: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  priceZmw: number | null; // null = included in subscription
  rating: number;
  ratingCount: number;
  learners: number;
  durationHours: number;
  lessons: number;
  thumbnailTone: string; // placeholder gradient seed until real art
  skills: string[]; // skill ids this course leads to
}

export interface Enrollment {
  courseId: string;
  progressPct: number;
  lastLesson: string;
}

export interface Skill {
  id: string;
  name: string;
  verticalId: string;
  reviewMode: "AI_ONLY" | "AI_THEN_EXPERT";
}

export interface VerifiedSkillBadgeData {
  skillId: string;
  holderId: string;
  level: "Verified" | "Verified · Distinction";
  serial: string;
  issuedAt: string;
}

export interface LearningPath {
  id: string;
  title: string;
  slug: string;
  outcome: string;
  courseIds: string[];
}

export interface StatDatum {
  label: string;
  value: string;
  delta?: string;
  trend?: number[];
}
