import { 
  User,
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
  Globe,
  CreditCard,
  DollarSign,
  Gift,
  Users,
  Pi,
  Wallet,
  QrCode,
  Copy
} from "lucide-react";
import { 
  FaTwitter, 
  FaInstagram, 
  FaYoutube, 
  FaSpotify, 
  FaFacebook, 
  FaLinkedin, 
  FaTwitch
} from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { toast } from "sonner";
import { ProfileData } from "@/types/profile";

import type { ThemeData } from "@/types/profile";
interface PhonePreviewProps {
  profile: ProfileData;
}

export const PhonePreview = ({ profile }: PhonePreviewProps) => {
  const iconRadius = profile.theme?.iconStyle === 'circle' ? 'rounded-full' : 
                     profile.theme?.iconStyle === 'square' ? 'rounded-lg' : 'rounded-2xl';
  
  const buttonStyle = profile.theme?.buttonStyle || 'filled';

  const socialLinkData = [
    { key: 'twitter', icon: FaTwitter, url: Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === 'twitter')?.url : undefined },
    { key: 'instagram', icon: FaInstagram, url: Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === 'instagram')?.url : undefined },
    { key: 'youtube', icon: FaYoutube, url: Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === 'youtube')?.url : undefined },
    { key: 'tiktok', icon: FaSpotify, url: Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === 'tiktok')?.url : undefined },
    { key: 'facebook', icon: FaFacebook, url: Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === 'facebook')?.url : undefined },
    { key: 'linkedin', icon: FaLinkedin, url: Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === 'linkedin')?.url : undefined },
    { key: 'twitch', icon: FaTwitch, url: Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === 'twitch')?.url : undefined },
    { key: 'website', icon: Globe, url: Array.isArray(profile.socialLinks) ? profile.socialLinks.find(l => l.type === 'website')?.url : undefined },
  ].filter(link => link.url);

  const getButtonStyles = () => {
    const baseStyles = "w-full py-3 px-4 rounded-xl font-medium text-sm transition-all";
    const primaryColor = profile.theme?.primaryColor || '#3b82f6';
    
    if (buttonStyle === 'outlined') {
      return {
        className: `${baseStyles} bg-transparent text-white`,
        style: { border: `2px solid ${primaryColor}` }
      };
    } else if (buttonStyle === 'minimal') {
      return {
        className: `${baseStyles} bg-muted text-foreground border border-border`,
        style: {}
      };
    } else {
      return {
        className: `${baseStyles} text-white`,
        style: { backgroundColor: primaryColor }
      };
    }
  };

  const getCustomLinkIcon = (iconValue?: string) => {
    const iconProps = { className: "w-4 h-4" };
    switch (iconValue) {
      case "shop": return <ShoppingBag {...iconProps} />;
      case "mail": return <Mail {...iconProps} />;
      case "phone": return <Phone {...iconProps} />;
      case "calendar": return <Calendar {...iconProps} />;
      case "download": return <Download {...iconProps} />;
      case "external": return <ExternalLink {...iconProps} />;
      case "heart": return <Heart {...iconProps} />;
      case "star": return <Star {...iconProps} />;
      case "zap": return <Zap {...iconProps} />;
      default: return <LinkIcon {...iconProps} />;
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'product': return <ShoppingBag className="w-4 h-4" />;
      case 'donation': return <Gift className="w-4 h-4" />;
      case 'tip': return <DollarSign className="w-4 h-4" />;
      case 'subscription': return <CreditCard className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      default: return <Pi className="w-4 h-4" />;
    }
  };

  const formatPiAmount = (amount: number) => {
    return `π ${amount.toFixed(2)}`;
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

  return (
    <div className="relative w-[280px] h-[570px] rounded-[3rem] border-[10px] border-foreground/20 shadow-2xl overflow-hidden"
         style={
           (profile.theme?.backgroundType === 'gif' && profile.theme?.backgroundGif) || (profile.theme?.backgroundType === 'video' && profile.theme?.backgroundVideo)
             ? {}
             : { backgroundColor: profile.theme?.backgroundColor || '#000000' }
         }>

      {/* Video Background for Phone Preview */}
      {profile.theme?.backgroundType === 'video' && profile.theme?.backgroundVideo && (
        <div className="absolute inset-0 z-0">
          <video
            src={profile.theme.backgroundVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ objectFit: 'cover' }}
            onError={(e) => {
              console.log('Video background failed to load:', profile.theme?.backgroundVideo);
              (e.target as HTMLVideoElement).style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.backgroundColor = profile.theme?.backgroundColor || '#000000';
              }
            }}
            onLoadedData={() => {
              console.log('Video background loaded successfully:', profile.theme?.backgroundVideo);
            }}
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
      )}

      {/* GIF Background for Phone Preview */}
      {profile.theme?.backgroundType === 'gif' && profile.theme?.backgroundGif && (
        <div className="absolute inset-0 z-0">
          <img
            src={profile.theme.backgroundGif}
            alt="Background"
            className="w-full h-full object-cover"
            style={{ objectFit: 'cover' }}
            onError={(e) => {
              console.log('GIF background failed to load:', profile.theme?.backgroundGif);
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.backgroundColor = profile.theme?.backgroundColor || '#000000';
              }
              // Show fallback message
              const fallback = document.createElement('div');
              fallback.className = 'absolute inset-0 flex items-center justify-center text-white bg-black/60';
              fallback.innerText = 'Failed to load GIF';
              parent?.appendChild(fallback);
            }}
            onLoad={() => {
              console.log('GIF background loaded successfully:', profile.theme?.backgroundGif);
            }}
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
      )}
      
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground/20 rounded-b-3xl z-10" />
      
      {/* Phone Screen Content */}
      <div className="h-full overflow-y-auto pt-8 px-6 pb-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo */}
          <div className={`w-20 h-20 ${iconRadius} bg-muted border border-border flex items-center justify-center overflow-hidden`}>
            {profile.logo ? (
              <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-white/70" />
            )}
          </div>

          {/* Business Name */}
          <h1 className="text-lg font-bold px-4 text-white">
            {profile.businessName || "YOUR BUSINESS NAME"}
          </h1>

          {/* Description */}
          {profile.description && (
            <p className="text-sm text-white/80 px-4 leading-relaxed">
              {profile.description}
            </p>
          )}

          {/* YouTube Video */}
          {profile.youtubeVideoUrl && extractYouTubeVideoId(profile.youtubeVideoUrl) && (
            <div className="w-full">
              <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg bg-muted">
                <div className="absolute inset-0 flex items-center justify-center">
                  <FaYoutube className="w-8 h-8 text-white/50" />
                </div>
              </div>
            </div>
          )}

          {/* Social Links */}
          {socialLinkData.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {socialLinkData.map(({ key, icon: Icon }) => (
                <div
                  key={key}
                  className={`w-10 h-10 ${iconRadius} flex items-center justify-center transition-smooth cursor-pointer`}
                  style={{ 
                    backgroundColor: profile.theme?.primaryColor || '#3b82f6',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              ))}
            </div>
          )}

          {/* Custom Links */}
          {profile.customLinks && profile.customLinks.length > 0 && (
            <div className="w-full pt-2">
              {(() => {
                const visibleLinks = profile.customLinks.filter(link => link.isVisible !== false);
                const layoutType = profile.linkLayoutType || 'stack';
                
                // Sort links by priority
                const sortedLinks = [...visibleLinks].sort((a, b) => (a.priority || 0) - (b.priority || 0));
                
                const renderLink = (link: typeof profile.customLinks[0], layoutClass?: string) => {
                  const customStyle = link.customStyling;
                  const hasCustomStyling = customStyle && customStyle.backgroundColor;
                  const displayStyle = link.displayStyle || 'classic';
                  
                  // Enhanced display styles based on layout
                  const getDisplayClassName = () => {
                    let baseClass = layoutClass || '';
                    
                    if (displayStyle === 'featured') {
                      return `${baseClass} p-6 rounded-xl shadow-lg border-2 border-yellow-400/30 bg-gradient-to-r from-yellow-50/10 to-orange-50/10`;
                    } else if (displayStyle === 'animated') {
                      return `${baseClass} p-4 rounded-lg animate-pulse hover:animate-bounce transition-all duration-300 shadow-md border border-blue-400/50`;
                    } else {
                      return `${baseClass} p-3 rounded-lg transition-all duration-200 hover:scale-105`;
                    }
                  };
                  
                  const iconSize = layoutType === 'showcase' || displayStyle === 'featured' ? 'w-10 h-10' : 
                                 layoutType === 'grid' ? 'w-6 h-6' : 'w-8 h-8';
                  const textSize = layoutType === 'showcase' || displayStyle === 'featured' ? 'text-base' : 'text-sm';
                  const padding = layoutType === 'carousel' ? 'p-2' : layoutType === 'showcase' ? 'p-4' : 'p-3';
                  
                  return (
                    <button
                      key={link.id}
                      className={`${getDisplayClassName()} flex items-center gap-3 relative ${
                        hasCustomStyling ? '' : getButtonStyles().className
                      } ${padding}`}
                      style={hasCustomStyling ? {
                        backgroundColor: customStyle.backgroundColor || link.color || '#3b82f6',
                        color: link.textColor || '#ffffff',
                        borderRadius: `${customStyle.borderRadius || 8}px`,
                        fontSize: `${customStyle.fontSize || (displayStyle === 'featured' ? 18 : 14)}px`,
                        fontWeight: customStyle.fontWeight || (displayStyle === 'featured' ? 600 : 500),
                        borderColor: customStyle.borderColor || 'transparent',
                        animation: customStyle.animation === 'pulse' ? 'pulse 2s infinite' :
                                 customStyle.animation === 'bounce' ? 'bounce 1s infinite' :
                                 customStyle.animation === 'glow' ? 'glow 2s infinite' :
                                 displayStyle === 'animated' ? 'pulse 2s infinite' : 'none'
                      } : {
                        backgroundColor: link.color || '#3b82f6',
                        color: link.textColor || '#ffffff'
                      }}
                    >
                      {/* Icon/Favicon */}
                      <div className={`flex-shrink-0 ${iconSize} flex items-center justify-center rounded-lg ${displayStyle === 'featured' ? 'bg-white/20' : 'bg-white/10'}`}>
                        {link.favicon ? (
                          <img 
                            src={link.favicon} 
                            alt="" 
                            className={`${iconSize} rounded object-cover shadow-sm`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        {(!link.favicon || true) && (
                          <div className={`${link.favicon ? 'hidden' : ''} ${displayStyle === 'featured' ? 'text-xl' : 'text-base'}`}>
                            {link.icon && (link.icon.length <= 2) ? link.icon : getCustomLinkIcon(link.icon)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 text-left min-w-0 ${layoutType === 'carousel' ? 'hidden sm:block' : ''}`}>
                        <div className={`font-medium truncate ${textSize} ${displayStyle === 'featured' ? 'mb-1' : ''}`}>
                          {link.title || "Untitled Link"}
                        </div>
                        {link.description && layoutType !== 'carousel' && (
                          <div className={`text-xs opacity-80 mt-1 ${displayStyle === 'featured' || layoutType === 'showcase' ? 'line-clamp-2' : 'truncate'}`}>
                            {link.description}
                          </div>
                        )}
                        {displayStyle === 'featured' && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs opacity-70">Featured</span>
                          </div>
                        )}
                      </div>

                      {/* Preview Image */}
                      {link.image && layoutType !== 'carousel' && (
                        <div className={`flex-shrink-0 ${displayStyle === 'featured' ? 'w-12 h-12' : 'w-8 h-8'}`}>
                          <img 
                            src={link.image} 
                            alt="" 
                            className={`w-full h-full rounded object-cover shadow-sm ${displayStyle === 'featured' ? 'border border-white/20' : ''}`}
                          />
                        </div>
                      )}

                      {/* Style Indicators */}
                      {displayStyle === 'animated' && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                      )}
                      {link.category === 'commerce' && (
                        <div className="absolute top-1 left-1">
                          <ShoppingBag className="w-3 h-3 text-green-400" />
                        </div>
                      )}
                    </button>
                  );
                };
                
                // Render based on layout type
                if (layoutType === 'grid') {
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {sortedLinks.map(link => renderLink(link, 'w-full'))}
                    </div>
                  );
                } else if (layoutType === 'carousel') {
                  return (
                    <div className="relative">
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {sortedLinks.map(link => renderLink(link, 'flex-shrink-0 w-32 sm:w-40'))}
                      </div>
                      {sortedLinks.length > 3 && (
                        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
                      )}
                    </div>
                  );
                } else if (layoutType === 'showcase') {
                  return (
                    <div className="space-y-3">
                      {sortedLinks.slice(0, 3).map(link => renderLink(link, 'w-full border-2 shadow-sm'))}
                      {sortedLinks.length > 3 && (
                        <div className="text-center py-2">
                          <Badge variant="secondary" className="text-xs">
                            +{sortedLinks.length - 3} more links
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // Stack layout (default)
                  return (
                    <div className="space-y-2">
                      {sortedLinks.map(link => renderLink(link, 'w-full'))}
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Payment Checkout Links */}
          {profile.paymentLinks && profile.paymentLinks.filter(link => link.active).length > 0 && (
            <div className="w-full space-y-2 pt-4">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <CreditCard className="w-4 h-4" />
                <span>Payment Links ({profile.paymentLinks.filter(link => link.active).length})</span>
              </div>
              {profile.paymentLinks.filter(link => link.active).slice(0, 3).map((link) => (
                <button
                  key={link.id}
                  {...getButtonStyles()}
                  className={`${getButtonStyles().className} flex items-center justify-between gap-2 group hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex items-center gap-2">
                    {getPaymentIcon(link.type)}
                    <span className="truncate">{link.description}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">{formatPiAmount(link.amount)}</span>
                    <Pi className="w-3 h-3" />
                  </div>
                </button>
              ))}
              {profile.paymentLinks.filter(link => link.active).length > 3 && (
                <p className="text-[10px] text-white/60 text-center">
                  +{profile.paymentLinks.filter(link => link.active).length - 3} more payment options
                </p>
              )}
            </div>
          )}

          {/* Products Preview */}
          {profile.products && profile.products.length > 0 && (
            <div className="w-full space-y-3 pt-4">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <ShoppingBag className="w-4 h-4" />
                <span>Products ({profile.products.length})</span>
              </div>
              {profile.products.slice(0, 2).map((product) => (
                <div 
                  key={product.id}
                  className="bg-muted border border-border rounded-xl p-3 text-left"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-semibold text-white truncate">{product.title || "Untitled"}</h4>
                    <span className="text-xs font-bold text-white/90">{product.price ? product.price : "0"}</span>
                  </div>
                  <p className="text-[10px] text-white/70 line-clamp-2">{product.description || "No description"}</p>
                </div>
              ))}
              {profile.products.length > 2 && (
                <p className="text-[10px] text-white/60">+{profile.products.length - 2} more</p>
              )}
            </div>
          )}


          {/* Pi Wallet QR Code and Tip Section (always visible if wallet set) */}
          {profile.piWalletAddress && (
            <div className="w-full flex flex-col items-center pt-6 pb-2">
              <div className="relative w-[120px] h-[120px] mb-2">
                {/* QR code with Droplink logo overlay */}
                <QRCodeDisplay value={profile.piWalletAddress} size={120} />
                <img
                  src="/droplink-logo.png"
                  alt="Droplink Logo"
                  className="absolute left-1/2 top-1/2 w-10 h-10 -translate-x-1/2 -translate-y-1/2 shadow-lg border-2 border-white bg-white rounded-lg"
                  style={{ pointerEvents: 'none' }}
                />
              </div>
              <div className="text-xs text-white/80 text-center break-all mb-1">{profile.piWalletAddress}</div>
              <div className="text-xs text-sky-300 text-center">Tip Pi or DROP</div>
            </div>
          )}

          {/* Droplink Branding */}
          {!profile.hasPremium && profile.storeUrl && (
            <div className="w-full pt-6 pb-2 text-center">
              <p className="text-xs text-white/50">
                Join {profile.storeUrl} on <span className="text-sky-400">Droplink</span>
              </p>
            </div>
          )}

          {/* Placeholder when empty */}
          {!profile.businessName && !profile.description && socialLinkData.length === 0 && profile.products?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-white/70">
                Start customizing your profile to see changes here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
