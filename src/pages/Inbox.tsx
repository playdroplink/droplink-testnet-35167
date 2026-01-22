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
    <div className="glassmorphism-page glassmorphism-page-light dark:glassmorphism-page-dark p-4 relative overflow-hidden">
      {/* Background decorative elements - Light Mode */}
      <div className="dark:hidden absolute top-0 left-10 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob"></div>
      <div className="dark:hidden absolute top-40 right-10 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000"></div>

      {/* Background decorative elements - Dark Mode */}
      <div className="hidden dark:block absolute top-0 left-10 w-80 h-80 bg-blue-900 rounded-full mix-blend-screen filter blur-3xl opacity-15 animate-blob"></div>
      <div className="hidden dark:block absolute top-40 right-10 w-80 h-80 bg-purple-900 rounded-full mix-blend-screen filter blur-3xl opacity-15 animate-blob animation-delay-2000"></div>

      <div className="max-w-2xl mx-auto relative z-10">
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