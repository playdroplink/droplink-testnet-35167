import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePi } from "@/contexts/PiContext";

interface Plan {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "1 link only",
      "1 social link",
      "Pi Ad Network enabled",
      "Droplink watermark",
      "No analytics",
      "No YouTube links",
      "No Pi tips",
    ],
  },
  {
    name: "Premium",
    monthlyPrice: 10,
    yearlyPrice: 100,
    features: [
      "Unlimited links",
      "Unlimited social links",
      "YouTube link support",
      "Pi tips wallet",
      "No watermark",
      "No ads",
      "No analytics",
      "No AI support",
    ],
    popular: true,
  },
  {
    name: "Pro",
    monthlyPrice: 30,
    yearlyPrice: 300,
    features: [
      "Everything in Premium",
      "Full analytics with location data",
      "AI support chatbot",
      "Watch ads for rewards",
      "Priority support",
      "API access",
    ],
  },
];

const Subscription = () => {
  const navigate = useNavigate();
  const { createPayment, piUser, isAuthenticated } = usePi();
  const [loading, setLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>("Free");
  const [subscription, setSubscription] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, [piUser]);

  const loadSubscriptionData = async () => {
    try {
      if (!isAuthenticated || !piUser) {
        console.log("Not authenticated, skipping subscription load");
        return;
      }

      console.log("Loading subscription for Pi user:", piUser.username);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", piUser.username)
        .maybeSingle();

      if (profile) {
        console.log("Profile found:", profile.id);
        setProfileId(profile.id);
        
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub && new Date(sub.end_date) > new Date()) {
          console.log("Active subscription found:", sub.plan_type);
          setSubscription(sub);
          setCurrentPlan(sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1));
        } else {
          console.log("No active subscription, defaulting to Free");
        }
      } else {
        console.log("No profile found for user:", piUser.username);
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };

  const handleSubscribe = async (planName: string, piAmount: number) => {
    if (!isAuthenticated || !piUser) {
      toast.error("Please sign in with Pi Network first");
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      // For free plan, create subscription directly without payment
      if (planName === "Free") {
        // Get or create profile
        let currentProfileId = profileId;
        
        if (!currentProfileId) {
          // Create profile if it doesn't exist
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", piUser.username)
            .maybeSingle();

          if (existingProfile) {
            currentProfileId = existingProfile.id;
          } else {
            // Create profile using edge function
            const { data: functionData, error: functionError } = await supabase.functions.invoke("pi-auth", {
              body: { 
                accessToken: localStorage.getItem("pi_access_token") || "",
                username: piUser.username,
                uid: piUser.uid
              }
            });

            if (functionError || !functionData?.profileId) {
              throw new Error("Failed to create profile");
            }
            currentProfileId = functionData.profileId;
          }
        }

        // Create free subscription
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 100); // Free plan never expires

        const { error: subError } = await supabase
          .from("subscriptions")
          .insert({
            profile_id: currentProfileId,
            plan_type: "free",
            billing_period: "monthly",
            pi_amount: 0,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            status: "active",
            auto_renew: false,
          });

        if (subError) {
          // If subscription already exists, update it
          if (subError.code === "23505") {
            await supabase
              .from("subscriptions")
              .update({
                plan_type: "free",
                status: "active",
                end_date: endDate.toISOString(),
              })
              .eq("profile_id", currentProfileId)
              .eq("plan_type", "free");
          } else {
            throw subError;
          }
        }

        toast.success("Free plan activated! 🎉");
        await loadSubscriptionData();
        navigate("/");
        return;
      }

      // For paid plans, ensure profile exists first
      let currentProfileId = profileId;
      
      if (!currentProfileId) {
        // Create profile if it doesn't exist
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", piUser.username)
          .maybeSingle();

        if (existingProfile) {
          currentProfileId = existingProfile.id;
        } else {
          // Create profile using edge function
          const { data: functionData, error: functionError } = await supabase.functions.invoke("pi-auth", {
            body: { 
              accessToken: localStorage.getItem("pi_access_token") || "",
              username: piUser.username,
              uid: piUser.uid
            }
          });

          if (functionError || !functionData?.profileId) {
            throw new Error("Failed to create profile. Please try again.");
          }
          currentProfileId = functionData.profileId;
        }
      }

      console.log("Initiating Pi payment for", planName, "plan:", piAmount, "Pi");
      toast.info("Opening Pi payment dialog...");
      
      await createPayment(
        piAmount,
        `Droplink ${planName} ${isYearly ? 'Yearly' : 'Monthly'} Subscription`,
        {
          subscriptionPlan: planName.toLowerCase(),
          billingPeriod: isYearly ? 'yearly' : 'monthly',
          profileId: currentProfileId,
        }
      );

      toast.success(`Successfully subscribed to ${planName} plan! 🎉`);
      await loadSubscriptionData();
      navigate("/");
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to process subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Info className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Choose Your Plan</h1>
          </div>
          <p className="text-muted-foreground text-lg mb-2">
            Upgrade your store with powerful features using Pi cryptocurrency
          </p>
          <p className="text-sm text-muted-foreground">
            All prices are in Pi (π) - Pi Network's native cryptocurrency
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <Label htmlFor="billing-toggle" className={!isYearly ? "font-bold" : ""}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className={isYearly ? "font-bold" : ""}>
            Yearly <span className="text-primary">(Save 20%)</span>
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const period = isYearly ? "per year" : "per month";
            const isCurrent = currentPlan === plan.name;

            return (
              <Card 
                key={plan.name} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {price} Pi
                    </span>
                    <span className="text-muted-foreground">/{period}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isCurrent || loading}
                    onClick={() => handleSubscribe(plan.name, price)}
                  >
                    {isCurrent ? "Current Plan" : price === 0 ? "Current Plan" : "Subscribe with Pi"}
                  </Button>
                  
                  {subscription && isCurrent && subscription.end_date && (
                    <p className="text-xs text-center mt-2 text-muted-foreground">
                      Renews on {new Date(subscription.end_date).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground space-y-2">
          <p>All plans include a 14-day money-back guarantee.</p>
          <p>Payments are processed securely through Pi Network blockchain.</p>
          <p>Questions? Contact support@droplink.com</p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;