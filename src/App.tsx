import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import PublicBio from "./pages/PublicBio";
import NotFound from "./pages/NotFound";
import Subscription from "./pages/Subscription";
import Followers from "./pages/Followers";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import AISupport from "./pages/AISupport";
import PiAuth from "./pages/PiAuth";
import EmailAuth from "./pages/EmailAuth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CustomDomain from "./pages/CustomDomain";
import { SplashScreen } from "./components/SplashScreen";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if user has already seen splash in this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onLoadingComplete={handleLoadingComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<PiAuth />} />
            <Route path="/email-auth" element={<EmailAuth />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/followers" element={<Followers />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ai-support" element={<AISupport />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/domain" element={<CustomDomain />} />
            <Route path="/u/:username" element={<PublicBio />} />
            <Route path="/profile/:username" element={<PublicBio />} />
            <Route path="/:username" element={<PublicBio />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
