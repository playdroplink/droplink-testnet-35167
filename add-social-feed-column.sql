-- Adds social feed storage for pinned embeds
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS social_feed jsonb DEFAULT '[]'::jsonb;
