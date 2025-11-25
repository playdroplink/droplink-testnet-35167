import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Dropmate = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender, content, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load messages:", error);
    } else {
      setMessages(data);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Messages from Followers</h1>
      {loading ? (
        <p>Loading messages...</p>
      ) : (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p>No messages yet.</p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="border p-4 rounded shadow">
                <p><strong>From:</strong> {message.sender}</p>
                <p>{message.content}</p>
                <p className="text-sm text-gray-500">
                  <em>{new Date(message.created_at).toLocaleString()}</em>
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Dropmate;