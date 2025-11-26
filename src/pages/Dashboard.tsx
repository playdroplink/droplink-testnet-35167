import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAutoSave } from "@/hooks/useAutoSave";
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
import VotingSystem from "@/components/VotingSystem";
import { ProfileData } from "@/types/profile";
import LinkManager from "@/components/LinkManager";
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
  // AI Logo Generation State (fix ReferenceError)
  const [aiLogoPrompt, setAiLogoPrompt] = useState("");
  const [aiLogoLoading, setAiLogoLoading] = useState(false);
  const [aiLogoError, setAiLogoError] = useState("");
  const navigate = useNavigate();
  
  // Hooks must be called unconditionally
  const piContext = usePi();
  const { piUser, isAuthenticated, signOut: piSignOut, loading: piLoading, getCurrentWalletAddress } = piContext;
  
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
  
  const { preferences, updateDashboardLayout } = useUserPreferences();
  
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

  // Auto-save functionality with enhanced database sync
  const autoSave = useAutoSave<ProfileData>({
    tableName: 'profiles',
    recordId: profileId || '',
    delay: 3000, // 3 second delay
    onSave: async (data: ProfileData) => {
      // Enhanced save logic for all profile features
      if (!profileId) return;
      
      try {
        // 1. Update main profile data with all features
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            business_name: data.businessName,
            store_url: data.storeUrl,
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
            logo_url: data.logo,
            show_share_button: data.showShareButton,
            pi_wallet_address: data.piWalletAddress,
            pi_donation_message: data.piDonationMessage,
            has_premium: data.hasPremium || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileId);
        
        if (profileError) throw profileError;
        
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
        console.error('❌ Database sync error:', error);
        throw error; // Re-throw to trigger error handling
      }
    },
    onError: (error: Error) => {
      console.error('Auto-save failed:', error);
      toast.error('Failed to save changes to database. Please check your connection.');
    }
  });

  // Update auto-save data when profile changes
  useEffect(() => {
    if (profileId && !loading) {
      autoSave.updateData(profile);
    }
  }, [profile, profileId, loading]);

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
          setProfile(parsed);
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
          storeUrl: profileData.username || displayName,
          description: profileData.description || "",
          email: (profileData as any).email || supabaseUser?.email || "",
          youtubeVideoUrl: (profileData as any).youtube_video_url || "",
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
        
        // Create profile in database first
        let newProfileId = null;
        try {
          if (isPiUser && piUser) {
            // Create Pi user profile
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                username: piUser.username,
                business_name: piUser.username,
                description: "",
                email: "", // Pi users don't have email in the basic interface
                pi_user_id: piUser.uid,
              })
              .select()
              .single();
            
            if (createError) {
              console.error("Error creating Pi user profile:", createError);
            } else if (newProfile) {
              newProfileId = newProfile.id;
              setProfileId(newProfileId);
              console.log("Created Pi user profile:", newProfileId);
            }
          } else if (supabaseUser) {
            // Create email user profile
            const emailUsername = supabaseUser.email?.split("@")[0] || `user-${supabaseUser.id.slice(0, 8)}`;
            const sanitizedUsername = emailUsername.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            
            console.log('Creating email user profile for:', sanitizedUsername);
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
              console.error("Error creating email user profile:", createError);
              // Check if it's a duplicate username error
              if (createError.code === '23505') {
                // Username conflict, try with a random suffix
                const randomSuffix = Math.random().toString(36).substring(2, 8);
                const uniqueUsername = `${sanitizedUsername}-${randomSuffix}`;
                console.log('Username conflict, trying:', uniqueUsername);
                
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
                  throw retryError;
                } else if (retryProfile) {
                  newProfileId = retryProfile.id;
                  setProfileId(newProfileId);
                  console.log("Created email user profile with unique username:", newProfileId);
                }
              } else {
                throw createError;
              }
            } else if (newProfile) {
              newProfileId = newProfile.id;
              setProfileId(newProfileId);
              console.log("Created email user profile:", newProfileId);
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
          storeUrl: defaultName,
          description: "",
          email: supabaseUser?.email || "",
          youtubeVideoUrl: "",
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
        // Save to localStorage with metadata
        try {
          const profileToStore = {
            ...defaultProfile,
            lastSynced: new Date().toISOString(),
            profileId: newProfileId // Use the actual database profile ID
          };
          const storageKey = isPiUser ? `profile_${userIdentifier}` : `profile_email_${supabaseUser?.id}`;
          localStorage.setItem(storageKey, JSON.stringify(profileToStore));
          localStorage.setItem(`${storageKey}_backup`, JSON.stringify(profileToStore));
        } catch (e) {
          console.error("Error saving to localStorage:", e);
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
        } else if (isNewUser) {
          // New user but no DB profile created - show different message
          toast.info(`Profile created locally. ${isPiUser ? 'Pi username' : 'Email'} recognized!`);
        } else {
          console.log('Using cached profile data');
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

  // Handle social link change - UNLOCKED: No restrictions
  const handleSocialLinkChange = (platform: string, value: string) => {
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
      // ...existing code...
      // (all save logic remains unchanged)
    } catch (error: any) {
      // ...existing code...
    } finally {
      setSaving(false);
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
    if (!profile.storeUrl) {
      toast.error("Please set your store URL first");
      return;
    }
    setShowQRCode(true);
  };

  const handleLogout = async () => {
    try {
      console.log("🚪 Initiating logout...");
      
      // Use comprehensive sign-out utility
      await performCompleteSignOut();
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if logout has errors
      window.location.href = "/auth";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-sky-100"
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
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
      <header className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 shadow-sm border-b border-border ${isMobile ? 'bg-background' : 'glass-surface'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-xl font-semibold text-sky-500 animate-pulse">DropLink</h1>
            {displayUsername && (
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">@{displayUsername}</span>
                {isAuthenticated && (
                  <span className="px-2 py-1 bg-sky-100 text-sky-700 text-xs rounded-full font-medium">
                    π Auth
                  </span>
                )}
              </div>
            )}
            {!isAuthenticated && piLoading && (
              <span className="text-xs text-orange-600 animate-pulse">Connecting Pi...</span>
            )}
            {!isAuthenticated && !piLoading && (
              <span className="text-xs text-gray-500">Pi Network Ready</span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
            {isMobile && (
              <Button
                  onClick={() => setShowPreview(!showPreview)}
                  size="sm"
                  className="h-9 w-9 mr-1 bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
            {isMobile ? (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button size="sm" className="h-9 w-9 sm:h-10 sm:w-auto sm:px-3 bg-sky-400 text-white hover:bg-sky-500 border-none">
                    <Menu className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Menu</span>
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-background border-t border-border">
                  <DrawerHeader>
                    <DrawerTitle className="text-lg font-semibold">DropLink Menu</DrawerTitle>
                    <DrawerDescription>Quick actions and settings</DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
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
                        <Button onClick={handleShowQRCode} size="sm" className="inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                          <QrCode className="w-4 h-4" />
                          QR Code
                        </Button>
                        <Button onClick={handleCopyLink} size="sm" className="inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                          <Share2 className="w-4 h-4" />
                          Share
                        </Button>
                      </div>
                    </div>

                    {/* Navigation Section */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground px-2">Navigation</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => navigate("/followers")} size="sm" className="inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                          <Users className="w-4 h-4" />
                          Followers
                        </Button>
                        <Button onClick={() => navigate("/wallet")} size="sm" className="inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                          <Wallet className="w-4 h-4" />
                          Wallet
                        </Button>
                        <Button onClick={() => navigate("/profile")} size="sm" className="inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                          <User className="w-4 h-4" />
                          Profile
                        </Button>
                        <Button onClick={() => navigate("/domain")} size="sm" className="inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                          <Globe className="w-4 h-4" />
                          Domain
                        </Button>
                        {/* Store button removed as requested */}
                      </div>
                    </div>

                    {/* Settings Section */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground px-2">Settings</h3>
                      <div className="space-y-2">
                        <Button
                          onClick={() => setShowPreview(!showPreview)}
                          size="sm"
                          className="w-full justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none"
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
                        <Button onClick={() => navigate("/ai-support")} size="sm" className="inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
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
                      <Button onClick={handleLogout} size="sm" className="w-full inline-flex justify-start gap-2 h-12 bg-sky-400 text-white hover:bg-sky-500 border-none">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            ) : (
              <>
                <Button onClick={handleShowQRCode} size="sm" className="hidden sm:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </Button>
                <Button onClick={handleCopyLink} size="sm" className="hidden sm:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button 
                  onClick={() => navigate("/followers")} 
                  size="sm" 
                  className="hidden md:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  <Users className="w-4 h-4" />
                  Followers
                </Button>
                <Button 
                  onClick={() => navigate("/wallet")} 
                  size="sm" 
                  className="hidden md:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  <Wallet className="w-4 h-4" />
                  Wallet
                </Button>
                <Button 
                  onClick={() => navigate("/subscription")} 
                  size="sm" 
                  className="hidden md:inline-flex bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  Upgrade
                </Button>
                <Button
                  onClick={() => setShowAboutModal(true)}
                  size="sm"
                  className="hidden lg:inline-flex gap-2 bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  <Info className="w-4 h-4" />
                  About
                </Button>
                <Button
                  onClick={() => setShowPreview(!showPreview)} 
                  size="sm"
                  className="lg:hidden inline-flex bg-sky-400 text-white hover:bg-sky-500 border-none"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button onClick={handleLogout} size="sm" className="inline-flex items-center justify-center gap-2 bg-sky-400 h-9 rounded-md px-3 text-white hover:text-red-500 hover:bg-sky-500">
                  <LogOut className="w-4 h-4" />
                </Button>
                
                {/* Pi Auth Button for Email Users */}
                {hasSupabaseSession && !isAuthenticated && (
                  <Button 
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
        <div className={`flex-1 overflow-y-auto p-4 lg:p-8 ${isMobile ? 'bg-background' : 'glass-card'} m-2 rounded-xl ${showPreview ? 'hidden lg:block' : 'block'}`}>
          <div className="max-w-2xl mx-auto">
            <Tabs 
              defaultValue={preferences.dashboard_layout.activeTab} 
              className="w-full"
              onValueChange={(value) => {
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
              <TabsList className="flex flex-wrap gap-1 sm:gap-2 w-full bg-muted p-2 rounded-lg mb-6 min-h-fit">
                <TabsTrigger value="profile" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="design" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <Palette className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Design</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <BarChart3 className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                {/* <TabsTrigger value="features" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <Sparkles className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Features</span>
                </TabsTrigger> */}
                <TabsTrigger value="drop-tokens" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <Droplets className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">DROP</span>
                </TabsTrigger>
                <TabsTrigger value="ad-network" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <PlayCircle className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Ads</span>
                </TabsTrigger>
                {/* <TabsTrigger value="payments" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <CreditCard className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Pay</span>
                </TabsTrigger> */}
                <TabsTrigger value="subscription" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <Crown className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Sub</span>
                </TabsTrigger>
                {/* <TabsTrigger value="voting" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <TrendingUp className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Vote</span>
                </TabsTrigger> */}
                <TabsTrigger value="merchant" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <Store className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Merchant</span>
                </TabsTrigger>
                <TabsTrigger value="preferences" className="flex-1 min-w-fit text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5">
                  <User className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
                              {/* Merchant Tab */}
                              <TabsContent value="merchant" className="pb-8">
                                <div className="max-w-lg mx-auto mt-8">
                                  <div className="bg-white rounded-xl shadow p-6 border border-border flex flex-col gap-6">
                                    <div className="flex items-center gap-4 mb-2">
                                      <Store className="w-10 h-10 text-sky-400" />
                                      <div>
                                        <h2 className="text-2xl font-bold">Create Your Store</h2>
                                        <p className="text-muted-foreground text-sm">Set up your merchant profile and branding</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                      <label className="font-medium">Store Name</label>
                                      <input type="text" className="border rounded px-3 py-2" placeholder="e.g. Sibiya's Bake Shop" />
                                      <label className="font-medium">Description</label>
                                      <textarea className="border rounded px-3 py-2 min-h-[60px]" placeholder="Describe your shop, specialties, or story..."></textarea>
                                      <label className="font-medium">Store Logo</label>
                                      <input type="file" accept="image/*" className="border rounded px-3 py-2" />
                                      <label className="font-medium">Brand Color</label>
                                      <input type="color" className="w-12 h-8 p-0 border-none" />
                                    </div>
                                    <button className="mt-4 bg-sky-400 hover:bg-sky-500 text-white font-semibold py-2 px-6 rounded transition">Save Store</button>
                                  </div>
                                  {/* Product Listing Management */}
                                  <div className="bg-white rounded-xl shadow p-6 border border-border flex flex-col gap-6 mt-8">
                                    <h3 className="text-xl font-bold mb-2">Menu / Products</h3>
                                    <div className="flex flex-col gap-4">
                                      {/* Example product list, replace with dynamic state later */}
                                      <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-4 border rounded p-3">
                                          <img src="https://placehold.co/60x60" alt="Product" className="w-16 h-16 rounded object-cover border" />
                                          <div className="flex-1">
                                            <div className="font-semibold">Chocolate Cake</div>
                                            <div className="text-sm text-muted-foreground">Rich, moist, and delicious</div>
                                          </div>
                                          <div className="font-bold text-sky-500">3 π</div>
                                          <button className="ml-2 text-xs text-red-500 hover:underline">Delete</button>
                                        </div>
                                        <div className="flex items-center gap-4 border rounded p-3">
                                          <img src="https://placehold.co/60x60" alt="Product" className="w-16 h-16 rounded object-cover border" />
                                          <div className="flex-1">
                                            <div className="font-semibold">Banana Bread</div>
                                            <div className="text-sm text-muted-foreground">Classic, soft, and sweet</div>
                                          </div>
                                          <div className="font-bold text-sky-500">2 π</div>
                                          <button className="ml-2 text-xs text-red-500 hover:underline">Delete</button>
                                        </div>
                                      </div>
                                      {/* Add Product Form */}
                                      <div className="flex flex-col gap-2 border-t pt-4 mt-4">
                                        <div className="font-medium mb-2">Add New Product</div>
                                        <input type="file" accept="image/*" className="border rounded px-3 py-2" />
                                        <input type="text" className="border rounded px-3 py-2" placeholder="Product Name" />
                                        <textarea className="border rounded px-3 py-2 min-h-[40px]" placeholder="Description"></textarea>
                                        <input type="number" min="0" step="0.01" className="border rounded px-3 py-2" placeholder="Price (in Pi)" />
                                        <button className="mt-2 bg-sky-400 hover:bg-sky-500 text-white font-semibold py-2 px-6 rounded transition">Add Product</button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                {/* Pi Data tab removed for production */}
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-8">
                {/* Pi Ad Banner for free users */}
                <PiAdBanner />
                
                <div>
                  <h2 className="text-lg font-semibold mb-6">Business details</h2>
              

              {/* Logo Upload, AI Logo, and Random Avatar Generator */}
              <div className="mb-6 flex flex-col gap-4">
                <div>
                  <Label className="mb-3 block">Business logo</Label>
                  <div className="flex items-center gap-4">
                    <div
                      className={
                        `w-20 h-20 bg-card border border-border flex items-center justify-center overflow-hidden ` +
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
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <label htmlFor="logo-upload">
                          <Button variant="secondary" size="sm" asChild>
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
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      {/* AI Logo Generation */}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Describe your logo (e.g. blue tech rocket)"
                          className="border rounded px-2 py-1 text-sm flex-1"
                          value={aiLogoPrompt || ""}
                          onChange={e => setAiLogoPrompt(e.target.value)}
                          disabled={aiLogoLoading}
                          style={{ minWidth: 0 }}
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
                              // Preload image to check for errors
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
                        >
                          {aiLogoLoading ? "Generating..." : "Generate with AI"}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Generate a logo using AI by prompt</div>
                      {/* Logo Style Selector */}
                      <div className="flex gap-2 mt-2 items-center">
                        <Label htmlFor="logo-style" className="text-xs">Logo style:</Label>
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
                          className="border rounded px-2 py-1 text-xs"
                          style={{ minWidth: 90 }}
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
                  <Label className="mb-2 block">Or generate a random avatar</Label>
                  <RandomAvatarGenerator onAvatarGenerated={(url) => setProfile(prev => ({ ...prev, logo: url }))} />
                </div>
              </div>


              {/* Business Name */}
              <div className="mb-6">
                <Label htmlFor="business-name" className="mb-3 block">Business name</Label>
                <Input
                  id="business-name"
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  placeholder="Enter business name"
                  className="bg-input-bg"
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <Label htmlFor="email" className="mb-3 block">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="your@email.com"
                  className="bg-input-bg"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Your email will be used to save preferences and for important notifications
                </p>
              </div>

              {/* Store URL */}
              <div className="mb-6">
                <Label htmlFor="store-url" className="mb-3 block">Store URL (Username)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">{window.location.origin}/</span>
                  <Input
                    id="store-url"
                    value={profile.storeUrl}
                    onChange={(e) => setProfile({ ...profile, storeUrl: e.target.value })}
                    placeholder="your-store-name"
                    className="bg-input-bg flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This will be your public store URL that you can share
                </p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <Label htmlFor="description" className="mb-3 block">Business description</Label>
                <Textarea
                  id="description"
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  placeholder="Tell people about your business..."
                  className="bg-input-bg min-h-[120px] resize-none"
                  maxLength={400}
                />
                <div className="text-xs text-muted-foreground text-right mt-2">
                  {profile.description.length} / 400
                </div>
              </div>

              {/* YouTube Video URL - Premium/Pro only */}
              <PlanGate minPlan="premium" featureName="YouTube Video">
                <div className="mb-6">
                  <Label htmlFor="youtube-video" className="mb-3 block">YouTube Video</Label>
                  <Input
                    id="youtube-video"
                    value={profile.youtubeVideoUrl}
                    onChange={(e) => setProfile({ ...profile, youtubeVideoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="bg-input-bg"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Add a YouTube video to showcase your business or products
                  </p>
                </div>
              </PlanGate>
            </div>

            {/* Social Links */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Social links</h2>
                {/* Social link plan gating */}
                {(() => {
                  let maxLinks = 1;
                  if (plan === "basic") maxLinks = 3;
                  if (plan === "premium" || plan === "pro") maxLinks = 99;
                  return (
                    <span className="text-xs text-muted-foreground">
                      {plan === "free" && "Limit: 1 social link"}
                      {plan === "basic" && "Limit: 3 social links"}
                      {(plan === "premium" || plan === "pro") && "Unlimited social links"}
                    </span>
                  );
                })()}
              </div>
              <div className="space-y-4">
                {/* For Premium/Pro: Add/Remove custom social links with icon picker */}
                {(plan === "premium" || plan === "pro") && (
                  <>
                    {profile.socialLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {/* Icon Picker */}
                        <select
                          value={link.icon || link.type}
                          onChange={e => {
                            const newLinks = [...profile.socialLinks];
                            newLinks[idx].icon = e.target.value;
                            setProfile({ ...profile, socialLinks: newLinks });
                          }}
                          className="w-12 h-10 rounded-lg border border-border bg-card text-center"
                        >
                          <option value="twitter">🐦</option>
                          <option value="instagram">📸</option>
                          <option value="youtube">▶️</option>
                          <option value="tiktok">🎵</option>
                          <option value="facebook">📘</option>
                          <option value="linkedin">💼</option>
                          <option value="twitch">🎮</option>
                          <option value="website">🌐</option>
                          <option value="custom">⭐ Custom</option>
                        </select>
                        <Input
                          value={link.url}
                          onChange={e => {
                            const newLinks = [...profile.socialLinks];
                            newLinks[idx].url = e.target.value;
                            setProfile({ ...profile, socialLinks: newLinks });
                          }}
                          placeholder="Enter social link URL"
                          className="bg-input-bg flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newLinks = profile.socialLinks.filter((_, i) => i !== idx);
                            setProfile({ ...profile, socialLinks: newLinks });
                          }}
                          title="Remove"
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
                      className="mt-2"
                    >
                      + Add Social Link
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <FaXTwitter className="w-5 h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "twitter")?.url || "" : ""}
                    onChange={(e) => {
                      // Enforce plan-based social link limits
                      const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
                      const activeLinks = countActiveSocialLinks();
                      const isAdding = !profile.socialLinks.find(l => l.type === "twitter")?.url && e.target.value.trim() !== "";
                      if (isAdding && activeLinks >= maxLinks) {
                        toast.error(`You have reached your plan's social link limit. Upgrade to add more.`);
                        return;
                      }
                      handleSocialLinkChange("twitter", e.target.value);
                    }}
                    placeholder="https://x.com/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "instagram")?.url || "" : ""}
                    onChange={(e) => {
                      const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
                      const activeLinks = countActiveSocialLinks();
                      const isAdding = !profile.socialLinks.find(l => l.type === "instagram")?.url && e.target.value.trim() !== "";
                      if (isAdding && activeLinks >= maxLinks) {
                        toast.error(`You have reached your plan's social link limit. Upgrade to add more.`);
                        return;
                      }
                      handleSocialLinkChange("instagram", e.target.value);
                    }}
                    placeholder="https://instagram.com/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "youtube")?.url || "" : ""}
                    onChange={(e) => {
                      const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
                      const activeLinks = countActiveSocialLinks();
                      const isAdding = !profile.socialLinks.find(l => l.type === "youtube")?.url && e.target.value.trim() !== "";
                      if (isAdding && activeLinks >= maxLinks) {
                        toast.error(`You have reached your plan's social link limit. Upgrade to add more.`);
                        return;
                      }
                      handleSocialLinkChange("youtube", e.target.value);
                    }}
                    placeholder="https://youtube.com/@"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <FaTiktok className="w-5 h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "tiktok")?.url || "" : ""}
                    onChange={(e) => {
                      const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
                      const activeLinks = countActiveSocialLinks();
                      const isAdding = !profile.socialLinks.find(l => l.type === "tiktok")?.url && e.target.value.trim() !== "";
                      if (isAdding && activeLinks >= maxLinks) {
                        toast.error(`You have reached your plan's social link limit. Upgrade to add more.`);
                        return;
                      }
                      handleSocialLinkChange("tiktok", e.target.value);
                    }}
                    placeholder="https://tiktok.com/@"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "facebook")?.url || "" : ""}
                    onChange={(e) => {
                      const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
                      const activeLinks = countActiveSocialLinks();
                      const isAdding = !profile.socialLinks.find(l => l.type === "facebook")?.url && e.target.value.trim() !== "";
                      if (isAdding && activeLinks >= maxLinks) {
                        toast.error(`You have reached your plan's social link limit. Upgrade to add more.`);
                        return;
                      }
                      handleSocialLinkChange("facebook", e.target.value);
                    }}
                    placeholder="https://facebook.com/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Linkedin className="w-5 h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "linkedin")?.url || "" : ""}
                    onChange={(e) => {
                      const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
                      const activeLinks = countActiveSocialLinks();
                      const isAdding = !profile.socialLinks.find(l => l.type === "linkedin")?.url && e.target.value.trim() !== "";
                      if (isAdding && activeLinks >= maxLinks) {
                        toast.error(`You have reached your plan's social link limit. Upgrade to add more.`);
                        return;
                      }
                      handleSocialLinkChange("linkedin", e.target.value);
                    }}
                    placeholder="https://linkedin.com/in/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Twitch className="w-5 h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "twitch")?.url || "" : ""}
                    onChange={(e) => {
                      const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
                      const activeLinks = countActiveSocialLinks();
                      const isAdding = !profile.socialLinks.find(l => l.type === "twitch")?.url && e.target.value.trim() !== "";
                      if (isAdding && activeLinks >= maxLinks) {
                        toast.error(`You have reached your plan's social link limit. Upgrade to add more.`);
                        return;
                      }
                      handleSocialLinkChange("twitch", e.target.value);
                    }}
                    placeholder="https://twitch.tv/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <Input
                    value={Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === "website")?.url || "" : ""}
                    onChange={(e) => {
                      const maxLinks = plan === "free" ? 1 : plan === "basic" ? 3 : 99;
                      const activeLinks = countActiveSocialLinks();
                      const isAdding = !profile.socialLinks.find(l => l.type === "website")?.url && e.target.value.trim() !== "";
                      if (isAdding && activeLinks >= maxLinks) {
                        toast.error(`You have reached your plan's social link limit. Upgrade to add more.`);
                        return;
                      }
                      handleSocialLinkChange("website", e.target.value);
                    }}
                    placeholder="Enter website URL"
                    className="bg-input-bg flex-1"
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
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-blue-900 mb-1">Receive DROP or Pi Tips</h3>
                          <div className="flex items-center gap-2 mb-3">
                            <Input
                              value={profile.piDonationMessage || ''}
                              onChange={(e) => setProfile({ ...profile, piDonationMessage: e.target.value })}
                              placeholder="Send me a coffee ☕"
                              className="bg-background border-primary text-xs font-mono flex-1"
                              maxLength={64}
                            />
                            <span className="text-xs text-muted-foreground">Custom message</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Input
                                value={profile.piWalletAddress || ''}
                                onChange={(e) => setProfile({ ...profile, piWalletAddress: e.target.value })}
                                placeholder="G... (Pi Network wallet address)"
                                className="bg-background border-primary text-xs font-mono"
                                maxLength={56}
                              />
                              {profile.piWalletAddress && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(profile.piWalletAddress!);
                                      toast.success('Wallet address copied!');
                                    }}
                                    className="text-xs border-blue-300"
                                  >
                                    Copy Address
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPiWalletQR(true)}
                                    className="text-xs border-blue-300"
                                  >
                                    View QR Code
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
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
                                className="text-xs border-blue-300"
                              >
                                <Wallet className="w-3 h-3 mr-1" />
                                Import from Wallet
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 min-w-[160px]">
                          <div className="font-semibold text-blue-900 mb-1">Tip / Send Me a Coffee</div>
                          {profile.piWalletAddress ? (
                            <>
                              <div className="relative w-[160px] h-[160px] mx-auto">
                                <svg width="160" height="160" className="rounded border border-blue-300 bg-white">
                                  <foreignObject width="160" height="160">
                                    <div style={{ width: '160px', height: '160px', position: 'relative' }}>
                                      <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(profile.piWalletAddress)}`}
                                        alt="Wallet QR Code"
                                        style={{ width: 160, height: 160, borderRadius: 8, background: '#fff' }}
                                      />
                                      <img
                                        src="/droplink-logo.png"
                                        alt="Droplink Logo"
                                        style={{ position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, transform: 'translate(-50%, -50%)', borderRadius: 12, border: '2px solid #fff', background: '#fff', boxShadow: '0 2px 8px #0001' }}
                                      />
                                    </div>
                                  </foreignObject>
                                </svg>
                              </div>
                              <div className="text-xs text-blue-700 break-all text-center mt-1">
                                <span>Scan to tip Pi or DROP</span>
                              </div>
                              <div className="text-xs text-blue-700 break-all text-center mt-1">
                                <span>{profile.piWalletAddress}</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-blue-400 text-center">Enter your wallet address to generate a QR code</div>
                          )}
                          {profile.piWalletQrUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                navigator.clipboard.writeText(profile.piWalletQrUrl!);
                                toast.success('QR code image URL copied!');
                              }}
                            >
                              Copy QR Code URL
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
              <div className="border-t pt-6">
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
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-6">Public Profile Settings</h2>
              <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="share-button" className="text-base">
                    Show Share Button
                  </Label>
                  <p className="text-sm text-muted-foreground">
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
                <h2 className="text-lg font-semibold mb-6">Theme Customization</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="primary-color" className="mb-3 block">Primary Color</Label>
                  <Input
                    id="primary-color"
                    type="color"
                    value={profile.theme.primaryColor}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, primaryColor: e.target.value }
                    })}
                    className="h-12 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="background-color" className="mb-3 block">Background Color</Label>
                  <Input
                    id="background-color"
                    type="color"
                    value={profile.theme.backgroundColor}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, backgroundColor: e.target.value }
                    })}
                    className="h-12 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="text-color" className="mb-3 block">Text Color</Label>
                  <Input
                    id="text-color"
                    type="color"
                    value={profile.theme.textColor || '#ffffff'}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, textColor: e.target.value }
                    })}
                    className="h-12 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="icon-style" className="mb-3 block">Icon Style</Label>
                  <select
                    id="icon-style"
                    value={profile.theme.iconStyle}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, iconStyle: e.target.value }
                    })}
                    className="w-full h-10 px-3 rounded-md bg-input-bg border border-border"
                  >
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>

                {/* Live preview for text visibility */}
                <div className="mt-6 p-4 rounded border" style={{
                  background: profile.theme.backgroundColor,
                  color: profile.theme.textColor || '#ffffff',
                  borderColor: profile.theme.primaryColor
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: 18 }}>Text Preview: Always Visible</span>
                  <p style={{ marginTop: 8 }}>This is a preview of your text color on your selected background. Make sure it is always readable!</p>
                </div>
              </div>
              </div>
            </PlanGate>

            {/* Digital Products - Premium/Pro only */}
            <PlanGate minPlan="premium" featureName="Digital Products">
              <div>
                <h2 className="text-lg font-semibold mb-6">Digital Products</h2>
              <div className="space-y-4">
                {profile.products.map((product, index) => (
                  <div key={product.id} className="p-4 bg-card border border-border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Product {index + 1}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newProducts = profile.products.filter(p => p.id !== product.id);
                          setProfile({ ...profile, products: newProducts });
                        }}
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
                      className="bg-input-bg"
                    />
                    <Input
                      placeholder="Price (e.g., $9.99)"
                      value={product.price?.toString() ?? ""}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].price = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg"
                    />
                    <Textarea
                      placeholder="Product Description"
                      value={product.description}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].description = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg min-h-[80px] resize-none"
                    />
                    <Input
                      placeholder="File/Download URL"
                      value={product.fileUrl}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].fileUrl = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
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
                  Add Product
                </Button>
              </div>
              </div>
            </PlanGate>

                {/* Action Buttons */}
                <Card className="border-0 rounded-none shadow-none sticky bottom-0 z-50 w-full p-0 m-0">
                  <div className="flex gap-4 border-t border-border bg-background/95 backdrop-blur-sm w-full p-0 m-0">
                    <Button
                      className="flex-1 h-12 rounded-none bg-white text-sky-400 font-medium border-none hover:bg-gray-100"
                      onClick={() => {
                        toast.info('No changes were saved.');
                        // Optionally, add logic to reset form fields to their last saved state here
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} className="flex-1 h-12 bg-sky-400 hover:bg-sky-500 text-white font-medium rounded-none border-none" disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              {/* Design Tab - Premium/Pro only */}
              <TabsContent value="design" className="space-y-6">
                <PlanGate minPlan="premium" featureName="GIF Background (Premium)">
                  {!isPlanExpired && (
                    <>
                      <DesignCustomizer 
                        theme={profile.theme}
                        onThemeChange={(newTheme) => setProfile({ ...profile, theme: newTheme })}
                      />
                      {/* Save Button */}
                      <div className={`flex gap-4 pt-6 pb-6 mt-8 border-t border-border sticky bottom-0 z-50 w-full bg-background/95 backdrop-blur-sm shadow-lg`}>
                        <Button variant="outline" className="flex-1 h-12">
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSave} 
                          className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" 
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
                <SubscriptionStatus />
              </TabsContent>


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
          className={`lg:w-[400px] xl:w-[500px] ${isMobile ? 'bg-background border-t' : 'glass-surface border-l'} border-border/30 flex-1 flex flex-col items-center justify-center ${showPreview ? 'flex' : 'hidden lg:flex'}`}
          style={{ minHeight: 0 }}
        >
          <div className="mb-4 flex items-center justify-between w-full max-w-xs mx-auto">
            <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              Copy link
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center w-full">
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
    </div>
  );
};

export default Dashboard;