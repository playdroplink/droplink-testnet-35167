import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePi } from '@/contexts/PiContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { uploadMessageImage } from '@/lib/supabase-storage';
import { PageHeader } from '@/components/PageHeader';
import { FooterNav } from '@/components/FooterNav';

interface Message {
  id: string;
  sender_profile_id: string | null;
  receiver_profile_id: string;
  content: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
  sender_username?: string;
  sender_logo?: string;
}

export default function ChatPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { piUser } = usePi();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (piUser?.username && username) {
      loadProfiles();
    }
  }, [piUser, username]);

  useEffect(() => {
    if (myProfileId && otherProfile?.id) {
      loadMessages();
      markMessagesAsRead();

      // Subscribe to new messages
      const channel = supabase
        .channel(`chat-${myProfileId}-${otherProfile.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_profile_id=eq.${myProfileId}`
          },
          (payload) => {
            console.log('New message received:', payload);
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [myProfileId, otherProfile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProfiles = async () => {
    try {
      // Get my profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', piUser!.username)
        .single();

      if (myProfile) {
        setMyProfileId(myProfile.id);
      }

      // Get other user's profile
      const { data: otherUserProfile } = await supabase
        .from('profiles')
        .select('id, username, business_name, logo')
        .eq('username', username)
        .single();

      if (otherUserProfile) {
        setOtherProfile(otherUserProfile);
      } else {
        toast.error('User not found');
        navigate('/inbox');
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
      toast.error('Failed to load profiles');
    }
  };

  const loadMessages = async () => {
    if (!myProfileId || !otherProfile?.id) return;

    setLoading(true);
    try {
      // Fetch all messages between the two users
      const { data, error } = await supabase
        .from('messages' as any)
        .select('*')
        .or(`and(sender_profile_id.eq.${myProfileId},receiver_profile_id.eq.${otherProfile.id}),and(sender_profile_id.eq.${otherProfile.id},receiver_profile_id.eq.${myProfileId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Add sender info
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (msg: any) => {
          if (msg.sender_profile_id) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('username, logo')
              .eq('id', msg.sender_profile_id)
              .maybeSingle();

            return {
              ...msg,
              sender_username: senderProfile?.username || 'Anonymous',
              sender_logo: senderProfile?.logo
            };
          }
          return { ...msg, sender_username: 'Anonymous' };
        })
      );

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!myProfileId || !otherProfile?.id) return;

    try {
      await supabase
        .from('messages' as any)
        .update({ is_read: true })
        .eq('receiver_profile_id', myProfileId)
        .eq('sender_profile_id', otherProfile.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !myProfileId || !otherProfile?.id) return;

    setSending(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadMessageImage(selectedImage);
        } catch (error) {
          console.error('Failed to upload image:', error);
          toast.error('Failed to upload image');
          setUploadingImage(false);
          setSending(false);
          return;
        }
        setUploadingImage(false);
      }

      // Send message
      const { error } = await supabase
        .from('messages' as any)
        .insert({
          sender_profile_id: myProfileId,
          receiver_profile_id: otherProfile.id,
          content: newMessage.trim(),
          image_url: imageUrl,
          is_read: false
        });

      if (error) throw error;

      setNewMessage('');
      clearImage();
      await loadMessages();
      toast.success('Message sent!');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };



  return (
    <>
      <PageHeader 
        title="Chat" 
        description="Send and receive messages"
        icon={<Send />}
      />
      <div className="min-h-screen bg-sky-400 flex flex-col relative pb-24">
      {/* Background decorative elements - Light Mode */}
      <div className="dark:hidden absolute top-0 left-10 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob\"></div>
      <div className="dark:hidden absolute bottom-0 right-10 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000\"></div>

      {/* Background decorative elements - Dark Mode */}
      <div className="hidden dark:block absolute top-0 left-10 w-80 h-80 bg-blue-900 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob\"></div>
      <div className="hidden dark:block absolute bottom-0 right-10 w-80 h-80 bg-purple-900 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-2000\"></div>

      {/* Header */}
      <div className="glass-container border-b rounded-b-3xl mx-3 sm:mx-4 mt-3 sm:mt-4 relative z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/inbox')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherProfile?.logo} />
            <AvatarFallback>
              {otherProfile?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-white">@{otherProfile?.username}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {otherProfile?.business_name || 'User'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 relative z-10">
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isMyMessage = message.sender_profile_id === myProfileId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isMyMessage
                        ? 'glass-btn text-white rounded-tl-2xl rounded-tr-sm rounded-b-2xl'
                        : 'glass-card rounded-tr-2xl rounded-tl-sm rounded-b-2xl'
                    } p-3 shadow-sm`}
                  >
                    {!isMyMessage && (
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={message.sender_logo} />
                          <AvatarFallback className="text-xs">
                            {message.sender_username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          @{message.sender_username}
                        </span>
                      </div>
                    )}
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                    {message.image_url && (
                      <div className="mt-2">
                        <img
                          src={message.image_url}
                          alt="Shared image"
                          className="rounded-lg max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.image_url, '_blank')}
                        />
                      </div>
                    )}
                    <div className={`text-xs mt-1 ${isMyMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="glass-container rounded-t-3xl border-t mx-3 sm:mx-4 mb-4 sticky bottom-0 relative z-10">
        <div className="max-w-4xl mx-auto p-3 sm:p-4">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-32 rounded-lg border"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={clearImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingImage}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sending || uploadingImage}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
              size="icon"
            >
              {sending || uploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      </div>
      <FooterNav />
    </>
  );
}
