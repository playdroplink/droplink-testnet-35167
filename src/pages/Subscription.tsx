import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { Crown } from "lucide-react";

const Subscription = () => {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('Free');
  const [subscription, setSubscription] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();
  const { piUser, createPayment, isAuthenticated } = usePi() as any;

  useEffect(() => {
    const fetchData = async () => {
      if (!piUser?.username) return;
      
      // Get profile id for metadata and current subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', piUser.username)
        .maybeSingle();
        
      if (profile?.id) setProfileId(profile.id);

      const { data } = await supabase
        .from('subscriptions')
        .select('plan_type, end_date, status')
        .eq('profile_id', profile?.id || '')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSubscription(data);
        const planName = (data.plan_type || 'free').toLowerCase();
        const display = planName === 'pro' ? 'Pro' : planName === 'premium' ? 'Premium' : planName === 'basic' ? 'Basic' : 'Free';
        setCurrentPlan(display);
      } else {
        setCurrentPlan('Free');
      }
    };
    
    fetchData();
  }, [piUser]);

  const handleSubscribe = async (planName: string, price: number, isYearly: boolean) => {
    if (!isAuthenticated || !piUser) {
      toast.error('Please sign in with Pi Network first', {
        description: 'You need to authenticate with Pi Network to subscribe',
        duration: 5000
      });
      return;
    }
    
    // Ensure profileId is loaded before proceeding
    if (!profileId) {
      toast.error('User profile not found. Please try again.');
      return;
    }
    
    setLoading(true);
    
    try {
      if (planName === 'Free') {
        // Update subscription to free plan
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            profile_id: profileId,
            plan_type: 'free',
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: null,
            pi_amount: 0,
            pi_transaction_id: null,
            billing_period: 'monthly',
            metadata: {}
          }, {
            onConflict: 'profile_id'
          });
        
        if (error) {
          console.error('Error updating subscription:', error);
          toast.error('Failed to activate free plan');
          return;
        }
        
        toast.success('Free plan activated! 🎉');
        setCurrentPlan('Free');
        setSubscription({ plan_type: 'free' });
        return;
      }
      
      // Show "payment pending" notification
      const toastId = toast.loading('🔄 Waiting for Pi payment approval...', {
        description: `Processing ${price} Pi for ${planName} ${isYearly ? 'Yearly' : 'Monthly'} plan`,
      });
      
      // MAINNET PAYMENT - Real Pi coins will be charged!
      console.log('[SUBSCRIPTION] ⚠️ REAL MAINNET PAYMENT:', price, 'Pi for', planName);
      console.log('[SUBSCRIPTION] Network: MAINNET (Production)');
      console.log('[SUBSCRIPTION] User:', piUser.username);
      console.log('[SUBSCRIPTION] Profile ID:', profileId);
      
      // Create payment with Pi SDK
      const result = await createPayment(
        price,
        `Droplink ${planName} ${isYearly ? 'Yearly' : 'Monthly'} Subscription`,
        {
          subscriptionPlan: planName.toLowerCase(),
          billingPeriod: isYearly ? 'yearly' : 'monthly',
          username: piUser.username,
          profileId: profileId,
          type: 'subscription'
        }
      );
      
      console.log('[SUBSCRIPTION] Payment result:', result);
      
      if (result) {
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (isYearly) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
        
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            profile_id: profileId,
            plan_type: planName.toLowerCase(),
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            pi_amount: price,
            pi_transaction_id: result,
            billing_period: isYearly ? 'yearly' : 'monthly',
            metadata: {
              paymentApprovedAt: new Date().toISOString(),
              paymentHash: result,
              username: piUser.username
            }
          }, {
            onConflict: 'profile_id'
          });
        
        if (subError) {
          console.error('Error creating subscription record:', subError);
          toast.error('Payment successful but subscription record failed. Please contact support.');
          return;
        }
        
        toast.dismiss(toastId);
        toast.success(`✅ Subscribed to ${planName} plan!`, {
          description: `Transaction: ${result.substring(0, 12)}...`,
          duration: 5000
        });
        
        setCurrentPlan(planName);
        setSubscription({ 
          plan_type: planName.toLowerCase(),
          status: 'active',
          end_date: endDate.toISOString()
        });
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => navigate('/'), 2000);
      } else {
        toast.dismiss(toastId);
        toast.error('❌ Payment was not completed', {
          description: 'Your Pi wallet may have cancelled the transaction. Please try again.',
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Payment error:', error);
      toast.error(error?.message || 'Failed to process subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </Button>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
        >
          <Crown className="w-4 h-4 mr-2" />
          View Plans
        </Button>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showModal}
        onOpenChange={setShowModal}
        currentPlan={currentPlan}
        onSubscribe={handleSubscribe}
        loading={loading}
      />

      {/* Simple Info Card when modal is closed */}
      {!showModal && (
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-2xl p-8 text-white shadow-2xl">
            <Crown className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">Current Plan: {currentPlan}</h1>
            <p className="text-lg opacity-90 mb-4">
              {subscription?.end_date 
                ? `Renews on ${new Date(subscription.end_date).toLocaleDateString()}`
                : 'Manage your subscription'}
            </p>
            <Button
              size="lg"
              onClick={() => setShowModal(true)}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade or Change Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;
