import { usePi } from "@/contexts/PiContext";
import InboxMessages from "../components/InboxMessages";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function InboxPage() {
  const { piUser } = usePi();
  const receiverUsername = piUser?.username || "";
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-blue-200 p-4">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <InboxMessages receiverUsername={receiverUsername} />
      </div>
    </div>
  );
}