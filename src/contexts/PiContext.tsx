import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Pi Network Types
interface PiUser {
  uid: string;
  username?: string;
  wallet_address?: string;
}

interface AuthResult {
  accessToken: string;
  user: PiUser;
}

interface PaymentData {
  amount: number;
  memo: string;
  metadata?: Record<string, any>;
}

interface PaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: any) => void;
}

interface AdResponse {
  type: 'interstitial' | 'rewarded';
  result: 'AD_CLOSED' | 'AD_REWARDED' | 'AD_DISPLAY_ERROR' | 'AD_NETWORK_ERROR' | 'AD_NOT_AVAILABLE' | 'ADS_NOT_SUPPORTED' | 'USER_UNAUTHENTICATED';
  adId?: string;
}

declare global {
  interface Window {
    Pi: {
      init: (config: { version: string; sandbox?: boolean }) => Promise<void>;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound?: (payment: any) => void
      ) => Promise<AuthResult>;
      createPayment: (paymentData: PaymentData, callbacks: PaymentCallbacks) => void;
      nativeFeaturesList: () => Promise<string[]>;
      openShareDialog: (title: string, message: string) => void;
      openUrlInSystemBrowser: (url: string) => Promise<void>;
      Ads: {
        isAdReady: (adType: 'interstitial' | 'rewarded') => Promise<{ type: string; ready: boolean }>;
        requestAd: (adType: 'interstitial' | 'rewarded') => Promise<{ type: string; result: string }>;
        showAd: (adType: 'interstitial' | 'rewarded') => Promise<AdResponse>;
      };
    };
  }
}

interface PiContextType {
  piUser: PiUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  isInitialized: boolean;
  adNetworkSupported: boolean;
  error: string | null;
  
  // Authentication
  signIn: (scopes?: string[]) => Promise<void>;
  signOut: () => Promise<void>;
  
  // User Data
  getPiUserProfile: (username: string) => Promise<any | null>;
  
  // Payments  
  createPayment: (amount: number, memo: string, metadata?: any) => Promise<void>;
  
  // Ads
  showRewardedAd: () => Promise<boolean>;
  showInterstitialAd: () => Promise<boolean>;
  isAdReady: (adType: 'interstitial' | 'rewarded') => Promise<boolean>;
  
  // Utilities
  shareContent: (title: string, message: string) => void;
  openExternalUrl: (url: string) => Promise<void>;
}

const PiContext = createContext<PiContextType | undefined>(undefined);

