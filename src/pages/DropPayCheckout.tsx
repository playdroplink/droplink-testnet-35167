import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";

// Sky blue theme styles
const skyBlueBg = "bg-sky-100 min-h-screen flex items-center justify-center";

export default function DropPayCheckout() {
  const { productId } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!productId) return;
    supabase
      .from('drop_products')
      .select('*')
      .eq('id', productId)
      .single()
      .then(({ data }) => setProduct(data));
  }, [productId]);

  const handleDropPay = async () => {
    setPaying(true);
    // TODO: Integrate Drop smart contract/payment logic
    // For now, just mark as paid and insert payment record
    if (!product) return;
    await supabase.from('drop_payments').insert({
      product_id: product.id,
      buyer_id: 'BUYER_UID', // Replace with real buyer id from auth
      amount: product.price,
      status: 'confirmed',
      tx_hash: 'demo_tx_hash'
    });
    setPaid(true);
    setPaying(false);
  };

  if (!product) return <div className={skyBlueBg}><div>Loading...</div></div>;
  return (
    <div className={skyBlueBg}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-sky-700">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-gray-700">{product.description}</div>
          <div className="text-2xl font-bold text-sky-700">{product.price} Drop</div>
          {!paid ? (
            <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white" onClick={handleDropPay} disabled={paying}>
              {paying ? "Processing..." : "Drop Pay"}
            </Button>
          ) : (
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-sky-700">Thank you for your purchase!</div>
              <Button className="w-full" onClick={() => navigator.clipboard.writeText(product.product_link)}>
                Copy Product Link
              </Button>
              <div className="text-xs text-gray-500 mt-2">Or check your email for the download link.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
