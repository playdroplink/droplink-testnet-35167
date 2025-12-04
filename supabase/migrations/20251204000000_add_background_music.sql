-- Add background music support for public bio pages
-- This adds a music URL field to the profiles table for background music in public bios

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS background_music_url TEXT DEFAULT '';

-- Add comment to explain the field
COMMENT ON COLUMN public.profiles.background_music_url IS 'URL to background music file (MP3, OGG, WAV) to play on public bio page';

-- Create index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_profiles_background_music_url ON public.profiles(background_music_url);
