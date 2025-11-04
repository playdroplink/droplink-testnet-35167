import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, Coins, Gift, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Transaction {
  id: string;
  created_at: string;
  sender_profile: { business_name: string };
  receiver_profile: { business_name: string };
  gift: { name: string; icon: string };
  drop_tokens_spent: number;
  isSent: boolean;
}

const Wallet = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profile not found");
        navigate("/");
        return;
      }

      setProfileId(profile.id);

      // Load wallet balance
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("drop_tokens")
        .eq("profile_id", profile.id)
        .single();

      setBalance(wallet?.drop_tokens || 0);

      // Load transactions (sent and received)
      const { data: sent } = await supabase
        .from("gift_transactions")
        .select(`
          id,
          created_at,
          drop_tokens_spent,
          receiver_profile:profiles!gift_transactions_receiver_profile_id_fkey(business_name),
          sender_profile:profiles!gift_transactions_sender_profile_id_fkey(business_name),
          gift:gifts(name, icon)
        `)
        .eq("sender_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: received } = await supabase
        .from("gift_transactions")
        .select(`
          id,
          created_at,
          drop_tokens_spent,
          receiver_profile:profiles!gift_transactions_receiver_profile_id_fkey(business_name),
          sender_profile:profiles!gift_transactions_sender_profile_id_fkey(business_name),
          gift:gifts(name, icon)
        `)
        .eq("receiver_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const allTransactions = [
        ...(sent || []).map((t: any) => ({ ...t, isSent: true })),
        ...(received || []).map((t: any) => ({ ...t, isSent: false })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions as any);
    } catch (error) {
      console.error("Error loading wallet:", error);
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const buyTokens = async (amount: number) => {
    if (!profileId) return;

    try {
      const { error } = await supabase
        .from("user_wallets")
        .update({ drop_tokens: balance + amount })
        .eq("profile_id", profileId);

      if (error) throw error;

      setBalance(balance + amount);
      toast.success(`Purchased ${amount} DropTokens!`);
    } catch (error) {
      console.error("Error buying tokens:", error);
      toast.error("Failed to purchase tokens");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="w-6 h-6" />
            My Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="w-8 h-8 text-primary" />
              <p className="text-4xl font-bold">{balance}</p>
            </div>
            <p className="text-muted-foreground">DropTokens</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button onClick={() => buyTokens(100)} className="flex flex-col h-auto py-4">
              <span className="text-2xl font-bold">100</span>
              <span className="text-xs">$0.99</span>
            </Button>
            <Button onClick={() => buyTokens(500)} className="flex flex-col h-auto py-4">
              <span className="text-2xl font-bold">500</span>
              <span className="text-xs">$4.99</span>
            </Button>
            <Button onClick={() => buyTokens(1000)} className="flex flex-col h-auto py-4">
              <span className="text-2xl font-bold">1000</span>
              <span className="text-xs">$9.99</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Gift History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No gift transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {transaction.isSent ? (
                      <ArrowUpRight className="w-5 h-5 text-red-500" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-2xl">{transaction.gift.icon}</span>
                    <div>
                      <p className="font-medium">
                        {transaction.isSent ? "Sent to" : "Received from"}{" "}
                        {transaction.isSent
                          ? transaction.receiver_profile.business_name
                          : transaction.sender_profile.business_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${transaction.isSent ? "text-red-500" : "text-green-500"}`}>
                      {transaction.isSent ? "-" : "+"}
                      {transaction.drop_tokens_spent}
                    </p>
                    <p className="text-xs text-muted-foreground">DropTokens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Wallet;
