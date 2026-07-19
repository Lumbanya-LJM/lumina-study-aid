import type {
  Course,
  Enrollment,
  LearningPath,
  Person,
  Skill,
  Vertical,
  VerifiedSkillBadgeData,
} from "../types";

export const verticals: Vertical[] = [
  { id: "law", name: "Amano Law", slug: "law", tagline: "Practice-ready legal skill" },
  { id: "business", name: "Amano Business", slug: "business", tagline: "Build and run what lasts" },
  { id: "corporate", name: "Amano Corporate", slug: "corporate", tagline: "Lead, speak, deliver" },
  { id: "tech", name: "Amano Tech & Digital", slug: "tech", tagline: "Modern tools, modern work" },
  { id: "agri", name: "Amano Agriculture", slug: "agri", tagline: "Grow more with less" },
  { id: "heritage", name: "Amano History & Heritage", slug: "heritage", tagline: "The continent's story, told by its own" },
  { id: "lifestyle", name: "Amano Lifestyle", slug: "lifestyle", tagline: "Skills for a fuller life" },
];

export const people: Person[] = [
  { id: "p1", handle: "chanda-mulenga", displayName: "Chanda Mulenga", headline: "Corporate Lawyer · Lusaka", location: "Lusaka, Zambia", verified: true, roles: ["instructor", "mentor"] },
  { id: "p2", handle: "bwalya-kasonde", displayName: "Bwalya Kasonde", headline: "Chartered Accountant, ZICA · Tax specialist", location: "Ndola, Zambia", verified: true, roles: ["instructor"] },
  { id: "p3", handle: "natasha-zulu", displayName: "Natasha Zulu", headline: "Digital Marketing Lead · ex-MTN", location: "Lusaka, Zambia", verified: true, roles: ["instructor", "mentor"] },
  { id: "p4", handle: "mwamba-chileshe", displayName: "Dr. Mwamba Chileshe", headline: "Historian · Bemba Kingdom scholar, UNZA", location: "Lusaka, Zambia", verified: true, roles: ["instructor"] },
  { id: "p5", handle: "kondwani-banda", displayName: "Kondwani Banda", headline: "Agribusiness consultant · Poultry systems", location: "Chipata, Zambia", verified: true, roles: ["instructor", "mentor"] },
  { id: "p6", handle: "thandiwe-phiri", displayName: "Thandiwe Phiri", headline: "Public speaking coach · Toastmasters champion", location: "Kitwe, Zambia", verified: true, roles: ["instructor", "mentor"] },
  { id: "p7", handle: "misozi-tembo", displayName: "Misozi Tembo", headline: "Law student · UNZA — aspiring corporate lawyer", location: "Lusaka, Zambia", roles: ["student"] },
  { id: "p8", handle: "joseph-sakala", displayName: "Joseph Sakala", headline: "Procurement Officer · Mining sector", location: "Solwezi, Zambia", roles: ["student"] },
];

export const skills: Skill[] = [
  { id: "sk-contract-drafting", name: "Contract Drafting", verticalId: "law", reviewMode: "AI_THEN_EXPERT" },
  { id: "sk-excel", name: "Microsoft Excel", verticalId: "business", reviewMode: "AI_ONLY" },
  { id: "sk-public-speaking", name: "Public Speaking", verticalId: "corporate", reviewMode: "AI_THEN_EXPERT" },
  { id: "sk-bookkeeping", name: "Bookkeeping", verticalId: "business", reviewMode: "AI_ONLY" },
  { id: "sk-tax-filing", name: "Zambian Tax Filing", verticalId: "law", reviewMode: "AI_THEN_EXPERT" },
];

