# Amano — Tech Stack Decision

## The situation this repo is in

This repository (`lumina-study-aid`) is not empty. It contains **Lumina**, a working
Lovable-generated legal study aid: Vite 7 + React 19 + TypeScript + Tailwind +
shadcn/ui + React Router + TanStack Query + Zustand + Supabase (auth, migrations,
edge functions) + a PWA plugin, with ~40 pages already built.

The Amano brief asks for Next.js + Prisma + Clerk + UploadThing. That is an
excellent *production* stack — but blindly scaffolding a second app inside (or over)
this repo would be the wrong first move. This document makes the call.

## Recommendation (what Phase 2 should do)

**Build the Amano MVP prototype on this repo's existing foundation — Vite + React 19
+ TypeScript + Tailwind + shadcn/ui + React Router + TanStack Query + Zustand —
rebranded and restructured as Amano, with the domain layer kept framework-agnostic
so the shell can be lifted into Next.js before public launch.**

### Why

1. **Speed to a *fully functioning* prototype.** The brief's #1 demand is "not mock
   screens — a real, navigable product." This repo already carries the entire
   component infrastructure (35+ shadcn components, forms, charts, toasts, PWA
   setup). Rebuilding that in a fresh Next.js scaffold burns weeks reproducing
   what's already here.
2. **The prototype's needs are client-side.** SSR/SEO — Next.js's real advantages —
   matter when marketing pages must rank on Google. A prototype demonstrating flows
   to founders, investors, and pilot users doesn't need them. A Vite SPA + PWA is
   *better* for the mobile-first, offline-tolerant demo experience.
3. **Supabase is already wired.** The brief itself lists Supabase; this repo has
   live config, migrations, and edge functions. Clerk would be a second auth system
   fighting the first. Supabase Auth does email + Google/Apple/Microsoft OAuth,
   which covers the brief's auth requirements.
4. **Migration is cheap if we discipline the code.** Feature modules that export
   route components, hooks, and repositories port to Next.js App Router almost
   mechanically — the expensive parts (domain model, design system, components,
   sample data) carry over unchanged.

### What we adopt from the brief's list, and when

| Brief item | Decision |
|---|---|
| TypeScript, React, Tailwind, shadcn/ui, TanStack Query, Zod, React Hook Form | ✅ Already installed — use throughout |
| Framer Motion | ✅ Add in Phase 2 (`motion` package) — animations are a brief requirement |
| Supabase | ✅ Keep; it is the production backend (auth, Postgres, storage, realtime) |
| Next.js | ⏳ Pre-launch migration target for the marketing/SEO surface (see below) |
| Prisma + PostgreSQL | ⏳ The schema in `02-domain-model.md` is written as Prisma; in production it lands as Supabase Postgres migrations (Prisma optional as the type/query layer) |
| Clerk | ❌ Superseded by Supabase Auth (already integrated; supports the same social providers) |
| UploadThing | ❌ Superseded by Supabase Storage + (video) Mux/Cloudflare Stream |
| Vercel-ready | ✅ Vite static output deploys to Vercel today; Next.js migration keeps it |

### The Lumina question (needs founder sign-off)

The existing Lumina app occupies `src/pages`, `src/features`, etc. Options:

- **A. Transform in place (recommended):** Amano is a strict superset of Lumina's
  ideas (courses, tutors→instructors, live classes, marketplace, academies already
  exist here in embryonic legal-only form). Rebuild the shell and pages as Amano,
  salvaging infrastructure (auth glue, PWA, video player, quiz engine) where it
  fits. Lumina's current UI is replaced. History stays in git.
- **B. Side-by-side:** Keep Lumina untouched; build Amano under a parallel route
  tree. Doubles bundle and confusion; only right if Lumina must keep shipping from
  this repo.

Phase 1 deliberately touches nothing outside `docs/amano/`. **Option A vs B is the
one decision that must be confirmed before Phase 2 begins.**

## Production evolution (post-prototype)

1. **Pre-launch:** lift marketing + catalogue surfaces into Next.js (App Router,
   RSC) for SEO; the authenticated app can remain the SPA shell initially.
2. **Data:** repositories flip from sample data to Supabase; RLS policies enforce
   the role model; Postgres FTS powers search v1.
3. **Media:** course video on an HLS provider (Mux / Cloudflare Stream) with signed
   playback and downloadable offline packs; images via CDN with AVIF/WebP.
4. **AI:** Amano AI runs as a Supabase Edge Function orchestrating the Claude API
   (tutor, summaries, flashcards, quiz generation, CV review, interview practice),
   with per-course context injection and per-user rate budgets.
5. **Payments:** provider-agnostic `Payment` service with MTN MoMo and Airtel Money
   collection APIs first (both offer sandbox REST APIs), card PSP (e.g. Flutterwave
   /DPO in-region), Stripe/PayPal when available. Webhooks land in edge functions;
   ledger entries are append-only.
6. **Scale:** read replicas → search service (Typesense) → event analytics pipeline
   → multi-region CDN. Detail in `06-scale-and-roadmap.md`.
