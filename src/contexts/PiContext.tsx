import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PI_CONFIG, isPiNetworkAvailable, validatePiConfig, validateMainnetConfig, getDROPTokenBalance, createDROPTrustline } from "@/config/pi-config";

// Pi Network Types
interface PiUser {
  uid: string;
  username?: string;
  wallet_address?: string;
}

interface PiAccount {
  user_id: string;
  pi_username: string;
  display_name: string;
  plan_type: string;
  subscription_status: string;
  wallet_address?: string;
  created_at: string;
  is_primary: boolean;
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

interface AdResult {
  result: 'AD_CLOSED' | 'AD_REWARDED' | 'AD_DISPLAY_ERROR' | 'AD_NETWORK_ERROR' | 'AD_NOT_AVAILABLE' | 'ADS_NOT_SUPPORTED' | 'USER_UNAUTHENTICATED';
}

declare global {
  interface Window {
    Pi: {
      init: (config: { version: string; sandbox?: boolean; }) => Promise<void>;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound?: (payment: any) => void
      ) => Promise<AuthResult>;
      createPayment: (paymentData: PaymentData, callbacks: PaymentCallbacks) => Promise<void>;
      openShareDialog: (title: string, text: string) => Promise<boolean>;
      openUrlInBrowser: (url: string) => Promise<boolean>;
      showRewardedAd: () => Promise<AdResult>;
      showInterstitialAd: () => Promise<AdResult>;
      nativeFeaturesList: () => Promise<string[]>;
      Ads: {
        isAdReady: () => Promise<boolean>;
      };
    };
  }
}

// Pi Context Interface
interface PiContextType {
  // Authentication
  piUser: PiUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  adNetworkSupported: boolean;
  
  // Account Management
  currentAccount: PiAccount | null;
  availableAccounts: PiAccount[];
  currentProfile: any | null;
  
  // Wallet
  currentWallet: WalletInfo | null;
  dropBalance: DropTokenBalance;
  
  // Functions
  signIn: (scopes?: string[]) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Profile Management
  getPiUserProfile: (identifier: string) => Promise<any>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  
  // Account Management Functions
  loadUserAccounts: () => Promise<PiAccount[]>;
  createAccount: (username: string, displayName?: string, paymentId?: string) => Promise<PiAccount>;
  switchAccount: (account: PiAccount) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<boolean>;
  
  // Wallet Functions
  setWalletAddress: (address: string) => Promise<boolean>;
  importWallet: (privateKey: string) => Promise<WalletInfo | null>;
  switchToWallet: (walletInfo: WalletInfo) => void;
  getCurrentWalletAddress: () => string | null;
  
  // Payment Functions
  createPayment: (amount: number, memo: string, metadata?: any) => Promise<string | null>;
  
  // DROP Token Functions
  getDROPBalance: () => Promise<DropTokenBalance>;
  createDROPTrustline: () => Promise<boolean>;
  requestDropTokens: (amount?: number) => Promise<boolean>;
  
  // Ad Functions
  showRewardedAd: () => Promise<boolean>;
  showInterstitialAd: () => Promise<boolean>;
  isAdReady: () => Promise<boolean>;
  
  // Share Functions
  shareContent: (title: string, text: string) => Promise<boolean>;
  openExternalUrl: (url: string) => Promise<boolean>;
}

const PiContext = createContext<PiContextType | undefined>(undefined);

