import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  const [loading, setLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>("Free");
  const [subscription, setSubscription] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub && new Date(sub.end_date) > new Date()) {
          setSubscription(sub);
          setCurrentPlan(sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1));
        }
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };

  const handleSubscribe = async (planName: string, piAmount: number) => {
    if (planName === "Free") {
      toast.info("You're already on the Free plan");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in to subscribe");
        navigate("/auth");
        return;
      }

      if (!profileId) {
        toast.error("Profile not found");
        return;
      }

      const endDate = new Date();
      if (isYearly) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const { error } = await supabase
        .from("subscriptions")
        .insert({
          profile_id: profileId,
          plan_type: planName.toLowerCase(),
          billing_period: isYearly ? "yearly" : "monthly",
          pi_amount: piAmount,
          end_date: endDate.toISOString(),
          status: "active",
        });

      if (error) throw error;

      toast.success(`Subscribed to ${planName} plan! Please send ${piAmount} Pi to complete activation.`);
      await loadSubscriptionData();
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to process subscription");
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