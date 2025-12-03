import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { usePi } from "@/contexts/PiContext";

export const Auth = () => {
  const navigate = useNavigate();
  const { piUser, isAuthenticated, signIn, loading: piLoading } = usePi();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log("User already authenticated, checking for post-auth actions");
          
          // Check for post-auth actions first
          const handledSpecialAction = await handlePostAuthAction();
          if (!handledSpecialAction) {
            console.log("Redirecting to dashboard");
            navigate("/dashboard", { replace: true });
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    
    checkAuthStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        toast.success("Successfully signed in!");
        
        // Check for post-auth actions first
        const handledSpecialAction = await handlePostAuthAction();
        if (!handledSpecialAction) {
          navigate("/dashboard", { replace: true });
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out, staying on auth page");
        // Clear any remaining state
        localStorage.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Handle post-authentication actions (like following a user or returning to profile)
  const handlePostAuthAction = async () => {
    const authAction = sessionStorage.getItem('authAction');
    const profileToFollow = sessionStorage.getItem('profileToFollow');
    const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth');
    
    if (authAction === 'follow' && profileToFollow) {
      // Clear the session storage
      sessionStorage.removeItem('authAction');
      sessionStorage.removeItem('profileToFollow');
      sessionStorage.removeItem('redirectAfterAuth');
      
      // Navigate to the profile to follow
      toast.success("Successfully signed in! You can now follow this user.");
      navigate(`/${profileToFollow}`, { replace: true });
      return true; // Indicate we handled a special action
    }
    
    // Handle general redirect after auth (like returning to profile page)
    if (redirectAfterAuth && redirectAfterAuth !== '/auth' && redirectAfterAuth !== '/') {
      // Clear the session storage
      sessionStorage.removeItem('redirectAfterAuth');
      sessionStorage.removeItem('authAction');
      
      toast.success("Welcome! You can now access this page.");
      navigate(redirectAfterAuth, { replace: true });
      return true; // Indicate we handled a special action
    }
    
    return false; // No special action needed
  };

  const handlePiAuth = async () => {
    try {
      await signIn();
      toast.success("Successfully authenticated with Pi Network!");
      // Check for post-auth actions first
      const handledSpecialAction = await handlePostAuthAction();
      if (!handledSpecialAction) {
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || "Pi Network authentication failed");
    }
  };

  const handleGoogleAuth = async () => {
    // Temporarily disable Gmail/Email sign-in for production mainnet
    toast.error("Email/Google sign-in is temporarily disabled. Please use Pi Network to sign in.");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email sign-in is disabled in this deployment. Prevent any auth calls.
    toast.error("Email sign-in is disabled. Please use Pi Network authentication.");
    return;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? "Log In" : "Sign Up"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to access your store"
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 pt-0 space-y-4">
            {/* Main Auth Buttons: Socials, Pi Browser, Pi Network */}
            <div className="flex flex-col gap-3">
              <a
                href="https://droplink.space/droplinkofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 flex items-center justify-center rounded-md bg-[#6C47FF] text-white hover:bg-[#4B2FCB] font-medium transition-colors"
                style={{ textDecoration: 'none' }}
              >
                Droplink Socials
              </a>
              <a
                href="https://minepi.com/get"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 flex items-center justify-center rounded-md bg-[#FF8200] text-white hover:bg-[#cc6900] font-medium transition-colors"
                style={{ textDecoration: 'none' }}
              >
                Download Pi Browser
              </a>
              <Button 
                onClick={handlePiAuth}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={piLoading || loading}
              >
                {piLoading ? "Connecting..." : "Sign in with Pi Network"}
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              disabled
            >
              <Mail className="w-4 h-4 mr-2" />
              Email sign-in disabled
            </Button>
            {/* Feature highlights */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>Create your personalized link-in-bio page
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>Sell digital products and accept Pi payments
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>Connect all your social media in one place
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>Your data persists across sessions with Pi authentication
              </p>
            </div>
            {/* Pi Browser notice */}
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-center text-muted-foreground">
                Please open this app in Pi Browser to use Pi authentication.<br/>
                Your Pi username will be used as your unique identifier.
              </p>
              <div className="flex flex-col items-center gap-2">
                <a
                  href="https://minepi.com/get"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block text-center rounded-md bg-[#FF8200] text-white hover:bg-[#cc6900] py-3 font-medium transition-colors"
                  style={{ marginBottom: 8 }}
                >
                  Download Pi Browser
                </a>
                <Button
                  className="w-full block text-center rounded-md bg-[#6C47FF] text-white hover:bg-[#4B2FCB] py-3 font-medium transition-colors"
                  style={{ marginBottom: 8 }}
                  onClick={() => navigate('/droplinkofficial')}
                >
                  Go to Droplink Official
                </Button>
                <div className="flex justify-center gap-4 text-xs">
                  <a href="/terms" className="text-primary hover:underline">Terms</a>
                  <span className="text-muted-foreground">•</span>
                  <a href="/privacy" className="text-primary hover:underline">Privacy</a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Separator for email auth */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Email Authentication
              </span>
            </div>
          </div>

          {/* Email Authentication Form */}
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full" 
              disabled
            >
              <Mail className="w-4 h-4 mr-2" />
              Google sign-in disabled
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Button type="button" className="w-full" onClick={() => toast('Email sign-in disabled; use Pi Network')}>
                Email sign-in disabled
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => window.location.href = '/auth'}>
                Go to Pi Network sign-in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
