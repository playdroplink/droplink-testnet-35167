// Utility: Robust Pi Browser detection
export function isPiBrowserEnv(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  
  // Method 1: Check for window.Pi object (most reliable)
  if (typeof window.Pi !== 'undefined' && window.Pi !== null) {
    console.log('[PI DEBUG] ✅ Pi Browser detected via window.Pi object');
    return true;
  }
  
  // Method 2: Check userAgent
  const ua = window.navigator.userAgent || '';
  const isPiUA = /PiBrowser|Pi\s?Browser|Pi\s?App|minepi|Pi Network/i.test(ua);
  if (isPiUA) {
    console.log('[PI DEBUG] ✅ Pi Browser detected via userAgent:', ua.substring(0, 100));
    return true;
  }
  
  // Method 3: Check for Pi-specific browser properties
  if ((window.navigator as any).pi !== undefined || (window as any).piApp !== undefined) {
    console.log('[PI DEBUG] ✅ Pi Browser detected via window properties');
    return true;
  }
  
  // Method 4: Check for Pi Browser on mobile with specific indicators
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (isMobile) {
    // On mobile, if we reach here, we're not in Pi Browser
    console.log('[PI DEBUG] ⚠️ Mobile browser detected but NOT Pi Browser:', ua.substring(0, 100));
  }
  
  console.log('[PI DEBUG] ❌ Pi Browser NOT detected. UserAgent:', ua.substring(0, 100));
  return false;
}
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PI_CONFIG, isPiNetworkAvailable, validatePiConfig, validateMainnetConfig, getWalletTokens, getTokenBalance, createTokenTrustline } from "@/config/pi-config";

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
      showRewardedAd?: () => Promise<AdResponse>;
      showInterstitialAd?: () => Promise<AdResponse>;
      Ads?: {
        isAdReady: (adType: 'interstitial' | 'rewarded') => Promise<{ type: string; ready: boolean }>;
        requestAd?: (adType: 'interstitial' | 'rewarded') => Promise<{ type: string; result: string }>;
        showAd?: (adType: 'interstitial' | 'rewarded') => Promise<AdResponse>;
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
  requestDropTokens: (amount?: number, adIds?: string[]) => Promise<boolean>;
  getAllWalletTokens: () => Promise<any[]>;
  refreshDROPDisplay: () => Promise<boolean>;
  
  // Ad Functions
  showRewardedAd: () => Promise<boolean>;
  watchAdsAndClaim: (adsToWatch: number, dropsReward: number) => Promise<boolean>;
  showInterstitialAd: () => Promise<boolean>;
  isAdReady: () => Promise<boolean>;
  
  // Share Functions
  shareContent: (title: string, text: string) => Promise<boolean>;
  openExternalUrl: (url: string) => Promise<boolean>;
}

const PiContext = createContext<PiContextType | undefined>(undefined);

