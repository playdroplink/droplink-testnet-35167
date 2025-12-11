/**
 * Real Pi Payment Service for DropLink
 * Implements 3-phase Pi payment flow
 * Based on FlappyPi working implementation
 */

import { PI_CONFIG } from '@/config/piConfig';

export interface PaymentItem {
  id: string;
  name: string;
  type: 'subscription' | 'product' | 'coins';
  price: number;
  description: string;
  metadata?: any;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  txid?: string;
  error?: string;
}

export class RealPiPaymentService {
  private static instance: RealPiPaymentService;

  private constructor() {}

  public static getInstance(): RealPiPaymentService {
    if (!RealPiPaymentService.instance) {
      RealPiPaymentService.instance = new RealPiPaymentService();
    }
    return RealPiPaymentService.instance;
  }

  /**
   * Process a payment through Pi Network
   */
  async processPayment(item: PaymentItem, onProgress?: (phase: string, details: any) => void): Promise<PaymentResult> {
    try {
      console.log('🛒 Processing payment for:', item.name);
      onProgress?.('init', { amount: item.price, memo: item.name });

      // Check Pi SDK availability
      if (typeof window === 'undefined' || typeof window.Pi === 'undefined') {
        throw new Error('Pi SDK not available. Use Pi Browser.');
      }

      // Authenticate if needed
      const currentUser = await this.authenticateUser();
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      console.log('🔐 Authenticated user:', currentUser.username);
      onProgress?.('authenticated', { username: currentUser.username });

      // Create payment with 3-phase flow
      const payment = await this.createPaymentWithCallbacks({
        amount: item.price,
        memo: `${item.name} - DropLink`,
        metadata: {
          itemId: item.id,
          itemType: item.type,
          itemName: item.name,
          userId: currentUser.uid,
          username: currentUser.username,
          timestamp: Date.now(),
          ...item.metadata
        }
      }, onProgress);

      console.log('✅ Payment completed successfully:', payment);
      
      return {
        success: true,
        paymentId: payment.identifier,
        txid: payment.transaction?.txid,
      };

    } catch (error) {
      console.error('❌ Payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Authenticate user with Pi Network
   */
  private async authenticateUser() {
    // Check if already authenticated by trying to get current user
    try {
      // Pi SDK doesn't have isAuthenticated method, just try authenticate
      const auth = await window.Pi.authenticate(['username', 'payments', 'wallet_address']);
      return auth.user;
    } catch (error) {
      console.error('[PAYMENT] Authentication failed:', error);
      throw new Error('Pi Network authentication required');
    }
  }

  /**
   * Create payment with 3-phase callback flow
   */
  private async createPaymentWithCallbacks(params: {
    amount: number;
    memo: string;
    metadata: any;
  }, onProgress?: (phase: string, details: any) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const paymentData = {
        amount: params.amount,
        memo: params.memo,
        metadata: params.metadata,
      };

      const callbacks = {
        // Phase I: Server-Side Approval
        onReadyForServerApproval: async (paymentId: string) => {
          console.log('[PAYMENT] ⏳ Phase I - Server approval for:', paymentId);
          onProgress?.('approval', { paymentId });

          try {
            const approved = await this.approvePaymentOnServer(paymentId);
            
            if (!approved) {
              throw new Error('Payment approval failed on server');
            }
            
            console.log('[PAYMENT] ✅ Phase I - Payment approved');
            onProgress?.('approved', { paymentId });
          } catch (error) {
            console.error('[PAYMENT] ❌ Phase I - Approval failed:', error);
            reject(error);
          }
        },

        // Phase III: Server-Side Completion
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log('[PAYMENT] ⏳ Phase III - Completing payment:', paymentId, 'Transaction:', txid);
          onProgress?.('completion', { paymentId, txid });

          try {
            const completed = await this.completePaymentOnServer(paymentId, txid, params.metadata);
            
            if (!completed) {
              throw new Error('Payment completion failed on server');
            }
            
            console.log('[PAYMENT] ✅ Phase III - Payment completed');
            onProgress?.('completed', { paymentId, txid });
            
            resolve({
              identifier: paymentId,
              transaction: { txid }
            });
          } catch (error) {
            console.error('[PAYMENT] ❌ Phase III - Completion failed:', error);
            reject(error);
          }
        },

        // User cancelled
        onCancel: (paymentId: string) => {
          console.log('[PAYMENT] ⚠️ Payment cancelled by user:', paymentId);
          onProgress?.('cancelled', { paymentId });
          reject(new Error('Payment cancelled by user'));
        },

        // Error occurred
        onError: (error: Error, payment?: any) => {
          console.error('[PAYMENT] ❌ Payment error:', error, payment);
          onProgress?.('error', { error: error.message, payment });
          reject(error);
        },
      };

      console.log('[PAYMENT] 📝 Creating payment with Pi SDK...');
      window.Pi.createPayment(paymentData, callbacks);
    });
  }

  /**
   * Approve payment on server (calls Supabase edge function)
   */
  private async approvePaymentOnServer(paymentId: string): Promise<boolean> {
    try {
      console.log('[PAYMENT] 📡 Sending approval request to server...');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pi-payment-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ paymentId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Approval failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.success === true;
      
    } catch (error) {
      console.error('[PAYMENT] ❌ Approval request failed:', error);
      throw error;
    }
  }

  /**
   * Complete payment on server (calls Supabase edge function)
   */
  private async completePaymentOnServer(paymentId: string, txid: string, metadata: any): Promise<boolean> {
    try {
      console.log('[PAYMENT] 📡 Sending completion request to server...');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pi-payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ paymentId, txid, metadata }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Completion failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // CRITICAL: Only mark as complete if transaction verified
      if (!result.verified) {
        console.error('[PAYMENT] ⚠️ Transaction not verified on blockchain!');
        throw new Error('Transaction verification failed');
      }

      return result.success === true;
      
    } catch (error) {
      console.error('[PAYMENT] ❌ Completion request failed:', error);
      throw error;
    }
  }
}

export const realPiPaymentService = RealPiPaymentService.getInstance();
