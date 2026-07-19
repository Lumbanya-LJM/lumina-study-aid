# Amano — Africa's Professional Growth Platform

> **Amano** (noun · Bemba): *intelligence; wisdom.*
> Where Africa learns, shares, and grows.

This is the Amano MVP prototype: mobile-first, obsidian-and-gold, built to feel
like a real startup product from the first commit. The architecture package that
governs it lives in [`../docs/amano/`](../docs/amano/00-architecture-overview.md).

## Status

| Phase | State |
|---|---|
| 1 · Architecture | ✅ `docs/amano/` |
| 2 · UI system | ✅ tokens · type · motion · signature components · app shell · sample data |
| 3 · Authentication | ✅ mock-first auth · OTP verify · onboarding · guards (Supabase-shaped for the swap) |
| 4 · Landing page | ✅ full public marketing surface at `/` |
| 5 · Student core | ✅ explore · course detail · player · quiz · certificates — the full learning loop |
| 6+ · Amano AI, Verified Skills, network, instructor, … | per `docs/amano/06-scale-and-roadmap.md` |

## Run it

```sh
bun install
bun run dev        # http://localhost:8090
```

Key routes while in Phase 2: `/home` (student home preview), `/design`
(the design-system reference page), `⌘K` (universal search over sample data).

## Stack

Vite · React 19 · TypeScript · Tailwind (Amano tokens) · shadcn/ui ·
Framer Motion · React Router · TanStack Query · Zustand · Zod — with Supabase
as the production backend target. Rationale: `docs/amano/01-tech-stack-decision.md`.

## Standing on its own

This folder is a **fully self-contained project** temporarily housed inside the
`lumina-study-aid` repository (the founder's call: Lumina stays untouched; Amano
lives in its own repo). The session's GitHub integration cannot create
repositories, so to extract it:

```sh
# after creating an empty amano-platform repo on GitHub:
git subtree split --prefix=amano -b amano-extract
git push git@github.com:Lumbanya-LJM/amano-platform.git amano-extract:main
```

(or simply copy the `amano/` folder into the new repo — it has no dependency on
anything outside itself except the docs, which should travel with it).

## Structure

```
src/
  app/            Shell: layout, navigation config, command palette
  design-system/  Amano signature components + motion vocabulary
  components/ui/  shadcn primitives, Amano-skinned via tokens
  data/           Domain types + Zambian sample data (swaps for Supabase later)
  pages/          Route components (feature modules split out as phases land)
  lib/ hooks/     Utilities
```
