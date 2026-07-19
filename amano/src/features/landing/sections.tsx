import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeRise, staggerParent } from "@/design-system/motion";

/** Scroll-revealed landing section wrapper. */
export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={staggerParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={`mx-auto w-full max-w-6xl px-5 py-16 md:py-24 ${className}`}
    >
      {children}
    </motion.section>
  );
}

export function SectionTitle({
  kicker,
  title,
  lead,
  align = "center",
}: {
  kicker?: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
}) {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <motion.header variants={fadeRise} className={`mb-10 max-w-2xl md:mb-14 ${alignCls}`}>
      {kicker && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
          {kicker}
        </p>
      )}
      <h2 className="font-serif text-3xl leading-tight text-foreground md:text-4xl">
        {title}
      </h2>
      {lead && <p className="mt-4 text-muted-foreground md:text-lg">{lead}</p>}
    </motion.header>
  );
}