export const PiProvider = ({ children }: { children: ReactNode }) => {
    // Debug: Log Pi Browser detection on load
    useEffect(() => {
      const isPi = isPiBrowserEnv();
      // console.log(`[PiContext] Pi Browser detected:`, isPi, '| UserAgent:', typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A');
    }, []);
  // Authentication state
  const [piUser, setPiUser] = useState<PiUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [adNetworkSupported, setAdNetworkSupported] = useState<boolean>(false);
  
  // Wallet and token state
  const [dropBalance, setDropBalance] = useState<DropTokenBalance>({ balance: "0", hasTrustline: false });
  // For testing: always provide a mock wallet
  const [currentWallet, setCurrentWallet] = useState<WalletInfo | null>({
    address: 'GTESTWALLETADDRESS1234567890',
    type: 'pi_network',
    hasPrivateKey: false
  });
  
  // Multiple account management state
  const [currentAccount, setCurrentAccount] = useState<PiAccount | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<PiAccount[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any | null>(null);
  
  // Set isAuthenticated based on real authentication state
  const isAuthenticated = !!(piUser && accessToken);

  useEffect(() => {
    const initializePi = async () => {
      try {
        console.log('[PI DEBUG] 🥧 Starting Pi Network initialization...');
        
        // Validate mainnet configuration only
        if (!validateMainnetConfig()) {
          console.error('[PI DEBUG] ❌ Invalid Pi Network mainnet configuration');
          setError('Invalid Pi Network mainnet configuration');
          return;
        }

        console.log('[PI DEBUG] ✅ Mainnet configuration validated');
        console.log('[PI DEBUG] 📍 Network:', PI_CONFIG.NETWORK);
        console.log('[PI DEBUG] 🔗 API Endpoint:', PI_CONFIG.BASE_URL);

        const isPi = isPiBrowserEnv();
        console.log('[PI DEBUG] 🔍 isPiBrowserEnv result:', isPi);

        if (isPi) {
          console.log('[PI DEBUG] ✅ We are in Pi Browser environment');
          
          // CRITICAL: Wait for window.Pi to be available
          // The SDK script might need time to load
          let attempts = 0;
          const maxAttempts = 10;
          
          while (typeof window.Pi === 'undefined' && attempts < maxAttempts) {
            console.log(`[PI DEBUG] ⏳ Waiting for window.Pi to load... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
          }
          
          if (typeof window.Pi === 'undefined') {
            console.error('[PI DEBUG] ❌ window.Pi is still undefined after waiting! Pi SDK failed to load.');
            setError('Pi SDK failed to load. Please ensure you are using Pi Browser.');
            return;
          }
          
          console.log('[PI DEBUG] ✅ window.Pi is available, initializing SDK...');
          
          // Initialize Pi SDK using configured SDK options
          try {
            await window.Pi.init(PI_CONFIG.SDK);
            console.log('[PI DEBUG] ✅ Pi SDK initialized successfully (Mainnet)');
            setIsInitialized(true);
          } catch (initErr) {
            console.error('[PI DEBUG] ❌ Failed to initialize Pi SDK:', initErr);
            setError('Failed to initialize Pi SDK');
            return;
          }
          
          // Check ad network support
          try {
            const features = await window.Pi.nativeFeaturesList();
            const adSupported = features.includes('ad_network');
            setAdNetworkSupported(adSupported);
            console.log('[PI DEBUG] 🎯 Ad Network Support:', adSupported);
          } catch (err) {
            console.warn('[PI DEBUG] ⚠️ Failed to check native features:', err);
          }
          
          // Check for stored authentication
          const storedToken = localStorage.getItem('pi_access_token');
          const storedUser = localStorage.getItem('pi_user');
          
          if (storedToken && storedUser) {
            console.log('[PI DEBUG] 🔍 Found stored Pi authentication, verifying...');
            try {
              // Verify token with Pi API using configured endpoint
              const response = await fetch(PI_CONFIG.ENDPOINTS.ME, {
                headers: PI_CONFIG.getAuthHeaders(storedToken)
              });
              
              if (response.ok) {
                const verifiedUser = await response.json();
                const userData = JSON.parse(storedUser);
                setAccessToken(storedToken);
                setPiUser(userData);
                console.log('[PI DEBUG] ✅ Auto-authenticated with stored credentials (Mainnet)');
                
                // Update user data if needed
                if (verifiedUser.uid === userData.uid) {
                  setPiUser({...userData, ...verifiedUser});
                }
              } else {
                console.warn('[PI DEBUG] ⚠️ Stored token verification failed, clearing...');
                localStorage.removeItem('pi_access_token');
                localStorage.removeItem('pi_user');
              }
            } catch (err) {
              console.warn('[PI DEBUG] ⚠️ Failed to verify stored credentials:', err);
              localStorage.removeItem('pi_access_token');
              localStorage.removeItem('pi_user');
            }
          }
        } else {
          console.log('[PI DEBUG] ℹ️ Not in Pi Browser - Pi Network features unavailable');
          // Don't set error for non-Pi Browser - user might use email auth
        }
      } catch (err) {
        console.error('[PI DEBUG] ❌ Unexpected error in Pi Network initialization:', err);
        setError('Failed to initialize Pi Network');
      }
    };
    
    initializePi();
  }, []);

  // Sign In with Pi Network (Mainnet)
  const signIn = async (scopes?: string[]) => {
    // Use scopes from config if not provided
    const requestedScopes = scopes || PI_CONFIG.scopes || ['username'];
    console.log('[PI DEBUG] 🔐 signIn() called with scopes:', requestedScopes);
    
    setLoading(true);
    setError(null);
    
    try {
      // Only allow sign-in in Pi Browser
      if (!isPiBrowserEnv()) {
        const piBrowserUrl = 'https://minepi.com/download';
        const errorMsg = `Pi Network features are only available in the official Pi Browser.\n\nTo sign in, please download and open this app in the Pi Browser.`;
        console.error('[PI DEBUG] ❌ Not in Pi Browser, cannot authenticate');
        toast(
          errorMsg,
          {
            description: `You must use the Pi Browser to sign in.`,
            action: {
              label: 'Download Pi Browser',
              onClick: () => { window.open(piBrowserUrl, '_blank'); },
            },
            duration: 15000,
          }
        );
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[PI DEBUG] ✅ Confirmed we are in Pi Browser');

      // Ensure Pi SDK is initialized
      if (!isInitialized || typeof window.Pi === 'undefined') {
        console.log('[PI DEBUG] ⏳ Pi SDK not initialized, attempting initialization...');
        try {
          // Wait for window.Pi to be available
          let attempts = 0;
          while (typeof window.Pi === 'undefined' && attempts < 10) {
            console.log(`[PI DEBUG] ⏳ Waiting for window.Pi... (${attempts + 1}/10)`);
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
          }
          
          if (typeof window.Pi === 'undefined') {
            throw new Error('window.Pi is not available even after waiting');
          }
          
          console.log('[PI DEBUG] ✅ window.Pi is available, initializing...');
          await window.Pi.init(PI_CONFIG.SDK);
          setIsInitialized(true);
          console.log('[PI DEBUG] ✅ Pi SDK reinitialized successfully (Mainnet)');
        } catch (reinitError: any) {
          const msg = reinitError?.message || String(reinitError);
          console.error('[PI DEBUG] ❌ Failed to initialize Pi SDK:', msg);
          setError('Failed to initialize Pi SDK.');
          setLoading(false);
          throw new Error('Failed to initialize Pi SDK: ' + msg);
        }
      }

      console.log('[PI DEBUG] 🔐 Starting Pi Network authentication (Mainnet)...');
      console.log('[PI DEBUG] 📍 Browser detected:', isPiBrowserEnv());
      console.log('[PI DEBUG] 🔑 Requesting scopes:', requestedScopes.join(', '));

      // Authenticate with Pi Network (with graceful fallback if payments scope not yet approved)
      let authResult: AuthResult | null = null;
      const tryScopes = async (reqScopes: string[]) => {
        console.log('[PI DEBUG] 📝 Requesting Pi scopes:', reqScopes.join(', '));
        if (typeof window.Pi === 'undefined') {
          throw new Error('window.Pi is undefined - SDK not loaded');
        }
        console.log('[PI DEBUG] ⏳ Calling window.Pi.authenticate() with reqScopes:', reqScopes);
        const result = await window.Pi.authenticate(reqScopes, PI_CONFIG.onIncompletePaymentFound);
        console.log('[PI DEBUG] ✅ Pi.authenticate() returned:', result);
        
        // Validate response structure
        if (!result) {
          throw new Error('Pi.authenticate() returned null or undefined');
        }
        if (!result.accessToken) {
          throw new Error('Authentication succeeded but no accessToken in response');
        }
        if (!result.user) {
          throw new Error('Authentication succeeded but no user in response');
        }
        
        return result;
      };

      try {
        console.log('[PI DEBUG] ⏳ Calling Pi.authenticate()...');
        authResult = await tryScopes(requestedScopes);
        console.log('[PI DEBUG] ✅ Pi.authenticate() returned successfully');
        console.log('[PI DEBUG] ✅ authResult received:', {
          hasAccessToken: !!authResult?.accessToken,
          hasUser: !!authResult?.user,
          userId: authResult?.user?.uid
        });
      } catch (authErr: any) {
        const msg = typeof authErr === 'string' ? authErr : (authErr?.message || 'Authentication failed');
        const lowerMsg = String(msg).toLowerCase();
        console.warn('[PI DEBUG] ⚠️ Pi.authenticate() failed with error:', msg);
        console.warn('[PI DEBUG] ⚠️ Full error object:', authErr);
        
        // Only retry with username if we're requesting more than just username
        const looksLikeScopeIssue = (lowerMsg.includes('scope') || lowerMsg.includes('permission') || lowerMsg.includes('payments')) && requestedScopes.length > 1;
        if (looksLikeScopeIssue) {
          console.log('[PI DEBUG] 🔄 Scope issue detected, retrying with username scope only...');
          toast('Permissions not available; signing in with username only.', { duration: 5000 });
          try {
            authResult = await tryScopes(['username']);
            console.log('[PI DEBUG] ✅ Fallback authentication successful');
          } catch (fallbackErr: any) {
            console.error('[PI DEBUG] ❌ Fallback authentication also failed:', fallbackErr);
            throw fallbackErr;
          }
        } else {
          throw authErr;
        }
      }

      // Validate access token with Pi API (Mainnet)
      if (!authResult) {
        console.error('[PI DEBUG] ❌ authResult is null/undefined');
        const err = 'No authentication result received from Pi Network.';
        setError(err);
        throw new Error(err);
      }
      
      const accessToken = authResult.accessToken;
      if (!accessToken) {
        console.error('[PI DEBUG] ❌ No access token in authResult');
        console.error('[PI DEBUG] ❌ authResult structure:', JSON.stringify(authResult));
        const err = 'No access token received from Pi Network.';
        setError(err);
        throw new Error(err);
      }
      console.log('[PI DEBUG] ✅ Access token received:', accessToken.substring(0, 20) + '...');

      // Call Pi API to verify user (use configured endpoint and headers)
      console.log('[PI DEBUG] 🔍 Verifying with Pi API endpoint:', PI_CONFIG.ENDPOINTS.ME);
      const piApiResp = await fetch(PI_CONFIG.ENDPOINTS.ME, {
        headers: PI_CONFIG.getAuthHeaders(accessToken),
      });
      if (!piApiResp.ok) {
        console.error('[PI DEBUG] ❌ Pi API verification failed:', piApiResp.status, piApiResp.statusText);
        const errorBody = await piApiResp.text();
        console.error('[PI DEBUG] ❌ Pi API error body:', errorBody);
        const err = `Failed to validate Pi user with mainnet API: ${piApiResp.status}`;
        setError(err);
        throw new Error(err);
      }
      const piUser = await piApiResp.json();
      console.log('[PI DEBUG] ✅ Pi user verified:', piUser.uid, piUser.username);

      // Save user profile to Supabase
      console.log('[PI DEBUG] 💾 Saving profile to Supabase with RPC call...');
      const { data, error } = await supabase.rpc('authenticate_pi_user', {
        p_pi_user_id: piUser.uid,
        p_pi_username: piUser.username,
        p_access_token: accessToken,
        p_wallet_address: piUser.wallet_address,
      });
      if (error) {
        console.error('[PI DEBUG] ❌ RPC error:', error);
        console.error('[PI DEBUG] ❌ Error code:', error.code);
        console.error('[PI DEBUG] ❌ Error message:', error.message);
        console.error('[PI DEBUG] ❌ Full error:', JSON.stringify(error));
        const err = 'Failed to save Pi user profile to Supabase: ' + (error.message || 'Unknown error');
        setError(err);
        throw new Error(err);
      }
      console.log('[PI DEBUG] ✅ Profile saved successfully');

      // Store access token and user info
      localStorage.setItem('pi_access_token', accessToken);
      localStorage.setItem('pi_user', JSON.stringify(piUser));
      setAccessToken(accessToken);
      setPiUser(piUser);
      setCurrentProfile(data);
      console.log('[PI DEBUG] ✅ Authentication complete! User:', piUser.username);
      setLoading(false);

    } catch (err: any) {
      let errorMessage = 'Authentication failed';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message) || errorMessage;
      }
      console.error('[PI DEBUG] ❌ Authentication error:', errorMessage, err);
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
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

  // Get DROP Token Balance with enhanced detection
  const getDROPBalanceFunc = async (): Promise<DropTokenBalance> => {
    if (!isAuthenticated || !piUser?.wallet_address) {
      return { balance: "0", hasTrustline: false };
    }

    try {
      console.log('🪙 Checking DROP token balance for:', piUser.wallet_address);
      
      // Use enhanced detection from pi-config
      // Get all wallet tokens instead of just looking for DROP
      const allTokens = await getWalletTokens(piUser.wallet_address);
      
      // Log found tokens for debugging
      console.log(`📊 Found ${allTokens.length} tokens in wallet:`, allTokens);
      
      // For backwards compatibility, simulate DROP detection
      const dropData = allTokens.find(token => token.asset_code === 'DROP') || null;
      
      if (dropData && dropData.balance) {
        console.log('✅ DROP token detected:', dropData);
        const result = {
          balance: dropData.balance,
          hasTrustline: dropData.hasTrustline || true,
          source: dropData.source,
          limit: dropData.limit,
          buying_liabilities: dropData.buying_liabilities,
          selling_liabilities: dropData.selling_liabilities
        };
        setDropBalance(result);
        
        // Note: Automatic token display is deprecated for testnet tokens
        if (typeof window !== 'undefined' && window.Pi) {
          console.log(`ℹ️ Token display requires proper ${PI_CONFIG.SANDBOX_MODE ? 'sandbox' : 'mainnet'} token configuration`);
        }
        
        return result;
      } else {
        console.log('⚠️ DROP token not found in wallet - checking if trustline needed');
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

  // Create DROP Token Trustline with enhanced functionality
  const createDROPTrustlineFunc = async (): Promise<boolean> => {
    if (!isAuthenticated || !piUser?.wallet_address) {
      toast("Please authenticate with Pi Network first", {
        description: "Authentication Required",
        duration: 5000,
      });
      return false;
    }

    try {
      console.log('🔗 Creating token trustline...');
      
      // Note: Trustline creation is now generic for any mainnet token
      console.warn('ℹ️ Trustline creation is deprecated for testnet tokens');
      console.warn(`ℹ️ Use createTokenTrustline() for verified ${PI_CONFIG.SANDBOX_MODE ? 'sandbox' : 'mainnet'} tokens`);
      
      // For demo purposes, we'll return false since no specific token is configured
      const success = false;
      
      if (success) {
        toast.success("Token trustline created successfully!", {
          description: "You can now receive custom tokens",
          duration: 5000,
        });
        
        // Refresh balance after trustline creation
        setTimeout(async () => {
          await getDROPBalanceFunc();
        }, 2000);
        
        return true;
      } else {
        throw new Error('Trustline creation failed');
      }
      
    } catch (error) {
      console.error('❌ Failed to create DROP trustline:', error);
      toast.error("Failed to create DROP token trustline", {
        description: "Please try again later",
        duration: 5000,
      });
      return false;
    }
  };

  // Get all wallet tokens (including DROP)
  const getAllWalletTokensFunc = async (): Promise<any[]> => {
    if (!isAuthenticated || !piUser?.wallet_address) {
      return [];
    }

    try {
      console.log('📊 Fetching all wallet tokens...');
      const tokens = await getWalletTokens(piUser.wallet_address);
      
      // Check if DROP token is in the list
      const dropToken = tokens.find(token => token.is_drop_token);
      if (dropToken) {
        console.log('✅ DROP token found in wallet tokens:', dropToken);
        
        // Update DROP balance state
        setDropBalance({
          balance: dropToken.balance,
          hasTrustline: true
        });
      }
      
      return tokens;
    } catch (error) {
      console.error('❌ Failed to get wallet tokens:', error);
      return [];
    }
  };

  // Force refresh DROP token display in Pi wallet
  const refreshDROPDisplay = async (): Promise<boolean> => {
    if (!isAuthenticated || !piUser?.wallet_address) {
      return false;
    }

    try {
      console.log('🔄 Refreshing token display in Pi wallet...');
      
      // First check if token exists
      await getDROPBalanceFunc();
      
      // Note: Automatic token addition is deprecated for testnet tokens
      console.log(`ℹ️ Token display depends on proper ${PI_CONFIG.SANDBOX_MODE ? 'sandbox' : 'mainnet'} token configuration`);
      const added = false; // No tokens configured for mainnet
      
      if (added) {
        toast.success("Token should now be visible in Pi wallet", {
          description: "Check your Pi wallet for custom tokens",
          duration: 5000,
        });
      }
      
      return added;
    } catch (error) {
      console.error('❌ Failed to refresh DROP display:', error);
      return false;
    }
  };

  // Helpers for daily ad limit tracking (local fallback). Server-side enforcement recommended.
  const getTodayKey = () => {
    const d = new Date().toISOString().slice(0, 10);
    return `ad_watch_count_${d}`;
  };

  const getTodaysAdCount = (): number => {
    try {
      const v = localStorage.getItem(getTodayKey()) || '0';
      return parseInt(v, 10) || 0;
    } catch (e) {
      return 0;
    }
  };

  const incrementTodaysAdCount = (n: number = 1) => {
    try {
      const key = getTodayKey();
      const next = getTodaysAdCount() + n;
      localStorage.setItem(key, String(next));
    } catch (e) {
      console.warn('Failed to increment todays ad count', e);
    }
  };

  const getRemainingAdsToday = (): number => {
    const MAX_PER_DAY = 20;
    return Math.max(0, MAX_PER_DAY - getTodaysAdCount());
  };

  // Request DROP tokens from distributor. Accepts optional adIds for server-side dedupe.
  const requestDropTokens = async (amount: number = 100, adIds?: string[]): Promise<boolean> => {
    if (!isAuthenticated || !piUser?.wallet_address) {
      toast("Please authenticate with Pi Network first", {
        description: "Authentication Required",
        duration: 5000,
      });
      return false;
    }

    try {
      console.log(`🪙 Requesting ${amount} DROP tokens...`, { adIds });

      // Call backend function to distribute tokens. Send adIds when available so server can dedupe.
      const invokeBody: any = {
        recipientAddress: piUser.wallet_address,
        amount: amount.toString(),
      };

      if (adIds && adIds.length > 0) invokeBody.adIds = adIds;

      const { data, error } = await supabase.functions.invoke('distribute-drop-tokens', {
        body: invokeBody,
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

    // Enforce production policy: disallow creating additional/dev test accounts when configured
    if (!PI_CONFIG.ALLOW_MULTIPLE_ACCOUNTS && availableAccounts.length > 0) {
      throw new Error(`Creating additional accounts is disabled in this deployment (${PI_CONFIG.SANDBOX_MODE ? 'sandbox' : 'mainnet'} only)`);
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
    return currentWallet?.address || 'GTESTWALLETADDRESS1234567890';
  };

  const createPayment = async (amount: number, memo: string, metadata?: any): Promise<string | null> => {
    if (!isAuthenticated || !window.Pi) {
      throw new Error('User not authenticated');
    }

    const paymentData: PaymentData = {
      amount,
      memo,
      metadata: metadata || {}
    };

    return new Promise<string | null>((resolve) => {
      const callbacks: PaymentCallbacks = {
        onReadyForServerApproval: async (paymentId: string) => {
          try {
            const { error } = await supabase.functions.invoke('pi-payment-approve', {
              body: { paymentId },
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (error) {
              console.error('Payment approval error:', error);
              toast('Payment submitted but approval failed on server.', { description: 'Payment Error', duration: 5000 });
            }
          } catch (err) {
            console.error('Payment approval error:', err);
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          try {
            const { error } = await supabase.functions.invoke('pi-payment-complete', {
              body: { paymentId, txid },
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (error) {
              console.error('Payment completion error:', error);
              toast('Payment was submitted but completion failed.', { description: 'Payment Error', duration: 5000 });
              resolve(null);
            } else {
              toast('Your payment has been completed successfully.', { description: 'Payment Successful', duration: 3000 });
              resolve(txid);
            }
          } catch (err) {
            console.error('Payment completion error:', err);
            resolve(null);
          }
        },
        onCancel: (paymentId: string) => {
          console.log('Payment cancelled:', paymentId);
          toast('The payment was cancelled.', { description: 'Payment Cancelled', duration: 3000 });
          resolve(null);
        },
        onError: (error: Error, payment?: any) => {
          console.error('Payment error:', error, payment);
          toast(error.message || 'An error occurred during payment.', { description: 'Payment Error', duration: 5000 });
          resolve(null);
        }
      };

      try {
        window.Pi.createPayment(paymentData, callbacks);
      } catch (err) {
        console.error('Failed to initiate payment:', err);
        toast('Failed to initiate payment.', { description: 'Payment Error', duration: 5000 });
        resolve(null);
      }
    });
  };

  const showRewardedAd = async (): Promise<boolean> => {
    if ((!window.Pi && !(window as any).Pi) || !adNetworkSupported) {
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
      // Show the ad via Pi SDK (supporting both Ads.showAd and direct showRewardedAd)
      let response: any = null;
      try {
        if ((window as any).Pi && (window as any).Pi.Ads && (window as any).Pi.Ads.showAd) {
          response = await (window as any).Pi.Ads.showAd('rewarded');
        } else if ((window as any).Pi && (window as any).Pi.showRewardedAd) {
          response = await (window as any).Pi.showRewardedAd();
        } else {
          throw new Error('Ad API not available');
        }
      } catch (adErr) {
        console.error('Ad show error:', adErr);
        toast("Failed to show rewarded ad.", { description: "Ad Error", duration: 5000 });
        return false;
      }

      // Normalize adId
      const adId = response?.adId || response?.ad_id || response?.id || null;

      // Prevent duplicate rewards for the same ad id (client-side guard)
      if (adId) {
        try {
          const grantedRaw = localStorage.getItem('ad_rewards_granted') || '[]';
          const granted: string[] = JSON.parse(grantedRaw);
          if (granted.includes(adId)) {
            toast('This ad reward has already been claimed.', { duration: 3000 });
            return false;
          }
        } catch (e) {
          console.warn('Failed to read ad_rewards_granted from localStorage', e);
        }
      }

      if (response?.result === 'AD_REWARDED') {
        // Verify ad claim with backend if possible
        let verified = false;
        try {
          if (adId) {
            const verifyRes = await supabase.functions.invoke('pi-ad-verify', {
              body: { adId },
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const funcErr = (verifyRes as any)?.error;
            const funcData = (verifyRes as any)?.data;
            if (!funcErr && funcData?.mediator_ack_status === 'granted') {
              verified = true;
            }
          } else {
            // No adId available (rare) — allow in sandbox/mock
            const isMock = (window as any).Pi && (window as any).Pi.__isMock;
            if (isMock) verified = true;
          }
        } catch (verifyErr) {
          console.warn('Ad verification failed:', verifyErr);
        }

        // If verified or mock, distribute DROP tokens once
        if (verified) {
          // Double-check local grant and then call distribution
          try {
            if (adId) {
              const grantedRaw = localStorage.getItem('ad_rewards_granted') || '[]';
              const granted: string[] = JSON.parse(grantedRaw);
              if (granted.includes(adId)) {
                toast('This ad reward has already been claimed.', { duration: 3000 });
                return false;
              }
            }

            // Default per-ad reward: 10 DROP tokens; pass adId for server-side dedupe
            const perAdAmount = 10;
            const sent = await requestDropTokens(perAdAmount, adId ? [adId] : undefined);

            if (sent) {
              // Mark adId as granted
              if (adId) {
                try {
                  const grantedRaw = localStorage.getItem('ad_rewards_granted') || '[]';
                  const granted: string[] = JSON.parse(grantedRaw);
                  granted.push(adId);
                  localStorage.setItem('ad_rewards_granted', JSON.stringify(granted));
                } catch (e) {
                  console.warn('Failed to persist ad reward id', e);
                }
              }

              // Increment today's ad counter
              try {
                incrementTodaysAdCount(1);
              } catch (e) {
                console.warn('Failed to increment todays ad counter', e);
              }

              toast('You have been rewarded for watching the ad!', { description: 'Ad Reward Earned', duration: 3000 });
              return true;
            } else {
              toast('Ad watched but failed to distribute reward. Please try again later.', { duration: 4000 });
              return false;
            }
          } catch (err) {
            console.error('Error distributing drop tokens after ad:', err);
            toast('Failed to distribute ad reward.', { duration: 5000 });
            return false;
          }
        }
      }

      return response?.result === 'AD_REWARDED';
    } catch (err) {
      console.error('Error showing rewarded ad:', err);
      toast('Failed to show rewarded ad.', { description: 'Ad Error', duration: 5000 });
      return false;
    }
  };

  // Watch N rewarded ads sequentially and claim package reward
  const watchAdsAndClaim = async (adsToWatch: number, dropsReward: number): Promise<boolean> => {
    if ((!window.Pi && !(window as any).Pi) || !adNetworkSupported) {
      toast('Ad Network not supported on this Pi Browser version.', { duration: 4000 });
      return false;
    }

    if (!isAuthenticated) {
      toast('You must be authenticated to view rewarded ads.', { duration: 4000 });
      return false;
    }

    if (!adsToWatch || adsToWatch < 1) {
      toast('Invalid number of ads to watch.', { duration: 3000 });
      return false;
    }

    const remaining = getRemainingAdsToday();
    if (adsToWatch > remaining) {
      toast(`You can only watch ${remaining} more ads today.`, { duration: 5000 });
      return false;
    }

    const collectedAdIds: string[] = [];

    for (let i = 0; i < adsToWatch; i++) {
      try {
        const start = Date.now();
        let response: any = null;
        try {
          if ((window as any).Pi && (window as any).Pi.Ads && (window as any).Pi.Ads.showAd) {
            response = await (window as any).Pi.Ads.showAd('rewarded');
          } else if ((window as any).Pi && (window as any).Pi.showRewardedAd) {
            response = await (window as any).Pi.showRewardedAd();
          } else {
            throw new Error('Ad API not available');
          }
        } catch (adErr) {
          console.error('Ad show error during package flow:', adErr);
          toast('Failed to show rewarded ad.', { duration: 4000 });
          return false;
        }

        const adId = response?.adId || response?.ad_id || response?.id || null;

        // Enforce minimum watch time (30s)
        const elapsed = Date.now() - start;
        const minMs = 30 * 1000;
        if (elapsed < minMs) {
          try {
            await new Promise(res => setTimeout(res, minMs - elapsed));
          } catch (e) { /* ignore */ }
        }

        if (response?.result !== 'AD_REWARDED') {
          toast('Ad was not rewarded. Try again.', { duration: 4000 });
          return false;
        }

        // Verify each ad via backend
        let verified = false;
        try {
          if (adId) {
            const verifyRes = await supabase.functions.invoke('pi-ad-verify', {
              body: { adId },
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const funcErr = (verifyRes as any)?.error;
            const funcData = (verifyRes as any)?.data;
            if (!funcErr && funcData?.mediator_ack_status === 'granted') {
              verified = true;
            }
          } else {
            const isMock = (window as any).Pi && (window as any).Pi.__isMock;
            if (isMock) verified = true;
          }
        } catch (verifyErr) {
          console.warn('Ad verification failed during package flow:', verifyErr);
        }

        if (!verified) {
          toast('Failed to verify ad watch. Aborting package.', { duration: 5000 });
          return false;
        }

        if (adId) collectedAdIds.push(adId);
      } catch (err) {
        console.error('Error during watchAdsAndClaim flow:', err);
        toast('Error while watching ads. Please try again.', { duration: 5000 });
        return false;
      }
    }

    // Calculate total tokens: configured as 10 DROP tokens per drop unit
    const tokensPerDrop = 10;
    const totalAmount = dropsReward * tokensPerDrop;

    // Send collected adIds to the backend for authoritative dedupe and distribution
    try {
      const distributed = await requestDropTokens(totalAmount, collectedAdIds.length > 0 ? collectedAdIds : undefined);
      if (!distributed) {
        toast('Failed to distribute package reward. Please try again later.', { duration: 5000 });
        return false;
      }

      // Mark all adIds as granted client-side and increment today's counter
      try {
        const grantedRaw = localStorage.getItem('ad_rewards_granted') || '[]';
        const granted: string[] = JSON.parse(grantedRaw);
        for (const id of collectedAdIds) {
          if (!granted.includes(id)) granted.push(id);
        }
        localStorage.setItem('ad_rewards_granted', JSON.stringify(granted));
      } catch (e) {
        console.warn('Failed to persist ad reward ids', e);
      }

      try {
        incrementTodaysAdCount(adsToWatch);
      } catch (e) {
        console.warn('Failed to increment todays ad counter after package distribution', e);
      }

      toast(`Package reward distributed: ${totalAmount} DROP tokens`, { duration: 5000 });
      return true;
    } catch (err) {
      console.error('Failed to distribute package reward:', err);
      toast('Failed to distribute package reward.', { duration: 5000 });
      return false;
    }
  };

  const showInterstitialAd = async (): Promise<boolean> => {
    if ((!window.Pi && !(window as any).Pi) || !adNetworkSupported) {
      toast('Ad Network not supported on this Pi Browser version.', { description: 'Ads Not Supported', duration: 5000 });
      return false;
    }
    try {
      let response: any = null;
      if ((window as any).Pi && (window as any).Pi.Ads && (window as any).Pi.Ads.showAd) {
        response = await (window as any).Pi.Ads.showAd('interstitial');
      } else if ((window as any).Pi && (window as any).Pi.showInterstitialAd) {
        response = await (window as any).Pi.showInterstitialAd();
      } else {
        throw new Error('Ad API not available');
      }
      return response?.result === 'AD_CLOSED';
    } catch (err) {
      console.error('Error showing interstitial ad:', err);
      toast('Failed to show interstitial ad.', { description: 'Ad Error', duration: 5000 });
      return false;
    }
  };

  const isAdReady = async (): Promise<boolean> => {
    if ((!window.Pi && !(window as any).Pi) || !adNetworkSupported) return false;
    try {
      if ((window as any).Pi && (window as any).Pi.Ads && (window as any).Pi.Ads.isAdReady) {
        const res = await (window as any).Pi.Ads.isAdReady('rewarded');
        return !!res?.ready;
      }
      return false;
    } catch (err) {
      console.warn('Error checking ad readiness:', err);
      return false;
    }
  };

  const shareContent = async (title: string, text: string): Promise<boolean> => {
    try {
      if ((window as any).Pi && (window as any).Pi.openShareDialog) {
        (window as any).Pi.openShareDialog(title, text);
        return true;
      }
      toast('Share feature not available.', { description: 'Feature Not Available', duration: 3000 });
      return false;
    } catch (err) {
      console.warn('Share failed:', err);
      return false;
    }
  };

  const openExternalUrl = async (url: string): Promise<boolean> => {
    try {
      if ((window as any).Pi && (window as any).Pi.openUrlInSystemBrowser) {
        await (window as any).Pi.openUrlInSystemBrowser(url);
        return true;
      }
      window.open(url, '_blank');
      return true;
    } catch (err) {
      console.warn('Open external URL failed:', err);
      try {
        window.open(url, '_blank');
        return true;
      } catch (_) {
        return false;
      }
    }
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
    getAllWalletTokens: getAllWalletTokensFunc,
    refreshDROPDisplay,
    showRewardedAd,
    watchAdsAndClaim,
    showInterstitialAd,
    isAdReady,
    shareContent,
    openExternalUrl,
  };



  return (
    <PiContext.Provider value={value}>
      {/* PI DEBUG INFO panel hidden */}
      {children}
    </PiContext.Provider>
  );
};

export const usePi = () => {
  const context = useContext(PiContext);
  if (context === undefined) {
    throw new Error("usePi must be used within a PiProvider");
  }
  return context;
};