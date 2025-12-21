import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TutorProtectedRoute } from "@/components/auth/TutorProtectedRoute";
import SplashScreen from "./pages/SplashScreen";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import PlannerPage from "./pages/PlannerPage";
import LibraryPage from "./pages/LibraryPage";
import FocusPage from "./pages/FocusPage";
import JournalPage from "./pages/JournalPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";

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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/welcome" element={<RoleSelectionPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute><PlannerPage /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
            <Route path="/focus" element={<ProtectedRoute><FocusPage /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboardPage /></ProtectedRoute>} />
            
            <Route path="/partner" element={<ProtectedRoute><PartnerPage /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
            <Route path="/locker" element={<ProtectedRoute><LuminaVaultPage /></ProtectedRoute>} />
            <Route path="/admin/content" element={<ProtectedRoute><AdminContentPage /></ProtectedRoute>} />
            <Route path="/admin/tutors" element={<ProtectedRoute><TutorApplicationsAdminPage /></ProtectedRoute>} />
            <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="/quiz/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
            <Route path="/flashcards/:deckId" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/install" element={<InstallPage />} />
            <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/academy" element={<ProtectedRoute><LuminaAcademyPage /></ProtectedRoute>} />
            <Route path="/teach" element={<TutorProtectedRoute><TeachDashboardPage /></TutorProtectedRoute>} />
            <Route path="/class/:classId" element={<ProtectedRoute><LiveClassPage /></ProtectedRoute>} />
            <Route path="/live-class/:classId" element={<ProtectedRoute><LiveClassPage /></ProtectedRoute>} />
            <Route path="/recordings" element={<ProtectedRoute><ClassRecordingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;