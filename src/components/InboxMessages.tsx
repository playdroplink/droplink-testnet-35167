import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePiNetwork } from '@/hooks/usePiNetwork';

export default function InboxMessages({ receiverUsername }) {
  const { createPayment } = usePiNetwork();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [replyContent, setReplyContent] = useState<{ [id: string]: string }>({});
  const [replying, setReplying] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('messages')
        .select('id,sender,content,created_at,read,reply')
        .eq('receiver', receiverUsername)
        .order('created_at', { ascending: false });
      setMessages((data as any[]) || []);
      setLoading(false);
    }
    fetchMessages();
  }, [receiverUsername]);

  // Mark as read/unread
  const toggleRead = async (id: number, current: boolean) => {
    await supabase.from('messages').update({ read: !current } as any).eq('id', id);
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, read: !current } : m));
  };

  // Delete message
  const deleteMessage = async (id: number) => {
    await supabase.from('messages').delete().eq('id', id);
    setMessages(msgs => msgs.filter(m => m.id !== id));
  };

  // Reply to message
  const sendReply = async (id: number) => {
    setReplying(r => ({ ...r, [id]: true }));
    await supabase.from('messages').update({ reply: replyContent[id] } as any).eq('id', id);
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, reply: replyContent[id] } : m));
    setReplying(r => ({ ...r, [id]: false }));
    setReplyContent(c => ({ ...c, [id]: '' }));
  };

  // Pay 1 PI to unlock reply
  const payToUnlock = async (id: number, sender: string) => {
    await createPayment(1, `Unlock reply to @${sender}`, {
      to: sender,
      type: 'reply',
      creator: receiverUsername,
      message_id: id,
    });
    await supabase.from('messages').update({ creator_paid: true } as any).eq('id', id);
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, creator_paid: true } : m));
  };

  // Filter messages
  const filteredMessages = messages.filter(msg =>
    msg.sender.toLowerCase().includes(search.toLowerCase()) ||
    msg.content.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Loading messages...</div>;
  if (!messages.length) return <div>No messages found.</div>;

  return (
    <div>
      <input
        className="w-full mb-4 p-2 border rounded"
        placeholder="Search messages..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="space-y-4">
        {filteredMessages.map(msg => (
          <div key={msg.id} className="border rounded p-3 relative">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 mb-1">From: @{msg.sender} • {new Date(msg.created_at).toLocaleString()}</div>
              <div className="flex gap-2">
                <button
                  className={`text-xs px-2 py-1 rounded ${msg.read ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                  onClick={() => toggleRead(msg.id, msg.read)}
                >
                  {msg.read ? 'Read' : 'Unread'}
                </button>
                <button
                  className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
                  onClick={() => deleteMessage(msg.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <div>{msg.content}</div>
            {/* Reply section */}
            <div className="mt-2">
              {!msg.creator_paid ? (
                <button
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                  onClick={() => payToUnlock(msg.id, msg.sender)}
                >
                  Pay 1 PI to unlock reply
                </button>
              ) : (
                <>
                  <textarea
                    className="w-full border rounded p-2 mb-2"
                    placeholder="Type a reply..."
                    value={replyContent[msg.id] || ''}
                    onChange={e => setReplyContent(c => ({ ...c, [msg.id]: e.target.value }))}
                    rows={2}
                  />
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                    onClick={() => sendReply(msg.id)}
                    disabled={replying[msg.id] || !(replyContent[msg.id] && replyContent[msg.id].trim())}
                  >
                    {replying[msg.id] ? 'Replying...' : 'Reply'}
                  </button>
                </>
              )}
              {msg.reply && (
                <div className="mt-2 p-2 bg-blue-50 border rounded text-sm text-blue-700">
                  <b>Creator reply:</b> {msg.reply}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
