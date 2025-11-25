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

export interface SocialLink {
  type: string; // e.g. 'twitter', 'instagram', etc.
  url: string;
  icon?: string; // icon name or url
  label?: string; // custom label
}

export type SocialLinks = SocialLink[];

export interface ThemeData {
  primaryColor: string;
  backgroundColor: string;
  backgroundType: 'color' | 'gif' | 'video';
  backgroundGif: string;
  backgroundVideo?: string;
  iconStyle: string;
  buttonStyle: string;
  textColor?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  quantity?: number;
  details?: string;
}

export interface CartItem extends ProductItem {
  cartQuantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paymentLink?: string;
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
  showPiWalletTips?: boolean;
  piWalletQrUrl?: string;
}