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
          <div className="p-6 text-center text-gray-500">
            <h2 className="text-xl font-semibold mb-2">The pay feature is currently disabled.</h2>
            <p>This section is unavailable for now. Please check back later.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPage;