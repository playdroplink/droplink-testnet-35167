/**
 * Real Pi Payment Hook for DropLink
 * Based on FlappyPi working implementation
 */

import { useState, useCallback } from 'react';
import { 
  realPiPaymentService, 
  PaymentItem, 
  PaymentResult 
} from '../services/realPiPaymentService';

export const useRealPiPayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<PaymentItem | null>(null);
  const [paymentProgress, setPaymentProgress] = useState<string>('');

  const processPayment = useCallback(async (item: PaymentItem): Promise<PaymentResult> => {
    setIsProcessing(true);
    setCurrentPayment(item);
    setPaymentProgress('Initializing payment...');

    try {
      console.log('🛒 Starting payment for:', item.name);

      const result = await realPiPaymentService.processPayment(item, (phase, details) => {
        // Update progress for UI
        switch (phase) {
          case 'init':
            setPaymentProgress('Initializing payment...');
            break;
          case 'authenticated':
            setPaymentProgress('User authenticated...');
            break;
          case 'approval':
            setPaymentProgress('Waiting for server approval...');
            break;
          case 'approved':
            setPaymentProgress('Payment approved, waiting for user confirmation...');
            break;
          case 'completion':
            setPaymentProgress('Completing payment...');
            break;
          case 'completed':
            setPaymentProgress('Payment completed successfully!');
            break;
          case 'cancelled':
            setPaymentProgress('Payment cancelled');
            break;
          case 'error':
            setPaymentProgress('Payment error occurred');
            break;
        }
      });

      if (result.success) {
        console.log('✅ Payment successful:', result);
      } else {
        console.error('❌ Payment failed:', result.error);
      }

      return result;

    } catch (error) {
      console.error('❌ Payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      setIsProcessing(false);
      setCurrentPayment(null);
      setTimeout(() => setPaymentProgress(''), 3000);
    }
  }, []);

  return {
    isProcessing,
    currentPayment,
    paymentProgress,
    processPayment,
  };
};
