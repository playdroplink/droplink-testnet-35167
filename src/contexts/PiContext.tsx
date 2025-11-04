import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    Pi: {
      init: (config: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (payment: any) => void
      ) => Promise<{ accessToken: string; user: { uid: string; username: string } }>;
      createPayment: (paymentData: any, callbacks: any) => Promise<any>;
    };
  }
}

interface PiContextType {
  piUser: { uid: string; username: string } | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  createPayment: (amount: number, memo: string, metadata: any) => Promise<unknown>;
}

const PiContext = createContext<PiContextType | undefined>(undefined);

export const PiProvider = ({ children }: { children: ReactNode }) => {
  const [piUser, setPiUser] = useState<{ uid: string; username: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Pi SDK
    if (window.Pi) {
      window.Pi.init({ version: "2.0", sandbox: false });
    }

    // Check for existing session
    const storedUser = localStorage.getItem("pi_user");
    const storedToken = localStorage.getItem("pi_access_token");
    
    if (storedUser && storedToken) {
      setPiUser(JSON.parse(storedUser));
      setAccessToken(storedToken);
    }
    
    setLoading(false);
  }, []);

  const signIn = async () => {
    try {
      if (!window.Pi) {
        toast.error("Pi SDK not loaded. Please open this app in Pi Browser.");
        return;
      }

      setLoading(true);
      const scopes = ["username", "payments"];
      
      const onIncompletePaymentFound = (payment: any) => {
        console.log("Incomplete payment found:", payment);
        toast.info("You have an incomplete payment. Please complete it first.");
      };

      const auth = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
      
      setPiUser(auth.user);
      setAccessToken(auth.accessToken);
      
      // Store in localStorage
      localStorage.setItem("pi_user", JSON.stringify(auth.user));
      localStorage.setItem("pi_access_token", auth.accessToken);

      // Verify and sync with backend
      const { data: functionData, error: functionError } = await supabase.functions.invoke("pi-auth", {
        body: { accessToken: auth.accessToken, username: auth.user.username, uid: auth.user.uid }
      });

      if (functionError) {
        console.error("Backend sync error:", functionError);
        toast.error("Failed to sync with backend");
        return;
      }

      toast.success(`Welcome, ${auth.user.username}!`);
    } catch (error: any) {
      console.error("Pi authentication error:", error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setPiUser(null);
    setAccessToken(null);
    localStorage.removeItem("pi_user");
    localStorage.removeItem("pi_access_token");
    toast.success("Signed out successfully");
  };

  const createPayment = async (amount: number, memo: string, metadata: any) => {
    if (!window.Pi || !piUser || !accessToken) {
      toast.error("Please sign in with Pi to make payments");
      return;
    }

    return new Promise((resolve, reject) => {
      const paymentData = { amount, memo, metadata };
      
      const callbacks = {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log("Payment ready for approval:", paymentId);
          try {
            const { error } = await supabase.functions.invoke("pi-payment-approve", {
              body: { paymentId }
            });
            if (error) throw error;
          } catch (error) {
            console.error("Approval error:", error);
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("Payment ready for completion:", paymentId, txid);
          try {
            const { data, error } = await supabase.functions.invoke("pi-payment-complete", {
              body: { paymentId, txid, metadata }
            });
            if (error) throw error;
            toast.success("Payment completed successfully!");
            resolve(data);
          } catch (error) {
            console.error("Completion error:", error);
            toast.error("Payment completion failed");
            reject(error);
          }
        },
        onCancel: (paymentId: string) => {
          console.log("Payment cancelled:", paymentId);
          toast.info("Payment cancelled");
          reject(new Error("Payment cancelled"));
        },
        onError: (error: Error, payment?: any) => {
          console.error("Payment error:", error, payment);
          toast.error(error.message || "Payment failed");
          reject(error);
        },
      };

      window.Pi.createPayment(paymentData, callbacks);
    });
  };

  const value = {
    piUser,
    accessToken,
    isAuthenticated: !!piUser && !!accessToken,
    loading,
    signIn,
    signOut,
    createPayment,
  };

  return <PiContext.Provider value={value}>{children}</PiContext.Provider>;
};

export const usePi = () => {
  const context = useContext(PiContext);
  if (context === undefined) {
    throw new Error("usePi must be used within a PiProvider");
  }
  return context;
};