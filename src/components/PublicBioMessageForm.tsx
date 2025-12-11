import { useState } from 'react';
import { usePiNetwork } from '@/hooks/usePiNetwork';
import { supabase } from '@/integrations/supabase/client';

export default function PublicBioMessageForm({ receiverUsername, senderUsername }) {
    const { createPayment, isAuthenticated, isLoading } = usePiNetwork();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!message.trim()) {
      setStatus('Message cannot be empty');
      return;
    }
    try {
      setStatus('Processing Pi payment...');
      // Require 1 PI payment before sending message, pass receiver as metadata
      await createPayment(1, `Send message to @${receiverUsername}`, {
        to: receiverUsername,
        type: 'message',
        sender: senderUsername,
        content: message,
      });
      setStatus('Payment successful, sending message...');
      const { error } = await supabase.from('messages').insert([
        {
          sender: senderUsername,
          receiver: receiverUsername,
          content: message,
        },
      ]);
      if (error) {
        setStatus('Failed to send message');
      } else {
        setStatus('Message sent!');
        setMessage('');
      }
    } catch (err) {
      setStatus('Payment failed or cancelled. Message not sent.');
    }
  };

  return (
    <form onSubmit={handleSend} className="space-y-2">
      <textarea
        className="w-full border rounded p-2"
        placeholder="Type your message..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Send (1 PI)'}
      </button>
      {status && <div className="text-sm mt-1">{status}</div>}
    </form>
  );
}
