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
  const navigate = useNavigate();
  const { isAuthenticated, loading, signIn, piUser } = usePi();

  // Email auth state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
    // Email sign in/sign up handler
    const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) {
        toast.error("Please fill in all fields");
        return;
      }
      if (!isLogin && password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      setEmailLoading(true);
      try {
        if (isLogin) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            if (error.message.includes("Invalid login credentials")) {
              toast.error("Invalid email or password");
            } else {
              toast.error(error.message);
            }
            return;
          }
          if (data.user) {
            await ensureProfileExists(data.user);
          }
          toast.success("Welcome back!");
          handlePostAuthRedirect();
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { auth_method: 'email' } }
          });
          if (error) {
            if (error.message.includes("already registered")) {
              toast.error("This email is already registered. Please log in instead.");
              setIsLogin(true);
            } else {
              toast.error(error.message);
            }
            return;
          }
          if (data.user) {
            await ensureProfileExists(data.user);
            toast.success("Account created successfully! Welcome!");
            handlePostAuthRedirect();
          }
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again.");
      } finally {
        setEmailLoading(false);
      }
    };

    // Ensure profile exists for email user
    const ensureProfileExists = async (user) => {
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!existingProfile) {
          const emailUsername = user.email?.split("@")[0] || `user-${user.id.slice(0, 8)}`;
          const sanitizedUsername = emailUsername.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          await supabase.from("profiles").insert({
            user_id: user.id,
            username: sanitizedUsername,
            business_name: sanitizedUsername,
            description: "",
          });
        }
      } catch {}
    };
  

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
      }
      // Post-auth redirect is handled in useEffect
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


          {/* Inline Email Sign In/Sign Up Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={emailLoading}>
              {emailLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? 'Signing In...' : 'Signing Up...'}
                </>
              ) : (
                isLogin ? 'Sign In with Email' : 'Sign Up with Email'
              )}
            </Button>
            <div className="flex justify-between mt-2">
              <button
                type="button"
                className="text-primary hover:underline text-xs"
                onClick={() => setIsLogin(!isLogin)}
                disabled={emailLoading}
              >
                {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
              </button>
            </div>
          </form>


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


          {/* Pi Network Sign In and Info - Always show for all browsers */}
          <>
            <Button 
              onClick={handlePiSignIn} 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Sign in with Pi Network"
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
          </>

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