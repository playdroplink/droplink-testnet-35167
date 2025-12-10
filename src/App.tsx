import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import SwitchToMerchant from "./pages/SwitchToMerchant";
import MerchantStoreSetup from "./pages/MerchantStoreSetup";
import MerchantProductManager from "./pages/MerchantProductManager";
import MerchantStorePreview from "./pages/MerchantStorePreview";
import StoreFront from "./pages/StoreFront";
import PublicBio from "./pages/PublicBio";
import PaymentPage from "./pages/PaymentPage";
import NotFound from "./pages/NotFound";
import Subscription from "./pages/Subscription";
import Followers from "./pages/Followers";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import AISupport from "./pages/AISupport";
import PiAuth from "./pages/PiAuth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CustomDomain from "./pages/CustomDomain";
import VotingPage from "./pages/VotingPage";
// import ProfileDebug from "./pages/ProfileDebug";
import Home from "./pages/Home";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always show splash when app opens
    // Remove session storage check to show splash every time
    setIsLoading(false);
  }, []);

  const handleLoadingComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleLoadingComplete} />;
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
            <Route path="/home" element={<Home />} />
            <Route path="/auth" element={<PiAuth />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/voting" element={<VotingPage />} />
            <Route path="/followers" element={<Followers />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ai-support" element={<AISupport />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/domain" element={<CustomDomain />} />
            {/* <Route path="/debug" element={<ProfileDebug />} /> */}
            <Route path="/pay/:linkId" element={<PaymentPage />} />
            <Route path="/u/:username" element={<PublicBio />} />
            <Route path="/profile/:username" element={<PublicBio />} />
            <Route path="/@:username" element={<PublicBio />} />
            <Route path="/:username" element={<PublicBio />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/switch-to-merchant" element={<SwitchToMerchant />} />
            <Route path="/merchant-setup" element={<MerchantStoreSetup />} />
            <Route path="/merchant-products" element={<MerchantProductManager />} />
            <Route path="/store/:merchantId" element={<MerchantStorePreview />} />
            <Route path="/storefront/:storeId" element={<StoreFront />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
