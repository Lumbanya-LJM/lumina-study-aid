# Amano — Design System ("Quiet Confidence")

The brand reads as *lasting infrastructure, not a passing consumer app*: deep
obsidian ground, heritage gold accents, editorial serif headlines, disciplined
spacing, restrained motion. Inspiration register: Apple, Linear, Notion, Stripe,
Arc, Raycast, Superhuman, Framer, Vercel. Never cluttered, never childish, never
generic.

## 1. Color tokens — dual-tone architecture

Founder direction (2026-07): the everyday product runs on **porcelain light**
— warm ivory ground, white cards with soft shadows, obsidian ink — while
**deep obsidian is reserved for brand theatre**: the landing hero, Verified
Skills band, Heritage museum, certificates, credential ceremonies, and the
auth brand panel. Theatre surfaces opt in by scoping a `dark` class on their
subtree; every token re-resolves inside it. Gold buttons are identical in
both worlds. All tokens as HSL CSS variables consumed by Tailwind semantic
classes — components never hard-code hex.

```css
:root { /* porcelain light (default, everyday product) */
  --background: 40 33% 96%;        /* Porcelain      #F8F6F1        */
  --surface:    0 0% 100%;         /* White card                    */
  --surface-2:  40 22% 93%;        /* Recessed                      */
  --border:     40 14% 86%;        /* Hairlines                     */
  --foreground: 240 10% 10%;       /* Obsidian ink                  */
  --muted-foreground: 240 5% 42%;
  --primary:    43 74% 46%;        /* Heritage Gold (grounded)      */
  --accent:     43 65% 34%;        /* Deep gold — link/label ink    */
  --shadow-card: 0 1px 2px hsl(240 10% 10% / .05),
                 0 10px 28px -10px hsl(240 10% 10% / .12);
}

.dark { /* brand theatre — scoped, not a global mode */
  /* Ground */
  --background: 240 7% 10%;        /* Deep obsidian                 */
  --surface:    240 6% 14%;        /* Graphite base                 */
  --surface-2:  240 6% 18%;        /* Raised card                   */
  --border:     240 5% 26%;        /* Hairlines                     */
  --shadow-card: 0 0 #0000;        /* hairline elevation only       */

  /* Ink */
  --foreground: 40 30% 97%;        /* Warm ivory     #F7F5F0        */
  --muted-foreground: 240 7% 72%;  /* Secondary text                */

  /* Brand */
  --primary:    43 74% 52%;        /* Heritage Gold  #E0A82E        */
  --primary-foreground: 240 10% 6%;
  --accent:     45 56% 74%;        /* Champagne Gold #E8D5A4        */

  /* Semantic */
  --success: 152 55% 42%;  --warning: 38 92% 55%;
  --destructive: 0 66% 54%; --info: 214 84% 60%;

  /* Effects */
  --gold-gradient: linear-gradient(135deg, hsl(43 74% 52%), hsl(45 56% 74%));
  --glass: rgba(18, 18, 24, 0.72);           /* + backdrop-blur(16px) */
  --glow-gold: 0 0 40px -12px hsl(43 74% 52% / 0.45);
  --radius: 1rem;                             /* rounded cards */
}
```

**Academy accents.** Each vertical carries a muted secondary color (Law
oxblood, Business forest, Corporate aubergine, Tech indigo, Agriculture
olive, Heritage ochre, Language teal, Lifestyle rose) stored on the
`Vertical` record as HSL. They appear only on category badges, the
generative pattern art, and small details — never on buttons or actions.
Course art is generative: a textile-inspired SVG pattern family per academy
(`CourseArt`), drawn in the academy accent over a deep tinted ground and
seeded per course, standing in until real thumbnails exist.

**Usage discipline.** Gold is a *precious* accent: primary CTAs, active states,
credential moments (certificates, verified-skill badges), key data points. Never
gold body text, never gold surfaces. Large areas stay obsidian/graphite; hierarchy
comes from surface elevation + ivory ink, not color noise. Glass
(`--glass` + blur) only on floating layers: sticky headers, command palette,
AI panel, sheets.

## 2. Typography

| Role | Face | Notes |
|---|---|---|
| Display / headlines / wordmark | **Fraunces** (variable serif) | Editorial authority; optical size on; tight tracking (-0.02em); weights 400–600 |
| Interface / body | **Inter** (variable sans) | 400/500/600; `font-feature-settings: "cv11","ss01"` |
| Numerals in data | Inter tabular-nums | Dashboards, prices, stats |

