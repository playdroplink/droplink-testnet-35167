import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import droplinkLogo from "@/assets/droplink-logo.png";

const EmailAuth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        navigate("/");
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!isLogin && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
          return;
        }

        // Create profile if it doesn't exist
        if (data.user) {
          await ensureProfileExists(data.user);
        }
        
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              auth_method: 'email'
            }
          }
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
          // Create profile for new user
          await ensureProfileExists(data.user);
          toast.success("Account created successfully! Please check your email to verify your account.");
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ensureProfileExists = async (user: any) => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile with email username
        const emailUsername = user.email?.split("@")[0] || `user-${user.id.slice(0, 8)}`;
        const sanitizedUsername = emailUsername.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            username: sanitizedUsername,
            business_name: sanitizedUsername,
            description: "",
            email: user.email,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Don't throw - user can still use the app
        }
      }
    } catch (error) {
      console.error("Error ensuring profile exists:", error);
      // Don't throw - user can still use the app
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={droplinkLogo} 
              alt="Droplink" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <CardTitle className="text-2xl flex-1 text-center">Welcome to Droplink</CardTitle>
          </div>
          <CardDescription>
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-input-bg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={isLogin ? undefined : 6}
                className="bg-input-bg"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword("");
                }}
                className="text-sm"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t space-y-2">
            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
            <div className="flex justify-center gap-4 text-xs">
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

export default EmailAuth;

