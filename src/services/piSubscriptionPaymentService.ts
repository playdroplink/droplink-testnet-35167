/**
 * Enhanced Pi Payment Service for Subscriptions
 * Based on Pi SDK documentation from playdroplink/pi-sdk-nextjs and playdroplink/pi-sdk-rails
 */

export interface PiServerConfig {
  apiUrlBase: string;
  apiVersion: string;
  apiController: string;
  apiKey: string;
}

export interface PostToPiServerOpts {
  logOk?: (msg: string, res: unknown) => void;
  logFail?: (msg: string, error: unknown, status?: number) => void;
  header?: Record<string, string>;
}

export interface PaymentMetadata {
  planName: string;
  billingPeriod: 'monthly' | 'yearly';
  userId: string;
  username: string;
  profileId?: string;
  itemId: string;
  itemType: 'subscription';
  timestamp: number;
  description?: string;
}

export interface PaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, paymentId?: string) => void;
}

export interface SubscriptionPaymentData {
  amount: number;
  memo: string;
  metadata: PaymentMetadata;
}

export class PiSubscriptionPaymentService {
  private static instance: PiSubscriptionPaymentService;
  
  private constructor() {}
  
  public static getInstance(): PiSubscriptionPaymentService {
    if (!PiSubscriptionPaymentService.instance) {
      PiSubscriptionPaymentService.instance = new PiSubscriptionPaymentService();
    }
    return PiSubscriptionPaymentService.instance;
  }

  /**
   * Get Pi Server configuration
   */
  private getPiServerConfig(): PiServerConfig {
    const apiUrlBase = import.meta.env.VITE_PI_API_URL || "https://api.minepi.com";
    const apiVersion = import.meta.env.VITE_PI_API_VERSION || "v2";
    const apiController = "payments";
    const apiKey = import.meta.env.VITE_PI_API_KEY || "epbig4kjt1evsdir4jr5nzxsgxg4f8jhqsmeuf3ijo1bshis1qhq50irzx9wotzg";

    if (!apiKey) {
      throw new Error("Missing Pi API configuration. Please set VITE_PI_API_KEY");
    }

    return { apiUrlBase, apiVersion, apiController, apiKey };
  }

