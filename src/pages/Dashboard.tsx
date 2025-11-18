import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhonePreview } from "@/components/PhonePreview";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Analytics } from "@/components/Analytics";
import { DesignCustomizer } from "@/components/DesignCustomizer";
import { CustomLinksManager } from "@/components/CustomLinksManager";
import { PiAdBanner } from "@/components/PiAdBanner";
import { AdGatedFeature } from "@/components/AdGatedFeature";
import { PlanGate } from "@/components/PlanGate";
import { useActiveSubscription } from "@/hooks/useActiveSubscription";
import { useAutoSave } from "@/hooks/useAutoSave";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { performCompleteSignOut } from "@/lib/auth-utils";
import { UserPreferencesManager } from "@/components/UserPreferencesManager";
import { AboutModal } from "@/components/AboutModal";
import { FutureFeaturesDashboard } from "@/components/FutureFeaturesDashboard";
import { DropTokenManager } from "@/components/DropTokenManager";
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
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import PiDataManager from "@/components/PiDataManager";
import { useState as useQRState } from "react";

interface ProfileData {
  logo: string;
  businessName: string;
  storeUrl: string;
  description: string;
  email?: string;
  piWalletAddress?: string;
  youtubeVideoUrl: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    youtube: string;
    tiktok: string;
    facebook: string;
    linkedin: string;
    twitch: string;
    website: string;
  };
  customLinks: Array<{
    id: string;
    title: string;
    url: string;
    icon?: string;
  }>;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    iconStyle: string;
    buttonStyle: string;
  };
  products: Array<{
    id: string;
    title: string;
    price: string;
    description: string;
    fileUrl: string;
  }>;
  hasPremium?: boolean;
  showShareButton?: boolean;
  piDonationMessage?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Hooks must be called unconditionally
  const piContext = usePi();
  const { piUser, isAuthenticated, signOut: piSignOut, loading: piLoading, getCurrentWalletAddress } = piContext;
  
  const subscription = useActiveSubscription();
  const { plan, loading: subscriptionLoading } = subscription;
  
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [piWalletQrData, setPiWalletQrData] = useState<string>("");
  const [showPiWalletQR, setShowPiWalletQR] = useState(false);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const [displayUsername, setDisplayUsername] = useState<string | null>(null);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);

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
    logo: "",
    businessName: "",
    storeUrl: "",
    description: "",
    email: "",
    youtubeVideoUrl: "",
    socialLinks: {
      twitter: "",
      instagram: "",
      youtube: "",
      tiktok: "",
      facebook: "",
      linkedin: "",
      twitch: "",
      website: "",
    },
    customLinks: [],
    theme: {
      primaryColor: "#3b82f6",
      backgroundColor: "#000000",
      iconStyle: "rounded",
      buttonStyle: "filled",
    },
    products: [],
    hasPremium: false,
    showShareButton: true,
    piWalletAddress: "",
    piDonationMessage: "Send me a coffee ☕",
  });

  // Auto-save functionality
  const autoSave = useAutoSave<ProfileData>({
    tableName: 'profiles',
    recordId: profileId || '',
    delay: 3000, // 3 second delay
    onSave: async (data: ProfileData) => {
      // Custom save logic for profile
      if (!profileId) return;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: data.businessName,
          store_url: data.storeUrl,
          description: data.description,
          email: data.email,
          youtube_video_url: data.youtubeVideoUrl,
          social_links: data.socialLinks,
          custom_links: data.customLinks,
          theme: data.theme,
          logo_url: data.logo,
          show_share_button: data.showShareButton,
          pi_wallet_address: data.piWalletAddress,
          pi_donation_message: data.piDonationMessage,
        })
        .eq('id', profileId);
      
      if (error) throw error;
    },
    onError: (error: Error) => {
      console.error('Auto-save failed:', error);
    }
  });

  // Update auto-save data when profile changes
  useEffect(() => {
    if (profileId && !loading) {
      autoSave.updateData(profile);
    }
  }, [profile, profileId, loading]);

  // Initialize auto-save with profile data
  useEffect(() => {
    if (profileId && profile && !loading) {
      autoSave.initialize(profile);
    }
  }, [profileId, loading]);

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
        // No authentication - in development, allow bypass
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: creating demo profile');
          userIdentifier = 'dev_user';
          isPiUser = false;
          setDisplayUsername('dev_user');
        } else {
          navigate("/auth");
          return;
        }
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

            const { data: finData, error: finError } = await supabase.functions.invoke("financial-data", {
              method: "GET",
              headers
            });
            
            if (!finError && finData?.data) {
              financialData = finData.data;
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
          logo: profileData.logo || "",
          businessName: profileData.business_name || displayName,
          storeUrl: profileData.username || displayName,
          description: profileData.description || "",
          email: (profileData as any).email || supabaseUser?.email || "",
          youtubeVideoUrl: (profileData as any).youtube_video_url || "",
          socialLinks: socialLinks || {
            twitter: "",
            instagram: "",
            youtube: "",
            tiktok: "",
            facebook: "",
            linkedin: "",
            twitch: "",
            website: "",
          },
          customLinks: (themeSettings?.customLinks as any) || [],
          theme: {
            primaryColor: themeSettings?.primaryColor || "#3b82f6",
            backgroundColor: themeSettings?.backgroundColor || "#000000",
            iconStyle: themeSettings?.iconStyle || "rounded",
            buttonStyle: themeSettings?.buttonStyle || "filled",
          },
          products: productsData?.map((p: any) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            description: p.description || "",
            fileUrl: p.file_url || "",
          })) || [],
          wallets: {
            crypto: cryptoWallets?.wallets || [],
            bank: bankDetails?.accounts || [],
          },
          hasPremium: profileData.has_premium || false,
          showShareButton: (profileData as any).show_share_button !== false,
          piWalletAddress: financialData.pi_wallet_address || "",
          piDonationMessage: financialData.pi_donation_message || "Send me a coffee ☕",
        };
        
        setProfile(loadedProfile);
        
        // Welcome back existing users (only on first load of session)
        if (!isNewUser && !sessionStorage.getItem(`welcomed_${profileData.id}`)) {
          toast.success(`👋 Welcome back, ${loadedProfile.businessName}!`);
          sessionStorage.setItem(`welcomed_${profileData.id}`, 'true');
        }
        
          // Save to localStorage with metadata
        try {
          const profileToStore = {
            ...loadedProfile,
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
          logo: "",
          businessName: defaultName,
          storeUrl: defaultName,
          description: "",
          email: supabaseUser?.email || "",
          youtubeVideoUrl: "",
          socialLinks: {
            twitter: "",
            instagram: "",
            youtube: "",
            tiktok: "",
            facebook: "",
            linkedin: "",
            twitch: "",
            website: "",
          },
          customLinks: [],
          theme: {
            primaryColor: "#3b82f6",
            backgroundColor: "#000000",
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
    return Object.values(profile.socialLinks).filter(link => link && link.trim() !== "").length;
  };

  // Handle social link change with free plan limitation
  const handleSocialLinkChange = (platform: keyof typeof profile.socialLinks, value: string) => {
    if (plan === "free") {
      const currentCount = countActiveSocialLinks();
      const currentValue = profile.socialLinks[platform];
      const isAdding = value.trim() !== "" && currentValue.trim() === "";
      const isRemoving = value.trim() === "" && currentValue.trim() !== "";
      
      // If adding a new link and already have one, clear all others first
      if (isAdding && currentCount >= 1) {
        toast.info("Free plan allows only 1 social link. Clearing other links...");
        const clearedLinks = {
          twitter: "",
          instagram: "",
          youtube: "",
          tiktok: "",
          facebook: "",
          linkedin: "",
          twitch: "",
          website: "",
        };
        setProfile({
          ...profile,
          socialLinks: { ...clearedLinks, [platform]: value }
        });
        return;
      }
    }
    
    // Normal update
    setProfile({
      ...profile,
      socialLinks: { ...profile.socialLinks, [platform]: value }
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
      // Check for authentication (Pi or Supabase session)
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUser = session?.user;
      
      if (!isAuthenticated || !piUser) {
        // Check if user is authenticated via Supabase (Gmail/email)
        if (!supabaseUser) {
          toast.error("You must be logged in");
          navigate("/auth");
          return;
        }
      }

      if (!profile.storeUrl) {
        toast.error("Store URL is required");
        return;
      }

      const isPiUser = isAuthenticated && piUser;
      const username = isPiUser ? piUser.username : (supabaseUser?.email?.split("@")[0] || supabaseUser?.id.slice(0, 8));
      console.log(`Saving profile for ${isPiUser ? 'Pi' : 'email'} user:`, username);

      // Validate and sanitize store URL
      const sanitizedUrl = profile.storeUrl
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (sanitizedUrl !== profile.storeUrl) {
        setProfile({ ...profile, storeUrl: sanitizedUrl });
      }

      // For free plan, ensure only one social link is saved
      let socialLinksToSave = profile.socialLinks;
      if (plan === "free") {
        const activeLinks = Object.entries(profile.socialLinks).filter(([_, url]) => url && url.trim() !== "");
        if (activeLinks.length > 1) {
          // Keep only the first active link
          const clearedLinks = {
            twitter: "",
            instagram: "",
            youtube: "",
            tiktok: "",
            facebook: "",
            linkedin: "",
            twitch: "",
            website: "",
          };
          socialLinksToSave = { ...clearedLinks, [activeLinks[0][0]]: activeLinks[0][1] };
          toast.warning("Free plan allows only 1 social link. Only the first link was saved.");
        }
      }

      // Save or update profile (use Pi username as unique identifier)
      const profilePayload = {
        username: sanitizedUrl,
        business_name: profile.businessName,
        description: profile.description,
        email: profile.email || null,
        logo: profile.logo,
        youtube_video_url: profile.youtubeVideoUrl,
        social_links: socialLinksToSave,
        show_share_button: profile.showShareButton,
        theme_settings: {
          ...profile.theme,
          customLinks: profile.customLinks,
        },
        // Financial data is saved separately via secure endpoint
      };

      let currentProfileId = profileId;

      // Use profile-update edge function to bypass RLS
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const piAccessToken = localStorage.getItem("pi_access_token");
        const headers: Record<string, string> = {};
        const functionBody: any = {
          username,
          profileData: profilePayload,
        };

        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        } else if (isPiUser && piUser && piAccessToken) {
          headers["X-Pi-Access-Token"] = piAccessToken;
          functionBody.piAccessToken = piAccessToken;
        }

        const invokeProfileUpdate = async () => {
          const { data: fnData, error: fnError } = await supabase.functions.invoke("profile-update", {
            body: functionBody,
            headers: Object.keys(headers).length ? headers : undefined,
          });
          return { fnData, fnError };
        };

        let updateHandled = false;
        let fnErrorDetails: any = null;

        if (Object.keys(headers).length > 0) {
          const { fnData, fnError } = await invokeProfileUpdate();
          if (fnError) {
            fnErrorDetails = fnError;
            console.error("Profile update error (edge function):", fnError);
          } else if (fnData?.success === false) {
            fnErrorDetails = fnData.error || "Profile update failed";
            console.error("Edge function returned error:", fnData.error);
          } else if (fnData?.data) {
            currentProfileId = fnData.data.id;
            if (!profileId) {
              setProfileId(currentProfileId);
            }
            console.log("Profile updated successfully via edge function");
            updateHandled = true;
          }
        }

        if (!updateHandled) {
          // Ensure profile exists before retrying
          if (!currentProfileId) {
            if (isPiUser && piUser) {
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("username", piUser.username)
                .maybeSingle();

              if (existingProfile) {
                currentProfileId = existingProfile.id;
                setProfileId(existingProfile.id);
              } else if (piAccessToken) {
                const { data: functionData, error: functionError } = await supabase.functions.invoke("pi-auth", {
                  body: { 
                    accessToken: piAccessToken,
                    username: piUser.username,
                    uid: piUser.uid
                  }
                });

                if (functionError || !functionData?.profileId) {
                  throw new Error("Failed to create profile. Please try signing in again.");
                }
                currentProfileId = functionData.profileId;
                setProfileId(currentProfileId);
              } else {
                throw new Error("Please sign in with Pi Network to save your profile");
              }
            } else if (supabaseUser) {
              const emailUsername = supabaseUser.email?.split("@")[0] || `user-${supabaseUser.id.slice(0, 8)}`;
              const sanitizedUsername = emailUsername.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
              
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
                throw new Error(`Failed to create profile: ${createError.message}`);
              }
              
              if (newProfile) {
                currentProfileId = newProfile.id;
                setProfileId(currentProfileId);
              }
            } else {
              throw new Error("Please sign in to save your profile");
            }
          }

          if (!updateHandled && Object.keys(headers).length > 0) {
            const { fnData: retryData, fnError: retryError } = await invokeProfileUpdate();
            if (retryError) {
              console.error("Profile update retry error:", retryError);
              fnErrorDetails = retryError;
            } else if (retryData?.success === false) {
              console.error("Edge function retry returned error:", retryData.error);
              fnErrorDetails = retryData.error || "Profile update failed";
            } else if (retryData?.data) {
              currentProfileId = retryData.data.id;
              if (!profileId) {
                setProfileId(currentProfileId);
              }
              console.log("Profile updated successfully via edge function (retry)");
              updateHandled = true;
            }
          }

          if (!updateHandled && currentProfileId && session?.access_token) {
            console.log("Falling back to direct database update...");
            const { error: directError } = await supabase
              .from("profiles")
              .update(profilePayload)
              .eq("id", currentProfileId);
            
            if (directError) {
              console.error("Direct update error:", directError);
              throw directError;
            }
            console.log("Profile updated successfully via direct update");
            updateHandled = true;
          }

          if (!updateHandled) {
            throw new Error(typeof fnErrorDetails === "string" ? fnErrorDetails : "Profile update failed");
          }
        }
      } catch (edgeError: any) {
        console.error("Profile save error:", edgeError);
        // If we have a profileId, try one more direct update
        if (profileId) {
          try {
            const { error: directError } = await supabase
              .from("profiles")
              .update(profilePayload)
              .eq("id", profileId);
            
            if (directError) {
              throw directError;
            }
            console.log("Profile updated via fallback direct update");
          } catch (fallbackError) {
            throw edgeError; // Throw original error
          }
        } else {
          throw edgeError;
        }
      }

      // Save products
      if (currentProfileId) {
        // Delete existing products
        await supabase
          .from("products")
          .delete()
          .eq("profile_id", currentProfileId);

        // Insert new products
        if (profile.products.length > 0) {
          const productsPayload = profile.products.map((p) => ({
            profile_id: currentProfileId,
            title: p.title,
            price: p.price,
            description: p.description,
            file_url: p.fileUrl,
          }));

          const { error } = await supabase
            .from("products")
            .insert(productsPayload);

          if (error) throw error;
        }
      }

      // Save financial data via secure endpoint
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const piAccessToken = localStorage.getItem("pi_access_token");
        const shouldUsePiToken = !session?.access_token && isPiUser && piUser && piAccessToken;

        if ((session?.access_token || shouldUsePiToken) && currentProfileId) {
          const headers: Record<string, string> = session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : { "X-Pi-Access-Token": piAccessToken as string };

          const { data: finData, error: finError } = await supabase.functions.invoke("financial-data", {
            method: "PUT",
            body: {
              pi_wallet_address: profile.piWalletAddress || null,
              pi_donation_message: profile.piDonationMessage || "Send me a coffee ☕",
            },
            headers
          });
          
          if (finError) {
            console.warn("Financial data save error (non-critical):", finError);
            // Financial data is now stored directly in profiles table
          } else {
            console.log("Financial data saved successfully");
          }
        } else if (currentProfileId) {
          // No session but we have profile ID - save to profiles table directly
          try {
            await supabase
              .from("profiles")
              .update({
                pi_wallet_address: profile.piWalletAddress || null,
                pi_donation_message: profile.piDonationMessage || "Send me a coffee ☕",
              })
              .eq("id", currentProfileId);
            console.log("Financial data saved directly (no session)");
          } catch (directFinError) {
            console.warn("Direct profile update failed:", directFinError);
          }
        }
      } catch (error) {
        console.error("Error saving financial data:", error);
        // Don't throw - financial data is optional
      }

      // Save to localStorage
      try {
        const profileToStore = {
          ...profile,
          lastSynced: new Date().toISOString(),
          profileId: currentProfileId
        };
        const storageKey = isPiUser && piUser 
          ? `profile_${piUser.username}` 
          : `profile_email_${supabaseUser?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(profileToStore));
        // Also store a backup
        localStorage.setItem(`${storageKey}_backup`, JSON.stringify(profileToStore));
      } catch (storageError) {
        console.error("Error saving to localStorage:", storageError);
      }

      toast.success("Profile saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      if (error.code === "23505") {
        toast.error("This store URL is already taken. Please choose another one.");
      } else {
        toast.error(error.message || "Failed to save profile");
      }
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 lg:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-sky-500">Droplink</h1>
          {displayUsername && (
            <span className="text-sm text-muted-foreground">@{displayUsername}</span>
          )}
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          {isMobile ? (
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-4 h-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                  <DrawerDescription>Quick actions and settings</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 space-y-2">
                  <Button onClick={handleShowQRCode} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </Button>
                  <Button onClick={handleCopyLink} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <Button onClick={() => navigate("/followers")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Users className="w-4 h-4" />
                    Followers
                  </Button>
                  <Button onClick={() => navigate("/wallet")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Wallet className="w-4 h-4" />
                    Wallet
                  </Button>
                  <Button onClick={() => navigate("/profile")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                  <Button onClick={() => navigate("/domain")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Globe className="w-4 h-4" />
                    Custom Domain
                  </Button>
                  <Button onClick={() => navigate("/ai-support")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Bot className="w-4 h-4" />
                    AI Support
                  </Button>
                  <AboutModal>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Info className="w-4 h-4" />
                      About DropLink
                    </Button>
                  </AboutModal>
                  <Button onClick={() => navigate("/subscription")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Wallet className="w-4 h-4" />
                    Upgrade
                  </Button>
                  {/* Pi Auth Button for Email Users */}
                  {hasSupabaseSession && !isAuthenticated && (
                    <Button onClick={() => navigate("/auth")} variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Wallet className="w-4 h-4" />
                      Connect Pi
                    </Button>
                  )}
                  <DrawerClose asChild>
                    <Button variant="ghost" size="sm" className="w-full">Close</Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <>
              <Button onClick={handleShowQRCode} variant="outline" size="sm" className="hidden sm:flex gap-2">
                <QrCode className="w-4 h-4" />
                QR Code
              </Button>
              <Button onClick={handleCopyLink} variant="outline" size="sm" className="hidden sm:flex gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button 
                onClick={() => navigate("/followers")} 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2"
              >
                <Users className="w-4 h-4" />
                Followers
              </Button>
              <Button 
                onClick={() => navigate("/wallet")} 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2"
              >
                <Wallet className="w-4 h-4" />
                Wallet
              </Button>
              <Button 
                onClick={() => navigate("/profile")} 
                variant="outline" 
                size="sm" 
                className="hidden lg:flex gap-2"
              >
                <User className="w-4 h-4" />
                Profile
              </Button>
              <Button 
                onClick={() => navigate("/domain")} 
                variant="outline" 
                size="sm" 
                className="hidden lg:flex gap-2"
              >
                <Globe className="w-4 h-4" />
                Domain
              </Button>
              <Button 
                onClick={() => navigate("/ai-support")} 
                variant="outline" 
                size="sm" 
                className="hidden lg:flex gap-2"
              >
                <Bot className="w-4 h-4" />
                AI Support
              </Button>
              <Button 
                onClick={() => navigate("/subscription")} 
                variant="outline" 
                size="sm" 
                className="hidden md:flex"
              >
                Upgrade
              </Button>
              <AboutModal>
                <Button variant="outline" size="sm" className="hidden lg:flex gap-2">
                  <Info className="w-4 h-4" />
                  About
                </Button>
              </AboutModal>
            </>
          )}
          <Button 
            onClick={() => setShowPreview(!showPreview)} 
            variant="outline" 
            size="sm"
            className="lg:hidden"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <ThemeToggle />
          <Button onClick={handleLogout} variant="ghost" size="sm">
            <LogOut className="w-4 h-4" />
          </Button>
          
          {/* Pi Auth Button for Email Users */}
          {hasSupabaseSession && !isAuthenticated && (
            <Button 
              onClick={() => navigate("/auth")} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Wallet className="w-4 h-4" />
              Connect Pi
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Editor Panel */}
        <div className={`flex-1 overflow-y-auto p-4 lg:p-8 ${showPreview ? 'hidden lg:block' : 'block'}`}>
          <div className="max-w-2xl mx-auto">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-6">
                <TabsTrigger value="profile" className="text-xs sm:text-sm">
                  <Settings className="w-4 h-4 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="design" className="text-xs sm:text-sm">
                  <Palette className="w-4 h-4 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Design</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs sm:text-sm hidden lg:flex">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="features" className="text-xs sm:text-sm hidden lg:flex">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Features
                </TabsTrigger>
                <TabsTrigger value="drop-tokens" className="text-xs sm:text-sm hidden lg:flex">
                  <Coins className="w-4 h-4 mr-2" />
                  DROP
                </TabsTrigger>
                <TabsTrigger value="preferences" className="text-xs sm:text-sm hidden lg:flex">
                  <User className="w-4 h-4 mr-2" />
                  Settings
                </TabsTrigger>
                {isAuthenticated && (
                  <TabsTrigger value="pi-data" className="text-xs sm:text-sm hidden lg:flex">
                    <Bot className="w-4 h-4 mr-2" />
                    Pi Data
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-8">
                {/* Pi Ad Banner for free users */}
                <PiAdBanner />
                
                <div>
                  <h2 className="text-lg font-semibold mb-6">Business details</h2>
              
              {/* Logo Upload */}
              <div className="mb-6">
                <Label className="mb-3 block">Business logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden">
                    {profile.logo ? (
                      <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
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
              <PlanGate minPlan="premium">
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
                {plan === "free" && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Free: 1 link only
                  </span>
                )}
              </div>
              {plan === "free" && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    Free plan allows only <strong>1 social link</strong>. Choose your preferred platform below.
                    <br />
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto text-primary mt-1"
                      onClick={() => navigate("/subscription")}
                    >
                      Upgrade to Premium/Pro for unlimited links →
                    </Button>
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Twitter className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.twitter}
                    onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                    placeholder="https://x.com/"
                    className="bg-input-bg flex-1"
                    disabled={plan === "free" && countActiveSocialLinks() >= 1 && !profile.socialLinks.twitter}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.instagram}
                    onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                    placeholder="https://instagram.com/"
                    className="bg-input-bg flex-1"
                    disabled={plan === "free" && countActiveSocialLinks() >= 1 && !profile.socialLinks.instagram}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.youtube}
                    onChange={(e) => handleSocialLinkChange("youtube", e.target.value)}
                    placeholder="https://youtube.com/@"
                    className="bg-input-bg flex-1"
                    disabled={plan === "free" && countActiveSocialLinks() >= 1 && !profile.socialLinks.youtube}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Music className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.tiktok}
                    onChange={(e) => handleSocialLinkChange("tiktok", e.target.value)}
                    placeholder="https://tiktok.com/@"
                    className="bg-input-bg flex-1"
                    disabled={plan === "free" && countActiveSocialLinks() >= 1 && !profile.socialLinks.tiktok}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.facebook}
                    onChange={(e) => handleSocialLinkChange("facebook", e.target.value)}
                    placeholder="https://facebook.com/"
                    className="bg-input-bg flex-1"
                    disabled={plan === "free" && countActiveSocialLinks() >= 1 && !profile.socialLinks.facebook}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Linkedin className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.linkedin}
                    onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/"
                    className="bg-input-bg flex-1"
                    disabled={plan === "free" && countActiveSocialLinks() >= 1 && !profile.socialLinks.linkedin}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Twitch className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.twitch}
                    onChange={(e) => handleSocialLinkChange("twitch", e.target.value)}
                    placeholder="https://twitch.tv/"
                    className="bg-input-bg flex-1"
                    disabled={plan === "free" && countActiveSocialLinks() >= 1 && !profile.socialLinks.twitch}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.website}
                    onChange={(e) => handleSocialLinkChange("website", e.target.value)}
                    placeholder="Enter website URL"
                    className="bg-input-bg flex-1"
                    disabled={plan === "free" && countActiveSocialLinks() >= 1 && !profile.socialLinks.website}
                  />
                </div>
              </div>
            </div>

            {/* Pi Wallet Address for Tips & Payments */}
            {isAuthenticated && (
              <div className="border-t pt-6">
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
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-blue-900 mb-1">Receive DROP Tokens</h3>
                        <p className="text-sm text-blue-700 mb-3">
                          Set your Pi wallet address to receive DROP token tips from visitors to your store.
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={profile.piWalletAddress || ''}
                              onChange={(e) => setProfile({ ...profile, piWalletAddress: e.target.value })}
                              placeholder="G... (Pi Network wallet address)"
                              className="bg-white border-blue-300 text-xs font-mono"
                              maxLength={56}
                            />
                            {profile.piWalletAddress && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (profile.piWalletAddress) {
                                    setPiWalletQrData(profile.piWalletAddress);
                                    setShowPiWalletQR(true);
                                  }
                                }}
                                className="border-blue-300"
                              >
                                <QrCode className="w-4 h-4" />
                              </Button>
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
                            
                            {profile.piWalletAddress && (
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
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 p-3 bg-blue-100 rounded border">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-800">
                              <p className="font-medium mb-1">How it works:</p>
                              <ul className="space-y-1 list-disc list-inside">
                                <li>Visitors can send DROP tokens to this address</li>
                                <li>QR code will be shown on your public bio page</li>
                                <li>Only enter addresses you own and control</li>
                                <li>This feature works with Pi Network blockchain</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Links - Premium/Pro only */}
            <PlanGate minPlan="premium">
              <div className="border-t pt-6">
                <CustomLinksManager
                  links={profile.customLinks}
                  onChange={(links) => setProfile({ ...profile, customLinks: links })}
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
            <PlanGate minPlan="premium">
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
              </div>
              </div>
            </PlanGate>

            {/* Digital Products - Premium/Pro only */}
            <PlanGate minPlan="premium">
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
                      value={product.price}
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
                <div className="flex gap-4 pt-4 pb-8">
                  <Button variant="outline" className="flex-1">Cancel</Button>
                  <Button onClick={handleSave} className="flex-1" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Design Tab - Premium/Pro only */}
              <TabsContent value="design" className="space-y-6">
                <PlanGate minPlan="premium">
                  <DesignCustomizer 
                    theme={profile.theme}
                    onThemeChange={(newTheme) => setProfile({ ...profile, theme: newTheme })}
                  />
                  
                  {/* Save Button */}
                  <div className="flex gap-4 pt-4 pb-8 border-t">
                    <Button variant="outline" className="flex-1">Cancel</Button>
                    <Button onClick={handleSave} className="flex-1" disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </PlanGate>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="pb-8">
                <AdGatedFeature featureName="Analytics">
                  {profileId ? (
                    <Analytics profileId={profileId} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Save your profile first to see analytics</p>
                    </div>
                  )}
                </AdGatedFeature>
              </TabsContent>

              {/* Future Features Tab */}
              <TabsContent value="features" className="pb-8">
                <FutureFeaturesDashboard />
              </TabsContent>

              {/* DROP Token Tab */}
              <TabsContent value="drop-tokens" className="pb-8">
                <DropTokenManager piUser={piUser} piWallet={piUser?.wallet_address} />
              </TabsContent>

              {/* User Preferences Tab */}
              <TabsContent value="preferences" className="pb-8">
                <UserPreferencesManager />
              </TabsContent>

              {/* Pi Data Tab */}
              {isAuthenticated && (
                <TabsContent value="pi-data" className="pb-8">
                  <PiDataManager />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Preview Panel */}
        <div className={`lg:w-[400px] xl:w-[500px] bg-card border-l border-border p-6 lg:p-8 flex flex-col items-center ${
          showPreview ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="mb-4 flex items-center justify-between w-full">
            <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              Copy link
            </Button>
          </div>
          <PhonePreview profile={profile} />
        </div>
      </div>
      
      {/* QR Code Dialog */}
      <QRCodeDialog
        open={showQRCode}
        onOpenChange={setShowQRCode}
        url={`${window.location.origin}/${profile.storeUrl}`}
        username={profile.storeUrl}
      />

      {/* Pi Wallet QR Code Dialog */}
      <QRCodeDialog
        open={showPiWalletQR}
        onOpenChange={setShowPiWalletQR}
        url={piWalletQrData}
        username="Pi-Wallet"
      />
    </div>
  );
};

export default Dashboard;