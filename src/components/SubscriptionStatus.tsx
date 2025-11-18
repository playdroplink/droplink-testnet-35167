import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Pi,
  Shield
} from 'lucide-react';
import { usePi } from '@/contexts/PiContext';
import { useNavigate } from 'react-router-dom';
import { useActiveSubscription } from '@/hooks/useActiveSubscription';

const SubscriptionStatus: React.FC = () => {
  const { isAuthenticated, piUser, signIn } = usePi();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { subscription, isLoading, isActive } = useActiveSubscription();

  const handlePiAuth = async () => {
    setIsSigningIn(true);
    try {
      await signIn(['username', 'payments', 'wallet_address']);
    } catch (error) {
      console.error('Pi authentication failed:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  interface PlanFeatures {
    name: string;
    features: string[];
    color: string;
    limitedFeatures?: string[];
    priceMonthly?: string;
    priceYearly?: string;
  }

  const getPlanFeatures = (planType: string): PlanFeatures => {
    const features: Record<string, PlanFeatures> = {
      free: {
        name: 'Free',
        features: [
          '1 bio page link',
          '1 social media link', 
          'Basic QR code sharing',
          'DropLink watermark',
          'Limited customization',
          'Community support only',
          'Basic analytics (views only)'
        ],
        color: 'bg-gray-50 border-gray-200',
        limitedFeatures: ['Ad-supported experience', 'Limited themes', 'No custom domain']
      },
      premium: {
        name: 'Premium',
        features: [
          'Unlimited bio page links',
          'Unlimited social media links',
          'YouTube video integration', 
          'Pi Network wallet tips',
          'Custom themes & colors',
          'Remove DropLink watermark',
          'Advanced analytics dashboard',
          'Priority email support',
          'Custom domain support',
          'Ad-free experience'
        ],
        color: 'bg-blue-50 border-blue-200',
        priceMonthly: '10π',
        priceYearly: '96π (save 20%)'
      },
      pro: {
        name: 'Pro', 
        features: [
          'Everything in Premium',
          'AI-powered analytics insights',
          'Advanced visitor tracking',
          'Location-based analytics', 
          'A/B testing for links',
          'API access for integrations',
          'White-label solutions',
          '24/7 priority support',
          'Bulk link management',
          'Export analytics data'
        ],
        color: 'bg-purple-50 border-purple-200',
        priceMonthly: '20π',
        priceYearly: '192π (save 20%)'
      },
      enterprise: {
        name: 'Enterprise',
        features: [
          'Everything in Pro',
          'Multi-team collaboration',
          'Advanced security features',
          'Custom integrations',
          'Dedicated account manager',
          'SLA guarantee (99.9% uptime)',
          'Custom feature development', 
          'Advanced compliance tools',
          'Unlimited API calls',
          'Phone support'
        ],
        color: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200',
        priceMonthly: '30π',
        priceYearly: '288π (save 20%)'
      }
    };
    return features[planType] || features.free;
  };

  if (!isAuthenticated) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Shield className="h-5 w-5" />
            Pi Network Authentication Required
          </CardTitle>
          <CardDescription className="text-amber-700">
            Sign in with Pi Network to access subscription management and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Pi className="h-4 w-4" />
              <AlertDescription>
                Connect your Pi Network account to:
                <ul className="mt-2 ml-4 list-disc text-sm">
                  <li>Manage your subscription plans</li>
                  <li>Process payments with Pi cryptocurrency</li>
                  <li>Access premium features</li>
                  <li>Sync your profile data</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handlePiAuth}
              disabled={isSigningIn}
              className="w-full"
              size="lg"
            >
              <Pi className="h-5 w-5 mr-2" />
              {isSigningIn ? 'Connecting to Pi Network...' : 'Sign in with Pi Network'}
            </Button>
            
            <p className="text-xs text-center text-amber-600">
              Secure authentication using Pi Network's official SDK
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-2">Loading subscription status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planInfo = getPlanFeatures(subscription?.plan_type || 'free');
  const daysLeft = subscription?.end_date ? calculateDaysLeft(subscription.end_date) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  return (
    <Card className={`bg-white/95 backdrop-blur-sm shadow-md border border-gray-200 ${planInfo.color} transition-all duration-200`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription Status
          </CardTitle>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-green-100 text-green-800" : ""}
          >
            {planInfo.name}
          </Badge>
        </div>
        <CardDescription>
          Manage your DropLink subscription and billing
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
          <Pi className="h-6 w-6 text-blue-600" />
          <div>
            <p className="font-medium">Connected as: {piUser?.username}</p>
            <p className="text-sm text-muted-foreground">Pi Network Account</p>
          </div>
        </div>

        {/* Subscription Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Plan:</span>
            <span className="font-semibold">{planInfo.name}</span>
          </div>
          
          {subscription && subscription.plan_type !== 'free' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Billing Period:</span>
                <span className="capitalize">{subscription.billing_period}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Amount Paid:</span>
                <span className="font-semibold">{subscription.pi_amount} π</span>
              </div>
              
              {daysLeft !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {isExpired ? 'Expired' : 'Expires in'}:
                  </span>
                  <span className={`font-semibold ${
                    isExpired ? 'text-red-600' : 
                    isExpiringSoon ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {isExpired ? 'Expired' : `${daysLeft} days`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Plan Features */}
        <div className="bg-white/50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Plan Features:</h4>
            {planInfo.priceMonthly && (
              <div className="text-right">
                <div className="text-sm font-semibold text-blue-600">{planInfo.priceMonthly}/month</div>
                <div className="text-xs text-muted-foreground">{planInfo.priceYearly}/year</div>
              </div>
            )}
          </div>
          <ul className="text-sm space-y-1">
            {planInfo.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
          {planInfo.limitedFeatures && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-muted-foreground mb-1">Free plan limitations:</p>
              <ul className="text-xs space-y-1">
                {planInfo.limitedFeatures.map((limitation, index) => (
                  <li key={index} className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Alerts */}
        {isExpired && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Your subscription has expired. Renew now to continue using premium features.
            </AlertDescription>
          </Alert>
        )}

        {isExpiringSoon && !isExpired && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Your subscription expires in {daysLeft} days. Renew soon to avoid service interruption.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => navigate('/subscription')}
            variant={subscription?.plan_type === 'free' ? "default" : "outline"}
            className="flex-1"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {subscription?.plan_type === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
          </Button>
          
          {(isExpired || isExpiringSoon) && subscription?.plan_type !== 'free' && (
            <Button 
              onClick={() => navigate('/subscription')}
              variant="default"
              className="flex-1"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Renew Now
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        {subscription && subscription.plan_type !== 'free' && (
          <div className="text-xs text-muted-foreground bg-white/30 p-2 rounded">
            <p>Subscription ID: {subscription.id?.slice(0, 8)}...</p>
            <p>Started: {new Date(subscription.start_date).toLocaleDateString()}</p>
            <p>Auto-renew: {subscription.auto_renew ? 'Enabled' : 'Disabled'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;