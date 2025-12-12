import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { usePi } from '@/contexts/PiContext';

interface InboxMessagesProps {
  receiverUsername: string;
}

export default function InboxMessages({ receiverUsername }: InboxMessagesProps) {
  const { isAuthenticated, piUser } = usePi();

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Inbox Messages
          </CardTitle>
          <CardDescription>
            View and manage messages from your followers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in with Pi Network to view your messages.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Inbox Messages
        </CardTitle>
        <CardDescription>
          Messages for @{receiverUsername}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No messages yet</p>
          <p className="text-sm">Messages from your followers will appear here</p>
        </div>
      </CardContent>
    </Card>
  );
}
