import { usePi } from "@/contexts/PiContext";
import InboxConversations from "@/components/InboxConversations";
import { Button } from "@/components/ui/button";
import { Info, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";

export default function InboxPage() {
  const { piUser, isAuthenticated } = usePi();
  const navigate = useNavigate();
  
  return (
    <div>
      <PageHeader 
        title="Messages" 
        description="Your conversations"
        icon={<Mail className="w-6 h-6" />}
      />
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 pb-24">
        <div className="max-w-2xl mx-auto">
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
    </div>
  );
}
