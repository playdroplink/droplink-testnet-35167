// Pi Network Configuration (Mainnet Production)
export const PI_CONFIG = {
  // Mainnet Configuration
  API_KEY: "96tnxytg82pevnvvxfowap4bwctcxo6wkp2dexoraevtj8svh0mvqxttpbtwvjm5",
  // For testing you can enable sandbox mode. When sandbox is true the SDK
  // and endpoints will use Pi's sandbox/test endpoints. Toggle as needed.
  BASE_URL: "https://api.sandbox.minepi.com",
  NETWORK: "sandbox",
  NETWORK_PASSPHRASE: "Pi Network", // Mainnet passphrase
  SANDBOX_MODE: true,
  // Production policy: disallow creating extra/dev test accounts on mainnet
  ALLOW_MULTIPLE_ACCOUNTS: false,
  
  // SDK Configuration
  SDK: {
    version: "2.0",
    sandbox: true,
  },
  
  // Scopes for authentication (include wallet_address for token detection)
  scopes: ['username', 'payments', 'wallet_address', 'openid'],
  
  // Payment callback handlers
  onIncompletePaymentFound: (payment: any) => {
    console.log('Incomplete payment found:', payment);
    // Handle incomplete payment
  },
  
  // IMPORTANT: DROP Token Configuration Removed
  // The previous DROP token configuration was for testnet only.
  // For mainnet tokens, they must be:
  // 1. Properly issued on Pi Mainnet (not testnet)
  // 2. Have valid home domain and pi.toml file
  // 3. Be verified by Pi Network servers
  // 4. Follow Pi Network token standards
  
  // Token Detection Configuration
  CUSTOM_TOKENS: {
    // Example structure for detecting custom tokens
    // Replace with actual mainnet tokens when available
    example: {
      code: "EXAMPLE",
      issuer: "EXAMPLE_ISSUER_ADDRESS",
      name: "Example Token",
      home_domain: "example.com"
    }
  },
  
  // Validation
  VALIDATION_KEY: "7511661aac4538b1832d2c9ba117f6d972b26a54640598d3fbb9824013c7079203f65b02d125be3f418605cfb89ba0e4443e3ec997e3800eb464df0bc5410d2a",
  
  // Platform URLs
  PLATFORM_URL: "https://droplink.space",
  MAINNET_URL: "https://droplink.space",
  
  // Headers for API requests
  getAuthHeaders: (accessToken: string) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }),
  
  // Mainnet endpoints
  ENDPOINTS: {
    ME: "https://api.sandbox.minepi.com/v2/me",
    WALLETS: "https://api.sandbox.minepi.com/v2/wallets",
    TRANSACTIONS: "https://api.sandbox.minepi.com/v2/transactions",
    PAYMENTS: "https://api.sandbox.minepi.com/v2/payments",
    OPERATIONS: "https://api.sandbox.minepi.com/v2/operations",
    LEDGERS: "https://api.sandbox.minepi.com/v2/ledgers",
    EFFECTS: "https://api.sandbox.minepi.com/v2/effects",
    FEE_STATS: "https://api.sandbox.minepi.com/v2/fee_stats",
    // Pi Blockchain endpoints
    PI_BLOCKCHAIN: "https://api.sandbox.minepi.com/v2/blockchain",
    PI_ASSETS: "https://api.sandbox.minepi.com/v2/assets",
    PI_ACCOUNT_BALANCES: "https://api.sandbox.minepi.com/v2/accounts",
    // Stellar Horizon endpoints for mainnet token detection
    HORIZON: "https://horizon.stellar.org",
    // Pi Network specific asset discovery
    PI_ASSET_DISCOVERY: "https://api.sandbox.minepi.com/v2/assets"
  }
};

// Helper to check if Pi Network is available
export const isPiNetworkAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.Pi !== 'undefined' &&
         window.Pi !== null;
};

