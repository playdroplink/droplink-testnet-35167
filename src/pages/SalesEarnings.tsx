import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Download, Wallet, Eye } from "lucide-react";

interface Sale {
  id: string;
  product_id: string;
  product_title: string;
  buyer_name: string;
  amount: string;
  currency: string;
  created_at: string;
  payment_method: "pi" | "droppay";
}

interface Product {
  id: string;
  title: string;
  total_sales: number;
  sale_count: number;
  revenue: number;
}

const SalesEarnings: React.FC = () => {
  const { piUser } = usePi();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileId = async () => {
      if (!piUser?.username) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", piUser.username)
        .maybeSingle();
        
      if (profile) setProfileId(profile.id);
    };
    fetchProfileId();
  }, [piUser]);

  useEffect(() => {
    if (profileId) {
      fetchSalesData();
    }
  }, [profileId]);

  const fetchSalesData = async () => {
    if (!profileId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch payment transactions (product sales)
      const { data: transactions, error: txError } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("profile_id", profileId)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      
      if (txError) throw txError;

      // Fetch subscription transactions (subscription sales)
      const { data: subscriptions, error: subError } = await supabase
        .from("subscription_transactions")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });
      
      if (subError) throw subError;

      // Process sales data
      const allSales: Sale[] = [];
      let totalRevenue = 0;
      const productStats: { [key: string]: Product } = {};

      // Process product sales
      if (transactions) {
        for (const tx of transactions) {
          const amount = parseFloat(tx.amount || "0");
          totalRevenue += amount;

          const productId = tx.pi_metadata?.product_id || "unknown";
          const productTitle = tx.pi_metadata?.product_title || "Unknown Product";

          allSales.push({
            id: tx.id,
            product_id: productId,
            product_title: productTitle,
            buyer_name: tx.buyer_name || "Anonymous",
            amount: tx.amount,
            currency: tx.currency || "Pi",
            created_at: tx.created_at,
            payment_method: "droppay",
          });

          // Aggregate product stats
          if (!productStats[productId]) {
            productStats[productId] = {
              id: productId,
              title: productTitle,
              total_sales: 0,
              sale_count: 0,
              revenue: 0,
            };
          }
          productStats[productId].total_sales += 1;
          productStats[productId].sale_count += 1;
          productStats[productId].revenue += amount;
        }
      }

      // Process subscription sales
      if (subscriptions) {
        for (const sub of subscriptions) {
          const amount = parseFloat(sub.amount || "0");
          totalRevenue += amount;

          allSales.push({
            id: sub.id,
            product_id: "subscription",
            product_title: sub.plan_type || "Subscription",
            buyer_name: sub.buyer_username || "Anonymous",
            amount: sub.amount,
            currency: sub.currency || "Pi",
            created_at: sub.created_at,
            payment_method: "pi",
          });

          // Aggregate subscription stats
          if (!productStats["subscription"]) {
            productStats["subscription"] = {
              id: "subscription",
              title: "Subscription Plans",
              total_sales: 0,
              sale_count: 0,
              revenue: 0,
            };
          }
          productStats["subscription"].sale_count += 1;
          productStats["subscription"].revenue += amount;
        }
      }

      setSales(allSales);
      setProducts(Object.values(productStats));
      setTotalEarnings(totalRevenue);
      setTotalSales(allSales.length);
    } catch (err) {
      console.error("Error fetching sales:", err);
      setError("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > totalEarnings) {
      toast.error("Withdrawal amount exceeds available balance");
      return;
    }

    setLoading(true);
    try {
      // Create withdrawal record
      const { error } = await supabase.from("withdrawals").insert({
        profile_id: profileId,
        amount: withdrawalAmount,
        status: "pending",
        requested_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Withdrawal request submitted! Admin will process it soon.");
      setWithdrawalAmount("");
      // Refresh sales data
      fetchSalesData();
    } catch (err) {
      console.error("Withdrawal error:", err);
      toast.error("Failed to process withdrawal request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Sales & Earnings</h1>
          <p className="text-slate-400">Track your revenue and manage withdrawals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Earnings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-400">{totalEarnings.toFixed(2)} π</p>
                </div>
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <DollarSign className="text-green-400" size={28} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Sales */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Transactions</p>
                  <p className="text-3xl font-bold text-blue-400">{totalSales}</p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <TrendingUp className="text-blue-400" size={28} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Sale */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Average Sale</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {totalSales > 0 ? (totalEarnings / totalSales).toFixed(2) : "0"} π
                  </p>
                </div>
                <div className="bg-purple-500/20 p-3 rounded-lg">
                  <Wallet className="text-purple-400" size={28} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Section */}
        <Card className="mb-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Download size={20} />
              Request Withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdrawal} className="space-y-4">
              <div>
                <p className="text-slate-400 text-sm mb-2">Available Balance: {totalEarnings.toFixed(2)} π</p>
                <Input
                  type="number"
                  placeholder="Enter withdrawal amount"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  max={totalEarnings}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading || totalEarnings === 0}
              >
                {loading ? "Processing..." : "Request Withdrawal"}
              </Button>
            </form>
            {error && <p className="text-red-400 mt-2">{error}</p>}
          </CardContent>
        </Card>

        {/* Products Performance */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Products Performance</h2>
            <div className="h-1 w-16 bg-blue-600 rounded"></div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading performance data...</div>
          ) : products.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400">No sales data yet. Create products and start selling!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-bold text-white mb-4 truncate">{product.title}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Sales</span>
                        <span className="text-white font-semibold">{product.sale_count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Revenue</span>
                        <span className="text-green-400 font-semibold">{product.revenue.toFixed(2)} π</span>
                      </div>
                      <div className="pt-3 border-t border-slate-700">
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${Math.min((product.revenue / totalEarnings) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-slate-400 text-xs mt-2">
                          {totalEarnings > 0 ? ((product.revenue / totalEarnings) * 100).toFixed(1) : 0}% of total
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sales History */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Sales History</h2>
            <div className="h-1 w-16 bg-blue-600 rounded"></div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading sales history...</div>
          ) : sales.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400">No sales yet. Start selling to see transactions here!</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700 border-b border-slate-600">
                    <tr>
                      <th className="text-left p-4 text-slate-300 font-semibold">Product</th>
                      <th className="text-left p-4 text-slate-300 font-semibold">Buyer</th>
                      <th className="text-left p-4 text-slate-300 font-semibold">Amount</th>
                      <th className="text-left p-4 text-slate-300 font-semibold">Method</th>
                      <th className="text-left p-4 text-slate-300 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale, idx) => (
                      <tr key={sale.id} className={idx % 2 === 0 ? "bg-slate-700/30" : ""}>
                        <td className="p-4 text-slate-200">{sale.product_title}</td>
                        <td className="p-4 text-slate-200">{sale.buyer_name}</td>
                        <td className="p-4 text-green-400 font-semibold">{sale.amount} {sale.currency}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            sale.payment_method === "pi" 
                              ? "bg-blue-500/20 text-blue-300" 
                              : "bg-purple-500/20 text-purple-300"
                          }`}>
                            {sale.payment_method === "pi" ? "Pi Network" : "DropPay"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-xs">
                          {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesEarnings;
