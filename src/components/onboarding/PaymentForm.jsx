/// PaymentForm.jsx
import { useContext, useEffect, useState } from 'react';
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
import { GrLinkNext } from 'react-icons/gr';
import { ArrowLeft, Phone, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { apiRequest, unwrapEnvelopeData } from '../../lib/apiClient';
import { AuthContext } from '../../context/AuthContext.jsx';

export const PaymentForm = ({
  onBack,
  onPaymentSuccess,
  isLoading,
  setLoading,
  userData,
}) => {
  const { accessToken } = useContext(AuthContext);
  const [paymentMethod, setPaymentMethod] = useState('stk');
  const [stkPhone, setStkPhone] = useState('');
  const [amount, setAmount] = useState('1');
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (userData.phone && !stkPhone) {
      setStkPhone(userData.phone);
    }
  }, [userData.phone, stkPhone]);

  const buildApplicationPayload = () => {
    const name = [userData.firstName, userData.surname].filter(Boolean).join(' ').trim();
    return {
      name,
      email: userData.email,
      phone: userData.phone,
      nationalId: userData.nationalId,
      kraPin: userData.kraPin || null,
      occupation: userData.occupation || null,
      address: userData.address || null,
      type: userData.occupation === 'Employed' ? 'EMPLOYEE' : 'NON_EMPLOYEE',
      consentGiven: userData.termsAccepted,
      idDocumentName: userData.idFile?.name ?? null,
      passportPhotoName: userData.photoFile?.name ?? null,
    };
  };

  const handlePayment = async () => {
    setError('');
    setLoading(true);
    setProgress(30);

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 300);

    try {
      const payload = buildApplicationPayload();
      const createRes = await apiRequest('/api/applications', {
        method: 'POST',
        body: payload,
        accessToken,
      });

      if (!createRes.ok) {
        throw new Error(createRes.json?.message || `Application creation failed (status ${createRes.status})`);
      }

      const application = unwrapEnvelopeData(createRes.json);
      const applicationId = application?.id;
      if (!applicationId) {
        throw new Error('Application ID is unavailable');
      }

      const paymentReference = paymentMethod === 'stk' ? `STK_${Date.now()}` : mpesaReceipt.trim();
      const paymentPhone = paymentMethod === 'stk' ? stkPhone.trim() : userData.phone;

      const verifyRes = await apiRequest(`/api/applications/${applicationId}/verify-payment`, {
        method: 'POST',
        body: {
          paymentReference,
          paymentPhone,
          paymentMethod,
        },
        accessToken,
      });

      if (!verifyRes.ok) {
        throw new Error(verifyRes.json?.message || `Payment verification failed (status ${verifyRes.status})`);
      }

      clearInterval(interval);
      setProgress(100);
      setTimeout(() => onPaymentSuccess(), 500);
    } catch (err) {
      clearInterval(interval);
      setError(err.message || 'Payment registration failed');
      setLoading(false);
    }
  };

  const openConfirmDialog = () => {
    setError('');
    if (paymentMethod === 'stk' && (!stkPhone || !amount || Number(amount) <= 0)) {
      setError('Please fill in phone number and valid amount');
      return;
    }
    if (paymentMethod === 'manual' && !mpesaReceipt.trim()) {
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

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

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
            className="p-2 h-13 bg-[#003a16] text-white rounded-md flex items-center justify-center gap-2"
            size="lg"
            onClick={onBack}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-light">Back</span>
                <span className="font-semibold">Documents</span>
              </div>
            </div>
          </Button>
          <Button
            type="button"
            className="p-2 h-13 bg-[#8cc63f] text-white rounded-md flex items-center justify-center gap-2"
            size="lg"
            onClick={openConfirmDialog}
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
                ? `You will use ${stkPhone} for M-PESA payment of KES ${amount}.`
                : `Please confirm that you have already sent funds and the receipt number is ${mpesaReceipt}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isLoading}>
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};