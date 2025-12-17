import React, { useState, useEffect } from "react";
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
import { isDevModeEnabled, MOCK_DEV_USER, getDevModeStatus } from "@/lib/dev-auth";
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
  // Christmas Theme Toggle State
  const [enableChristmasTheme, setEnableChristmasTheme] = useState(() => {
    const saved = localStorage.getItem('droplink-christmas-theme');
    return saved !== null ? JSON.parse(saved) : false; // Default to false for dashboard
  });
  const navigate = useNavigate();
  
  // Hooks must be called unconditionally
  const piContext = usePi();
  const { piUser, isAuthenticated, signIn, signOut: piSignOut, loading: piLoading, getCurrentWalletAddress } = piContext;
  const [showPiAuthModal, setShowPiAuthModal] = useState(false);

  // Enforce Pi Auth on dashboard load (with dev mode bypass)
  useEffect(() => {
    const devModeActive = isDevModeEnabled();
    
    if (devModeActive) {
      // Dev mode: Mock authentication
      console.log('🛠️ Dev mode active - bypassing Pi auth requirement');
      setShowPiAuthModal(false);
    } else if (!isAuthenticated || !piUser) {
      // Production: Require Pi auth
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

  // Save Christmas theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('droplink-christmas-theme', JSON.stringify(enableChristmasTheme));
  }, [enableChristmasTheme]);
  
  const subscription = useActiveSubscription();
  const { plan, expiresAt, loading: subscriptionLoading } = subscription;
  const [showRenewModal, setShowRenewModal] = useState(false);

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
  
  const { preferences, updateNestedPreference } = useUserPreferences();
  
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(!preferences.dashboard_layout.sidebarCollapsed);
  const [showQRCode, setShowQRCode] = useState(false);
  const [piWalletQrData, setPiWalletQrData] = useState<string>("");
  const [showPiWalletQR, setShowPiWalletQR] = useState(false);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const [displayUsername, setDisplayUsername] = useState<string | null>(null);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

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
      backgroundType: "color",
      backgroundGif: "",
      backgroundVideo: "",
      iconStyle: "rounded",
      buttonStyle: "filled",
    },
    products: [],
    paymentLinks: [],
    hasPremium: false,
    showShareButton: true,
    piWalletAddress: "",
    piDonationMessage: "Send me a coffee ☕",
  });

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
            has_premium: data.hasPremium || false,
            updated_at: new Date().toISOString(),
            username: data.username
          }, { onConflict: 'id' });

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

  // Update auto-save data when profile changes (debounced)
  useEffect(() => {
    if (profileId && !loading) {
      console.log('📤 Profile changed, triggering auto-save in 3s...');
      autoSave.updateData(profile);
    }
  }, [profile, profileId, loading, autoSave]);

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
  }, [isAuthenticated, piUser, subscriptionLoading, hasCheckedSubscription, navigate]);

  const checkAuthAndLoadProfile = async () => {
    try {
      // Check Pi authentication OR Supabase session (for Gmail/email users)
      if (piLoading) {
        return; // Still loading
      }
      
      // Check for Supabase session (Gmail/email users)
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUser = session?.user;
      
      // Determine user identifier
      let userIdentifier: string | null = null;
      let isPiUser = false;
      let isNewUser = false;
      
      if (isAuthenticated && piUser) {
        // Pi Network user
        userIdentifier = piUser.username;
        isPiUser = true;
        setDisplayUsername(piUser.username);
        console.log("Loading profile for Pi user:", piUser.username);
      } else if (supabaseUser) {
        // Gmail/Email user
        userIdentifier = supabaseUser.email?.split("@")[0] || supabaseUser.id.slice(0, 8);
        isPiUser = false;
        setDisplayUsername(supabaseUser.email?.split("@")[0] || null);
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

        const socialLinks = profileData.social_links as any;
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
                pi_wallet_address: profileData.pi_wallet_address || '',
                pi_donation_message: profileData.pi_donation_message || 'Send me a coffee ☕',
                crypto_wallets: {},
                bank_details: {}
              };
            }
          } else {
            // No session or Pi token - load from profiles table directly
            // Note: Financial data is stored in profiles table (pi_wallet_address, bank_details, crypto_wallets)
            financialData = {
              pi_wallet_address: profileData.pi_wallet_address,
              pi_donation_message: profileData.pi_donation_message || "Send me a coffee ☕",
              crypto_wallets: profileData.crypto_wallets || {},
              bank_details: profileData.bank_details || {},
            };
          }
        } catch (error) {
          console.error("Error loading financial data:", error);
        }
        
        const cryptoWallets = financialData.crypto_wallets as any;
        const bankDetails = financialData.bank_details as any;
        
        const displayName = isPiUser && piUser ? piUser.username : (supabaseUser?.email?.split("@")[0] || "user");
        
        const loadedProfile = {
          id: profileData.id || "",
          username: profileData.username || displayName,
          logo: profileData.logo || "",
          businessName: profileData.business_name || displayName,
          storeUrl: `@${profileData.username || displayName}`,
          description: profileData.description || "",
          email: (profileData as any).email || supabaseUser?.email || "",
          youtubeVideoUrl: (profileData as any).youtube_video_url || "",
          backgroundMusicUrl: (profileData as any).background_music_url || "",
          socialLinks: Array.isArray(socialLinks) ? socialLinks : [
            { type: "twitter", url: "" },
            { type: "instagram", url: "" },
            { type: "youtube", url: "" },
            { type: "tiktok", url: "" },
            { type: "facebook", url: "" },
            { type: "linkedin", url: "" },
            { type: "twitch", url: "" },
            { type: "website", url: "" },
          ],
          customLinks: (themeSettings?.customLinks as any) || [],
          theme: {
            primaryColor: themeSettings?.primaryColor || "#38bdf8",
            backgroundColor: themeSettings?.backgroundColor || "#000000",
            backgroundType: (themeSettings?.backgroundType as 'color' | 'gif') || "color",
            backgroundGif: themeSettings?.backgroundGif || "",
            iconStyle: themeSettings?.iconStyle || "rounded",
            buttonStyle: themeSettings?.buttonStyle || "filled",
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
              }, { onConflict: 'username' })
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
    setProfile({
      ...profile,
      socialLinks: profile.socialLinks.map(link =>
        link.type === platform ? { ...link, url: value } : link
      ),
    });
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Show Pi Auth button if not authenticated, not loading, and no Supabase session
  if (!isAuthenticated && !piLoading && !hasSupabaseSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow border mx-auto">
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

  return (
    <div
      className={`min-h-screen ${enableChristmasTheme ? 'bg-gradient-to-b from-red-600 via-sky-400 to-green-600' : 'bg-sky-100'}`}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Festive snowflakes background - only show if Christmas theme enabled */}
      {enableChristmasTheme && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-10 left-10 text-4xl animate-pulse">❄️</div>
          <div className="absolute top-20 right-20 text-5xl animate-bounce">🎄</div>
          <div className="absolute bottom-20 left-20 text-4xl animate-pulse">❄️</div>
          <div className="absolute bottom-10 right-10 text-5xl animate-bounce">🎄</div>
          <div className="absolute top-1/3 left-1/4 text-3xl opacity-60">⛄</div>
          <div className="absolute top-2/3 right-1/4 text-3xl opacity-60">⛄</div>
        </div>
      )}
      {/* Material You Glow Effect */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(circle at 60% 20%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)",
          filter: "blur(32px)",
        }}
      />
      {/* Greeting Section */}
      <div className="px-2 sm:px-4 lg:px-6 pt-2 sm:pt-3 lg:pt-4 pb-1 sm:pb-2 relative z-10">
        {greeting && displayUsername && (
          <h2
            className={`text-xl font-semibold mb-2 animate-fade-in ${
              enableChristmasTheme ? 'text-white drop-shadow' : 'text-sky-700'
            }`}
          >
            {greeting}, {displayUsername}!
          </h2>
        )}
        {greeting && !displayUsername && (
          <h2
            className={`text-xl font-semibold mb-2 animate-fade-in ${
              enableChristmasTheme ? 'text-white drop-shadow' : 'text-sky-700'
            }`}
          >
            {greeting}!
          </h2>
        )}
      </div>
      <header className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 shadow-sm border-b border-border relative z-10 ${isMobile ? 'bg-background' : 'glass-surface'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <h1 className="text-lg sm:text-xl font-semibold text-sky-500 animate-pulse">DropLink</h1>
            {displayUsername && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[80px] sm:max-w-none">@{displayUsername}</span>
                {isAuthenticated && (
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-sky-100 text-sky-700 text-xs rounded-full font-medium whitespace-nowrap">
                    π Auth
                  </span>
                )}
              </div>
            )}
            {!isAuthenticated && piLoading && (
              <span className="text-xs text-orange-600 animate-pulse">Connecting Pi...</span>
            )}
            {!isAuthenticated && !piLoading && (
              <span className="text-xs text-gray-500 hidden sm:inline">Pi Network Ready</span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                        {/* Inbox Button (Desktop) */}
                        <Button
                          type="button"
                          onClick={() => navigate("/inbox")}
                          size="sm"
                          className="hidden md:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none"
                        >
                          <Mail className="w-4 h-4" />
                          Inbox
                        </Button>
            {isMobile && (
              <Button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                size="sm"
                className="h-9 w-9 mr-0.5 sm:mr-1 bg-sky-400 text-white hover:bg-sky-500 border-none p-0"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
            {/* Christmas Theme Toggle Button */}
            <Button
              type="button"
              onClick={() => setEnableChristmasTheme(!enableChristmasTheme)}
              size="sm"
              variant="outline"
              title={enableChristmasTheme ? "Switch to Standard Mode" : "Switch to Christmas Mode"}
              className={`h-9 w-9 sm:w-auto px-0 sm:px-3 border-none ${enableChristmasTheme ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}`}
            >
              <span className="text-lg">{enableChristmasTheme ? '🎄' : '❄️'}</span>
              <span className="hidden sm:inline ml-1.5 text-xs sm:text-sm font-medium">
                {enableChristmasTheme ? 'Christmas' : 'Standard'}
              </span>
            </Button>
            {/* Add Plan button to header for both mobile and desktop */}
            <Button
              type="button"
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              className="ml-0.5 sm:ml-1 border-sky-400 text-sky-600 hover:bg-sky-50 h-9 sm:h-10 w-9 sm:w-auto px-0 sm:px-3"
              onClick={() => setShowPlanModal(true)}
            >
              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline ml-1.5 text-xs sm:text-sm">My Plan</span>
            </Button>
            {isMobile ? (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button size="sm" className="h-9 w-9 sm:h-10 sm:w-auto sm:px-3 bg-sky-400 text-white hover:bg-sky-500 border-none ml-0.5 sm:ml-1 p-0 sm:p-auto">
                    <Menu className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1.5 text-xs sm:text-sm">Menu</span>
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-background border-t border-border">
                  <DrawerHeader>
                    <DrawerTitle className="text-lg font-semibold">DropLink Menu</DrawerTitle>
                    <DrawerDescription>Quick actions and settings</DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                                        {/* Plan Button in Drawer */}
                  <div className="space-y-2">
                                          <Button
                                            type="button"
                                            onClick={() => { setShowPlanModal(true); }}
                                            size="sm"
                                            className="w-full justify-center gap-2 h-10 sm:h-12 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300 border text-xs sm:text-sm"
                                          >
                                            <Crown className="w-4 h-4" />
                                            <span>My Plan / Renew</span>
                                          </Button>
                                        </div>
                    {/* User Info Section */}
                    <div className="space-y-2">
                      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-sky-900">
                              {displayUsername ? `@${displayUsername}` : 'Welcome'}
                            </p>
                            <div className="flex items-center gap-2">
                              {isAuthenticated ? (
                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                  Pi Connected
                                </span>
                              ) : piLoading ? (
                                <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium animate-pulse">
                                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
                                  Connecting...
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1.5"></span>
                                  Pi Ready
                                </span>
                              )}
                              {hasSupabaseSession && (
                                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                  Email Auth
                                </span>
                              )}
                            </div>
                          </div>
                          {isAuthenticated && (
                            <div className="text-sky-600">
                              <Wallet className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Profile & Share Section */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground px-2">Profile & Share</h3>
                      <div className="grid grid-cols-2 gap-2">
                                                <Button type="button" onClick={() => navigate("/inbox")}
                                                  size="sm"
                                                  className="inline-flex justify-center gap-1 h-10 sm:h-12 bg-sky-400 text-white hover:bg-sky-500 border-none text-xs sm:text-sm">
                                                  <Mail className="w-4 h-4" />
                                                  <span>Inbox</span>
                                                </Button>
                        <Button type="button" onClick={handleShowQRCode} size="sm" className="inline-flex justify-center gap-1 h-10 sm:h-12 bg-sky-400 text-white hover:bg-sky-500 border-none text-xs sm:text-sm">
                          <QrCode className="w-4 h-4" />
                          <span>QR Code</span>
                        </Button>
                        <Button type="button" onClick={handleCopyLink} size="sm" className="inline-flex justify-center gap-1 h-10 sm:h-12 bg-sky-400 text-white hover:bg-sky-500 border-none text-xs sm:text-sm">
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </Button>
                      </div>
                    </div>

                    {/* Navigation Section */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground px-2">Navigation</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" onClick={() => navigate("/followers")} size="sm" className="inline-flex justify-center gap-1 h-10 sm:h-12 bg-sky-400 text-white hover:bg-sky-500 border-none text-xs sm:text-sm">
                          <Users className="w-4 h-4" />
                          <span className="hidden sm:inline">Followers</span>
                        </Button>
                        <Button type="button" onClick={() => navigate("/wallet")} size="sm" className="inline-flex justify-center gap-1 h-10 sm:h-12 bg-sky-400 text-white hover:bg-sky-500 border-none text-xs sm:text-sm">
                          <Wallet className="w-4 h-4" />
                          <span className="hidden sm:inline">Wallet</span>
                        </Button>
                        <Button type="button" onClick={() => navigate("/profile")} size="sm" className="inline-flex justify-center gap-1 h-10 sm:h-12 bg-sky-400 text-white hover:bg-sky-500 border-none text-xs sm:text-sm">
                          <User className="w-4 h-4" />
                          <span className="hidden sm:inline">Profile</span>
                        </Button>
                        <Button type="button" onClick={() => navigate("/domain")} size="sm" className="inline-flex justify-center gap-1 h-10 sm:h-12 bg-sky-400 text-white hover:bg-sky-500 border-none text-xs sm:text-sm">
                          <Globe className="w-4 h-4" />
                          <span className="hidden sm:inline">Domain</span>
                        </Button>
                        <Button type="button" onClick={() => navigate("/search-users")} size="sm" className="inline-flex justify-center gap-1 h-10 sm:h-12 bg-blue-600 text-white hover:bg-blue-700 border-none text-xs sm:text-sm">
                          <Users className="w-4 h-4" />
                          <span className="hidden sm:inline">User Search</span>
                        </Button>
                      </div>
                    </div>

                    {/* Settings Section */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground px-2">Settings</h3>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          onClick={() => setShowPreview(!showPreview)}
                          size="sm"
                          className="w-full justify-center gap-2 h-10 sm:h-12 bg-sky-400 text-white hover:bg-sky-500 border-none text-xs sm:text-sm"
                        >
                          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </Button>
                      </div>
                    </div>

                    {/* Pi Network Section */}
                    {hasSupabaseSession && !isAuthenticated && (
                      <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground px-2">Pi Network</h3>
                        <Button 
                          type="button"
                          onClick={() => navigate("/auth")} 
                          size="sm"
                          className="w-full justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none"
                        >
                          <Wallet className="w-4 h-4" />
                          Connect Pi Network
                        </Button>
                      </div>
                    )}

                    {/* Support & Help Section */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground px-2">Support & Help</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" onClick={() => navigate("/ai-support")} size="sm" className="inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                          <Bot className="w-4 h-4" />
                          AI Support
                        </Button>
                        <Button
                          onClick={() => setShowAboutModal(true)}
                          size="sm"
                          className="justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none"
                        >
                          <Info className="w-4 h-4" />
                          About
                        </Button>
                      </div>
                    </div>

                    {/* Subscription Section */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground px-2">Subscription</h3>
                      <Button onClick={() => navigate("/subscription")} size="sm" className="w-full inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                        <Crown className="w-4 h-4" />
                        Upgrade Plan
                      </Button>
                    </div>

                    {/* Account Section */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Button type="button" onClick={handleLogout} size="sm" className="w-full inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            ) : (
              <>
                <Button type="button" onClick={handleShowQRCode} size="sm" className="hidden sm:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </Button>
                <Button type="button" onClick={handleCopyLink} size="sm" className="hidden sm:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button 
                  type="button"
                  onClick={() => navigate("/followers")} 
                  size="sm" 
                  className="hidden md:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  <Users className="w-4 h-4" />
                  Followers
                </Button>
                <Button 
                  type="button"
                  onClick={() => navigate("/wallet")} 
                  size="sm" 
                  className="hidden md:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  <Wallet className="w-4 h-4" />
                  Wallet
                </Button>
                <Button 
                  type="button"
                  onClick={() => navigate("/subscription")} 
                  size="sm" 
                  className="hidden md:inline-flex bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  Upgrade
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowAboutModal(true)}
                  size="sm"
                  className="hidden lg:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  <Info className="w-4 h-4" />
                  About
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)} 
                  size="sm"
                  className="lg:hidden inline-flex bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button type="button" onClick={handleLogout} size="sm" className="inline-flex items-center justify-center gap-2 bg-sky-400 h-9 rounded-md px-3 text-white hover:text-red-500 hover:bg-sky-500">
                  <LogOut className="w-4 h-4" />
                </Button>
                
                {/* Pi Auth Button for Email Users */}
                {hasSupabaseSession && !isAuthenticated && (
                  <Button 
                    type="button"
                    onClick={() => navigate("/auth")} 
                    size="sm"
                    className="gap-2 inline-flex bg-sky-400 text-white hover:bg-sky-500 border-none"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Pi
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Editor Panel */}
        <div className={`flex-1 overflow-y-auto p-2 sm:p-4 lg:p-8 ${isMobile ? 'bg-background' : 'glass-card'} m-1 sm:m-2 rounded-lg sm:rounded-xl ${showPreview ? 'hidden lg:block' : 'block'}`} style={{ position: 'relative', minHeight: 0 }}>
          <div className="max-w-2xl mx-auto">
            <Tabs 
              defaultValue={preferences.dashboard_layout.activeTab}
              className="w-full"
              onValueChange={(value) => {
                // All menu/tabs should work regardless of profile state
                // Refresh payment links when payments tab is accessed
                if (value === 'payments' && piUser?.uid) {
                  const paymentLinks = loadPaymentLinks();
                  setProfile(prev => ({
                    ...prev,
                    paymentLinks
                  }));
                }
              }}
            >
              <TabsList className="flex flex-wrap gap-1 sm:gap-2 w-full bg-muted p-1.5 sm:p-2 rounded-lg mb-4 sm:mb-6 min-h-fit overflow-x-auto">
                <TabsTrigger value="profile" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="design" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <Palette className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Design</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                {/* <TabsTrigger value="features" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Features</span>
                </TabsTrigger> */}
                <TabsTrigger value="drop-tokens" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <Droplets className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">DROP</span>
                </TabsTrigger>
                <TabsTrigger value="ad-network" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Ads</span>
                </TabsTrigger>
                {/* <TabsTrigger value="payments" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Pay</span>
                </TabsTrigger> */}
                <TabsTrigger value="subscription" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Sub</span>
                </TabsTrigger>
                {/* <TabsTrigger value="voting" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Vote</span>
                </TabsTrigger> */}
                <TabsTrigger value="merchant" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <Store className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Merchant</span>
                </TabsTrigger>
                <TabsTrigger value="preferences" className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
                              {/* Merchant Tab */}
                              <TabsContent value="merchant" className="pb-6 sm:pb-8">
                                <div className="max-w-lg mx-auto mt-12 sm:mt-20 p-4 sm:p-8 bg-white rounded-lg sm:rounded-xl shadow border text-center">
                                  <Store className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-sky-500 mb-4" />
                                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dropstore: The Future Digital Marketplace</h2>
                                  <p className="text-base sm:text-lg text-gray-700 mb-2">
                                    Dropstore empowers anyone to launch a digital storefront, accept Pi payments, and reach a global audience. Sell digital products, services, and experiences with ease. Join the future of decentralized commerce!
                                  </p>
                                  <a href="https://www.dropshops.space/" target="_blank" rel="noopener noreferrer">
                                    <button className="mt-4 px-6 py-2 bg-sky-500 text-white rounded-lg font-semibold shadow hover:bg-sky-600 transition">
                                      Start Selling on Dropstore
                                    </button>
                                  </a>
                                  <div className="mt-6 text-sm text-gray-500">
                                    <strong>Coming soon:</strong> Advanced storefronts, marketplace discovery, Pi Network integration, smart contracts, analytics, and more!
                                  </div>
                                </div>
                              </TabsContent>
                               {/* Pi Data tab removed for production */}
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6 sm:space-y-8">
                {/* Pi Ad Banner for free users */}
                <PiAdBanner />
                
                <div>
                  <h2 className="text-lg font-semibold mb-4 sm:mb-6">Business details</h2>
              

              {/* Logo Upload, AI Logo, and Random Avatar Generator */}
              <div className="mb-6 flex flex-col gap-4">
                <div>
                  <Label className="mb-3 block text-sm">Business logo</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
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
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <div className="flex gap-2 flex-col sm:flex-row">
                        <label htmlFor="logo-upload">
                          <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
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
                            className="w-full sm:w-auto"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      {/* AI Logo Generation */}
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 flex-col sm:flex-row">
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
                            className="w-full sm:w-auto"
                          >
                            {aiLogoLoading ? "Generating..." : "AI"}
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">Generate a logo using AI</div>
                      </div>
                      {/* Logo Style Selector */}
                      <div className="flex gap-2 items-center flex-wrap">
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
                          className="border rounded px-2 py-1 text-xs flex-1 sm:flex-initial"
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
                  <Label className="mb-2 block text-sm">Or generate a random avatar</Label>
                  <RandomAvatarGenerator onAvatarGenerated={(url) => setProfile(prev => ({ ...prev, logo: url }))} />
                </div>
              </div>


              {/* Business Name */}
              <div className="mb-6">
                <Label htmlFor="business-name" className="mb-2 sm:mb-3 block text-sm">Business name</Label>
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
                <Label htmlFor="email" className="mb-2 sm:mb-3 block text-sm">Email</Label>
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
                <Label htmlFor="store-url" className="mb-2 sm:mb-3 block text-sm">Store URL (Username)</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
                  <span className="text-muted-foreground text-xs sm:text-sm hidden sm:inline whitespace-nowrap">{window.location.origin}/</span>
                  <div className="flex items-center gap-2 w-full sm:flex-1">
                    <span className="text-muted-foreground text-xs sm:hidden">{window.location.origin}/</span>
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
                <Label htmlFor="description" className="mb-2 sm:mb-3 block text-sm">Business description</Label>
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

              {/* User Category - UNCOMMENT AFTER RUNNING add-followers-and-views.sql */}
              {/* <div className="mb-6">
                <Label htmlFor="category" className="mb-2 sm:mb-3 block text-sm">Profile Category</Label>
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
                          .update({ category: newCategory })
                          .eq('id', profileId);
                        
                        if (error) {
                          toast.error('Failed to update category');
                        } else {
                          toast.success('Category updated!');
                        }
                      } catch (error) {
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
              </div> */}

              {/* YouTube Video URL - Premium/Pro only */}
              <PlanGate minPlan="premium" featureName="YouTube Video">
                <div className="mb-6">
                  <Label htmlFor="youtube-video" className="mb-2 sm:mb-3 block text-sm">YouTube Video</Label>
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
              <div className="mb-6">
                <Label htmlFor="background-music" className="mb-2 sm:mb-3 block flex items-center gap-2 text-sm">
                  <Music className="w-4 h-4" />
                  Background Music
                </Label>
                <Input
                  id="background-music"
                  value={profile.backgroundMusicUrl || ""}
                  onChange={(e) => setProfile({ ...profile, backgroundMusicUrl: e.target.value })}
                  placeholder="https://example.com/music.mp3"
                  className="bg-input-bg text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Add a background music URL (MP3, OGG, WAV) that will play on your public bio page. The audio will loop continuously and visitors can control the volume.
                </p>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                <h2 className="text-lg font-semibold">Social links</h2>
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
                            setProfile({ ...profile, socialLinks: newLinks });
                          }}
                          placeholder="Enter URL"
                          className="bg-input-bg flex-1 text-sm"
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
                    <h2 className="text-lg font-semibold flex items-center gap-2">
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
                  <h2 className="text-lg font-semibold">Custom Links</h2>
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
              <h2 className="text-lg font-semibold mb-3 sm:mb-6">Public Profile Settings</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-card border border-border rounded-lg gap-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="share-button" className="text-sm sm:text-base font-medium">
                    Show Share Button
                  </Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
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
                <h2 className="text-lg font-semibold mb-4 sm:mb-6">Theme Customization</h2>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="primary-color" className="mb-2 sm:mb-3 block text-sm">Primary Color</Label>
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
                  <Label htmlFor="background-color" className="mb-2 sm:mb-3 block text-sm">Background Color</Label>
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
                  <Label htmlFor="text-color" className="mb-2 sm:mb-3 block text-sm">Text Color</Label>
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
                  <Label htmlFor="icon-style" className="mb-2 sm:mb-3 block text-sm">Icon Style</Label>
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
                <h2 className="text-lg font-semibold mb-4 sm:mb-6">Digital Products</h2>
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
                <Card className="border-0 rounded-none shadow-none sticky bottom-0 z-[100] w-full p-0 m-0" style={{ boxShadow: '0 4px 24px 0 #0002', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)' }}>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-t border-border w-full p-2 sm:p-3 m-0" style={{ background: 'transparent' }}>
                    <Button
                      className="flex-1 h-11 sm:h-12 rounded-lg bg-white text-sky-400 font-medium border border-sky-200 hover:bg-sky-50"
                      onClick={() => {
                        toast.info('No changes were saved.');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      className="flex-1 h-11 sm:h-12 bg-sky-400 hover:bg-sky-500 text-white font-medium rounded-lg border-none shadow-md"
                      style={{ transition: 'box-shadow 0.2s', boxShadow: '0 2px 8px #0284c71a' }}
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
                      <div className={`flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 sm:pt-6 pb-6 sm:pb-8 border-t border-border sticky bottom-0 z-[100] w-full bg-background/95 backdrop-blur-sm shadow-lg rounded-lg`} style={{ boxShadow: '0 4px 24px 0 #0002', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)' }}>
                        <Button variant="outline" className="flex-1 h-11 sm:h-12 rounded-lg">
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSave} 
                          className="flex-1 h-11 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md rounded-lg" 
                          style={{ transition: 'box-shadow 0.2s', boxShadow: '0 2px 8px #0284c71a' }}
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

              <TabsContent value="drop-tokens" className="pb-8">
                <PlanGate minPlan="basic" featureName="Pi Wallet for Tips">
                  <DropTokenManager piUser={piUser} piWallet={piUser?.wallet_address} />
                </PlanGate>
              </TabsContent>

              <TabsContent value="ad-network" className="pb-8">
                <PiAdNetwork />
              </TabsContent>

              <TabsContent value="payments" className="pb-8">
                <PiPayments />
              </TabsContent>


              {/* Subscription Tab */}
              <TabsContent value="subscription" className="pb-8">
                <Button variant="outline" onClick={() => setShowPlanModal(true)}>
                  View My Plan / Renew
                </Button>
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
                  <DialogFooter>
                    <Button onClick={() => setShowPlanModal(false)} variant="secondary">Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>


              {/* <TabsContent value="voting" className="pb-8">
                <VotingSystem />
              </TabsContent> */}

              {/* User Preferences Tab */}
              <TabsContent value="preferences" className="pb-8">
                <UserPreferencesManager />
              </TabsContent>

              {/* Pi Data content removed for production */}
            </Tabs>
          </div>
        </div>

        {/* Preview Panel */}
        <div
          className={`w-full lg:w-[380px] xl:w-[420px] 2xl:w-[480px] ${isMobile ? 'bg-background border-t' : 'glass-surface border-l'} border-border/30 flex flex-col items-center justify-center overflow-hidden ${showPreview ? 'flex' : 'hidden lg:flex'}`}
          style={{ minHeight: 0 }}
        >
          <div className="mb-2 sm:mb-3 md:mb-4 flex items-center justify-between w-full max-w-full px-3 sm:px-4 md:px-6 py-2">
            <h3 className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground">Live Preview</h3>
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="text-xs sm:text-sm h-8 sm:h-9">
              Copy link
            </Button>
          </div>
          <div className="w-full px-3 sm:px-4 md:px-6 mb-3">
            <Button 
              onClick={() => navigate('/search-users')} 
              className="w-full bg-sky-500 hover:bg-sky-600 text-white"
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Search Droplink Profiles
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center w-full overflow-hidden px-2 sm:px-3 md:px-4 py-2 sm:py-3">
            <PhonePreview profile={profile} />
          </div>
        </div>
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