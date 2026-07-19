# Amano — Architecture Overview

> **Amano** (noun · Bemba): *intelligence; wisdom.*
> Africa's Professional Growth Platform — where Africa learns, shares, and grows.

This document set is Phase 1 of the Amano MVP: the architecture. It translates the
Amano Business Profile (the product source of truth) into a concrete technical design
that a founding engineering team can build against, and that can scale from a Zambian
launch to a continental platform serving millions.

## Documents in this set

| Doc | Contents |
|---|---|
| `00-architecture-overview.md` | Vision → system mapping, principles, module map |
| `01-tech-stack-decision.md` | Stack choices, and the decision about this repository |
| `02-domain-model.md` | The complete data model (Prisma-style schema, ~40 entities) |
| `03-information-architecture.md` | Route map and navigation for all 8 user types |
| `04-design-system.md` | The Amano design language: tokens, type, motion, components |
| `05-verified-skills.md` | Spec for the Verified Skills engine (the killer feature) |
| `06-scale-and-roadmap.md` | Build phases, and the path from prototype to millions of users |

---

## 1. From vision to system

The Business Profile defines four pillars. Each pillar maps to a bounded set of
modules; the modules share one identity graph and one design system, which is what
makes Amano an **ecosystem** rather than a bundle of apps.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AMANO PLATFORM                                │
│                                                                     │
│  LEARN            NETWORK          GROW             EARN            │
│  ─────            ───────          ────             ────            │
│  Courses          Profiles         Mentorship       Instructor      │
│  Academies        Feed & Posts     AI Career        Academies       │
│  Learning Paths   Connections      Coaching         Marketplace     │
│  Quizzes/Certs    Communities      Goals            Consultations   │
│  Heritage         Jobs Board       CV Builder       Live Events     │
│  Live Learning    Recruiters       Interview Prep   Payouts         │
│  Offline/PWA      Messaging                         Subscriptions   │
│                                                                     │
│  ═══════════════ CROSS-CUTTING PLATFORM SERVICES ═══════════════    │
│  Identity & Roles · Amano AI · Verified Skills · Search ·           │
│  Notifications · Payments (MoMo/Cards) · Media · Analytics · Admin  │
└─────────────────────────────────────────────────────────────────────┘
```

**The flywheel is a data-model property, not a marketing slide.** Learn → certificate
→ profile → network → mentorship → job/income → return as instructor/mentor. Every
arrow in that loop is a foreign key in the domain model (`02-domain-model.md`): a
`Certificate` belongs to a `Profile`; a `Profile` is what a `Recruiter` searches; a
`MentorshipSession` produces `Reviews` that feed the same `Profile`; an `Instructor`
is just a `User` whose role set grew. One identity, compounding value.

## 2. Architecture principles

1. **One identity, many hats.** A user is a single account with a role *set*
   (student + mentor + instructor + …), never separate accounts. Dashboards are
   role-scoped views over the same graph. This is what lets a mentee become a mentor
   without friction — the flywheel's closing move.
2. **Mobile-first, offline-tolerant.** Zambia launches on phones with patchy data.
   Every screen is designed at 390 px first; the app ships as a PWA with cached
   shell, downloadable lessons, and optimistic UI. Desktop is a progressive
   enhancement, not the baseline.
3. **Feature modules, not page soup.** Code is organised by domain
   (`features/courses`, `features/mentorship`, …), each exposing routes, components,
   hooks, and a typed data layer. Modules may depend on platform services, never on
   each other's internals.
4. **The data layer is swappable.** All reads/writes go through typed repository
   functions behind TanStack Query. In the prototype these serve rich seeded sample
   data; in production the same signatures serve Supabase/Postgres. UI never knows
   the difference.
5. **Credibility is earned, then rendered.** Certificates, verified skills, and
   mentor verification are first-class entities with issuance records — never
   booleans on a profile. Trust is the product; forging it must be structurally hard.
6. **Premium by default.** The design system (`04-design-system.md`) makes the
   obsidian-and-gold identity the path of least resistance: components are branded at
   the token level, so a rushed feature still looks like Amano.
7. **African rails first.** MTN MoMo and Airtel Money are primary payment methods,
   modelled from day one; cards, Stripe and PayPal are additional providers behind
   the same `Payment` abstraction.

## 3. System topology (production target)

```
 Mobile / Desktop PWA (React)
        │
        ▼
 Edge (Vercel/CDN) ── static shell, media CDN, image optimisation
        │
        ▼
 API layer ──────────── Supabase (Postgres + RLS, Auth, Realtime, Storage)
        │                    │
        ├── Edge Functions:  payments webhooks (MTN MoMo, Airtel, card PSP),
        │                    AI orchestration (Amano AI → Claude API),
        │                    certificate issuance, notifications fan-out
        │
        ├── Search: Postgres FTS → (scale) Typesense/Meilisearch
        ├── Video:  HLS via Mux/Cloudflare Stream; signed URLs; offline packs
        └── Analytics: event stream → warehouse (later)
```

The prototype (Phases 2–5+) runs the identical frontend against the in-memory
sample-data layer, so the product can be felt end-to-end before a backend exists.

## 4. User types and dashboards

Eight personas, one account system. Roles are additive; the app shell renders the
active role's navigation and a role switcher for multi-role users.

| Role | Dashboard core | Key modules |
|---|---|---|
| Guest | Landing, browse, search | Marketing, catalogue previews |
| Student | Home feed, continue learning | Courses, paths, AI, certificates, goals |
| Instructor | Revenue, students, course builder | Academy, courses, live, payouts |
| Mentor | Sessions, mentees, earnings | Booking, calendar, goals, reviews |
| Recruiter | Talent search, job posts | Jobs, applications, verified-skill filters |
| University | Faculties, microcredentials, revenue | Partner courses, CPD, analytics |
| Corporate HR | Seats, teams, learning paths | Amano for Business, compliance, reports |
| Administrator | Moderation, verification, platform ops | Users, content approval, payments, AI |

## 5. What Phase 1 explicitly decides

- The stack and the fate of this repository → `01-tech-stack-decision.md`
- The full entity graph, including Verified Skills → `02-domain-model.md`
- Every route the MVP will ship → `03-information-architecture.md`
- The design tokens the brand lives in → `04-design-system.md`
- The build order for Phases 2 → MVP → `06-scale-and-roadmap.md`
