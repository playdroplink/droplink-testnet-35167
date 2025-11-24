import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePi } from "@/contexts/PiContext";

export default function DropPaySalesDashboard() {
  const { piUser } = usePi();
  const [sales, setSales] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // TODO: Fetch sales and Drop balance from backend
    setSales([
      { id: 1, product: "Demo Product", amount: 10, buyer: "GBUYER1...", date: "2025-11-25" },
      { id: 2, product: "Another Product", amount: 20, buyer: "GBUYER2...", date: "2025-11-24" },
    ]);
    setBalance(30);
  }, []);

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
                <span>{sale.product}</span>
                <span>{sale.amount} Drop</span>
                <span>{sale.buyer}</span>
                <span>{sale.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
