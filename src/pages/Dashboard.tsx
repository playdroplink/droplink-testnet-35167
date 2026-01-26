import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhonePreview } from "@/components/PhonePreview";
import { Analytics } from "@/components/Analytics";
import { DesignCustomizer } from "@/components/DesignCustomizer";
import { CustomLinksManager } from "@/components/CustomLinksManager";
import { PiAdBanner } from "@/components/PiAdBanner";
import { AdGatedFeature } from "@/components/AdGatedFeature";
import { PlanGate } from "@/components/PlanGate";
import { useActiveSubscription } from "@/hooks/useActiveSubscription";
import { useMonetization } from "@/hooks/useMonetization";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ProductManager } from "@/components/ProductManager";
import { MembershipManager } from "@/components/MembershipManager";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
// Removed duplicate Dialog imports to fix duplicate identifier errors
import { useAutoSave } from "@/hooks/useAutoSave";
import { saveProfileToSupabase } from "@/lib/realtimeSync";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { performCompleteSignOut } from "@/lib/auth-utils";
import { UserPreferencesManager } from "@/components/UserPreferencesManager";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { AboutModal } from "@/components/AboutModal";
import { RandomAvatarGenerator } from "@/components/RandomAvatarGenerator";
import { FutureFeaturesDashboard } from "@/components/FutureFeaturesDashboard";
import { DropTokenManager } from "@/components/DropTokenManager";
import PiAdNetwork from "../components/PiAdNetwork";
import PiPayments from "@/components/PiPayments";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import VotingSystem from "@/components/VotingSystem";
import { ProfileData } from "@/types/profile";
import LinkManager from "@/components/LinkManager";
import { PiAuthTest } from "@/components/PiAuthTest";
import { AccountDeletion } from "@/components/AccountDeletion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ComingSoonModal } from "@/components/ComingSoonModal";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import {
  Upload, 
  Twitter, 
  Instagram, 
  Youtube, 
  Music, 
  Facebook, 
  Linkedin, 
  Twitch, 
  Globe,
  LogOut,
  Eye,
  EyeOff,
  Settings,
  Palette,
  BarChart3,
  QrCode,
  Share2,
  Menu,
  Wallet,
  Users,
  User,
  Bot,
  Info,
  Sparkles,
  Droplets,
  TrendingUp,
  PlayCircle,
  CreditCard,
  Crown,
  Store,
  Mail,
  Moon,
  Sun,
  Home,
  Plus,
  Search,
  Image,
  ExternalLink,
} from "lucide-react";
import { 
  FaTwitter, 
  FaInstagram, 
  FaYoutube, 
  FaSpotify, 
  FaFacebook, 
  FaLinkedin, 
  FaTwitch, 
  FaTiktok
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { toast } from "sonner";

// Utility: Check if running in Pi Browser
function isPiBrowserMobile() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || '';
  return /PiBrowser/i.test(ua) && /Mobile/i.test(ua);
}
import { QRCodeDialog } from "@/components/QRCodeDialog";
import PiDataManager from "@/components/PiDataManager";
import { useState as useQRState } from "react";

interface PaymentLink {
  id: string;
  amount: number;
  description: string;
  type: 'product' | 'donation' | 'tip' | 'subscription' | 'group';
  url: string;
  created: Date;
  active: boolean;
  totalReceived: number;
  transactionCount: number;
}

