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
import { PI_CONFIG } from '@/config/pi-config';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePiNetwork } from '@/hooks/usePiNetwork';

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
  const searchParams = new URLSearchParams(window.location.search);
  
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { createPayment, isAuthenticated, authenticate } = usePiNetwork();

  useEffect(() => {
    if (linkId) {
      loadPaymentLink(linkId);
    }
  }, [linkId]);

  // Handle payment completion redirect from Pi Network
  useEffect(() => {
    const txid = searchParams.get('txid');
    const paymentId = searchParams.get('paymentId');
    
    if (txid) {
      // Payment completed successfully
      setPaymentStatus('completed');
      setTransactionHash(txid);
      
      // Redirect to dashboard after 3 seconds to show results of subscription unlock
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, navigate]);

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
            active: (dbLink as any).is_active ?? true,
            totalReceived: (dbLink as any).total_received ?? 0,
            transactionCount: (dbLink as any).transaction_count ?? 0,
            memo: (dbLink as any).memo,
            productInfo: (dbLink as any).product_info,
            merchantProfile: profileData ? {
              username: profileData.username,
              businessName: profileData.business_name,
              logoUrl: profileData.logo
            } : undefined
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

  const handlePiPayment = async () => {
    if (!isAuthenticated) {
      try {
        await authenticate();
      } catch (err) {
        toast.error('Pi authentication failed.');
        return;
      }
    }
    setProcessing(true);
    setError('');
    try {
      const payment = await createPayment(
        paymentLink?.amount || 0,
        paymentLink?.description || 'Droplink Payment',
        { linkId: paymentLink?.id }
      );
      toast.success('Payment initiated! Complete in Pi Browser.');
      // Optionally, redirect or update UI here
    } catch (err: any) {
      setError(err?.message || 'Payment failed');
      toast.error(err?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center space-y-4 border-b">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            {getTypeIcon(paymentLink.type)}
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {paymentLink.type === 'product' ? 'Purchase Product' : 
             paymentLink.type === 'tip' ? 'Send Tip' :
             paymentLink.type === 'donation' ? 'Make Donation' :
             paymentLink.type === 'subscription' ? 'Subscribe Now' :
             'Make Payment'}
          </CardTitle>
          
          <CardDescription className="text-gray-600 text-base">
            {paymentLink.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {/* Merchant Info */}
          {paymentLink.merchantProfile && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              {paymentLink.merchantProfile.logoUrl && (
                <img 
                  src={paymentLink.merchantProfile.logoUrl} 
                  alt={paymentLink.merchantProfile.businessName}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="font-semibold">{paymentLink.merchantProfile.businessName || paymentLink.merchantProfile.username}</p>
                <p className="text-sm text-gray-600">@{paymentLink.merchantProfile.username}</p>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Amount:</span>
              <span className="text-2xl font-bold text-blue-900">{formatPiAmount(paymentLink.amount)}</span>
            </div>
            
            {paymentLink.type === 'subscription' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Billing:</span>
                <Badge variant="secondary">Monthly</Badge>
              </div>
            )}

            <Separator className="bg-blue-200" />
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Network:</span>
              <span className="font-medium">Pi Mainnet</span>
            </div>
          </div>

          {/* Payment Status Messages */}
          {paymentStatus === 'completed' && (
            <Alert className="border-green-300 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment completed successfully! Transaction: {transactionHash}
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === 'failed' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Payment failed. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {processing && (
            <Alert className="border-blue-300 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-800">
                Processing payment on Pi Network...
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-6">
            <Button 
              size="lg"
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
              disabled={processing || paymentStatus === 'completed' || paymentStatus === 'failed'}
              onClick={handlePiPayment}
            >
              <Pi className="w-5 h-5 mr-2" />
              {processing ? 'Processing Payment...' : 'Continue with Pi Wallet'}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Secure Payment
            </h4>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li>✓ Powered by Pi Network on Mainnet</li>
              <li>✓ All transactions are secured and verified</li>
              <li>✓ Your funds go directly to the merchant</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPage;