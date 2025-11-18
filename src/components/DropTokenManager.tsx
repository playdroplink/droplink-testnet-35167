import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Coins, Send, Wallet, ExternalLink, Copy, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

interface DropTokenManagerProps {
  piUser?: any;
  piWallet?: string;
}

interface TokenBalance {
  asset_code: string;
  asset_issuer: string;
  balance: string;
  limit?: string;
}

const DROP_TOKEN = {
  code: 'DROP',
  issuer: 'SB4I6DX4Y6PS7SAJW2SFUQZP3DAW5HE7RBAKISOMTVACARMFCMRBH46I',
  distributor: 'SBS4OY37QMZ67U2WLWZQUUFUV2JOBKWCBFS7IZDOJV3NZPYC3OOZ4OIM',
  name: 'MRWAIN ORGANIZATION',
  description: 'DropLink platform utility token',
  image: 'https://i.ibb.co/HTfyRcwm/Untitled-design-8-1.png',
  decimals: 7
};

export function DropTokenManager({ piUser, piWallet }: DropTokenManagerProps) {
  const [balance, setBalance] = useState<string>('0');
  const [hasDropTrustline, setHasDropTrustline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [sendAmount, setSendAmount] = useState<string>('');
  const [isCreatingTrustline, setIsCreatingTrustline] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Check DROP token balance and trustline
  const checkDropBalance = async () => {
    if (!piWallet) return;

    try {
      setIsLoading(true);
      
      // Check Pi Testnet for balance
      const response = await fetch(`https://api.testnet.minepi.com/accounts/${piWallet}`);
      
      if (response.ok) {
        const accountData = await response.json();
        
        // Find DROP token balance
        const dropBalance = accountData.balances?.find((bal: TokenBalance) => 
          bal.asset_code === DROP_TOKEN.code && 
          bal.asset_issuer === DROP_TOKEN.issuer
        );

        if (dropBalance) {
          setBalance(dropBalance.balance);
          setHasDropTrustline(true);
        } else {
          setBalance('0');
          setHasDropTrustline(false);
        }
      }
    } catch (error) {
      console.error('Error checking DROP balance:', error);
      toast({
        title: "Error",
        description: "Failed to check DROP token balance",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create trustline for DROP token
  const createDropTrustline = async () => {
    if (!piUser || !piWallet) {
      toast({
        title: "Error",
        description: "Please authenticate with Pi Network first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingTrustline(true);

      // This would typically integrate with Pi SDK to create a trustline
      // For now, we'll show instructions to the user
      toast({
        title: "Trustline Creation",
        description: "Please create a trustline for DROP token in your Pi Wallet",
      });

      // In a real implementation, you would:
      // 1. Use Pi SDK to request trustline creation
      // 2. Sign transaction with user's wallet
      // 3. Submit to Pi Network

    } catch (error) {
      console.error('Error creating trustline:', error);
      toast({
        title: "Error",
        description: "Failed to create trustline for DROP token",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTrustline(false);
    }
  };

  // Send DROP tokens to another address
  const sendDropTokens = async () => {
    if (!recipientAddress || !sendAmount || parseFloat(sendAmount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid recipient address and amount",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(sendAmount) > parseFloat(balance)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough DROP tokens",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSending(true);

      // This would integrate with Pi SDK to send tokens
      toast({
        title: "Sending DROP Tokens",
        description: `Sending ${sendAmount} DROP to ${recipientAddress}`,
      });

      // In a real implementation:
      // 1. Create payment transaction
      // 2. Sign with user's wallet
      // 3. Submit to Pi Network
      // 4. Update balance

    } catch (error) {
      console.error('Error sending tokens:', error);
      toast({
        title: "Error",
        description: "Failed to send DROP tokens",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Request DROP tokens from faucet/distributor
  const requestDropTokens = async () => {
    if (!piWallet) {
      toast({
        title: "Error", 
        description: "Wallet address required",
        variant: "destructive"
      });
      return;
    }

    try {
      // This would call your backend to distribute tokens
      toast({
        title: "Requesting DROP Tokens",
        description: "Processing your request...",
      });

      // In a real implementation:
      // 1. Call backend API to distribute tokens
      // 2. Backend uses distributor wallet to send tokens
      // 3. Update UI with new balance

    } catch (error) {
      console.error('Error requesting tokens:', error);
      toast({
        title: "Error",
        description: "Failed to request DROP tokens",
        variant: "destructive"
      });
    }
  };

  // Copy address to clipboard
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  useEffect(() => {
    if (piWallet) {
      checkDropBalance();
    }
  }, [piWallet]);

  if (!piUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            DROP Token Manager
          </CardTitle>
          <CardDescription>
            Manage your DROP tokens on Pi Network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please authenticate with Pi Network to access DROP token features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Token Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            DROP Token Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <img 
              src={DROP_TOKEN.image} 
              alt="DROP Token"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{DROP_TOKEN.code}</h3>
              <p className="text-sm text-muted-foreground">{DROP_TOKEN.name}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Issuer</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {DROP_TOKEN.issuer.slice(0, 20)}...
                </code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyAddress(DROP_TOKEN.issuer)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Total Supply</Label>
              <p className="font-mono text-sm mt-1">100,000,000 DROP</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Your DROP Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {isLoading ? '...' : parseFloat(balance).toLocaleString()} DROP
            </div>
            <p className="text-sm text-muted-foreground mt-1">Current Balance</p>
          </div>

          <div className="flex items-center gap-2 justify-center">
            {hasDropTrustline ? (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Trustline Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                No Trustline
              </Badge>
            )}
          </div>

          {!hasDropTrustline && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You need to create a trustline for DROP token to receive and hold tokens.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!hasDropTrustline ? (
              <Button 
                onClick={createDropTrustline}
                disabled={isCreatingTrustline}
                className="flex-1"
              >
                {isCreatingTrustline ? 'Creating...' : 'Create Trustline'}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={requestDropTokens}
                  variant="outline"
                  className="flex-1"
                >
                  Request DROP
                </Button>
                <Button 
                  onClick={checkDropBalance}
                  variant="outline"
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Tokens */}
      {hasDropTrustline && parseFloat(balance) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send DROP Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="Enter Pi wallet address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                max={balance}
              />
              <p className="text-xs text-muted-foreground">
                Available: {parseFloat(balance).toLocaleString()} DROP
              </p>
            </div>

            <Button 
              onClick={sendDropTokens}
              disabled={isSending || !recipientAddress || !sendAmount}
              className="w-full"
            >
              {isSending ? 'Sending...' : 'Send DROP'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle>Useful Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" asChild>
            <a 
              href="https://droplink.space/.well-known/pi.toml"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Token Metadata (TOML)
            </a>
          </Button>
          
          <Button variant="outline" className="w-full justify-start" asChild>
            <a 
              href={`https://api.testnet.minepi.com/assets?asset_code=${DROP_TOKEN.code}&asset_issuer=${DROP_TOKEN.issuer}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Pi Explorer
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}