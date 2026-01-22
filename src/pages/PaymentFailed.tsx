import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PaymentFailed() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="glass-card rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Payment Failed</h1>
        <p className="mb-4 text-gray-300">There was a problem processing your payment. Please try again or contact support.</p>
        <Button className="w-full mb-2" onClick={() => navigate(-1)}>
          Try Again
        </Button>
        <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    </div>
  );
}
