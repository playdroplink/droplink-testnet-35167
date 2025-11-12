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
import { DonationWallet } from "@/components/DonationWallet";
import { PiWalletManager } from "@/components/PiWalletManager";
import { PiAdBanner } from "@/components/PiAdBanner";
import { AdGatedFeature } from "@/components/AdGatedFeature";
import { PlanGate } from "@/components/PlanGate";
import { useActiveSubscription } from "@/hooks/useActiveSubscription";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
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
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import { useState as useQRState } from "react";

interface ProfileData {
  logo: string;
  businessName: string;
  storeUrl: string;
  description: string;
  email?: string;
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
  wallets: {
    crypto: Array<{ name: string; address: string; id: string }>;
    bank: Array<{ name: string; details: string; id: string }>;
  };
  hasPremium?: boolean;
  showShareButton?: boolean;
  piWalletAddress?: string;
  piDonationMessage?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Hooks must be called unconditionally
  const piContext = usePi();
  const { piUser, isAuthenticated, signOut: piSignOut, loading: piLoading } = piContext;
  
  const subscription = useActiveSubscription();
  const { plan, loading: subscriptionLoading } = subscription;
  
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const [displayUsername, setDisplayUsername] = useState<string | null>(null);
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
    wallets: {
      crypto: [],
      bank: [],
    },
    hasPremium: false,
    showShareButton: true,
    piWalletAddress: "",
    piDonationMessage: "Send me a coffee ☕",
  });

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
        // No authentication
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
      } else if (supabaseUser) {
        // Email/Gmail user - load by user_id
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", supabaseUser.id)
          .maybeSingle();
        profileData = result.data;
        error = result.error;
        
        // If no profile exists, create one
        if (!profileData && !error) {
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
            console.error("Error creating profile for email user:", createError);
          } else if (newProfile) {
            profileData = newProfile;
            console.log("Created profile for email user:", newProfile.id);
          }
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
          if (session?.access_token) {
            const { data: finData, error: finError } = await supabase.functions.invoke("financial-data", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });
            
            if (!finError && finData?.data) {
              financialData = finData.data;
            }
          } else {
            // No session - try to load from profile_financial_data table directly (public read)
            try {
              const { data: finData } = await supabase
                .from("profile_financial_data")
                .select("*")
                .eq("profile_id", profileData.id)
                .maybeSingle();
              
              if (finData) {
                financialData = finData;
              }
            } catch (directError) {
              console.warn("Could not load financial data directly:", directError);
            }
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
        // Auto-create profile
        const defaultName = isPiUser && piUser ? piUser.username : (supabaseUser?.email?.split("@")[0] || "user");
        console.log("Profile not found, auto-creating with name:", defaultName);
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
            profileId: null
          };
          const storageKey = isPiUser ? `profile_${userIdentifier}` : `profile_email_${supabaseUser?.id}`;
          localStorage.setItem(storageKey, JSON.stringify(profileToStore));
          localStorage.setItem(`${storageKey}_backup`, JSON.stringify(profileToStore));
        } catch (e) {
          console.error("Error saving to localStorage:", e);
        }
        toast.info(`Profile auto-created with your ${isPiUser ? 'Pi username' : 'email'}`);
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
        // Try to get Supabase session, but if not available, we'll use direct update
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          // Use edge function with JWT (works for both Pi and email users)
          const { data: functionData, error: functionError } = await supabase.functions.invoke("profile-update", {
            body: { 
              username: username,
              profileData: profilePayload
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

          if (functionError) {
            console.error("Profile update error:", functionError);
            // Try direct update as fallback
            if (profileId) {
              const { error: directError } = await supabase
                .from("profiles")
                .update(profilePayload)
                .eq("id", profileId);
              
              if (directError) {
                throw directError;
              }
            } else {
              throw functionError;
            }
          } else if (functionData?.data) {
            currentProfileId = functionData.data.id;
            if (!profileId) {
              setProfileId(currentProfileId);
            }
            console.log("Profile updated successfully via edge function");
          }
        } else {
          // No Supabase session - use direct update or create profile
          if (!profileId) {
            if (isPiUser && piUser) {
              // Pi user - create profile via pi-auth
              const accessToken = localStorage.getItem("pi_access_token");
              if (accessToken) {
                const { data: functionData, error: functionError } = await supabase.functions.invoke("pi-auth", {
                  body: { 
                    accessToken: accessToken,
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
              // Email user - create profile directly
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

          // Now update the profile directly
          if (currentProfileId) {
            const { error: directError } = await supabase
              .from("profiles")
              .update(profilePayload)
              .eq("id", currentProfileId);
            
            if (directError) {
              throw directError;
            }
            console.log("Profile updated successfully via direct update");
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
        if (session?.access_token) {
          await supabase.functions.invoke("financial-data", {
            method: "PUT",
            body: {
              crypto_wallets: { wallets: profile.wallets.crypto },
              bank_details: { accounts: profile.wallets.bank },
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
        }
      } catch (error) {
        console.error("Error saving financial data:", error);
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
    await piSignOut();
    navigate("/auth");
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
                  <PlanGate minPlan="premium">
                    <Button onClick={() => navigate("/domain")} variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Globe className="w-4 h-4" />
                      Custom Domain
                    </Button>
                  </PlanGate>
                  <Button onClick={() => navigate("/ai-support")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Bot className="w-4 h-4" />
                    AI Support
                  </Button>
                  <Button onClick={() => navigate("/subscription")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Wallet className="w-4 h-4" />
                    Upgrade
                  </Button>
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
              <PlanGate minPlan="premium">
                <Button 
                  onClick={() => navigate("/domain")} 
                  variant="outline" 
                  size="sm" 
                  className="hidden lg:flex gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Domain
                </Button>
              </PlanGate>
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
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Editor Panel */}
        <div className={`flex-1 overflow-y-auto p-4 lg:p-8 ${showPreview ? 'hidden lg:block' : 'block'}`}>
          <div className="max-w-2xl mx-auto">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="profile" className="text-xs sm:text-sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="design" className="text-xs sm:text-sm">
                  <Palette className="w-4 h-4 mr-2" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs sm:text-sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
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

            {/* Custom Links - Premium/Pro only */}
            <PlanGate minPlan="premium">
              <div className="border-t pt-6">
                <CustomLinksManager
                  links={profile.customLinks}
                  onChange={(links) => setProfile({ ...profile, customLinks: links })}
                />
              </div>
            </PlanGate>

            {/* Donation Wallets - Premium/Pro only */}
            <PlanGate minPlan="premium">
              <div className="border-t pt-6">
                <DonationWallet
                  wallets={profile.wallets}
                  onChange={(wallets) => setProfile({ ...profile, wallets })} 
                />
              </div>
            </PlanGate>

            {/* Pi Network Wallet - Premium/Pro only */}
            <PlanGate minPlan="premium">
              <div className="border-t pt-6">
                <PiWalletManager
                  piWalletAddress={profile.piWalletAddress}
                  donationMessage={profile.piDonationMessage}
                  onSave={async (address, message) => {
                    setProfile({ 
                      ...profile, 
                      piWalletAddress: address,
                      piDonationMessage: message 
                    });
                    // Save via secure financial data endpoint
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) {
                        toast.error("Please sign in to save wallet data");
                        return;
                      }

                      const { data, error } = await supabase.functions.invoke("financial-data", {
                        method: "PUT",
                        body: {
                          pi_wallet_address: address,
                          pi_donation_message: message,
                        },
                        headers: {
                          Authorization: `Bearer ${session.access_token}`
                        }
                      });

                      if (error) throw error;
                      toast.success("Wallet data saved successfully");
                    } catch (error: any) {
                      console.error("Error saving wallet data:", error);
                      toast.error(error.message || "Failed to save wallet data");
                    }
                  }}
                />
              </div>
            </PlanGate>

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
    </div>
  );
};

export default Dashboard;