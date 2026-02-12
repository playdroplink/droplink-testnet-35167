import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Wallet,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

interface A2UPaymentRecord {
  payment_id: string;
  status: string;
  txid: string | null;
  metadata: any;
  created_at: string;
}

const A2UPayment = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("send");
  
  // Send form state
  const [recipientUid, setRecipientUid] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [lastPaymentResult, setLastPaymentResult] = useState<any>(null);
  
  // History state
  const [payments, setPayments] = useState<A2UPaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Optional override: route A2U calls to Lovable Cloud Functions endpoint
  // Example: https://<project-ref>.supabase.co/functions/v1
  const functionsBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const invokeA2U = async (body: Record<string, unknown>) => {
    if (functionsBaseUrl) {
      const endpoint = `${functionsBaseUrl.replace(/\/$/, '')}/a2u-payment`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
        },
        body: JSON.stringify(body),
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = { success: false, error: await response.text() };
      }

      if (!response.ok) {
        const details = payload?.error || payload?.message || response.statusText;
        throw new Error(`A2U Edge Function ${response.status}: ${details}`);
      }

      return { data: payload, error: null as any };
    }

    return supabase.functions.invoke('a2u-payment', { body });
  };

  // Load payment history
  const loadPayments = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await invokeA2U({ action: 'list' });

      if (error) {
        console.error('Failed to load A2U payment history:', error);
        return;
      }

      if (data?.success) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Failed to load A2U payment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Send A2U payment
  const handleSendPayment = async () => {
    if (!recipientUid.trim()) {
      toast.error("Please enter the recipient's Pi UID");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!memo.trim()) {
      toast.error("Please enter a memo/description");
      return;
    }

    setSending(true);
    setLastPaymentResult(null);

    try {
      console.log('[A2U] Initiating A2U payment...', { recipientUid, amount, memo });

      const { data, error } = await invokeA2U({
        action: 'create',
        recipientUid: recipientUid.trim(),
        amount: parseFloat(amount),
        memo: memo.trim(),
        metadata: {
          source: 'droplink_a2u',
          sentAt: new Date().toISOString(),
        },
      });

      if (error) {
        console.error('[A2U] Edge function error:', error);
        throw new Error(error.message || 'Failed to create A2U payment');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'A2U payment failed');
      }

      console.log('[A2U] ✅ Payment created:', data);
      setLastPaymentResult(data);
      toast.success(`Successfully sent ${amount} Pi to user!`);
      
      // Reset form
      setRecipientUid("");
      setAmount("");
      setMemo("");
      
      // Refresh history
      loadPayments();
    } catch (error: any) {
      console.error('[A2U] Payment error:', error);
      toast.error(error.message || 'Failed to send A2U payment', {
        description: 'Check VITE_SUPABASE_FUNCTIONS_URL and deployed a2u-payment function.'
      });
      setLastPaymentResult({ success: false, error: error.message });
    } finally {
      setSending(false);
    }
  };

  // Check payment status
  const handleCheckStatus = async (paymentId: string) => {
    try {
      const { data, error } = await invokeA2U({ action: 'status', paymentId });

      if (data?.success) {
        toast.success(`Payment status: ${JSON.stringify(data.payment?.status || 'unknown')}`);
        loadPayments();
      } else {
        toast.error(data?.error || 'Failed to check status');
      }
    } catch (error: any) {
      toast.error(error.message || 'Status check failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'a2u_created':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="w-3 h-3 mr-1" /> Created</Badge>;
      case 'a2u_approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300"><ArrowUpRight className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'a2u_completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            A2U Payments
          </h1>
          <p className="text-sm text-muted-foreground">App-to-User Pi Payments</p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-4 border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          A2U (App-to-User) payments let your app send Pi directly to users. This uses the Pi Platform API server-side to initiate payments from the app's wallet to a user's Pi wallet.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="send" className="flex-1 gap-2">
            <Send className="w-4 h-4" /> Send Pi
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-2">
            <Clock className="w-4 h-4" /> History
          </TabsTrigger>
        </TabsList>

        {/* SEND TAB */}
        <TabsContent value="send">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Send Pi to User</h2>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="recipientUid" className="text-sm font-medium">
                  Recipient Pi UID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recipientUid"
                  placeholder="Enter Pioneer's UID (e.g., abc123-def456...)"
                  value={recipientUid}
                  onChange={(e) => setRecipientUid(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The unique identifier of the Pi user. Obtainable via Pi.authenticate().
                </p>
              </div>

              <div>
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount (Pi) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="memo" className="text-sm font-medium">
                  Memo / Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="memo"
                  placeholder="e.g., Reward for completing task, Cashback, Referral bonus..."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSendPayment}
                disabled={sending || !recipientUid || !amount || !memo}
                className="w-full h-12 text-base font-semibold gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending Payment...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send {amount ? `${amount} Pi` : 'Payment'}
                  </>
                )}
              </Button>
            </div>

            {/* Last Payment Result */}
            {lastPaymentResult && (
              <div className={`mt-4 p-4 rounded-lg border ${
                lastPaymentResult.success 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                  : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {lastPaymentResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold text-sm">
                    {lastPaymentResult.success ? 'Payment Sent!' : 'Payment Failed'}
                  </span>
                </div>
                {lastPaymentResult.paymentId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Payment ID: {lastPaymentResult.paymentId}
                  </p>
                )}
                {lastPaymentResult.error && (
                  <p className="text-xs text-red-600 mt-1">{lastPaymentResult.error}</p>
                )}
                {lastPaymentResult.message && (
                  <p className="text-xs text-muted-foreground mt-1">{lastPaymentResult.message}</p>
                )}
              </div>
            )}
          </Card>

          {/* How it Works */}
          <Card className="p-4 mt-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              How A2U Payments Work
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Your server creates an A2U payment via Pi API with the recipient's UID</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Pi Network processes the payment and approves the blockchain transaction</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>The Pi is transferred from the app wallet to the user's Pi wallet</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary">4.</span>
                <span>The server completes the payment and records the transaction</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Payment History
              </h2>
              <Button variant="outline" size="sm" onClick={loadPayments} disabled={loadingHistory}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No A2U payments yet</p>
                <p className="text-xs">Send your first payment to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.payment_id}
                    className="p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">
                          {payment.metadata?.amount ? `${payment.metadata.amount} Pi` : 'N/A'}
                        </span>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      To: {payment.metadata?.recipientUid || 'Unknown'}
                    </p>
                    {payment.metadata?.memo && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{payment.metadata.memo}"
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()} {new Date(payment.created_at).toLocaleTimeString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleCheckStatus(payment.payment_id)}
                      >
                        Check Status
                      </Button>
                    </div>
                    {payment.txid && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        TX: {payment.txid.substring(0, 20)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default A2UPayment;
