import { lazy, Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TutorProtectedRoute } from "@/components/auth/TutorProtectedRoute";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { CommandPalette } from "@/components/premium/CommandPalette";
import { AchievementConfetti } from "@/components/premium/AchievementConfetti";
import { CelebrationProvider } from "@/components/premium/ProgressCelebration";
import { GlobalLiveClassBanner } from "@/components/layout/GlobalLiveClassBanner";
import { Spinner } from "@/components/ui/spinner";

// Statically import the splash screen because it's the very first thing the user sees.
import SplashScreen from "./pages/SplashScreen";

// Lazy load all other pages to implement route-based code splitting.
// This reduces the initial bundle size and improves loading performance.
const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const RoleSelectionPage = lazy(() => import("./pages/RoleSelectionPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const PlannerPage = lazy(() => import("./pages/PlannerPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const FocusView = lazy(() => import("@/features/focus/FocusView"));
const JournalPage = lazy(() => import("./pages/JournalPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AnalyticsDashboardPage = lazy(() => import("./pages/AnalyticsDashboardPage"));
const StudyAnalyticsPage = lazy(() => import("./pages/StudyAnalyticsPage"));
const PartnerPage = lazy(() => import("./pages/PartnerPage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const LuminaVaultPage = lazy(() => import("./pages/StudyLockerPage"));
const AdminContentPage = lazy(() => import("./pages/AdminContentPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const FlashcardsPage = lazy(() => import("./pages/FlashcardsPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const LuminaAcademyPage = lazy(() => import("./pages/LuminaAcademyPage"));
const AcademySelectionPage = lazy(() => import("./pages/AcademySelectionPage"));
const TeachDashboardPage = lazy(() => import("./pages/TeachDashboardPage"));
const LiveClassPage = lazy(() => import("./pages/LiveClassPage"));
const ClassRecordingsPage = lazy(() => import("./pages/ClassRecordingsPage"));
const TutorApplicationsAdminPage = lazy(() => import("./pages/TutorApplicationsAdminPage"));
const TutorProfilePage = lazy(() => import("./pages/TutorProfilePage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminAuthPage = lazy(() => import("./pages/AdminAuthPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const TutorManagementPage = lazy(() => import("./pages/TutorManagementPage"));
const SavedResearchPage = lazy(() => import("./pages/SavedResearchPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  if (!supabase) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Application Configuration Error</h1>
        <p>Supabase client could not be initialized. Please check the environment variables.</p>
      </div>
    );
  }

  return (
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <SchoolProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CommandPalette />
            <AchievementConfetti />
            <CelebrationProvider />
            <GlobalLiveClassBanner />
            <Suspense fallback={
              <div className="h-screen flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            }>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<SplashScreen />} />
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/role-select" element={<RoleSelectionPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/install" element={<InstallPage />} />

                {/* Student routes - redirects tutors/admins to their dashboards */}
                <Route path="/home" element={<ProtectedRoute studentOnly><HomePage /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute studentOnly><ChatPage /></ProtectedRoute>} />
                <Route path="/planner" element={<ProtectedRoute studentOnly><PlannerPage /></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute studentOnly><LibraryPage /></ProtectedRoute>} />
                <Route path="/focus" element={<ProtectedRoute studentOnly><FocusView /></ProtectedRoute>} />
                <Route path="/journal" element={<ProtectedRoute studentOnly><JournalPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute studentOnly><ProfilePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute studentOnly><AnalyticsDashboardPage /></ProtectedRoute>} />
                <Route path="/study-analytics" element={<ProtectedRoute studentOnly><StudyAnalyticsPage /></ProtectedRoute>} />
                <Route path="/partner" element={<ProtectedRoute studentOnly><PartnerPage /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute studentOnly><UploadPage /></ProtectedRoute>} />
                <Route path="/locker" element={<ProtectedRoute studentOnly><LuminaVaultPage /></ProtectedRoute>} />
                <Route path="/quiz" element={<ProtectedRoute studentOnly><QuizPage /></ProtectedRoute>} />
                <Route path="/quiz/:quizId" element={<ProtectedRoute studentOnly><QuizPage /></ProtectedRoute>} />
                <Route path="/flashcards" element={<ProtectedRoute studentOnly><FlashcardsPage /></ProtectedRoute>} />
                <Route path="/flashcards/:deckId" element={<ProtectedRoute studentOnly><FlashcardsPage /></ProtectedRoute>} />
                <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/achievements" element={<ProtectedRoute studentOnly><AchievementsPage /></ProtectedRoute>} />
                <Route path="/community" element={<ProtectedRoute studentOnly><CommunityPage /></ProtectedRoute>} />
                <Route path="/academy" element={<ProtectedRoute studentOnly><AcademySelectionPage /></ProtectedRoute>} />
                <Route path="/academy/dashboard" element={<ProtectedRoute studentOnly><LuminaAcademyPage /></ProtectedRoute>} />
                <Route path="/marketplace" element={<ProtectedRoute studentOnly><MarketplacePage /></ProtectedRoute>} />
                <Route path="/saved-research" element={<ProtectedRoute studentOnly><SavedResearchPage /></ProtectedRoute>} />

                {/* Tutor routes */}
                <Route path="/teach" element={<TutorProtectedRoute><TeachDashboardPage /></TutorProtectedRoute>} />

                {/* Admin routes */}
                <Route path="/admin/auth" element={<AdminAuthPage />} />
                <Route path="/admin" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
                <Route path="/admin/content" element={<AdminProtectedRoute><AdminContentPage /></AdminProtectedRoute>} />
                <Route path="/admin/tutors" element={<AdminProtectedRoute><TutorApplicationsAdminPage /></AdminProtectedRoute>} />
                <Route path="/admin/tutor-management" element={<AdminProtectedRoute><TutorManagementPage /></AdminProtectedRoute>} />

                {/* Shared routes (accessible by all authenticated users) */}
                <Route path="/class/:classId" element={<ProtectedRoute><LiveClassPage /></ProtectedRoute>} />
                <Route path="/live-class/:classId" element={<ProtectedRoute><LiveClassPage /></ProtectedRoute>} />
                <Route path="/recordings" element={<ProtectedRoute><ClassRecordingsPage /></ProtectedRoute>} />
                <Route path="/tutor/:tutorId" element={<ProtectedRoute><TutorProfilePage /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </TooltipProvider>
        </SchoolProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
</ErrorBoundary>
  );
};

export default App;