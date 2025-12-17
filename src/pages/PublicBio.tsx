import { useEffect, useState } from "react";
import { usePublicSubscription } from "@/hooks/usePublicSubscription";
import { useParams, useNavigate } from "react-router-dom";
// ...existing code...

// The following useEffect should be placed inside the PublicBio component definition, not at the top level.
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PiPaymentDialog } from "@/components/PiPaymentDialog";
import { toast } from "sonner";
import { Info, Flag } from "lucide-react";
import { FollowersSection } from "@/components/FollowersSection";
import { GiftDialog } from "@/components/GiftDialog";
import { AIChatWidget } from "@/components/AIChatWidget";
import PublicBioMessageForm from "@/components/PublicBioMessageForm";
import { BackgroundMusicPlayer } from "@/components/BackgroundMusicPlayer";
import { PiAdBanner } from "@/components/PiAdBanner";
import PiAdsBanner from "@/components/PiAdsBanner";
import type { UserPreferences } from "@/contexts/UserPreferencesContext";
import {
  Twitter,
  Music,
  Linkedin,
  Twitch,
  ShoppingBag,
  Mail,
  Phone,
  Calendar,
  Download,
  ExternalLink,
  Heart,
  Star,
  Zap,
  Link as LinkIcon,
  Wallet,
  Copy,
  Check,
  Share2,
  UserPlus,
  UserMinus,
  Gift,
} from "lucide-react";

// Use react-icons for all major social platforms for reliability
import { FaInstagram, FaFacebook, FaYoutube, FaGlobe, FaLinkedin, FaTiktok, FaTwitch, FaXTwitter } from "react-icons/fa6";

import type { ProfileData } from "@/types/profile";

