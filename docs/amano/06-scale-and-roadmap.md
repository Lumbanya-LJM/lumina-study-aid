# Amano — Build Phases & Path to Scale

## 1. Frontend architecture (how the code is organised)

```
src/
  app/                    Shell: providers, router, role-scoped layouts,
                          bottom tabs / rail, command palette, AI launcher
  design-system/          Tokens (CSS vars), Amano-skinned primitives,
                          signature components (CourseCard, VerifiedSkillBadge,
                          CredentialCard, PathMap, HeritagePanel, …)
  features/
    auth/  onboarding/  landing/  catalog/  course-player/  paths/
    heritage/  ai/  profile/  network/  communities/  messaging/
    mentorship/  goals/  careers/  cv/  verified-skills/
    instructor/  academy/  marketplace/  live/  business/  university/
    recruiter/  admin/  notifications/  settings/  checkout/  search/
      └─ each: routes.tsx · components/ · hooks/ · api.ts (repository)
  data/
    types.ts              Domain types mirroring 02-domain-model.md
    repositories/         Typed read/write functions (interface)
    sample/               Rich Zambian seed data (prototype persistence:
                          in-memory + localStorage so actions stick)
    supabase/             Production implementations (same interfaces)
  lib/                    utils, formatting (ZMW, dates), analytics events
```

Rules: features never import each other's internals — only `design-system`,
`data`, `lib`, and the app shell. All server-ish state via TanStack Query keyed
repositories; client state (player position, AI panel, drafts) via Zustand.
Every route lazy-loads; every module ships skeleton + empty + error states.

## 2. Build phases

| Phase | Deliverable | Definition of done |
|---|---|---|
| **1. Architecture** | This doc set | Founder sign-off on stack + Lumina decision |
| **2. UI system** | Tokens, fonts, motion, signature components, app shell (tabs/rail/⌘K), sample-data layer scaffold | A themed shell navigable on mobile + desktop |
| **3. Authentication** | Auth pages, social buttons, verification, onboarding flow, role model, role switcher | Guest→Student journey with persisted session (mock → Supabase) |
| **4. Landing** | Full marketing page + pricing + teach/business/universities pages | Premium, animated, mobile-first, Lighthouse ≥ 90 |
| **5. Student core** | Home feed, catalogue, course detail, player (video/transcript/notes/quiz), certificates, paths | Enrol → learn → quiz → certificate loop works on sample data |
| 6. Amano AI | Launcher + assistant modes (tutor, flashcards, quiz gen, CV, interview) | Context-aware panel across app (scripted/sample responses in prototype) |
| 7. Verified Skills | Catalog, 3 flagship assessments, AI report UI, badge ceremony, /verify | Full loop demonstrable end-to-end |
| 8. Profile & Network | Profile, connections, feed, communities, messaging | Flywheel visible: cert + badge on profile, recruiter-viewable |
| 9. Instructor & Academy | Dashboard, course builder, academy, earnings | Create-a-course flow produces a playable course |
| 10. Mentorship | Directory, booking, sessions, mentor dashboard | Book → session → review loop |
| 11. Careers & Recruiter | Job board, applications, CV builder, recruiter search | Verified-skill-filtered hiring demo |
| 12. Marketplace & Live | Products, checkout, events hub | MoMo-first checkout flow (simulated) |
| 13. B2B | Corporate HR + manager + university dashboards | Assign-path + compliance heatmap demos |
| 14. Heritage | Museum hub, interactive map, exhibits | The signature-category showpiece |
| 15. Admin & polish | Admin panel, notifications centre, settings, QA pass | Demo-ready MVP |

Each phase ends with: what was built, suggested improvements, approval gate.

## 3. Scaling to millions (production hardening after MVP)

1. **0–50 k users (Zambia launch):** Supabase Pro (Postgres + RLS + Realtime),
   Vercel edge CDN, Postgres FTS search, Mux/CF Stream for video, MoMo + Airtel
   collections via edge-function webhooks, nightly analytics exports. One region.
2. **50 k–500 k:** read replicas + PgBouncer; move search to Typesense; queue
   (pgmq → dedicated) for notifications/payout runs/AI jobs; event pipeline to a
   warehouse; image CDN with device-aware variants; SEO surfaces on Next.js RSC.
3. **500 k–5 M (multi-country):** partition hot tables (events, progress,
   messages) by time/tenant; currency + locale layers activate; per-country
   payment provider matrix behind the `Payment` abstraction; media pre-positioned
   on African POPs (data cost matters more than latency); dedicated AI gateway
   with caching of tutor context; SOC2-track audit logging already in schema.
4. **Organisational:** the feature-module structure maps 1:1 to future team
   ownership (Learn team, Network team, Money team, AI team) and to future
   service extraction if ever needed — the modular monolith is the plan, not an
   accident.

## 4. Risks & mitigations

- **Scope breadth vs. quality bar** → phases are vertical slices, each demo-able;
  premium is enforced at token level so speed doesn't erode the brand.
- **Payment rails variance** → provider-agnostic Payment/Ledger from day one;
  simulated in prototype, sandbox integrations pre-launch.
- **AI cost** → per-user budgets, context caching, small-model routing for
  flashcards/summaries; AI is an edge-function so limits are server-enforced.
- **Trust attacks on Verified Skills** → randomized scenario banks, expert
  audits, public verification, published audit rates (see 05).
- **Offline reality** → PWA + downloadable packs are Phase-2 concerns, not
  afterthoughts; test on mid-range Android over throttled 3G in CI.
