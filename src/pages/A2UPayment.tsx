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
  ArrowLeft, Send, Wallet, Users, Clock, CheckCircle2, XCircle,
  Loader2, Info, ArrowUpRight, RefreshCw, ArrowDownToLine,
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

  // Send form
  const [recipientUid, setRecipientUid] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Withdraw form
  const [withdrawUid, setWithdrawUid] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMemo, setWithdrawMemo] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<any>(null);

  // History
  const [payments, setPayments] = useState<A2UPaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadPayments = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.functions.invoke('a2u-payment', {
        body: { action: 'list' },
      });
      if (!error && data?.success) setPayments(data.payments || []);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { loadPayments(); }, []);

  // Send A2U
  const handleSend = async () => {
    if (!recipientUid.trim()) return toast.error("Enter recipient UID");
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter valid amount");
    if (!memo.trim()) return toast.error("Enter a memo");

    setSending(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('a2u-payment', {
        body: {
          action: 'create',
          recipientUid: recipientUid.trim(),
          amount: parseFloat(amount),
          memo: memo.trim(),
          metadata: { source: 'droplink_a2u', sentAt: new Date().toISOString() },
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed');

      setLastResult(data);
      toast.success(`Sent ${amount} Pi successfully!`);
      setRecipientUid(""); setAmount(""); setMemo("");
      loadPayments();
    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
      setLastResult({ success: false, error: e.message });
    } finally {
      setSending(false);
    }
  };

  // Withdraw A2U
  const handleWithdraw = async () => {
    if (!withdrawUid.trim()) return toast.error("Enter your Pi UID");
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return toast.error("Enter valid amount");

    setWithdrawing(true);
    setWithdrawResult(null);
    try {
      // Get profile from localStorage
      const storedAuth = localStorage.getItem('pi-auth-state');
      const profileData = storedAuth ? JSON.parse(storedAuth) : null;
      
      // Try to find profileId
      let profileId = profileData?.profile?.id;
      if (!profileId) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', profileData?.user?.username || withdrawUid)
          .maybeSingle();
        profileId = p?.id;
      }

      if (!profileId) throw new Error('Could not find your profile. Please sign in first.');

      const { data, error } = await supabase.functions.invoke('a2u-payment', {
        body: {
          action: 'withdraw',
          recipientUid: withdrawUid.trim(),
          amount: parseFloat(withdrawAmount),
          memo: withdrawMemo.trim() || 'User withdrawal',
          profileId,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Withdrawal failed');

      setWithdrawResult(data);
      toast.success(`Withdrew ${withdrawAmount} Pi successfully!`);
      setWithdrawUid(""); setWithdrawAmount(""); setWithdrawMemo("");
      loadPayments();
    } catch (e: any) {
      toast.error(e.message || 'Withdrawal failed');
      setWithdrawResult({ success: false, error: e.message });
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status.includes('completed')) return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
    if (status.includes('approved') || status.includes('submitted')) return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300"><ArrowUpRight className="w-3 h-3 mr-1" /> {status.includes('submitted') ? 'Submitted' : 'Approved'}</Badge>;
    if (status.includes('failed') || status.includes('cancelled')) return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
    if (status.includes('created')) return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="w-3 h-3 mr-1" /> Created</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const ResultCard = ({ result }: { result: any }) => (
    result && (
      <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200 dark:bg-green-950/20' : 'bg-red-50 border-red-200 dark:bg-red-950/20'}`}>
        <div className="flex items-center gap-2 mb-2">
          {result.success ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <span className="font-semibold text-sm">{result.success ? 'Success!' : 'Failed'}</span>
        </div>
        {result.paymentId && <p className="text-xs text-muted-foreground font-mono">Payment ID: {result.paymentId}</p>}
        {result.txid && <p className="text-xs text-muted-foreground font-mono">TX: {result.txid}</p>}
        {result.error && <p className="text-xs text-red-600 mt-1">{result.error}</p>}
        {result.message && <p className="text-xs text-muted-foreground mt-1">{result.message}</p>}
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            A2U Payments
          </h1>
          <p className="text-sm text-muted-foreground">App-to-User Pi Payments & Withdrawals</p>
        </div>
      </div>

      <Alert className="mb-4 border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          Send Pi to users or process withdrawals. Uses Pi Platform API with Stellar blockchain transactions.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="send" className="flex-1 gap-1">
            <Send className="w-4 h-4" /> Send
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="flex-1 gap-1">
            <ArrowDownToLine className="w-4 h-4" /> Withdraw
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1">
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
                <Label>Recipient Pi UID <span className="text-destructive">*</span></Label>
                <Input placeholder="User's Pi UID from authenticate()" value={recipientUid} onChange={(e) => setRecipientUid(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Amount (Pi) <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Memo <span className="text-destructive">*</span></Label>
                <Textarea placeholder="e.g., Reward, Cashback, Referral bonus..." value={memo} onChange={(e) => setMemo(e.target.value)} className="mt-1" rows={2} />
              </div>
              <Button onClick={handleSend} disabled={sending || !recipientUid || !amount || !memo} className="w-full h-12 text-base font-semibold gap-2">
                {sending ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : <><Send className="w-5 h-5" /> Send {amount ? `${amount} Pi` : ''}</>}
              </Button>
            </div>
            <ResultCard result={lastResult} />
          </Card>
        </TabsContent>

        {/* WITHDRAW TAB */}
        <TabsContent value="withdraw">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownToLine className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Withdraw Pi</h2>
            </div>
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                Withdraw Pi from the app wallet to your personal Pi wallet. Enter your Pi UID (obtained when you signed in).
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <div>
                <Label>Your Pi UID <span className="text-destructive">*</span></Label>
                <Input placeholder="Your Pi user UID" value={withdrawUid} onChange={(e) => setWithdrawUid(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Amount (Pi) <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Memo (optional)</Label>
                <Input placeholder="Withdrawal reason..." value={withdrawMemo} onChange={(e) => setWithdrawMemo(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={handleWithdraw} disabled={withdrawing || !withdrawUid || !withdrawAmount} className="w-full h-12 text-base font-semibold gap-2" variant="default">
                {withdrawing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><ArrowDownToLine className="w-5 h-5" /> Withdraw {withdrawAmount ? `${withdrawAmount} Pi` : ''}</>}
              </Button>
            </div>
            <ResultCard result={withdrawResult} />
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Payment History
              </h2>
              <Button variant="outline" size="sm" onClick={loadPayments} disabled={loadingHistory}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No payments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.payment_id} className="p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {p.status.includes('withdrawal') ? <ArrowDownToLine className="w-4 h-4 text-amber-500" /> : <Users className="w-4 h-4 text-primary" />}
                        <span className="text-sm font-medium">{p.metadata?.amount ? `${p.metadata.amount} Pi` : 'N/A'}</span>
                        {p.status.includes('withdrawal') && <Badge variant="outline" className="text-xs">Withdrawal</Badge>}
                      </div>
                      {getStatusBadge(p.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">To: {p.metadata?.recipientUid || 'Unknown'}</p>
                    {p.metadata?.memo && <p className="text-xs text-muted-foreground mt-1 italic">"{p.metadata.memo}"</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                    </div>
                    {p.txid && <p className="text-xs text-muted-foreground font-mono mt-1">TX: {p.txid.substring(0, 24)}...</p>}
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
