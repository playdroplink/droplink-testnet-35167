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
    // Email/Gmail sign-in is temporarily disabled. Redirect users to Pi Network auth.
    const timer = setTimeout(() => {
      navigate('/auth');
    }, 1200);
    return () => clearTimeout(timer);
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
          <CardTitle className="text-2xl">Email Sign-In Disabled</CardTitle>
          <CardDescription className="mt-2">For now, email/Gmail sign-in is disabled. Please use Pi Network authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">You will be redirected to Pi Network authentication shortly. If not, click the button below.</p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/auth')} className="flex-1">Go to Pi Sign-In</Button>
            </div>
            <div className="text-xs text-muted-foreground mt-4">
              If you are an admin and need email sign-in re-enabled, update the configuration or contact the developer.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailAuth;

