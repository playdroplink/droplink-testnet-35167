import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";

// Sky blue theme styles
const skyBlueBg = "bg-sky-100 min-h-screen flex items-center justify-center";

export default function DropPayCheckout() {
  // In real app, fetch product by ID from backend
  const { productId } = useParams();
  // Mock product data
  const product = {
    name: "Demo Product",
    description: "This is a demo product for DropPay.",
    price: 10,
    seller: "GSELLERADDRESS1234567890",
    link: "https://example.com/download/demo-product"
  };
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const handleDropPay = async () => {
    setPaying(true);
    // TODO: Integrate Drop smart contract/payment logic
    setTimeout(() => {
      setPaid(true);
      setPaying(false);
    }, 2000);
  };

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
              <Button className="w-full" onClick={() => navigator.clipboard.writeText(product.link)}>
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