const PublicBio = () => {
    // ...existing code...

  // Pi Payment Dialog state
  const [showPiPaymentDialog, setShowPiPaymentDialog] = useState(false);
  const [piPaymentLoading, setPiPaymentLoading] = useState(false);
  const { createPayment } = usePi();

  const [showReportModal, setShowReportModal] = useState(false);
  const { username: rawUsername } = useParams();
  // Strip @ prefix if present (for @username URLs)
  const username = rawUsername?.startsWith('@') ? rawUsername.substring(1) : rawUsername;
  const navigate = useNavigate();
  const { piUser, isAuthenticated: isPiAuthenticated, signOut } = usePi();
  const [profileId, setProfileId] = useState<string | null>(null);
  // Subscription for viewed profile (must be after username is defined)
  const { plan, expiresAt, loading: subLoading } = usePublicSubscription(username ? String(username) : "");
  const isPlanExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  // Pi AdNetwork logic: show ads for free/basic/expired, hide for premium/pro
  const showPiAds = !plan || plan === 'free' || plan === 'basic' || isPlanExpired;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<{ type: 'crypto' | 'bank', name: string, value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [showPiWalletTip, setShowPiWalletTip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [message, setMessage] = useState("");
  // State to trigger auto-refresh after Pi Auth if Profile Not Found
  const [shouldAutoRefresh, setShouldAutoRefresh] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-follow after redirect from auth if needed
  useEffect(() => {
    const authAction = sessionStorage.getItem('authAction');
    const profileToFollow = sessionStorage.getItem('profileToFollow');
    if (
      authAction === 'follow' &&
      profileToFollow &&
      (profileToFollow === username || profileToFollow === profileId) &&
      currentUserProfileId &&
      currentUserProfileId !== profileId &&
      !isFollowing
    ) {
      // Remove intent so it doesn't repeat
      sessionStorage.removeItem('authAction');
      sessionStorage.removeItem('profileToFollow');
      handleFollow();
    }
  }, [username, profileId, currentUserProfileId, isFollowing]);


  useEffect(() => {
    loadProfile();
    loadCurrentUserProfile();
    loadVisitorCounts();
    // Fetch profileId for store link
    const fetchProfileId = async () => {
      if (!username) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (profile && profile.id) setProfileId(profile.id);
    };
    fetchProfileId();
  }, [username, isPiAuthenticated, piUser]);

  useEffect(() => {
    if (profileId && currentUserProfileId) {
      checkFollowStatus();
    }
  }, [profileId, currentUserProfileId]);

  // Redirect to Dashboard if current user is viewing their own profile
  useEffect(() => {
    if (profile && currentUserProfileId && profileId && currentUserProfileId === profileId) {
      console.log("User is viewing their own profile, redirecting to Dashboard");
      navigate("/");
    }
  }, [profile, currentUserProfileId, profileId, navigate]);

  const loadCurrentUserProfile = async () => {
    // Check for Supabase session (Gmail users)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profile) {
        setCurrentUserProfileId(profile.id);
        return;
      }
    }

    // Check for Pi-authenticated users (no Supabase session)
    if (isPiAuthenticated && piUser?.username) {
      const { data: piProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", piUser.username)
        .maybeSingle();
      
      if (piProfile) {
        setCurrentUserProfileId(piProfile.id);
      }
    }
  };

  // FIX: Use correct table and map to UserPreferences type
  const loadUserPreferences = async (userId: string) => {
    try {
      // Fallback: just set to null or default, since user_preferences table is not in schema
      setUserPreferences(null);
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const loadVisitorCounts = async () => {
    if (!username) return;
    
    try {
      // Get profile data to find the owner
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("username", username)
        .maybeSingle();
      
      if (profileData) {
        // Load user preferences for the profile owner
        await loadUserPreferences(profileData.user_id);
        
        // Load follower count
        const { data: followers, count: followerCount } = await supabase
          .from('followers')
          .select('id', { count: 'exact' })
          .eq('following_profile_id', profileData.id);
        
        setFollowerCount(followerCount || 0);
        
        // Load/update visit count
        const { data: analytics, count: visitCount } = await supabase
          .from('analytics')
          .select('id', { count: 'exact' })
          .eq('profile_id', profileData.id)
          .eq('event_type', 'view');
        
        setVisitCount(visitCount || 0);
      }
    } catch (error) {
      console.error('Failed to load visitor counts:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUserProfileId || !profileId) return;
    
    const { data } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_profile_id", currentUserProfileId)
      .eq("following_profile_id", profileId)
      .maybeSingle();
    
    setIsFollowing(!!data);
  };

  const handleSignUpToFollow = () => {
    // Store the current store/profile for potential future redirect
    sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
    sessionStorage.setItem('authAction', 'follow');
    sessionStorage.setItem('profileToFollow', username || '');
    
    // Redirect to main DropLink website for signup
    window.location.href = 'https://www.droplink.space';
  };

  const handlePiSignIn = async () => {
    try {
      // Store the profile to follow after authentication
      sessionStorage.setItem('authAction', 'follow');
      sessionStorage.setItem('profileToFollow', profileId || '');
      sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
      
      toast.loading("Redirecting to sign in...");
      
      // Redirect to dashboard for Pi authentication
      navigate('/', { state: { authAction: 'follow', profileToFollow: profileId } });
    } catch (error) {
      console.error("Pi sign in error:", error);
      toast.error("Failed to redirect to sign in", {
        description: "Please try again"
      });
    }
  };

  const handleFollow = async () => {
    if (!currentUserProfileId || !profileId) {
      toast.error("Please sign in to follow");
      return;
    }
    if (currentUserProfileId === profileId) {
      toast.error("You cannot follow yourself");
      return;
    }
    if (!currentUserProfileId || !profileId) {
      toast.error("Invalid follow: missing user id");
      return;
    }
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_profile_id", currentUserProfileId)
          .eq("following_profile_id", profileId);
        if (error) throw error;
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success("Unfollowed");
      } else {
        const { error } = await supabase
          .from("followers")
          .insert({
            follower_profile_id: currentUserProfileId,
            following_profile_id: profileId,
          });
        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success("Following!");
      }
      
      // Refresh the follower count to sync with database
      const { count } = await supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('following_profile_id', profileId);
      
      if (count !== null) {
        setFollowerCount(count);
      }
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Failed to update follow status");
    }
  };

  // Auto-follow after redirect from auth if needed
  useEffect(() => {
    const authAction = sessionStorage.getItem('authAction');
    const profileToFollow = sessionStorage.getItem('profileToFollow');
    if (
      authAction === 'follow' &&
      profileToFollow &&
      (profileToFollow === username || profileToFollow === profileId) &&
      currentUserProfileId &&
      currentUserProfileId !== profileId &&
      !isFollowing
    ) {
      // Remove intent so it doesn't repeat
      sessionStorage.removeItem('authAction');
      sessionStorage.removeItem('profileToFollow');
      handleFollow();
    }
  }, [username, profileId, currentUserProfileId, isFollowing]);

  const loadProfile = async () => {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      // Normalize username to lowercase for case-insensitive matching
      const normalizedUsername = username.toLowerCase();
      console.log("Loading profile for username (normalized):", normalizedUsername, "original:", username);
      
      // Try exact match first
      let { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      // If no exact match, try case-insensitive match
      if (!profileData && !error) {
        console.log("No exact match, trying case-insensitive search...");
        const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", username)
          .maybeSingle();
        
        profileData = caseInsensitiveData;
        error = caseInsensitiveError;
      }

      if (error) {
        console.error("Database error:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.log("No profile found for username:", username);
        console.log("Tried both exact and case-insensitive match");
        setNotFound(true);
        setLoading(false);
        return;
      }

      console.log("Profile loaded successfully:", profileData);
      setProfileId(profileData.id);

      // Track page view (basic analytics)
      try {
        await supabase.from("analytics").insert({
          profile_id: profileData.id,
          event_type: "view",
          event_data: { source: "public_share" },
          user_agent: navigator.userAgent,
        });
        console.log("Analytics tracked");
      } catch (trackError) {
        console.log("Analytics tracking failed:", trackError);
        // Silent fail - don't break the user experience
      }

      // Fetch products for this profile
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("profile_id", profileData.id);

      const socialLinks = profileData.social_links as any;
      const themeSettings = profileData.theme_settings as any;
      
      // Load financial data from secure table (public read access)
      let financialData = {
        pi_wallet_address: null,
        pi_donation_message: "Send me a coffee ☕",
        crypto_wallets: {},
        bank_details: {},
      };
      
      try {
        // Financial data is stored directly in profiles table
        financialData = {
          pi_wallet_address: profileData.pi_wallet_address,
          pi_donation_message: profileData.pi_donation_message || "Send me a coffee ☕",
          crypto_wallets: profileData.crypto_wallets || {},
          bank_details: profileData.bank_details || {},
        };
      } catch (error) {
        console.error("Error loading financial data:", error);
      }
      
      const cryptoWallets = financialData.crypto_wallets as any;
      const bankDetails = financialData.bank_details as any;

      // Social links: convert object to array if needed
      let socialLinksArr = [];
      if (Array.isArray(profileData.social_links)) {
        socialLinksArr = profileData.social_links;
      } else if (profileData.social_links && typeof profileData.social_links === 'object') {
        socialLinksArr = Object.entries(profileData.social_links).map(([platform, url]) => ({ platform, url }));
      }

      // Custom links: only if present and array (fallback to empty array)
      let customLinksArr = [];
      let showPiWalletTips = true;
      let themeSettingsObj: any = {};
      if (profileData.theme_settings && typeof profileData.theme_settings === 'object' && !Array.isArray(profileData.theme_settings)) {
        themeSettingsObj = profileData.theme_settings;
        if (Array.isArray(themeSettingsObj.customLinks)) {
          customLinksArr = themeSettingsObj.customLinks;
        }
        if (typeof themeSettingsObj.showPiWalletTips === 'boolean') {
          showPiWalletTips = themeSettingsObj.showPiWalletTips;
        }
      }

      // Wallets: build from crypto_wallets and bank_details
      let walletsObj = { crypto: [], bank: [] };
      if (Array.isArray(profileData.crypto_wallets)) walletsObj.crypto = profileData.crypto_wallets;
      if (Array.isArray(profileData.bank_details)) walletsObj.bank = profileData.bank_details;

      setProfile({
        id: profileData.id,
        username: profileData.username || (username ? String(username) : ""),
        email: "", // email column doesn't exist in profiles table
        logo: profileData.logo || "",
        businessName: profileData.business_name || "",
        description: profileData.description || "",
        youtubeVideoUrl: profileData.youtube_video_url || "",
        socialLinks: socialLinksArr,
        customLinks: customLinksArr,
        theme: {
          primaryColor: themeSettingsObj.primaryColor || "#000000",
          backgroundColor: themeSettingsObj.backgroundColor || "#FFFFFF",
          backgroundType: themeSettingsObj.backgroundType || "color",
          backgroundGif: themeSettingsObj.backgroundGif || "",
          iconStyle: themeSettingsObj.iconStyle || "default",
          buttonStyle: themeSettingsObj.buttonStyle || "default",
        },
        wallets: walletsObj,
        hasPremium: profileData.has_premium || false,
        piWalletAddress: profileData.pi_wallet_address || "",
        piDonationMessage: profileData.pi_donation_message || "",
        showShareButton: profileData.show_share_button || false,
        storeUrl: `@${profileData.username || username || 'user'}`,
        showPiWalletTips,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const trackAnalytics = async (profileId: string, eventType: string, eventData: any) => {
    try {
      await supabase.from("analytics").insert({
        profile_id: profileId,
        event_type: eventType,
        event_data: eventData,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      // Silent fail - don't break the user experience
    }
  };

  const handleSocialClick = (platform: string, profileId: string) => {
    trackAnalytics(profileId, "social_click", { platform });
  };

  const handleProductClick = (productId: string, productTitle: string, profileId: string) => {
    trackAnalytics(profileId, "product_click", { product_id: productId, product_title: productTitle });
  };

  const handleWalletClick = (type: 'crypto' | 'bank', name: string, value: string) => {
    setSelectedWallet({ type, name, value });
    setShowWalletDialog(true);
    setCopied(false);
  };

  const handleCopyWallet = () => {
    if (selectedWallet) {
      navigator.clipboard.writeText(selectedWallet.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !profileId) return;

    try {
      // Use ai_chat_messages table instead of non-existent messages table
      const { error } = await supabase.from("ai_chat_messages").insert({
        profile_id: profileId,
        content: message,
        role: "user",
        session_id: `public_${Date.now()}`,
      });

      if (error) {
        toast.error("Failed to send message. Please try again.");
      } else {
        toast.success("Message sent successfully!");
        setMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      console.error("Error sending message:", error);
      toast.error("An unexpected error occurred.");
    }
  };

  const getSocialIcon = (platform: string) => {
    if (!platform) return <LinkIcon className="w-5 h-5" />;
    const p = platform.toLowerCase();
    if (["twitter", "x", "x.com"].includes(p)) return <FaXTwitter className="w-5 h-5" />;
    if (["instagram", "insta", "instagram.com"].includes(p)) return <FaInstagram className="w-5 h-5" />;
    if (["youtube", "yt", "youtube.com", "youtube.com/@"].includes(p)) return <FaYoutube className="w-5 h-5" />;
    if (["tiktok", "tiktok.com", "tiktok.com/@"].includes(p)) return <FaTiktok className="w-5 h-5" />;
    if (["facebook", "fb", "facebook.com"].includes(p)) return <FaFacebook className="w-5 h-5" />;
    if (["linkedin", "li", "linkedin.com", "linkedin.com/in/"].includes(p)) return <FaLinkedin className="w-5 h-5" />;
    if (["twitch", "twitch.tv"].includes(p)) return <FaTwitch className="w-5 h-5" />;
    if (["website", "web", "site", "homepage", "home", "globe"].includes(p)) return <FaGlobe className="w-5 h-5" />;
    return <LinkIcon className="w-5 h-5" />;
  };

  const getIconStyle = (style: string) => {
    switch (style) {
      case "rounded":
        return "rounded-2xl";
      case "square":
        return "rounded-none";
      case "circle":
        return "rounded-full";
      default:
        return "rounded-2xl";
    }
  };

  const getButtonStyles = (primaryColor: string, buttonStyle: string) => {
    if (buttonStyle === 'outlined') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        border: `2px solid ${primaryColor}`,
        color: '#fff',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
      };
    } else {
      return {
        backgroundColor: primaryColor,
        color: '#fff',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      };
    }
  };

  const getCustomLinkIcon = (iconValue?: string) => {
    switch (iconValue) {
      case "shop": return <ShoppingBag className="w-5 h-5" />;
      case "mail": return <Mail className="w-5 h-5" />;
      case "phone": return <Phone className="w-5 h-5" />;
      case "calendar": return <Calendar className="w-5 h-5" />;
      case "download": return <Download className="w-5 h-5" />;
      case "external": return <ExternalLink className="w-5 h-5" />;
      case "heart": return <Heart className="w-5 h-5" />;
      case "star": return <Star className="w-5 h-5" />;
      case "zap": return <Zap className="w-5 h-5" />;
      default: return <LinkIcon className="w-5 h-5" />;
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  useEffect(() => {
    if (notFound || !profile) {
      if (typeof window !== 'undefined') {
        const piAuthJustSignedIn = sessionStorage.getItem('piAuthJustSignedIn');
        if (piAuthJustSignedIn === 'true') {
          sessionStorage.removeItem('piAuthJustSignedIn');
          setShouldAutoRefresh(true);
        }
      }
    }
  }, [notFound, profile]);

  useEffect(() => {
    if (shouldAutoRefresh) {
      window.location.reload();
    }
  }, [shouldAutoRefresh]);

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#000000" }}
      >
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#000000" }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-gray-400">This store doesn't exist or has been removed.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const socialLinksArray = Object.entries(profile.socialLinks)
    .filter(([_, url]) => url)
    .map(([platform, url]) => ({ platform, url }));

  return (
    <div 
      className="min-h-screen p-6 flex flex-col items-center relative overflow-x-hidden w-full max-w-full"
      style={
        profile.theme.backgroundType === 'gif' && profile.theme.backgroundGif
          ? {}
          : { backgroundColor: profile.theme.backgroundColor }
      }
    >
      {/* Pi User Header with Sign Out */}
      {isPiAuthenticated && piUser && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
          <div className="text-white text-sm font-medium">
            @{piUser.username}
          </div>
          <Button
            onClick={async () => {
              await signOut();
              toast.success("Signed out successfully");
              // Reload to update UI
              window.location.reload();
            }}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10 h-8 px-3"
          >
            Sign out
          </Button>
        </div>
      )}
      
      {/* GIF Background - lock if expired */}
      {profile.theme.backgroundType === 'gif' && profile.theme.backgroundGif && !isPlanExpired && (
        <div className="fixed inset-0 z-0">
          <img
            src={profile.theme.backgroundGif}
            alt="Background"
            className="w-full h-full object-cover"
            style={{ minHeight: '100vh' }}
            onError={(e) => {
              console.log('GIF background failed to load in PublicBio:', profile.theme.backgroundGif);
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent && parent.parentElement) {
                parent.parentElement.style.backgroundColor = profile.theme.backgroundColor || '#000000';
              }
              // Show fallback message
              const fallback = document.createElement('div');
              fallback.className = 'absolute inset-0 flex items-center justify-center text-white bg-black/60';
              fallback.innerText = 'Failed to load GIF';
              parent?.appendChild(fallback);
            }}
            onLoad={() => {
              console.log('GIF background loaded successfully in PublicBio:', profile.theme.backgroundGif);
            }}
          />
          <div className="absolute inset-0 bg-black/30" /> {/* Overlay for better readability */}
        </div>
      )}
      {profile.theme.backgroundType === 'gif' && profile.theme.backgroundGif && isPlanExpired && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70">
          <span className="text-white text-lg font-semibold">GIF background is locked. Renew plan to unlock.</span>
        </div>
      )}
      
      <div className="w-full max-w-2xl space-y-8 py-12 relative z-10">
        {/* Pi AdNetwork logic based on creator's plan */}
        {showPiAds && (
          <div className="mb-6">
            <PiAdsBanner />
          </div>
        )}
        
        {/* Logo and Business Info */}
        <div className="text-center space-y-4">
          {profile.logo && (
            <div className="flex justify-center mb-6">
              <div 
                className={`w-24 h-24 ${getIconStyle(profile.theme.iconStyle)} overflow-hidden`}
                style={{ backgroundColor: profile.theme.primaryColor }}
              >
                <img 
                  src={profile.logo} 
                  alt={profile.businessName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-white">
            {profile.businessName}
          </h1>
          
          {/* Follower and Visit Counts - Controlled by Preferences */}
          <div className="flex gap-6 justify-center text-sm text-white">
            {userPreferences?.store_settings?.showFollowerCount !== false && (
              <div className="text-center">
                <div className="font-semibold text-lg" style={{ color: profile.theme.primaryColor }}>
                  {followerCount.toLocaleString()}
                </div>
                <div className="text-white">Followers</div>
              </div>
            )}
            {userPreferences?.store_settings?.showVisitCount !== false && (
              <div className="text-center">
                <div className="font-semibold text-lg" style={{ color: profile.theme.primaryColor }}>
                  {visitCount.toLocaleString()}
                </div>
                <div className="text-white">Views</div>
              </div>
            )}
          </div>
          
          {profile.description && (
            <p className="text-white max-w-md mx-auto">
              {profile.description}
            </p>
          )}

          {/* Background Music Player */}
          {profile.backgroundMusicUrl && (
            <div className="max-w-md mx-auto w-full">
              <BackgroundMusicPlayer 
                musicUrl={profile.backgroundMusicUrl}
                autoPlay={false}
                loop={true}
              />
            </div>
          )}

          {/* Follow/Sign In and Gift Buttons */}
          <div className="flex gap-3 justify-center pt-4">
            {/* Show Sign In button if user is not authenticated, otherwise show Follow */}
            {!currentUserProfileId && isPiAuthenticated === false && typeof window !== 'undefined' && window.Pi ? (
              <Button
                onClick={handlePiSignIn}
                className={`${getIconStyle(profile.theme.iconStyle)} gap-2 px-6 py-3 text-white`}
                style={{ 
                  backgroundColor: profile.theme.primaryColor,
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                }}
              >
                <UserPlus className="w-5 h-5" />
                Sign in to Follow
              </Button>
            ) : currentUserProfileId && currentUserProfileId !== profileId ? (
              <Button
                onClick={handleFollow}
                className={`${getIconStyle(profile.theme.iconStyle)} gap-2 px-6 py-3 text-white`}
                style={isFollowing ? { 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: `2px solid ${profile.theme.primaryColor}`,
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                } : { 
                  backgroundColor: profile.theme.primaryColor,
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                }}
                variant={isFollowing ? "outline" : "default"}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-5 h-5" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Follow
                  </>
                )}
              </Button>
            ) : null}
            
            {/* Gift button - only show if user is authenticated */}
            {currentUserProfileId && currentUserProfileId !== profileId && userPreferences?.store_settings?.allowGifts !== false && (
              <Button
                onClick={() => setShowGiftDialog(true)}
                className={`${getIconStyle(profile.theme.iconStyle)} gap-2 px-6 py-3 text-white`}
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: `2px solid ${profile.theme.primaryColor}`,
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                }}
                variant="outline"
              >
                <Gift className="w-5 h-5" />
                Gift
              </Button>
            )}
          </div>

          {/* Anonymous Follow Prompt - Only show if not in Pi Browser or not showing sign-in button */}
          {!currentUserProfileId && !(typeof window !== 'undefined' && window.Pi && isPiAuthenticated === false) && (
            <div className="flex justify-center pt-4">
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white mb-3">
                  Like this store? Sign up to follow!
                </p>
                <Button
                  onClick={() => {
                    // Redirect to signup
                    handleSignUpToFollow();
                  }}
                  className={`${getIconStyle(profile.theme.iconStyle)} gap-2`}
                  style={{ backgroundColor: profile.theme.primaryColor }}
                >
                  <UserPlus className="w-4 h-4" />
                  {typeof window !== 'undefined' && window.Pi ? 'Sign In with Pi to Follow' : 'Sign Up to Follow'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* YouTube Video */}
        {profile.youtubeVideoUrl && extractYouTubeVideoId(profile.youtubeVideoUrl) && (
          <div className="w-full max-w-2xl">
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl">
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeVideoId(profile.youtubeVideoUrl)}`}
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
              />
            </div>
          </div>
        )}

        {/* Social Links - Controlled by Preferences */}
        {Array.isArray(socialLinksArray) && socialLinksArray.length > 0 && userPreferences?.store_settings?.showSocialLinks !== false && (
          <div className="flex flex-wrap justify-center gap-3">
            {socialLinksArray.map((link) => (
              <a
                key={link.platform}
                href={typeof link.url === 'string' ? link.url : ''}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => profileId && handleSocialClick(link.platform, profileId)}
                className={`w-12 h-12 ${getIconStyle(profile.theme.iconStyle)} flex items-center justify-center transition-opacity hover:opacity-80`}
                style={{ backgroundColor: profile.theme.primaryColor }}
              >
                <span className="text-white">
                  {getSocialIcon(link.platform)}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Custom Links */}
        {Array.isArray(profile.customLinks) && profile.customLinks.length > 0 && (
          <div className="space-y-3">
            {profile.customLinks.map((link) => {
              const buttonStyles = getButtonStyles(profile.theme.primaryColor, profile.theme.buttonStyle);
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-3 w-full py-4 px-6 ${getIconStyle(profile.theme.iconStyle)} font-medium text-white transition-all hover:opacity-90`}
                  style={buttonStyles}
                >
                  {getCustomLinkIcon(link.icon)}
                  <span>{link.title}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Products */}
        {Array.isArray(profile.products) && profile.products.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white text-center mb-6">
              Digital Products
            </h2>
            {profile.products.map((product) => (
              <div
                key={product.id}
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.1)"
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {product.title}
                    </h3>
                    {product.description && (
                      <p className="text-white text-sm mb-3">
                        {product.description}
                      </p>
                    )}
                    <p 
                      className="text-xl font-bold"
                      style={{ color: profile.theme.primaryColor }}
                    >
                      {product.price}
                    </p>
                  </div>
                  {product.fileUrl && (
                    <a
                      href={product.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => profileId && handleProductClick(product.id, product.title, profileId)}
                      className={`px-6 py-3 ${getIconStyle(profile.theme.iconStyle)} font-medium text-white transition-opacity hover:opacity-90`}
                      style={{ backgroundColor: profile.theme.primaryColor }}
                    >
                      Purchase
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Donation Wallets */}
        {(Array.isArray(profile.wallets?.crypto) && profile.wallets.crypto.length > 0 || Array.isArray(profile.wallets?.bank) && profile.wallets.bank.length > 0) && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white text-center mb-6 flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5" />
              Support with Tips & Donations
            </h2>
            
            {Array.isArray(profile.wallets?.crypto) && profile.wallets.crypto.length > 0 && (
              <div className="space-y-3">
                <p className="text-white text-sm text-center">Crypto Wallets</p>
                {profile.wallets.crypto.map((wallet) => (
                   <button
                     key={wallet.id}
                     onClick={() => handleWalletClick('crypto', wallet.name, wallet.address)}
                     className={`w-full p-4 ${getIconStyle(profile.theme.iconStyle)} border glass transition-all hover:opacity-90`}
                     style={{ 
                       borderColor: profile.theme.primaryColor
                     }}
                   >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{wallet.name}</span>
                      <span className="text-white text-sm">Tap for QR</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {Array.isArray(profile.wallets?.bank) && profile.wallets.bank.length > 0 && (
              <div className="space-y-3 mt-6">
                <p className="text-white text-sm text-center">Bank Accounts</p>
                {profile.wallets.bank.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleWalletClick('bank', account.bankName, account.details)}
                    className={`w-full p-4 ${getIconStyle(profile.theme.iconStyle)} border glass transition-all hover:opacity-90`}
                    style={{ 
                      borderColor: profile.theme.primaryColor
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{account.bankName}</span>
                      <span className="text-white text-sm">Tap for details</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pi Wallet Tips - show only if enabled */}
        {/* Pi Wallet Tips - lock if expired */}
        {profile.showPiWalletTips !== false && !isPlanExpired && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white text-center mb-6 flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5 text-blue-400" />
              Receive DROP or Pi Tips
              {isMobile ? (
                <>
                  <Info
                    className="w-4 h-4 text-blue-300 cursor-pointer ml-2"
                    onClick={() => setShowPiWalletTip(true)}
                  />
                  <Dialog open={showPiWalletTip} onOpenChange={setShowPiWalletTip}>
                    <DialogContent className="max-w-xs w-full">
                      <DialogHeader>
                        <DialogTitle>About DROP Tips</DialogTitle>
                      </DialogHeader>
                      <div className="text-center text-blue-100 text-xs leading-snug">
                        DROP is the utility token for DropLink. Send only Pi Network DROP tokens to this address.<br /><br />You can copy or scan the QR code below.
                      </div>
                      <div className="flex justify-center mt-4">
                        <Button onClick={() => setShowPiWalletTip(false)} className="bg-blue-500 text-white w-full">Close</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <span className="relative group ml-2">
                  <Info className="w-4 h-4 text-blue-300 cursor-pointer" />
                  <span
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 max-w-xs sm:max-w-sm bg-blue-900 text-white text-xs sm:text-sm rounded p-3 sm:p-4 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center text-center"
                    style={{ minWidth: '180px', maxWidth: '90vw', wordBreak: 'break-word' }}
                  >
                    <span className="w-full block text-center leading-snug">
                      DROP is the utility token for DropLink. Send only Pi Network DROP tokens to this address.<br /><br />You can copy or scan the QR code below.
                    </span>
                  </span>
                </span>
              )}
            </h2>
            <div className="text-center space-y-4">
              {profile.piWalletAddress ? (
                <div>
                  {/* Instructional Example Dialog Note */}
                  <div className="bg-blue-900/80 rounded-lg border border-blue-400/30 p-4 mb-4 text-center">
                    <div className="text-blue-200 font-semibold mb-1">Example: How to Send DROP Tokens</div>
                    <div className="text-blue-100 text-sm mb-2">This is an example dialog to help you understand how to send DROP tokens using the Pi Network Wallet. Follow the instructions below to complete your transaction.</div>
                  </div>
                  <div className="bg-blue-500/20 backdrop-blur rounded-lg border border-blue-400/30 p-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Wallet className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-300 font-medium">Pi Network Wallet</span>
                    </div>
                    <p className="text-white text-sm mb-4">{profile.piDonationMessage || "Send me DROP tokens on Pi Network!"}</p>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-4">
                      {/* Inline QR code for wallet address */}
                      <div className="flex flex-col items-center">
                        <div className="relative w-[96px] h-[96px]">
                          <QRCodeSVG value={profile.piWalletAddress} size={96} bgColor="#fff" fgColor="#2563eb" />
                          <img
                            src="https://i.ibb.co/1fdJky1d/Gemini-Generated-Image-ar8t52ar8t52ar8t.png"
                            alt="Droplink Logo"
                            className="absolute left-1/2 top-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 z-10 shadow-lg border-2 border-white bg-white rounded-lg"
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                        <span className="text-xs text-blue-400 mt-1">Scan to send DROP</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-2 items-center justify-center">
                        <input
                          type="text"
                          value={profile.piWalletAddress}
                          readOnly
                          className="w-full bg-black/50 border border-blue-400/30 rounded px-3 py-2 text-white text-xs font-mono"
                        />
                        <div className="flex gap-2 w-full justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(profile.piWalletAddress!);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                              toast.success("Wallet address copied!");
                            }}
                            className="border-blue-400/30 text-blue-300 hover:bg-blue-500/20"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span className="ml-1">Copy</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/pay/${profile.piWalletAddress}`;
                              navigator.clipboard.writeText(shareUrl);
                              toast.success("Shareable wallet link copied!");
                            }}
                            className="border-blue-400/30 text-blue-300 hover:bg-blue-500/20"
                          >
                            <Share2 className="w-4 h-4" />
                            <span className="ml-1">Share Wallet</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Pay with Pi Button */}
                    <div className="flex flex-col items-center gap-2 mt-4">
                      <Button
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-2 rounded-full shadow-lg"
                        onClick={() => setShowPiPaymentDialog(true)}
                      >
                        Pay with Pi
                      </Button>
                      <Button
                        variant="outline"
                        className="text-blue-600 border-blue-400 hover:bg-blue-50 mt-2"
                        onClick={() => navigate('/dashboard?tab=payments')}
                      >
                        Manage Pi Payments in Dashboard
                      </Button>
                    </div>
                    {/* Example instructions for sending DROP tokens */}
                    <div className="bg-blue-100/30 rounded-lg p-3 mt-2 text-xs text-blue-900 text-left">
                      <div className="font-semibold mb-1">How to send DROP tokens:</div>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open your Pi Wallet app</li>
                        <li>Scan this QR code or enter the address</li>
                        <li>Enter the amount of DROP tokens to send</li>
                        <li>Confirm the transaction</li>
                      </ol>
                    </div>
                  </div>
                  {/* Pi Payment Dialog */}
                  <PiPaymentDialog
                    open={showPiPaymentDialog}
                    onOpenChange={setShowPiPaymentDialog}
                    walletAddress={profile.piWalletAddress}
                    loading={piPaymentLoading}
                    onSubmit={async (amount, message) => {
                      setPiPaymentLoading(true);
                      try {
                        // Memo can include the message and receiver info
                        const memo = message ? `${message}` : "";
                        const metadata = {
                          receiverWallet: profile.piWalletAddress,
                          receiverUsername: profile.username,
                          senderUsername: piUser?.username || undefined,
                          publicBio: true
                        };
                        const txid = await createPayment(Number(amount), memo, metadata);
                        if (txid) {
                          toast.success(`Payment of ${amount} Pi sent!`, { description: `Transaction: ${txid.substring(0, 16)}...` });
                          setShowPiPaymentDialog(false);
                        } else {
                          toast.error("Payment was not completed.");
                        }
                      } catch (err) {
                        toast.error("Payment failed", { description: err instanceof Error ? err.message : String(err) });
                      } finally {
                        setPiPaymentLoading(false);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="bg-blue-500/10 rounded-lg border border-blue-400/10 p-6 text-center text-white">
                  <Wallet className="w-6 h-6 text-blue-300 mx-auto mb-2" />
                  <div className="text-blue-200 font-semibold mb-1">No Pi Network Wallet Set</div>
                  <div className="text-blue-100 text-sm mb-2">The profile owner has not set a Pi wallet address yet.</div>
                  <div className="text-xs text-blue-300">Once a wallet is set in the dashboard, it will appear here for tips and DROP tokens.</div>
                </div>
              )}
            </div>
          </div>

        )}

        {profile && profile.showPiWalletTips !== false && isPlanExpired && (
          <div className="bg-blue-900/80 rounded-lg border border-blue-400/30 p-6 text-center my-6 text-white">
            <Wallet className="w-6 h-6 text-blue-300 mx-auto mb-2" />
            <div className="text-blue-200 font-semibold mb-1">Pi Tips are locked</div>
            <div className="text-blue-100 text-sm mb-2">This feature is locked because the plan has expired. Renew to unlock Pi Tips.</div>
          </div>
        )}

        {/* Share Button */}
        {profile.showShareButton && (
          <div className="flex justify-center py-6">
            <Button
              onClick={() => setShowShareDialog(true)}
              className="gap-2 text-gray-900 bg-white border border-gray-300 hover:bg-gray-100"
              style={{ backgroundColor: '#fff', color: '#111', borderColor: '#e5e7eb' }}
            >
              <Share2 className="w-4 h-4" />
              <span style={{color:'#111'}}>Share Profile</span>
            </Button>
          </div>
        )}

        {/* Followers Section */}
        {profileId && (
          <FollowersSection 
            profileId={profileId} 
            currentUserProfileId={currentUserProfileId || undefined}
          />
        )}

        {/* Message Input Section - Only for followers */}
        {currentUserProfileId && currentUserProfileId !== profileId && (
          <div className="mt-8">
            {/* Use the Pi payment + message form */}
            <PublicBioMessageForm 
              receiverUsername={profile.username} 
              senderUsername={piUser?.username || ''} 
            />
          </div>
        )}

        {/* Droplink Branding Footer */}
        {!profile.hasPremium && (
          <div className="text-center py-8 border-t border-white/10">
            <button
              onClick={() => window.location.href = 'https://www.droplink.space'}
              className="text-white/60 text-sm font-medium hover:text-sky-400 transition-colors cursor-pointer"
            >
              JOIN <span className="text-sky-400">DROPLINK</span> BY MRWAIN ORGANIZATION
            </button>
          </div>
        )}

        {/* Report Button in Footer */}
        <div className="text-center py-6 border-t border-white/10">
          <button
            className="bg-white/80 hover:bg-red-100 rounded-full p-3 shadow-lg border border-red-300 inline-flex items-center gap-2 px-6 transition-all"
            title="Report unwanted content"
            onClick={() => setShowReportModal(true)}
          >
            <Flag className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">Report Unwanted Content</span>
          </button>
        </div>
      </div>

      {/* Wallet Details Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {selectedWallet?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWallet?.type === 'crypto' && (
              <div className="flex justify-center p-4 bg-white rounded-lg relative">
                <QRCodeSVG value={selectedWallet.value} size={200} />
                <img
                  src="https://i.ibb.co/1fdJky1d/Gemini-Generated-Image-ar8t52ar8t52ar8t.png"
                  alt="Droplink Logo"
                  className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-lg"
                  style={{ pointerEvents: 'none', background: 'white' }}
                />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {selectedWallet?.type === 'crypto' ? 'Wallet Address' : 'Account Details'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedWallet?.value || ''}
                  readOnly
                  className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
                />
                <Button size="sm" onClick={handleCopyWallet}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Profile Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg relative w-[240px] h-[240px] mx-auto items-center">
              <QRCodeSVG
                value={`${window.location.origin}/${profile.storeUrl}`}
                size={200}
                fgColor="#222"
                bgColor="#fff"
              />
              <img
                src="https://i.ibb.co/1fdJky1d/Gemini-Generated-Image-ar8t52ar8t52ar8t.png"
                alt="Droplink Logo"
                className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 z-10 shadow-lg border-2 border-white bg-white rounded-lg"
                style={{ pointerEvents: 'none' }}
              />
            </div>
            <p className="text-base font-semibold text-center text-gray-900" style={{wordBreak:'break-word'}}>
              {`${window.location.origin}/${profile.storeUrl}`}
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/${profile.storeUrl}`);
                  toast.success("Link copied!");
                }}
              >
                <Copy className="w-4 h-4" />
                Copy Profile Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gift Dialog */}
      {profileId && currentUserProfileId && (
        <GiftDialog
          open={showGiftDialog}
          onOpenChange={setShowGiftDialog}
          receiverProfileId={profileId}
          senderProfileId={currentUserProfileId}
          receiverName={profile.businessName}
        />
      )}

      {/* Pi Wallet Tip Dialog */}
      {profile && (
        <Dialog open={showPiWalletTip} onOpenChange={setShowPiWalletTip}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500" />
                Send DROP Tokens
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {profile.piDonationMessage || "Scan QR code to send DROP tokens"}
                </p>
                <p className="text-xs text-blue-600 mb-4">Pi Network Blockchain</p>
              </div>
              
              <div className="flex justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="relative w-[200px] h-[200px]">
                  <QRCodeSVG 
                    value={profile.piWalletAddress || ''} 
                    size={200}
                    bgColor="#f8fafc"
                    fgColor="#1e40af"
                  />
                  <img
                    src="https://i.ibb.co/1fdJky1d/Gemini-Generated-Image-ar8t52ar8t52ar8t.png"
                    alt="Droplink Logo"
                    className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 z-10 shadow-lg border-2 border-white bg-white rounded-lg"
                    style={{ pointerEvents: 'none' }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Pi Network Wallet Address</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profile.piWalletAddress || ''}
                    readOnly
                    className="flex-1 px-3 py-2 bg-muted rounded-md text-xs font-mono"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(profile.piWalletAddress || '');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      toast.success("Address copied!");
                    }}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">How to send DROP tokens:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Open your Pi Wallet app</li>
                      <li>Scan this QR code or enter the address</li>
                      <li>Enter the amount of DROP tokens to send</li>
                      <li>Confirm the transaction</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Chat Widget */}
      {profileId && <AIChatWidget profileId={profileId} />}
      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-xs w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowReportModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="flex flex-col items-center gap-3">
              <Flag className="w-8 h-8 text-red-500 mb-2" />
              <h2 className="text-lg font-bold text-red-600">Report Unwanted Content</h2>
              <p className="text-sm text-gray-700 text-center mb-2">If you see inappropriate, abusive, or unwanted content on this profile, please report it. Your feedback helps keep Droplink safe for everyone.</p>
              <a
                href="https://www.droplink.space/report-abuse"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold shadow hover:bg-red-600 transition"
              >
                Go to Report Page
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBio;
