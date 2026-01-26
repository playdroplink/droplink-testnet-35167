import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Share2 } from "lucide-react";
import { FaXTwitter, FaInstagram, FaFacebook, FaYoutube, FaTiktok, FaTwitch, FaLinkedin, FaSnapchat, FaReddit, FaTelegram, FaWhatsapp, FaDiscord, FaPinterest, FaGithub, FaVimeo, FaGlobe } from "react-icons/fa6";
import { SiThreads, SiBluesky, SiMastodon, SiKick } from "react-icons/si";
import type { ProfileData, SocialEmbedItem } from "@/types/profile";
import { toast } from "sonner";

const getSocialIcon = (platform?: string) => {
  const p = (platform || "link").toLowerCase();
  if (["twitter", "x", "x.com"].includes(p)) return <FaXTwitter className="w-5 h-5" />;
  if (["instagram", "insta"].includes(p)) return <FaInstagram className="w-5 h-5" />;
  if (["facebook", "fb"].includes(p)) return <FaFacebook className="w-5 h-5" />;
  if (["youtube", "yt"].includes(p)) return <FaYoutube className="w-5 h-5" />;
  if (["tiktok"].includes(p)) return <FaTiktok className="w-5 h-5" />;
  if (["twitch"].includes(p)) return <FaTwitch className="w-5 h-5" />;
  if (["kick"].includes(p)) return <SiKick className="w-5 h-5" />;
  if (["linkedin"].includes(p)) return <FaLinkedin className="w-5 h-5" />;
  if (["threads"].includes(p)) return <SiThreads className="w-5 h-5" />;
  if (["bluesky", "bsky"].includes(p)) return <SiBluesky className="w-5 h-5" />;
  if (["mastodon"].includes(p)) return <SiMastodon className="w-5 h-5" />;
  if (["snapchat", "snap"].includes(p)) return <FaSnapchat className="w-5 h-5" />;
  if (["reddit"].includes(p)) return <FaReddit className="w-5 h-5" />;
  if (["telegram"].includes(p)) return <FaTelegram className="w-5 h-5" />;
  if (["whatsapp", "wa"].includes(p)) return <FaWhatsapp className="w-5 h-5" />;
  if (["discord"].includes(p)) return <FaDiscord className="w-5 h-5" />;
  if (["pinterest"].includes(p)) return <FaPinterest className="w-5 h-5" />;
  if (["github"].includes(p)) return <FaGithub className="w-5 h-5" />;
  if (["vimeo"].includes(p)) return <FaVimeo className="w-5 h-5" />;
  if (["website", "site", "web"].includes(p)) return <FaGlobe className="w-5 h-5" />;
  return <ExternalLink className="w-5 h-5" />;
};

const normalizeSocialFeed = (feed: any): SocialEmbedItem[] => {
  if (!Array.isArray(feed)) return [];
  return feed
    .filter((item) => item && (item.url || item.embedHtml || (item as any).embed_html))
    .map((item, idx) => ({
      id: item.id || `feed-${idx}-${Date.now()}`,
      platform: item.platform || item.type || item.source || "Social",
      url: item.url,
      embedHtml: item.embedHtml || (item as any).embed_html,
      title: item.title || item.caption || item.description,
      pinned: item.pinned ?? true,
      thumbnail: item.thumbnail || item.image,
    }));
};