// Helper to validate Pi configuration
export const validatePiConfig = (): boolean => {
  return PI_CONFIG.API_KEY.length > 0 &&
         PI_CONFIG.VALIDATION_KEY.length > 0 &&
         (PI_CONFIG.NETWORK === "sandbox" || PI_CONFIG.NETWORK === "mainnet");
};

// Helper to validate mainnet configuration
export const validateMainnetConfig = (): boolean => {
  return PI_CONFIG.NETWORK === "mainnet" &&
         !PI_CONFIG.SANDBOX_MODE &&
         PI_CONFIG.BASE_URL.includes("mainnet") &&
         validatePiConfig();
};

// Enhanced Pi Network token detection for mainnet
export const getWalletTokens = async (walletAddress: string): Promise<any[]> => {
  try {
    console.log('🔍 Detecting Pi Network tokens for wallet:', walletAddress);
    
    // Try multiple detection methods for mainnet
    const detectionMethods = [
      detectViaPiMainnetAPI,
      detectViaStellarHorizon,
      detectViaDirectQuery
    ];
    
    const allTokens = [];
    
    for (const method of detectionMethods) {
      try {
        const tokens = await method(walletAddress);
        if (tokens && tokens.length > 0) {
          console.log(`✅ Found ${tokens.length} tokens via ${method.name}`);
          allTokens.push(...tokens);
        }
      } catch (error) {
        console.warn(`⚠️ Detection method ${method.name} failed:`, error);
        continue;
      }
    }
    
    // Remove duplicates
    const uniqueTokens = allTokens.filter((token, index, self) => 
      index === self.findIndex(t => t.asset_code === token.asset_code && t.asset_issuer === token.asset_issuer)
    );
    
    console.log(`📊 Total unique tokens found: ${uniqueTokens.length}`);
    return uniqueTokens;
  } catch (error) {
    console.error('❌ Failed to detect tokens:', error);
    return [];
  }
};

