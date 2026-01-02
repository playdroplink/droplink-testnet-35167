import { usePi } from "@/contexts/PiContext";
import InboxConversations from "@/components/InboxConversations";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InboxPage() {
  const { piUser, isAuthenticated } = usePi();
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

        {!isAuthenticated && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Sign in with Pi Network to view your messages and start conversations.
            </AlertDescription>
          </Alert>
        )}
        
        <InboxConversations />
      </div>
    </div>
  );
}