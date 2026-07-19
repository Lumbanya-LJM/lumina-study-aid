import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
  HandCoins,
  Landmark,
  Menu,
  Route,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmanoLogo } from "@/design-system/AmanoLogo";
import { CourseCard } from "@/design-system/CourseCard";
import { fadeRise } from "@/design-system/motion";
import { courses, paths, people } from "@/data/sample/catalog";
import { useAuth } from "@/features/auth/store";
import { cn } from "@/lib/utils";
import { Section, SectionTitle } from "./sections";

/* ────────────────────────── data (marketing copy) ────────────────────── */

const pillars = [
  { icon: GraduationCap, title: "Learn", blurb: "Practical, credential-bearing courses with the Amano AI tutor beside every lesson — downloadable for offline study." },
  { icon: Users, title: "Network", blurb: "A professional identity built on verified capability, connected to recruiters, companies, and real opportunity." },
  { icon: Sparkles, title: "Grow", blurb: "Mentorship, career coaching, interview practice, and an AI career advisor that carries you forward over time." },
  { icon: HandCoins, title: "Earn", blurb: "Teach courses, sell products, offer consultations, host events — every expert gains new streams of income." },
];

const testimonials = [
  { quote: "I followed the small business path one evening at a time on my phone. Within a year I registered with PACRA, opened a business account, and hired my first employee.", name: "Grace Mwale", role: "Founder, Kabwata Fresh Produce" },
  { quote: "The Verified Skill badge changed my applications completely. Employers stopped asking if I could use Excel — they could see the proof.", name: "Joseph Sakala", role: "Procurement Officer, Solwezi" },
  { quote: "My course on Zambian tax now earns more than my old consultancy retainers — and my students actually file correctly.", name: "Bwalya Kasonde", role: "Chartered Accountant & Amano instructor" },
];

const partners = ["Zanaco", "MTN Zambia", "Airtel", "ZICA", "UNZA", "Copperbelt Energy"];

const plans = [
  {
    name: "Free",
    price: "K0",
    period: "forever",
    features: ["Selected free courses", "Community access", "Basic profile", "Amano AI (limited)"],
    cta: "Join free",
    highlight: false,
  },
  {
    name: "Amano Pro",
    price: "K199",
    period: "per month",
    features: ["Unlimited learning library", "Certificates & offline packs", "Full Amano AI tutor", "1 Verified Skill assessment / month", "Mentorship booking"],
    cta: "Start Pro",
    highlight: true,
  },
  {
    name: "Business",
    price: "Custom",
    period: "per seat, annual",
    features: ["Team dashboards & assigned paths", "Compliance tracking", "Verified-skill reporting", "Priority support"],
    cta: "Talk to us",
    highlight: false,
  },
];

const navLinks = [
  { label: "Explore", to: "/explore" },
  { label: "Heritage", href: "#heritage" },
  { label: "Mentorship", href: "#mentorship" },
  { label: "For Business", href: "#business" },
  { label: "Pricing", href: "#pricing" },
];

/* ────────────────────────────── page ─────────────────────────────────── */

