
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
  const targetPlanName = minPlan.charAt(0).toUpperCase() + minPlan.slice(1);
  const navigate = useNavigate();
  if (loading) return null;
  if (planOrder.indexOf(plan) >= planOrder.indexOf(minPlan)) {
    return <>{children}</>;
  }
  // Locked: show upgrade prompt
  return (
    <Card className="mb-6 border-2 border-dashed border-sky-200 bg-sky-50 text-sky-900 shadow-md dark:border-sky-700/70 dark:bg-sky-900/40 dark:text-sky-50">
      <CardContent className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
        <div className="text-base font-semibold leading-6">
          {featureName || "This feature"} is available on {targetPlanName} plan
        </div>
        <Button
          onClick={() => navigate("/subscription")}
          className="bg-sky-500 text-white shadow hover:bg-sky-600 dark:bg-sky-500/90 dark:hover:bg-sky-500"
        >
          Upgrade to {targetPlanName}
        </Button>
      </CardContent>
    </Card>
  );
};