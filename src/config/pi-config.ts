// Pi Network Configuration (Mainnet for Production)
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
  
  // DROP Token Configuration
  DROP_TOKEN: {
    code: "DROP",
    issuer: "GBVTV77XFMDYSSVIG6ZGSRAGZ3S7KA4275YYLOLIROOD3Y3F3TH5U3EI",
    distributor: "GCTPMH43NGN7E4IXLQ27H2XWGGWWDY3I6UAPBFXYQSEUPEKNQE2BZXC2",
    display_decimals: 2,
    name: "DropLink Token",
    description: "DropLink platform utility token"
  },
  
  // Validation
  VALIDATION_KEY: "7511661aac4538b1832d2c9ba117f6d972b26a54640598d3fbb9824013c7079203f65b02d125be3f418605cfb89ba0e4443e3ec997e3800eb464df0bc5410d2a",
  
  // Platform URLs
  PLATFORM_URL: "https://droplink.vercel.app",
  
  // Headers for API requests
  getAuthHeaders: (accessToken: string) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }),
  
  // Mainnet endpoints
  ENDPOINTS: {
    ME: "https://api.mainnet.minepi.com/accounts",
    WALLETS: "https://api.mainnet.minepi.com/accounts",
    TRANSACTIONS: "https://api.mainnet.minepi.com/transactions",
    PAYMENTS: "https://api.mainnet.minepi.com/payments",
    OPERATIONS: "https://api.mainnet.minepi.com/operations",
    LEDGERS: "https://api.mainnet.minepi.com/ledgers",
    EFFECTS: "https://api.mainnet.minepi.com/effects",
    FEE_STATS: "https://api.mainnet.minepi.com/fee_stats",
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

// Legacy function for backwards compatibility
export const validateMainnetConfig = validatePiConfig;