const ProfileFeed = () => {
  const { username: rawUsername } = useParams();
  const navigate = useNavigate();
  const username = rawUsername?.startsWith("@") ? rawUsername.slice(1) : rawUsername;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [socialFeedItems, setSocialFeedItems] = useState<SocialEmbedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadProfile = async () => {
    if (!username) return;
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*, theme_settings")
        .eq("username", username)
        .maybeSingle();
      if (error || !profileData) {
        setNotFound(true);
        return;
      }

      const themeSettings = (profileData as any).theme_settings || {};
      const feed = normalizeSocialFeed(
        themeSettings.socialFeedItems ||
        (profileData as any).social_feed ||
        (profileData as any).pinned_posts
      );

      const socialLinksArr = Array.isArray(profileData.social_links)
        ? profileData.social_links.filter((l: any) => l.url && l.url.trim()).map((l: any) => ({ platform: l.type || l.platform, url: l.url }))
        : [];

      setProfile({
        id: profileData.id,
        username: profileData.username,
        email: "",
        logo: profileData.logo,
        businessName: profileData.business_name,
        description: profileData.description,
        youtubeVideoUrl: profileData.youtube_video_url,
        backgroundMusicUrl: (profileData as any).background_music_url,
        socialLinks: socialLinksArr,
        customLinks: (themeSettings as any).customLinks || [],
        imageLinkCards: (themeSettings as any).imageLinkCards || [],
        theme: {
          primaryColor: themeSettings.primaryColor || "#38bdf8",
          backgroundColor: themeSettings.backgroundColor || "#000000",
          backgroundType: themeSettings.backgroundType || "color",
          backgroundGif: themeSettings.backgroundGif || "",
          backgroundVideo: themeSettings.backgroundVideo || "",
          iconStyle: themeSettings.iconStyle || "rounded",
          buttonStyle: themeSettings.buttonStyle || "filled",
          glassMode: themeSettings.glassMode ?? false,
          coverImage: themeSettings.coverImage || "",
          textColor: themeSettings.textColor,
        },
        wallets: { crypto: [], bank: [] },
        hasPremium: profileData.has_premium || false,
        piWalletAddress: profileData.pi_wallet_address || "",
        piDonationMessage: profileData.pi_donation_message || "",
        showShareButton: (profileData as any).show_share_button !== false,
        storeUrl: `@${profileData.username}`,
        showPiWalletTips: themeSettings.showPiWalletTips ?? true,
        card_front_color: (profileData as any).card_front_color || "#2bbdee",
        card_back_color: (profileData as any).card_back_color || "#2bbdee",
        card_text_color: (profileData as any).card_text_color || "#000000",
        card_accent_color: (profileData as any).card_accent_color || "#fafafa",
        isVerified: (profileData as any).is_verified || false,
      });
      setSocialFeedItems(feed);
    } catch (err) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [username]);

  const bgStyle = useMemo(() => {
    if (!profile) return {};
    if (profile.theme?.backgroundType === "gif" && profile.theme.backgroundGif) {
      return { backgroundImage: `url(${profile.theme.backgroundGif})`, backgroundSize: "cover", backgroundPosition: "center" };
    }
    if (profile.theme?.backgroundType === "video" && profile.theme.backgroundVideo) {
      return {};
    }
    return { backgroundColor: profile.theme?.backgroundColor || "#000" };
  }, [profile]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading feed...</div>;
  if (notFound || !profile) return <div className="min-h-screen flex items-center justify-center text-white">Profile not found</div>;

  return (
    <div className="min-h-screen text-white" style={bgStyle}>
      {profile.theme?.backgroundType === "video" && profile.theme.backgroundVideo && (
        <video
          src={profile.theme.backgroundVideo}
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover"
        />
      )}
      <div className="relative z-10 flex flex-col items-center px-4 pb-16" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.9) 100%)" }}>
        <div className="w-full max-w-3xl text-center pt-16 space-y-4">
          <button onClick={() => navigate(-1)} className="text-sm text-white/70 hover:text-white">← Back</button>
          {profile.logo && (
            <div className="mx-auto w-28 h-28 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/20">
              <img src={profile.logo} alt={profile.businessName} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-4xl font-bold drop-shadow-lg flex items-center justify-center gap-2">{profile.businessName || profile.username}</h1>
            <p className="text-white/80">@{profile.username}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {(profile.socialLinks || []).map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition"
              >
                <span className="text-white text-lg">{getSocialIcon(link.platform)}</span>
              </a>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button
              variant="ghost"
              className="gap-2 text-white/90 border border-white/20 bg-white/5 hover:bg-white/10"
              onClick={() => navigate(`/@${profile.username}`)}
            >
              <Share2 className="w-4 h-4" />
              Public Bio
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-white/80 border border-white/20 bg-white/0 hover:bg-white/10"
              onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast.success("Feed link copied"))}
            >
              <ExternalLink className="w-4 h-4" />
              Copy Feed Link
            </Button>
          </div>
        </div>

        <div className="w-full max-w-3xl mt-10 space-y-4">
          {socialFeedItems.length === 0 && (
            <div className="border border-dashed border-white/20 rounded-xl p-4 text-center text-white/70 bg-white/5">
              No feed posts yet.
            </div>
          )}
          {socialFeedItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/15 bg-black/30 backdrop-blur-sm p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white text-xl">
                  {getSocialIcon(item.platform)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">{item.platform || "Social"}</p>
                  <p className="text-white font-semibold truncate">{item.title || item.url || "Pinned post"}</p>
                </div>
                {item.pinned && (
                  <span className="text-xs px-2 py-1 rounded-full bg-white/15 text-white/80 border border-white/20">Pinned</span>
                )}
              </div>
              {item.embedHtml ? (
                <div
                  className="rounded-lg overflow-hidden bg-white/5 border border-white/10"
                  dangerouslySetInnerHTML={{ __html: item.embedHtml }}
                />
              ) : (
                <div className="rounded-lg overflow-hidden bg-white/5 border border-white/10">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.title || "post"} className="w-full h-56 object-cover" />
                  )}
                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="text-white/80 text-sm truncate">{item.url || "No link available"}</div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20"
                      >
                        Open
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {profile.piWalletAddress && profile.showPiWalletTips !== false && (
        <div className="fixed bottom-4 right-4 bg-black/70 border border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-xl backdrop-blur">
          <QRCodeSVG value={profile.piWalletAddress} size={64} bgColor="#fff" fgColor="#2563eb" />
          <div className="space-y-1">
            <p className="text-xs text-white/70">Send DROP / Pi</p>
            <p className="text-sm text-white font-semibold">{profile.piWalletAddress.slice(0, 6)}...{profile.piWalletAddress.slice(-4)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileFeed;
