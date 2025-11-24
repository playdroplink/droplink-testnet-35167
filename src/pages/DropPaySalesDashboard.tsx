import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePi } from "@/contexts/PiContext";
import { supabase } from "@/integrations/supabase/client";

export default function DropPaySalesDashboard() {
  const { piUser } = usePi();
  const [sales, setSales] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!piUser) return;
    supabase
      .from('drop_sales')
      .select('*')
      .eq('seller_id', piUser.uid)
      .then(({ data }) => {
        setSales(data || []);
        setBalance((data || []).reduce((sum, s) => sum + Number(s.amount), 0));
      });
  }, [piUser]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>DropPay Sales & Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-lg font-bold text-sky-700">Drop Balance: {balance} Drop</div>
          <div className="mb-2 font-medium">Sales History</div>
          <div className="space-y-2">
            {sales.map(sale => (
              <div key={sale.id} className="flex justify-between border-b pb-1 text-sm">
                <span>{sale.product_id}</span>
                <span>{sale.amount} Drop</span>
                <span>{sale.buyer_id}</span>
                <span>{sale.created_at?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
