-- ========================================
-- DISABLE FOLLOW NOTIFICATIONS TRIGGER
-- ========================================
-- This removes the trigger that causes "payload column does not exist" error
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the trigger that creates notifications on follow
DROP TRIGGER IF EXISTS trg_followers_insert_notification ON public.followers CASCADE;

-- Step 2: Drop the trigger that creates notifications on messages
DROP TRIGGER IF EXISTS trg_messages_insert_notification ON public.messages CASCADE;

-- Step 3: Drop the notification functions
DROP FUNCTION IF EXISTS public.fn_notify_followers() CASCADE;
DROP FUNCTION IF EXISTS public.fn_notify_messages() CASCADE;

-- Step 4: Verify triggers are removed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trg_followers_insert_notification'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: Follow notification trigger removed';
    ELSE
        RAISE NOTICE '❌ WARNING: Follow notification trigger still exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trg_messages_insert_notification'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: Message notification trigger removed';
    ELSE
        RAISE NOTICE '❌ WARNING: Message notification trigger still exists';
    END IF;
END $$;

-- Step 5: Show all remaining triggers (for verification)
SELECT 
    trigger_name, 
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

RAISE NOTICE '✅ Notification triggers disabled. Follow functionality will now work without notifications.';
