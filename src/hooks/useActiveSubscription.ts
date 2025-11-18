import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";

export type PlanType = "free" | "premium" | "pro";

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
  // ALL FEATURES UNLOCKED - RETURN PREMIUM PLAN FOR ALL USERS
  return {
    plan: "premium" as PlanType,
    expiresAt: null, // No expiration
    status: "active",
    loading: false,
    subscription: null,
    isLoading: false,
    isActive: true,
  };
  
  /* Original subscription logic disabled - all features unlocked
  const { piUser } = usePi();
  const [plan, setPlan] = useState<PlanType>("free");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Use Pi username to find profile
        if (!piUser?.username) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", piUser.username)
          .maybeSingle();

        if (!profile?.id) {
          setLoading(false);
          return;
        }

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

  return { plan, expiresAt, status, loading };
  */
};