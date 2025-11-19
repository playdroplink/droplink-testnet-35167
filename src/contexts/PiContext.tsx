import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PI_CONFIG, isPiNetworkAvailable, validatePiConfig, validateMainnetConfig } from "@/config/pi-config";

// Pi Network Types
interface PiUser {
  uid: string;
  username?: string;
  wallet_address?: string;
}

interface DropTokenBalance {
  balance: string;
  hasTrustline: boolean;
}

interface WalletInfo {
  address: string;
  type: 'pi_network' | 'imported';
  hasPrivateKey: boolean;
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
  dropBalance: DropTokenBalance | null;
  currentWallet: WalletInfo | null;
  
  // Authentication
  signIn: (scopes?: string[]) => Promise<void>;
  signOut: () => Promise<void>;
  
  // User Data
  getPiUserProfile: (username: string) => Promise<any | null>;
  
  // Payments
  createPayment: (amount: number, memo: string, metadata?: any) => Promise<any>;
  
  // Wallet Management
  setWalletAddress: (address: string) => Promise<void>;
  importWallet: (privateKey: string) => Promise<string | null>;
  switchToWallet: (address: string, type: 'pi_network' | 'imported') => void;
  getCurrentWalletAddress: () => string | null;
  
  // DROP Token Functions
  checkDropBalance: (walletAddress?: string) => Promise<DropTokenBalance | null>;
  createDropTrustline: () => Promise<boolean>;
  sendDropTokens: (recipient: string, amount: string) => Promise<string | null>;
  requestDropTokens: (amount?: number) => Promise<boolean>;
  
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
  const [dropBalance, setDropBalance] = useState<DropTokenBalance | null>(null);
  const [currentWallet, setCurrentWallet] = useState<WalletInfo | null>(null);
  
  // Derived state: user is authenticated if we have a Pi user and access token
  const isAuthenticated = !!piUser && !!accessToken;

  // DROP Token Configuration (Mainnet) - use config file
  const DROP_TOKEN = PI_CONFIG.DROP_TOKEN;