export const courses: Course[] = [
  { id: "c1", verticalId: "law", title: "Corporate Law in Practice", slug: "corporate-law-in-practice", subtitle: "Company formation to board governance, the Zambian way", instructorId: "p1", level: "Intermediate", priceZmw: 450, rating: 4.8, ratingCount: 312, learners: 2140, durationHours: 12, lessons: 48, thumbnailTone: "from-amber-900/60 to-stone-900", skills: ["sk-contract-drafting"] },
  { id: "c2", verticalId: "law", title: "Tax in Zambia: A Practical Guide", slug: "tax-in-zambia", subtitle: "PAYE, VAT, turnover tax and ZRA filings without fear", instructorId: "p2", level: "Beginner", priceZmw: 350, rating: 4.9, ratingCount: 528, learners: 4830, durationHours: 9, lessons: 36, thumbnailTone: "from-emerald-900/60 to-stone-900", skills: ["sk-tax-filing"] },
  { id: "c3", verticalId: "business", title: "Microsoft Excel for Professionals", slug: "excel-for-professionals", subtitle: "From first formula to financial models", instructorId: "p2", level: "Beginner", priceZmw: null, rating: 4.7, ratingCount: 1044, learners: 11200, durationHours: 14, lessons: 62, thumbnailTone: "from-green-900/60 to-stone-900", skills: ["sk-excel"] },
  { id: "c4", verticalId: "corporate", title: "Public Speaking with Presence", slug: "public-speaking-with-presence", subtitle: "Command any room, from boardroom to conference stage", instructorId: "p6", level: "Beginner", priceZmw: 300, rating: 4.9, ratingCount: 402, learners: 3390, durationHours: 6, lessons: 24, thumbnailTone: "from-rose-900/50 to-stone-900", skills: ["sk-public-speaking"] },
  { id: "c5", verticalId: "tech", title: "AI for Professionals", slug: "ai-for-professionals", subtitle: "Put modern AI to work in any Zambian office", instructorId: "p3", level: "Intermediate", priceZmw: null, rating: 4.8, ratingCount: 267, learners: 1980, durationHours: 8, lessons: 30, thumbnailTone: "from-indigo-900/60 to-stone-900", skills: [] },
  { id: "c6", verticalId: "tech", title: "Digital Marketing that Sells", slug: "digital-marketing-that-sells", subtitle: "Reach customers on the platforms they already use", instructorId: "p3", level: "Beginner", priceZmw: 380, rating: 4.6, ratingCount: 356, learners: 2760, durationHours: 10, lessons: 41, thumbnailTone: "from-fuchsia-900/50 to-stone-900", skills: [] },
  { id: "c7", verticalId: "agri", title: "Poultry Farming as a Business", slug: "poultry-farming-as-a-business", subtitle: "Broilers, layers, and the numbers that keep you profitable", instructorId: "p5", level: "Beginner", priceZmw: 280, rating: 4.8, ratingCount: 611, learners: 5470, durationHours: 11, lessons: 44, thumbnailTone: "from-orange-900/60 to-stone-900", skills: ["sk-bookkeeping"] },
  { id: "c8", verticalId: "heritage", title: "History of the Bemba Kingdom", slug: "history-of-the-bemba-kingdom", subtitle: "The Chitimukulu, the crocodile clan, and a living kingdom", instructorId: "p4", level: "Beginner", priceZmw: null, rating: 5.0, ratingCount: 489, learners: 6120, durationHours: 7, lessons: 28, thumbnailTone: "from-yellow-900/60 to-stone-900", skills: [] },
  { id: "c9", verticalId: "business", title: "Business Registration & PACRA", slug: "business-registration-pacra", subtitle: "Register, formalise, and protect your business step by step", instructorId: "p1", level: "Beginner", priceZmw: 250, rating: 4.7, ratingCount: 298, learners: 3540, durationHours: 4, lessons: 18, thumbnailTone: "from-cyan-900/50 to-stone-900", skills: [] },
  { id: "c10", verticalId: "business", title: "Financial Literacy for Life", slug: "financial-literacy-for-life", subtitle: "Budgets, savings groups, mobile money, and building wealth", instructorId: "p2", level: "Beginner", priceZmw: null, rating: 4.8, ratingCount: 733, learners: 8910, durationHours: 5, lessons: 22, thumbnailTone: "from-teal-900/60 to-stone-900", skills: ["sk-bookkeeping"] },
];

export const myEnrollments: Enrollment[] = [
  { courseId: "c1", progressPct: 62, lastLesson: "Shareholder agreements: the clauses that bite" },
  { courseId: "c3", progressPct: 34, lastLesson: "VLOOKUP and when to prefer INDEX-MATCH" },
  { courseId: "c8", progressPct: 88, lastLesson: "The kingdom under colonial rule" },
];

export const myBadges: VerifiedSkillBadgeData[] = [
  { skillId: "sk-excel", holderId: "p7", level: "Verified", serial: "AMN-VS-2026-004821", issuedAt: "2026-05-14" },
];

export const paths: LearningPath[] = [
  { id: "path-corporate-lawyer", title: "Corporate Lawyer Path", slug: "corporate-lawyer", outcome: "Job-ready corporate legal associate", courseIds: ["c1", "c2", "c9", "c4"] },
  { id: "path-small-business", title: "Small Business Owner Path", slug: "small-business-owner", outcome: "A registered, profitable, growing business", courseIds: ["c9", "c10", "c3", "c6"] },
  { id: "path-history", title: "African History Path", slug: "african-history", outcome: "Deep fluency in Zambia's story", courseIds: ["c8"] },
];

/* Lookup helpers used across the app */
export const courseById = (id: string) => courses.find((c) => c.id === id);
export const personById = (id: string) => people.find((p) => p.id === id);
export const skillById = (id: string) => skills.find((s) => s.id === id);
export const verticalById = (id: string) => verticals.find((v) => v.id === id);
