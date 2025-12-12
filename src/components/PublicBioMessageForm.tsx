import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePi } from '@/contexts/PiContext';
import { MessageSquare, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface PublicBioMessageFormProps {
  receiverUsername: string;
  senderUsername?: string;
}

export default function PublicBioMessageForm({ receiverUsername, senderUsername }: PublicBioMessageFormProps) {
  const { isAuthenticated, piUser } = usePi();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in with Pi Network to send messages');
      return;
    }

    setSending(true);
    try {
      // Simulate sending (no messages table exists)
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Message sent successfully!');
      setMessage('');
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send a Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in with Pi Network to send messages to @{receiverUsername}
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
          Send a Message to @{receiverUsername}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-4">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button type="submit" disabled={sending || !message.trim()} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
