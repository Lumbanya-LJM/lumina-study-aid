import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "./motion";

/**
 * The everywhere-accessible Amano AI entry point.
 * Phase 2 ships the launcher + panel chrome; assistant modes land in Phase 6.
 */
export function AmanoAILauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Open Amano AI"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-float animate-gold-pulse md:bottom-6 md:right-6"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: spring }}
            exit={{ opacity: 0, y: 24, transition: { duration: 0.15 } }}
            className="glass fixed inset-x-3 bottom-3 z-50 flex h-[70dvh] flex-col overflow-hidden rounded-lg border border-border shadow-float md:inset-x-auto md:bottom-6 md:right-6 md:h-[560px] md:w-[400px]"
            role="dialog"
            aria-label="Amano AI"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="inline-flex items-center gap-2 font-serif text-lg text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Amano AI
              </span>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <Sparkles className="h-8 w-8 text-primary/30" strokeWidth={1.25} />
              <p className="font-serif text-lg text-foreground">
                Ask Amano anything
              </p>
              <p className="text-sm text-muted-foreground">
                Summaries, explanations, flashcards, quizzes, career and business
                advice — the assistant arrives in Phase 6.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
