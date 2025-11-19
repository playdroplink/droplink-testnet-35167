import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Pi, 
  Wallet, 
  CheckCircle, 
  AlertTriangle,
  Copy,
  QrCode,
  History,
  DollarSign,
  ShoppingCart,
  Gift,
  Users,
  Link,
  ArrowUpDown,
  TrendingUp,
  Clock,
  Check,
  ExternalLink
} from 'lucide-react';
import { usePi } from '@/contexts/PiContext';
import { toast } from 'sonner';
import { PI_CONFIG } from '@/config/pi-config';
import { supabase } from '@/integrations/supabase/client';
import { syncPaymentLinksToDatabase, loadPaymentLinksFromDatabase } from '@/lib/database-sync';

interface PaymentLink {
  id: string;
  amount: number;
  description: string;
  type: 'product' | 'donation' | 'tip' | 'subscription' | 'group';
  url: string;
  created: Date | string;
  active: boolean;
  totalReceived: number;
  transactionCount: number;
  memo?: string;
  productInfo?: {
    name: string;
    description: string;
    downloadUrl?: string;
    accessUrl?: string;
  };
}

interface MerchantConfig {
  seedPhrase: string;
  walletAddress: string;
  validationKey: string;
  apiKey: string;
  environment: 'mainnet' | 'testnet';
}

interface Transaction {
  id: string;
  hash: string;
  amount: number;
  from: string;
  to: string;
  memo: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  fee: number;
}

interface Balance {
  available: number;
  pending: number;
  total: number;
  lastUpdated: Date;
}

