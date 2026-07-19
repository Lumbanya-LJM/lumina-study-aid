# Amano — Domain Model

The complete entity graph for the MVP, expressed as a Prisma-style schema. In
production this lands as Supabase Postgres migrations (with RLS policies per the
role model); in the prototype it is the shape of the TypeScript types and sample
data. Enums are abbreviated where obvious.

## Reading guide

- **Identity & roles** — one user, many hats (§1)
- **Learn** — academies, courses, lessons, enrolment, quizzes, certificates,
  learning paths, heritage (§2)
- **Verified Skills** — the credibility engine (§3, full spec in `05-verified-skills.md`)
- **Network** — profiles, connections, feed, communities, messaging (§4)
- **Grow** — mentorship, goals, career tools (§5)
- **Earn & commerce** — marketplace, payments, subscriptions, payouts (§6)
- **Careers** — jobs, applications, recruiters (§7)
- **B2B** — corporate + university tenancy (§8)
- **Platform** — notifications, search, moderation, admin (§9)

```prisma
// ─────────────────────────────────────────────────────────────
// §1 IDENTITY & ROLES — one account, additive roles
// ─────────────────────────────────────────────────────────────

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  phone         String?  @unique          // MoMo-linked; E.164
  authProvider  AuthProvider              // EMAIL | GOOGLE | APPLE | MICROSOFT
  status        UserStatus @default(ACTIVE) // ACTIVE | SUSPENDED | DELETED
  createdAt     DateTime @default(now())

  profile       Profile?
  roles         UserRole[]
  memberships   OrgMember[]              // corporate / university seats
}

model UserRole {
  userId   String
  role     Role      // STUDENT | INSTRUCTOR | MENTOR | RECRUITER |
                     // UNIVERSITY_ADMIN | CORPORATE_HR | ADMIN
  grantedAt DateTime @default(now())
  @@id([userId, role])
}

// The public professional identity — the LinkedIn-grade surface.
model Profile {
  id            String  @id            // = User.id
  handle        String  @unique        // amano.africa/@handle
  displayName   String
  headline      String?                // "Corporate Lawyer · Lusaka"
  bio           String?
  avatarUrl     String?
  coverUrl      String?
  location      String?                // "Lusaka, Zambia"
  languages     String[]               // ["English","Bemba","Nyanja"]
  openTo        OpenTo[]               // MENTORING | WORK | FREELANCE | SPEAKING
  experience    Experience[]
  education     Education[]
  skills        ProfileSkill[]         // claimed skills; may link to VerifiedSkill
  portfolio     PortfolioItem[]
  followers     Follow[] @relation("followee")
  following     Follow[] @relation("follower")
  recommendations Recommendation[]     // written by other users
}

model Experience { id String @id; profileId String; title String; org String;
  startDate DateTime; endDate DateTime?; description String? }
model Education  { id String @id; profileId String; institution String;
  qualification String; field String?; startYear Int; endYear Int? }
model PortfolioItem { id String @id; profileId String; title String;
  mediaUrl String?; linkUrl String?; description String? }
model Recommendation { id String @id; profileId String; authorId String;
  body String; relationship String; createdAt DateTime }
model Follow { followerId String; followeeId String; createdAt DateTime
  @@id([followerId, followeeId]) }

// ─────────────────────────────────────────────────────────────
// §2 LEARN — academies, courses, paths, certificates
// ─────────────────────────────────────────────────────────────

// Top-level brand areas: "Amano Law", "Amano Business", "Amano Health & Fitness",
// "Amano History & Heritage", … Curated by the platform.
model Vertical {
  id     String @id
  name   String        // "Amano Law"
  slug   String @unique
  tagline String?
  academies Academy[]
  courses   Course[]
}

// Every instructor (or partner org) owns an academy — their branded school.
model Academy {
  id          String @id
  verticalId  String
  ownerId     String            // instructor User OR org (see orgId)
  orgId       String?           // set when university/corporate-sponsored
  name        String            // "Mulenga School of Corporate Law"
  slug        String @unique
  brandColor  String?
  logoUrl     String?
  about       String?
  courses     Course[]
  events      LiveEvent[]
  products    Product[]
  community   Community?
  subscriptionPlanId String?    // academy-level membership (Earn pillar)
}

model Course {
  id          String @id
  academyId   String
  verticalId  String
  title       String            // "Tax in Zambia: A Practical Guide"
  slug        String @unique
  subtitle    String?
  description String
  level       Level             // BEGINNER | INTERMEDIATE | ADVANCED
  language    String @default("en")
  priceKind   PriceKind         // FREE | ONE_OFF | SUBSCRIPTION_ONLY
  priceZmw    Decimal?
  thumbnailUrl String?
  trailerUrl   String?
  status      CourseStatus      // DRAFT | IN_REVIEW | PUBLISHED | ARCHIVED
  downloadable Boolean @default(true)   // offline packs
  sections    CourseSection[]
  reviews     CourseReview[]
  skills      CourseSkill[]     // skills this course teaches → Verified Skills
  publishedAt DateTime?
}

model CourseSection { id String @id; courseId String; title String; order Int;
  lessons Lesson[] }

model Lesson {
  id         String @id
  sectionId  String
  title      String
  order      Int
  kind       LessonKind        // VIDEO | ARTICLE | QUIZ | ASSIGNMENT | LIVE_REPLAY
  durationS  Int?
  videoUrl   String?           // HLS master; signed
  transcript String?           // feeds AI tutor + search
  resources  Resource[]        // PDFs, templates, datasets
}

model Resource { id String @id; lessonId String; title String; fileUrl String;
  sizeBytes Int }

model Enrollment {
  id        String @id
  userId    String
  courseId  String
  source    EnrollSource      // PURCHASE | SUBSCRIPTION | CORPORATE | UNIVERSITY | FREE
  progress  LessonProgress[]
  startedAt DateTime
  completedAt DateTime?
  @@unique([userId, courseId])
}

model LessonProgress { enrollmentId String; lessonId String;
  secondsWatched Int; completed Boolean; notes Note[]; bookmarked Boolean
  @@id([enrollmentId, lessonId]) }

model Note { id String @id; enrollmentId String; lessonId String;
  atSecond Int?; body String; createdAt DateTime }

model Quiz {
  id        String @id
  lessonId  String? @unique    // in-course quiz…
  skillId   String?            // …or a Verified Skills assessment component
  title     String
  passMark  Int                // percent
  questions QuizQuestion[]
  attempts  QuizAttempt[]
}
model QuizQuestion { id String @id; quizId String; order Int; kind QKind;
  prompt String; options Json?; answerKey Json; explanation String? }
model QuizAttempt { id String @id; quizId String; userId String;
  score Int; passed Boolean; answers Json; submittedAt DateTime }

model Assignment { id String @id; lessonId String @unique; brief String;
  rubric Json; submissions AssignmentSubmission[] }
model AssignmentSubmission { id String @id; assignmentId String; userId String;
  fileUrl String?; body String?; aiFeedback Json?; reviewerId String?;
  grade String?; status SubmissionStatus }  // SUBMITTED|AI_REVIEWED|EXPERT_REVIEWED|PASSED|REVISE

model Certificate {
  id         String @id
  userId     String
  courseId   String?
  pathId     String?
  serial     String @unique    // AMN-2026-000123 — publicly verifiable
  issuedAt   DateTime
  pdfUrl     String
  @@index([userId])
}

// Curated journeys: "Corporate Lawyer Path", "Small Business Owner Path", …
model LearningPath {
  id       String @id
  title    String
  slug     String @unique
  outcome  String              // "Job-ready corporate legal associate"
  steps    PathStep[]          // ordered courses / skills / milestones
  enrollments PathEnrollment[]
}
model PathStep { id String @id; pathId String; order Int; courseId String?;
  skillId String?; title String }
model PathEnrollment { userId String; pathId String; currentStep Int;
  startedAt DateTime @@id([userId, pathId]) }

// History & Heritage — signature category extras (the "digital museum")
model HeritageExhibit {
  id       String @id
  kind     ExhibitKind          // KINGDOM | TIMELINE | LANGUAGE | CULTURE |
                                // MUSEUM | ORAL_HISTORY
  title    String               // "The Bemba Kingdom"
  era      String?              // "c. 1650 – present"
  regionGeo Json?               // map coordinates / bounds for interactive map
  body     String               // rich narrative
  media    Json                 // images, audio (oral histories), video refs
  curatorId String?             // featured historian (Profile)
  relatedCourseIds String[]
}

// ─────────────────────────────────────────────────────────────
// §3 VERIFIED SKILLS — proof over paper (full spec: 05-verified-skills.md)
// ─────────────────────────────────────────────────────────────

model Skill {                    // canonical taxonomy: "Contract Drafting"
  id String @id; name String @unique; verticalId String; description String
}
model CourseSkill { courseId String; skillId String @@id([courseId, skillId]) }
model ProfileSkill { profileId String; skillId String;
  verifiedSkillId String?       // null = merely claimed
  @@id([profileId, skillId]) }

model SkillAssessment {          // the practical exam for a skill
  id        String @id
  skillId   String
  version   Int
  brief     String              // "Draft a service agreement for the scenario…"
  rubric    Json                // criteria + weights, drives AI review
  reviewMode ReviewMode         // AI_ONLY | AI_THEN_EXPERT
  timeboxMin Int?
}

model VerifiedSkill {           // the badge — an issued credential
  id           String @id
  userId       String
  skillId      String
  assessmentId String
  level        BadgeLevel       // VERIFIED | VERIFIED_DISTINCTION
  evidence     Json             // submission refs, scores, reviewer chain
  aiScore      Int
  expertReviewerId String?      // verified expert who countersigned
  serial       String @unique   // publicly checkable
  issuedAt     DateTime
  expiresAt    DateTime?        // some skills re-verify (e.g. tax law changes)
  @@unique([userId, skillId, assessmentId])
}

// ─────────────────────────────────────────────────────────────
// §4 NETWORK — feed, communities, messaging
// ─────────────────────────────────────────────────────────────

model Post { id String @id; authorId String; kind PostKind; // POST | ARTICLE
  body String; mediaUrls String[]; communityId String?;
  reactions Reaction[]; comments Comment[]; createdAt DateTime }
model Comment { id String @id; postId String; authorId String; body String;
  parentId String?; createdAt DateTime }
model Reaction { postId String; userId String; kind ReactKind
  @@id([postId, userId]) }

model Community { id String @id; name String; slug String @unique;
  academyId String?; about String?; visibility Visibility;
  members CommunityMember[] }
model CommunityMember { communityId String; userId String; role MemberRole
  @@id([communityId, userId]) }

model Conversation { id String @id; kind ConvKind; // DM | GROUP
  participants ConvParticipant[]; messages Message[] }
model ConvParticipant { conversationId String; userId String; lastReadAt DateTime?
  @@id([conversationId, userId]) }
model Message { id String @id; conversationId String; senderId String;
  body String; attachments Json?; sentAt DateTime }

model Connection { requesterId String; addresseeId String;
  status ConnStatus; // PENDING | ACCEPTED | DECLINED
  createdAt DateTime @@id([requesterId, addresseeId]) }

// ─────────────────────────────────────────────────────────────
// §5 GROW — mentorship, goals, career tools
// ─────────────────────────────────────────────────────────────

model MentorProfile {
  userId       String @id
  fields       String[]          // ["Corporate Law","Entrepreneurship"]
  about        String
  ratePerHourZmw Decimal?        // null = pro bono
  verified     Boolean           // admin-verified credentials + track record
  availability Json              // weekly slots
  sessions     MentorshipSession[]
}
model MentorshipSession {
  id        String @id
  mentorId  String
  menteeId  String
  kind      SessionKind          // ONE_OFF | PROGRAMME | ADVISORY
  scheduledAt DateTime
  durationMin Int
  meetingUrl String?             // video room
  status    SessionStatus        // REQUESTED|CONFIRMED|COMPLETED|CANCELLED
  paymentId String?
  goalId    String?
  review    SessionReview?
}
model SessionReview { sessionId String @id; rating Int; body String? }

model Goal { id String @id; userId String; title String;   // "Pass ZICA Level 2"
  targetDate DateTime?; milestones Json; progressPct Int;
  mentorSessionIds String[] }

model CvDocument { id String @id; userId String; title String;
  content Json;                   // structured CV → rendered/exported
  aiReviews Json[] }              // Amano AI CV review history

// ─────────────────────────────────────────────────────────────
// §6 EARN & COMMERCE — marketplace, payments, subscriptions
// ─────────────────────────────────────────────────────────────

model Product {                   // digital marketplace item
  id        String @id
  sellerId  String
  academyId String?
  kind      ProductKind          // TEMPLATE | EBOOK | CONTRACT | SPREADSHEET |
                                 // DESIGN_ASSET | BUSINESS_PLAN | AI_PROMPTS
  title     String               // "PACRA Business Registration Pack"
  priceZmw  Decimal
  fileUrl   String
  previewUrl String?
  reviews   ProductReview[]
  downloads ProductDownload[]
}

model LiveEvent { id String @id; hostId String; academyId String?;
  kind EventKind;                // WEBINAR | LIVESTREAM | AMA | CONFERENCE
  title String; startsAt DateTime; durationMin Int; priceZmw Decimal?;
  streamUrl String?; replayLessonId String?; registrations EventReg[] }
model EventReg { eventId String; userId String; paymentId String?
  @@id([eventId, userId]) }

model SubscriptionPlan { id String @id; scope PlanScope; // PLATFORM | ACADEMY | RECRUITER | BUSINESS_SEAT
  name String; priceZmwMonthly Decimal; features Json }
model Subscription { id String @id; userId String?; orgId String?;
  planId String; status SubStatus; currentPeriodEnd DateTime;
  paymentMethodId String }

// Provider-agnostic money movement. Providers: MTN_MOMO | AIRTEL_MONEY |
// CARD (Visa/Mastercard via PSP) | STRIPE | PAYPAL
model PaymentMethod { id String @id; userId String; provider PayProvider;
  label String;                  // "MTN MoMo ···789"
  token String }                 // provider token — never raw credentials
model Payment {
  id         String @id
  payerId    String
  amountZmw  Decimal
  provider   PayProvider
  purpose    PayPurpose          // COURSE | SUBSCRIPTION | MENTORSHIP | PRODUCT |
                                 // EVENT | JOB_POST
  targetId   String              // id of the purchased thing
  status     PayStatus           // PENDING | SUCCEEDED | FAILED | REFUNDED
  providerRef String?
  createdAt  DateTime
}
model LedgerEntry {              // append-only double-entry rows
  id String @id; paymentId String?; account String;   // "platform_fees", "creator:{id}"
  debitZmw Decimal?; creditZmw Decimal?; memo String; createdAt DateTime
}
model Payout { id String @id; creatorId String; amountZmw Decimal;
  provider PayProvider; status PayStatus; periodStart DateTime;
  periodEnd DateTime; lines Json }   // revenue-share breakdown

model Coupon { id String @id; ownerId String; code String @unique;
  pctOff Int; scope Json; maxUses Int?; expiresAt DateTime? }

// ─────────────────────────────────────────────────────────────
// §7 CAREERS — jobs, applications, recruiters
// ─────────────────────────────────────────────────────────────

model JobPost {
  id        String @id
  orgId     String?              // company; or recruiterId for agency posts
  recruiterId String
  title     String               // "Procurement Officer — Mining"
  kind      JobKind              // FULL_TIME | INTERNSHIP | FREELANCE | CONTRACT
  location  String
  remote    Boolean
  salaryRange String?
  description String
  requiredSkillIds String[]      // matched against VerifiedSkill — the moat
  status    JobStatus            // OPEN | CLOSED | FILLED
  applications JobApplication[]
}
model JobApplication { id String @id; jobId String; applicantId String;
  cvDocumentId String?; coverNote String?;
  status AppStatus;              // APPLIED|SHORTLISTED|INTERVIEW|OFFER|REJECTED
  createdAt DateTime }
model SavedJob { userId String; jobId String @@id([userId, jobId]) }

// ─────────────────────────────────────────────────────────────
// §8 B2B TENANCY — corporates & universities
// ─────────────────────────────────────────────────────────────

model Org {
  id       String @id
  kind     OrgKind               // CORPORATE | UNIVERSITY | RECRUITMENT_AGENCY
  name     String                // "Zanaco" / "University of Zambia"
  slug     String @unique
  logoUrl  String?
  verified Boolean
  members  OrgMember[]
  teams    Team[]
  seats    Int?                  // licensed seat count (corporate)
  faculties Faculty[]            // university only
}
model OrgMember { orgId String; userId String; role OrgRole; // OWNER|HR|MANAGER|MEMBER
  teamId String? @@id([orgId, userId]) }
model Team { id String @id; orgId String; name String; managerId String }

model AssignedPath {             // HR/manager assigns learning
  id String @id; orgId String; pathId String?; courseId String?;
  assigneeUserIds String[]; teamId String?; dueAt DateTime?;
  mandatory Boolean }            // compliance training

model Faculty { id String @id; orgId String; name String;  // "School of Law"
  courseIds String[] }
// University offerings (microcredential, CPD, exec-ed) are Courses with
// orgId set on their Academy and credentialKind on the Certificate.

// ─────────────────────────────────────────────────────────────
// §9 PLATFORM — notifications, AI, moderation, admin
// ─────────────────────────────────────────────────────────────

model Notification { id String @id; userId String; kind NotifKind;
  // LEARNING_REMINDER | MENTORSHIP | CERTIFICATE | MESSAGE | JOB |
  // COURSE_RELEASE | PAYMENT | ACHIEVEMENT
  title String; body String; linkUrl String?; readAt DateTime?;
  createdAt DateTime }

model Achievement { id String @id; userId String; kind AchKind;
  // STREAK_7 | FIRST_CERT | FIRST_VERIFIED_SKILL | MENTOR_10_SESSIONS | …
  earnedAt DateTime }

model AiConversation { id String @id; userId String; context Json;
  // {courseId?, lessonId?, mode: TUTOR|CAREER|CV|INTERVIEW|BUSINESS}
  messages Json[]; createdAt DateTime }

model ModerationCase { id String @id; targetKind String; targetId String;
  reporterId String?; reason String; status ModStatus;
  resolverId String?; resolvedAt DateTime? }

model VerificationRequest {      // instructor / mentor / org verification
  id String @id; subjectKind String; subjectId String;
  evidence Json; status VerifStatus; reviewerId String?; decidedAt DateTime? }

model AuditLog { id String @id; actorId String; action String;
  targetKind String; targetId String; meta Json; at DateTime }
```

## Notes on the model

- **The flywheel in keys.** `Enrollment → Certificate → Profile → VerifiedSkill →
  JobPost.requiredSkillIds → JobApplication` and `MentorshipSession.menteeId` today
  → `MentorProfile.userId` tomorrow. No table is an island.
- **Money is a ledger.** `Payment` records intent/outcome; `LedgerEntry` is the
  append-only truth that revenue-share (`Payout`) is computed from. Refunds are new
  entries, never mutations — auditable from day one, MoMo reconciliation-friendly.
- **RLS strategy (production).** Row-level security keyed on `auth.uid()` +
  `UserRole` / `OrgMember`: students see own enrolments; instructors see their
  academy's data; HR sees only their org's members' progress (privacy boundary);
  admins via a service role. Public read for published catalogue + profiles.
- **Currency.** Amounts stored as `Decimal` ZMW; a `currency` column is added the
  moment a second market opens (schema change is additive).
- **Search.** `Course`, `Profile`, `Product`, `JobPost`, `Post`, `HeritageExhibit`,
  `Community`, `LiveEvent`, `Org` all carry text columns feeding one universal
  search index — matching the brief's universal search requirement.
