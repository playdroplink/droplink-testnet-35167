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
      Ads: {
        requestAd: (adType: "interstitial" | "rewarded") => Promise<{ result: "AD_LOADED" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE" | "ADS_NOT_SUPPORTED" }>;
        showAd: (adType: "interstitial" | "rewarded") => Promise<{ 
          type: "interstitial" | "rewarded";
          result: "AD_CLOSED" | "AD_REWARDED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE" | "ADS_NOT_SUPPORTED" | "USER_UNAUTHENTICATED";
          adId?: string;
        }>;
        isAdReady: (adType: "interstitial" | "rewarded") => Promise<{ ready: boolean }>;
      };
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
  showRewardedAd: () => Promise<boolean>;
  showInterstitialAd: () => Promise<boolean>;
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

  const showRewardedAd = async (): Promise<boolean> => {
    if (!window.Pi) {
      toast.error("Pi SDK not available. Please open in Pi Browser.");
      return false;
    }

    try {
      // Check if ad is ready
      const isReadyResponse = await window.Pi.Ads.isAdReady("rewarded");
      
      if (!isReadyResponse.ready) {
        // Request ad if not ready
        const requestResponse = await window.Pi.Ads.requestAd("rewarded");
        if (requestResponse.result !== "AD_LOADED") {
          toast.error("Ad could not be loaded. Please try again.");
          return false;
        }
      }

      // Show the ad
      const showResponse = await window.Pi.Ads.showAd("rewarded");
      
      if (showResponse.result === "AD_REWARDED") {
        return true;
      } else if (showResponse.result === "AD_CLOSED") {
        toast.info("Please watch the full ad to continue");
        return false;
      } else {
        toast.error("Ad could not be displayed");
        return false;
      }
    } catch (error: any) {
      console.error("Rewarded ad error:", error);
      toast.error(error.message || "Failed to show ad");
      return false;
    }
  };

  const showInterstitialAd = async (): Promise<boolean> => {
    if (!window.Pi) {
      return true; // Allow access if Pi SDK not available
    }

    try {
      const isReadyResponse = await window.Pi.Ads.isAdReady("interstitial");
      
      if (!isReadyResponse.ready) {
        const requestResponse = await window.Pi.Ads.requestAd("interstitial");
        if (requestResponse.result !== "AD_LOADED") {
          return true; // Allow access if ad couldn't load
        }
      }

      await window.Pi.Ads.showAd("interstitial");
      return true;
    } catch (error: any) {
      console.error("Interstitial ad error:", error);
      return true; // Allow access on error
    }
  };

  const value = {
    piUser,
    accessToken,
    isAuthenticated: !!piUser && !!accessToken,
    loading,
    signIn,
    signOut,
    createPayment,
    showRewardedAd,
    showInterstitialAd,
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