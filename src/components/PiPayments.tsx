import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Pi, Wallet, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePi } from '@/contexts/PiContext';
import { toast } from 'sonner';

const PiPayments: React.FC = () => {
  const { isAuthenticated, createPayment, piUser } = usePi();
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [metadata, setMetadata] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

  const handleCreatePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast("Please enter a valid amount", {
        description: "Amount must be greater than 0",
        duration: 3000,
      });
      return;
    }

    if (!memo.trim()) {
      toast("Please enter a memo", {
        description: "Memo is required for all payments",
        duration: 3000,
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let parsedMetadata = {};
      if (metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch {
          parsedMetadata = { description: metadata };
        }
      }

      const payment = await createPayment(
        parseFloat(amount),
        memo,
        parsedMetadata
      );

      setLastPayment(payment);
      
      toast("Payment initiated successfully!", {
        description: "Please complete the payment in Pi Browser",
        duration: 5000,
      });

      // Clear form on success
      setAmount('');
      setMemo('');
      setMetadata('');
      
    } catch (error) {
      console.error('Payment creation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pi Payments
          </CardTitle>
          <CardDescription>
            Create and process payments on Pi Network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please authenticate with Pi Network to access payment features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pi Payments
          <Badge variant="secondary">Mainnet</Badge>
        </CardTitle>
        <CardDescription>
          Create and process payments on Pi Network mainnet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <Pi className="h-8 w-8 text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Connected to Pi Network</p>
            <p className="text-sm text-blue-600">
              User: {piUser?.username || 'Anonymous'}
            </p>
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-4">
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
            <Label htmlFor="memo">Memo *</Label>
            <Input
              id="memo"
              placeholder="Payment description (required)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              Brief description of the payment purpose
            </p>
          </div>

          <div>
            <Label htmlFor="metadata">Metadata (Optional)</Label>
            <Textarea
              id="metadata"
              placeholder='{"orderId": "123", "productName": "Premium Plan"}'
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Additional data as JSON or plain text
            </p>
          </div>

          <Button
            onClick={handleCreatePayment}
            disabled={isProcessing || !amount || !memo}
            className="w-full"
            size="lg"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {isProcessing ? 'Creating Payment...' : `Create Payment (${amount || '0.00'} π)`}
          </Button>
        </div>

        {/* Last Payment Info */}
        {lastPayment && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Payment Created:</strong> {lastPayment.identifier}<br />
              <span className="text-sm text-gray-600">
                Status: {lastPayment.status || 'Initiated'} • 
                Amount: {lastPayment.amount} π
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Instructions */}
        <div className="text-xs text-gray-500 space-y-2 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-700">Payment Flow:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter payment amount and memo above</li>
            <li>Click "Create Payment" to initiate transaction</li>
            <li>Complete payment approval in Pi Browser</li>
            <li>Payment will be processed on Pi Network mainnet</li>
            <li>Confirmation will be shown once completed</li>
          </ol>
          <p className="mt-3 text-xs">
            <strong>Note:</strong> All payments are processed on Pi Network mainnet using 
            official Pi SDK v2.0 with full compliance.
          </p>
        </div>

        {/* Quick Payment Examples */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAmount('1.00');
              setMemo('Premium subscription - 1 month');
            }}
          >
            π 1.00<br />
            <span className="text-xs">Premium</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAmount('5.00');
              setMemo('Tip for content creator');
            }}
          >
            π 5.00<br />
            <span className="text-xs">Tip</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAmount('10.00');
              setMemo('Custom domain - 1 year');
            }}
          >
            π 10.00<br />
            <span className="text-xs">Domain</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PiPayments;