export default function LandingPage() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const instructors = people.filter((p) => p.roles.includes("instructor")).slice(0, 4);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(user ? "/explore" : "/auth/signup");
  };

  return (
    <div className="bg-background">
      {/* ── Nav ── */}
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/">
            <AmanoLogo />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((l) =>
              l.to ? (
                <Link key={l.label} to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              ) : (
                <a key={l.label} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </a>
              )
            )}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Button variant="gold" onClick={() => navigate("/home")}>
                Open Amano <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  Sign in
                </Button>
                <Button variant="gold" onClick={() => navigate("/auth/signup")}>
                  Join Amano
                </Button>
              </>
            )}
          </div>
          <button
            className="grid h-10 w-10 place-items-center text-foreground md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="border-t border-border px-5 py-4 md:hidden">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href ?? l.to}
                className="block py-2.5 text-sm text-muted-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
              <Button variant="gold" className="flex-1" onClick={() => navigate("/auth/signup")}>
                Join
              </Button>
            </div>
          </nav>
        )}
      </header>

      {/* ── Hero (brand theatre: obsidian) ── */}
      <div className="dark relative overflow-hidden bg-obsidian-radial">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-22rem] h-[44rem] w-[44rem] -translate-x-1/2 rounded-full border border-primary/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-26rem] h-[52rem] w-[52rem] -translate-x-1/2 rounded-full border border-primary/10"
        />
        <Section className="pb-14 pt-16 text-center md:pb-24 md:pt-28">
          <motion.p variants={fadeRise} className="mx-auto mb-5 w-fit rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-accent">
            Amano · Bemba — intelligence, wisdom
          </motion.p>
          <motion.h1
            variants={fadeRise}
            className="mx-auto max-w-3xl font-serif text-4xl leading-[1.1] text-foreground sm:text-5xl md:text-6xl"
          >
            Where Africa learns, shares, and{" "}
            <span className="text-gold-gradient">grows</span>.
          </motion.h1>
          <motion.p variants={fadeRise} className="mx-auto mt-6 max-w-xl text-muted-foreground md:text-lg">
            Practical skills, verified credentials, mentorship, networking, and
            income — Africa's professional growth platform, built in Zambia for
            the whole continent.
          </motion.p>

          <motion.form
            variants={fadeRise}
            onSubmit={submitSearch}
            className="mx-auto mt-9 flex max-w-lg items-center gap-2 rounded-full border border-border bg-surface p-1.5 pl-5 focus-within:border-primary/40"
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you want to learn?"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" variant="gold" className="shrink-0 rounded-full">
              Search
            </Button>
          </motion.form>

          <motion.div variants={fadeRise} className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
            {[
              ["120+", "practical courses"],
              ["40+", "verified experts"],
              ["6", "revenue streams for creators"],
            ].map(([n, label]) => (
              <div key={label}>
                <p className="font-serif text-2xl text-foreground md:text-3xl">{n}</p>
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">{label}</p>
              </div>
            ))}
          </motion.div>
        </Section>
      </div>

      {/* ── Partners ── */}
      <Section className="border-y border-border py-10 md:py-10">
        <motion.p variants={fadeRise} className="mb-6 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Trusted by teams and institutions across Zambia
        </motion.p>
        <motion.div variants={fadeRise} className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {partners.map((p) => (
            <span key={p} className="font-serif text-lg text-muted-foreground/70">
              {p}
            </span>
          ))}
        </motion.div>
      </Section>

      {/* ── Four pillars ── */}
      <Section>
        <SectionTitle
          kicker="The ecosystem"
          title="One platform for a whole career"
          lead="Four pillars carry you from learning a skill to earning a living from it."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <motion.div key={p.title} variants={fadeRise} className="card-raise group p-6 transition-colors hover:border-primary/25">
              <p.icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
              <h3 className="mt-4 font-serif text-xl text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Popular courses ── */}
      <Section>
        <SectionTitle
          kicker="Learn"
          title="Skills you can use on Monday morning"
          lead="Taught by Zambian professionals who do the work — not just talk about it."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(0, 6).map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
        <motion.div variants={fadeRise} className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate(user ? "/explore" : "/auth/signup")}>
            Browse the full catalogue <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </Section>

      {/* ── Verified Skills (brand theatre: obsidian) ── */}
      <Section className="dark max-w-none bg-background py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle
              align="left"
              kicker="The Amano difference"
              title="Don't just certify it. Prove it."
              lead="Finish a course, then perform the skill — draft the contract, build the model, deliver the speech. Reviewed by AI and countersigned by verified experts. Employers see proof, not promises."
            />
            <motion.ul variants={fadeRise} className="space-y-3">
              {[
                "Realistic, timeboxed practical assessments",
                "Rubric-driven AI review with a full feedback report",
                "Expert countersignature on high-stakes skills",
                "Public serial — any employer can verify in seconds",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </motion.ul>
            <motion.div variants={fadeRise} className="mt-8">
              <Button variant="gold" onClick={() => navigate(user ? "/skills" : "/auth/signup")}>
                Earn a Verified Skill
              </Button>
            </motion.div>
          </div>
          <motion.div variants={fadeRise} className="relative mx-auto w-full max-w-sm rounded-lg border border-primary/30 bg-surface p-8 text-center shadow-glow-gold">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold-gradient">
              <BadgeCheck className="h-10 w-10 text-primary-foreground" />
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">Verified Skill</p>
            <h3 className="mt-1 font-serif text-2xl text-foreground">Contract Drafting</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Reviewed by Amano AI · Countersigned by Chanda Mulenga, LLB
            </p>
            <p className="mt-5 inline-block rounded-full border border-border px-3 py-1 text-xs tabular-nums text-muted-foreground">
              AMN-VS-2026-004821
            </p>
          </motion.div>
        </div>
      </Section>

      {/* ── Heritage ── */}
      <Section id="heritage">
        <SectionTitle
          kicker="History & Heritage"
          title="The continent's story, told in its own voice"
          lead="A digital museum of kingdoms, languages, and living culture — curated by African historians and cultural custodians."
        />
        <motion.div
          variants={fadeRise}
          className="dark relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-yellow-950/40 via-stone-950 to-background p-8 md:p-14"
        >
          <Landmark className="h-8 w-8 text-primary/60" strokeWidth={1.25} />
          <h3 className="mt-5 max-w-lg font-serif text-2xl leading-snug text-foreground md:text-3xl">
            The Bemba Kingdom · The Chitimukulu · Liberation & Independence ·
            Languages of Zambia
          </h3>
          <p className="mt-4 max-w-md text-sm text-muted-foreground md:text-base">
            Interactive maps, timelines, and oral histories — knowledge preserved
            before it is lost, and historians earning from their scholarship.
          </p>
          <Button
            variant="outline"
            className="mt-7"
            onClick={() => navigate(user ? "/heritage" : "/auth/signup")}
          >
            Enter the museum <ArrowRight className="h-4 w-4" />
          </Button>
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-primary/15" />
        </motion.div>
      </Section>

      {/* ── Mentorship + Careers ── */}
      <Section id="mentorship">
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div variants={fadeRise} className="card-raise p-8 md:p-10">
            <Users className="h-7 w-7 text-primary" strokeWidth={1.5} />
            <h3 className="mt-4 font-serif text-2xl text-foreground">Mentorship that opens doors</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              One-to-one guidance from verified professionals — chosen by field,
              goal, and stage. Today's mentees become tomorrow's mentors.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {instructors.slice(0, 3).map((m) => (
                <span key={m.id} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
                  {m.displayName} · {m.headline.split("·")[0]?.trim()}
                </span>
              ))}
            </div>
            <Button variant="outline" className="mt-7" onClick={() => navigate(user ? "/mentors" : "/auth/signup")}>
              Find your mentor
            </Button>
          </motion.div>
          <motion.div variants={fadeRise} className="card-raise p-8 md:p-10">
            <Briefcase className="h-7 w-7 text-primary" strokeWidth={1.5} />
            <h3 className="mt-4 font-serif text-2xl text-foreground">Careers built on proof</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A job board where recruiters filter by verified skills — plus a CV
              builder, AI interview practice, internships, and freelance projects.
            </p>
            <div className="mt-6 space-y-2">
              {["Procurement Officer — Mining · Solwezi", "Legal Associate · Lusaka", "Digital Marketing Lead · Remote"].map((j) => (
                <p key={j} className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                  {j}
                </p>
              ))}
            </div>
            <Button variant="outline" className="mt-7" onClick={() => navigate(user ? "/careers" : "/auth/signup")}>
              Explore the job board
            </Button>
          </motion.div>
        </div>
      </Section>

      {/* ── Learning paths ── */}
      <Section>
        <SectionTitle
          kicker="Guided journeys"
          title="Paths that lead somewhere real"
          lead="Curated course sequences that end in capability — not a pile of unrelated certificates."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {paths.map((p) => (
            <motion.div key={p.id} variants={fadeRise} className="card-raise group p-6 transition-colors hover:border-primary/25">
              <Route className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <h3 className="mt-4 font-serif text-xl text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.outcome}</p>
              <p className="mt-4 text-xs tabular-nums text-muted-foreground">
                {p.courseIds.length} courses · certificate & verified skills
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Testimonials ── */}
      <Section className="max-w-none bg-surface-2 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle kicker="Amano in action" title="Stories from the ground" />
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <motion.figure key={t.name} variants={fadeRise} className="rounded-lg border border-border bg-surface p-6 shadow-soft">
                <blockquote className="font-serif text-lg leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-muted-foreground">{t.role}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Instructors / universities / business ── */}
      <Section id="business">
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div variants={fadeRise} className="relative overflow-hidden rounded-lg bg-gold-gradient p-8 text-primary-foreground md:p-10">
            <HandCoins className="h-7 w-7" strokeWidth={1.5} />
            <h3 className="mt-4 font-serif text-2xl">Turn your knowledge into an income</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed opacity-90">
              Build your own academy on Amano: courses, mentorship, products,
              consultations, live events — with payouts to mobile money.
            </p>
            <Button
              variant="secondary"
              className="mt-7 bg-background text-foreground hover:bg-background/90"
              onClick={() => navigate(user ? "/instructor" : "/auth/signup")}
            >
              Become an instructor
            </Button>
          </motion.div>
          <motion.div variants={fadeRise} className="card-raise p-8 md:p-10">
            <Building2 className="h-7 w-7 text-primary" strokeWidth={1.5} />
            <h3 className="mt-4 font-serif text-2xl text-foreground">Amano for Business & Universities</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Give every employee a seat, assign learning paths, track compliance.
              Universities extend their reach with microcredentials, CPD, and
              executive education under their own name.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="outline">Talk to our team</Button>
              <Button variant="ghost">University partnerships</Button>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ── Pricing ── */}
      <Section id="pricing">
        <SectionTitle
          kicker="Pricing"
          title="Fair prices, African payment rails"
          lead="Pay with MTN Mobile Money, Airtel Money, Visa or Mastercard."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeRise}
              className={cn(
                "relative flex flex-col rounded-lg border p-7",
                plan.highlight
                  ? "border-primary/50 bg-surface shadow-glow-gold"
                  : "border-border bg-surface shadow-soft"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-gradient px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-serif text-xl text-foreground">{plan.name}</h3>
              <p className="mt-3">
                <span className="font-serif text-3xl text-foreground">{plan.price}</span>{" "}
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlight ? "gold" : "outline"}
                className="mt-7 w-full"
                onClick={() => navigate("/auth/signup")}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Final CTA (brand theatre: obsidian) ── */}
      <Section className="dark max-w-none bg-background py-20 text-center md:py-28">
        <motion.h2 variants={fadeRise} className="mx-auto max-w-2xl font-serif text-3xl leading-tight text-foreground md:text-5xl">
          Your wisdom is your <span className="text-gold-gradient">opportunity</span>.
        </motion.h2>
        <motion.div variants={fadeRise} className="mt-8">
          <Button variant="gold" size="lg" onClick={() => navigate("/auth/signup")}>
            Join Amano today <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </Section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
          <div>
            <AmanoLogo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Africa's professional growth platform. Built in Zambia, for the
              continent.
            </p>
          </div>
          {[
            { h: "Platform", items: ["Explore courses", "Learning paths", "Verified Skills", "Mentorship", "Jobs", "Marketplace"] },
            { h: "For partners", items: ["Become an instructor", "Amano for Business", "Universities", "Recruiters"] },
            { h: "Company", items: ["About", "History & Heritage", "Careers at Amano", "Contact", "Privacy", "Terms"] },
          ].map((col) => (
            <nav key={col.h}>
              <p className="mb-3 text-sm font-semibold text-foreground">{col.h}</p>
              <ul className="space-y-2">
                {col.items.map((i) => (
                  <li key={i}>
                    <span className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {i}
                    </span>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © 2026 Amano. Amano is a Bemba word meaning intelligence and wisdom.
        </div>
      </footer>
    </div>
  );
}
