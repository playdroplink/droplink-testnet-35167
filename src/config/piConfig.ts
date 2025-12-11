/**
 * Pi Network Configuration for DropLink
 * Based on FlappyPi working implementation
 * Note: This is an alternative config file. The main config is in pi-config.ts
 */

// Pi Network Configuration from environment
const PI_API_KEY = import.meta.env.VITE_PI_API_KEY || "";
const PI_VALIDATION_KEY = import.meta.env.VITE_PI_VALIDATION_KEY || "";
const PAYMENT_RECEIVER_WALLET = import.meta.env.VITE_PI_PAYMENT_RECEIVER_WALLET || "GDSXE723WPHZ5RGIJCSYXTPKSOIGPTSXE4RF5U3JTNGTCHXON7ZVD4LJ";

// Determine if we're in sandbox mode
const IS_SANDBOX = import.meta.env.VITE_PI_SANDBOX_MODE === 'true';

export const PI_CONFIG = {
  // API Keys
  API_KEY: PI_API_KEY,

  // Environment Settings
  IS_SANDBOX: IS_SANDBOX,  // false = mainnet, true = testnet

  API_VERSION: '2.0',

  // API Endpoints
  BASE_URL: 'https://api.minepi.com',
  SANDBOX_URL: 'https://api.testnet.minepi.com',

  // Payment Settings
  PAYMENT_INCOMPLETE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  
  // Payment receiver wallet
  PAYMENT_RECEIVER_WALLET: PAYMENT_RECEIVER_WALLET,
  
  // Validation key
  VALIDATION_KEY: PI_VALIDATION_KEY,

  // Headers
  getHeaders() {
    if (!this.API_KEY) {
      throw new Error('Pi API key is not configured');
    }
    return {
      'Authorization': `Key ${this.API_KEY}`,
      'Content-Type': 'application/json'
    };
  },

  // API URLs
  getApiUrl() {
    return this.IS_SANDBOX ? this.SANDBOX_URL : this.BASE_URL;
  },

  // Environment detection
  detectEnvironment() {
    const isPiBrowser = typeof window !== 'undefined' &&
                       (window.Pi ||
                        navigator.userAgent.toLowerCase().includes('pi browser') ||
                        navigator.userAgent.toLowerCase().includes('pibrowser'));

    const isTestnetMode = window.location.hostname.includes('testnet') ||
                         window.location.hostname.includes('localhost') ||
                         localStorage.getItem('pi-network-mode') === 'testnet';

    const isDevelopment = window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';

    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

    return {
      isPiBrowser,
      isTestnetMode,
      isDevelopment,
      isLocalhost,
      shouldUseTestnet: isTestnetMode || isDevelopment,
      shouldUseMainnet: !isTestnetMode && !isDevelopment && isPiBrowser
    };
  },

  // Get sandbox setting for SDK
  getSandboxSetting() {
    const env = this.detectEnvironment();

    // Use testnet for localhost to avoid CORS issues
    if (env.isLocalhost) {
      console.log('🔧 Localhost detected, using testnet mode');
      return true;
    }

    // Use mainnet for Pi Browser mobile unless explicitly testnet
    if (env.isPiBrowser && !env.shouldUseTestnet) {
      return false;
    }

    return this.IS_SANDBOX;
  },

  getNetworkMode() {
    const env = this.detectEnvironment();
    if (env.shouldUseMainnet) return 'mainnet';
    return this.IS_SANDBOX ? 'testnet' : 'mainnet';
  }
};

// Pi SDK configuration
export const piConfig = {
  sandbox: PI_CONFIG.getSandboxSetting(),
};