export const PiProvider = ({ children }: { children: ReactNode }) => {
  const [piUser, setPiUser] = useState<PiUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [adNetworkSupported, setAdNetworkSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Derived state: user is authenticated if we have a Pi user and access token
  const isAuthenticated = !!piUser && !!accessToken;

  useEffect(() => {
    const initializePi = async () => {
      try {
        if (typeof window !== 'undefined' && window.Pi) {
          // Initialize Pi SDK for sandbox mode (testing)
          await window.Pi.init({ 
            version: "2.0",
            sandbox: true // Always use sandbox mode
          });
          
          console.log("Pi SDK initialized successfully (Sandbox Mode Enabled)");
          setIsInitialized(true);
          
          // Check ad network support
          try {
            const features = await window.Pi.nativeFeaturesList();
            const adSupported = features.includes('ad_network');
            setAdNetworkSupported(adSupported);
            console.log("Ad Network Support:", adSupported);
          } catch (err) {
            console.warn('Failed to check native features:', err);
          }
          
          // Check for stored authentication
          const storedToken = localStorage.getItem('pi_access_token');
          const storedUser = localStorage.getItem('pi_user');
          
          if (storedToken && storedUser) {
            try {
              // Verify token with Pi API
              const response = await fetch('https://api.minepi.com/v2/me', {
                headers: {
                  'Authorization': `Bearer ${storedToken}`
                }
              });
              
              if (response.ok) {
                const userData = JSON.parse(storedUser);
                setAccessToken(storedToken);
                setPiUser(userData);
                console.log("Auto-authenticated with stored credentials");
                
                // Sync user data with Supabase
                await syncExistingPiUser();
              } else {
                // Token invalid, clear storage
                localStorage.removeItem('pi_access_token');
                localStorage.removeItem('pi_user');
              }
            } catch (err) {
              console.warn('Failed to verify stored token:', err);
            }
          }
        } else {
          console.warn("Pi SDK not available - loading script...");
          // Load Pi SDK dynamically
          const script = document.createElement('script');
          script.src = 'https://sdk.minepi.com/pi-sdk.js';
          script.async = true;
          script.onload = () => {
            console.log("Pi SDK script loaded");
            // Retry initialization after script loads
            setTimeout(initializePi, 1000);
          };
          document.head.appendChild(script);
        }
      } catch (err) {
        console.error('Failed to initialize Pi SDK:', err);
        // Don't set error in development to avoid blocking app
        if (process.env.NODE_ENV !== 'development') {
          setError('Failed to initialize Pi Network SDK');
        }
      } finally {
        setLoading(false);
      }
    };

    // In development, add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Pi SDK initialization timeout - continuing without Pi');
        setLoading(false);
        setError(null); // Clear any errors to allow app to continue
      }
    }, 2000); // Reduced timeout to 2 seconds
    
    initializePi().finally(() => clearTimeout(timeout));
  }, []);

  // Handle incomplete payments
  const handleIncompletePayment = (payment: any) => {
    console.log('Incomplete payment found:', payment);
    toast("You have an incomplete payment. Please complete it before making a new payment.", {
      description: "Incomplete Payment",
      duration: 5000,
    });
  };

  // Save user data to Supabaserom Supabase
  const getPiUserProfile = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (error) {
        console.error('Failed to get Pi user profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception getting Pi user profile:', err);
      return null;
    }
  };

  // Check and sync existing Pi user with Supabase
  const syncExistingPiUser = async () => {
    const storedToken = localStorage.getItem('pi_access_token');
    const storedUser = localStorage.getItem('pi_user');
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('🔄 Syncing existing Pi user with Supabase:', userData.username);
        
        // Check if user data is already synced recently
        const extendedUserData = localStorage.getItem('pi_user_extended');
        if (extendedUserData) {
          const parsed = JSON.parse(extendedUserData);
          const lastSynced = new Date(parsed.lastSynced);
          const now = new Date();
          const hoursSinceSync = (now.getTime() - lastSynced.getTime()) / (1000 * 60 * 60);
          
          // If synced within last 24 hours, skip re-sync
          if (hoursSinceSync < 24) {
            console.log('✅ Pi user data recently synced, skipping');
            return;
          }
        }
        
        // Re-sync user data
        await saveUserToSupabase(userData, storedToken);
      } catch (err) {
        console.error('Failed to sync existing Pi user:', err);
      }
    }
  };

  // Save user data to Supabase
  const saveUserToSupabase = async (piUser: PiUser, token: string) => {
    try {
      console.log('💾 Saving Pi user to Supabase:', { username: piUser.username, uid: piUser.uid });
      
      const { data, error } = await supabase.functions.invoke('pi-auth', {
        body: {
          accessToken: token,
          username: piUser.username,
          uid: piUser.uid,
          wallet_address: piUser.wallet_address
        }
      });

      if (error) {
        console.error('❌ Failed to save Pi user to Supabase:', error);
        toast('Warning: User data not saved to database', {
          description: 'You may need to re-authenticate later',
          duration: 5000,
        });
      } else {
        console.log('✅ Pi user saved to Supabase successfully:', data);
        
        // Store additional metadata locally
        const userData = {
          ...piUser,
          profileId: data?.profileId,
          supabaseUserId: data?.userId,
          isNewProfile: data?.isNewProfile,
          lastSynced: new Date().toISOString()
        };
        localStorage.setItem('pi_user_extended', JSON.stringify(userData));
        
        if (data?.isNewProfile) {
          toast('Profile created successfully!', {
            description: 'Your Pi Network account is now linked to Droplink',
            duration: 4000,
          });
        }
      }
    } catch (err) {
      console.error('❌ Exception saving Pi user to Supabase:', err);
      toast('Warning: Could not sync user data', {
        description: 'Please check your internet connection',
        duration: 5000,
      });
    }
  };

  // Sign In with Pi Network
  const signIn = async (scopes: string[] = ['username', 'payments', 'wallet_address']) => {
    if (!isInitialized || !window.Pi) {
      throw new Error('Pi SDK not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const authResult = await window.Pi.authenticate(scopes, handleIncompletePayment);
      
      // Verify with Pi API
      const response = await fetch('https://api.minepi.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${authResult.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Authentication verification failed');
      }

      const verifiedUser = await response.json();
      console.log('Pi authentication successful:', verifiedUser);
      
      // Store authentication data
      localStorage.setItem('pi_access_token', authResult.accessToken);
      localStorage.setItem('pi_user', JSON.stringify(authResult.user));
      
      // Update state
      setAccessToken(authResult.accessToken);
      setPiUser(authResult.user);
      
      // Save to Supabase
      await saveUserToSupabase(authResult.user, authResult.accessToken);
      
      toast(`Welcome, ${authResult.user.username || 'Pi User'}!`, {
        description: "Authentication Successful",
        duration: 3000,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('Pi authentication failed:', err);
      toast(errorMessage, {
        description: "Authentication Failed",
        duration: 5000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      // Clear Pi Network authentication
      localStorage.removeItem('pi_access_token');
      localStorage.removeItem('pi_user');
      localStorage.removeItem('pi_user_extended'); // Clear extended user data
      setAccessToken(null);
      setPiUser(null);
      
      // Clear Supabase authentication (for Gmail/email users)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
        // Still proceed with logout even if Supabase logout fails
      }
      
      // Clear any additional local storage items
      localStorage.removeItem('supabase.auth.token');
      
      toast("You have been signed out successfully.", {
        description: "Signed Out",
        duration: 3000,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast("Signed out (with some errors)", {
        description: "Please refresh if issues persist",
        duration: 3000,
      });
    }
  };

  // Create Payment
  const createPayment = async (amount: number, memo: string, metadata: any = {}) => {
    if (!isAuthenticated || !window.Pi) {
      throw new Error('User not authenticated');
    }

    const paymentData: PaymentData = {
      amount,
      memo,
      metadata
    };

    const callbacks: PaymentCallbacks = {
      onReadyForServerApproval: async (paymentId: string) => {
        console.log('Payment ready for server approval:', paymentId);
        try {
          const { error } = await supabase.functions.invoke('pi-payment-approve', {
            body: { paymentId },
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (error) {
            console.error('Payment approval error:', error);
          }
        } catch (err) {
          console.error('Payment approval error:', err);
        }
      },
      
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        console.log('Payment ready for server completion:', paymentId, txid);
        try {
          const { error } = await supabase.functions.invoke('pi-payment-complete', {
            body: { paymentId, txid },
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (error) {
            console.error('Payment completion error:', error);
            toast("Payment was submitted but completion failed.", {
              description: "Payment Error",
              duration: 5000,
            });
          } else {
            toast("Your payment has been completed successfully.", {
              description: "Payment Successful",
              duration: 3000,
            });
          }
        } catch (err) {
          console.error('Payment completion error:', err);
        }
      },
      
      onCancel: (paymentId: string) => {
        console.log('Payment cancelled:', paymentId);
        toast("The payment was cancelled.", {
          description: "Payment Cancelled",
          duration: 3000,
        });
      },
      
      onError: (error: Error, payment?: any) => {
        console.error('Payment error:', error, payment);
        toast(error.message || "An error occurred during payment.", {
          description: "Payment Error", 
          duration: 5000,
        });
      },
    };

    window.Pi.createPayment(paymentData, callbacks);
  };

  // Check if ad is ready
  const isAdReady = async (adType: 'interstitial' | 'rewarded'): Promise<boolean> => {
    if (!window.Pi || !adNetworkSupported) return false;
    
    try {
      const response = await window.Pi.Ads.isAdReady(adType);
      return response.ready;
    } catch (err) {
      console.error('Error checking ad readiness:', err);
      return false;
    }
  };

  // Show Rewarded Ad
  const showRewardedAd = async (): Promise<boolean> => {
    if (!window.Pi || !adNetworkSupported) {
      toast("Ad Network not supported on this Pi Browser version.", {
        description: "Ads Not Supported",
        duration: 5000,
      });
      return false;
    }

    if (!isAuthenticated) {
      toast("You must be authenticated to view rewarded ads.", {
        description: "Authentication Required",
        duration: 5000,
      });
      return false;
    }

    try {
      const response = await window.Pi.Ads.showAd('rewarded');
      
      if (response.result === 'AD_REWARDED' && response.adId) {
        try {
          // Verify ad status with Pi Platform API
          const { data, error } = await supabase.functions.invoke('pi-ad-verify', {
            body: { adId: response.adId },
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (!error && data?.mediator_ack_status === 'granted') {
            toast("You have been rewarded for watching the ad!", {
              description: "Ad Reward Earned",
              duration: 3000,
            });
            return true;
          }
        } catch (err) {
          console.error('Ad verification error:', err);
        }
      }
      
      return response.result === 'AD_REWARDED';
    } catch (err) {
      console.error('Error showing rewarded ad:', err);
      toast("Failed to show rewarded ad.", {
        description: "Ad Error",
        duration: 5000,
      });
      return false;
    }
  };

  // Show Interstitial Ad
  const showInterstitialAd = async (): Promise<boolean> => {
    if (!window.Pi || !adNetworkSupported) {
      toast("Ad Network not supported on this Pi Browser version.", {
        description: "Ads Not Supported",
        duration: 5000,
      });
      return false;
    }

    try {
      const response = await window.Pi.Ads.showAd('interstitial');
      return response.result === 'AD_CLOSED';
    } catch (err) {
      console.error('Error showing interstitial ad:', err);
      toast("Failed to show interstitial ad.", {
        description: "Ad Error",
        duration: 5000,
      });
      return false;
    }
  };

  // Share content
  const shareContent = (title: string, message: string) => {
    if (window.Pi) {
      window.Pi.openShareDialog(title, message);
    } else {
      toast("Share feature not available.", {
        description: "Feature Not Available",
        duration: 3000,
      });
    }
  };

  // Open external URL
  const openExternalUrl = async (url: string): Promise<void> => {
    if (window.Pi) {
      try {
        await window.Pi.openUrlInSystemBrowser(url);
      } catch (err) {
        console.error('Error opening external URL:', err);
        // Fallback to window.open
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const value: PiContextType = {
    piUser,
    accessToken,
    isAuthenticated,
    loading,
    isInitialized,
    adNetworkSupported,
    error,
    signIn,
    signOut,
    getPiUserProfile,
    createPayment,
    showRewardedAd,
    showInterstitialAd,
    isAdReady,
    shareContent,
    openExternalUrl,
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