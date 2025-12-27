import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Store, 
  Rocket, 
  Users, 
  Palette, 
  Code, 
  TrendingUp, 
  Heart,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

export const MerchantConfigModal = ({ children }: Props) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Store className="w-4 h-4" />
            Merchant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full px-4 sm:px-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-xl flex-wrap">
            <Store className="w-6 h-6 text-sky-500" />
            DropStore: Digital Marketplace Platform
            <Badge variant="secondary" className="bg-sky-500 text-white">
              Mainnet Live
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-hidden">
          {/* Vision Statement */}
          <Card className="bg-sky-50 border-sky-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-sky-500" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Droplink has evolved from a simple "link in bio" platform into a comprehensive 
                <strong> digital marketplace</strong> where businesses, artists, developers, and creators 
                build thriving online storefronts. We're powering the future of decentralized commerce 
                on Pi Network mainnet with blockchain technology.
              </p>
            </CardContent>
          </Card>

          {/* Who Can Build */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-500" />
              Who Can Build on Dropstore?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-sky-500">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    <span className="font-medium break-words">Businesses</span>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Retail stores, service providers, and startups can create professional storefronts</p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-sky-500">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    <span className="font-medium break-words">Artists & Creators</span>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Sell digital art, NFTs, music, and creative content directly to fans</p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-sky-500">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    <span className="font-medium break-words">Developers</span>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Offer software, apps, courses, and technical services through integrated payments</p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-sky-500">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    <span className="font-medium break-words">Entrepreneurs</span>
                  </div>
                  <p className="text-sm text-gray-600 break-words">Launch new products and services with built-in payment and marketing tools</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Coming Features */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-sky-500" />
              Platform Features
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden">
                <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <span className="text-sm break-words"><strong>Advanced Storefronts:</strong> Multi-product catalogs with inventory management</span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden">
                <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <span className="text-sm break-words"><strong>Marketplace Discovery:</strong> Browse and search all Dropstore stores</span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden">
                <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <span className="text-sm break-words"><strong>Pi Network Integration:</strong> Native Pi payments and DROP token rewards</span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden">
                <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <span className="text-sm break-words"><strong>Smart Contracts:</strong> Automated escrow and trustless transactions</span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden">
                <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <span className="text-sm break-words"><strong>Social Commerce:</strong> Reviews, ratings, and social sharing</span>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden">
                <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <span className="text-sm break-words"><strong>Analytics & Insights:</strong> Advanced sales and customer analytics</span>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <Card className="bg-sky-50 border-sky-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">Join Dropstore Marketplace</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Start selling on the live Dropstore marketplace! Build your storefront, accept Pi payments, 
                  and reach a global audience on Pi Network mainnet.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    className="gap-2" 
                    asChild
                  >
                    <a href="https://dropshops.space/" target="_blank" rel="noopener noreferrer">
                      <Store className="w-4 h-4" />
                      Start Selling
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2" 
                    onClick={() => {
                      setOpen(false);
                      navigate('/voting');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Vote on Features
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MerchantConfigModal;
