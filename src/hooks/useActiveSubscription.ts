import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";

export type PlanType = "free" | "basic" | "premium" | "pro";

interface Subscription {
  id: string;
  profile_id: string;
  plan_type: string;
  billing_period: string;
  end_date: string;
  start_date: string;
  status: string;
  pi_amount: number;
  auto_renew: boolean;
}

interface ActiveSubscription {
  plan: PlanType;
  expiresAt: Date | null;
  status: string | null;
  loading: boolean;
  subscription: Subscription | null;
  isLoading: boolean;
  isActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysLeft: number | null;
  profileId: string | null;
  refetch: () => Promise<void>;
}

// VIP team members who get full access
const VIP_TEAM_MEMBERS = [
  'jomarikun',
  'airdropio2024',
  'flappypi_fun',
  'Wain2020',
  'wainfoundation',
  'dropshare',
  'flappypiofficial',
  'openapp'
];

export const useActiveSubscription = (): ActiveSubscription => {
  const { piUser } = usePi();
  const [plan, setPlan] = useState<PlanType>("free");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      // If no Pi user, always set to free
      if (!piUser?.username) {
        setPlan("free");
        setExpiresAt(null);
        setStatus(null);
        setSubscription(null);
        setProfileId(null);
        setLoading(false);
        return;
      }

      // Check if user is VIP team member - they get lifetime pro access
      if (VIP_TEAM_MEMBERS.includes(piUser.username)) {
        setPlan("pro");
        setExpiresAt(null); // No expiration for VIP team
        setStatus("active");
        setSubscription({
          id: 'vip',
          profile_id: '',
          plan_type: 'pro',
          billing_period: 'lifetime',
          end_date: '',
          start_date: new Date().toISOString(),
          status: 'active',
          pi_amount: 0,
          auto_renew: false
        });
        setLoading(false);
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, has_premium")
        .eq("username", piUser.username)
        .maybeSingle();

      if (!profile?.id) {
        setPlan("free");
        setLoading(false);
        return;
      }

      setProfileId(profile.id);

      // Check for active subscription in subscriptions table
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        const endDate = new Date(sub.end_date);
        const now = new Date();
        const isExpired = endDate < now;
        
        if (isExpired) {
          // Subscription expired - downgrade to free
          setPlan("free");
          setExpiresAt(endDate);
          setStatus("expired");
          setSubscription({
            ...sub,
            status: "expired"
          } as Subscription);
        } else {
          // Active subscription
          setPlan((sub.plan_type as PlanType) || "free");
          setExpiresAt(endDate);
          setStatus(sub.status || "active");
          setSubscription(sub as Subscription);
        }
      } else {
        // No subscription record - free plan
        setPlan("free");
        setExpiresAt(null);
        setStatus(null);
        setSubscription(null);
      }
    } catch (e) {
      console.error("Failed to load subscription", e);
      setPlan("free");
    } finally {
      setLoading(false);
    }
  }, [piUser?.username]);

  useEffect(() => {
    load();
  }, [load]);

  // Calculate derived states
  const now = new Date();
  const isExpired = expiresAt ? expiresAt < now : false;
  const daysLeft = expiresAt 
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
  
  // isActive means user has a valid, non-expired paid plan
  const isActive = !isExpired && plan !== "free" && status === "active";

  return { 
    plan: isExpired ? "free" : plan, // Return effective plan (downgraded if expired)
    expiresAt, 
    status: isExpired ? "expired" : status, 
    loading, 
    subscription,
    isLoading: loading,
    isActive,
    isExpired,
    isExpiringSoon,
    daysLeft,
    profileId,
    refetch: load
  };
};