// Method 1: Detect via Pi Mainnet API
const detectViaPiMainnetAPI = async (walletAddress: string) => {
  const response = await fetch(
    `${PI_CONFIG.ENDPOINTS.PI_ACCOUNT_BALANCES}/${walletAddress}`,
    {
      headers: {
        'Authorization': `Bearer ${PI_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Pi API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.balances?.filter((balance: any) => balance.asset_type !== 'native') || [];
};

// Method 2: Detect via Stellar Horizon API
const detectViaStellarHorizon = async (walletAddress: string) => {
  const response = await fetch(
    `${PI_CONFIG.ENDPOINTS.HORIZON}/accounts/${walletAddress}/balances`
  );
  
  if (!response.ok) {
    throw new Error(`Horizon API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.balances?.filter((balance: any) => balance.asset_type !== 'native') || [];
};

// Method 3: Direct asset discovery query
const detectViaDirectQuery = async (walletAddress: string) => {
  try {
    const response = await fetch(
      `${PI_CONFIG.ENDPOINTS.PI_ASSET_DISCOVERY}?account=${walletAddress}`,
      {
        headers: {
          'Authorization': `Bearer ${PI_CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Asset discovery error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.assets || [];
  } catch (error) {
    // Fallback to generic asset listing
    return [];
  }
};

// Create trustline for any Pi mainnet token
export const createTokenTrustline = async (tokenCode: string, tokenIssuer: string): Promise<boolean> => {
  try {
    console.log(`🔗 Creating trustline for token: ${tokenCode}`);
    
    if (typeof window !== 'undefined' && window.Pi) {
      const trustlineData = {
        amount: 0.0000001, // Minimum amount for trustline
        memo: `${tokenCode} trustline creation`,
        metadata: {
          type: 'change_trust',
          asset_code: tokenCode,
          asset_issuer: tokenIssuer,
          limit: "1000000000" // Default limit
        }
      };
      
      await window.Pi.createPayment(trustlineData, {
        onReadyForServerApproval: (paymentId: string) => {
          console.log(`📝 Trustline payment ready: ${paymentId}`);
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          console.log(`✅ Trustline created successfully: ${txid}`);
        },
        onCancel: (paymentId: string) => {
          console.log(`❌ Trustline creation cancelled: ${paymentId}`);
        },
        onError: (error: Error) => {
          console.error(`❌ Trustline creation error:`, error);
          throw error;
        }
      });
      
      return true;
    }
    
    throw new Error('Pi Network SDK not available');
  } catch (error) {
    console.error('❌ Failed to create trustline:', error);
    return false;
  }
};

// Generic token balance checker
export const getTokenBalance = async (walletAddress: string, tokenCode?: string, tokenIssuer?: string): Promise<any> => {
  try {
    console.log(`🪙 Checking token balance for: ${tokenCode || 'all tokens'}`);
    
    const tokens = await getWalletTokens(walletAddress);
    
    if (tokenCode && tokenIssuer) {
      // Look for specific token
      const token = tokens.find(t => 
        t.asset_code === tokenCode && 
        t.asset_issuer === tokenIssuer
      );
      
      return token ? {
        balance: token.balance,
        hasTrustline: true,
        source: 'pi_mainnet',
        token_info: token
      } : {
        balance: "0",
        hasTrustline: false
      };
    } else {
      // Return all tokens
      return tokens;
    }
  } catch (error) {
    console.error('❌ Failed to get token balance:', error);
    return { balance: "0", hasTrustline: false };
  }
};

// Legacy function names for backwards compatibility - these now show warnings
export const getDROPTokenBalance = async (walletAddress: string): Promise<any> => {
  console.warn('⚠️ getDROPTokenBalance is deprecated. DROP token was configured for testnet only.');
  console.warn(`ℹ️ Use getTokenBalance() or getWalletTokens() for ${PI_CONFIG.SANDBOX_MODE ? 'sandbox' : 'mainnet'} token detection.`);
  return getTokenBalance(walletAddress);
};

export const createDROPTrustline = async (walletAddress: string): Promise<boolean> => {
  console.warn('⚠️ createDROPTrustline is deprecated. DROP token was configured for testnet only.');
  console.warn(`ℹ️ Use createTokenTrustline() for ${PI_CONFIG.SANDBOX_MODE ? 'sandbox' : 'mainnet'} tokens.`);
  return false;
};

export const addDROPToWallet = async (walletAddress: string): Promise<boolean> => {
  console.warn('⚠️ addDROPToWallet is deprecated. DROP token was configured for testnet only.');
  return false;
};

export const getAllWalletTokens = async (walletAddress: string): Promise<any[]> => {
  console.warn('⚠️ getAllWalletTokens is being renamed to getWalletTokens for clarity.');
  return getWalletTokens(walletAddress);
};

// IMPORTANT NOTE: 
// The DROP token configuration has been removed because it was testnet-specific.
// To implement proper mainnet tokens:
//
// 1. Token must be issued on Pi Mainnet (not testnet)
// 2. Must have a valid home_domain with proper pi.toml file
// 3. Must follow Pi Network token standards
// 4. Must be verified by Pi Network servers
//
// Example of proper mainnet token configuration when available:
// const MAINNET_TOKEN = {
//   code: "TOKEN",
//   issuer: "MAINNET_ISSUER_ADDRESS", 
//   home_domain: "yourtoken.com",
//   name: "Your Token Name"
// };

console.log(`✅ Pi Network Configuration loaded for ${PI_CONFIG.SANDBOX_MODE ? 'SANDBOX' : 'MAINNET'}`);
console.log('ℹ️ Previous testnet DROP token configuration has been removed');
console.log(`ℹ️ Use generic token detection methods for ${PI_CONFIG.SANDBOX_MODE ? 'sandbox' : 'mainnet'} tokens`);