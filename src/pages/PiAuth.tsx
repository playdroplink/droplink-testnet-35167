import { useEffect } from "react";
import { isPiBrowserEnv } from "@/contexts/PiContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePi } from "@/contexts/PiContext";
import { Loader2, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
// import { supabase } from "@/integrations/supabase/client";
// import EmailAuthForm from "@/components/EmailAuthForm"; // Disabled for Pi-only auth
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AboutModal } from "@/components/AboutModal";
import { PI_CONFIG } from '@/config/pi-config';
import { LicenseModal } from "@/components/LicenseModal";
import { MerchantConfigModal } from "@/components/MerchantConfigModal";
import { PiDomainModal } from "@/components/PiDomainModal";
import { DropPayModal } from "@/components/DropPayModal";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import droplinkLogo from "@/assets/droplink-logo.png";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PiAuth = () => {
    // Notification state for non-Pi Browser
    const [showPiBrowserNotice, setShowPiBrowserNotice] = useState(false);
    const [enableChristmasTheme, setEnableChristmasTheme] = useState(() => {
      // Load from localStorage on mount
      const saved = localStorage.getItem('droplink-christmas-theme');
      return saved !== null ? JSON.parse(saved) : true; // Default to true
    });
  const navigate = useNavigate();
  const { isAuthenticated, loading, signIn, piUser } = usePi();
  const { preferences, updatePreference } = useUserPreferences();
  const [showEcosystemModal, setShowEcosystemModal] = useState(false);


  // Pi Auth Debug State
  const [piDebug, setPiDebug] = useState({
    isPiBrowser: false,
    piSDKLoaded: false,
    error: null,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
  });

  useEffect(() => {
    // Robust Pi Browser detection
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const isPi = isPiBrowserEnv() || userAgent.includes('PiBrowser');
    const piSDKLoaded = typeof window !== 'undefined' && typeof window.Pi !== 'undefined';
    setPiDebug(prev => ({
      ...prev,
      isPiBrowser: isPi,
      piSDKLoaded,
      error: null,
      userAgent,
    }));

    // Show Pi Browser notice if not in Pi Browser
    setShowPiBrowserNotice(!isPi);
  }, []);

  // Save Christmas theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('droplink-christmas-theme', JSON.stringify(enableChristmasTheme));
  }, [enableChristmasTheme]);
  

  useEffect(() => {
    // Check if user is already authenticated (Pi or Gmail)
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Handle redirect after auth
        handlePostAuthRedirect();
        return;
      }
      
      if (isAuthenticated && piUser) {
        handlePostAuthRedirect();
      }
    };
    
    checkAuth();
  }, [isAuthenticated, piUser, navigate]);

  // Handle post-authentication redirects
  const handlePostAuthRedirect = () => {
    const authAction = sessionStorage.getItem('authAction');
    const profileToFollow = sessionStorage.getItem('profileToFollow');
    const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth');
    
    if (authAction === 'follow' && profileToFollow) {
      // Clear the session storage
      sessionStorage.removeItem('authAction');
      sessionStorage.removeItem('profileToFollow');
      sessionStorage.removeItem('redirectAfterAuth');
      
      toast.success("Successfully signed in! You can now follow this user.");
      navigate(`/${profileToFollow}`, { replace: true });
      return;
    }
    
    // Handle general redirect after auth
    if (redirectAfterAuth && redirectAfterAuth !== '/auth' && redirectAfterAuth !== '/') {
      // Clear the session storage
      sessionStorage.removeItem('redirectAfterAuth');
      sessionStorage.removeItem('authAction');
      
      toast.success("Welcome! You can now access this page.");
      navigate(redirectAfterAuth, { replace: true });
      return;
    }
    
    // Default redirect
    navigate("/");
  };

  const handlePiSignIn = async () => {
    try {
      console.log('[PI AUTH DEBUG] 🟢 START: handlePiSignIn() called');
      
      // Use robust Pi Browser detection
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
      console.log('[PI AUTH DEBUG] 📋 User Agent:', userAgent);
      
      const isPi = isPiBrowserEnv() || userAgent.includes('PiBrowser');
      console.log('[PI AUTH DEBUG] 🔍 isPiBrowserEnv():', isPiBrowserEnv());
      console.log('[PI AUTH DEBUG] 🔍 userAgent.includes(PiBrowser):', userAgent.includes('PiBrowser'));
      console.log('[PI AUTH DEBUG] 🔍 Combined isPi result:', isPi);
      
      if (!isPi) {
        console.log('[PI AUTH DEBUG] ❌ NOT in Pi Browser - aborting');
        toast.error("Please use Pi Browser to sign in with Pi Network.");
        setShowPiBrowserNotice(true);
        return;
      }
      
      console.log('[PI AUTH DEBUG] ✅ Pi Browser confirmed - proceeding with signIn()');
      console.log('[PI AUTH DEBUG] 📞 Calling signIn() from PiContext...');
      
      await signIn();
      
      console.log('[PI AUTH DEBUG] ✅ signIn() completed successfully');
      console.log('[PI AUTH DEBUG] 🔍 piUser after signIn:', piUser);
      
      // After sign in, get Supabase session and Pi user
      console.log('[PI AUTH DEBUG] 📍 Checking Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[PI AUTH DEBUG] 🔍 Supabase session:', session ? 'EXISTS' : 'NO SESSION');
      
      const token = session?.access_token;
      console.log('[PI AUTH DEBUG] 🔍 Access token present:', !!token);
      console.log('[PI AUTH DEBUG] 🔍 piUser present:', !!piUser);
      
      if (token && piUser) {
        console.log('[PI AUTH DEBUG] 📤 Sending user data to /api/save-pi-user...');
        // Send JWT and Pi user data to backend to save all user data
        const saveResponse = await fetch("/api/save-pi-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ piUser })
        });
        
        console.log('[PI AUTH DEBUG] 📥 Response status:', saveResponse.status);
        const saveData = await saveResponse.json();
        console.log('[PI AUTH DEBUG] 📥 Response data:', saveData);
        
        if (!saveResponse.ok) {
          console.log('[PI AUTH DEBUG] ⚠️ save-pi-user returned non-200 status');
        }
        
        // Redirect to dashboard after successful sign in
        console.log('[PI AUTH DEBUG] 🔄 Redirecting to /dashboard');
        navigate("/dashboard", { replace: true });
      } else {
        console.log('[PI AUTH DEBUG] ❌ Missing token or piUser - cannot save');
        console.log('[PI AUTH DEBUG] ❌ token:', token ? 'PRESENT' : 'MISSING');
        console.log('[PI AUTH DEBUG] ❌ piUser:', piUser ? JSON.stringify(piUser) : 'MISSING');
      }
      
      console.log('[PI AUTH DEBUG] 🟢 END: handlePiSignIn() completed successfully');
    } catch (error: any) {
      console.error('[PI AUTH DEBUG] ❌ ERROR in handlePiSignIn:', error);
      console.error('[PI AUTH DEBUG] ❌ Error message:', error.message);
      console.error('[PI AUTH DEBUG] ❌ Error stack:', error.stack);
      toast.error(error.message || "Failed to sign in");
    }
  };

  

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (

    <div className={`min-h-screen ${enableChristmasTheme ? 'bg-gradient-to-b from-red-600 via-sky-400 to-green-600' : 'bg-sky-400'} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Festive snowflakes background - only show if Christmas theme enabled */}
      {enableChristmasTheme && (
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-4xl animate-pulse">❄️</div>
        <div className="absolute top-20 right-20 text-5xl animate-bounce">🎄</div>
        <div className="absolute bottom-20 left-20 text-4xl animate-pulse">❄️</div>
        <div className="absolute bottom-10 right-10 text-5xl animate-bounce">🎄</div>
        <div className="absolute top-1/3 left-1/4 text-3xl opacity-60">⛄</div>
        <div className="absolute top-2/3 right-1/4 text-3xl opacity-60">⛄</div>
      </div>
      )}

      <Card className="w-full max-w-md relative z-10">
        {/* Pi Browser Notice */}
        {showPiBrowserNotice && (
          <div className="p-3 mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 text-sm">
            <b>Pi Browser Required:</b> To sign in with Pi Network, please use the official Pi Browser.<br />
            <a href="https://minepi.com/Wain2020" target="_blank" rel="noopener noreferrer" className="underline text-blue-700 font-semibold">Download Pi Browser</a>
          </div>
        )}
        <CardHeader className="text-center">
          {/* Theme Toggle Switches */}
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b">
            {/* Christmas Theme Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="christmas-toggle" className="text-xs sm:text-sm font-medium whitespace-nowrap">
                {enableChristmasTheme ? '🎄' : '❄️'}
              </Label>
              <Switch
                id="christmas-toggle"
                checked={enableChristmasTheme}
                onCheckedChange={setEnableChristmasTheme}
              />
            </div>
            
            {/* Light/Dark Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  const newTheme = preferences.theme_mode === 'dark' ? 'light' : 'dark';
                  updatePreference('theme_mode', newTheme);
                }}
                size="sm"
                variant="outline"
                title={preferences.theme_mode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="h-8 px-3 border-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {preferences.theme_mode === 'dark' ? (
                  <Sun className="w-4 h-4 text-yellow-500" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
                <span className="ml-1.5 text-xs font-medium">
                  {preferences.theme_mode === 'dark' ? 'Light' : 'Dark'}
                </span>
              </Button>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            {/* Conditional Logo - Christmas or Standard */}
            {enableChristmasTheme ? (
              <img 
                src="https://i.ibb.co/W4yN9rQ4/Gemini-Generated-Image-uo458huo458huo45-removebg-preview.png" 
                alt="Gemini-Generated-Image-uo458huo458huo45"
                className="w-20 h-20 object-contain"
              />
            ) : (
              <img 
                src="https://i.ibb.co/67KHWdv9/Add-a-subheading-2-removebg-preview.png" 
                alt="Droplink" 
                className="w-16 h-16 object-contain"
              />
            )}
          </div>
          <CardTitle className="text-2xl">
            {enableChristmasTheme ? (
              <span className="text-red-600">🎄 Welcome to Droplink 🎄</span>
            ) : (
              <span>Welcome to Droplink</span>
            )}
          </CardTitle>
          <CardDescription>
            Sign in with Pi Network to create your personal page, sell digital products, and accept Pi payments
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Pi Network Sign In - Center Button */}
          <Button 
            onClick={handlePiSignIn} 
            className={`w-full text-white text-lg font-semibold py-6 ${
              enableChristmasTheme ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-500 hover:bg-sky-600'
            }`}
            size="lg"
            disabled={loading || !piDebug.isPiBrowser}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : piDebug.isPiBrowser ? (
              enableChristmasTheme ? "🎅 Sign in with Pi Network 🎄" : "Sign in with Pi Network"
            ) : (
              "Pi Browser Required"
            )}
          </Button>

          {/* Go to Landing Page Button */}
          <Button
            asChild
            className={`w-full mb-2 text-white text-base font-semibold py-5 ${enableChristmasTheme ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-500 hover:bg-slate-600'}`}
            size="lg"
            variant="default"
          >
            <a href="https://www.droplink.space" target="_blank" rel="noopener noreferrer">
              {enableChristmasTheme ? "🎁 Visit Droplink Landing Page 🎁" : "Visit Droplink Landing Page"}
            </a>
          </Button>

          {/* Droplink Social Button */}
          <Button
            asChild
            className={`w-full mb-2 text-white text-base font-semibold ${enableChristmasTheme ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-600 hover:bg-slate-700'}`}
            size="lg"
            variant="default"
          >
            <a href="/search-users">
              {enableChristmasTheme ? "👥 Droplink Community 👥" : "Droplink Community"}
            </a>
          </Button>

          {/* Download Pi Browser Button */}
          <Button
            asChild
            className={`w-full mb-2 text-white text-base font-semibold ${enableChristmasTheme ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-700 hover:bg-slate-800'}`}
            size="lg"
            variant="default"
          >
            <a href="https://minepi.com/Wain2020" target="_blank" rel="noopener noreferrer">
              {enableChristmasTheme ? "📱 Download Pi Browser 📱" : "Download Pi Browser"}
            </a>
          </Button>

          {/* Ecosystem Overview */}
          <Button
            variant="outline"
            className="w-full text-base font-semibold"
            onClick={() => setShowEcosystemModal(true)}
          >
            Droplink Ecosystem
          </Button>

          <div className={`space-y-2 text-sm text-muted-foreground mt-4 p-3 rounded-lg border ${enableChristmasTheme ? 'bg-sky-50 border-sky-200' : 'bg-slate-100 border-slate-300'}`}>
            <p className="flex items-center gap-2">
              <span className={enableChristmasTheme ? 'text-red-500' : 'text-sky-500'}>
                {enableChristmasTheme ? '🎄' : '✓'}
              </span>
              Create your personalized link-in-bio page
            </p>
            <p className="flex items-center gap-2">
              <span className={enableChristmasTheme ? 'text-red-500' : 'text-sky-500'}>✓</span>
              Sell digital products and accept Pi payments
            </p>
            <p className="flex items-center gap-2">
              <span className={enableChristmasTheme ? 'text-green-500' : 'text-sky-500'}>✓</span>
              Connect all your social media in one place
            </p>
            <p className="flex items-center gap-2">
              <span className={enableChristmasTheme ? 'text-blue-500' : 'text-sky-500'}>✓</span>
              Your data persists across sessions with Pi authentication
            </p>
          </div>

          <div className={`pt-4 border-t space-y-3 p-3 rounded-lg ${enableChristmasTheme ? 'bg-gradient-to-r from-red-50 to-green-50' : 'bg-slate-50'}`}>
            <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold">
              <AboutModal>
                <button className={`hover:underline cursor-pointer ${enableChristmasTheme ? 'text-red-600 hover:text-red-700' : 'text-slate-700 hover:text-slate-800'}`}>
                  {enableChristmasTheme ? '🎄 About' : 'About'}
                </button>
              </AboutModal>
              <span className="text-muted-foreground">•</span>
              <LicenseModal>
                <button className="text-primary hover:underline cursor-pointer">License</button>
              </LicenseModal>
              <span className="text-muted-foreground">•</span>
              <MerchantConfigModal>
                <button className="text-primary hover:underline cursor-pointer">Merchant</button>
              </MerchantConfigModal>
              <span className="text-muted-foreground">•</span>
              <PiDomainModal>
                <button className="text-primary hover:underline cursor-pointer">.pi Domains</button>
              </PiDomainModal>
              <span className="text-muted-foreground">•</span>
              <DropPayModal>
                <button className="text-primary hover:underline cursor-pointer">DropPay</button>
              </DropPayModal>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <a href="/terms" className="text-primary hover:underline">Terms</a>
              <span className="text-muted-foreground">•</span>
              <a href="/privacy" className="text-primary hover:underline">Privacy</a>
              <span className="text-muted-foreground">•</span>
              <a
                href="https://www.droplink.space/help"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Help
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Droplink Ecosystem Modal */}
      <Dialog open={showEcosystemModal} onOpenChange={setShowEcosystemModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>The Droplink Ecosystem for Business & Creators</DialogTitle>
            <DialogDescription>
              Droplink, DropStore, and DropPay combine to move you from exposure to earnings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-sm leading-relaxed">
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold">🔗 Droplink</p>
              <p className="text-muted-foreground">
                Droplink connects your DropStore storefront to the masses, driving traffic, visibility, and real buyers to your products through one powerful link.
              </p>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold">🛒 DropStore</p>
              <p className="text-muted-foreground">Your complete storefront, designed to display and sell:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Physical products</li>
                <li>Digital products</li>
                <li>Online services</li>
              </ul>
              <p className="text-muted-foreground">All in one Pi-powered marketplace.</p>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold">💳 DropPay</p>
              <p className="text-muted-foreground">Handles payments and payouts, allowing you to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Accept Pi payments for your products</li>
                <li>Create checkout links for everything</li>
                <li>Embed Pi payments on your website or widgets</li>
                <li>Automatically receive earnings from your DropStore</li>
                <li>Manage merchant payouts seamlessly</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold">🔁 One Connected Ecosystem</p>
              <p className="text-muted-foreground">These three Pi apps are fully connected, creating a complete business flow:</p>
              <p className="font-medium">Exposure → Selling → Payment → Payout</p>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold">✅ Recommended Usage</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Creators & Influencers → Use Droplink to grow reach</li>
                <li>Sellers & Merchants → Use DropStore to showcase and sell</li>
                <li>Businesses → Use DropPay for secure Pi payments & earnings</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold">💡 Flexible for Your Needs</p>
              <p className="text-muted-foreground">Use one, two, or all three — depending on your business or creator goals.</p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-2 font-semibold">🟢 Modal Footer / CTA</p>
              <p className="font-semibold">Build. Sell. Get Paid. All in Pi.</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:gap-2">
            <Button asChild onClick={() => setShowEcosystemModal(false)}>
              <a href="https://www.droplink.space" target="_blank" rel="noopener noreferrer">Get Started</a>
            </Button>
            <Button asChild variant="outline" onClick={() => setShowEcosystemModal(false)}>
              <a href="https://www.droplink.space/help" target="_blank" rel="noopener noreferrer">Learn More</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PiAuth;