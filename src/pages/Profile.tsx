import { useState, useEffect } from "react";
import { PhonePreview } from "@/components/PhonePreview";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Upload, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePi } from "@/contexts/PiContext";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import type { ProfileData, ThemeData, CustomLink, SocialLinks, Product, PaymentLink, ShortenedLink } from "@/types/profile";

const Profile = () => {
  const navigate = useNavigate();
  const { piUser, isAuthenticated, signIn: piSignIn } = usePi();
  const [linkingPi, setLinkingPi] = useState(false);
    // Link Pi Network to current email-auth user
    const handleLinkPiNetwork = async () => {
      setLinkingPi(true);
      try {
        await piSignIn();
        // After Pi auth, get Supabase session and Pi user
        const { data: { session } } = await supabaseClient.auth.getSession();
        const userId = session?.user?.id;
        if (userId && piUser) {
          // Update the current user's profile with Pi info
          await supabaseClient.from('profiles').update({
            pi_username: piUser.username,
            pi_data: piUser
          }).eq('user_id', userId);
          toast.success('Pi Network account linked!');
        } else {
          toast.error('Failed to link Pi Network account.');
        }
      } catch (error) {
        console.error('Link Pi error:', error);
        toast.error('Failed to link Pi Network account.');
      } finally {
        setLinkingPi(false);
      }
    };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    id: "",
    businessName: "",
    username: "",
    description: "",
    logo: "",
    email: "",
    youtubeVideoUrl: "",
    customLinks: [],
    products: [],
    theme: {
      primaryColor: "#38bdf8",
      backgroundColor: "#000000",
      backgroundType: "color",
      backgroundGif: "",
      backgroundVideo: "",
      iconStyle: "rounded",
      buttonStyle: "filled",
      textColor: "#ffffff",
    },
    wallets: undefined,
    hasPremium: false,
    piWalletAddress: "",
    piDonationMessage: "",
    showShareButton: true,
    storeUrl: "",
    showPiWalletTips: false,
    socialLinks: [],
    paymentLinks: [],
    shortenedLinks: [],
    linkLayoutType: "stack",
    piWalletQrUrl: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      if (!isAuthenticated || !piUser) {
        // Store current page for redirect after authentication
        sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
        // Show a message and a sign-in button instead of redirecting immediately
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", piUser.username)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
        toast.error("Failed to load profile");
        return;
      }

      if (profile) {
        // Defensive helpers for possible Json values
        let safeTheme: ThemeData = {
          primaryColor: "#38bdf8",
          backgroundColor: "#000000",
          backgroundType: "color",
          backgroundGif: "",
          backgroundVideo: "",
          iconStyle: "rounded",
          buttonStyle: "filled",
          textColor: "#ffffff",
        };
        if (typeof profile.theme_settings === 'object' && profile.theme_settings !== null && !Array.isArray(profile.theme_settings)) {
          const t = profile.theme_settings as Record<string, unknown>;
          safeTheme = {
            primaryColor: typeof t.primaryColor === 'string' ? t.primaryColor : safeTheme.primaryColor,
            backgroundColor: typeof t.backgroundColor === 'string' ? t.backgroundColor : safeTheme.backgroundColor,
            backgroundType: t.backgroundType === 'color' || t.backgroundType === 'gif' || t.backgroundType === 'video' ? t.backgroundType : safeTheme.backgroundType,
            backgroundGif: typeof t.backgroundGif === 'string' ? t.backgroundGif : safeTheme.backgroundGif,
            backgroundVideo: typeof t.backgroundVideo === 'string' ? t.backgroundVideo : safeTheme.backgroundVideo,
            iconStyle: typeof t.iconStyle === 'string' ? t.iconStyle : safeTheme.iconStyle,
            buttonStyle: typeof t.buttonStyle === 'string' ? t.buttonStyle : safeTheme.buttonStyle,
            textColor: typeof t.textColor === 'string' ? t.textColor : safeTheme.textColor,
          };
        }
        let safeCustomLinks: CustomLink[] = [];
        if (
          typeof profile.theme_settings === 'object' &&
          profile.theme_settings !== null &&
          !Array.isArray(profile.theme_settings) &&
          'customLinks' in profile.theme_settings &&
          Array.isArray((profile.theme_settings as any).customLinks)
        ) {
          safeCustomLinks = (profile.theme_settings as any).customLinks as CustomLink[];
        }
        setProfileData(prev => ({
          ...prev,
          id: typeof profile.id === 'string' ? profile.id : "",
          businessName: typeof profile.business_name === 'string' ? profile.business_name : "",
          username: typeof profile.username === 'string' ? profile.username : "",
          description: typeof profile.description === 'string' ? profile.description : "",
          logo: typeof profile.logo === 'string' ? profile.logo : "",
          email: typeof profile.email === 'string' ? profile.email : "",
          youtubeVideoUrl: typeof profile.youtube_video_url === 'string' ? profile.youtube_video_url : "",
          customLinks: safeCustomLinks,
          products: Array.isArray((profile as any).products) ? (profile as any).products as Product[] : [],
          theme: safeTheme,
          wallets: (profile as any).wallets ? (profile as any).wallets : undefined,
          hasPremium: !!profile.has_premium,
          piWalletAddress: typeof profile.pi_wallet_address === 'string' ? profile.pi_wallet_address : "",
          piDonationMessage: typeof profile.pi_donation_message === 'string' ? profile.pi_donation_message : "",
          showShareButton: typeof profile.show_share_button === 'boolean' ? profile.show_share_button : true,
          storeUrl: typeof (profile as any).store_url === 'string' ? (profile as any).store_url : "",
          showPiWalletTips: !!(profile as any).show_pi_wallet_tips,
          socialLinks: Array.isArray((profile as any).social_links) ? (profile as any).social_links as SocialLinks : [],
          paymentLinks: Array.isArray((profile as any).payment_links) ? (profile as any).payment_links as PaymentLink[] : [],
          shortenedLinks: Array.isArray((profile as any).shortened_links) ? (profile as any).shortened_links as ShortenedLink[] : [],
          linkLayoutType:
            typeof profile.theme_settings === 'object' &&
            profile.theme_settings !== null &&
            !Array.isArray(profile.theme_settings) &&
            'linkLayoutType' in profile.theme_settings &&
            typeof (profile.theme_settings as any).linkLayoutType === 'string'
              ? (profile.theme_settings as any).linkLayoutType as string
              : "stack",
          piWalletQrUrl: typeof (profile as any).pi_wallet_qr_url === 'string' ? (profile as any).pi_wallet_qr_url : "",
        }));
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!isAuthenticated || !piUser) {
        toast.error("You must be logged in with Pi");
        navigate("/auth");
        return;
      }

      if (!profileData.businessName || !profileData.username) {
        toast.error("Business name and username are required");
        setSaving(false);
        return;
      }

      // Sanitize username
      const sanitizedUsername = profileData.username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: profileData.businessName,
          username: sanitizedUsername,
          description: profileData.description,
          logo: profileData.logo,
        })
        .eq("username", piUser.username);

      if (error) {
        if (error.code === "23505") {
          toast.error("This username is already taken");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Profile updated successfully!");
      setProfileData({ ...profileData, username: sanitizedUsername });
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    // If not authenticated, show a sign-in prompt
    if (!isAuthenticated || !piUser) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <p className="text-lg font-semibold">You must sign in with Pi Network to access your profile.</p>
          <Button onClick={() => window.location.href = '/auth'}>Sign in with Pi Network</Button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="py-8">
        <PhonePreview profile={profileData} />
      </div>
    </div>
  );
};

export default Profile;
