/**
 * Amano motion vocabulary — fast, physical, purposeful.
 * Micro 120–150ms · enters 240ms rise · sheets on springs · nothing bounces.
 * All presets degrade to opacity-only under prefers-reduced-motion
 * (framer-motion handles this via the reducedMotion="user" MotionConfig).
 */
import type { Transition, Variants } from "framer-motion";

export const easeOut: Transition = { duration: 0.24, ease: [0.16, 1, 0.3, 1] };

export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
};

/** Standard content entrance: fade + 8px rise. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: easeOut },
};

/** Parent wrapper that staggers fadeRise children (max ~6 items). */
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

/** Page-level crossfade + 4px slide. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: "easeIn" } },
};

/** Credential ceremony — the one theatrical moment. */
export const ceremonyReveal: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};
