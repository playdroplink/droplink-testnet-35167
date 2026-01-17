import { useEffect, useState } from "react";
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
  profileId: string | null;
  refetch: () => Promise<void>;
}

export const useActiveSubscription = (): ActiveSubscription => {
  const { piUser } = usePi();
  const [plan, setPlan] = useState<PlanType>("free");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      
      // If no Pi user, always set to free (mainnet only, no mock)
      if (!piUser?.username) {
        setPlan("free");
        setExpiresAt(null);
        setStatus(null);
        setSubscription(null);
        setProfileId(null);
        setLoading(false);
        return;
      }

      // VIP team members list - these users get all features unlocked without a plan
      const vipTeamMembers = [
        'jomarikun',
        'airdropio2024',
        'flappypi_fun',
        'Wain2020'
      ];

      // Check if user is VIP team member
      if (vipTeamMembers.includes(piUser.username)) {
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
        .select("id, username, subscription_status, has_premium, auth_method")
        .eq("username", piUser.username)
        .maybeSingle();

      // Check if user is admin or has premium status
      const isAdmin = profile?.auth_method === 'email' && (profile?.subscription_status === 'pro' || profile?.has_premium === true);
      const isGmailAdmin = profile?.username?.endsWith('@gmail.com');
      
      if (isAdmin || isGmailAdmin || (profile?.username && vipTeamMembers.includes(profile.username))) {
        setProfileId(profile?.id || null);
        setPlan("pro");
        setExpiresAt(null); // No expiration for admins/VIP/Gmail users
        setStatus("active");
        setSubscription({
          id: isAdmin ? 'admin' : 'vip',
          profile_id: profile?.id || '',
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

      if (!profile?.id) {
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

      if (sub && new Date(sub.end_date) > new Date()) {
        setPlan((sub.plan_type as PlanType) || "free");
        setExpiresAt(new Date(sub.end_date));
        setStatus(sub.status || null);
        setSubscription(sub as Subscription);
      } else {
        setPlan("free");
        setExpiresAt(null);
        setStatus(null);
        setSubscription(null);
      }
    } catch (e) {
      console.error("Failed to load subscription", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [piUser]);

  return { 
    plan, 
    expiresAt, 
    status, 
    loading, 
    subscription,
    isLoading: loading,
    isActive: status === "active" || plan !== "free",
    profileId,
    refetch: load
  };
};