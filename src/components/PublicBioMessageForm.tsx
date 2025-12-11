import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function PublicBioMessageForm({ receiverUsername, senderUsername }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!message.trim()) {
      setStatus('Message cannot be empty');
      return;
    }
    // Use the column names expected by your Supabase types (sender, receiver, content)
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
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
      {status && <div className="text-sm mt-1">{status}</div>}
    </form>
  );
}
