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
import { ArrowLeft, Phone, Receipt, Copy, Check } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState('stk'); // 'stk' or 'manual'
  const [stkPhone, setStkPhone] = useState('');
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // Fixed registration amount
  const REGISTRATION_FEE = 1;

  // Pre-fill phone from userData if available
  useEffect(() => {
    if (userData.phone && !stkPhone) {
      setStkPhone(userData.phone);
    }
  }, [userData.phone, stkPhone]);

  // Build payload with correct address fields (poBox, county, subCounty)
  const buildApplicationPayload = () => {
    const fullName = [userData.firstName, userData.surname].filter(Boolean).join(' ').trim();
    // Combine address fields into a single string for backend compatibility
    const addressParts = [
      userData.poBox,
      userData.county,
      userData.subCounty
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ') || null;

    return {
      name: fullName,
      email: userData.email,
      phone: userData.phone,
      nationalId: userData.nationalId,
      kraPin: userData.kraPin || null,
      occupation: userData.occupation || null,
      address: fullAddress,      // was 'address' before, now combined
      poBox: userData.poBox || null,
      county: userData.county || null,
      subCounty: userData.subCounty || null,
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
          amount: REGISTRATION_FEE,
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
    if (paymentMethod === 'stk' && !stkPhone.trim()) {
      setError('Please enter your M-PESA phone number');
      return;
    }
    if (paymentMethod === 'manual' && !mpesaReceipt.trim()) {
      setError('Please enter the receipt number');
      return;
    }
    setShowConfirmDialog(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Payment Details Card */}
      <div className="bg-gradient-to-r from-[#8cc63f]/10 to-transparent border border-[#8cc63f]/20 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-600">Registration Fee</span>
          <span className="text-2xl font-bold text-[#8cc63f]">KES {REGISTRATION_FEE}</span>
        </div>
        <div className="border-t border-gray-200 my-2" />
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Paybill Number:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-gray-800">522533</span>
              <button
                onClick={() => copyToClipboard('522533')}
                className="text-gray-400 hover:text-[#8cc63f] transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Account Number:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-gray-800">7929884</span>
              <button
                onClick={() => copyToClipboard('7929884')}
                className="text-gray-400 hover:text-[#8cc63f] transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Use this Paybill and Account number when sending money via M-PESA.
        </p>
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-3">
        <Label className="text-gray-700">Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="w-full bg-[#f8fafc] border-gray-200 rounded-xl p-3">
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stk">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#8cc63f]" />
                <span>Pay via STK Push (M-PESA)</span>
              </div>
            </SelectItem>
            <SelectItem value="manual">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#8cc63f]" />
                <span>I already paid – Enter Receipt Number</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* STK Push Section */}
      {paymentMethod === 'stk' && (
        <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="space-y-2">
            <Label htmlFor="stkPhone" className="text-gray-700">M-PESA Phone Number</Label>
            <Input
              id="stkPhone"
              value={stkPhone}
              onChange={(e) => setStkPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g., 0712345678"
              disabled={isLoading}
              className="bg-white border-gray-200 rounded-xl p-3"
            />
            <p className="text-xs text-gray-500">
              Ensure this number is registered with M-PESA. You will receive a prompt to enter your PIN.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Amount (KES)</Label>
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 text-gray-800 font-medium">
              {REGISTRATION_FEE} KES
            </div>
            <p className="text-xs text-gray-500">Fixed registration fee – non-editable</p>
          </div>
        </div>
      )}

      {/* Manual Payment (Receipt) Section */}
      {paymentMethod === 'manual' && (
        <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="space-y-2">
            <Label htmlFor="receipt" className="text-gray-700">M-PESA Receipt Number</Label>
            <Input
              id="receipt"
              value={mpesaReceipt}
              onChange={(e) => setMpesaReceipt(e.target.value.toUpperCase())}
              placeholder="e.g., NCL9X1K1TQ"
              disabled={isLoading}
              className="bg-white border-gray-200 rounded-xl p-3"
            />
            <p className="text-xs text-gray-500">
              Enter the 10‑character receipt number from your M-PESA confirmation message.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Progress Indicator */}
      {isLoading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full h-2" />
          <p className="text-sm text-gray-500 text-center">
            Processing payment and registration...
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between gap-4">
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
              <span className="font-semibold">Personal Details</span>
            </div>
          </div>
        </Button>
         <Button 
          type="submit" 
          className="p-2 h-13 bg-[#8cc63f]  
           text-white rounded-md flex items-center justify-center gap-2" 
          size="lg" 
           onClick={openConfirmDialog}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2"> {/* flex-row is default for flex */}
         
            <div className="flex flex-col text-left">
              <span className="text-xs font-light">Next</span>
              <span className="font-semibold">Confirm Payment</span>
            </div>
             <GrLinkNext />
          </div>
        </Button>
        
        
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-md">Confirm Payment</DialogTitle>
            <DialogDescription className="text-gray-600">
              {paymentMethod === 'stk' ? (
                <>You will pay <strong>KES {REGISTRATION_FEE}</strong> via STK push to <strong>{stkPhone}</strong>.</>
              ) : (
                <>You have confirmed payment with receipt number <strong>{mpesaReceipt}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="flex-1 bg-[#8cc63f] hover:bg-[#7ab52e] rounded-xl"
            >
              {isLoading ? 'Processing...' : 'Proceed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};