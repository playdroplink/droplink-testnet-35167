import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PaymentFailed() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-700 mb-4">Payment Failed</h1>
        <p className="mb-4">There was a problem processing your payment. Please try again or contact support.</p>
        <Button className="w-full mb-2" onClick={() => navigate(-1)}>
          Try Again
        </Button>
        <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    </div>
  );
}