  /**
   * Makes a POST request to the Pi SDK server for a given action
   */
  private async postToPiServer(
    action: string,
    paymentId: string,
    body: any = {},
    opts: PostToPiServerOpts = {}
  ): Promise<any> {
    const { apiUrlBase, apiVersion, apiController, apiKey } = this.getPiServerConfig();

    const url = `${apiUrlBase.replace(/\/$/, '')}/${apiVersion}/${apiController}/${paymentId}/${action}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
      ...(opts.header || {})
    };

    console.log(`[PI SERVER] Making ${action} request to:`, url);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers,
      });
    } catch (error) {
      const errorMessage = `Network error for Pi Server ${action}: ${error}`;
      opts.logFail?.(errorMessage, error);
      throw new Error(errorMessage);
    }

    let parsed;
    const responseText = await response.text();
    
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      const errorMessage = `Invalid JSON from Pi Server ${action} (${response.status}): ${responseText}`;
      opts.logFail?.(errorMessage, responseText, response.status);
      throw new Error(errorMessage);
    }

    if (response.ok) {
      opts.logOk?.(`Pi server ${action} succeeded (${response.status})`, parsed);
      return parsed;
    } else {
      const errorMessage = `Pi Server ${action} failed: HTTP ${response.status}: ${responseText}`;
      opts.logFail?.(errorMessage, parsed, response.status);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a subscription payment with proper Pi SDK flow
   */
  async createSubscriptionPayment(
    paymentData: SubscriptionPaymentData,
    callbacks: PaymentCallbacks,
    onProgress?: (phase: string, data: any) => void
  ): Promise<void> {
    try {
      onProgress?.('init', { message: 'Initializing Pi payment...' });
      
      // Check Pi SDK availability
      if (typeof window === 'undefined' || !window.Pi) {
        throw new Error('Pi SDK not available. Please open this app in the Pi Browser.');
      }

      onProgress?.('sdk_ready', { message: 'Pi SDK available' });

      // Create payment with Pi SDK
      await window.Pi.createPayment({
        amount: paymentData.amount,
        memo: paymentData.memo,
        metadata: paymentData.metadata,
      }, {
        // Phase 1: Request user approval
        onReadyForServerApproval: async (paymentId: string) => {
          console.log(`[PI PAYMENT] Phase 1: Approval requested for payment ${paymentId}`);
          onProgress?.('approval', { paymentId, message: 'Waiting for your approval...' });
          
          try {
            // Call our server to approve the payment
            await this.postToPiServer('approve', paymentId, {
              amount: paymentData.amount,
              memo: paymentData.memo,
              metadata: paymentData.metadata
            }, {
              logOk: (msg, res) => console.log(`[PI SERVER] ${msg}`, res),
              logFail: (msg, error, status) => console.error(`[PI SERVER] ${msg}`, error, status)
            });
            
            onProgress?.('approved', { paymentId, message: 'Payment approved by server' });
            callbacks.onReadyForServerApproval(paymentId);
            
          } catch (error) {
            console.error('[PI PAYMENT] Server approval failed:', error);
            onProgress?.('approval_failed', { paymentId, error: error.message });
            callbacks.onError(new Error(`Server approval failed: ${error.message}`), paymentId);
          }
        },

        // Phase 2: Request server completion
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log(`[PI PAYMENT] Phase 2: Completion requested for payment ${paymentId}, txid: ${txid}`);
          onProgress?.('completion', { paymentId, txid, message: 'Finalizing payment...' });
          
          try {
            // Call our server to complete the payment
            await this.postToPiServer('complete', paymentId, {
              txid,
              amount: paymentData.amount,
              memo: paymentData.memo,
              metadata: paymentData.metadata
            }, {
              logOk: (msg, res) => console.log(`[PI SERVER] ${msg}`, res),
              logFail: (msg, error, status) => console.error(`[PI SERVER] ${msg}`, error, status)
            });
            
            onProgress?.('completed', { paymentId, txid, message: 'Payment completed successfully!' });
            callbacks.onReadyForServerCompletion(paymentId, txid);
            
          } catch (error) {
            console.error('[PI PAYMENT] Server completion failed:', error);
            onProgress?.('completion_failed', { paymentId, txid, error: error.message });
            callbacks.onError(new Error(`Server completion failed: ${error.message}`), paymentId);
          }
        },

        // Handle cancellation
        onCancel: (paymentId: string) => {
          console.log(`[PI PAYMENT] Payment cancelled: ${paymentId}`);
          onProgress?.('cancelled', { paymentId, message: 'Payment was cancelled' });
          callbacks.onCancel(paymentId);
        },

        // Handle errors
        onError: (error: Error, paymentId?: string) => {
          console.error('[PI PAYMENT] Payment error:', error, paymentId);
          onProgress?.('error', { paymentId, error: error.message, message: 'Payment failed' });
          callbacks.onError(error, paymentId);
        }
      });

      return;

    } catch (error) {
      console.error('[PI PAYMENT] Failed to create payment:', error);
      onProgress?.('error', { error: error.message, message: 'Failed to create payment' });
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Authenticate user with Pi Network
   */
  async authenticatePiUser(scopes: string[] = ['username', 'payments']): Promise<any> {
    if (!window.Pi) {
      throw new Error('Pi SDK not available. Please open in Pi Browser.');
    }

    try {
      console.log('[PI AUTH] Authenticating with scopes:', scopes);
      const authResult = await window.Pi.authenticate(scopes, (payment: any) => {
        console.log('[PI AUTH] Incomplete payment found:', payment);
      });

      console.log('[PI AUTH] Authentication successful:', authResult.user);
      return authResult;
    } catch (error) {
      console.error('[PI AUTH] Authentication failed:', error);
      throw new Error(`Pi authentication failed: ${error.message}`);
    }
  }

  /**
   * Initialize Pi SDK with proper configuration
   */
  async initializePiSDK(): Promise<void> {
    if (!window.Pi) {
      throw new Error('Pi SDK script not loaded. Please ensure Pi SDK is included in your HTML.');
    }

    try {
      console.log('[PI SDK] Initializing with mainnet configuration...');
      
      await window.Pi.init({
        version: "2.0",
        sandbox: false
      });

      console.log('[PI SDK] Initialization successful');
    } catch (error) {
      console.error('[PI SDK] Initialization failed:', error);
      throw new Error(`Pi SDK initialization failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const piSubscriptionPaymentService = PiSubscriptionPaymentService.getInstance();
