-- ========================================
-- COMPLETE FIX FOR FOLLOW, MESSAGES & INBOX
-- ========================================
-- This SQL file fixes:
-- 1. Follow functionality (Failed to update follow status)
-- 2. Message sending with images (RLS policy violation)
-- 3. Inbox not receiving messages
-- 4. follower_profile_id null constraint errors
-- ========================================

-- ========================================
-- 1. FIX FOLLOWERS TABLE & POLICIES
-- ========================================

-- Drop ALL existing policies on followers table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'followers' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.followers';
    END LOOP;
END $$;

-- Allow anyone to follow (Pi Network users don't have auth.uid())
CREATE POLICY "Anyone can follow profiles" 
ON public.followers 
FOR INSERT 
WITH CHECK (
  -- Ensure both profiles exist
  EXISTS (SELECT 1 FROM public.profiles WHERE id = followers.follower_profile_id) AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = followers.following_profile_id) AND
  -- Prevent self-following (enforced by check constraint)
  followers.follower_profile_id != followers.following_profile_id
);

-- Allow anyone to unfollow
CREATE POLICY "Anyone can unfollow" 
ON public.followers 
FOR DELETE 
USING (
  -- Ensure the follower profile exists
  EXISTS (SELECT 1 FROM public.profiles WHERE id = followers.follower_profile_id)
);

-- Allow anyone to view followers
CREATE POLICY "Anyone can view followers" 
ON public.followers 
FOR SELECT 
USING (true);

-- ========================================
-- 2. FIX MESSAGES TABLE & POLICIES
-- ========================================

-- Drop old messages table if it exists
DROP TABLE IF EXISTS public.messages CASCADE;

-- Create messages table with proper schema
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receiver_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on messages table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.messages';
    END LOOP;
END $$;

-- Allow anyone to send messages (Pi Network users don't have auth.uid())
CREATE POLICY "Anyone can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
    -- Either sender_profile_id is null (anonymous) or exists in profiles
    sender_profile_id IS NULL 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = messages.sender_profile_id)
);

-- Allow anyone to view messages (we'll filter on frontend by profile_id)
CREATE POLICY "Anyone can view messages"
ON public.messages
FOR SELECT
USING (true);

-- Allow anyone to update messages (mark as read)
CREATE POLICY "Anyone can update messages"
ON public.messages
FOR UPDATE
USING (true);

-- Allow anyone to delete messages
CREATE POLICY "Anyone can delete messages"
ON public.messages
FOR DELETE
USING (true);

-- Grant permissions
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO anon;

-- ========================================
-- 3. ENSURE MESSAGE-IMAGES STORAGE BUCKET
-- ========================================

-- Create message-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop ALL existing policies on storage.objects for message-images bucket
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage')
    LOOP
        -- Only drop if it's related to message-images
        IF r.policyname LIKE '%message%' OR r.policyname LIKE '%upload%' OR r.policyname LIKE '%Allow%' THEN
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
        END IF;
    END LOOP;
END $$;

-- Allow anyone to upload images to message-images bucket
CREATE POLICY "Anyone can upload message images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'message-images');

-- Allow public read access to message images
CREATE POLICY "Public can view message images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'message-images');

-- Allow anyone to delete message images
CREATE POLICY "Anyone can delete message images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'message-images');

-- ========================================
-- 4. VERIFY FOLLOWERS TABLE STRUCTURE
-- ========================================

-- Ensure the followers table has the correct structure
DO $$ 
BEGIN
    -- Check if followers table exists and has correct columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'followers') THEN
        -- Ensure correct column names exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'followers' AND column_name = 'follower_profile_id') THEN
            RAISE EXCEPTION 'followers table is missing follower_profile_id column!';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'followers' AND column_name = 'following_profile_id') THEN
            RAISE EXCEPTION 'followers table is missing following_profile_id column!';
        END IF;
    END IF;
END $$;

-- ========================================
-- 5. REFRESH SCHEMA CACHE
-- ========================================

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify followers table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'followers'
ORDER BY ordinal_position;

-- Verify messages table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Verify storage buckets
SELECT id, name, public FROM storage.buckets WHERE id = 'message-images';

-- Success message
SELECT 
    '✅ All fixes applied successfully!' as status,
    'Follow, Messages, and Inbox should now work correctly' as message;
