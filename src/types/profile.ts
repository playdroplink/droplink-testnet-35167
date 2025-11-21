// Shared types for consistent interface across components

export type LinkCategory = 'suggested' | 'commerce' | 'social' | 'media' | 'contact' | 'events' | 'text';
export type DisplayStyle = 'classic' | 'featured' | 'animated';
export type LayoutType = 'stack' | 'grid' | 'carousel' | 'showcase';
export type AnimationType = 'none' | 'bounce' | 'pulse' | 'glow';

export interface CustomLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
  favicon?: string;
  image?: string;
  color?: string;
  textColor?: string;
  category?: LinkCategory;
  isVisible?: boolean;
  priority?: number;
  displayStyle?: DisplayStyle;
  customStyling?: {
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
    fontSize?: number;
    fontWeight?: number;
    padding?: number;
    animation?: AnimationType;
  };
}

export interface SocialLinks {
  twitter: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  facebook: string;
  linkedin: string;
  twitch: string;
  website: string;
}

export interface ThemeData {
  primaryColor: string;
  backgroundColor: string;
  backgroundType: 'color' | 'gif';
  backgroundGif: string;
  iconStyle: string;
  buttonStyle: string;
}

export interface PaymentLink {
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

export interface Product {
  id: string;
  title: string;
  price: string;
  description: string;
  fileUrl: string;
}

export interface ShortenedLink {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  title?: string;
  description?: string;
  favicon?: string;
  image?: string;
  clicks: number;
  qrCode?: string;
  created: Date;
  active: boolean;
}

export interface ProfileData {
  logo: string;
  businessName: string;
  storeUrl: string;
  description: string;
  email?: string;
  piWalletAddress?: string;
  piDonationMessage?: string;
  youtubeVideoUrl?: string;
  socialLinks: SocialLinks;
  customLinks: CustomLink[];
  linkLayoutType?: LayoutType;
  theme: ThemeData;
  products: Product[];
  paymentLinks?: PaymentLink[];
  shortenedLinks?: ShortenedLink[];
  hasPremium?: boolean;
  showShareButton?: boolean;
}