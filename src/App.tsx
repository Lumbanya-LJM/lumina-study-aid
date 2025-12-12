import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import PlannerPage from "./pages/PlannerPage";
import LibraryPage from "./pages/LibraryPage";
import FocusPage from "./pages/FocusPage";
import JournalPage from "./pages/JournalPage";
import ProfilePage from "./pages/ProfilePage";
import CustomizeAvatarPage from "./pages/CustomizeAvatarPage";
import PartnerPage from "./pages/PartnerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/customize-avatar" element={<CustomizeAvatarPage />} />
          <Route path="/partner" element={<PartnerPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;