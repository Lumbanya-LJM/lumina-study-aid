import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/app/AppShell";
import { RedirectIfAuthed, RequireAuth } from "@/features/auth/guards";
import { Skeleton } from "@/components/ui/skeleton";

const HomePage = lazy(() => import("@/pages/HomePage"));
const DesignSystemPage = lazy(() => import("@/pages/DesignSystemPage"));
const ComingSoonPage = lazy(() => import("@/pages/ComingSoonPage"));
const AuthPage = lazy(() => import("@/features/auth/AuthPage"));
const VerifyPage = lazy(() => import("@/features/auth/VerifyPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/ForgotPasswordPage"));
const OnboardingPage = lazy(() => import("@/features/auth/OnboardingPage"));
const LandingPage = lazy(() => import("@/features/landing/LandingPage"));
const ExplorePage = lazy(() => import("@/features/learn/ExplorePage"));
const CourseDetailPage = lazy(() => import("@/features/learn/CourseDetailPage"));
const CoursePlayerPage = lazy(() => import("@/features/learn/CoursePlayerPage"));
const LearningPage = lazy(() => import("@/features/learn/LearningPage"));
const CertificatesPage = lazy(() => import("@/features/learn/CertificatesPage"));
const LanguagesPage = lazy(() => import("@/features/learn/LanguagesPage"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function PageFallback() {
  return (
    <div className="space-y-4 pt-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={200}>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route element={<RedirectIfAuthed />}>
                  <Route path="/auth" element={<AuthPage mode="signin" />} />
                  <Route path="/auth/signup" element={<AuthPage mode="signup" />} />
                  <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
                </Route>
                <Route path="/auth/verify" element={<VerifyPage />} />
                <Route element={<RequireAuth />}>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route element={<AppShell />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/courses/:slug" element={<CourseDetailPage />} />
                    <Route path="/learning" element={<LearningPage />} />
                    <Route path="/learning/:courseId/lesson/:lessonId" element={<CoursePlayerPage />} />
                    <Route path="/certificates" element={<CertificatesPage />} />
                    <Route path="/languages" element={<LanguagesPage />} />
                    <Route path="/design" element={<DesignSystemPage />} />
                    {/* Modules landing in later phases — never a dead end */}
                    <Route path="*" element={<ComingSoonPage />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster position="top-center" />
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
