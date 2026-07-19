import { courseById } from "./catalog";

export interface LessonData {
  id: string;
  title: string;
  durationMin: number;
  kind: "video" | "quiz";
  transcript?: string;
}

export interface SectionData {
  id: string;
  title: string;
  lessons: LessonData[];
}

export interface QuizQuestionData {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** Hand-written curricula for flagship courses; structured generation for the rest. */
const handWritten: Record<string, { sections: [string, string[]][]; }> = {
  // Tax in Zambia — the flagship demo course
  c2: {
    sections: [
      ["Foundations of Zambian tax", [
        "Why tax matters: the social contract",
        "The Zambia Revenue Authority and how it works",
        "Tax types at a glance: PAYE, VAT, turnover, withholding",
      ]],
      ["PAYE in practice", [
        "Who pays PAYE and current bands",
        "Calculating PAYE step by step",
        "Payroll filing on the ZRA portal",
      ]],
      ["VAT and turnover tax", [
        "Registration thresholds: which regime are you in?",
        "Charging and claiming VAT correctly",
        "Turnover tax for small businesses",
      ]],
      ["Filing and staying compliant", [
        "Provisional tax and important deadlines",
        "Penalties, interest, and how to avoid them",
        "Case study: a Lusaka trading company's full year",
      ]],
    ],
  },
  c1: {
    sections: [
      ["Companies and how they are born", [
        "Choosing a vehicle: sole trader, partnership, company",
        "Incorporation at PACRA in practice",
        "The constitution: articles that matter",
      ]],
      ["Directors, shareholders, and power", [
        "Duties of directors under the Companies Act",
        "Shareholder agreements: the clauses that bite",
        "Board meetings and resolutions done properly",
      ]],
      ["Contracts that hold", [
        "Anatomy of a commercial contract",
        "Drafting workshop: a service agreement",
        "Negotiation and common traps",
      ]],
      ["Governance and staying compliant", [
        "Annual returns and statutory registers",
        "When things go wrong: disputes and remedies",
        "Capstone: advising a growing Zambian company",
      ]],
    ],
  },
};

const genericSectionTitles = [
  "Getting started",
  "Core skills",
  "Applied practice",
  "Mastery and next steps",
];

function makeTranscript(courseTitle: string, lessonTitle: string): string {
  return (
    `Welcome back to ${courseTitle}. In this lesson — ${lessonTitle} — we work through the idea in the way you would meet it in real Zambian practice, not just in theory.\n\n` +
    `We begin with a concrete situation: a professional in Lusaka facing exactly this problem on an ordinary working day. From there we break the method into steps you can repeat: what to look at first, the decision you must make, and the mistake most people make at this point.\n\n` +
    `By the end of the lesson you should be able to apply this yourself. Pause the video and try the exercise in the resources before moving on. When you are ready, Amano AI can quiz you on what you have just learned.`
  );
}

const curriculumCache = new Map<string, SectionData[]>();

export function getCurriculum(courseId: string): SectionData[] {
  const cached = curriculumCache.get(courseId);
  if (cached) return cached;

  const course = courseById(courseId);
  if (!course) return [];

  const plan = handWritten[courseId];
  const sectionSpecs: [string, string[]][] =
    plan?.sections ??
    genericSectionTitles.map((t, si) => [
      t,
      Array.from({ length: 3 }, (_, li) =>
        `${course.title}: lesson ${si * 3 + li + 1}`
      ),
    ]);

  const sections: SectionData[] = sectionSpecs.map(([title, lessonTitles], si) => ({
    id: `${courseId}-s${si}`,
    title,
    lessons: lessonTitles.map((lt, li) => ({
      id: `${courseId}-s${si}-l${li}`,
      title: lt,
      durationMin: 6 + ((si * 3 + li * 5) % 9),
      kind: "video" as const,
      transcript: makeTranscript(course.title, lt),
    })),
  }));

  // Final assessment closes every course
  sections[sections.length - 1].lessons.push({
    id: `${courseId}-final-quiz`,
    title: "Final assessment",
    durationMin: 15,
    kind: "quiz",
  });

  curriculumCache.set(courseId, sections);
  return sections;
}

export function allLessons(courseId: string): LessonData[] {
  return getCurriculum(courseId).flatMap((s) => s.lessons);
}

/* ── Quizzes ─────────────────────────────────────────────────────────── */

const handWrittenQuizzes: Record<string, QuizQuestionData[]> = {
  c2: [
    {
      id: "c2-q1",
      prompt: "A Lusaka boutique has annual turnover of K650,000. Which tax regime applies?",
      options: ["Turnover tax", "Standard VAT registration is compulsory", "PAYE only", "No tax below K800,000"],
      answerIndex: 1,
      explanation: "Above the K500,000 five-year (K800,000 twelve-month) threshold, VAT registration is compulsory; turnover tax is for smaller businesses.",
    },
    {
      id: "c2-q2",
      prompt: "PAYE is remitted to ZRA by…",
      options: ["The employee, quarterly", "The employer, monthly", "The bank, annually", "Only on bonuses"],
      answerIndex: 1,
      explanation: "Employers deduct PAYE from salaries and remit it monthly through the ZRA portal.",
    },
    {
      id: "c2-q3",
      prompt: "Which of these is a withholding-tax situation?",
      options: ["Paying rent to a landlord", "Buying stock from a wholesaler", "Paying a monthly salary", "Charging VAT on sales"],
      answerIndex: 0,
      explanation: "Rent paid to a landlord attracts withholding tax which the tenant must withhold and remit.",
    },
    {
      id: "c2-q4",
      prompt: "Missing a provisional tax deadline typically leads to…",
      options: ["Nothing if you file eventually", "Penalties plus interest on the unpaid amount", "Automatic deregistration", "A refund"],
      answerIndex: 1,
      explanation: "Late filing and payment attract penalties and interest — the course's compliance calendar helps you avoid both.",
    },
  ],
};

export function getQuiz(courseId: string): QuizQuestionData[] {
  const hw = handWrittenQuizzes[courseId];
  if (hw) return hw;
  const course = courseById(courseId);
  const title = course?.title ?? "this course";
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${courseId}-q${i + 1}`,
    prompt: `In ${title}, which statement best reflects the practice taught in module ${i + 1}?`,
    options: [
      "Apply the structured method demonstrated in the lessons",
      "Rely on instinct and skip the preparation",
      "Copy a template without adapting it",
      "Defer every decision to someone else",
    ],
    answerIndex: 0,
    explanation: "Each module builds a repeatable method — the disciplined approach is always the examinable answer.",
  }));
}

export const PASS_MARK = 75;
