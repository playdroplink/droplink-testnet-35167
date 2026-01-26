import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Search, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { usePi } from '@/contexts/PiContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  otherUserId: string;
  otherUsername: string;
  otherUserLogo: string;
  otherUserBusinessName: string;
  lastMessage: string;
  lastMessageImage?: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function InboxConversations() {
  const navigate = useNavigate();
  const { piUser, isAuthenticated } = usePi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated && piUser?.username) {
      loadProfile();
    }
  }, [isAuthenticated, piUser]);

  useEffect(() => {
    if (profileId) {
      loadConversations();

      // Subscribe to new messages
      const channel = supabase
        .channel('inbox-conversations')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_profile_id=eq.${profileId}`
          },
          () => {
            loadConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profileId]);

  const loadProfile = async () => {
    if (!piUser?.username) {
      console.log('[InboxConversations] No Pi username available');
      return;
    }

    console.log('[InboxConversations] Loading profile for username:', piUser.username);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', piUser.username)
      .maybeSingle();

    if (error) {
      console.error('[InboxConversations] Error loading profile:', error);
      toast.error('Failed to load your profile');
      return;
    }

    if (profile) {
      console.log('[InboxConversations] Profile loaded, ID:', profile.id);
      setProfileId(profile.id);
    } else {
      console.log('[InboxConversations] No profile found for username:', piUser.username);
    }
  };

  const loadConversations = async () => {
    if (!profileId) {
      console.log('[InboxConversations] No profile ID, skipping conversation load');
      return;
    }

    console.log('[InboxConversations] Loading conversations for profile ID:', profileId);
    setLoading(true);
    try {
      // Fetch all messages involving this user
      const { data: messages, error } = await (supabase
        .from('messages' as any)
        .select('*')
        .or(`sender_profile_id.eq.${profileId},receiver_profile_id.eq.${profileId}`)
        .order('created_at', { ascending: false }) as any);

      if (error) {
        console.error('[InboxConversations] Error loading messages:', error);
        throw error;
      }

      console.log('[InboxConversations] Loaded messages:', messages?.length || 0);

      // Group messages by conversation partner
      const conversationMap = new Map<string, any>();

      for (const msg of (messages as any[]) || []) {
        const otherUserId = msg.sender_profile_id === profileId
          ? msg.receiver_profile_id
          : msg.sender_profile_id;

        if (!otherUserId) continue;

        if (!conversationMap.has(otherUserId)) {
          // Get the other user's profile
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('username, logo, business_name')
            .eq('id', otherUserId)
            .maybeSingle();

          // Count unread messages from this user
          const { count: unreadCount } = await (supabase
            .from('messages' as any)
            .select('*', { count: 'exact', head: true })
            .eq('sender_profile_id', otherUserId)
            .eq('receiver_profile_id', profileId)
            .eq('is_read', false) as any);

          conversationMap.set(otherUserId, {
            otherUserId,
            otherUsername: otherProfile?.username || 'Anonymous',
            otherUserLogo: otherProfile?.logo || '',
            otherUserBusinessName: otherProfile?.business_name || '',
            lastMessage: msg.content || (msg.image_url ? 'Sent an image' : ''),
            lastMessageImage: msg.image_url,
            lastMessageTime: msg.created_at,
            unreadCount: unreadCount || 0
          });
        }
      }

      const conversationsList = Array.from(conversationMap.values());
      console.log('[InboxConversations] Grouped into conversations:', conversationsList.length);
      setConversations(conversationsList);
    } catch (error) {
      console.error('[InboxConversations] Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUserBusinessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
              {totalUnread > 0 && (
                <Badge variant="destructive">{totalUnread} new</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your conversations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConversations}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm">Start chatting with other users!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.otherUserId}
                onClick={() => navigate(`/chat/${conversation.otherUsername}`)}
                className={`p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                  conversation.unreadCount > 0
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-background'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.otherUserLogo} />
                    <AvatarFallback>
                      {conversation.otherUsername[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          @{conversation.otherUsername}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.lastMessageTime), {
                          addSuffix: true
                        })}
                      </span>
                    </div>
                    {conversation.otherUserBusinessName && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {conversation.otherUserBusinessName}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {conversation.lastMessageImage && (
                        <ImageIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <p
                        className={`text-sm truncate ${
                          conversation.unreadCount > 0
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {conversation.lastMessage || 'No messages'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