const Dashboard = () => {
  const [showPlanModal, setShowPlanModal] = useState(false);
  // AI Logo Generation State (fix ReferenceError)
  // Greeting state
  const [greeting, setGreeting] = useState("");
  const [aiLogoPrompt, setAiLogoPrompt] = useState("");
  const [aiLogoLoading, setAiLogoLoading] = useState(false);
  const [aiLogoError, setAiLogoError] = useState("");
  const [showFooter, setShowFooter] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();
  
  // Hooks must be called unconditionally
  const piContext = usePi();
  const { piUser, isAuthenticated, signIn, signOut: piSignOut, loading: piLoading, getCurrentWalletAddress } = piContext;
  const [showPiAuthModal, setShowPiAuthModal] = useState(false);

  // Scroll detection for footer navigation
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setShowFooter(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold - hide footer
        setShowFooter(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show footer
        setShowFooter(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Enforce Pi Auth on dashboard load
  useEffect(() => {
    if (!isAuthenticated || !piUser) {
      // Require Pi auth
      setShowPiAuthModal(true);
    } else {
      setShowPiAuthModal(false);
    }
  }, [isAuthenticated, piUser]);

  const handlePiAuth = async () => {
    try {
      await signIn(["username", "payments", "wallet_address"]);
      setShowPiAuthModal(false);
      toast.success("Pi authentication complete! Dashboard unlocked.");
    } catch (error) {
      toast.error("Pi authentication failed. Please try again in Pi Browser.");
    }
  };

  // Set greeting based on time
  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    };
    setGreeting(getGreeting());
  }, []);

  const subscription = useActiveSubscription();
  const { plan, expiresAt, loading: subscriptionLoading, profileId: subscriptionProfileId, refetch: refetchSubscription } = subscription;
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [cancelingPlan, setCancelingPlan] = useState(false);
  
  // State declarations (must come before any hooks that use them)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Check expiration and show modal if expired or near expiration
  useEffect(() => {
    if (!subscriptionLoading && expiresAt) {
      const now = new Date();
      const expires = new Date(expiresAt);
      // Show modal if expired or within 3 days
      if (expires < now || (expires.getTime() - now.getTime()) < 3 * 24 * 60 * 60 * 1000) {
        setShowRenewModal(true);
      } else {
        setShowRenewModal(false);
      }
    }
  }, [expiresAt, subscriptionLoading]);

  // Helper: is plan expired?
  const isPlanExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  
  const { preferences, updateNestedPreference, updatePreference } = useUserPreferences();
  
  const isMobile = useIsMobile();
  const [showPreview, setShowPreview] = useState(!preferences.dashboard_layout.sidebarCollapsed);
  const [showQRCode, setShowQRCode] = useState(false);
  const [piWalletQrData, setPiWalletQrData] = useState<string>("");
  const [showPiWalletQR, setShowPiWalletQR] = useState(false);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const [displayUsername, setDisplayUsername] = useState<string | null>(null);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showDropStoreModal, setShowDropStoreModal] = useState(false);
  const [showDropPayModal, setShowDropPayModal] = useState(false);

  // Check for Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSupabaseSession(!!session?.user);
    };
    checkSession();
  }, []);

  // Add timeout for auth loading to prevent infinite loading
  useEffect(() => {
    const authTimeout = setTimeout(() => {
      if (loading) {
        console.log('Authentication timeout - proceeding without Pi auth');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(authTimeout);
  }, [loading]);

  const [profile, setProfile] = useState<ProfileData>({
    id: "",
    username: "",
    logo: "",
    businessName: "",
    storeUrl: "",
    description: "",
    email: "",
    youtubeVideoUrl: "",
    backgroundMusicUrl: "",
    socialLinks: [
      { type: "twitter", url: "", icon: "twitter", followers: 0 },
      { type: "instagram", url: "", icon: "instagram", followers: 0 },
      { type: "youtube", url: "", icon: "youtube", followers: 0 },
      { type: "tiktok", url: "", icon: "tiktok", followers: 0 },
      { type: "facebook", url: "", icon: "facebook", followers: 0 },
      { type: "linkedin", url: "", icon: "linkedin", followers: 0 },
      { type: "twitch", url: "", icon: "twitch", followers: 0 },
      { type: "website", url: "", icon: "website", followers: 0 },
    ],
    customLinks: [],
    theme: {
      primaryColor: "#38bdf8",
      backgroundColor: "#000000",
      backgroundType: "color",
      backgroundGif: "",
      backgroundVideo: "",
      iconStyle: "rounded",
      buttonStyle: "filled",
      glassMode: false,
      coverImage: "",
    },
    products: [],
    paymentLinks: [],
    hasPremium: false,
    showShareButton: true,
    piWalletAddress: "",
    piDonationMessage: "Send me a coffee ☕",
    isVerified: false,
  });

  // Monetization hooks (now profileId state is declared above)
  const { tiers, products, orders, leads, saveTier, saveProduct, deleteTier, deleteProduct, createOrder, captureLead, exportLeads } = useMonetization(profileId);
  const { summary: analyticsSummary, logClickEvent, exportAnalytics } = useAnalytics(profileId);
  
  // Use profileId if available, otherwise fall back to subscriptionProfileId
  const effectiveProfileId = profileId || subscriptionProfileId;

  // Auto-save functionality with enhanced database sync and robust Pi Browser/mobile error handling
  const autoSave = useAutoSave<ProfileData>({
    tableName: 'profiles',
    recordId: profileId || '',
    delay: 3000, // 3 second delay
    onSave: async (data: ProfileData) => {
      // Enhanced save logic for all profile features
      if (!profileId) return;

      // Pi Browser/mobile-specific checks
      if (isPiBrowserMobile()) {
        if (typeof window.Pi === 'undefined') {
          toast.error('Pi SDK not loaded. Please refresh in Pi Browser.');
          throw new Error('Pi SDK not loaded');
        }
        if (!piUser || !isAuthenticated) {
          toast.error('You must be authenticated with Pi Network to save changes. Please sign in again.');
          throw new Error('Not authenticated in Pi Browser');
        }
      }

      try {
        // 1. Upsert main profile data with all features (prevents UNIQUE_VIOLATION)
        if (!profileId || !data.username) {
          toast.error('Profile ID or username missing. Cannot save profile.');
          throw new Error('Profile ID or username missing');
        }
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: profileId,
            business_name: data.businessName,
            description: data.description,
            email: data.email,
            youtube_video_url: data.youtubeVideoUrl,
            social_links: data.socialLinks as any,
            theme_settings: {
              ...data.theme,
              glassMode: data.theme?.glassMode ?? false,
              customLinks: data.customLinks || [],
              paymentLinks: (data.paymentLinks || []).map(link => ({
                id: link.id,
                amount: link.amount,
                description: link.description,
                type: link.type,
                url: link.url,
                created: link.created.toISOString(),
                active: link.active,
                totalReceived: link.totalReceived,
                transactionCount: link.transactionCount
              }))
            } as any,
            logo: data.logo,
            show_share_button: data.showShareButton,
            pi_wallet_address: data.piWalletAddress,
            pi_donation_message: data.piDonationMessage,
            background_music_url: data.backgroundMusicUrl,
            has_premium: data.hasPremium || false,
            is_verified: data.isVerified || false,
            updated_at: new Date().toISOString(),
            username: data.username
          });

        if (profileError) {
          // Log full error for debugging
          console.error('Supabase profile upsert error:', profileError);
          // Show specific error messages for common issues
          if (profileError.message?.includes('permission denied') || profileError.message?.includes('row level security')) {
            toast.error('Supabase permissions error. Please check RLS policies and API key permissions.');
          } else if (profileError.message?.includes('does not exist') || profileError.message?.includes('column')) {
            toast.error('Supabase schema error. Please check that the profiles table and all columns exist.');
          } else if (profileError.code === '23505' || profileError.message?.includes('duplicate key')) {
            toast.error('Username or ID already exists. Please use a unique username.');
          } else {
            toast.error('Failed to save profile to database. Please try again.');
          }
          throw profileError;
        }

        // 2. Sync products to database
        if (data.products && data.products.length > 0) {
          // Delete existing products for clean sync
          await supabase
            .from('products')
            .delete()
            .eq('profile_id', profileId);

          // Insert updated products
          const productsToInsert = data.products.map(product => ({
            profile_id: profileId,
            title: product.title,
            description: product.description,
            price: typeof product.price === 'string' ? product.price : product.price?.toString?.() ?? "",
            file_url: product.fileUrl
          }));

          if (productsToInsert.length > 0) {
            const { error: productsError } = await supabase
              .from('products')
              .insert(productsToInsert);

            if (productsError) {
              console.error('Products sync error:', productsError);
            }
          }
        }

        // 3. Enhanced localStorage backup with all features
        // (defaultProfile definition moved outside this block for clarity)
        // ...rest of the code remains unchanged...

        console.log('✅ All user data synced to Supabase successfully');

      } catch (error) {
        // Show a more specific error for Pi Browser/mobile
        if (isPiBrowserMobile()) {
          toast.error('Save failed in Pi Browser. Please check your Pi authentication and network connection.');
        }
        console.error('❌ Database sync error:', error);
        throw error; // Re-throw to trigger error handling
      }
    },
    onError: (error: Error) => {
      console.error('Auto-save failed:', error);
      toast.error('Failed to save changes to database. Please check your connection.');
    }
  });

  // Track profile changes and trigger auto-save (with safeguards against infinite loops)
  const lastProfileRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Only trigger auto-save if:
    // 1. Profile ID exists
    // 2. Not currently loading initial data
    // 3. Profile has actually changed (compare JSON strings)
    if (profileId && !loading) {
      const currentProfile = JSON.stringify(profile);
      
      // Check if profile has meaningfully changed
      if (currentProfile !== lastProfileRef.current && lastProfileRef.current !== '') {
        // Clear any existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Set new timeout for auto-save
        saveTimeoutRef.current = setTimeout(() => {
          autoSave.updateData(profile);
        }, 3000); // 3 second debounce
      }
      
      // Update last profile reference
      lastProfileRef.current = currentProfile;
    }
    
    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [profile, profileId, loading]); // Safe dependencies - won't cause infinite loop due to ref check

  // Helper function to save profile immediately (for critical changes)
  const saveProfileNow = async (updatedProfile?: any) => {
    const dataToSave = updatedProfile || profile;
    if (!profileId) {
      console.error('❌ No profile ID - cannot save');
      return false;
    }

    try {
      console.log('💾 Saving profile to Supabase immediately...');
      const success = await saveProfileToSupabase(profileId, {
        id: profileId,
        business_name: dataToSave.businessName,
        description: dataToSave.description,
        email: dataToSave.email,
        youtube_video_url: dataToSave.youtubeVideoUrl,
        social_links: dataToSave.socialLinks as any,
        theme_settings: {
          ...dataToSave.theme,
          customLinks: dataToSave.customLinks || [],
          paymentLinks: (dataToSave.paymentLinks || []).map((link: any) => ({
            id: link.id,
            amount: link.amount,
            description: link.description,
            type: link.type,
            url: link.url,
            created: link.created?.toISOString?.() || new Date().toISOString(),
            active: link.active,
            totalReceived: link.totalReceived,
            transactionCount: link.transactionCount
          }))
        } as any,
        logo: dataToSave.logo,
        has_premium: dataToSave.hasPremium,
        pi_wallet_address: dataToSave.piWalletAddress,
        pi_donation_message: dataToSave.piDonationMessage,
        custom_domain: dataToSave.customDomain,
        background_music_url: dataToSave.backgroundMusicUrl,
      });

      if (success) {
        console.log('✅ Profile saved immediately');
        toast.success('Changes saved to Supabase', { duration: 2000 });
      }
      return success;
    } catch (error) {
      console.error('❌ Failed to save profile immediately:', error);
      toast.error('Failed to save changes', { duration: 5000 });
      return false;
    }
  };

  // Update Pi Wallet QR data when wallet address changes
  useEffect(() => {
    if (profile.piWalletAddress) {
      setPiWalletQrData(profile.piWalletAddress);
    }
  }, [profile.piWalletAddress]);

  // Load payment links for the current user
  const loadPaymentLinks = (): PaymentLink[] => {
    if (!piUser?.uid) return [];
    
    try {
      const stored = localStorage.getItem(`paymentLinks_${piUser.uid}`);
      if (stored) {
        const links = JSON.parse(stored);
        // Convert date strings back to Date objects
        return links.map((link: any) => ({
          ...link,
          created: new Date(link.created)
        }));
      }
    } catch (error) {
      console.error('Error loading payment links:', error);
    }
    return [];
  };

  // Initialize auto-save with profile data
  useEffect(() => {
    if (profileId && profile && !loading) {
      autoSave.initialize(profile);
    }
  }, [profileId, loading]);

  // Refresh payment links when piUser changes or when coming back to dashboard
  useEffect(() => {
    if (piUser?.uid && profileId) {
      const paymentLinks = loadPaymentLinks();
      setProfile(prev => ({
        ...prev,
        paymentLinks
      }));
    }
  }, [piUser?.uid, profileId]);

  useEffect(() => {
    // Wait for Pi context to be ready
    if (!piLoading) {
      checkAuthAndLoadProfile();
    }
  }, [piLoading]);

  // Redirect new users to subscription page if they haven't selected a plan
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated || !piUser || subscriptionLoading || hasCheckedSubscription) return;
      
      try {
        // Check for subscription activation flag
        const activatedFlag = sessionStorage.getItem('subscription_activated');
        if (activatedFlag) {
          try {
            const { plan, billing } = JSON.parse(activatedFlag);
            toast.success(`🎉 Plan Activated!`, {
              description: `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} ${billing === 'yearly' ? 'Annual' : 'Monthly'} plan is now active. Enjoy premium features!`,
              duration: 5000,
            });
            // Refetch subscription to ensure UI reflects new plan
            await refetchSubscription();
          } catch (e) {
            console.warn('Failed to parse activation flag:', e);
          }
          sessionStorage.removeItem('subscription_activated');
        }
        
        // Check if user has any subscription (even free counts as a selection)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", piUser.username)
          .maybeSingle();

        if (profile?.id) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("profile_id", profile.id)
            .limit(1)
            .maybeSingle();

          // If no subscription record exists, redirect to subscription page
          if (!sub) {
            const hasSeenSubscription = sessionStorage.getItem(`seen_subscription_${piUser.username}`);
            if (!hasSeenSubscription) {
              navigate("/subscription");
              sessionStorage.setItem(`seen_subscription_${piUser.username}`, "true");
            }
          }
        }
        setHasCheckedSubscription(true);
      } catch (error) {
        console.error("Error checking subscription:", error);
        setHasCheckedSubscription(true);
      }
    };

    checkSubscription();
  }, [isAuthenticated, piUser, subscriptionLoading, hasCheckedSubscription, navigate, refetchSubscription]);

  const checkAuthAndLoadProfile = async () => {
    try {
      // Check Pi authentication OR Supabase session (for Gmail/email users)
      if (piLoading) {
        return; // Still loading
      }
      
      // Check for Supabase session (Gmail/email users)
      let session = null;
      let supabaseUser = null;
      
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          session = data?.session;
          supabaseUser = session?.user;
        }
      } catch (error) {
        console.error('Failed to get session:', error);
      }
      
      // Determine user identifier
      let userIdentifier: string | null = null;
      let isPiUser = false;
      let isNewUser = false;
      
      if (isAuthenticated && piUser && piUser.username) {
        // Pi Network user
        userIdentifier = piUser.username;
        isPiUser = true;
        setDisplayUsername(piUser.username);
        console.log("Loading profile for Pi user:", piUser.username);
      } else if (supabaseUser && supabaseUser.email) {
        // Gmail/Email user
        userIdentifier = supabaseUser.email.split("@")[0] || supabaseUser.id?.slice(0, 8) || 'user';
        isPiUser = false;
        setDisplayUsername(supabaseUser.email.split("@")[0] || null);
        console.log("Loading profile for email user:", supabaseUser.email);
      } else {
        // No authentication - always redirect to auth
        navigate("/auth");
        return;
      }

      // Try to load from localStorage first
      const storageKey = isPiUser ? `profile_${userIdentifier}` : `profile_email_${supabaseUser?.id}`;
      const storedProfile = localStorage.getItem(storageKey);
      if (storedProfile) {
        try {
          const parsed = JSON.parse(storedProfile);
          console.log('📱 Found cached profile in localStorage for:', userIdentifier);
          console.log('ℹ️ NOTE: Cached data may be stale. Using database profile if available.');
          // Don't load from localStorage directly anymore - wait for database
          // setProfile(parsed);
        } catch (e) {
          console.error("Error parsing stored profile:", e);
        }
      }

      // Load profile from database
      let profileData;
      let error;
      
      if (isPiUser && piUser) {
        // Pi user - load by username
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("username", piUser.username)
          .maybeSingle();
        profileData = result.data;
        error = result.error;
        
        // Check if this is a new Pi user
        if (!profileData && !error) {
          isNewUser = true;
          console.log('New Pi user detected:', piUser.username);
        }
      } else if (supabaseUser) {
        // Email/Gmail user - load by user_id
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", supabaseUser.id)
          .maybeSingle();
        profileData = result.data;
        error = result.error;
        
        // Check if this is a new email user
        if (!profileData && !error) {
          isNewUser = true;
          console.log('New email user detected:', supabaseUser.email);
        }
      }

      if (error) {
        console.error("Error loading profile:", error);
      }

      if (profileData) {
        console.log("Profile loaded:", profileData.id);
        setProfileId(profileData.id);
        
        // Load products
        const { data: productsData } = await supabase
          .from("products")
          .select("*")
          .eq("profile_id", profileData.id);

        let socialLinks = profileData.social_links as any;
        
        // Ensure socialLinks is properly initialized - fix for broken social links
        if (!Array.isArray(socialLinks) || socialLinks.length === 0) {
          socialLinks = [
            { type: "twitter", url: "", icon: "twitter", followers: 0 },
            { type: "instagram", url: "", icon: "instagram", followers: 0 },
            { type: "youtube", url: "", icon: "youtube", followers: 0 },
            { type: "tiktok", url: "", icon: "tiktok", followers: 0 },
            { type: "facebook", url: "", icon: "facebook", followers: 0 },
            { type: "linkedin", url: "", icon: "linkedin", followers: 0 },
            { type: "twitch", url: "", icon: "twitch", followers: 0 },
            { type: "website", url: "", icon: "website", followers: 0 },
          ];
        } else if (Array.isArray(socialLinks)) {
          // Ensure all expected platforms exist in the array
          const expectedTypes = ["twitter", "instagram", "youtube", "tiktok", "facebook", "linkedin", "twitch", "website"];
          const existingTypes = socialLinks.map(l => l.type);
          const missingTypes = expectedTypes.filter(t => !existingTypes.includes(t));
          
          if (missingTypes.length > 0) {
            // Add missing platforms
            missingTypes.forEach(type => {
              socialLinks.push({ type, url: "", icon: type, followers: 0 });
            });
          }
          
          // Ensure each link has an icon property and numeric follower counts
          socialLinks = socialLinks.map((link: any) => ({
            ...link,
            icon: link.icon || link.type,
            followers: link.followers !== undefined && link.followers !== null
              ? Number(link.followers) || 0
              : undefined
          }));
        }
        
        const themeSettings = profileData.theme_settings as any;
        
        // Load financial data from secure endpoint (optional - won't fail if no session)
        let financialData = {
          pi_wallet_address: "",
          pi_donation_message: "Send me a coffee ☕",
          crypto_wallets: {},
          bank_details: {},
        };
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const piAccessToken = localStorage.getItem("pi_access_token");
          if (session?.access_token || (isPiUser && piUser && piAccessToken)) {
            const headers: Record<string, string> = session?.access_token 
              ? { Authorization: `Bearer ${session.access_token}` }
              : { "X-Pi-Access-Token": piAccessToken as string };

            try {
              const { data: finData, error: finError } = await supabase.functions.invoke("financial-data", {
                method: "GET",
                headers
              });
              
              if (!finError && finData?.data) {
                financialData = finData.data;
              }
            } catch (error) {
              console.warn('Financial data function not available, using profile data fallback');
              financialData = {
                pi_wallet_address: profileData?.pi_wallet_address || '',
                pi_donation_message: profileData?.pi_donation_message || 'Send me a coffee ☕',
                crypto_wallets: {},
                bank_details: {}
              };
            }
          } else {
            // No session or Pi token - load from profiles table directly
            // Note: Financial data is stored in profiles table (pi_wallet_address, bank_details, crypto_wallets)
            financialData = {
              pi_wallet_address: profileData?.pi_wallet_address || '',
              pi_donation_message: profileData?.pi_donation_message || "Send me a coffee ☕",
              crypto_wallets: profileData?.crypto_wallets || {},
              bank_details: profileData?.bank_details || {},
            };
          }
        } catch (error) {
          console.error("Error loading financial data:", error);
        }
        
        const cryptoWallets = financialData.crypto_wallets as any;
        const bankDetails = financialData.bank_details as any;
        
        const displayName = isPiUser && piUser?.username ? piUser.username : (supabaseUser?.email?.split("@")[0] || "user");
        
        const loadedProfile = {
          id: profileData?.id || "",
          username: profileData?.username || displayName,
          logo: profileData?.logo || "",
          businessName: profileData?.business_name || displayName,
          storeUrl: `@${profileData?.username || displayName}`,
          description: profileData?.description || "",
          email: (profileData as any)?.email || supabaseUser?.email || "",
          youtubeVideoUrl: (profileData as any)?.youtube_video_url || "",
          backgroundMusicUrl: (profileData as any)?.background_music_url || "",
          category: (profileData as any)?.category || "other",
          socialLinks: Array.isArray(socialLinks) && socialLinks.length > 0 ? socialLinks : [
            { type: "twitter", url: "", icon: "twitter", followers: 0 },
            { type: "instagram", url: "", icon: "instagram", followers: 0 },
            { type: "youtube", url: "", icon: "youtube", followers: 0 },
            { type: "tiktok", url: "", icon: "tiktok", followers: 0 },
            { type: "facebook", url: "", icon: "facebook", followers: 0 },
            { type: "linkedin", url: "", icon: "linkedin", followers: 0 },
            { type: "twitch", url: "", icon: "twitch", followers: 0 },
            { type: "website", url: "", icon: "website", followers: 0 },
          ],
          customLinks: (themeSettings?.customLinks as any) || [],
          theme: {
            primaryColor: themeSettings?.primaryColor || "#38bdf8",
            backgroundColor: themeSettings?.backgroundColor || "#000000",
            backgroundType: (themeSettings?.backgroundType as 'color' | 'gif' | 'video') || "color",
            backgroundGif: themeSettings?.backgroundGif || "",
            backgroundVideo: themeSettings?.backgroundVideo || "",
            iconStyle: themeSettings?.iconStyle || "rounded",
            buttonStyle: themeSettings?.buttonStyle || "filled",
            glassMode: themeSettings?.glassMode ?? false,
            coverImage: themeSettings?.coverImage || "",
          },
          products: productsData?.map((p: any) => ({
            id: p.id,
            title: p.title,
            price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
            description: p.description || "",
            fileUrl: p.file_url || "",
          })) || [],
          // wallets property removed to match ProfileData type and avoid React object error
          hasPremium: profileData.has_premium || false,
          showShareButton: (profileData as any).show_share_button !== false,
          piWalletAddress: financialData.pi_wallet_address || "",
          piDonationMessage: financialData.pi_donation_message || "Send me a coffee ☕",
          isVerified: (profileData as any).is_verified || false,
          // Enhanced payment links loading: try database first, then localStorage
          paymentLinks: (() => {
            // Try to restore from theme_settings first (database)
            const dbPaymentLinks = (themeSettings as any)?.paymentLinks;
            if (dbPaymentLinks && Array.isArray(dbPaymentLinks)) {
              try {
                return dbPaymentLinks.map((link: any) => ({
                  ...link,
                  created: new Date(link.created)
                }));
              } catch (error) {
                console.warn('Error restoring payment links from database:', error);
              }
            }
            // Fallback to localStorage
            return loadPaymentLinks();
          })()
        };
        
        setProfile({
          ...loadedProfile,
          id: loadedProfile.id || "",
          username: loadedProfile.username || "",
          socialLinks: Array.isArray(loadedProfile.socialLinks) ? loadedProfile.socialLinks : [],
        });
        
        // Welcome back existing users (only on first load of session)
        if (!isNewUser && !sessionStorage.getItem(`welcomed_${profileData.id}`)) {
          toast.success(`👋 Welcome back, ${loadedProfile.businessName}!`);
          sessionStorage.setItem(`welcomed_${profileData.id}`, 'true');
        }
        
          // Save to localStorage with metadata
        try {
          const profileToStore = {
            ...loadedProfile,
            socialLinks: Array.isArray(loadedProfile.socialLinks) ? loadedProfile.socialLinks : [],
            lastSynced: new Date().toISOString(),
            profileId: profileData.id
          };
          const storageKey = isPiUser ? `profile_${userIdentifier}` : `profile_email_${supabaseUser?.id}`;
          localStorage.setItem(storageKey, JSON.stringify(profileToStore));
          localStorage.setItem(`${storageKey}_backup`, JSON.stringify(profileToStore));
        } catch (e) {
          console.error("Error saving to localStorage:", e);
        }
      } else {
        // Auto-create profile for Pi user or email user
        const defaultName = isPiUser && piUser ? piUser.username : (supabaseUser?.email?.split("@")[0] || "user");
        console.log("Profile not found, auto-creating with name:", defaultName);
        
        // Create profile in database first (MANDATORY - not optional)
        let newProfileId = null;
        let profileCreateSuccess = false;
        
        try {
          if (isPiUser && piUser) {
            console.log('🗄️ Creating Pi user profile in Supabase...');
            // Upsert Pi user profile to avoid UNIQUE_VIOLATION
            if (!piUser.username) {
              toast.error('Pi username missing. Cannot create profile.');
              throw new Error('Pi username missing');
            }
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .upsert({
                username: piUser.username,
                business_name: piUser.username,
                description: "",
                email: "", // Pi users don't have email in the basic interface
                pi_user_id: piUser.uid,
                // Ensure RLS passes by tying profile to current Supabase user
                user_id: session?.user?.id || undefined,
              })
              .select()
              .single();
            if (createError) {
              console.error("❌ Error creating Pi user profile:", createError);
              if (createError.message?.includes('permission denied') || createError.message?.includes('row level security')) {
                toast.error('Supabase permissions error. Please check RLS policies and API key permissions.');
              } else if (createError.message?.includes('does not exist') || createError.message?.includes('column')) {
                toast.error('Supabase schema error. Please check that the profiles table and all columns exist.');
              } else if (createError.code === '23505' || createError.message?.includes('duplicate key')) {
                toast.error('Username already exists. Please use a unique username.');
              } else {
                toast.error('Failed to create Pi profile. Please try again.');
              }
              throw new Error(`Failed to create Pi profile: ${createError.message}`);
            } else if (newProfile) {
              newProfileId = newProfile.id;
              profileCreateSuccess = true;
              setProfileId(newProfileId);
              console.log("✅ Created Pi user profile in Supabase:", newProfileId);
            } else {
              throw new Error('Profile creation returned no data');
            }
          } else if (supabaseUser) {
            console.log('🗄️ Creating email user profile in Supabase...');
            // Create email user profile
            const emailUsername = supabaseUser.email?.split("@")[0] || `user-${supabaseUser.id.slice(0, 8)}`;
            const sanitizedUsername = emailUsername.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            if (!sanitizedUsername) {
              toast.error('Email username missing. Cannot create profile.');
              throw new Error('Email username missing');
            }
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                user_id: supabaseUser.id,
                username: sanitizedUsername,
                business_name: sanitizedUsername,
                description: "",
                email: supabaseUser.email || "",
              })
              .select()
              .single();
            if (createError) {
              console.error("❌ Error creating email user profile:", createError);
              if (createError.message?.includes('permission denied') || createError.message?.includes('row level security')) {
                toast.error('Supabase permissions error. Please check RLS policies and API key permissions.');
              } else if (createError.message?.includes('does not exist') || createError.message?.includes('column')) {
                toast.error('Supabase schema error. Please check that the profiles table and all columns exist.');
              } else if (createError.code === '23505' || createError.message?.includes('duplicate key')) {
                toast.error('Username already exists. Please use a unique username.');
                // Username conflict, try with a random suffix
                const randomSuffix = Math.random().toString(36).substring(2, 8);
                const uniqueUsername = `${sanitizedUsername}-${randomSuffix}`;
                console.log('Trying unique username:', uniqueUsername);
                const { data: retryProfile, error: retryError } = await supabase
                  .from("profiles")
                  .insert({
                    user_id: supabaseUser.id,
                    username: uniqueUsername,
                    business_name: sanitizedUsername,
                    description: "",
                    email: supabaseUser.email || "",
                  })
                  .select()
                  .single();
                if (retryError) {
                  console.error("❌ Retry also failed:", retryError);
                  toast.error('Failed to create profile with unique username. Please try again.');
                  throw new Error(`Failed to create profile with unique username: ${retryError.message}`);
                } else if (retryProfile) {
                  newProfileId = retryProfile.id;
                  profileCreateSuccess = true;
                  setProfileId(newProfileId);
                  console.log("✅ Created email user profile with unique username:", newProfileId);
                } else {
                  throw new Error('Profile creation returned no data');
                }
              } else {
                toast.error('Failed to create email profile. Please try again.');
                throw new Error(`Failed to create email profile: ${createError.message}`);
              }
            } else if (newProfile) {
              newProfileId = newProfile.id;
              profileCreateSuccess = true;
              setProfileId(newProfileId);
              console.log("✅ Created email user profile:", newProfileId);
            } else {
              throw new Error('Profile creation returned no data');
            }
          }
        } catch (dbError) {
          console.error("Database profile creation failed:", dbError);
          // Show user-friendly error message
          if (dbError.message?.includes('table') || dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
            toast.error('⚠️ Database setup required. Check console for setup instructions.');
            console.log(`
🗄️ DATABASE SETUP REQUIRED:
            
1. Go to Supabase Dashboard: https://app.supabase.com/
2. Select project: idkjfuctyukspexmijvb  
3. Go to SQL Editor
4. Run the complete schema from: supabase/migrations/20251118000001_complete_database_schema.sql
   
   OR run this minimal SQL:
   
   CREATE TABLE IF NOT EXISTS public.profiles (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
       username TEXT UNIQUE NOT NULL,
       pi_user_id TEXT,
       business_name TEXT DEFAULT '',
       email TEXT DEFAULT '',
       description TEXT DEFAULT '',
       has_premium BOOLEAN DEFAULT false,
       pi_wallet_address TEXT DEFAULT ''
   );
   
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Public access" ON public.profiles FOR ALL USING (true);
   GRANT ALL ON public.profiles TO anon, authenticated;

5. Refresh the app after running the SQL.
            `);
          } else if (dbError.code === '23505') {
            toast.error('Username already taken. Please try a different one.');
          } else {
            toast.error('Failed to create profile. Please try again.');
          }
          
          // Don't block the app, continue with local profile
          console.log('Continuing with local-only profile due to database error');
        }
        
        const defaultProfile = {
          id: newProfileId || "",
          username: defaultName || "",
          logo: "",
          businessName: defaultName,
          storeUrl: `@${defaultName}`,
          description: "",
          email: supabaseUser?.email || "",
          youtubeVideoUrl: "",
          backgroundMusicUrl: "",
          socialLinks: [
            { type: "twitter", url: "" },
            { type: "instagram", url: "" },
            { type: "youtube", url: "" },
            { type: "tiktok", url: "" },
            { type: "facebook", url: "" },
            { type: "linkedin", url: "" },
            { type: "twitch", url: "" },
            { type: "website", url: "" },
          ],
          customLinks: [],
          theme: {
            primaryColor: "#38bdf8",
            backgroundColor: "#000000",
            backgroundType: "color" as const,
            backgroundGif: "",
            iconStyle: "rounded",
            buttonStyle: "filled",
          },
          products: [],
          wallets: {
            crypto: [],
            bank: [],
          },
          hasPremium: false,
          showShareButton: true,
          piWalletAddress: "",
          piDonationMessage: "Send me a coffee ☕",
        };
        setProfile(defaultProfile);
        
        // ONLY save to localStorage if database creation was successful
        if (profileCreateSuccess && newProfileId) {
          try {
            const profileToStore = {
              ...defaultProfile,
              lastSynced: new Date().toISOString(),
              profileId: newProfileId // Use the actual database profile ID
            };
            const storageKey = isPiUser ? `profile_${userIdentifier}` : `profile_email_${supabaseUser?.id}`;
            localStorage.setItem(storageKey, JSON.stringify(profileToStore));
            localStorage.setItem(`${storageKey}_backup`, JSON.stringify(profileToStore));
            console.log('✅ Profile backed up to localStorage');
          } catch (e) {
            console.error("Error saving to localStorage:", e);
          }
        } else {
          console.warn('⚠️ Skipping localStorage save - database creation failed');
        }
        
        if (newProfileId && isNewUser) {
          // Only show welcome message for genuinely new users with successful DB creation
          toast.success(`🎉 Welcome to Droplink, ${defaultName}! Your store is ready!`);
          // Show onboarding message
          setTimeout(() => {
            toast.info('💡 Tip: Customize your profile, add links, and share your unique URL!');
          }, 2000);
        } else if (newProfileId && !isNewUser) {
          console.log('Profile restored for returning user');
          toast.success(`Welcome back, ${defaultName}! 👋`);
        } else if (!profileCreateSuccess) {
          // Database creation failed
          console.error('❌ Failed to create profile in Supabase database');
          toast.error('⚠️ Failed to save profile to database', {
            description: 'Your profile was NOT saved. Check your internet connection and try again.',
            duration: 10000
          });
        } else {
          console.log('Using local profile data only (not in database)');
          toast.warning('⚠️ Using local profile only', {
            description: 'Your profile is not saved to the database. Refresh to sync.',
            duration: 10000
          });
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to count active social links
  const countActiveSocialLinks = () => {
    return profile.socialLinks.filter(link => link.url && link.url.trim() !== "").length;
  };

  // Helper to check if plan limit exceeded
  const canAddSocialLink = (currentActiveCount: number) => {
    const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
    return currentActiveCount < maxLinks;
  };

  // Handle social link change - allows editing, respects plan limits
  const handleSocialLinkChange = (platform: string, value: string) => {
    const trimmedValue = value.trim();
    const currentLink = profile.socialLinks.find(l => l.type === platform);
    const isCurrentlyActive = currentLink?.url && currentLink.url.trim() !== "";
    
    // If trying to add a new link (field is currently empty and trying to fill it with a value)
    if (!isCurrentlyActive && trimmedValue !== "") {
      const currentActive = profile.socialLinks.filter(l => l.url && l.url.trim() !== "").length;
      if (!canAddSocialLink(currentActive)) {
        toast.error(`You have reached your plan's social link limit (${plan === "free" ? "1" : "3"} links). Upgrade to add more.`);
        return;
      }
    }
    
    // Update the link (either editing existing or adding new)
    const updatedProfile = {
      ...profile,
      socialLinks: profile.socialLinks.map(link =>
        link.type === platform ? { ...link, url: value } : link
      ),
    };
    
    setProfile(updatedProfile);
    
    // Trigger immediate save after social link change
    console.log('[SOCIAL LINKS] Updating platform:', platform, 'Value:', value);
    console.log('[SOCIAL LINKS] Updated profile:', updatedProfile);
    saveProfileNow(updatedProfile);
  };

  const parseFollowerInput = (raw: string) => {
    const value = raw.trim().toLowerCase();
    if (!value) return undefined;
    const multiplier = value.endsWith("m") ? 1_000_000 : value.endsWith("k") ? 1_000 : 1;
    const numericPortion = value.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(numericPortion || "0") * multiplier;
    if (!Number.isFinite(parsed) || parsed < 0) return undefined;
    return Math.floor(parsed);
  };

  const handleSocialFollowerChange = (platform: string, value: string, index?: number) => {
    const followers = parseFollowerInput(value);
    const updatedProfile = {
      ...profile,
      socialLinks: profile.socialLinks.map((link, idx) =>
        index !== undefined
          ? (idx === index ? { ...link, followers } : link)
          : (link.type === platform ? { ...link, followers } : link)
      ),
    };
    setProfile(updatedProfile);
    saveProfileNow(updatedProfile);
  };

  // Cancel current plan and fall back to free tier
  const handleCancelPlan = async () => {
    if (!effectiveProfileId) {
      toast.error('Profile not loaded yet. Please try again.');
      return;
    }

    // Confirm with user before canceling
    const confirmed = window.confirm(
      '⚠️ WARNING: Canceling your plan will:\n\n' +
      '• Delete ALL subscriptions (regular & gift card plans)\n' +
      '• Remove ALL gift cards (purchased & redeemed)\n' +
      '• Delete subscription transaction history\n' +
      '• Reset your account to FREE tier\n' +
      '• Remove premium features immediately\n\n' +
      'After cancellation, you can subscribe to a new plan anytime.\n\n' +
      'This action CANNOT be undone. Are you sure you want to continue?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancelingPlan(true);
      const nowIso = new Date().toISOString();

      // Delete all subscriptions for this profile (includes all types: regular, gift, etc.)
      const { error: subDeleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('profile_id', effectiveProfileId);

      if (subDeleteError) {
        console.error('Error deleting subscriptions:', subDeleteError);
        throw new Error('Failed to delete subscriptions');
      }

      // Delete subscription transaction history
      const { error: transDeleteError } = await supabase
        .from('subscription_transactions' as any)
        .delete()
        .eq('profile_id', effectiveProfileId);

      if (transDeleteError) {
        console.error('Error deleting subscription transactions:', transDeleteError);
        // Don't throw - this is not critical
      }

      // Delete ALL gift cards (purchased by or redeemed by this user)
      const { error: giftDeleteError } = await supabase
        .from('gift_cards')
        .delete()
        .or(`purchased_by_profile_id.eq.${effectiveProfileId},redeemed_by_profile_id.eq.${effectiveProfileId}`);

      if (giftDeleteError) {
        console.error('Error deleting gift cards:', giftDeleteError);
        // Don't throw - continue with profile reset
      }

      // Reset profile to free tier - allows user to subscribe again
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'free', 
          has_premium: false,
          card_customization_enabled: false
        })
        .eq('id', effectiveProfileId);

      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
        throw new Error('Failed to reset profile to free tier');
      }

      await refetchSubscription?.();
      toast.success('Plan canceled. All subscriptions, gift cards, and transaction history have been deleted. You can now subscribe to a new plan.');
      setShowPlanModal(false);
    } catch (error) {
      console.error('Cancel plan failed', error);
      toast.error('Unable to cancel the plan right now. Please try again.');
    } finally {
      setCancelingPlan(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, theme: { ...profile.theme, coverImage: reader.result as string } });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!profileId) throw new Error('No profile ID found.');
      // Update main profile data in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: profile.businessName,
          store_url: profile.storeUrl,
          description: profile.description,
          email: profile.email,
          youtube_video_url: profile.youtubeVideoUrl,
          background_music_url: profile.backgroundMusicUrl,
          social_links: profile.socialLinks as any,
          theme_settings: {
            ...profile.theme,
            customLinks: profile.customLinks || [],
            paymentLinks: (profile.paymentLinks || []).map(link => ({
              id: link.id,
              amount: link.amount,
              description: link.description,
              type: link.type,
              url: link.url,
              created: link.created instanceof Date ? link.created.toISOString() : link.created,
              active: link.active,
              totalReceived: link.totalReceived,
              transactionCount: link.transactionCount
            }))
          } as any,
          logo: profile.logo,
          show_share_button: profile.showShareButton,
          pi_wallet_address: profile.piWalletAddress,
          pi_donation_message: profile.piDonationMessage,
          has_premium: profile.hasPremium || false,
          is_verified: profile.isVerified || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);
      if (profileError) throw profileError;

      // Sync products to database
      if (profile.products && profile.products.length > 0) {
        await supabase
          .from('products')
          .delete()
          .eq('profile_id', profileId);
        const productsToInsert = profile.products.map(product => ({
          profile_id: profileId,
          title: product.title,
          description: product.description,
          price: typeof product.price === 'string' ? product.price : product.price?.toString?.() ?? "",
          file_url: product.fileUrl
        }));
        if (productsToInsert.length > 0) {
          const { error: productsError } = await supabase
            .from('products')
            .insert(productsToInsert);
          if (productsError) {
            console.error('Products sync error:', productsError);
          }
        }
      }

      toast.success('Changes saved successfully!');
      // Force reload of profile from database after save
      if (profileId) {
        try {
          const { data: refreshedProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", profileId)
            .maybeSingle();
          if (refreshedProfile) {
            setProfile((prev) => ({
              ...prev,
              piWalletAddress: refreshedProfile.pi_wallet_address || "",
              piDonationMessage: refreshedProfile.pi_donation_message || "Send me a coffee ☕",
            }));
          }
        } catch (e) {
          // Ignore reload errors
        }
      }
    } catch (error: any) {
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!profile.storeUrl) {
      toast.error("Please set your store URL first");
      return;
    }
    const link = `${window.location.origin}/${profile.storeUrl}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied! Ready to share.");
  };

  const handleOpenPublicBio = () => {
    if (!profile.storeUrl) {
      toast.error("Please set your store URL first");
      return;
    }
    const link = `${window.location.origin}/${profile.storeUrl}`;
    window.open(link, "_blank");
  };

  const handleShowQRCode = () => {
    // Allow QR code dialog to open even if profile is not set up
    if (!profile || !profile.storeUrl) {
      toast.error("No store URL set yet. Set up your profile to get a store link.");
      return;
    }
    setShowQRCode(true);
  };

  const handleLogout = async () => {
    try {
      console.log("🚪 Initiating logout...");
      // Use comprehensive sign-out utility, but allow logout even if profile is not set up
      await performCompleteSignOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always navigate to auth page, even if error or no profile
      window.location.href = "/auth";
    }
  };

  // Show welcome modal only on first visit per session
  useEffect(() => {
    if (!sessionStorage.getItem('droplink-welcome-shown')) {
      setShowWelcomeModal(true);
      sessionStorage.setItem('droplink-welcome-shown', '1');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-500 dark:border-t-sky-400 animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading Droplink...</p>
        </div>
      </div>
    );
  }

  // Show Pi Auth button if not authenticated, not loading, and no Supabase session
  if (!isAuthenticated && !piLoading && !hasSupabaseSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="max-w-md w-full p-6 rounded-lg shadow border mx-auto bg-card">
          <div className="mb-6 text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">Pi Network is not available.</div>
            <div className="text-gray-700 mb-4">Please open this app in <b>Pi Browser</b> or ensure the Pi SDK is loaded.</div>
            <a href="https://minepi.com/Wain2020" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Download Pi Browser</a>
          </div>
          <PiAuthTest />
        </div>
      </div>
    );
  }

  // Removed Pi Authentication Required modal to allow dashboard access without blocking

  // Smoothly focus the builder section and optionally activate a tab by value
  const focusTab = (tabValue: string) => {
    console.log(`[Footer Nav] Attempting to focus tab: ${tabValue}`);
    
    // Give DOM time to settle
    setTimeout(() => {
      // Try to find tab by data-value or textContent
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      console.log(`[Footer Nav] Found ${tabs.length} tabs on page`);
      
      // Radix UI stores the value in data-value attribute
      const targetTab = tabs.find((t) => {
        const value = (t as HTMLElement).getAttribute('data-value');
        const text = t.textContent?.trim() || '';
        console.log(`[Footer Nav] Tab - value: "${value}", text: "${text}"`);
        return value === tabValue || text.includes(tabValue);
      });
      
      if (targetTab) {
        console.log(`[Footer Nav] Found target tab, clicking it`);
        (targetTab as HTMLElement).click();
        
        // Scroll to the builder section
        setTimeout(() => {
          const builder = document.getElementById('dashboard-builder');
          if (builder) {
            console.log(`[Footer Nav] Scrolling to builder section`);
            builder.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      } else {
        console.log(`[Footer Nav] Tab not found for value: ${tabValue}`);
      }
    }, 150);
  };

  return (
    <div className="relative min-h-screen bg-sky-400 text-slate-900 overflow-x-hidden pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-0" aria-hidden="true" style={{ background: "none" }} />

      <header className="sticky top-0 z-30 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/85 dark:bg-slate-900/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.ibb.co/wrCQpZk9/Gemini-Generated-Image-ar8t52ar8t52ar8t.png" 
              alt="Droplink" 
              className="h-10 w-10 rounded-xl shadow-sm object-contain"
            />
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Droplink</span>
              <span className="text-sm font-semibold">
                {displayUsername ? `@${displayUsername}` : 'Dashboard'}
              </span>
            </div>
            {!isAuthenticated && piLoading && (
              <span className="text-xs text-amber-600 animate-pulse">Connecting Pi...</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={handleShowQRCode}>
              <QrCode className="w-4 h-4 mr-2" />
              QR
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? 'Hide preview' : 'Show preview'}
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => setShowPlanModal(true)}
            >
              <Crown className="w-4 h-4 mr-2" />
              Plan
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={handleLogout} className="text-slate-600 dark:text-slate-300">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr] items-start">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70 shadow-sm p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Welcome back</p>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white leading-tight">
                  {greeting || 'Hello'}, {displayUsername || 'creator'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Curate your link-in-bio page with a clean, Droplink builder.</p>
              </div>
              <Button variant="link" size="sm" className="px-0 text-sky-600" onClick={() => navigate('/card-generator')}>
                <CreditCard className="w-4 h-4 mr-2" />
                Card Generator
              </Button>
            </div>
            {displayUsername && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-500">Profile URL</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-sm font-medium truncate">{window.location.origin}/{profile.storeUrl || 'your-link'}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenPublicBio} title="View">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyLink} title="Copy">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  <div className="flex items-center gap-2 mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4" />
                    {plan ? `${plan.toUpperCase()} plan` : 'No plan yet'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-500">Preview</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowPreview((prev) => !prev)}
                    >
                      {showPreview ? 'Hide preview' : 'Show preview'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70 shadow-sm p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Quick actions</p>
              <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button type="button" variant="secondary" className="justify-start" onClick={handleShowQRCode}>
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button type="button" variant="secondary" className="justify-start" onClick={handleCopyLink}>
                <Share2 className="w-4 h-4 mr-2" />
                Copy link
              </Button>
              <Button type="button" variant="secondary" className="justify-start" onClick={handleOpenPublicBio}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Public Bio
              </Button>
              <Button type="button" variant="secondary" className="justify-start" onClick={() => navigate('/subscription')}>
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <button 
                onClick={() => navigate('/followers')}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800 px-3 py-2 text-sky-700 dark:text-sky-300 transition-all hover:shadow-sm active:scale-95"
              >
                <Users className="w-4 h-4" /> Audience
              </button>
              <button 
                onClick={() => {
                  const designTab = document.querySelector('[value="design"]') as HTMLElement;
                  designTab?.click();
                  setTimeout(() => {
                    document.getElementById('dashboard-builder')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800 px-3 py-2 text-sky-700 dark:text-sky-300 transition-all hover:shadow-sm active:scale-95"
              >
                <Palette className="w-4 h-4" /> Theme
              </button>
              <button 
                onClick={() => {
                  const analyticsTab = document.querySelector('[value="analytics"]') as HTMLElement;
                  analyticsTab?.click();
                  setTimeout(() => {
                    document.getElementById('dashboard-builder')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800 px-3 py-2 text-sky-700 dark:text-sky-300 transition-all hover:shadow-sm active:scale-95"
              >
                <BarChart3 className="w-4 h-4" /> Insights
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_minmax(360px,1fr)] items-start">
          {/* Builder Panel */}
          <section
            id="dashboard-builder"
            className={`${showPreview ? 'hidden lg:block' : 'block'} rounded-2xl border border-slate-200/80 dark:border-slate-800/70 bg-white/95 dark:bg-slate-900/70 shadow-sm`}
          >
            <div className="p-3 sm:p-5">
              <Tabs 
                defaultValue={preferences.dashboard_layout.activeTab}
                className="w-full"
                onValueChange={(value) => {
                  if (value === 'payments' && piUser?.uid) {
                    const paymentLinks = loadPaymentLinks();
                    setProfile(prev => ({
                      ...prev,
                      paymentLinks
                    }));
                  }
                }}
              >
                <TabsList className="w-full grid grid-cols-3 sm:grid-cols-7 gap-1.5 sm:gap-2 bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 p-2 sm:p-3 rounded-xl mb-24 sm:mb-32">
                  {/* Primary Features Row */}
                  <TabsTrigger value="profile" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Profile</span>
                  </TabsTrigger>
                  <TabsTrigger value="design" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <Palette className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Design</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Analytics</span>
                  </TabsTrigger>
                  <TabsTrigger value="ad-network" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Ads</span>
                  </TabsTrigger>
                  <TabsTrigger value="monetization" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <Store className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Monetize</span>
                  </TabsTrigger>
                  <TabsTrigger value="memberships" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Tiers</span>
                  </TabsTrigger>
                  <TabsTrigger value="subscription" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Sub</span>
                  </TabsTrigger>

                  {/* Secondary Features Row */}
                  <TabsTrigger value="merchant" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <Store className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">DropStore</span>
                  </TabsTrigger>
                  <TabsTrigger value="droppay" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">DropPay</span>
                  </TabsTrigger>
                  <TabsTrigger value="preferences" className="flex-shrink-0 rounded-lg text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Settings</span>
                  </TabsTrigger>
                </TabsList>

                {/* Setup & Quick Links Section - Separate Container */}
                <div className="mb-8 sm:mb-10 p-4 sm:p-6 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 rounded-xl border border-sky-200/50 dark:border-sky-800/50 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-4 sm:mb-5">Get Started</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <button 
                      onClick={() => document.getElementById('dashboard-builder')?.scrollIntoView({ behavior: 'smooth' })}
                      className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-lg bg-white dark:bg-slate-800 hover:shadow-md transition-all"
                    >
                      <Palette className="w-4 sm:w-5 h-4 sm:h-5 text-sky-600" />
                      <span className="text-xs font-medium text-center text-slate-900 dark:text-white leading-tight">Customize</span>
                    </button>
                    <button 
                      onClick={handleShowQRCode}
                      className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-lg bg-white dark:bg-slate-800 hover:shadow-md transition-all"
                    >
                      <QrCode className="w-4 sm:w-5 h-4 sm:h-5 text-sky-600" />
                      <span className="text-xs font-medium text-center text-slate-900 dark:text-white leading-tight">QR Code</span>
                    </button>
                    <button 
                      onClick={handleCopyLink}
                      className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-lg bg-white dark:bg-slate-800 hover:shadow-md transition-all"
                    >
                      <Share2 className="w-4 sm:w-5 h-4 sm:h-5 text-sky-600" />
                      <span className="text-xs font-medium text-center text-slate-900 dark:text-white leading-tight">Share</span>
                    </button>
                    <button 
                      onClick={() => navigate('/subscription')}
                      className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-lg bg-white dark:bg-slate-800 hover:shadow-md transition-all"
                    >
                      <Crown className="w-4 sm:w-5 h-4 sm:h-5 text-sky-600" />
                      <span className="text-xs font-medium text-center text-slate-900 dark:text-white leading-tight">Upgrade</span>
                    </button>
                  </div>
                </div>

                {/* DropStore Tab */}
                <TabsContent value="merchant" className="pb-6 sm:pb-8">
                  <div className="max-w-lg mx-auto mt-8 sm:mt-12 text-center">
                    <Button
                      onClick={() => setShowDropStoreModal(true)}
                      variant="ghost"
                      className="w-full py-8 sm:py-12 hover:bg-sky-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Store className="w-12 h-12 sm:w-14 sm:h-14 text-sky-600 dark:text-sky-400" />
                        <div>
                          <p className="text-lg sm:text-xl font-semibold text-sky-900 dark:text-sky-100">
                            DropStore
                          </p>
                          <p className="text-xs sm:text-sm text-sky-700 dark:text-sky-300 mt-1">
                            Click to learn more
                          </p>
                        </div>
                      </div>
                    </Button>
                  </div>

                  <ComingSoonModal
                    open={showDropStoreModal}
                    onOpenChange={setShowDropStoreModal}
                    type="dropstore"
                  />
                </TabsContent>

                {/* DropPay Tab */}
                <TabsContent value="droppay" className="pb-6 sm:pb-8">
                  <div className="max-w-lg mx-auto mt-8 sm:mt-12 text-center">
                    <Button
                      onClick={() => setShowDropPayModal(true)}
                      variant="ghost"
                      className="w-full py-8 sm:py-12 hover:bg-sky-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Wallet className="w-12 h-12 sm:w-14 sm:h-14 text-sky-600 dark:text-sky-400" />
                        <div>
                          <p className="text-lg sm:text-xl font-semibold text-sky-900 dark:text-sky-100">
                            DropPay
                          </p>
                          <p className="text-xs sm:text-sm text-sky-700 dark:text-sky-300 mt-1">
                            Click to learn more
                          </p>
                        </div>
                      </div>
                    </Button>
                  </div>

                  <ComingSoonModal
                    open={showDropPayModal}
                    onOpenChange={setShowDropPayModal}
                    type="droppay"
                  />
                </TabsContent>
                {/* Pi Data tab removed for production */}

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6 sm:space-y-8 max-w-xl w-full mx-auto">
                {/* Pi Ad Banner for free users */}
                <PiAdBanner />
                
                <div>
                  <h2 className="text-lg font-semibold mb-4 sm:mb-6 text-gray-900 dark:text-white">Business details</h2>
              

              {/* Logo Upload, AI Logo, and Random Avatar Generator */}
              <div className="mb-6 flex flex-col gap-4 w-full">
                <div>
                  <Label className="mb-3 block text-sm text-gray-900 dark:text-white">Business logo</Label>
                  <div className="flex flex-col gap-3 sm:gap-4 w-full">
                    <div
                      className={
                        `w-20 h-20 flex-shrink-0 bg-card border border-border flex items-center justify-center overflow-hidden ` +
                        (profile.theme?.iconStyle === 'circle'
                          ? 'rounded-full'
                          : profile.theme?.iconStyle === 'square'
                          ? 'rounded-none'
                          : 'rounded-2xl')
                      }
                    >
                      {profile.logo ? (
                        <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex gap-2 flex-col w-full">
                        <label htmlFor="logo-upload">
                          <Button variant="secondary" size="sm" asChild className="w-full">
                            <span>{profile.logo ? "Change" : "Upload"}</span>
                          </Button>
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </label>
                        {profile.logo && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setProfile({ ...profile, logo: "" })}
                            className="w-full"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      {/* AI Logo Generation */}
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 flex-col w-full">
                          <input
                            type="text"
                            placeholder="Describe your logo..."
                            className="border rounded px-2 py-1.5 text-xs sm:text-sm flex-1 w-full"
                            value={aiLogoPrompt || ""}
                            onChange={e => setAiLogoPrompt(e.target.value)}
                            disabled={aiLogoLoading}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!aiLogoPrompt) return;
                              setAiLogoLoading(true);
                              setAiLogoError("");
                              try {
                                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiLogoPrompt)}`;
                                const img = new window.Image();
                                img.crossOrigin = "anonymous";
                                img.onload = () => {
                                  setProfile(prev => ({ ...prev, logo: url }));
                                  setAiLogoLoading(false);
                                };
                                img.onerror = () => {
                                  setAiLogoError("Failed to generate image. Try a different prompt.");
                                  setAiLogoLoading(false);
                                };
                                img.src = url;
                              } catch (e) {
                                setAiLogoError("Error generating image");
                                setAiLogoLoading(false);
                              }
                            }}
                            disabled={aiLogoLoading || !aiLogoPrompt}
                            className="w-full"
                          >
                            {aiLogoLoading ? "Generating..." : "AI"}
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">Generate a logo using AI</div>
                      </div>
                      {/* Logo Style Selector */}
                      <div className="flex gap-2 items-center flex-wrap w-full">
                        <Label htmlFor="logo-style" className="text-xs whitespace-nowrap">Logo style:</Label>
                        <select
                          id="logo-style"
                          value={profile.theme?.iconStyle || 'rounded'}
                          onChange={e => setProfile({
                            ...profile,
                            theme: {
                              ...profile.theme,
                              iconStyle: e.target.value as 'rounded' | 'square' | 'circle',
                            },
                          })}
                          className="border rounded px-2 py-1 text-xs flex-1"
                        >
                          <option value="rounded">Rounded</option>
                          <option value="square">Square</option>
                          <option value="circle">Circle</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Random Avatar Generator */}
                <div>
                  <Label className="mb-2 block text-sm text-gray-900 dark:text-white">Or generate a random avatar</Label>
                  <RandomAvatarGenerator onAvatarGenerated={(url) => setProfile(prev => ({ ...prev, logo: url }))} />
                </div>
              </div>


              {/* Business Name */}
              <div className="mb-6">
                <Label htmlFor="business-name" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Business name</Label>
                <Input
                  id="business-name"
                  value={profile.businessName}
                  onChange={(e) => {
                    const newProfile = { ...profile, businessName: e.target.value };
                    setProfile(newProfile);
                    // Save business name immediately
                    saveProfileNow(newProfile);
                  }}
                  placeholder="Enter business name"
                  className="bg-input-bg text-sm"
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <Label htmlFor="email" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="your@email.com"
                  className="bg-input-bg text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Your email will be used to save preferences and for important notifications
                </p>
              </div>

              {/* Store URL */}
              <div className="mb-6">
                <Label htmlFor="store-url" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Store URL (Username)</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-muted-foreground text-xs truncate">{window.location.origin}/</span>
                    <Input
                      id="store-url"
                      value={profile.storeUrl}
                      onChange={(e) => setProfile({ ...profile, storeUrl: e.target.value })}
                      placeholder="your-store-name"
                      className="bg-input-bg flex-1 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  This will be your public store URL that you can share
                </p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <Label htmlFor="description" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Business description</Label>
                <Textarea
                  id="description"
                  value={profile.description}
                  onChange={(e) => {
                    const newProfile = { ...profile, description: e.target.value };
                    setProfile(newProfile);
                    // Save description immediately
                    saveProfileNow(newProfile);
                  }}
                  placeholder="Tell people about your business..."
                  className="bg-input-bg min-h-[100px] sm:min-h-[120px] resize-none text-sm"
                  maxLength={400}
                />
                <div className="text-xs text-muted-foreground text-right mt-1.5">
                  {profile.description.length} / 400
                </div>
              </div>

              {/* User Category */}
              <div className="mb-6">
                <Label htmlFor="category" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Profile Category</Label>
                <select
                  id="category"
                  value={(profile as any).category || 'other'}
                  onChange={async (e) => {
                    const newCategory = e.target.value;
                    const newProfile = { ...profile, category: newCategory } as any;
                    setProfile(newProfile);
                    
                    if (profileId) {
                      try {
                        const { error } = await supabase
                          .from('profiles')
                          .update({ category: newCategory } as any)
                          .eq('id', profileId);
                        
                        if (error) {
                          console.error('Category update error:', error);
                          toast.error('Failed to update category');
                        } else {
                          toast.success('Category updated!');
                        }
                      } catch (error) {
                        console.error('Category update error:', error);
                        toast.error('Failed to update category');
                      }
                    }
                  }}
                  className="w-full h-10 sm:h-11 px-3 rounded-lg bg-input-bg border border-border text-sm"
                >
                  <option value="content_creator">🎥 Content Creator</option>
                  <option value="business">💼 Business</option>
                  <option value="gamer">🎮 Gamer</option>
                  <option value="developer">💻 Developer</option>
                  <option value="artist">🎨 Artist</option>
                  <option value="musician">🎵 Musician</option>
                  <option value="educator">📚 Educator</option>
                  <option value="influencer">⭐ Influencer</option>
                  <option value="entrepreneur">🚀 Entrepreneur</option>
                  <option value="other">📋 Other</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Choose what best describes you to help others find your profile in search
                </p>
              </div>

              {/* YouTube Video URL - Premium/Pro only */}
              <PlanGate minPlan="premium" featureName="YouTube Video">
                <div className="mb-6">
                  <Label htmlFor="youtube-video" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">YouTube Video</Label>
                  <Input
                    id="youtube-video"
                    value={profile.youtubeVideoUrl}
                    onChange={(e) => setProfile({ ...profile, youtubeVideoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="bg-input-bg text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Add a YouTube video to showcase your business or products
                  </p>
                </div>
              </PlanGate>

              {/* Background Music URL */}
              <PlanGate minPlan="premium" featureName="Background Music">
                <div className="mb-6">
                  <Label htmlFor="background-music" className="mb-2 sm:mb-3 block flex items-center gap-2 text-sm">
                    <Music className="w-4 h-4" />
                    Background Music
                  </Label>
                  <Input
                    id="background-music"
                    value={profile.backgroundMusicUrl || ""}
                    onChange={(e) => setProfile({ ...profile, backgroundMusicUrl: e.target.value })}
                    placeholder="https://example.com/music.mp3 or Spotify/YouTube link"
                    className="bg-input-bg text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Add a background music URL (MP3, Spotify, YouTube) that will play on your public bio page. The audio will loop continuously and visitors can control playback.
                  </p>
                </div>
              </PlanGate>

              {/* Public Bio Cover */}
              <div className="mb-6">
                <Label className="mb-2 sm:mb-3 block flex items-center gap-2 text-sm">
                  <Image className="w-4 h-4" />
                  Public Bio Cover
                </Label>
                <div className="flex items-start gap-4">
                  <div className="w-36 h-24 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center">
                    {profile.theme.coverImage ? (
                      <img src={profile.theme.coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground text-center px-2">1200x600 recommended</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label htmlFor="cover-upload">
                        <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
                          <span>{profile.theme.coverImage ? "Change" : "Upload"}</span>
                        </Button>
                        <input
                          id="cover-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverUpload}
                        />
                      </label>
                      {profile.theme.coverImage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProfile({ ...profile, theme: { ...profile.theme, coverImage: "" } })}
                          className="w-full sm:w-auto"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      value={profile.theme.coverImage || ""}
                      onChange={(e) => setProfile({ ...profile, theme: { ...profile.theme, coverImage: e.target.value } })}
                      placeholder="https://your-cover-image.com/cover.jpg"
                      className="bg-input-bg text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown at the top of your public bio for a link.me-style cover.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verified Badge (30 Pi) */}
              <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 rounded-xl bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30">
                <div className="flex items-start gap-3">
                  <img 
                    src="https://i.ibb.co/Kcz0w18P/verify-6.png" 
                    alt="Verified badge" 
                    className="w-8 h-8 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-sm font-semibold">Get Verified</Label>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">30 Pi</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Show the verified badge next to your name and stand out as a trusted creator.
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={profile.isVerified || false}
                        onCheckedChange={(checked) => setProfile({ ...profile, isVerified: checked })}
                        disabled={!profile.isVerified}
                      />
                      <span className="text-xs text-muted-foreground">
                        {profile.isVerified ? "Verified ✓" : "Not verified · Pay 30 Pi to verify"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Social links</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!profileId) return;
                      toast.info('Verifying follower counts...');
                      try {
                        const { data, error } = await supabase.functions.invoke('verify-social-followers', {
                          body: {
                            socialLinks: profile.socialLinks,
                            profileId: profileId
                          }
                        });
                        if (error) {
                          console.error('Verification error:', error);
                          toast.error('Failed to verify followers');
                        } else if (data?.verifiedLinks) {
                          setProfile({ ...profile, socialLinks: data.verifiedLinks });
                          toast.success('Follower counts verified!');
                        }
                      } catch (error) {
                        console.error('Verification error:', error);
                        toast.error('Verification service unavailable');
                      }
                    }}
                    className="text-xs h-7"
                    title="Fetch real follower counts from social media APIs"
                  >
                    ✓ Verify Followers
                  </Button>
                </div>
                {/* Social link plan gating */}
                {(() => {
                  let maxLinks = 1;
                  if (plan === "basic") maxLinks = 3;
                  if (plan === "premium" || plan === "pro") maxLinks = 99;
                  return (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded whitespace-nowrap">
                      {plan === "free" && "Limit: 1 social link"}
                      {plan === "basic" && "Limit: 3 social links"}
                      {(plan === "premium" || plan === "pro") && "Unlimited social links"}
                    </span>
                  );
                })()}
              </div>
              <div className="space-y-3 sm:space-y-4">
                {/* For Premium/Pro: Add/Remove custom social links with icon picker */}
                {(plan === "premium" || plan === "pro") && (
                  <>
                    {profile.socialLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2 sm:gap-3">
                        {/* Icon Picker */}
                        <select
                          value={link.icon || link.type}
                          onChange={e => {
                            const newLinks = [...profile.socialLinks];
                            newLinks[idx].icon = e.target.value;
                            setProfile({ ...profile, socialLinks: newLinks });
                          }}
                          className="w-10 h-10 sm:w-12 sm:h-10 rounded-lg border border-border bg-card text-center flex-shrink-0 text-sm"
                        >
                          <option value="twitter">🐦</option>
                          <option value="instagram">📸</option>
                          <option value="youtube">▶️</option>
                          <option value="tiktok">🎵</option>
                          <option value="facebook">📘</option>
                          <option value="linkedin">💼</option>
                          <option value="twitch">🎮</option>
                          <option value="website">🌐</option>
                          <option value="custom">⭐</option>
                        </select>
                        <Input
                          value={link.url}
                          onChange={e => {
                            const newLinks = [...profile.socialLinks];
                            newLinks[idx].url = e.target.value;
                            const updatedProfile = { ...profile, socialLinks: newLinks };
                            setProfile(updatedProfile);
                            // Save immediately for custom links
                            console.log('[CUSTOM SOCIAL] Updating custom link at index', idx, 'Value:', e.target.value);
                            saveProfileNow(updatedProfile);
                          }}
                          placeholder="Enter URL"
                          className="bg-input-bg flex-1 text-sm"
                        />
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={link.followers ?? ""}
                          onChange={(e) => handleSocialFollowerChange(link.type || `custom-${idx}`, e.target.value, idx)}
                          placeholder="Followers"
                          className="bg-input-bg w-28 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newLinks = profile.socialLinks.filter((_, i) => i !== idx);
                            setProfile({ ...profile, socialLinks: newLinks });
                          }}
                          title="Remove"
                          className="h-10 w-10 flex-shrink-0"
                        >
                          ✖️
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProfile({
                          ...profile,
                          socialLinks: [
                            ...profile.socialLinks,
                            { type: "custom", url: "", icon: "custom" },
                          ],
                        });
                      }}
                      className="w-full mt-2"
                    >
                      + Add Social Link
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                    <FaXTwitter className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "twitter")?.url || "" : ""}
                    onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                    placeholder="https://x.com/"
                    className="bg-input-bg flex-1 text-sm"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "twitter")?.followers ?? "" : ""}
                    onChange={(e) => handleSocialFollowerChange("twitter", e.target.value)}
                    placeholder="Followers"
                    className="bg-input-bg w-28 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "instagram")?.url || "" : ""}
                    onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                    placeholder="https://instagram.com/"
                    className="bg-input-bg flex-1 text-sm"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "instagram")?.followers ?? "" : ""}
                    onChange={(e) => handleSocialFollowerChange("instagram", e.target.value)}
                    placeholder="Followers"
                    className="bg-input-bg w-28 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "youtube")?.url || "" : ""}
                    onChange={(e) => handleSocialLinkChange("youtube", e.target.value)}
                    placeholder="https://youtube.com/@"
                    className="bg-input-bg flex-1 text-sm"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "youtube")?.followers ?? "" : ""}
                    onChange={(e) => handleSocialFollowerChange("youtube", e.target.value)}
                    placeholder="Followers"
                    className="bg-input-bg w-28 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                    <FaTiktok className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "tiktok")?.url || "" : ""}
                    onChange={(e) => handleSocialLinkChange("tiktok", e.target.value)}
                    placeholder="https://tiktok.com/@"
                    className="bg-input-bg flex-1 text-sm"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "tiktok")?.followers ?? "" : ""}
                    onChange={(e) => handleSocialFollowerChange("tiktok", e.target.value)}
                    placeholder="Followers"
                    className="bg-input-bg w-28 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "facebook")?.url || "" : ""}
                    onChange={(e) => handleSocialLinkChange("facebook", e.target.value)}
                    placeholder="https://facebook.com/"
                    className="bg-input-bg flex-1 text-sm"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "facebook")?.followers ?? "" : ""}
                    onChange={(e) => handleSocialFollowerChange("facebook", e.target.value)}
                    placeholder="Followers"
                    className="bg-input-bg w-28 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "linkedin")?.url || "" : ""}
                    onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/"
                    className="bg-input-bg flex-1 text-sm"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "linkedin")?.followers ?? "" : ""}
                    onChange={(e) => handleSocialFollowerChange("linkedin", e.target.value)}
                    placeholder="Followers"
                    className="bg-input-bg w-28 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Twitch className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "twitch")?.url || "" : ""}
                    onChange={(e) => handleSocialLinkChange("twitch", e.target.value)}
                    placeholder="https://twitch.tv/"
                    className="bg-input-bg flex-1 text-sm"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "twitch")?.followers ?? "" : ""}
                    onChange={(e) => handleSocialFollowerChange("twitch", e.target.value)}
                    placeholder="Followers"
                    className="bg-input-bg w-28 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "website")?.url || "" : ""}
                    onChange={(e) => handleSocialLinkChange("website", e.target.value)}
                    placeholder="Enter website URL"
                    className="bg-input-bg flex-1 text-sm"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "website")?.followers ?? "" : ""}
                    onChange={(e) => handleSocialFollowerChange("website", e.target.value)}
                    placeholder="Followers"
                    className="bg-input-bg w-28 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Pi Wallet Address for Tips & Payments + Pi Tip/Send Me a Coffee */}
            {/* Pi Wallet for Tips - Basic and above only, auto-lock if expired */}
            <PlanGate minPlan="basic" featureName="Pi Wallet for Tips">
              {isAuthenticated && !isPlanExpired && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg mb-4">
                    <div className="space-y-0.5">
                      <label htmlFor="show-pi-wallet-tips" className="text-base font-medium">
                        Show Pi Wallet for Tips
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Allow visitors to see your Pi wallet tip QR and message on your public profile
                      </p>
                    </div>
                    <Switch
                      id="show-pi-wallet-tips"
                      checked={profile.showPiWalletTips !== false}
                      onCheckedChange={(checked) => setProfile({ ...profile, showPiWalletTips: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                      <Wallet className="w-5 h-5 text-blue-500" />
                      Pi Wallet for Tips
                    </h2>
                    <span className="text-xs text-muted-foreground bg-blue-50 px-2 py-1 rounded">
                      Pi Network
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex flex-col gap-6">
                        <div className="flex-1">
                          <h3 className="font-medium text-blue-900 mb-1 text-sm sm:text-base">Receive DROP or Pi Tips</h3>
                          <div className="flex flex-col gap-2 mb-3">
                            <Input
                              value={profile.piDonationMessage || ''}
                              onChange={(e) => setProfile({ ...profile, piDonationMessage: e.target.value })}
                              placeholder="Send me a coffee ☕"
                              className="bg-background border-primary text-xs font-mono w-full"
                              maxLength={64}
                            />
                            <span className="text-xs text-muted-foreground">Custom message</span>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2">
                              <Input
                                value={profile.piWalletAddress || ''}
                                onChange={(e) => setProfile({ ...profile, piWalletAddress: e.target.value })}
                                placeholder="G... (Pi Network wallet address)"
                                className="bg-background border-primary text-xs font-mono flex-1 w-full"
                                maxLength={56}
                              />
                              {profile.piWalletAddress && (
                                <div className="flex gap-1 w-full sm:w-auto">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(profile.piWalletAddress!);
                                      toast.success('Wallet address copied!');
                                    }}
                                    className="text-xs border-blue-300 flex-1 sm:flex-initial"
                                  >
                                    Copy
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPiWalletQR(true)}
                                    className="text-xs border-blue-300 flex-1 sm:flex-initial"
                                  >
                                    QR
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 w-full">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (getCurrentWalletAddress) {
                                    const walletAddr = getCurrentWalletAddress();
                                    if (walletAddr) {
                                      setProfile({ ...profile, piWalletAddress: walletAddr });
                                      toast.success('Wallet address imported from Pi Network!');
                                    } else {
                                      toast.error('No Pi wallet found. Please authenticate or import a wallet first.');
                                    }
                                  } else {
                                    toast.error('Please go to the Wallet section to set up your Pi Network wallet first.');
                                  }
                                }}
                                className="text-xs border-blue-300 flex-1"
                              >
                                <Wallet className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Import from Wallet</span>
                                <span className="sm:hidden">Import</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
                          <div className="font-semibold text-blue-900 mb-1 text-sm">Tip / Send a Coffee</div>
                          {profile.piWalletAddress ? (
                            <>
                              <div className="relative mx-auto">
                                <svg width="140" height="140" className="rounded border border-blue-300 bg-white sm:w-40 sm:h-40">
                                  <foreignObject width="140" height="140">
                                    <div style={{ width: '140px', height: '140px', position: 'relative' }}>
                                      <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(profile.piWalletAddress)}`}
                                        alt="Wallet QR Code"
                                        style={{ width: 140, height: 140, borderRadius: 8, background: '#fff' }}
                                      />
                                      <img
                                        src="/droplink-logo.png"
                                        alt="Droplink Logo"
                                        style={{ position: 'absolute', left: '50%', top: '50%', width: 40, height: 40, transform: 'translate(-50%, -50%)', borderRadius: 10, border: '2px solid #fff', background: '#fff', boxShadow: '0 2px 8px #0001' }}
                                      />
                                    </div>
                                  </foreignObject>
                                </svg>
                              </div>
                              <div className="text-xs text-blue-700 break-all text-center mt-1">
                                <span>Scan to tip Pi</span>
                              </div>
                              <div className="text-xs text-blue-700 break-all text-center mt-1 font-mono">
                                <span>{profile.piWalletAddress.substring(0, 6)}...{profile.piWalletAddress.substring(-4)}</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-blue-400 text-center">Enter your wallet address to generate a QR code</div>
                          )}
                          {profile.piWalletQrUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(profile.piWalletQrUrl!);
                                toast.success('QR code image URL copied!');
                              }}
                            >
                              Copy QR URL
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </PlanGate>

            {/* Custom Links - Premium/Pro only */}
            <PlanGate minPlan="premium" featureName="Custom Links">
              <div className="border-t pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2 sm:gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Links</h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {autoSave.isSaving && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Saving...</span>
                    )}
                    {autoSave.lastSaved && !autoSave.isSaving && (
                      <span className="text-xs text-green-600 whitespace-nowrap">Saved</span>
                    )}
                    <Button size="sm" variant="outline" onClick={autoSave.save} disabled={autoSave.isSaving} className="text-xs">
                      {autoSave.isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
                <LinkManager
                  customLinks={profile.customLinks || []}
                  shortenedLinks={profile.shortenedLinks || []}
                  onCustomLinksChange={(links) => setProfile({ ...profile, customLinks: links })}
                  onShortenedLinksChange={(links) => setProfile({ ...profile, shortenedLinks: links })}
                  layoutType={profile.linkLayoutType as any || 'stack'}
                  onLayoutChange={(layout) => setProfile({ ...profile, linkLayoutType: layout })}
                />
              </div>
            </PlanGate>

            {/* Donation Wallets section removed */}

            {/* Pi Network Wallet section removed */}

            {/* Share Button Settings */}
            <div className="border-t pt-4 sm:pt-6">
              <h2 className="text-lg font-semibold mb-3 sm:mb-6 text-gray-900 dark:text-white">Public Profile Settings</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-card border border-border rounded-lg gap-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="share-button" className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    Show Share Button
                  </Label>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Allow visitors to share your profile with a button
                  </p>
                </div>
                <Switch
                  id="share-button"
                  checked={profile.showShareButton}
                  onCheckedChange={(checked) => setProfile({ ...profile, showShareButton: checked })}
                />
              </div>
            </div>

            {/* Theme Customization - Premium/Pro only */}
            <PlanGate minPlan="premium" featureName="Theme Customization">
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4 sm:mb-6 text-gray-900 dark:text-white">Theme Customization</h2>
                
                {/* Quick Template Picker */}
                <div className="mb-6">
                  <Label className="mb-3 block text-sm text-gray-900 dark:text-white">Quick Templates (Droplink-style)</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {[
                      { id: 'midnight', name: 'Midnight', primary: '#3b82f6', bg: '#0f0f23' },
                      { id: 'sunset', name: 'Sunset', primary: '#ff6b6b', bg: '#2d1b1b' },
                      { id: 'forest', name: 'Forest', primary: '#22c55e', bg: '#0a1f0a' },
                      { id: 'minimal', name: 'Minimal', primary: '#111827', bg: '#ffffff' },
                      { id: 'neon', name: 'Neon', primary: '#a855f7', bg: '#0f0f0f' },
                      { id: 'ocean', name: 'Ocean', primary: '#3b82f6', bg: '#0c1929' },
                      { id: 'rose', name: 'Rose', primary: '#be7c4d', bg: '#1a1412' },
                      { id: 'arctic', name: 'Arctic', primary: '#0ea5e9', bg: '#0c1929' },
                    ].map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          const newProfile = {
                            ...profile,
                            theme: {
                              ...profile.theme,
                              primaryColor: template.primary,
                              backgroundColor: template.bg,
                            }
                          };
                          setProfile(newProfile);
                          saveProfileNow(newProfile);
                          toast.success(`Applied ${template.name} template!`);
                        }}
                        className="aspect-square rounded-lg border-2 border-border hover:border-primary transition-all hover:scale-105 overflow-hidden"
                        title={template.name}
                      >
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: template.bg }}
                        >
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: template.primary }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Click a template to apply its colors instantly</p>
                </div>
                
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="primary-color" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Primary Color</Label>
                  <Input
                    id="primary-color"
                    type="color"
                    value={profile.theme.primaryColor}
                    onChange={(e) => {
                      const newProfile = {
                        ...profile,
                        theme: { ...profile.theme, primaryColor: e.target.value }
                      };
                      setProfile(newProfile);
                      // Save theme changes immediately
                      saveProfileNow(newProfile);
                    }}
                    className="h-11 sm:h-12 w-full rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="background-color" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Background Color</Label>
                  <Input
                    id="background-color"
                    type="color"
                    value={profile.theme.backgroundColor}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, backgroundColor: e.target.value }
                    })}
                    className="h-11 sm:h-12 w-full rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="text-color" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Text Color</Label>
                  <Input
                    id="text-color"
                    type="color"
                    value={profile.theme.textColor || '#ffffff'}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, textColor: e.target.value }
                    })}
                    className="h-11 sm:h-12 w-full rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="icon-style" className="mb-2 sm:mb-3 block text-sm text-gray-900 dark:text-white">Icon Style</Label>
                  <select
                    id="icon-style"
                    value={profile.theme.iconStyle}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, iconStyle: e.target.value }
                    })}
                    className="w-full h-10 sm:h-11 px-3 rounded-lg bg-input-bg border border-border text-sm"
                  >
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>

                {/* Live preview for text visibility */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg border" style={{
                  background: profile.theme.backgroundColor,
                  color: profile.theme.textColor || '#ffffff',
                  borderColor: profile.theme.primaryColor
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Text Preview: Always Visible</span>
                  <p style={{ marginTop: 8, fontSize: '0.875rem' }}>This is a preview of your text color on your selected background. Make sure it is always readable!</p>
                </div>
              </div>
              </div>
            </PlanGate>

            {/* Digital Products - Premium/Pro only */}
            <PlanGate minPlan="premium" featureName="Digital Products">
              <div>
                <h2 className="text-lg font-semibold mb-4 sm:mb-6 text-gray-900 dark:text-white">Digital Products</h2>
              <div className="space-y-3 sm:space-y-4">
                {profile.products.map((product, index) => (
                  <div key={product.id} className="p-3 sm:p-4 bg-card border border-border rounded-lg space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-sm sm:text-base">Product {index + 1}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newProducts = profile.products.filter(p => p.id !== product.id);
                          setProfile({ ...profile, products: newProducts });
                        }}
                        className="text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                    <Input
                      placeholder="Product Title"
                      value={product.title}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].title = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <Input
                        placeholder="Price (e.g., $9.99)"
                        value={product.price?.toString() ?? ""}
                        onChange={(e) => {
                          const newProducts = [...profile.products];
                          newProducts[index].price = e.target.value;
                          setProfile({ ...profile, products: newProducts });
                        }}
                        className="bg-input-bg text-sm"
                      />
                      <Input
                        placeholder="Category"
                        className="bg-input-bg text-sm"
                      />
                    </div>
                    <Textarea
                      placeholder="Product Description"
                      value={product.description}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].description = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg min-h-[70px] sm:min-h-[80px] resize-none text-sm"
                    />
                    <Input
                      placeholder="File/Download URL"
                      value={product.fileUrl}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].fileUrl = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg text-sm"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    const newProduct = {
                      id: Date.now().toString(),
                      title: "",
                      price: "",
                      description: "",
                      fileUrl: "",
                    };
                    setProfile({ ...profile, products: [...profile.products, newProduct] });
                  }}
                >
                  + Add Product
                </Button>
              </div>
              </div>
            </PlanGate>

                {/* Action Buttons */}
                <Card
                  className="sticky bottom-0 z-[100] w-full p-0 m-0 border border-white/50 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_12px_40px_-16px_rgba(0,0,0,0.35)] rounded-2xl"
                >
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-t border-white/40 dark:border-slate-800/80 w-full p-2 sm:p-3 m-0">
                    <Button
                      className="flex-1 h-11 sm:h-12 rounded-xl bg-white/70 dark:bg-slate-900/70 text-sky-500 font-medium border border-sky-200/70 hover:bg-white/90 dark:hover:bg-slate-900"
                      onClick={() => {
                        toast.info('No changes were saved.');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      className="flex-1 h-11 sm:h-12 bg-sky-400/90 hover:bg-sky-500 text-white font-semibold rounded-xl border border-sky-300/60 shadow-[0_8px_20px_-10px_rgba(56,189,248,0.9)]"
                      style={{ transition: 'box-shadow 0.2s' }}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              {/* Design Tab - Premium/Pro only */}
              <TabsContent value="design" className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
                <PlanGate minPlan="premium" featureName="GIF Background (Premium)">
                  {!isPlanExpired && (
                    <>
                      <DesignCustomizer 
                        theme={profile.theme}
                        onThemeChange={(newTheme) => setProfile({ ...profile, theme: newTheme })}
                      />
                      {/* Save Button */}
                      <div className={`flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 sm:pt-6 pb-6 sm:pb-8 border-t border-white/40 dark:border-slate-800/80 sticky bottom-0 z-[100] w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_12px_40px_-16px_rgba(0,0,0,0.35)] rounded-2xl`}>
                        <Button variant="outline" className="flex-1 h-11 sm:h-12 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-sky-200/70 hover:bg-white/90 dark:hover:bg-slate-900 text-sky-500">
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSave} 
                          className="flex-1 h-11 sm:h-12 bg-sky-400/90 hover:bg-sky-500 text-white font-semibold shadow-[0_8px_20px_-10px_rgba(56,189,248,0.9)] rounded-xl border border-sky-300/60" 
                          style={{ transition: 'box-shadow 0.2s' }}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save changes"}
                        </Button>
                      </div>
                    </>
                  )}
                </PlanGate>
              </TabsContent>

              {/* Analytics Tab - locked for Free plan */}
              <TabsContent value="analytics" className="pb-8">
                <PlanGate minPlan="pro" featureName="Analytics">
                  {!isPlanExpired && (
                    <>
                      {/* Expiration/Renewal Modal */}
                      <Dialog open={showRenewModal} onOpenChange={setShowRenewModal}>
                        <DialogContent>
                          <DialogTitle>{isPlanExpired ? "Your plan has expired" : "Your plan is about to expire"}</DialogTitle>
                          <DialogDescription>
                            {isPlanExpired
                              ? "Your subscription plan has expired. Features like GIF backgrounds, Pi Tips, and Analytics are now locked. Renew your plan to regain access."
                              : "Your subscription plan will expire soon. Renew now to avoid losing access to premium features."}
                            <br />
                            <strong>Expiration date:</strong> {expiresAt ? new Date(expiresAt).toLocaleString() : "-"}
                          </DialogDescription>
                          <DialogFooter>
                            <Button onClick={() => { setShowRenewModal(false); navigate("/subscription"); }}>
                              Renew Plan
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {profileId ? (
                        <Analytics profileId={profileId} />
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Save your profile first to see analytics</p>
                        </div>
                      )}
                    </>
                  )}
                </PlanGate>
              </TabsContent>


              {/* <TabsContent value="features" className="pb-8">
                <FutureFeaturesDashboard />
              </TabsContent> */}

              {/* DROP tokens tab content hidden for now */}
              {/* <TabsContent value="drop-tokens" className="pb-8">
                <PlanGate minPlan="basic" featureName="Pi Wallet for Tips">
                  <DropTokenManager piUser={piUser} piWallet={piUser?.wallet_address} />
                </PlanGate>
              </TabsContent> */}

              <TabsContent value="ad-network" className="pb-8">
                <PiAdNetwork />
              </TabsContent>

              <TabsContent value="payments" className="pb-8">
                <PiPayments />
              </TabsContent>


              {/* Subscription Tab */}
              <TabsContent value="subscription" className="pb-8">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Important:</strong> Canceling your plan will permanently delete all subscriptions (including gift card plans), gift cards, and transaction history. You can subscribe to a new plan after cancellation.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                  <Button variant="outline" onClick={() => setShowPlanModal(true)}>
                    View My Plan / Renew
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelPlan}
                    disabled={cancelingPlan}
                  >
                    {cancelingPlan ? 'Canceling...' : 'Cancel Plan (back to Free)'}
                  </Button>
                </div>
                <SubscriptionStatus />
              </TabsContent>

              {/* Plan Modal */}
              <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
                <DialogContent className="max-w-lg">
                  <DialogTitle>User Plan Details</DialogTitle>
                  <DialogDescription>
                    View your current plan, expiry, and renew or upgrade below.
                  </DialogDescription>
                  <div className="my-4">
                    <SubscriptionStatus />
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-xs text-yellow-700">
                          Canceling will delete all subscriptions (regular & gift plans), gift cards, and transaction history. You can subscribe again after cancellation.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <Button onClick={() => setShowPlanModal(false)} variant="secondary">Close</Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelPlan}
                      disabled={cancelingPlan}
                    >
                      {cancelingPlan ? 'Canceling...' : 'Cancel Plan (back to Free)'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>


              {/* <TabsContent value="voting" className="pb-8">
                <VotingSystem />
              </TabsContent> */}

              {/* Monetization Tab - Products & Selling */}
              <TabsContent value="monetization" className="pb-8 space-y-6">
                <PlanGate minPlan="basic" featureName="Monetization">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Products & Tips</h3>
                    <ProductManager
                      products={products}
                      onSave={saveProduct}
                      onDelete={deleteProduct}
                      profileId={profileId || ''}
                    />
                  </div>
                </PlanGate>
              </TabsContent>

              {/* Memberships Tab - Tiers */}
              <TabsContent value="memberships" className="pb-8 space-y-6">
                <PlanGate minPlan="premium" featureName="Membership Tiers">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Membership Tiers</h3>
                    <MembershipManager
                      tiers={tiers}
                      onSave={saveTier}
                      onDelete={deleteTier}
                      profileId={profileId || ''}
                    />
                  </div>
                </PlanGate>
              </TabsContent>

              {/* Analytics Tab - Dashboard */}
              <TabsContent value="analytics" className="pb-8">
                <AnalyticsDashboard
                  summary={analyticsSummary}
                  onExport={exportAnalytics}
                />
              </TabsContent>

              {/* User Preferences Tab */}
              <TabsContent value="preferences" className="pb-8">
                <UserPreferencesManager />
                
                {/* Account Deletion Section */}
                <div className="mt-8">
                  <AccountDeletion 
                    currentUser={piUser || { id: profileId }}
                    onAccountDeleted={() => {
                      // Handle post-deletion cleanup
                      setProfile({
                        id: "",
                        username: "",
                        storeUrl: "",
                        businessName: "",
                        description: "",
                        logo: "",
                        email: "",
                        youtubeVideoUrl: "",
                        backgroundMusicUrl: "",
                        piDonationMessage: "",
                        piWalletAddress: "",
                        showShareButton: true,
                        hasPremium: false,
                        socialLinks: [
                          { type: "twitter", url: "" },
                          { type: "instagram", url: "" },
                          { type: "youtube", url: "" },
                          { type: "tiktok", url: "" },
                          { type: "facebook", url: "" },
                          { type: "linkedin", url: "" },
                          { type: "twitch", url: "" },
                          { type: "website", url: "" },
                        ],
                        theme: {
                          primaryColor: "#38bdf8",
                          backgroundColor: "#000000",
                          backgroundType: "color",
                          backgroundGif: "",
                          backgroundVideo: "",
                          iconStyle: "rounded",
                          buttonStyle: "filled",
                        },
                        customLinks: [],
                        paymentLinks: [],
                        products: [],
                      });
                    }}
                  />
                </div>
              </TabsContent>

              {/* Pi Data content removed for production */}
            </Tabs>
          </div>
        </section>

        {/* Preview Panel */}
        <aside
          className={`w-full ${showPreview ? 'flex' : 'hidden lg:flex'} lg:w-[380px] xl:w-[420px] 2xl:w-[480px] border border-slate-200/80 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70 rounded-2xl shadow-sm flex-col items-center justify-start overflow-hidden`}
          style={{ minHeight: 0 }}
        >
          <div className="w-full border-b border-slate-200/70 dark:border-slate-800/60 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Live preview</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Link-in-bio page</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleCopyLink}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/search-users')}>
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="w-full px-4 py-3 space-y-2">
            <Button 
              onClick={() => window.open('https://droppay.space/', '_blank')} 
              className="w-full bg-sky-500 hover:bg-sky-600 text-white"
              size="sm"
            >
              <Store className="w-4 h-4 mr-2" />
              Sell Digital Products
            </Button>
            <Button 
              onClick={() => navigate('/subscription')} 
              variant="secondary"
              className="w-full"
              size="sm"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade plan
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center w-full overflow-hidden px-3 pb-4">
            <PhonePreview profile={profile} />
          </div>
        </aside>
      </div>
      

      {/* QR Code Dialog for Store Link */}
      <QRCodeDialog
        open={showQRCode}
        onOpenChange={setShowQRCode}
        url={profile.storeUrl ? `${window.location.origin}/${profile.storeUrl}` : ''}
        username={profile.storeUrl || 'store'}
      />

      {/* Pi Wallet QR Code Dialog */}
      <QRCodeDialog
        open={showPiWalletQR}
        onOpenChange={setShowPiWalletQR}
        url={piWalletQrData}
        username="Pi-Wallet"
      />

      {/* About Modal */}
      <AboutModal
        open={showAboutModal}
        onOpenChange={setShowAboutModal}
      />

      {/* Welcome Modal */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent>
          <DialogTitle>Welcome to DropLink!</DialogTitle>
          <DialogDescription>
            👋 Hi, {displayUsername || 'there'}!<br />
            This is your dashboard. Here you can manage your profile, customize your page, and access all features.
          </DialogDescription>
          <DialogFooter>
            <button onClick={() => setShowWelcomeModal(false)} className="bg-sky-400 text-white px-4 py-2 rounded hover:bg-sky-500">Get Started</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </main>

      {/* Bottom Navigation Bar - Mobile & Desktop Unified */}
      <nav
        className={`fixed left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-sky-200/60 dark:border-sky-800/60 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] z-50 transition-all duration-500 ease-in-out ${showFooter ? 'bottom-0 translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2">
          <div className="flex justify-around items-center">
            {/* Home */}
            <button
              onClick={() => {
                if (window.location.pathname !== '/') {
                  navigate('/');
                  setTimeout(() => {
                    focusTab('profile');
                  }, 500);
                } else {
                  focusTab('profile');
                }
              }}
              className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
              title="Home"
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 group-hover:rotate-3 transition-all duration-300 drop-shadow-sm" />
              <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Home</span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
            </button>

            {/* Inbox */}
            <button
              onClick={() => navigate('/inbox')}
              className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
              title="Inbox"
            >
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 group-hover:-rotate-3 transition-all duration-300 drop-shadow-sm" />
              <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Inbox</span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
            </button>

            {/* Search Users */}
            <button
              onClick={() => navigate('/search-users')}
              className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
              title="Search Users"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 drop-shadow-sm" />
              <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Search</span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
            </button>

            {/* Followers */}
            <button
              onClick={() => navigate('/followers')}
              className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
              title="Followers"
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 transition-all duration-300 drop-shadow-sm" />
              <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Followers</span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
            </button>

            {/* About */}
            <button
              onClick={() => setShowAboutModal(true)}
              className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
              title="About Droplink"
            >
              <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 shadow-sm group-hover:scale-105 transition-all">
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <span className="text-[11px] sm:text-xs mt-1 leading-tight">About</span>
            </button>

            {/* Menu */}
            <Drawer>
              <DrawerTrigger asChild>
                <button 
                  className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
                  title="More Options"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300 drop-shadow-sm" />
                  <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Menu</span>
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
                </button>
              </DrawerTrigger>
              <DrawerContent className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 fixed bottom-16 left-0 right-0 max-h-[70vh] z-50">
                <DrawerHeader className="border-b pb-3">
                  <DrawerTitle className="text-base sm:text-lg font-semibold">Droplink Menu</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-2 max-h-[calc(70vh-100px)] overflow-y-auto">
                  {/* Profile & Account */}
                  <div className="text-xs uppercase tracking-wide text-slate-500 px-2 py-1 font-semibold">Profile</div>
                  <Button 
                    onClick={() => { navigate('/'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Home className="w-4 h-4" />
                    Dashboard
                  </Button>
                  <Button 
                    onClick={() => { navigate('/profile'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </Button>
                  
                  {/* Social & Engagement */}
                  <div className="text-xs uppercase tracking-wide text-slate-500 px-2 py-1 font-semibold mt-4">Social</div>
                  <Button 
                    onClick={() => { navigate('/followers'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Users className="w-4 h-4" />
                    Followers
                  </Button>
                  <Button 
                    onClick={() => { navigate('/search-users'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Users className="w-4 h-4" />
                    Discover Users
                  </Button>
                  
                  {/* Messaging & Monetization */}
                  <div className="text-xs uppercase tracking-wide text-slate-500 px-2 py-1 font-semibold mt-4">Messaging & Earn</div>
                  <Button 
                    onClick={() => { navigate('/inbox'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Mail className="w-4 h-4" />
                    Inbox & Messages
                  </Button>
                  <Button 
                    onClick={() => {
                      if (window.location.pathname !== '/') {
                        navigate('/');
                        setTimeout(() => focusTab('droppay'), 500);
                      } else {
                        focusTab('droppay');
                      }
                    }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Earn & Monetize
                  </Button>
                  <Button 
                    onClick={() => { navigate('/sales-earnings'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Sales & Earnings
                  </Button>
                  
                  {/* Tools & Features */}
                  <div className="text-xs uppercase tracking-wide text-slate-500 px-2 py-1 font-semibold mt-4">Tools</div>
                  <Button 
                    onClick={() => { navigate('/card-generator'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <CreditCard className="w-4 h-4" />
                    Card Generator
                  </Button>
                  <Button 
                    onClick={() => { navigate('/ai-support'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Bot className="w-4 h-4" />
                    AI Support
                  </Button>
                  <Button 
                    onClick={() => { navigate('/wallet'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Wallet className="w-4 h-4" />
                    Wallet
                  </Button>
                  <Button 
                    onClick={() => { navigate('/domain'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Globe className="w-4 h-4" />
                    Custom Domain
                  </Button>
                  
                  {/* Account & Settings */}
                  <div className="text-xs uppercase tracking-wide text-slate-500 px-2 py-1 font-semibold mt-4">Account</div>
                  <Button 
                    onClick={() => { navigate('/subscription'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade Plan
                  </Button>
                  <Button 
                    onClick={() => { navigate('/privacy'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Info className="w-4 h-4" />
                    Privacy Policy
                  </Button>
                  <Button 
                    onClick={() => setShowAboutModal(true)}
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Info className="w-4 h-4" />
                    About Droplink
                  </Button>
                  <Button 
                    onClick={() => { navigate('/terms'); }} 
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10"
                  >
                    <Info className="w-4 h-4" />
                    Terms of Service
                  </Button>
                  <Button 
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 h-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </nav>
    </div>
  );
};

// (imports already handled at top)

const GiftRedeemModal = () => {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState("");
  const [code, setCode] = useState("");
  const [period, setPeriod] = useState("");

  useEffect(() => {
    const checkGift = () => {
      const data = window.localStorage.getItem('droplink-gift-redeemed');
      if (data) {
        const { plan, code, period } = JSON.parse(data);
        setPlan(plan);
        setCode(code);
        setPeriod(period);
        setOpen(true);
      }
    };
    checkGift();
    window.addEventListener('droplink-gift-redeemed', checkGift);
    return () => window.removeEventListener('droplink-gift-redeemed', checkGift);
  }, []);

  const handleClose = () => {
    setOpen(false);
    window.localStorage.removeItem('droplink-gift-redeemed');
  };

  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Gift Plan Activated!</DialogTitle>
        <DialogDescription>
          <div className="mb-2">You have redeemed a <b>{plan}</b> plan ({period}) with code <span className="font-mono">{code}</span>.</div>
          <div className="mb-2">Your dashboard features are now unlocked based on this plan.</div>
        </DialogDescription>
        <DialogFooter>
          <button onClick={handleClose} className="bg-sky-400 text-white px-4 py-2 rounded hover:bg-sky-500">OK</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DashboardWithGiftModal = () => {
  return <>
    <GiftRedeemModal />
    <Dashboard />
  </>;
};

export default DashboardWithGiftModal;
