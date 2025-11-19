// Pi Network Configuration (Mainnet Production)
export const PI_CONFIG = {
  // Mainnet Configuration
  API_KEY: "96tnxytg82pevnvvxfowap4bwctcxo6wkp2dexoraevtj8svh0mvqxttpbtwvjm5",
  BASE_URL: "https://api.mainnet.minepi.com",
  NETWORK: "mainnet",
  SANDBOX_MODE: false,
  
  // SDK Configuration
  SDK: {
    version: "2.0",
    sandbox: false,
  },
  
  // Scopes for authentication
  scopes: ['username', 'payments', 'wallet_address'],
  
  // Payment callback handlers
  onIncompletePaymentFound: (payment: any) => {
    console.log('Incomplete payment found:', payment);
    // Handle incomplete payment
  },
  
  // DROP Token Configuration (Mainnet)
  DROP_TOKEN: {
    code: "DROP",
    issuer: "GBVTV77XFMDYSSVIG6ZGSRAGZ3S7KA4275YYLOLIROOD3Y3F3TH5U3EI",
    distributor: "GCTPMH43NGN7E4IXLQ27H2XWGGWWDY3I6UAPBFXYQSEUPEKNQE2BZXC2",
    display_decimals: 2,
    name: "DropLink Token",
    description: "DropLink platform utility token",
    // Mainnet asset details
    asset_type: "credit_alphanum4",
    home_domain: "droplink.io",
    // Token trustline and distribution info
    trustline_limit: "1000000000",
    is_authorized: true,
    is_authorized_to_maintain_liabilities: true,
    // Contract information
    contract: {
      address: "GBVTV77XFMDYSSVIG6ZGSRAGZ3S7KA4275YYLOLIROOD3Y3F3TH5U3EI",
      name: "DropLink",
      symbol: "DROP",
      decimals: 2
    }
  },
  
  // Validation
  VALIDATION_KEY: "7511661aac4538b1832d2c9ba117f6d972b26a54640598d3fbb9824013c7079203f65b02d125be3f418605cfb89ba0e4443e3ec997e3800eb464df0bc5410d2a",
  
  // Platform URLs
  PLATFORM_URL: "https://droplink.io",
  MAINNET_URL: "https://droplink.io",
  
  // Headers for API requests
  getAuthHeaders: (accessToken: string) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }),
  
  // Mainnet endpoints
  ENDPOINTS: {
    ME: "https://api.mainnet.minepi.com/v2/me",
    WALLETS: "https://api.mainnet.minepi.com/accounts",
    TRANSACTIONS: "https://api.mainnet.minepi.com/transactions",
    PAYMENTS: "https://api.mainnet.minepi.com/payments",
    OPERATIONS: "https://api.mainnet.minepi.com/operations",
    LEDGERS: "https://api.mainnet.minepi.com/ledgers",
    EFFECTS: "https://api.mainnet.minepi.com/effects",
    FEE_STATS: "https://api.mainnet.minepi.com/fee_stats",
    // Stellar Horizon endpoints for DROP token
    HORIZON: "https://horizon.stellar.org",
    DROP_ASSET: "https://horizon.stellar.org/assets?asset_code=DROP&asset_issuer=GBVTV77XFMDYSSVIG6ZGSRAGZ3S7KA4275YYLOLIROOD3Y3F3TH5U3EI"
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

// Helper to get DROP token balance
export const getDROPTokenBalance = async (walletAddress: string): Promise<any> => {
  try {
    const response = await fetch(
      `${PI_CONFIG.ENDPOINTS.HORIZON}/accounts/${walletAddress}/balances`
    );
    const data = await response.json();
    
    // Find DROP token in balances
    const dropBalance = data.balances?.find((balance: any) => 
      balance.asset_code === 'DROP' && 
      balance.asset_issuer === PI_CONFIG.DROP_TOKEN.issuer
    );
    
    return dropBalance || null;
  } catch (error) {
    console.error('Failed to get DROP token balance:', error);
    return null;
  }
};

// Helper to create DROP token trustline
export const createDROPTrustline = async (walletAddress: string): Promise<boolean> => {
  try {
    // This would integrate with Pi Network SDK to create trustline
    console.log('Creating DROP trustline for:', walletAddress);
    
    // Implementation would use Pi Network SDK
    // Return true if successful
    return true;
  } catch (error) {
    console.error('Failed to create DROP trustline:', error);
    return false;
  }
};