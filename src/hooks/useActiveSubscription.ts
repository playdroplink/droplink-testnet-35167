import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";

export type PlanType = "free" | "basic" | "premium" | "pro";

interface ActiveSubscription {
  plan: PlanType;
  expiresAt: Date | null;
  status: string | null;
  loading: boolean;
  subscription: any | null;
  isLoading: boolean;
  isActive: boolean;
}

export const useActiveSubscription = (): ActiveSubscription => {
  const { piUser } = usePi();
  const [plan, setPlan] = useState<PlanType>("free");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const load = async () => {
      try {
        // If no Pi user, always set to free (mainnet only, no mock)
        if (!piUser?.username) {
          setPlan("free");
          setExpiresAt(null);
          setStatus(null);
          setLoading(false);
          return;
        }

        // Get profile with plan info
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, subscription_plan, subscription_expires_at, subscription_period")
          .eq("username", piUser.username)
          .maybeSingle();

        if (!profile?.id) {
          setLoading(false);
          return;
        }

        // Check for active subscription in subscriptions table
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_type, end_date, status")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub && new Date(sub.end_date) > new Date()) {
          setPlan((sub.plan_type as PlanType) || "free");
          setExpiresAt(new Date(sub.end_date));
          setStatus(sub.status || null);
        } else if (profile.subscription_plan && profile.subscription_plan !== "free" && profile.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()) {
          // Fallback: use plan from profiles table if still valid
          setPlan(profile.subscription_plan as PlanType);
          setExpiresAt(new Date(profile.subscription_expires_at));
          setStatus("active");
        } else {
          setPlan("free");
          setExpiresAt(null);
          setStatus(null);
        }
      } catch (e) {
        console.error("Failed to load subscription", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [piUser]);

  return { 
    plan, 
    expiresAt, 
    status, 
    loading, 
    subscription: null,
    isLoading: loading,
    isActive: status === "active"
  };
};