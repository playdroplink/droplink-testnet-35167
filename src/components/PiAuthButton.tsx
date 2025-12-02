import { useState } from "react";
import { PiBrowserModal } from "./PiBrowserModal";
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
    const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handlePiAuth = async () => {
    setLoading(true);
    try {
        await signIn();
        // After successful signIn, verify token with backend
        const accessToken = localStorage.getItem('pi_access_token');
        if (accessToken) {
          const response = await fetch('/verify-pi-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accessToken }),
          });
          const result = await response.json();
          if (result.success) {
            navigate(redirectTo);
          }
        }
    } catch (error) {
        // If not in Pi Browser, show modal
        setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
      <>
        <Button
          onClick={handlePiAuth}
          className={`w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
          disabled={piLoading || loading}
        >
          {children || (piLoading || loading ? "Connecting..." : "Sign in with Pi Network")}
        </Button>
        <PiBrowserModal open={showModal} onClose={() => setShowModal(false)} />
      </>
  );
};
