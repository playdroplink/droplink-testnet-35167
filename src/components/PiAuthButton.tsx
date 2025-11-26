import { useState } from "react";
import { usePi } from "@/contexts/PiContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PiAuthButtonProps {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}

export const PiAuthButton = ({ redirectTo = "/dashboard", className = "", children }: PiAuthButtonProps) => {
  const { signIn, loading: piLoading } = usePi();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePiAuth = async () => {
    setLoading(true);
    try {
      await signIn();
      navigate(redirectTo);
    } catch (error) {
      // Optionally show error toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePiAuth}
      className={`w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
      disabled={piLoading || loading}
    >
      {children || (piLoading || loading ? "Connecting..." : "Sign in with Pi Network")}
    </Button>
  );
};
