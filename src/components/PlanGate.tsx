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
  // Always allow access to children, regardless of plan
  return <>{children}</>;
};