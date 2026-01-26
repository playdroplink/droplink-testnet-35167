import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Droplets, Gift, ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, TrendingUp, History, Settings, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { usePi } from "@/contexts/PiContext";
import { DropTokenManager } from "@/components/DropTokenManager";
import { PageHeader } from "@/components/PageHeader";
import { FooterNav } from "@/components/FooterNav";
import { PI_CONFIG } from '@/config/pi-config';

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
  const { piUser, isAuthenticated, dropBalance, getDROPBalance } = usePi();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [dropTokenBalance, setDropTokenBalance] = useState<string>('0');
  const [piNetworkConnected, setPiNetworkConnected] = useState<boolean>(false);

  // DROP Token configuration
  const DROP_TOKEN = {
    code: 'DROP',
    colors: {
      primary: '#0ea5e9', // Sky blue
      secondary: '#0284c7',
      accent: '#38bdf8',
      background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)'
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [piUser]);

  const loadWalletData = async () => {
    try {
      if (!isAuthenticated || !piUser) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", piUser.username)
        .maybeSingle();

      if (!profile) {
        toast.error("Profile not found");
        navigate("/");
        return;
      }

      setProfileId(profile.id);

      // Load legacy wallet balance (for gift transactions)
      const { data: wallet, error: walletSelectError } = await supabase
        .from("user_wallets")
        .select("drop_tokens")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (walletSelectError) {
        console.error("Error loading balance:", walletSelectError);
      }

      if (!wallet) {
        // Auto-create wallet row for this profile to satisfy RLS policies
        const { error: walletCreateError } = await supabase
          .from("user_wallets")
          .upsert({
            profile_id: profile.id,
            drop_tokens: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "profile_id" });
        if (walletCreateError) {
          console.error("Failed to initialize wallet:", walletCreateError);
        }
        setBalance(0);
      } else {
        setBalance(wallet.drop_tokens || 0);
      }

      // Load DROP token balance from Pi Network
      if (getDROPBalance) {
        try {
          const dropBalance = await getDROPBalance();
          setDropTokenBalance(dropBalance?.balance || '0');
          setPiNetworkConnected(true);
        } catch (error) {
          console.error('Failed to load DROP balance:', error);
          setPiNetworkConnected(false);
        }
      }

      // Load gift transactions
      await loadTransactions(profile.id);
    } catch (error) {
      console.error("Error loading wallet:", error);
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (profileId: string) => {
    try {
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
        .eq("sender_profile_id", profileId)
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
        .eq("receiver_profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(20);

      const allTransactions = [
        ...(sent || []).map((t: any) => ({ ...t, isSent: true })),
        ...(received || []).map((t: any) => ({ ...t, isSent: false })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions as any);
    } catch (error) {
      console.error("Error loading transactions:", error);
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



  return (
    <div>
      <PageHeader 
        title="Wallet" 
        description="Manage your DROP tokens and gifts"
        icon={<WalletIcon className="w-6 h-6" />}
      />
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 max-w-4xl pb-24">
        {/* Header Card with Gradient Background */}
        <Card className="mb-6 border-0 shadow-lg" style={{ background: DROP_TOKEN.colors.background }}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-foreground text-2xl">
            <Droplets className="w-8 h-8 text-foreground" />
            <span className="text-foreground">DropLink Wallet</span>
          </CardTitle>
          <p className="text-muted-foreground">Manage your DROP tokens and gift transactions</p>
        </CardHeader>
        <CardContent className="text-center text-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pi Network DROP Balance */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Droplets className="w-6 h-6 text-foreground" />
                <span className="text-foreground font-medium">Pi Network</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">
                {parseFloat(dropTokenBalance).toLocaleString()} DROP
              </div>
              <div className="flex items-center justify-center gap-2">
                {piNetworkConnected ? (
                  <Badge variant="outline" className="border-border text-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </div>

            {/* Legacy Platform Balance */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Droplets className="w-6 h-6 text-foreground" />
                <span className="text-foreground font-medium">Platform</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">
                {balance.toLocaleString()}
              </div>
              <p className="text-muted-foreground text-sm">Legacy DropTokens</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Wallet Tabs */}
      <Card>
        <Tabs defaultValue="earn" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {/* DROP Wallet tab hidden for now */}
            <TabsTrigger value="earn" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Earn</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* DROP Wallet Tab - Hidden for now */}
          {/* Temporarily disabled DROP wallet feature */}

          {/* Earn Tab */}
          <TabsContent value="earn" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" style={{ color: DROP_TOKEN.colors.primary }} />
                  Earn DROP Tokens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Legacy Platform Earning */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    Platform DropTokens
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Purchase legacy tokens for platform features and gifts
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Button onClick={() => buyTokens(100)} className="flex flex-col h-auto py-4">
                      <span className="text-2xl font-bold">100</span>
                      <span className="text-xs">0.99 Pi</span>
                    </Button>
                    <Button onClick={() => buyTokens(500)} className="flex flex-col h-auto py-4">
                      <span className="text-2xl font-bold">500</span>
                      <span className="text-xs">4.99 Pi</span>
                    </Button>
                    <Button onClick={() => buyTokens(1000)} className="flex flex-col h-auto py-4">
                      <span className="text-2xl font-bold">1000</span>
                      <span className="text-xs">9.99 Pi</span>
                    </Button>
                  </div>
                </div>

                {/* Pi Network DROP Earning */}
                <div className="border rounded-lg p-4" style={{ borderColor: DROP_TOKEN.colors.primary + '50' }}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Droplets className="w-4 h-4" style={{ color: DROP_TOKEN.colors.primary }} />
                    Pi Network DROP Tokens
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Earn real DROP tokens on Pi Network blockchain
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-muted/50 p-3 rounded text-center">
                      <div className="text-lg font-bold" style={{ color: DROP_TOKEN.colors.primary }}>+50 DROP</div>
                      <div className="text-xs text-muted-foreground">Complete Profile</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded text-center">
                      <div className="text-lg font-bold" style={{ color: DROP_TOKEN.colors.primary }}>+100 DROP</div>
                      <div className="text-xs text-muted-foreground">Share Bio Page</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded text-center">
                      <div className="text-lg font-bold" style={{ color: DROP_TOKEN.colors.primary }}>+200 DROP</div>
                      <div className="text-xs text-muted-foreground">Refer Friends</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded text-center">
                      <div className="text-lg font-bold" style={{ color: DROP_TOKEN.colors.primary }}>+25 DROP</div>
                      <div className="text-xs text-muted-foreground">Daily Check-in</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Start sending gifts to see your transaction history</p>
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Wallet Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Account Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <span className="text-sm">Pi Network</span>
                        {isAuthenticated ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Disconnected
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <span className="text-sm">DROP Tokens</span>
                        {piNetworkConnected ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Setup Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Useful Links</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a 
                          href="https://droplink.space/.well-known/pi.toml"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          DROP Token Information (TOML)
                        </a>
                      </Button>
                      
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a 
                            href={`${PI_CONFIG.ENDPOINTS.PI_ASSET_DISCOVERY}?asset_code=DROP&asset_issuer=GBVTV77XFMDYSSVIG6ZGSRAGZ3S7KA4275YYLOLIROOD3Y3F3TH5U3EI`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Pi Explorer
                        </a>
                      </Button>
                      
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a 
                          href="https://pi.network"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Pi Network Official
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>
      </div>
      <FooterNav />
    </div>
  );
};

export default Wallet;
