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
          setLoading(false);
          return;
        }

        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("username", piUser.username)
          .maybeSingle();

        // Check if profile has Gmail or is in VIP list
        const isGmailAdmin = profile?.username?.endsWith('@gmail.com');
        
        if (isGmailAdmin || (profile?.username && vipTeamMembers.includes(profile.username))) {
          setPlan("pro");
          setExpiresAt(null); // No expiration for VIP/Gmail users
          setStatus("active");
          setLoading(false);
          return;
        }

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