Scale (mobile → desktop, fluid via clamp): Display 40→72 · H1 32→48 · H2 24→32 ·
H3 20→24 · Body 15→16 · Small 13→14 · Caption 12. Line height: 1.1 display,
1.6 body. Serif is for *moments* (page heroes, section titles, certificate
rendering); everything functional is Inter.

## 3. Space, radius, elevation

- **Spacing:** 4-pt base grid; sections breathe — 96–128 px vertical rhythm on
  marketing, 24–32 px card gutters in app. Generous by default (the brief:
  "large spacing").
- **Radius:** cards 16 px, sheets/modals 20–24 px, buttons 10 px (pill for
  chips/filters), inputs 12 px.
- **Elevation:** dark UIs elevate by *lightening surface + hairline border*, not
  heavy shadows. One soft ambient shadow tier for floating layers; `--glow-gold`
  reserved for credential/celebration moments.
- **Layout:** 390 px design-first; content max-width 1200 px; dashboard grid
  12-col desktop / 4-col mobile.

## 4. Motion (Framer Motion)

Fast, physical, purposeful — Linear/Raycast register. Nothing bounces.

| Pattern | Spec |
|---|---|
| Micro (hover, press) | 120–150 ms, ease-out; press scales 0.98 |
| Enter (cards, lists) | 240 ms fade + 8 px rise; stagger 40 ms, max 6 items |
| Page transitions | 200 ms crossfade + 4 px slide; shared-element for course card → player |
| Sheets/modals | Spring (stiffness 380, damping 34) |
| Celebrations | Certificate/badge issuance: 600 ms gold-glow reveal + serif serial count-in — the one place motion is theatrical |
| Skeletons | Shimmer at 1.6 s; content swaps with 150 ms fade |

Respect `prefers-reduced-motion`: everything degrades to opacity-only.

## 5. Component register (shadcn/ui base, Amano-skinned)

Beyond the stock set, the system defines these signature components:

- **`CourseCard`** — 16:9 thumb, vertical badge ("Amano Law"), progress hairline,
  hover: 2 px rise + border brightens to gold at 24 % opacity.
- **`GoldButton`** — primary CTA; gold-gradient fill, obsidian text, subtle glow
  on hover. Secondary = ghost with hairline; never two gold buttons in one view.
- **`VerifiedSkillBadge`** — hexagonal gold seal + skill name + serial; small,
  inline, and large ceremonial variants. The most protected visual in the system.
- **`CredentialCard`** — certificate render: obsidian card, gold foil rules,
  serif name, QR/serial for `/verify/:serial`.
- **`StatTile`** — dashboard KPI: tabular numeral, delta chip, sparkline.
- **`AmanoAILauncher`** — floating orb (mobile) / bottom-right panel (desktop);
  glass surface, gold pulse when it has proactive suggestions.
- **`PathMap`** — vertical journey visual for learning paths: nodes, gold
  progress line, locked/complete states.
- **`HeritagePanel`** — museum register: full-bleed imagery, serif captions,
  timeline scrubber; slightly slower (400 ms) reveals — the "digital museum" feel.
- **`PersonCell`** — avatar + name + headline + verification tick; used across
  network, mentors, instructors, recruiter search.
- **`EmptyState`** — every module ships one: quiet illustration line-art in gold
  at 20 % opacity, one sentence, one action.

## 6. Iconography & imagery

- Lucide icons, 1.5 px stroke, 20/24 px grid — no filled icons except
  verification tick and rating stars.
- Photography: warm, natural light, real African professionals and places; duotone
  obsidian/gold treatment for marketing heroes. No stock-photo clichés, no
  cartoon-mascot illustration. Line-art motifs may quote the brand mark (tree,
  open book, rising circle).
- The mark: golden monumental "A" with tree + open book + rising circle; clear
  space = height of the A's counter; never recolored.

## 7. Accessibility & performance bars

- Contrast: body ivory-on-obsidian ≈ 15:1; gold reserved for large text/UI where
  it holds ≥ 3:1; all pairs checked at AA.
- Hit targets ≥ 44 px; full keyboard nav; focus ring = 2 px champagne outline.
- Performance budget (mobile, mid-range Android): LCP < 2.5 s on 3G-fast, route
  chunks < 150 kB gz, images lazy + AVIF/WebP, fonts subset + `font-display: swap`.
- Dark/light both themed via the same tokens; `Appearance` setting persists.

## 8. Voice in the UI

Assured, rooted, purposeful (per brand book). Sentence case everywhere. No
exclamation marks in system copy. Celebrate with weight, not confetti spam:
*"Certificate earned. AMN-2026-000123 — verifiable anywhere."*
