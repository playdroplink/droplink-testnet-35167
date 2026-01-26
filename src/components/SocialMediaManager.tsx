/**
 * Comprehensive Social Media Manager Component
 * Allows users to select and add links for all major social platforms
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { SOCIAL_PLATFORMS, getPlatformsByCategory, type SocialPlatform } from '@/config/socialPlatforms';
import type { SocialLink } from '@/types/profile';

// Import all social icons
import { 
  FaInstagram, FaFacebook, FaYoutube, FaGlobe, FaLinkedin, FaTiktok, FaTwitch, FaXTwitter,
  FaSnapchat, FaDiscord, FaTelegram, FaWhatsapp, FaReddit, FaPinterest, FaGithub,
  FaSpotify, FaSoundcloud, FaPatreon, FaMedium, FaBehance, FaDribbble, FaEtsy,
  FaAmazon, FaShopify, FaStackOverflow, FaBandcamp, FaApple, FaVimeo
} from "react-icons/fa6";
import { 
  SiThreads, SiBluesky, SiMastodon, SiKick, SiGitlab, SiDeviantart, 
  SiSubstack, SiOnlyfans, SiClubhouse, SiLinktree, SiSlack
} from "react-icons/si";
import { Mail, Phone } from 'lucide-react';

interface SocialMediaManagerProps {
  socialLinks: SocialLink[];
  onChange: (links: SocialLink[]) => void;
  maxLinks?: number; // Optional limit based on subscription plan
}

export function SocialMediaManager({ socialLinks, onChange, maxLinks }: SocialMediaManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('social');

  // Get icon component for platform
  const getPlatformIcon = (platformId: string) => {
    const iconClass = "w-5 h-5";
    switch (platformId) {
      // Social
      case 'instagram': return <FaInstagram className={iconClass} />;
      case 'twitter': return <FaXTwitter className={iconClass} />;
      case 'facebook': return <FaFacebook className={iconClass} />;
      case 'snapchat': return <FaSnapchat className={iconClass} />;
      case 'threads': return <SiThreads className={iconClass} />;
      case 'bluesky': return <SiBluesky className={iconClass} />;
      case 'mastodon': return <SiMastodon className={iconClass} />;
      case 'reddit': return <FaReddit className={iconClass} />;
      case 'clubhouse': return <SiClubhouse className={iconClass} />;
      
      // Professional
      case 'linkedin': return <FaLinkedin className={iconClass} />;
      case 'github': return <FaGithub className={iconClass} />;
      case 'gitlab': return <SiGitlab className={iconClass} />;
      case 'stackoverflow': return <FaStackOverflow className={iconClass} />;
      
      // Content
      case 'youtube': return <FaYoutube className={iconClass} />;
      case 'tiktok': return <FaTiktok className={iconClass} />;
      case 'twitch': return <FaTwitch className={iconClass} />;
      case 'kick': return <SiKick className={iconClass} />;
      case 'vimeo': return <FaVimeo className={iconClass} />;
      case 'pinterest': return <FaPinterest className={iconClass} />;
      
      // Messaging
      case 'whatsapp': return <FaWhatsapp className={iconClass} />;
      case 'telegram': return <FaTelegram className={iconClass} />;
      case 'discord': return <FaDiscord className={iconClass} />;
      case 'slack': return <SiSlack className={iconClass} />;
      
      // Creative
      case 'behance': return <FaBehance className={iconClass} />;
      case 'dribbble': return <FaDribbble className={iconClass} />;
      case 'deviantart': return <SiDeviantart className={iconClass} />;
      
      // Music
      case 'spotify': return <FaSpotify className={iconClass} />;
      case 'soundcloud': return <FaSoundcloud className={iconClass} />;
      case 'applemusic': return <FaApple className={iconClass} />;
      case 'bandcamp': return <FaBandcamp className={iconClass} />;
      
      // Content Creation
      case 'patreon': return <FaPatreon className={iconClass} />;
      case 'onlyfans': return <SiOnlyfans className={iconClass} />;
      case 'substack': return <SiSubstack className={iconClass} />;
      case 'medium': return <FaMedium className={iconClass} />;
      
      // Business
      case 'etsy': return <FaEtsy className={iconClass} />;
      case 'shopify': return <FaShopify className={iconClass} />;
      case 'amazon': return <FaAmazon className={iconClass} />;
      
      // Other
      case 'linktree': return <SiLinktree className={iconClass} />;
      case 'website': return <FaGlobe className={iconClass} />;
      case 'email': return <Mail className={iconClass} />;
      case 'phone': return <Phone className={iconClass} />;
      
      default: return <FaGlobe className={iconClass} />;
    }
  };

  const handleAddPlatform = (platform: SocialPlatform) => {
    // Check if platform already exists
    if (socialLinks.some(link => link.platform === platform.id)) {
      toast.error(`${platform.name} is already added`);
      return;
    }

    // Check max links limit
    if (maxLinks && socialLinks.length >= maxLinks) {
      toast.error(`You've reached the maximum of ${maxLinks} social links. Upgrade your plan for more.`);
      return;
    }

    const newLink: SocialLink = {
      platform: platform.id,
      type: platform.id, // for backward compatibility
      url: '',
      icon: platform.id,
      followers: 0
    };

    onChange([...socialLinks, newLink]);
    toast.success(`${platform.name} added successfully`);
    setIsAddDialogOpen(false);
  };

  const handleUpdateLink = (index: number, field: keyof SocialLink, value: any) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemoveLink = (index: number) => {
    const updated = socialLinks.filter((_, i) => i !== index);
    onChange(updated);
    toast.success('Social link removed');
  };

  const getPlatformName = (platformId?: string) => {
    const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
    return platform?.name || 'Unknown Platform';
  };

  const categoryLabels: Record<string, string> = {
    social: '🌟 Social',
    professional: '💼 Professional',
    content: '🎬 Content',
    messaging: '💬 Messaging',
    creative: '🎨 Creative',
    gaming: '🎮 Gaming',
    music: '🎵 Music'
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Social Media Links</h3>
          <p className="text-sm text-muted-foreground">
            Add your social media profiles
            {maxLinks && ` (${socialLinks.length}/${maxLinks} used)`}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Platform
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choose a Platform</DialogTitle>
              <DialogDescription>
                Select the social media platform you want to add
              </DialogDescription>
            </DialogHeader>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-1">
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="professional">Pro</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="messaging">Chat</TabsTrigger>
                <TabsTrigger value="creative">Art</TabsTrigger>
                <TabsTrigger value="gaming">Game</TabsTrigger>
                <TabsTrigger value="music">Music</TabsTrigger>
              </TabsList>

              {['social', 'professional', 'content', 'messaging', 'creative', 'gaming', 'music'].map(category => (
                <TabsContent key={category} value={category} className="space-y-2 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getPlatformsByCategory(category as any).map(platform => {
                      const isAdded = socialLinks.some(link => link.platform === platform.id);
                      return (
                        <Button
                          key={platform.id}
                          variant={isAdded ? "secondary" : "outline"}
                          className="justify-start h-auto py-3 px-4"
                          onClick={() => !isAdded && handleAddPlatform(platform)}
                          disabled={isAdded}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${platform.color}20` }}
                            >
                              {getPlatformIcon(platform.id)}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium">{platform.name}</div>
                              {isAdded && (
                                <div className="text-xs text-muted-foreground">Already added</div>
                              )}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Links */}
      {socialLinks.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-2">No social media links added yet</p>
          <p className="text-sm text-muted-foreground">Click "Add Platform" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {socialLinks.map((link, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              {/* Platform Icon */}
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: `${SOCIAL_PLATFORMS.find(p => p.id === link.platform)?.color || '#6B7280'}20` 
                }}
              >
                {getPlatformIcon(link.platform || link.type || 'website')}
              </div>

              {/* Platform Name */}
              <div className="min-w-[100px] flex-shrink-0">
                <Label className="text-sm font-medium">
                  {getPlatformName(link.platform || link.type)}
                </Label>
              </div>

              {/* URL Input */}
              <Input
                value={link.url}
                onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                placeholder={SOCIAL_PLATFORMS.find(p => p.id === link.platform)?.placeholder || 'Enter URL'}
                className="flex-1"
              />

              {/* Followers Input */}
              <Input
                type="number"
                value={link.followers || ''}
                onChange={(e) => handleUpdateLink(index, 'followers', parseInt(e.target.value) || 0)}
                placeholder="Followers"
                className="w-28"
              />

              {/* Actions */}
              <div className="flex items-center gap-2">
                {link.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                  >
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLink(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {socialLinks.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">
            {socialLinks.length} platform{socialLinks.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary">
            {socialLinks.filter(l => l.url).length} configured
          </Badge>
          {maxLinks && socialLinks.length >= maxLinks && (
            <Badge variant="destructive">
              Limit reached
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
