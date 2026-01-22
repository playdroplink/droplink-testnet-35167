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
        navigate("/auth");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
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
          toast.success("Account created successfully! Welcome!");
          navigate("/auth");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={droplinkLogo} 
              alt="Droplink" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl">{isLogin ? 'Sign In with Email' : 'Sign Up with Email'}</CardTitle>
          <CardDescription className="mt-2">Sign in or sign up with your Gmail/Email account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
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
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? 'Signing In...' : 'Signing Up...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Sign Up'
              )}
            </Button>
            <div className="flex justify-between mt-2">
              <button
                type="button"
                className="text-primary hover:underline text-xs"
                onClick={() => setIsLogin(!isLogin)}
                disabled={loading}
              >
                {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
              </button>
              <button
                type="button"
                className="text-primary hover:underline text-xs"
                onClick={() => navigate('/auth')}
                disabled={loading}
              >
                Use Pi Network
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailAuth;

