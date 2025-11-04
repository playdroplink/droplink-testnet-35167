import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveSubscription, PlanType } from "@/hooks/useActiveSubscription";
import { toast } from "sonner";

export const PlanGate = ({
  minPlan,
  children,
}: {
  minPlan: Exclude<PlanType, "free">; // premium or pro
  children: ReactNode;
}) => {
  const navigate = useNavigate();
  const { plan, loading, expiresAt } = useActiveSubscription();

  if (loading) return <div className="text-sm text-muted-foreground">Checking plan…</div>;

  const rank: Record<PlanType, number> = { free: 0, premium: 1, pro: 2 };
  const allowed = rank[plan] >= rank[minPlan];

  if (!allowed) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">This feature requires {minPlan.charAt(0).toUpperCase()+minPlan.slice(1)}</p>
            <p className="text-sm text-muted-foreground">Upgrade to unlock it. Your current plan is {plan}.</p>
          </div>
          <Button
            onClick={() => { toast.info("Upgrade to access this feature"); navigate("/subscription"); }}
          >
            Upgrade
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};