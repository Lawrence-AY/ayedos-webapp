/// PaymentForm.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
 
import { GrLinkNext } from "react-icons/gr";
import { AlertCircle, ArrowLeft, Phone, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const API_BASE = import.meta.env.VITE_API_BASE ;

export const PaymentForm = ({
  onBack,
  onPaymentSuccess,
  isLoading,
  setLoading,
  userData, // contains all personal details + files
}) => {
  const [paymentMethod, setPaymentMethod] = useState('stk');
  const [stkPhone, setStkPhone] = useState('');
  const [amount, setAmount] = useState('1');
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [progress, setProgress] = useState(0);

  // Pre-fill STK phone from registration phone if available
  useState(() => {
    if (userData.phone && !stkPhone) setStkPhone(userData.phone);
  }, [userData.phone]);

  const registerUserWithPayment = async (paymentRef) => {
    const formData = new FormData();
    formData.append('firstname', userData.firstName);
    formData.append('surname', userData.surname);
    formData.append('email', userData.email);
    formData.append('nationalId', userData.nationalId);
    formData.append('kraPin', userData.kraPin || '');
    formData.append('phone', userData.phone);
    formData.append('occupation', userData.occupation || '');
    formData.append('address', userData.address || '');
    formData.append('idDocument', userData.idFile);
    formData.append('passportPhoto', userData.photoFile);
    formData.append('paymentReference', paymentRef);

    const response = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    return data;
  };

  const handlePayment = async () => {
    setError('');
    setLoading(true);
    setProgress(30);

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 300);

    try {
      if (paymentMethod === 'stk') {
        if (!stkPhone) throw new Error('Phone number is required');
        if (!amount || Number(amount) <= 0) throw new Error('Valid amount required');

        // Initiate STK Push
        const stkResponse = await fetch(`${API_BASE}/payments/stk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: stkPhone, amount: Number(amount) }),
        });
        const stkData = await stkResponse.json();
        if (!stkResponse.ok) throw new Error(stkData.error || 'STK Push failed');

        const paymentRef = stkData.reference || `STK_${Date.now()}`;
        // After initiating STK, we assume the backend will confirm payment asynchronously.
        // For simplicity, we proceed with registration using the payment reference.
        await registerUserWithPayment(paymentRef);
      } else {
        // Manual verification
        if (!mpesaReceipt) throw new Error('Receipt number required');

        // Verify receipt with backend
        const verifyResponse = await fetch(`${API_BASE}/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mpesaReceipt }),
        });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) throw new Error(verifyData.error || 'Verification failed');

        await registerUserWithPayment(mpesaReceipt);
      }

      clearInterval(interval);
      setProgress(100);
      setTimeout(() => onPaymentSuccess(), 500);
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
      setLoading(false);
    }
  };

  const openConfirmDialog = () => {
    if (paymentMethod === 'stk' && (!stkPhone || !amount)) {
      setError('Please fill in phone number and amount');
      return;
    }
    if (paymentMethod === 'manual' && !mpesaReceipt) {
      setError('Please enter the receipt number');
      return;
    }
    setShowConfirmDialog(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3">
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stk">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Pay via STK Push (M-PESA)
                </div>
              </SelectItem>
              <SelectItem value="manual">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  I already paid – Enter Receipt Number
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentMethod === 'stk' && (
          <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="stkPhone">M-PESA Phone Number</Label>
              <Input
                id="stkPhone"
                value={stkPhone}
                onChange={(e) => setStkPhone(e.target.value)}
                placeholder="e.g., 0712345678"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Ensure this number is registered with M-PESA
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {paymentMethod === 'manual' && (
          <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="receipt">M-PESA Receipt Number</Label>
              <Input
                id="receipt"
                value={mpesaReceipt}
                onChange={(e) => setMpesaReceipt(e.target.value)}
                placeholder="e.g., NCL9X1K1TQ"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Enter the receipt number from your M-PESA message
              </p>
            </div>
          </div>
        )}

        {/*{error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}*/}

        {isLoading && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Processing payment and registration...
            </p>
          </div>
        )}

        
          <div className="flex justify-between">
                 
                 <Button 
                   type="button" 
                  className="p-2 h-13 bg-[#003a16]  
                   text-white rounded-md flex items-center justify-center gap-2" 
                  size="lg" 
                   onClick={onBack}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2"> {/* flex-row is default for flex */}
                <ArrowLeft className="w-4 h-4 mr-1" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-light">Back</span>
                      <span className="font-semibold">Documents</span>
                    </div>
                  </div>
                </Button>
                 <Button 
                   type="button" 
                  className="p-2 h-13 bg-[#8cc63f]  
                   text-white rounded-md flex items-center justify-center gap-2" 
                  size="lg" 
                   
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">  
                 
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-light">Next</span>
                      <span className="font-semibold">Confirmation</span>
                    </div>
                     <GrLinkNext />
                  </div>
                </Button>
        
                  
              </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              {paymentMethod === 'stk'
                ? `You will receive an STK Push on ${stkPhone} for KES ${amount}. Ensure you have sufficient funds.`
                : `Please confirm that you have already sent money and the receipt number is ${mpesaReceipt}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment}>Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};