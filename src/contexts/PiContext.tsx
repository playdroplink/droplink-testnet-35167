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
      
      console.log("Pi Auth - User authenticated:", auth.user.username);
      setPiUser(auth.user);
      setAccessToken(auth.accessToken);
      
      // Store in localStorage
      localStorage.setItem("pi_user", JSON.stringify(auth.user));
      localStorage.setItem("pi_access_token", auth.accessToken);

      console.log("Pi Auth - Syncing with backend...");
      // Verify and sync with backend
      const { data: functionData, error: functionError } = await supabase.functions.invoke("pi-auth", {
        body: { accessToken: auth.accessToken, username: auth.user.username, uid: auth.user.uid }
      });

      if (functionError) {
        console.error("Backend sync error:", functionError);
        // Don't return - allow user to continue even if sync fails
        // Profile will be auto-created on first dashboard load
        toast.warning("Backend sync had issues, but you can continue. Profile will be created automatically.");
      } else {
        console.log("Pi Auth - Backend sync successful");
        if (functionData?.profileId) {
          // Store profile ID in localStorage
          localStorage.setItem(`profile_id_${auth.user.username}`, functionData.profileId);
        }
      }

      toast.success(`Welcome back, @${auth.user.username}! 👋`);
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
            // Get auth token for JWT
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
              throw new Error("Not authenticated");
            }

            const { error } = await supabase.functions.invoke("pi-payment-approve", {
              body: { paymentId },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });
            if (error) throw error;
          } catch (error) {
            console.error("Approval error:", error);
            throw error;
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("Payment ready for completion:", paymentId, txid);
          try {
            // Get auth token for JWT
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
              throw new Error("Not authenticated");
            }

            const { data, error } = await supabase.functions.invoke("pi-payment-complete", {
              body: { paymentId, txid, metadata },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
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

    if (!isAuthenticated || !piUser) {
      toast.error("Please sign in with Pi Network first");
      return false;
    }

    try {
      // Ensure Pi SDK is initialized
      if (!window.Pi.Ads) {
        toast.error("Pi Ads not available. Please ensure you're using Pi Browser.");
        return false;
      }

      // Request ad first (this ensures ad is loaded)
      const requestResponse = await window.Pi.Ads.requestAd("rewarded");
      
      if (requestResponse.result === "AD_NETWORK_ERROR") {
        toast.error("Ad network error. Please try again later.");
        return false;
      }
      
      if (requestResponse.result === "AD_NOT_AVAILABLE") {
        toast.info("No ads available at the moment. Please try again later.");
        return false;
      }
      
      if (requestResponse.result === "ADS_NOT_SUPPORTED") {
        toast.info("Ads are not supported in this environment.");
        return false;
      }
      
      if (requestResponse.result !== "AD_LOADED") {
        toast.error("Ad could not be loaded. Please try again.");
        return false;
      }

      // Wait a bit for ad to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if ad is ready
      const isReadyResponse = await window.Pi.Ads.isAdReady("rewarded");
      if (!isReadyResponse.ready) {
        toast.error("Ad is not ready yet. Please try again.");
        return false;
      }

      // Show the ad
      const showResponse = await window.Pi.Ads.showAd("rewarded");
      
      if (showResponse.result === "AD_REWARDED") {
        toast.success("Thank you for watching! Access granted.");
        return true;
      } else if (showResponse.result === "AD_CLOSED") {
        toast.info("Please watch the full ad to continue");
        return false;
      } else if (showResponse.result === "AD_DISPLAY_ERROR") {
        toast.error("Ad display error. Please try again.");
        return false;
      } else if (showResponse.result === "USER_UNAUTHENTICATED") {
        toast.error("Please sign in with Pi Network");
        return false;
      } else {
        toast.error(`Ad error: ${showResponse.result}`);
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