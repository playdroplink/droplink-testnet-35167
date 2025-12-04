import { useEffect } from "react";
import { isPiBrowserEnv } from "@/contexts/PiContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePi } from "@/contexts/PiContext";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { supabase } from "@/integrations/supabase/client";
// import EmailAuthForm from "@/components/EmailAuthForm"; // Disabled for Pi-only auth
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AboutModal } from "@/components/AboutModal";
import { PI_CONFIG } from '@/config/pi-config';
import { LicenseModal } from "@/components/LicenseModal";
import { MerchantConfigModal } from "@/components/MerchantConfigModal";
import droplinkLogo from "@/assets/droplink-logo.png";

const PiAuth = () => {
    // Notification state for non-Pi Browser
    const [showPiBrowserNotice, setShowPiBrowserNotice] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading, signIn, piUser } = usePi();


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
      // Use robust Pi Browser detection
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
      const isPi = isPiBrowserEnv() || userAgent.includes('PiBrowser');
      if (!isPi) {
        toast.error("Please use Pi Browser to sign in with Pi Network.");
        setShowPiBrowserNotice(true);
        return;
      }
      await signIn();
      // After sign in, get Supabase session and Pi user
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token && piUser) {
        // Send JWT and Pi user data to backend to save all user data
        await fetch("/api/save-pi-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ piUser })
        });
        // Redirect to dashboard after successful sign in
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
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

    <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {/* Pi Browser Notice */}
        {showPiBrowserNotice && (
          <div className="p-3 mb-4 rounded-lg bg-red-100 border border-red-400 text-red-700 text-sm">
            <b>Pi Browser Required:</b> To sign in with Pi Network, please use the official Pi Browser.<br />
            <a href="https://pi.app/download" target="_blank" rel="noopener noreferrer" className="underline text-blue-700">Download Pi Browser</a>
          </div>
        )}
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={droplinkLogo} 
              alt="Droplink" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Welcome to Droplink</CardTitle>
          <CardDescription>
            Sign in with Pi Network to create your personal page, sell digital products, and accept Pi payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Pi Auth Debug Info */}
          <div className="p-3 mb-4 rounded-lg bg-white/80 border text-xs text-left">
            <div className="font-bold text-blue-700 mb-2">Pi Auth Debug Info</div>
            <div><b>Pi Browser Detected:</b> {piDebug.isPiBrowser ? '✅ Yes' : '❌ No'}</div>
            <div><b>Pi SDK Loaded:</b> {piDebug.piSDKLoaded ? '✅ Yes' : '❌ No'}</div>
            <div><b>User Agent:</b> <span className="break-all">{piDebug.userAgent}</span></div>
            {piDebug.error && (<div className="text-red-600"><b>Error:</b> {String(piDebug.error)}</div>)}
            {(!piDebug.piSDKLoaded) ? (
              <div className="mt-2 p-2 rounded bg-red-100 border border-red-400 text-red-700">
                <b>Warning:</b> Pi SDK is not loaded.<br />
                <b>Checklist:</b>
                <ul className="list-disc ml-4">
                  <li>Make sure you are using <b>Pi Browser</b></li>
                  <li>Check <b>manifest.json</b> for correct Pi app fields</li>
                  <li>Ensure <b>validation-key.txt</b> matches your Pi Developer Portal</li>
                  <li>Confirm Pi SDK script is present in <b>index.html</b></li>
                  <li>Reload the page in Pi Browser</li>
                </ul>
              </div>
            ) : null}
          </div>


          {/* Go to Landing Page Button */}
          <Button
            asChild
            className="w-full mb-2"
            size="lg"
            variant="secondary"
          >
            <a href="https://www.droplink.space" target="_blank" rel="noopener noreferrer">
              Go to Droplink Landing Page
            </a>
          </Button>

          {/* Droplink Social Button */}
          <Button
            asChild
            className="w-full mb-2"
            size="lg"
            variant="secondary"
          >
            <a href="/droplinkofficial">
              Droplink Social
            </a>
          </Button>

          {/* Pi Network Sign In and Info - Only show Pi sign-in */}
          <Button 
            onClick={handlePiSignIn} 
            className="w-full" 
            size="lg"
            disabled={loading || !piDebug.isPiBrowser}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              piDebug.isPiBrowser ? "Sign in with Pi Network" : "Pi Browser Required"
            )}
          </Button>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              Create your personalized link-in-bio page
            </p>
            <p className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              Sell digital products and accept Pi payments
            </p>
            <p className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              Connect all your social media in one place
            </p>
            <p className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              Your data persists across sessions with Pi authentication
            </p>
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-center gap-4 text-xs">
              <AboutModal>
                <button className="text-primary hover:underline cursor-pointer">
                  About
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
              <a href="/terms" className="text-primary hover:underline">Terms</a>
              <span className="text-muted-foreground">•</span>
              <a href="/privacy" className="text-primary hover:underline">Privacy</a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PiAuth;