# Amano — Information Architecture & Route Map

Every route the MVP ships, organised by surface. Mobile-first: authenticated
surfaces use a bottom tab bar (5 tabs) on mobile and a rail sidebar on desktop.
Multi-role users get a role switcher in the account menu; each role has its own
dashboard home.

## 1. Public (Guest)

```
/                      Landing — hero, search, featured instructors & universities,
                       popular paths, testimonials, partners, History & Heritage
                       showcase, mentorship, careers, become-an-instructor, pricing
/explore               Catalogue browser (verticals → filters)
/courses/:slug         Course detail — trailer, curriculum, instructor, reviews,
                       related, enrol CTA (gated actions prompt auth)
/academies/:slug       Academy public page — branding, courses, events, community
/paths/:slug           Learning-path detail with step map
/heritage              History & Heritage hub — the digital museum
/heritage/map          Interactive map (kingdoms, sites, languages)
/heritage/:slug        Exhibit — timeline, narrative, oral histories, curator
/mentors               Mentor directory (public preview)
/jobs                  Job board (public preview)
/marketplace           Digital products (public preview)
/business              Amano for Business marketing page
/universities          University partnerships page
/teach                 Become an instructor page
/pricing               Plans (Free / Pro / Family / Business / Recruiter)
/@:handle              Public professional profile
/verify/:serial        Public certificate / verified-skill checker
```

## 2. Auth & onboarding

```
/auth                  Sign in / sign up (email + Google, Apple, Microsoft)
/auth/forgot           Forgot password        /auth/reset      Reset
/auth/verify           Email/OTP verification
/onboarding            Role intent → interests → goal → path suggestion
```

## 3. Student

Mobile tabs: **Home · Explore · AI · Network · Profile** (contextual: My Learning).

```
/home                  Feed: continue learning, recommendations (incl. AI),
                       streak, goals, upcoming sessions/events
/learning              My courses (in progress / completed / downloads)
/learning/:courseId    Course player shell:
  /learn               Video player + transcript + notes + bookmarks + resources
  /assignments         Assignment briefs & submissions (AI + expert feedback)
  /quiz/:quizId        Quiz runner
  /discussion          Course discussion
  /certificate         Completion + certificate claim
/paths                 My learning paths + progress
/bookmarks             Saved lessons/courses     /history        Watch history
/certificates          Certificate wallet
/skills                My skills → verified-skill assessments (see §10)
/achievements          Badges & streaks          /goals          Goal tracker
/calendar              Sessions, live events, deadlines
/downloads             Offline packs manager
```

## 4. Amano AI (all roles)

Persistent launcher (floating on mobile, ⌘K-adjacent panel on desktop).

```
/ai                    Full-screen assistant. Modes: Tutor (course-aware) ·
                       Study tools (summaries, flashcards, quizzes) · Career
                       (CV review, interview practice, path advice) · Business
                       coach · Mentor matcher
/ai/flashcards         Generated decks        /ai/interview     Mock interview
```

## 5. Network

```
/network               Feed (posts, articles)      /network/post/:id
/network/connections   Connections + requests + suggestions
/communities           My communities / discover   /communities/:slug
/messages              Conversation list           /messages/:id   Thread
/events                Networking & live events calendar
```

## 6. Grow (mentorship & career tools)

```
/mentors               Find mentor (filters: field, price, language, verified)
/mentors/:handle       Mentor profile + availability
/mentorship            My sessions (mentee view) + booking flow + video room
/cv                    CV builder (+ AI review)
/interview-prep        Question banks + AI practice
/careers               Job board — filters incl. "verified skills I hold"
/careers/:jobId        Job detail + apply        /careers/applications
/careers/saved         Saved jobs
```

## 7. Instructor