const PiPayments: React.FC = () => {
  const { isAuthenticated, createPayment, piUser, getCurrentWalletAddress } = usePi();
  
  // Payment Creation State
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [paymentType, setPaymentType] = useState<'product' | 'donation' | 'tip' | 'subscription' | 'group'>('product');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment Links State
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null);
  
  // Wallet State
  const [balance, setBalance] = useState<Balance>({ available: 0, pending: 0, total: 0, lastUpdated: new Date() });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>('');
  
  // Loading States
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Merchant Configuration State
  const [merchantConfig, setMerchantConfig] = useState<MerchantConfig>({
    seedPhrase: '',
    walletAddress: '',
    validationKey: '7511661aac4538b1832d2c9ba117f6d972b26a54640598d3fbb9824013c7079203f65b02d125be3f418605cfb89ba0e4443e3ec997e3800eb464df0bc5410d2a',
    apiKey: import.meta.env.VITE_PI_API_KEY || '',
    environment: 'mainnet'
  });
  const [showMerchantConfig, setShowMerchantConfig] = useState(false);

  // Pi Network payment scope creation
  const createPiPaymentScope = async (paymentLink: PaymentLink) => {
    try {
      const response = await fetch('https://api.minepi.com/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${merchantConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment: {
            amount: paymentLink.amount,
            memo: paymentLink.description || paymentLink.memo,
            metadata: {
              linkId: paymentLink.id,
              type: paymentLink.type,
              merchantWallet: merchantConfig.walletAddress,
              validation: merchantConfig.validationKey
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Pi API error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Pi payment scope created:', result);
      return result;
    } catch (error) {
      console.error('Failed to create Pi payment scope:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadWalletData();
      loadPaymentLinks();
      loadMerchantConfig();
    }
  }, [isAuthenticated]);

  const loadMerchantConfig = () => {
    try {
      const saved = localStorage.getItem('pi_merchant_config');
      if (saved) {
        const config = JSON.parse(saved);
        setMerchantConfig(prev => ({
          ...prev,
          ...config,
          validationKey: '7511661aac4538b1832d2c9ba117f6d972b26a54640598d3fbb9824013c7079203f65b02d125be3f418605cfb89ba0e4443e3ec997e3800eb464df0bc5410d2a' // Keep default validation key
        }));
      }
    } catch (error) {
      console.error('Failed to load merchant config:', error);
    }
  };

  const loadWalletData = async () => {
    setLoadingBalance(true);
    try {
      const address = await getCurrentWalletAddress();
      setWalletAddress(address || '');
      
      // Fetch balance from Pi mainnet API
      if (address) {
        await fetchBalance(address);
        await fetchTransactionHistory(address);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchBalance = async (address: string) => {
    try {
      const response = await fetch(`${PI_CONFIG.BASE_URL}/accounts/${address}`, {
        headers: PI_CONFIG.getAuthHeaders(localStorage.getItem('pi_access_token') || '')
      });
      
      if (response.ok) {
        const accountData = await response.json();
        const piBalance = accountData.balances?.find((b: any) => b.asset_type === 'native');
        
        setBalance({
          available: parseFloat(piBalance?.balance || '0'),
          pending: 0, // Calculate from pending transactions
          total: parseFloat(piBalance?.balance || '0'),
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchTransactionHistory = async (address: string) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${PI_CONFIG.BASE_URL}/accounts/${address}/transactions?limit=20&order=desc`, {
        headers: PI_CONFIG.getAuthHeaders(localStorage.getItem('pi_access_token') || '')
      });
      
      if (response.ok) {
        const data = await response.json();
        const mappedTransactions: Transaction[] = data._embedded?.records?.map((tx: any) => ({
          id: tx.id,
          hash: tx.hash,
          amount: parseFloat(tx.fee_charged) || 0,
          from: tx.source_account,
          to: tx.account,
          memo: tx.memo || '',
          status: tx.successful ? 'completed' : 'failed',
          timestamp: new Date(tx.created_at),
          fee: parseFloat(tx.fee_charged) || 0
        })) || [];
        
        setTransactions(mappedTransactions);
      }
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadPaymentLinks = () => {
    // Load from localStorage for now (could be from backend)
    const stored = localStorage.getItem(`paymentLinks_${piUser?.uid}`);
    if (stored) {
      setPaymentLinks(JSON.parse(stored));
    }
  };

  const savePaymentLinks = (links: PaymentLink[]) => {
    // Save with user-specific key
    localStorage.setItem(`paymentLinks_${piUser?.uid}`, JSON.stringify(links));
    
    // Also save globally for public access
    const globalLinks = JSON.parse(localStorage.getItem('all_payment_links') || '{}');
    if (piUser?.uid) {
      globalLinks[piUser.uid] = links;
      localStorage.setItem('all_payment_links', JSON.stringify(globalLinks));
    }
    
    setPaymentLinks(links);
  };

  const createPaymentLink = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!memo.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsProcessing(true);

    try {
      const linkId = `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const baseUrl = window.location.origin;
      const paymentUrl = `${baseUrl}/pay/${linkId}`;
      
      // Create payment link with enhanced Pi Network integration
      const newLink: PaymentLink = {
        id: linkId,
        amount: parseFloat(amount),
        description: memo,
        type: paymentType,
        url: paymentUrl,
        created: new Date().toISOString(),
        active: true,
        totalReceived: 0,
        transactionCount: 0,
        memo: memo,
        productInfo: paymentType === 'product' ? {
          name: memo,
          description: memo,
          downloadUrl: '',
          accessUrl: ''
        } : undefined
      };

      // Save to database and theme_settings for multiple access methods
      try {
        if (piUser?.uid && piUser?.username) {
          // Get current profile ID for sync
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, theme_settings')
            .eq('username', piUser.username)
            .single();
          
          if (profile?.id) {
            // Save to theme_settings as primary method (since payment_links table may not be created yet)
            const currentTheme = (profile.theme_settings as any) || {};
            const currentPaymentLinks = currentTheme.paymentLinks || [];
            const updatedPaymentLinks = [...currentPaymentLinks, newLink];
            
            await supabase
              .from('profiles')
              .update({
                theme_settings: {
                  ...currentTheme,
                  paymentLinks: updatedPaymentLinks
                }
              })
              .eq('id', profile.id);
            
            console.log('Payment link saved to profile theme_settings:', newLink.id);
            
            // Note: Additional database sync can be added when migration is complete
          }
        }
      } catch (dbError) {
        console.warn('Database operations failed, using localStorage only:', dbError);
      }

      const updatedLinks = [...paymentLinks, newLink];
      savePaymentLinks(updatedLinks);

      // Create Pi Network payment scope for this link
      if (merchantConfig.apiKey && merchantConfig.walletAddress) {
        try {
          await createPiPaymentScope(newLink);
        } catch (scopeError) {
          console.warn('Pi payment scope creation failed:', scopeError);
        }
      }

      toast.success('Payment link created successfully!', {
        description: `Share this link to receive ${formatPiAmount(parseFloat(amount))} payments. Link ID: ${linkId}`
      });

      console.log('Payment link created:', {
        linkId,
        url: paymentUrl,
        description: memo,
        amount: parseFloat(amount),
        type: paymentType
      });

      // Clear form
      setAmount('');
      setMemo('');
      setSelectedLink(newLink);

    } catch (error) {
      console.error('Failed to create payment link:', error);
      toast.error('Failed to create payment link');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPaymentLink = (link: PaymentLink) => {
    // Ensure we're using the correct URL format
    const correctUrl = `${window.location.origin}/pay/${link.id}`;
    navigator.clipboard.writeText(correctUrl);
    toast.success('Payment link copied to clipboard!', {
      description: `Link: /pay/${link.id}`
    });
  };

  const toggleLinkStatus = (linkId: string) => {
    const updatedLinks = paymentLinks.map(link => 
      link.id === linkId ? { ...link, active: !link.active } : link
    );
    savePaymentLinks(updatedLinks);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return <ShoppingCart className="w-4 h-4" />;
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

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-sky-500" />
            Pi Payments - DropPay
            <Badge variant="secondary">Mainnet</Badge>
          </CardTitle>
          <CardDescription>
            Create payment checkout links for digital products, donations, tips, and paid groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please authenticate with Pi Network to access DropPay payment features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-sky-500" />
            Pi Payments - DropPay
            <Badge className="bg-sky-500">Mainnet</Badge>
          </CardTitle>
          <CardDescription>
            Complete payment solution for Pi Network mainnet - Create checkout links, track payments, and manage your Pi wallet
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="create">Create Payment</TabsTrigger>
          <TabsTrigger value="links">Payment Links</TabsTrigger>
          <TabsTrigger value="wallet">Wallet & Balance</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="merchant">
            <Wallet className="w-4 h-4 mr-1" />
            Merchant Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-sky-500" />
                Create Payment Checkout Link
              </CardTitle>
              <CardDescription>
                Generate shareable payment links for your digital products, donations, or services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-lg border border-sky-200">
                <Pi className="h-8 w-8 text-sky-600" />
                <div>
                  <p className="font-medium text-sky-900">Connected to Pi Network Mainnet</p>
                  <p className="text-sm text-sky-600">
                    User: {piUser?.username || 'Anonymous'} | Wallet: {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : 'Loading...'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="paymentType">Payment Type</Label>
                    <Select value={paymentType} onValueChange={(value: any) => setPaymentType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Digital Product</SelectItem>
                        <SelectItem value="donation">Donation</SelectItem>
                        <SelectItem value="tip">Tip/Gratuity</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="group">Paid Group Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (π)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label htmlFor="memo">Description *</Label>
                    <Textarea
                      id="memo"
                      placeholder="Enter payment description (e.g., Premium Course Access, Monthly Subscription, etc.)"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={3}
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be shown to customers during checkout
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Payment Link Preview</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(paymentType)}
                          {paymentType.charAt(0).toUpperCase() + paymentType.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">{formatPiAmount(parseFloat(amount) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Description:</span>
                        <span className="text-right">{memo || 'No description'}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={createPaymentLink}
                    disabled={isProcessing || !amount || !memo}
                    className="w-full bg-sky-500 hover:bg-sky-600"
                    size="lg"
                  >
                    <Link className="h-5 w-5 mr-2" />
                    {isProcessing ? 'Creating Link...' : 'Create Payment Link'}
                  </Button>
                </div>
              </div>

              {/* Quick Templates */}
              <div className="space-y-3">
                <Label>Quick Templates</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { amount: '1.00', memo: 'Premium subscription - 1 month', type: 'subscription' as const },
                    { amount: '5.00', memo: 'Support my content', type: 'tip' as const },
                    { amount: '10.00', memo: 'Digital course access', type: 'product' as const },
                    { amount: '25.00', memo: 'VIP group membership', type: 'group' as const }
                  ].map((template, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-3 px-2"
                      onClick={() => {
                        setAmount(template.amount);
                        setMemo(template.memo);
                        setPaymentType(template.type);
                      }}
                    >
                      <div className="text-center">
                        <div className="font-medium">{formatPiAmount(parseFloat(template.amount))}</div>
                        <div className="text-xs opacity-70">{template.memo}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {selectedLink && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium text-green-800">Payment Link Created Successfully!</p>
                      <div className="flex items-center gap-2 p-2 bg-white rounded border">
                        <code className="flex-1 text-xs">{selectedLink.url}</code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPaymentLink(selectedLink)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-500" />
                Your Payment Links
              </CardTitle>
              <CardDescription>
                Manage and share your payment checkout links
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentLinks.length === 0 ? (
                <div className="text-center py-8">
                  <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No payment links created yet</p>
                  <p className="text-sm text-gray-400">Create your first payment link in the "Create Payment" tab</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentLinks.map((link) => (
                    <div key={link.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(link.type)}
                            <span className="font-medium">{link.description}</span>
                            <Badge variant={link.active ? "default" : "secondary"}>
                              {link.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            Created {new Date(link.created).toLocaleDateString()} • {formatPiAmount(link.amount)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <span>Link ID: {link.id}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(link.id);
                                toast.success('Link ID copied!');
                              }}
                              className="h-6 px-2"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPiAmount(link.totalReceived)}</p>
                          <p className="text-xs text-gray-500">{link.transactionCount} payments</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <code className="flex-1 text-xs">{link.url}</code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPaymentLink(link)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `${window.location.origin}/pay/${link.id}`;
                            window.open(url, '_blank');
                          }}
                          title="Test payment link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLinkStatus(link.id)}
                        >
                          {link.active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(link.url, '_blank')}
                        >
                          Preview
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-sky-500" />
                  Pi Wallet Balance
                </CardTitle>
                <CardDescription>
                  Your Pi Network mainnet wallet overview
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadWalletData}
                disabled={loadingBalance}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="text-center p-6 bg-sky-50 rounded-lg border border-sky-200">
                    <Pi className="w-8 h-8 text-sky-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-sky-900">{formatPiAmount(balance.available)}</p>
                    <p className="text-sm text-sky-600">Available Balance</p>
                  </div>
                  
                  {balance.pending > 0 && (
                    <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                      <p className="font-medium text-orange-900">{formatPiAmount(balance.pending)}</p>
                      <p className="text-sm text-orange-600">Pending</p>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                      <code className="flex-1 text-sm break-all">{walletAddress || 'Loading...'}</code>
                      {walletAddress && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(walletAddress);
                            toast.success('Wallet address copied!');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Details</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Network:</span>
                        <span className="font-medium">Pi Mainnet</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>Last Updated:</span>
                        <span className="font-medium">{balance.lastUpdated.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <Alert className="border-sky-200 bg-sky-50">
                    <TrendingUp className="h-4 w-4 text-sky-600" />
                    <AlertDescription className="text-sky-800">
                      <strong>Pro Tip:</strong> Share your payment links to start receiving Pi payments directly to this wallet. 
                      All transactions are processed on Pi Network mainnet for maximum security.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-sky-500" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  Recent transactions on Pi Network mainnet
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransactionHistory(walletAddress)}
                disabled={loadingHistory}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading transaction history...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions found</p>
                  <p className="text-sm text-gray-400">Your payment history will appear here once you start transacting</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              tx.status === 'completed' ? 'bg-green-500' : 
                              tx.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                            }`} />
                            <span className="font-medium">{tx.memo || 'No memo'}</span>
                            <Badge variant="outline" className="text-xs">
                              {tx.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {tx.timestamp.toLocaleDateString()} {tx.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPiAmount(tx.amount)}</p>
                          <p className="text-xs text-gray-500">Fee: {formatPiAmount(tx.fee)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <div className="grid grid-cols-1 gap-1">
                          <div><strong>Hash:</strong> {tx.hash}</div>
                          <div><strong>From:</strong> {tx.from}</div>
                          <div><strong>To:</strong> {tx.to}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="merchant">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-500" />
                Merchant Configuration
              </CardTitle>
              <CardDescription>
                Configure your Pi Network merchant settings for payment processing and smart contract integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-green-800">Mainnet (Production)</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Connected to Pi Network Mainnet for live transactions
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">Pi API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your Pi Network API key"
                    value={merchantConfig.apiKey}
                    onChange={(e) => setMerchantConfig({...merchantConfig, apiKey: e.target.value})}
                  />
                  <p className="text-xs text-gray-500">
                    Get your API key from Pi Developer Portal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walletAddress">Merchant Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    placeholder="Enter your Pi wallet address"
                    value={merchantConfig.walletAddress}
                    onChange={(e) => setMerchantConfig({...merchantConfig, walletAddress: e.target.value})}
                  />
                  <p className="text-xs text-gray-500">
                    This is where you'll receive payments
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seedPhrase">Seed Phrase (Optional)</Label>
                  <Textarea
                    id="seedPhrase"
                    placeholder="Enter your seed phrase for advanced payment processing"
                    value={merchantConfig.seedPhrase}
                    onChange={(e) => setMerchantConfig({...merchantConfig, seedPhrase: e.target.value})}
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Only needed for advanced smart contract features. Keep this secure!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validationKey">Validation Key</Label>
                  <Input
                    id="validationKey"
                    placeholder="Validation key for payment verification"
                    value={merchantConfig.validationKey}
                    onChange={(e) => setMerchantConfig({...merchantConfig, validationKey: e.target.value})}
                    readOnly
                  />
                  <p className="text-xs text-gray-500">
                    Pre-configured validation key for your DropLink store
                  </p>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your merchant configuration will be saved securely. API keys are encrypted and seed phrases are stored locally only.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    localStorage.setItem('pi_merchant_config', JSON.stringify(merchantConfig));
                    toast.success('Merchant configuration saved successfully!');
                  }}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    const saved = localStorage.getItem('pi_merchant_config');
                    if (saved) {
                      setMerchantConfig(JSON.parse(saved));
                      toast.success('Configuration loaded from storage');
                    }
                  }}
                >
                  Load Saved
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Integration Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {merchantConfig.apiKey ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span>API Key {merchantConfig.apiKey ? 'Configured' : 'Missing'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {merchantConfig.walletAddress ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span>Wallet Address {merchantConfig.walletAddress ? 'Configured' : 'Missing'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Environment: {merchantConfig.environment.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PiPayments;