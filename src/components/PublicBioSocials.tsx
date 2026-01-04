/**
 * Public Bio Social Links Component
 * Animated social media icons grid
 */

import { Link as LinkIcon } from "lucide-react";
import { FaInstagram, FaFacebook, FaYoutube, FaGlobe, FaLinkedin, FaTiktok, FaTwitch, FaSpotify, FaDiscord, FaPinterest, FaSnapchat, FaWhatsapp, FaTelegram, FaGithub } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";
import { cn } from "@/lib/utils";

interface SocialLink {
  platform: string;
  url: string;
}

interface PublicBioSocialsProps {
  links: SocialLink[];
  theme: {
    primaryColor: string;
    iconStyle: string;
  };
  onSocialClick?: (platform: string) => void;
}

const SOCIAL_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  twitter: { icon: <FaXTwitter className="w-5 h-5" />, color: '#000000', label: 'X / Twitter' },
  x: { icon: <FaXTwitter className="w-5 h-5" />, color: '#000000', label: 'X' },
  instagram: { icon: <FaInstagram className="w-5 h-5" />, color: '#E4405F', label: 'Instagram' },
  facebook: { icon: <FaFacebook className="w-5 h-5" />, color: '#1877F2', label: 'Facebook' },
  youtube: { icon: <FaYoutube className="w-5 h-5" />, color: '#FF0000', label: 'YouTube' },
  tiktok: { icon: <FaTiktok className="w-5 h-5" />, color: '#000000', label: 'TikTok' },
  linkedin: { icon: <FaLinkedin className="w-5 h-5" />, color: '#0A66C2', label: 'LinkedIn' },
  twitch: { icon: <FaTwitch className="w-5 h-5" />, color: '#9146FF', label: 'Twitch' },
  spotify: { icon: <FaSpotify className="w-5 h-5" />, color: '#1DB954', label: 'Spotify' },
  discord: { icon: <FaDiscord className="w-5 h-5" />, color: '#5865F2', label: 'Discord' },
  pinterest: { icon: <FaPinterest className="w-5 h-5" />, color: '#E60023', label: 'Pinterest' },
  snapchat: { icon: <FaSnapchat className="w-5 h-5" />, color: '#FFFC00', label: 'Snapchat' },
  whatsapp: { icon: <FaWhatsapp className="w-5 h-5" />, color: '#25D366', label: 'WhatsApp' },
  telegram: { icon: <FaTelegram className="w-5 h-5" />, color: '#26A5E4', label: 'Telegram' },
  github: { icon: <FaGithub className="w-5 h-5" />, color: '#181717', label: 'GitHub' },
  website: { icon: <FaGlobe className="w-5 h-5" />, color: '#4A90D9', label: 'Website' },
};

export const PublicBioSocials = ({ links, theme, onSocialClick }: PublicBioSocialsProps) => {
  if (!links || links.length === 0) return null;

  const validLinks = links.filter(link => link.url && link.url.trim() !== '');
  
  if (validLinks.length === 0) return null;

  const getIconStyle = (style: string) => {
    switch (style) {
      case "rounded": return "rounded-2xl";
      case "square": return "rounded-lg";
      case "circle": return "rounded-full";
      default: return "rounded-2xl";
    }
  };

  const getSocialInfo = (platform: string) => {
    const p = platform.toLowerCase().replace(/[.@]/g, '');
    return SOCIAL_ICONS[p] || { icon: <LinkIcon className="w-5 h-5" />, color: theme.primaryColor, label: platform };
  };

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {validLinks.map((link, index) => {
        const social = getSocialInfo(link.platform);
        
        return (
          <a
            key={`${link.platform}-${index}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onSocialClick?.(link.platform)}
            title={social.label}
            className={cn(
              "group w-14 h-14 flex items-center justify-center transition-all duration-300",
              "hover:scale-110 hover:shadow-xl active:scale-95",
              getIconStyle(theme.iconStyle)
            )}
            style={{ 
              backgroundColor: theme.primaryColor,
              animationDelay: `${index * 50}ms`
            }}
          >
            <span className="text-white transition-transform group-hover:scale-110">
              {social.icon}
            </span>
          </a>
        );
      })}
    </div>
  );
};
