import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, CreditCard, Check, Copy, Sparkles, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface GiftCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase?: (planType: string, billingPeriod: string, price: number, recipientEmail?: string, message?: string) => Promise<void>;
  onRedeem?: (code: string) => Promise<void>;
  profileId?: string;
}

const plans = [
  { id: 'basic', name: 'Basic', monthlyPrice: 10, yearlyPrice: 96, color: 'from-blue-400 to-blue-600' },
  { id: 'premium', name: 'Premium', monthlyPrice: 20, yearlyPrice: 192, color: 'from-purple-500 to-pink-600', popular: true },
  { id: 'pro', name: 'Pro', monthlyPrice: 30, yearlyPrice: 288, color: 'from-orange-500 to-red-600' }
];

// Christmas snowflake animation
const Snowflake = ({ delay }: { delay: number }) => (
  <div 
    className="absolute text-white opacity-70 animate-fall pointer-events-none"
    style={{ 
      left: `${Math.random() * 100}%`,
      animationDelay: `${delay}s`,
      fontSize: `${Math.random() * 10 + 10}px`
    }}
  >
    ❄️
  </div>
);

export function GiftCardModal({ open, onOpenChange, onPurchase, onRedeem, profileId }: GiftCardModalProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'redeem'>('buy');
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('🎄 Code copied to clipboard!');
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const price = selectedPlanData ? (billingPeriod === 'yearly' ? selectedPlanData.yearlyPrice : selectedPlanData.monthlyPrice) : 0;

  const handleMockPurchase = async () => {
    setLoading(true);
    try {
      // Use test profile ID if not signed in
      const testProfileId = profileId || '00000000-0000-0000-0000-000000000000';
      
      // Generate gift card code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_gift_card_code');

      if (codeError) throw codeError;
      const code = codeData as string;

      // Insert gift card
      const { error: insertError } = await supabase
        .from('gift_cards')
        .insert({
          code,
          plan_type: selectedPlan,
          billing_period: billingPeriod,
          pi_amount: price,
          purchased_by_profile_id: testProfileId,
          recipient_email: recipientEmail || null,
          message: message || null,
          status: 'active'
        });

      if (insertError) throw insertError;

      setPurchasedCode(code);
      
      // Send email if recipient email provided
      if (recipientEmail) {
        try {
          await supabase.functions.invoke('send-gift-card-email', {
            body: {
              recipientEmail,
              code,
              planType: selectedPlan,
              billingPeriod,
              message: message || '',
              senderProfileId: testProfileId
            }
          });
          toast.success('🎄 Gift card purchased (Mock) and email sent! 🎁');
        } catch (emailError) {
          console.error('Email send error:', emailError);
          toast.success('Gift card purchased (Mock)! (Email delivery pending)');
        }
      } else {
        toast.success('🧪 Gift card created successfully (Test Mode)! 🎁');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to purchase gift card');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!profileId) {
      toast.error('Please sign in to purchase gift cards');
      return;
    }

    setLoading(true);
    try {
      if (onPurchase) {
        await onPurchase(selectedPlan, billingPeriod, price, recipientEmail, message);
      } else {
        // Default purchase logic
        // Generate gift card code
        const { data: codeData, error: codeError } = await supabase
          .rpc('generate_gift_card_code');

        if (codeError) throw codeError;
        const code = codeData as string;

        // Insert gift card
        const { error: insertError } = await supabase
          .from('gift_cards')
          .insert({
            code,
            plan_type: selectedPlan,
            billing_period: billingPeriod,
            pi_amount: price,
            purchased_by_profile_id: profileId,
            recipient_email: recipientEmail || null,
            message: message || null,
            status: 'active'
          });

        if (insertError) throw insertError;

        setPurchasedCode(code);
        
        // Send email if recipient email provided
        if (recipientEmail) {
          try {
            await supabase.functions.invoke('send-gift-card-email', {
              body: {
                recipientEmail,
                code,
                planType: selectedPlan,
                billingPeriod,
                message: message || '',
                senderProfileId: profileId
              }
            });
            toast.success('🎄 Gift card purchased and email sent! 🎁');
          } catch (emailError) {
            console.error('Email send error:', emailError);
            toast.success('Gift card purchased! (Email delivery pending)');
          }
        } else {
          toast.success('🎄 Gift card purchased successfully! 🎁');
        }
        
        // Reset form
        setRecipientEmail('');
        setMessage('');
      }
    } catch (error: any) {
      console.error('Gift card purchase error:', error);
      toast.error(error.message || 'Failed to purchase gift card');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      toast.error('Please enter a gift card code');
      return;
    }

    setLoading(true);
    try {
      if (onRedeem) {
        await onRedeem(redeemCode.toUpperCase());
      } else {
        // Default redeem logic
        const { data: giftCard, error: fetchError } = await supabase
          .from('gift_cards')
          .select('*')
          .eq('code', redeemCode.toUpperCase())
          .single();

        if (fetchError) throw new Error('Invalid gift card code');
        
        if (giftCard.status !== 'active') {
          throw new Error(`This gift card has been ${giftCard.status}`);
        }

        if (new Date(giftCard.expires_at) < new Date()) {
          throw new Error('This gift card has expired');
        }

        // Mark as redeemed
        const { error: updateError } = await supabase
          .from('gift_cards')
          .update({
            status: 'redeemed',
            redeemed_by_profile_id: profileId,
            redeemed_at: new Date().toISOString()
          })
          .eq('code', redeemCode.toUpperCase());

        if (updateError) throw updateError;

        // Create subscription
        const startDate = new Date();
        const endDate = new Date(startDate);
        
        if (giftCard.billing_period === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            profile_id: profileId,
            plan_type: giftCard.plan_type,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            pi_amount: 0, // Gift card - no payment
            billing_period: giftCard.billing_period,
            auto_renew: false,
          });

        if (subError) throw subError;

        toast.success(`🎉 Gift card redeemed! ${giftCard.plan_type} plan activated!`);
        setRedeemCode('');
        setPurchasedCode(null);
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Redemption error:', error);
      toast.error(error.message || 'Failed to redeem gift card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-red-50 via-white to-green-50 border-2 border-red-200">
        {/* Christmas Snowflakes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <Snowflake key={i} delay={i * 0.3} />
          ))}
        </div>

        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center gap-2 text-3xl bg-gradient-to-r from-red-600 via-green-600 to-red-600 bg-clip-text text-transparent">
            <span className="text-3xl">🎄</span>
            <Gift className="w-7 h-7 text-red-500 animate-bounce" />
            DropLink Gift Cards
            <span className="text-3xl">🎁</span>
          </DialogTitle>
          <DialogDescription className="text-center text-red-700 font-medium">
            🎅 Give the gift of DropLink this Christmas! 🤶
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'buy' | 'redeem')} className="relative z-10">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-red-100 to-green-100 border border-red-200">
            <TabsTrigger value="buy" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              🎁 Buy Gift Card
            </TabsTrigger>
            <TabsTrigger value="redeem" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              🎄 Redeem Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 mt-4">
            {purchasedCode ? (
              <Card className="bg-gradient-to-br from-red-600 via-red-500 to-green-600 text-white border-4 border-yellow-300 shadow-2xl relative overflow-hidden">
                {/* Christmas decorations */}
                <div className="absolute top-0 left-0 text-6xl opacity-20">🎄</div>
                <div className="absolute bottom-0 right-0 text-6xl opacity-20">🎁</div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-9xl opacity-5">❄️</div>
                
                <CardContent className="p-6 space-y-4 relative z-10">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-4xl animate-bounce">🎅</span>
                      <Gift className="w-16 h-16 animate-pulse" />
                      <span className="text-4xl animate-bounce">🤶</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
                      <Sparkles className="w-6 h-6" />
                      Gift Card Created! 
                      <Sparkles className="w-6 h-6" />
                    </h3>
                    <p className="text-white/90 mb-4 text-lg">🎄 Share the Christmas joy! 🎄</p>
                    
                    <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 mb-4 border-2 border-yellow-300 shadow-lg">
                      <p className="text-sm text-white/90 mb-2 font-semibold">🎁 Your Gift Card Code 🎁</p>
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-2xl font-mono font-bold tracking-wider bg-white/20 px-4 py-2 rounded">{purchasedCode}</code>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-white/20 border border-white/50"
                          onClick={() => copyCode(purchasedCode)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-white/90 space-y-2 bg-white/20 rounded-lg p-4 border border-white/30">
                      <p className="flex items-center justify-center gap-2">
                        <span className="text-xl">🎁</span>
                        <strong>Plan:</strong> {selectedPlanData?.name} ({billingPeriod})
                      </p>
                      <p className="flex items-center justify-center gap-2">
                        <span className="text-xl">💎</span>
                        <strong>Value:</strong> {price} Pi
                      </p>
                      {recipientEmail && (
                        <p className="flex items-center justify-center gap-2">
                          <Mail className="w-4 h-4" />
                          <strong>Email sent to:</strong> {recipientEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full bg-white text-red-600 hover:bg-yellow-100 font-bold text-lg"
                    onClick={() => {
                      setPurchasedCode(null);
                      onOpenChange(false);
                    }}
                  >
                    🎄 Done 🎄
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div>
                  <Label className="mb-3 block text-red-700 font-semibold flex items-center gap-2">
                    <span className="text-xl">🎄</span>
                    Select Plan
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {plans.map((plan) => (
                      <Card
                        key={plan.id}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-lg border-2',
                          selectedPlan === plan.id ? 'ring-4 ring-red-500 border-green-500 shadow-xl' : 'border-red-200 hover:border-green-400'
                        )}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <CardContent className="p-4 text-center bg-gradient-to-br from-red-50 to-green-50">
                          <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg`}>
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                          <p className="font-semibold text-green-800">{plan.name}</p>
                          {plan.popular && (
                            <span className="text-xs text-red-600 font-bold flex items-center justify-center gap-1">
                              <Sparkles className="w-3 h-3" /> Popular
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block text-red-700 font-semibold flex items-center gap-2">
                    <span className="text-xl">🎁</span>
                    Billing Period
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Card
                      className={cn(
                        'cursor-pointer transition-all border-2',
                        billingPeriod === 'monthly' ? 'ring-4 ring-red-500 border-green-500 shadow-xl' : 'border-red-200 hover:border-green-400'
                      )}
                      onClick={() => setBillingPeriod('monthly')}
                    >
                      <CardContent className="p-4 text-center bg-gradient-to-br from-red-50 to-white">
                        <p className="font-semibold text-green-800">Monthly</p>
                        <p className="text-2xl font-bold text-red-600">{selectedPlanData?.monthlyPrice} Pi</p>
                      </CardContent>
                    </Card>
                    <Card
                      className={cn(
                        'cursor-pointer transition-all border-2',
                        billingPeriod === 'yearly' ? 'ring-4 ring-red-500 border-green-500 shadow-xl' : 'border-red-200 hover:border-green-400'
                      )}
                      onClick={() => setBillingPeriod('yearly')}
                    >
                      <CardContent className="p-4 text-center bg-gradient-to-br from-green-50 to-white">
                        <p className="font-semibold text-green-800">Yearly</p>
                        <p className="text-2xl font-bold text-red-600">{selectedPlanData?.yearlyPrice} Pi</p>
                        <span className="text-xs text-green-600 font-bold">🎄 Save 20% 🎄</span>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <Label htmlFor="recipient-email" className="text-red-700 font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Recipient Email (We'll send them the code!)
                  </Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    placeholder="friend@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="mt-2 border-red-200 focus:border-green-500"
                  />
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Optional: Leave empty to get the code yourself
                  </p>
                </div>

                <div>
                  <Label htmlFor="message" className="text-red-700 font-semibold flex items-center gap-2">
                    <span className="text-lg">💌</span>
                    Personal Christmas Message
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Merry Christmas! Enjoy your DropLink subscription 🎄🎁"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-2 border-red-200 focus:border-green-500"
                    rows={3}
                  />
                </div>

                <div className="bg-gradient-to-r from-red-100 via-yellow-50 to-green-100 border-2 border-red-300 rounded-lg p-4 shadow-lg">
                  <p className="text-lg font-bold text-red-700 mb-2 flex items-center justify-center gap-2">
                    <span className="text-2xl">🎁</span>
                    Total: {price} Pi
                    <span className="text-2xl">🎄</span>
                  </p>
                  <p className="text-xs text-green-700 text-center">
                    This creates a one-time gift card code for {selectedPlanData?.name} {billingPeriod} subscription
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 via-red-500 to-green-600 hover:from-red-700 hover:to-green-700 text-white font-bold text-lg py-6 shadow-xl border-2 border-yellow-400"
                >
                  {loading ? '🎅 Processing...' : `🎄 Purchase Gift Card for ${price} Pi 🎁`}
                </Button>

                <Button
                  type="button"
                  onClick={handleMockPurchase}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  {loading ? '🧪 Processing...' : '🧪 Mock Purchase (Test Only)'}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="redeem" className="space-y-4 mt-4">
            <Card className="bg-gradient-to-br from-green-100 via-red-50 to-green-100 border-4 border-green-500 shadow-xl relative overflow-hidden">
              <div className="absolute top-2 right-2 text-4xl animate-bounce">🎅</div>
              <div className="absolute bottom-2 left-2 text-4xl animate-bounce delay-75">🤶</div>
              <CardContent className="p-6 text-center relative z-10">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-3xl animate-pulse">🎄</span>
                  <Gift className="w-16 h-16 text-green-600 animate-bounce" />
                  <span className="text-3xl animate-pulse">🎁</span>
                </div>
                <h3 className="text-2xl font-bold mb-2 text-red-700">Got a Christmas Gift Card?</h3>
                <p className="text-sm text-green-700 mb-4 font-medium">
                  Enter your gift card code below to unwrap your subscription! 🎁
                </p>
              </CardContent>
            </Card>

            <div>
              <Label htmlFor="redeem-code" className="text-red-700 font-semibold flex items-center gap-2 mb-2">
                <span className="text-xl">🎁</span>
                Gift Card Code
              </Label>
              <Input
                id="redeem-code"
                type="text"
                placeholder="DL-XXXX-XXXX-XXXX"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider border-2 border-green-400 focus:border-red-500 bg-gradient-to-r from-red-50 to-green-50"
                maxLength={16}
              />
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Enter the 16-character code from your Christmas gift card
              </p>
            </div>

            <Button
              type="button"
              onClick={handleRedeem}
              disabled={loading || !redeemCode.trim()}
              className="w-full bg-gradient-to-r from-green-600 via-red-500 to-green-600 hover:from-green-700 hover:to-green-700 text-white font-bold text-lg py-6 shadow-xl border-2 border-yellow-400"
            >
              {loading ? '🎅 Unwrapping Gift...' : '🎄 Redeem Christmas Gift Card 🎁'}
            </Button>

            <div className="text-xs text-green-700 space-y-2 pt-4 border-t-2 border-green-300 bg-gradient-to-r from-red-50 to-green-50 p-4 rounded-lg">
              <p className="flex items-center gap-2">🎄 Gift cards are valid for 1 year</p>
              <p className="flex items-center gap-2">🎁 Each code can only be used once</p>
              <p className="flex items-center gap-2">✨ Subscription starts immediately</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
