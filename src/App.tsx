import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TutorProtectedRoute } from "@/components/auth/TutorProtectedRoute";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { CommandPalette } from "@/components/premium/CommandPalette";
import { AchievementConfetti } from "@/components/premium/AchievementConfetti";
import SplashScreen from "./pages/SplashScreen";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import PlannerPage from "./pages/PlannerPage";
import LibraryPage from "./pages/LibraryPage";
import FocusView from "@/features/focus/FocusView";
import JournalPage from "./pages/JournalPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import StudyAnalyticsPage from "./pages/StudyAnalyticsPage";

import PartnerPage from "./pages/PartnerPage";
import UploadPage from "./pages/UploadPage";
import LuminaVaultPage from "./pages/StudyLockerPage";
import AdminContentPage from "./pages/AdminContentPage";
import QuizPage from "./pages/QuizPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import InstallPage from "./pages/InstallPage";
import SupportPage from "./pages/SupportPage";
import NotificationsPage from "./pages/NotificationsPage";
import AchievementsPage from "./pages/AchievementsPage";
import CommunityPage from "./pages/CommunityPage";
import LuminaAcademyPage from "./pages/LuminaAcademyPage";
import TeachDashboardPage from "./pages/TeachDashboardPage";
import LiveClassPage from "./pages/LiveClassPage";
import ClassRecordingsPage from "./pages/ClassRecordingsPage";
import TutorApplicationsAdminPage from "./pages/TutorApplicationsAdminPage";
import TutorProfilePage from "./pages/TutorProfilePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminAuthPage from "./pages/AdminAuthPage";
import MarketplacePage from "./pages/MarketplacePage";
import NotFound from "./pages/NotFound";
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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CommandPalette />
            <AchievementConfetti />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<SplashScreen />} />
              <Route path="/welcome" element={<RoleSelectionPage />} />
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
              <Route path="/academy" element={<ProtectedRoute studentOnly><LuminaAcademyPage /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute studentOnly><MarketplacePage /></ProtectedRoute>} />
              
              {/* Tutor routes */}
              <Route path="/teach" element={<TutorProtectedRoute><TeachDashboardPage /></TutorProtectedRoute>} />
              
              {/* Admin routes */}
              <Route path="/admin/auth" element={<AdminAuthPage />} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
              <Route path="/admin/content" element={<AdminProtectedRoute><AdminContentPage /></AdminProtectedRoute>} />
              <Route path="/admin/tutors" element={<AdminProtectedRoute><TutorApplicationsAdminPage /></AdminProtectedRoute>} />
              
              {/* Shared routes (accessible by all authenticated users) */}
              <Route path="/class/:classId" element={<ProtectedRoute><LiveClassPage /></ProtectedRoute>} />
              <Route path="/live-class/:classId" element={<ProtectedRoute><LiveClassPage /></ProtectedRoute>} />
              <Route path="/recordings" element={<ProtectedRoute><ClassRecordingsPage /></ProtectedRoute>} />
              <Route path="/tutor/:tutorId" element={<ProtectedRoute><TutorProfilePage /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
</ErrorBoundary>
  );
};

export default App;