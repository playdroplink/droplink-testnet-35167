import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Pi, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { usePi } from '@/contexts/PiContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentLink {
  id: string;
  description: string;
  amount: number;
  type: 'payment' | 'tip' | 'subscription' | 'product' | 'donation';
  active: boolean;
  totalReceived: number;
  transactionCount: number;
  memo?: string;
  productInfo?: {
    name: string;
    description: string;
    downloadUrl?: string;
    accessUrl?: string;
  };
  merchantProfile?: {
    username: string;
    businessName: string;
    logoUrl: string;
  };
}

const PaymentPage: React.FC = () => {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const { createPayment, isAuthenticated, piUser } = usePi();
  
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (linkId) {
      loadPaymentLink(linkId);
    }
  }, [linkId]);

  const loadPaymentLink = async (id: string) => {
    setLoading(true);
    console.log('Loading payment link:', id);
    
    try {
      // First try to load from database payment_links table (if it exists)
      try {
        const { data: dbLink, error: dbError } = await supabase
          .from('payment_links' as any)
          .select('*')
          .eq('link_id', id)
          .eq('is_active', true)
          .single();

        if (!dbError && dbLink) {
          console.log('Found payment link in database:', dbLink);
          
          // Get profile data separately
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, business_name, logo')
            .eq('id', (dbLink as any).profile_id)
            .single();

          setPaymentLink({
            id: (dbLink as any).link_id || id,
            description: (dbLink as any).description || 'Payment Link',
            amount: parseFloat((dbLink as any).amount?.toString() || '0'),
            type: ((dbLink as any).payment_type || 'payment') as any,
            active: (dbLink as any).is_active !== false,
            totalReceived: parseFloat((dbLink as any).total_received?.toString() || '0'),
            transactionCount: (dbLink as any).transaction_count || 0,
            memo: (dbLink as any).description || 'Payment Link',
            productInfo: (dbLink as any).payment_type === 'product' ? {
              name: (dbLink as any).description || 'Product',
              description: (dbLink as any).description || 'Product'
            } : undefined,
            merchantProfile: {
              username: profileData?.username || 'Unknown',
              businessName: profileData?.business_name || profileData?.username || 'Unknown Business',
              logoUrl: profileData?.logo || ''
            }
          });
          return;
        }
      } catch (dbTableError) {
        console.warn('payment_links table not available, using fallback methods');
      }

      // Fallback 1: Search in all profiles' theme_settings
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, business_name, logo, theme_settings, user_id');

      console.log('Searching in', profiles?.length || 0, 'profiles for payment link:', id);

      for (const profile of profiles || []) {
        try {
          const themeSettings = (profile.theme_settings as any) || {};
          const paymentLinks = themeSettings.paymentLinks || [];
          
          console.log(`Checking profile ${profile.username}:`, paymentLinks.length, 'payment links');
          
          const foundLink = paymentLinks.find((link: any) => {
            console.log('Comparing link ID:', link.id, 'with search ID:', id);
            return link.id === id;
          });
          
          if (foundLink) {
            console.log('Found payment link in profile theme_settings:', foundLink);
            
            // Check if link is active
            if (foundLink.active !== false) { // Default to active if not specified
              setPaymentLink({
                ...foundLink,
                amount: parseFloat(foundLink.amount || '0'),
                totalReceived: parseFloat(foundLink.totalReceived || '0'),
                transactionCount: foundLink.transactionCount || 0,
                active: foundLink.active !== false,
                memo: foundLink.description || foundLink.memo,
                merchantProfile: {
                  username: profile.username || '',
                  businessName: profile.business_name || '',
                  logoUrl: profile.logo || ''
                }
              });
              return;
            } else {
              console.log('Payment link found but inactive:', foundLink);
            }
          }
        } catch (profileError) {
          console.warn('Error parsing profile payment links:', profileError);
        }
      }

      // Fallback 2: Check global localStorage (for development/testing)
      try {
        const globalLinks = JSON.parse(localStorage.getItem('all_payment_links') || '{}');
        console.log('Checking global localStorage links:', Object.keys(globalLinks));
        
        for (const [userId, userLinks] of Object.entries(globalLinks)) {
          const links = userLinks as any[];
          const foundLink = links?.find((link: any) => link.id === id);
          
          if (foundLink && foundLink.active !== false) {
            console.log('Found payment link in global localStorage:', foundLink);
            
            // Try to find the merchant profile
            const merchantProfile = profiles?.find(p => p.user_id === userId);
            
            setPaymentLink({
              ...foundLink,
              amount: parseFloat(foundLink.amount || '0'),
              totalReceived: parseFloat(foundLink.totalReceived || '0'),
              transactionCount: foundLink.transactionCount || 0,
              active: foundLink.active !== false,
              merchantProfile: merchantProfile ? {
                username: merchantProfile.username || '',
                businessName: merchantProfile.business_name || '',
                logoUrl: merchantProfile.logo || ''
              } : undefined
            });
            return;
          }
        }
      } catch (localStorageError) {
        console.warn('Error checking localStorage:', localStorageError);
      }

      // Payment link not found
      console.error('Payment link not found:', id);
      setError('Payment link not found or is no longer active');
      
    } catch (error) {
      console.error('Failed to load payment link:', error);
      setError('Failed to load payment link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!paymentLink || !isAuthenticated) {
      toast.error('Please authenticate with Pi Network to make payments');
      return;
    }

    setProcessing(true);
    setPaymentStatus('processing');
    
    try {
      const paymentData = {
        amount: paymentLink.amount,
        memo: paymentLink.memo || paymentLink.description,
        metadata: {
          linkId: paymentLink.id,
          type: paymentLink.type,
          merchantUsername: paymentLink.merchantProfile?.username
        }
      };

      // Create Pi Network payment
      const payment = await createPayment(paymentData.amount, paymentData.memo, paymentData.metadata);
      
      if (payment) {
        setTransactionHash(payment || '');
        setPaymentStatus('completed');
        
        // Track payment in database
        try {
          await supabase.from('payment_transactions' as any).insert({
            payment_link_id: null, // Will be linked later
            transaction_id: payment,
            payment_id: payment,
            amount: paymentLink.amount,
            sender_address: piUser?.uid || '',
            receiver_address: paymentLink.merchantProfile?.username || '',
            status: 'pending',
            memo: paymentLink.memo || paymentLink.description,
            pi_metadata: payment
          });
          
          toast.success('Payment submitted successfully!', {
            description: 'Your payment is being processed on the Pi Network'
          });
          
          // If this is a product payment, provide access instructions
          if (paymentLink.type === 'product' && paymentLink.productInfo) {
            setTimeout(() => {
              toast.success('Product access granted!', {
                description: 'Check your email or Pi messages for download links'
              });
            }, 2000);
          }
          
        } catch (trackingError) {
          console.warn('Failed to track payment in database:', trackingError);
        }
      }
      
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStatus('failed');
      setError('Payment failed. Please try again.');
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return <CreditCard className="w-5 h-5" />;
      case 'tip': return <Pi className="w-5 h-5" />;
      case 'donation': return <Pi className="w-5 h-5" />;
      case 'subscription': return <ShieldCheck className="w-5 h-5" />;
      default: return <Pi className="w-5 h-5" />;
    }
  };

  const formatPiAmount = (amount: number) => {
    return `${amount.toFixed(2)} π`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p>Loading payment details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !paymentLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Payment link not found'}
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            {getTypeIcon(paymentLink.type)}
          </div>
          
          <CardTitle className="text-xl font-bold">
            {paymentLink.type === 'product' ? 'Purchase Product' : 
             paymentLink.type === 'tip' ? 'Send Tip' :
             paymentLink.type === 'donation' ? 'Make Donation' :
             paymentLink.type === 'subscription' ? 'Subscribe' :
             'Make Payment'}
          </CardTitle>
          
          <CardDescription className="text-gray-600">
            {paymentLink.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Merchant Info */}
          {paymentLink.merchantProfile && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {paymentLink.merchantProfile.logoUrl && (
                <img 
                  src={paymentLink.merchantProfile.logoUrl} 
                  alt="Merchant"
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-medium">{paymentLink.merchantProfile.businessName}</p>
                <p className="text-sm text-gray-500">@{paymentLink.merchantProfile.username}</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-green-500 ml-auto" />
            </div>
          )}

          {/* Payment Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span className="font-medium">Amount</span>
              <div className="flex items-center gap-2">
                <Pi className="w-5 h-5 text-yellow-500" />
                <span className="font-bold">{formatPiAmount(paymentLink.amount)}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between text-sm">
              <span>Payment Type</span>
              <Badge variant="secondary" className="capitalize">
                {paymentLink.type}
              </Badge>
            </div>

            {paymentLink.productInfo && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-sm">Product Details</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {paymentLink.productInfo.description}
                </p>
              </div>
            )}
          </div>

          {/* Payment Status */}
          {paymentStatus !== 'pending' && (
            <Alert className={
              paymentStatus === 'completed' ? 'border-green-200 bg-green-50' :
              paymentStatus === 'processing' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }>
              {paymentStatus === 'completed' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
               paymentStatus === 'processing' ? <Clock className="h-4 w-4 text-yellow-600" /> :
               <AlertTriangle className="h-4 w-4 text-red-600" />}
              <AlertDescription>
                {paymentStatus === 'completed' ? 'Payment completed successfully!' :
                 paymentStatus === 'processing' ? 'Processing your payment...' :
                 'Payment failed. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Hash */}
          {transactionHash && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
              <p className="text-xs font-mono break-all">{transactionHash}</p>
            </div>
          )}

          {/* Payment Button */}
          <div className="space-y-3">
            {!isAuthenticated ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please authenticate with Pi Network to make payments
                </AlertDescription>
              </Alert>
            ) : null}

            <Button 
              onClick={processPayment}
              disabled={processing || !isAuthenticated || paymentStatus === 'completed'}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              size="lg"
            >
              {processing ? (
                <>
                  <Clock className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : paymentStatus === 'completed' ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Payment Completed
                </>
              ) : (
                <>
                  <Pi className="w-5 h-5 mr-2" />
                  Pay {formatPiAmount(paymentLink.amount)}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Secured by Pi Network • Processed on mainnet blockchain
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {paymentLink.merchantProfile?.username && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/u/${paymentLink.merchantProfile?.username}`)} 
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Store
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPage;