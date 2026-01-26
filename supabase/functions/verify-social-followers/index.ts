// Verify Social Followers Edge Function
// This function fetches real follower counts from social media platforms

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialLink {
  platform: string;
  url: string;
  followers?: number;
}

// Extract username from social media URL
function extractUsername(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        // twitter.com/username or x.com/username
        const twitterMatch = pathname.match(/^\/(@?[\w]+)/);
        return twitterMatch ? twitterMatch[1].replace('@', '') : null;
        
      case 'instagram':
        // instagram.com/username
        const instaMatch = pathname.match(/^\/(@?[\w.]+)/);
        return instaMatch ? instaMatch[1].replace('@', '') : null;
        
      case 'youtube':
        // youtube.com/@username or youtube.com/c/username
        const ytMatch = pathname.match(/^\/@?([\w-]+)|^\/c\/([\w-]+)/);
        return ytMatch ? (ytMatch[1] || ytMatch[2]) : null;
        
      case 'tiktok':
        // tiktok.com/@username
        const ttMatch = pathname.match(/^\/@([\w.]+)/);
        return ttMatch ? ttMatch[1] : null;
        
      case 'twitch':
        // twitch.tv/username
        const twitchMatch = pathname.match(/^\/([\w]+)/);
        return twitchMatch ? twitchMatch[1] : null;
        
      default:
        return null;
    }
  } catch (e) {
    console.error('Error extracting username:', e);
    return null;
  }
}

// Fetch follower count from Instagram (scraping - use with caution)
async function getInstagramFollowers(username: string): Promise<number | null> {
  try {
    // Note: Instagram requires authentication for API access
    // This is a placeholder - in production, use official Instagram Graph API
    // or a third-party service like RapidAPI
    const response = await fetch(`https://www.instagram.com/${username}/?__a=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.graphql?.user?.edge_followed_by?.count || null;
  } catch (e) {
    console.error('Instagram fetch error:', e);
    return null;
  }
}

// Fetch follower count from Twitter/X (requires API key)
async function getTwitterFollowers(username: string): Promise<number | null> {
  try {
    // Twitter API v2 requires Bearer Token
    // This is a placeholder - integrate with Twitter API v2 in production
    const TWITTER_BEARER_TOKEN = Deno.env.get('TWITTER_BEARER_TOKEN');
    if (!TWITTER_BEARER_TOKEN) {
      console.warn('Twitter API token not configured');
      return null;
    }
    
    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.data?.public_metrics?.followers_count || null;
  } catch (e) {
    console.error('Twitter fetch error:', e);
    return null;
  }
}

// Fetch follower count from YouTube (requires API key)
async function getYouTubeSubscribers(username: string): Promise<number | null> {
  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      console.warn('YouTube API key not configured');
      return null;
    }
    
    // First get channel ID from username
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${username}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!searchResponse.ok) return null;
    
    const searchData = await searchResponse.json();
    const channelId = searchData?.items?.[0]?.id?.channelId;
    
    if (!channelId) return null;
    
    // Get subscriber count
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!channelResponse.ok) return null;
    
    const channelData = await channelResponse.json();
    const subCount = channelData?.items?.[0]?.statistics?.subscriberCount;
    
    return subCount ? parseInt(subCount) : null;
  } catch (e) {
    console.error('YouTube fetch error:', e);
    return null;
  }
}

// Fetch follower count from TikTok (scraping - use with caution)
async function getTikTokFollowers(username: string): Promise<number | null> {
  try {
    // TikTok API is not publicly available
    // This is a placeholder - use third-party APIs like RapidAPI in production
    console.warn('TikTok API not implemented - use third-party service');
    return null;
  } catch (e) {
    console.error('TikTok fetch error:', e);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { socialLinks, profileId } = await req.json();
    
    if (!Array.isArray(socialLinks) || !profileId) {
      return new Response(
        JSON.stringify({ error: 'Invalid request - socialLinks array and profileId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedLinks = await Promise.all(
      socialLinks.map(async (link: SocialLink) => {
        const platform = (link.platform || link.url).toLowerCase();
        const username = extractUsername(link.url, platform);
        
        if (!username) {
          return {
            ...link,
            is_verified: false,
            error: 'Could not extract username from URL'
          };
        }

        let verifiedFollowers: number | null = null;

        // Fetch real follower count based on platform
        if (platform.includes('instagram') || platform.includes('insta')) {
          verifiedFollowers = await getInstagramFollowers(username);
        } else if (platform.includes('twitter') || platform.includes('x.com') || platform === 'x') {
          verifiedFollowers = await getTwitterFollowers(username);
        } else if (platform.includes('youtube')) {
          verifiedFollowers = await getYouTubeSubscribers(username);
        } else if (platform.includes('tiktok')) {
          verifiedFollowers = await getTikTokFollowers(username);
        }

        return {
          ...link,
          verified_followers: verifiedFollowers,
          last_verified: new Date().toISOString(),
          is_verified: verifiedFollowers !== null,
          username: username
        };
      })
    );

    // Update profile with verified follower counts
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        social_links: verifiedLinks,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verifiedLinks,
        message: 'Social follower counts verified successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