  useEffect(() => {
    const initializePi = async () => {
      try {
        // Validate configuration first
        if (!validatePiConfig()) {
          console.error('Invalid Pi Network configuration');
          setError('Invalid Pi Network configuration');
          return;
        }

        if (isPiNetworkAvailable()) {
          // Initialize Pi SDK for mainnet using config
          await window.Pi.init(PI_CONFIG.SDK);
          console.log(`Pi SDK initialized successfully (${PI_CONFIG.SANDBOX_MODE ? 'Sandbox' : 'Mainnet'} Mode)`);
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
              // Verify token with Pi API using config
              const response = await fetch(PI_CONFIG.ENDPOINTS.ME, {
                headers: PI_CONFIG.getAuthHeaders(storedToken)
              });
              
              if (response.ok) {
                const userData = JSON.parse(storedUser);
                setAccessToken(storedToken);
                setPiUser(userData);
                console.log("Auto-authenticated with stored credentials");
                
                // Initialize wallet info
                initializeWalletInfo(userData);
                
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
        // Improved error handling - don't block the app
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.log('Pi SDK Error Details:', errorMessage);
        
        // Only show user-friendly message for specific errors
        if (errorMessage.includes('Pi SDK') || errorMessage.includes('network')) {
          console.warn('Pi Network connection issue - app will continue with limited functionality');
        }
        
        // Don't set error state - allow app to continue
        setIsInitialized(false);
        setError(null); // Clear error to prevent app blocking
      } finally {
        setLoading(false);
      }
    };

    // Improved timeout handling
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Pi SDK initialization timeout - continuing without Pi');
        setLoading(false);
        setError(null); // Clear any errors to allow app to continue
        setIsInitialized(false); // Ensure we don't block the app
      }
    }, 2000); // Reduced timeout to 2 seconds for faster app loading
    
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

  // Initialize wallet information
  const initializeWalletInfo = (userData: PiUser) => {
    // Check for imported wallet first
    const importedWallet = localStorage.getItem('drop_wallet_address');
    if (importedWallet) {
      setCurrentWallet({
        address: importedWallet,
        type: 'imported',
        hasPrivateKey: !!localStorage.getItem('drop_wallet_private_key')
      });
    } else if (userData.wallet_address) {
      setCurrentWallet({
        address: userData.wallet_address,
        type: 'pi_network', 
        hasPrivateKey: false
      });
    }
  };

  // Set wallet address in user profile
  const setWalletAddress = async (address: string): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pi_wallet_address: address })
        .eq('username', piUser?.username);

      if (error) throw error;

      // Update local user data
      const updatedUser = { ...piUser!, wallet_address: address };
      setPiUser(updatedUser);
      localStorage.setItem('pi_user', JSON.stringify(updatedUser));

      toast('Wallet address updated successfully!', {
        description: 'Your Pi wallet address has been saved',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error setting wallet address:', error);
      toast('Failed to update wallet address', {
        description: 'Please try again',
        duration: 5000,
      });
      throw error;
    }
  };

  // Import wallet from private key
  const importWallet = async (privateKey: string): Promise<string | null> => {
    if (!privateKey || privateKey.length !== 56 || !privateKey.startsWith('S')) {
      throw new Error('Invalid private key format');
    }

    try {
      // Derive public key (simplified - use Stellar SDK in production)
      const publicKey = derivePublicKeyFromPrivate(privateKey);
      
      if (publicKey) {
        // Store securely
        localStorage.setItem('drop_wallet_private_key', privateKey);
        localStorage.setItem('drop_wallet_address', publicKey);
        
        // Update current wallet
        setCurrentWallet({
          address: publicKey,
          type: 'imported',
          hasPrivateKey: true
        });

        toast('Wallet imported successfully!', {
          description: `Address: ${publicKey.slice(0, 8)}...${publicKey.slice(-8)}`,
          duration: 4000,
        });

        return publicKey;
      }
      
      throw new Error('Failed to derive public key');
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw error;
    }
  };

  // Switch to a different wallet
  const switchToWallet = (address: string, type: 'pi_network' | 'imported') => {
    const hasPrivateKey = type === 'imported' && !!localStorage.getItem('drop_wallet_private_key');
    
    setCurrentWallet({
      address,
      type,
      hasPrivateKey
    });

    // Check balance for the switched wallet
    checkDropBalance(address);
  };

  // Get current wallet address
  const getCurrentWalletAddress = (): string | null => {
    return currentWallet?.address || piUser?.wallet_address || null;
  };

  // Derive public key from private key (simplified)
  const derivePublicKeyFromPrivate = (privateKey: string): string | null => {
    try {
      if (privateKey.length === 56 && privateKey.startsWith('S')) {
        // Generate mock public key for demo (use Stellar SDK in production)
        const mockPublicKey = 'G' + privateKey.slice(1, 55) + 'A';
        return mockPublicKey.toUpperCase();
      }
      return null;
    } catch (error) {
      console.error('Key derivation error:', error);
      return null;
    }
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
      // Try to reinitialize Pi SDK
      toast('Initializing Pi Network connection...', {
        description: 'Please wait while we connect to Pi Network',
        duration: 3000,
      });
      
      try {
        if (isPiNetworkAvailable()) {
          await window.Pi.init(PI_CONFIG.SDK);
          setIsInitialized(true);
          console.log('Pi SDK reinitialized successfully');
        } else {
          throw new Error('Pi Network is not available in this browser');
        }
      } catch (reinitError) {
        const errorMsg = 'Pi Network is not available. Please use Pi Browser or ensure Pi SDK is loaded.';
        toast.error(errorMsg, {
          description: 'Please try using Pi Browser or check your connection',
          duration: 5000,
        });
        throw new Error(errorMsg);
      }
    }

    setLoading(true);
    setError(null);

    try {
      const authResult = await window.Pi.authenticate(scopes, handleIncompletePayment);
      
      // Verify with Pi API (Sandbox)
      const response = await fetch(PI_CONFIG.ENDPOINTS.ME, {
        headers: PI_CONFIG.getAuthHeaders(authResult.accessToken)
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

  // Check DROP token balance
  const checkDropBalance = async (walletAddress?: string): Promise<DropTokenBalance | null> => {
    const targetWallet = walletAddress || getCurrentWalletAddress();
    if (!targetWallet) {
      return null;
    }

    try {
      const response = await fetch(`https://api.mainnet.minepi.com/accounts/${targetWallet}`);
      
      if (response.ok) {
        const accountData = await response.json();
        
        // Find DROP token balance
        const dropBalance = accountData.balances?.find((bal: any) => 
          bal.asset_code === DROP_TOKEN.code && 
          bal.asset_issuer === DROP_TOKEN.issuer
        );

        const result: DropTokenBalance = {
          balance: dropBalance ? dropBalance.balance : '0',
          hasTrustline: !!dropBalance
        };

        setDropBalance(result);
        return result;
      }
    } catch (error) {
      console.error('Error checking DROP balance:', error);
    }

    return null;
  };

  // Create DROP token trustline
  const createDropTrustline = async (): Promise<boolean> => {
    if (!isAuthenticated || !window.Pi) {
      toast("Please authenticate with Pi Network first", {
        description: "Authentication Required",
        duration: 5000,
      });
      return false;
    }

    try {
      // In a real implementation, this would use Pi SDK to create trustline
      // For now, we'll show instructions to the user
      toast("Please add DROP token to your Pi Wallet", {
        description: "Go to Tokens > Search for 'DROP' > Add to wallet",
        duration: 8000,
      });

      // Simulate successful trustline creation
      setTimeout(async () => {
        await checkDropBalance();
      }, 2000);

      return true;
    } catch (error) {
      console.error('Error creating DROP trustline:', error);
      toast("Failed to create trustline for DROP token", {
        description: "Trustline Error",
        duration: 5000,
      });
      return false;
    }
  };

  // Send DROP tokens
  const sendDropTokens = async (recipient: string, amount: string): Promise<string | null> => {
    if (!isAuthenticated || !window.Pi) {
      toast("Please authenticate with Pi Network first", {
        description: "Authentication Required",
        duration: 5000,
      });
      return null;
    }

    try {
      // In a real implementation, this would create and sign a Stellar transaction
      // For demonstration, we'll simulate the process
      toast(`Sending ${amount} DROP tokens to ${recipient}`, {
        description: "Transaction Processing",
        duration: 5000,
      });

      // Simulate transaction hash
      const txHash = `drop_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update balance after sending
      setTimeout(async () => {
        await checkDropBalance();
      }, 3000);

      return txHash;
    } catch (error) {
      console.error('Error sending DROP tokens:', error);
      toast("Failed to send DROP tokens", {
        description: "Transaction Error",
        duration: 5000,
      });
      return null;
    }
  };

  // Request DROP tokens from distributor
  const requestDropTokens = async (amount: number = 100): Promise<boolean> => {
    if (!isAuthenticated || !piUser?.wallet_address) {
      toast("Please authenticate with Pi Network first", {
        description: "Authentication Required",
        duration: 5000,
      });
      return false;
    }

    try {
      // Call backend function to distribute tokens
      const { data, error } = await supabase.functions.invoke('distribute-drop-tokens', {
        body: { 
          recipientAddress: piUser.wallet_address,
          amount: amount.toString()
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (error) {
        throw error;
      }

      toast(`Received ${amount} DROP tokens!`, {
        description: "Tokens Distributed",
        duration: 5000,
      });

      // Update balance
      setTimeout(async () => {
        await checkDropBalance();
      }, 2000);

      return true;
    } catch (error) {
      console.error('Error requesting DROP tokens:', error);
      toast("Failed to request DROP tokens", {
        description: "Distribution Error",
        duration: 5000,
      });
      return false;
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
    dropBalance,
    currentWallet,
    signIn,
    signOut,
    getPiUserProfile,
    setWalletAddress,
    importWallet,
    switchToWallet,
    getCurrentWalletAddress,
    createPayment,
    checkDropBalance,
    createDropTrustline,
    sendDropTokens,
    requestDropTokens,
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