```
/instructor            Dashboard: revenue, enrolments, watch time, reviews
/instructor/courses    Course manager
/instructor/courses/new + /:id/edit    Course builder:
                       curriculum → video upload → quiz builder → assignments →
                       certificate template → pricing & coupons → publish review
/instructor/academy    Academy settings: branding, community, subscriptions
/instructor/students   Roster + progress + messaging
/instructor/mentorship Mentor settings, availability, session requests
/instructor/live       Schedule/host webinars & live classes
/instructor/products   Marketplace listings
/instructor/consultations  Paid consultation offers & bookings
/instructor/reviews    Ratings & replies
/instructor/earnings   Ledger, payout history, payout method (MoMo/bank)
```

## 8. Mentor (standalone role: subset of instructor surface)

```
/mentor                Dashboard: upcoming sessions, requests, earnings, impact
/mentor/availability   Calendar & rates      /mentor/mentees   Mentee goals & notes
```

## 9. Recruiter

```
/recruiter             Dashboard: active posts, pipeline, talent matches
/recruiter/jobs        Manage posts (+ /new, /:id/pipeline kanban)
/recruiter/talent      Search talent — filter by VERIFIED skills, location, path
/recruiter/billing     Recruiter subscription & job-post credits
```

## 10. Verified Skills (cross-role)

```
/skills/catalog        All verifiable skills by vertical
/skills/:slug          Skill page: what verification proves, sample brief, holders
/skills/:slug/assess   Assessment flow: brief → timed workspace/upload →
                       AI review report → (if AI_THEN_EXPERT) expert queue →
                       badge issuance ceremony
```

## 11. Corporate HR / Manager

```
/business              Org dashboard: seat usage, completion, compliance heatmap
/business/people       Employees & teams (invite, import, deactivate)
/business/paths        Assign learning paths / mandatory compliance training
/business/analytics    Progress reports, exportable
/business/certificates Org-wide credential registry
/business/billing      Seats & invoices
/manager               Manager view: own team only
```

## 12. University

```
/university            Dashboard: learners, completions, revenue share
/university/faculties  Faculties & course mapping
/university/courses    Partner courses (microcredentials, CPD, exec-ed)
/university/credentials Issued certificates & CPD hours registry
/university/analytics  Reach & revenue analytics
```

## 13. Marketplace & Live

```
/marketplace           Browse products (templates, ebooks, contracts, …)
/marketplace/:slug     Product detail + reviews + buy
/library               My purchases & downloads
/live                  Live hub: upcoming webinars/AMAs/conferences + replays
/live/:eventId         Event page → live room / replay
```

## 14. Shared utilities

```
/search                Universal search (courses, people, mentors, universities,
                       companies, products, events, communities, jobs, articles)
                       — also ⌘K command palette on desktop
/notifications         Notification centre (grouped, actionable)
/settings              Account · Privacy · Notifications · Language · Appearance
                       (dark default / light) · Downloads · Billing · Devices ·
                       Security
/checkout/:kind/:id    Unified checkout (MoMo push prompt, Airtel, card)
```

## 15. Administrator

```
/admin                 Ops overview: DAU, revenue, GMV, moderation queue depth
/admin/users           User management + role grants
/admin/verification    Instructor/mentor/org verification queue
/admin/content         Course approval queue (quality bar before publish)
/admin/moderation      Reports (posts, reviews, messages)
/admin/payments        Payments, refunds, payout runs
/admin/orgs            Corporate & university accounts
/admin/ai              AI usage, budgets, prompt/config management
/admin/analytics       Platform analytics
```

## Navigation model

- **Mobile:** bottom tabs per role (Student: Home/Explore/AI/Network/Profile;
  Instructor: Dashboard/Courses/AI/Messages/Earnings; etc.), sheet-based
  sub-navigation, global search from Home header.
- **Desktop:** left rail (icon+label), top bar with universal search (⌘K),
  notifications, role switcher, avatar menu.
- **Guest → auth interception:** any gated action (enrol, follow, book, apply)
  opens the auth sheet with return-to intent preserved.
