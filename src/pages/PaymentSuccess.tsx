import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  // Optionally, get product link from state
  const productLink = location.state?.productLink || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-100">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-sky-700 mb-4">Thank you for your purchase!</h1>
        <p className="mb-4">Your payment was successful.</p>
        {productLink && (
          <>
            <Button className="w-full mb-2" onClick={() => navigator.clipboard.writeText(productLink)}>
              Copy Product Link
            </Button>
            <div className="text-xs text-gray-500 mb-4">Or check your email for the download link.</div>
          </>
        )}
        <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    </div>
  );
}