export const PiProvider = ({ children }: { children: ReactNode }) => {
  // Authentication state
  const [piUser, setPiUser] = useState<PiUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [adNetworkSupported, setAdNetworkSupported] = useState<boolean>(false);
  
  // Wallet and token state
  const [dropBalance, setDropBalance] = useState<DropTokenBalance>({ balance: "0", hasTrustline: false });
  const [currentWallet, setCurrentWallet] = useState<WalletInfo | null>(null);
  
  // Multiple account management state
  const [currentAccount, setCurrentAccount] = useState<PiAccount | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<PiAccount[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any | null>(null);
  
  // Derived state: user is authenticated if we have a Pi user and access token
  const isAuthenticated = !!piUser && !!accessToken;

  useEffect(() => {
    const initializePi = async () => {
      try {
        // Validate mainnet configuration first
        if (!validateMainnetConfig()) {
          console.error('Invalid Pi Network mainnet configuration');
          setError('Invalid Pi Network mainnet configuration');
          return;
        }

        console.log('🥧 Initializing Pi Network (Mainnet Mode)...');
        console.log('Network:', PI_CONFIG.NETWORK);
        console.log('Sandbox Mode:', PI_CONFIG.SANDBOX_MODE);

        if (isPiNetworkAvailable()) {
          // Initialize Pi SDK for mainnet using config
          await window.Pi.init(PI_CONFIG.SDK);
          console.log(`✅ Pi SDK initialized successfully (${PI_CONFIG.SANDBOX_MODE ? 'Sandbox' : 'Mainnet'} Mode)`);
          setIsInitialized(true);
          
          // Check ad network support
          try {
            const features = await window.Pi.nativeFeaturesList();
            const adSupported = features.includes('ad_network');
            setAdNetworkSupported(adSupported);
            console.log("🎯 Ad Network Support:", adSupported);
          } catch (err) {
            console.warn('⚠️ Failed to check native features:', err);
          }
          
          // Check for stored authentication
          const storedToken = localStorage.getItem('pi_access_token');
          const storedUser = localStorage.getItem('pi_user');
          
          if (storedToken && storedUser) {
            try {
              // Verify token with Pi API using mainnet config
              const response = await fetch(PI_CONFIG.ENDPOINTS.ME, {
                headers: PI_CONFIG.getAuthHeaders(storedToken)
              });
              
              if (response.ok) {
                const verifiedUser = await response.json();
                const userData = JSON.parse(storedUser);
                setAccessToken(storedToken);
                setPiUser(userData);
                console.log("🔐 Auto-authenticated with stored credentials (Mainnet)");
                
                // Update user data if needed
                if (verifiedUser.uid === userData.uid) {
                  setPiUser({...userData, ...verifiedUser});
                }
              } else {
                // Clear invalid credentials
                localStorage.removeItem('pi_access_token');
                localStorage.removeItem('pi_user');
              }
            } catch (err) {
              console.warn('Failed to verify stored credentials:', err);
              localStorage.removeItem('pi_access_token');
              localStorage.removeItem('pi_user');
            }
          }
        } else {
          console.warn('Pi Network SDK not available - running in compatibility mode');
        }
      } catch (err) {
        console.error('Failed to initialize Pi Network:', err);
        setError('Failed to initialize Pi Network');
      }
    };

    initializePi();
  }, []);

  // Sign In with Pi Network (Mainnet)
  const signIn = async (scopes: string[] = PI_CONFIG.scopes || ['username', 'payments', 'wallet_address']) => {
    if (!isInitialized || !window.Pi) {
      // Try to reinitialize Pi SDK
      toast('Initializing Pi Network connection (Mainnet)...', {
        description: 'Please wait while we connect to Pi Network',
        duration: 3000,
      });
      
      try {
        if (isPiNetworkAvailable()) {
          await window.Pi.init(PI_CONFIG.SDK);
          setIsInitialized(true);
          console.log('✅ Pi SDK reinitialized successfully (Mainnet)');
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
      console.log('🔐 Starting Pi Network authentication (Mainnet)...');
      const authResult = await window.Pi.authenticate(scopes, PI_CONFIG.onIncompletePaymentFound);
      
      // Verify with Pi API (Mainnet)
      console.log('🔍 Verifying authentication with Pi Mainnet API...');
      const response = await fetch(PI_CONFIG.ENDPOINTS.ME, {
        headers: PI_CONFIG.getAuthHeaders(authResult.accessToken)
      });

      if (!response.ok) {
        throw new Error('Mainnet authentication verification failed');
      }

      const verifiedUser = await response.json();
      console.log('✅ Pi mainnet authentication successful:', verifiedUser);
      
      // Use the user data from authentication result
      let finalUser = authResult.user;
      
      // Note: Wallet address will be provided by Pi authentication if user has connected wallet

      // Authenticate with our new Pi auth system
      const { data: dbResult, error } = await (supabase as any).rpc('authenticate_pi_user', {
        p_pi_user_id: finalUser.uid,
        p_pi_username: finalUser.username || `user_${finalUser.uid}`,
        p_access_token: authResult.accessToken,
        p_wallet_address: finalUser.wallet_address || null
      });

      if (error) {
        throw new Error(`Database authentication failed: ${error.message}`);
      }

      if (!dbResult?.success) {
        throw new Error(dbResult?.error || 'Database authentication failed');
      }

      // Store authentication data
      localStorage.setItem('pi_access_token', authResult.accessToken);
      localStorage.setItem('pi_user', JSON.stringify(finalUser));
      
      // Update state
      setAccessToken(authResult.accessToken);
      setPiUser(finalUser);
      
      // Set current profile from database result
      if (dbResult.user_data) {
        setCurrentProfile({
          id: dbResult.user_data.id,
          username: dbResult.user_data.username,
          business_name: dbResult.user_data.business_name,
          pi_user_id: dbResult.user_data.pi_user_id,
          pi_username: dbResult.user_data.pi_username,
          pi_wallet_address: dbResult.user_data.pi_wallet_address,
          pi_wallet_verified: dbResult.user_data.pi_wallet_verified,
          has_premium: dbResult.user_data.has_premium,
          theme_settings: dbResult.user_data.theme_settings,
          created_at: dbResult.user_data.created_at
        });
      }
      
      toast(dbResult.message || `Welcome, ${finalUser.username || 'Pi User'}!`, {
        description: "Authentication Successful (Mainnet)",
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
      localStorage.removeItem('pi_user_extended');
      
      // Reset state
      setPiUser(null);
      setAccessToken(null);
      setCurrentProfile(null);
      setCurrentAccount(null);
      setAvailableAccounts([]);
      setDropBalance({ balance: "0", hasTrustline: false });
      setCurrentWallet(null);
      
      toast("Signed out successfully", {
        description: "You have been signed out of Pi Network",
        duration: 3000,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error("Error signing out", {
        description: "Please try again",
        duration: 3000,
      });
    }
  };

  // Get Pi user profile by username or ID
  const getPiUserProfile = async (identifier: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.eq.${identifier.toLowerCase()},pi_username.eq.${identifier.toLowerCase()},pi_user_id.eq.${identifier},user_id.eq.${identifier}`)
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

  // Check username availability
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      // Use a direct query since the RPC function might not be registered in types
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .or(`username.eq.${username},pi_username.eq.${username}`)
        .limit(1);

      if (error) throw error;

      return !data || data.length === 0;
    } catch (error) {
      console.error('Failed to check username availability:', error);
      return false;
    }
  };

  // Get DROP Token Balance
  const getDROPBalanceFunc = async (): Promise<DropTokenBalance> => {
    if (!isAuthenticated || !piUser?.wallet_address) {
      return { balance: "0", hasTrustline: false };
    }

    try {
      console.log('🪙 Checking DROP token balance for:', piUser.wallet_address);
      
      // Check balance using Stellar Horizon API
      const response = await fetch(
        `${PI_CONFIG.ENDPOINTS.HORIZON}/accounts/${piUser.wallet_address}/balances`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balances');
      }
      
      const data = await response.json();
      
      // Find DROP token in balances
      const dropBalance = data.balances?.find((balance: any) => 
        balance.asset_code === 'DROP' && 
        balance.asset_issuer === PI_CONFIG.DROP_TOKEN.issuer
      );
      
      if (dropBalance) {
        console.log('✅ DROP token balance found:', dropBalance.balance);
        const result = {
          balance: dropBalance.balance,
          hasTrustline: true
        };
        setDropBalance(result);
        return result;
      } else {
        console.log('⚠️ DROP token not found in wallet - no trustline');
        const result = {
          balance: "0",
          hasTrustline: false
        };
        setDropBalance(result);
        return result;
      }
    } catch (error) {
      console.error('❌ Failed to get DROP token balance:', error);
      const result = { balance: "0", hasTrustline: false };
      setDropBalance(result);
      return result;
    }
  };

  // Create DROP Token Trustline
  const createDROPTrustlineFunc = async (): Promise<boolean> => {
    if (!isAuthenticated || !piUser?.wallet_address) {
      toast("Please authenticate with Pi Network first", {
        description: "Authentication Required",
        duration: 5000,
      });
      return false;
    }

    try {
      console.log('🔗 Creating DROP token trustline...');
      
      // Create trustline transaction using Pi Network SDK
      const trustlinePayment = {
        amount: 0.0000001, // Minimum amount to establish trustline
        memo: "DROP Trustline Setup",
        metadata: {
          type: "trustline",
          asset_code: PI_CONFIG.DROP_TOKEN.code,
          asset_issuer: PI_CONFIG.DROP_TOKEN.issuer
        }
      };

      // Use Pi Network payment flow to create trustline
      await window.Pi.createPayment(trustlinePayment, {
        onReadyForServerApproval: (paymentId: string) => {
          console.log('Trustline payment ready for approval:', paymentId);
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          console.log('Trustline transaction completed:', txid);
          toast.success("DROP token trustline created successfully!", {
            description: "You can now receive DROP tokens",
            duration: 5000,
          });
        },
        onCancel: (paymentId: string) => {
          console.log('Trustline payment cancelled:', paymentId);
        },
        onError: (error: Error) => {
          console.error('Trustline payment error:', error);
          throw error;
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to create DROP trustline:', error);
      toast.error("Failed to create DROP token trustline", {
        description: "Please try again later",
        duration: 5000,
      });
      return false;
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
      console.log(`🪙 Requesting ${amount} DROP tokens...`);
      
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

      toast.success(`Received ${amount} DROP tokens!`, {
        description: "Tokens Distributed",
        duration: 5000,
      });

      // Update balance after distribution
      setTimeout(async () => {
        await getDROPBalanceFunc();
      }, 2000);

      return true;
    } catch (error) {
      console.error('❌ Failed to request DROP tokens:', error);
      toast.error("Failed to request DROP tokens", {
        description: "Please try again later",
        duration: 5000,
      });
      return false;
    }
  };

  // Multiple account management functions
  const loadUserAccounts = async (): Promise<PiAccount[]> => {
    if (!piUser?.uid) return [];

    try {
      const { data, error } = await (supabase as any)
        .rpc('get_user_accounts_by_pi_id', {
          pi_user_id_param: piUser.uid
        });

      if (error) throw error;

      if (data?.success && data?.accounts) {
        setAvailableAccounts(data.accounts);
        
        // Set current account if not set
        if (!currentAccount && data.accounts.length > 0) {
          const primaryAccount = data.accounts.find((acc: PiAccount) => acc.is_primary) || data.accounts[0];
          setCurrentAccount(primaryAccount);
        }
        
        return data.accounts;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Failed to load user accounts:', error);
      return [];
    }
  };

  const createAccount = async (username: string, displayName?: string, paymentId?: string): Promise<PiAccount> => {
    if (!piUser?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('Creating account with:', { username, displayName, pi_user_id: piUser.uid });
      
      const { data, error } = await (supabase as any)
        .rpc('create_pi_network_account', {
          pi_username: username,
          pi_user_id: piUser.uid,
          display_name: displayName || username,
          is_additional_account: availableAccounts.length > 0,
          payment_amount: availableAccounts.length > 0 ? 10 : 0
        });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      if (data?.success) {
        // Account created successfully
        const newAccount: PiAccount = {
          user_id: data.user_id,
          pi_username: data.username,
          display_name: data.display_name,
          plan_type: 'free',
          subscription_status: 'active', 
          wallet_address: null,
          created_at: data.created_at,
          is_primary: availableAccounts.length === 0
        };

        // Reload accounts to get updated list
        await loadUserAccounts();
        
        console.log('Account created successfully:', newAccount);
        return newAccount;
      } else {
        console.error('Account creation failed:', data?.error || 'Unknown error');
        throw new Error(data?.error || 'Failed to create account');
      }
      
    } catch (error) {
      console.error('Failed to create account:', error);
      
      // Show user-friendly error message
      if (error.message?.includes('USERNAME_EXISTS')) {
        throw new Error('Username is already taken. Please choose a different username.');
      } else if (error.message?.includes('INSUFFICIENT_PAYMENT')) {
        throw new Error('Additional accounts require a 10 PI payment.');
      } else if (error.message?.includes('INVALID_USERNAME')) {
        throw new Error('Username must be at least 3 characters long.');
      } else {
        throw new Error(error.message || 'Failed to create account');
      }
    }
  };

  const switchAccount = async (account: PiAccount): Promise<void> => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('switch_to_account', {
          pi_user_id_param: piUser?.uid,
          target_username: account.pi_username
        });

      if (error) throw error;

      if (data?.success) {
        setCurrentAccount(account);
        toast(`Switched to account: ${account.display_name}`, {
          duration: 3000,
        });
      } else {
        throw new Error(data?.error || 'Failed to switch account');
      }
    } catch (error) {
      console.error('Failed to switch account:', error);
      toast.error("Failed to switch account", {
        description: "Please try again",
        duration: 3000,
      });
    }
  };

  const deleteAccount = async (accountId: string): Promise<boolean> => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('delete_user_account_completely', {
          user_id_to_delete: accountId
        });

      if (error) throw error;

      if (data?.success) {
        // Remove account from local state
        setAvailableAccounts(prev => prev.filter(acc => acc.user_id !== accountId));
        
        // Switch to primary account if current account was deleted
        if (currentAccount?.user_id === accountId) {
          const primaryAccount = availableAccounts.find(acc => acc.is_primary);
          if (primaryAccount) {
            setCurrentAccount(primaryAccount);
          } else {
            setCurrentAccount(null);
          }
        }
        
        toast.success("Account deleted successfully", {
          description: "All account data has been removed",
          duration: 3000,
        });
        
        return true;
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error("Failed to delete account", {
        description: "Please try again later",
        duration: 5000,
      });
      return false;
    }
  };

  // Load accounts when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadUserAccounts();
    } else {
      setCurrentAccount(null);
      setAvailableAccounts([]);
    }
  }, [isAuthenticated]);

  // Placeholder functions for features not yet implemented
  const setWalletAddress = async (address: string): Promise<boolean> => {
    // Implementation pending
    return true;
  };

  const importWallet = async (privateKey: string): Promise<WalletInfo | null> => {
    // Implementation pending
    return null;
  };

  const switchToWallet = (walletInfo: WalletInfo) => {
    setCurrentWallet(walletInfo);
  };

  const getCurrentWalletAddress = (): string | null => {
    return piUser?.wallet_address || null;
  };

  const createPayment = async (amount: number, memo: string, metadata?: any): Promise<string | null> => {
    // Implementation pending
    return null;
  };

  const showRewardedAd = async (): Promise<boolean> => {
    // Implementation pending
    return false;
  };

  const showInterstitialAd = async (): Promise<boolean> => {
    // Implementation pending
    return false;
  };

  const isAdReady = async (): Promise<boolean> => {
    // Implementation pending
    return false;
  };

  const shareContent = async (title: string, text: string): Promise<boolean> => {
    // Implementation pending
    return false;
  };

  const openExternalUrl = async (url: string): Promise<boolean> => {
    // Implementation pending
    return false;
  };

  const value: PiContextType = {
    piUser,
    accessToken,
    isAuthenticated,
    loading,
    error,
    isInitialized,
    adNetworkSupported,
    currentAccount,
    availableAccounts,
    currentProfile,
    currentWallet,
    dropBalance,
    signIn,
    signOut,
    getPiUserProfile,
    checkUsernameAvailability,
    loadUserAccounts,
    createAccount,
    switchAccount,
    deleteAccount,
    setWalletAddress,
    importWallet,
    switchToWallet,
    getCurrentWalletAddress,
    createPayment,
    getDROPBalance: getDROPBalanceFunc,
    createDROPTrustline: createDROPTrustlineFunc,
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