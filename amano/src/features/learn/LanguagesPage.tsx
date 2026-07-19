import { motion } from "framer-motion";
import { Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CourseCard } from "@/design-system/CourseCard";
import { SectionHeader } from "@/design-system/SectionHeader";
import { fadeRise, staggerParent } from "@/design-system/motion";
import {
  courses,
  languageCountries,
  languageCourseSlugs,
} from "@/data/sample/catalog";
import { toast } from "sonner";

/**
 * Amano Language — learn Africa's languages, organised by country.
 * Starter countries only; the taxonomy grows with the product.
 */
export default function LanguagesPage() {
  const navigate = useNavigate();
  const languageCourses = courses.filter((c) => c.verticalId === "language");

  const openLanguage = (language: string) => {
    const slug = languageCourseSlugs[language];
    if (slug) navigate(`/courses/${slug}`);
    else
      toast.info(`${language} courses are coming soon — we're onboarding native teachers now.`);
  };

  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      animate="visible"
      className="space-y-10"
    >
      <motion.header variants={fadeRise} className="max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
          Amano Language
        </p>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          Speak the continent
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Africa's languages, taught by native speakers — for heritage, for
          business, for connection. Choose a country to see its most-learned
          languages.
        </p>
      </motion.header>

      {/* Country tiles */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {languageCountries.map((c) => (
          <motion.article
            key={c.country}
            variants={fadeRise}
            className="card-raise p-5 transition-colors hover:border-primary/25"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {c.flag}
              </span>
              <div>
                <h2 className="font-serif text-xl text-foreground">{c.country}</h2>
                <p className="text-xs text-muted-foreground">
                  {c.languages.length}{" "}
                  {c.languages.length === 1 ? "language" : "languages"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.languages.map((lang) => {
                const live = Boolean(languageCourseSlugs[lang]);
                return (
                  <button
                    key={lang}
                    onClick={() => openLanguage(lang)}
                    className={
                      live
                        ? "rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-primary/20"
                        : "rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
                    }
                  >
                    {lang}
                    {live && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-primary">· live</span>}
                  </button>
                );
              })}
            </div>
          </motion.article>
        ))}
      </section>

      {/* Live language courses */}
      {languageCourses.length > 0 && (
        <section>
          <SectionHeader
            title="Start speaking today"
            subtitle="Language courses live on Amano now"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {languageCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      <motion.footer
        variants={fadeRise}
        className="flex items-center gap-3 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground"
      >
        <Languages className="h-5 w-5 shrink-0 text-primary/40" />
        More countries and languages join as native teachers come on board —
        speak one? Become an instructor and teach it on Amano.
      </motion.footer>
    </motion.div>
  );
}
