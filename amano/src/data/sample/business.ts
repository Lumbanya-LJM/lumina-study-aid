/**
 * Sample data for the Instructor Studio and B2B dashboards.
 * The studio shows the academy of Chanda Mulenga (p1) — the flagship
 * demo instructor; B2B shows a Zambian bank and a partner university.
 */

/* ── Instructor Studio ───────────────────────────────────────────────── */

export const instructorId = "p1";
export const academyName = "Mulenga School of Corporate Law";

export const revenueByMonth = [
  { month: "Feb", zmw: 18400 },
  { month: "Mar", zmw: 22150 },
  { month: "Apr", zmw: 27800 },
  { month: "May", zmw: 31200 },
  { month: "Jun", zmw: 38650 },
  { month: "Jul", zmw: 48200 },
];

export const studioStats = {
  revenueMtdZmw: 48200,
  revenueDelta: "+12%",
  students: 5680,
  studentsDelta: "+8%",
  watchHours: 12440,
  watchDelta: "+15%",
  rating: 4.8,
};

export interface StudioReview {
  id: string;
  student: string;
  courseId: string;
  rating: number;
  body: string;
  when: string;
}

export const recentReviews: StudioReview[] = [
  { id: "rv1", student: "Joseph Sakala", courseId: "c1", rating: 5, body: "The shareholder agreement module alone was worth the fee. I used the clause checklist at work the next day.", when: "2 days ago" },
  { id: "rv2", student: "Grace Mwale", courseId: "c9", rating: 5, body: "Registered my business at PACRA in one week following the steps exactly. Thank you!", when: "5 days ago" },
  { id: "rv3", student: "Chipo Daka", courseId: "c1", rating: 4, body: "Excellent depth. Would love a downloadable board-resolution template pack.", when: "1 week ago" },
];

export interface PayoutRow {
  id: string;
  period: string;
  grossZmw: number;
  platformFeeZmw: number;
  netZmw: number;
  method: string;
  status: "Paid" | "Processing";
}

export const payouts: PayoutRow[] = [
  { id: "po-2026-06", period: "June 2026", grossZmw: 38650, platformFeeZmw: 7730, netZmw: 30920, method: "MTN MoMo ···789", status: "Paid" },
  { id: "po-2026-05", period: "May 2026", grossZmw: 31200, platformFeeZmw: 6240, netZmw: 24960, method: "MTN MoMo ···789", status: "Paid" },
  { id: "po-2026-04", period: "April 2026", grossZmw: 27800, platformFeeZmw: 5560, netZmw: 22240, method: "MTN MoMo ···789", status: "Paid" },
];

export const earningsBySource = [
  { source: "Course sales", zmw: 29400 },
  { source: "Amano Pro share", zmw: 11200 },
  { source: "Mentorship", zmw: 5400 },
  { source: "Products", zmw: 2200 },
];

/* ── Amano for Business (corporate) ─────────────────────────────────── */

export const corporate = {
  name: "Zanaco",
  seatsLicensed: 1000,
  seatsActive: 862,
  completionPct: 71,
  compliancePct: 88,
};

export interface Team {
  id: string;
  name: string;
  manager: string;
  members: number;
  completionPct: number;
  compliancePct: number;
  assignedPath: string;
}

export const teams: Team[] = [
  { id: "t1", name: "Retail Banking", manager: "Mutinta Hachilensa", members: 310, completionPct: 78, compliancePct: 94, assignedPath: "Customer Service & Compliance" },
  { id: "t2", name: "Credit & Risk", manager: "Kabwe Musonda", members: 145, completionPct: 82, compliancePct: 97, assignedPath: "Risk Analysis Pathway" },
  { id: "t3", name: "Operations", manager: "Lweendo Simainga", members: 224, completionPct: 61, compliancePct: 81, assignedPath: "Digital Operations" },
  { id: "t4", name: "Branch Leadership", manager: "Namakau Lubinda", members: 96, completionPct: 69, compliancePct: 85, assignedPath: "Leadership Pathway" },
  { id: "t5", name: "IT & Digital", manager: "Terence Zimba", members: 87, completionPct: 74, compliancePct: 79, assignedPath: "AI for Professionals" },
];

export interface EmployeeRow {
  id: string;
  name: string;
  team: string;
  coursesDone: number;
  inProgress: string;
  progressPct: number;
  verifiedSkills: number;
}

export const employees: EmployeeRow[] = [
  { id: "e1", name: "Besa Chirwa", team: "Credit & Risk", coursesDone: 6, inProgress: "Financial Literacy for Life", progressPct: 64, verifiedSkills: 2 },
  { id: "e2", name: "Mwila Kapata", team: "Retail Banking", coursesDone: 4, inProgress: "Public Speaking with Presence", progressPct: 38, verifiedSkills: 1 },
  { id: "e3", name: "Sepo Mwanawasa", team: "Operations", coursesDone: 3, inProgress: "Microsoft Excel for Professionals", progressPct: 71, verifiedSkills: 1 },
  { id: "e4", name: "Luyando Hamaundu", team: "IT & Digital", coursesDone: 7, inProgress: "AI for Professionals", progressPct: 89, verifiedSkills: 3 },
  { id: "e5", name: "Chanda Bwembya", team: "Branch Leadership", coursesDone: 5, inProgress: "Corporate Law in Practice", progressPct: 22, verifiedSkills: 0 },
];

/* ── University portal ──────────────────────────────────────────────── */

export const university = {
  name: "University of Zambia",
  short: "UNZA",
  learners: 4280,
  completions: 1930,
  cpdHours: 15640,
  revenueShareZmw: 96400,
};

export interface Faculty {
  id: string;
  name: string;
  dean: string;
  courses: number;
  learners: number;
  kind: string;
}

export const faculties: Faculty[] = [
  { id: "f1", name: "School of Law", dean: "Prof. B. Mwenda", courses: 6, learners: 1480, kind: "Microcredentials · CPD" },
  { id: "f2", name: "School of Business", dean: "Dr. N. Phiri", courses: 8, learners: 1720, kind: "Executive education" },
  { id: "f3", name: "School of Agricultural Sciences", dean: "Prof. C. Lungu", courses: 4, learners: 640, kind: "Short courses" },
  { id: "f4", name: "Institute of Distance Education", dean: "Dr. M. Sichone", courses: 5, learners: 440, kind: "Alumni learning" },
];

export interface CredentialRow {
  id: string;
  serial: string;
  learner: string;
  credential: string;
  faculty: string;
  issued: string;
}

export const issuedCredentials: CredentialRow[] = [
  { id: "cr1", serial: "UNZA-MC-2026-01128", learner: "Taonga Nkhoma", credential: "Microcredential · Commercial Contracts", faculty: "School of Law", issued: "14 Jul 2026" },
  { id: "cr2", serial: "UNZA-CPD-2026-00871", learner: "Bwalya Kasonde", credential: "CPD · Advanced Tax Practice (12 hrs)", faculty: "School of Business", issued: "11 Jul 2026" },
  { id: "cr3", serial: "UNZA-EX-2026-00214", learner: "Mutale Chansa", credential: "Executive Education · Strategic Leadership", faculty: "School of Business", issued: "8 Jul 2026" },
  { id: "cr4", serial: "UNZA-MC-2026-01102", learner: "Kunda Malama", credential: "Microcredential · Agribusiness Finance", faculty: "School of Agricultural Sciences", issued: "2 Jul 2026" },
];
