
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveSubscription, PlanType } from "@/hooks/useActiveSubscription";


const planOrder = ["free", "basic", "premium", "pro"];

export const PlanGate = ({
  minPlan,
  children,
  featureName
}: {
  minPlan: PlanType;
  children: ReactNode;
  featureName?: string;
}) => {
  const { plan, loading } = useActiveSubscription();
  const navigate = useNavigate();
  if (loading) return null;
  if (planOrder.indexOf(plan) >= planOrder.indexOf(minPlan)) {
    return <>{children}</>;
  }
  // Locked: show upgrade prompt
  return (
    <Card className="mb-6 border-dashed border-2 border-primary/40 bg-muted/30">
      <CardContent className="py-8 flex flex-col items-center justify-center">
        <div className="text-center mb-4">
          <span className="text-lg font-semibold text-primary">{featureName || "This feature"} is available on {minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} plan</span>
        </div>
        <Button onClick={() => navigate("/subscription")}>Upgrade to {minPlan.charAt(0).toUpperCase() + minPlan.slice(1)}</Button>
      </CardContent>
    </Card>
  );
};