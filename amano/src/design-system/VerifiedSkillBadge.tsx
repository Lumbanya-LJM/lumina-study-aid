import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ceremonyReveal } from "./motion";
import { skillById } from "@/data/sample/catalog";
import type { VerifiedSkillBadgeData } from "@/data/types";

/**
 * The most protected visual in the system: the seal of demonstrated competence.
 * `inline` for profiles and lists; `ceremony` for the issuance moment.
 */
export function VerifiedSkillBadge({
  badge,
  variant = "inline",
  className,
}: {
  badge: VerifiedSkillBadgeData;
  variant?: "inline" | "ceremony";
  className?: string;
}) {
  const skill = skillById(badge.skillId);
  if (!skill) return null;

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 py-1 pl-1.5 pr-3 text-sm font-medium text-accent",
          className
        )}
        title={`${badge.level} · ${badge.serial}`}
      >
        <BadgeCheck className="h-4 w-4 text-primary" />
        {skill.name}
      </span>
    );
  }

  return (
    <motion.div
      variants={ceremonyReveal}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-primary/30 bg-surface p-8 text-center shadow-glow-gold",
        className
      )}
    >
      <div className="grid h-20 w-20 place-items-center rounded-full bg-gold-gradient">
        <BadgeCheck className="h-10 w-10 text-primary-foreground" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {badge.level}
        </p>
        <h3 className="mt-1 font-serif text-2xl text-foreground">{skill.name}</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Demonstrated, reviewed, and verified on Amano.
      </p>
      <p className="rounded-full border border-border px-3 py-1 text-xs tabular-nums text-muted-foreground">
        {badge.serial} · verifiable at amano.africa/verify
      </p>
    </motion.div>
  );
}
