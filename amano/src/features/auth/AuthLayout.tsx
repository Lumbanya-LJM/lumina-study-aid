import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AmanoLogo } from "@/design-system/AmanoLogo";
import { fadeRise, staggerParent } from "@/design-system/motion";

/**
 * Auth chrome: brand panel (desktop) + form column.
 * Mobile-first: single column with the wordmark up top.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="dark relative hidden overflow-hidden bg-obsidian-radial lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/">
          <AmanoLogo />
        </Link>
        <div className="max-w-md space-y-6">
          <h1 className="font-serif text-4xl leading-tight text-foreground">
            Where Africa learns, shares, and grows.
          </h1>
          <p className="text-muted-foreground">
            Practical skills, verified credentials, mentorship, and income —
            one trusted ecosystem, built in Africa, for Africa.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-serif italic text-accent">Amano</span> · Bemba —
          intelligence; wisdom.
        </p>
        {/* rising-sun motif */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full border border-primary/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-52 -right-52 h-[30rem] w-[30rem] rounded-full border border-primary/10"
        />
      </aside>

      {/* Form column */}
      <main className="flex flex-col px-5 py-8 sm:px-12 lg:justify-center">
        <Link to="/" className="mb-10 lg:hidden">
          <AmanoLogo />
        </Link>
        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-sm"
        >
          <motion.div variants={fadeRise}>{children}</motion.div>
        </motion.div>
      </main>
    </div>
  );
}
