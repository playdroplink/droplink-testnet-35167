import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function InboxMessages({ receiverUsername }) {
  // Explicitly type as any[] to avoid deep type instantiation issues with Supabase
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      // Use the column names expected by your Supabase types (receiver)
      // Bypass type inference issues by casting supabase to any
      const { data, error } = await (supabase as any)
        .from('messages')
        .select('id,sender,content,created_at')
        .eq('receiver', receiverUsername)
        .order('created_at', { ascending: false });
      setMessages(data || []);
      setLoading(false);
    }
    fetchMessages();
  }, [receiverUsername]);

  if (loading) return <div>Loading messages...</div>;
  if (!messages.length) return <div>No messages found.</div>;

  return (
    <div className="space-y-4">
      {messages.map(msg => (
        <div key={msg.id} className="border rounded p-3">
          <div className="text-xs text-gray-500 mb-1">From: @{msg.sender} • {new Date(msg.created_at).toLocaleString()}</div>
          <div>{msg.content}</div>
        </div>
      ))}
    </div>
  );
}
