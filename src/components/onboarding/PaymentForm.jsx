import { useContext, useEffect, useState, useRef } from 'react';
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
import { ArrowLeft, Phone, Receipt, Copy, Check, Loader2, XCircle, CircleCheck } from 'lucide-react';
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
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showWaitingDialog, setShowWaitingDialog] = useState(false);
  const [waitingStatus, setWaitingStatus] = useState('waiting'); // 'waiting', 'success', 'failed'
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const pollingInterval = useRef(null);

  const REGISTRATION_FEE = 1;

  // Prefill phone from userData
  useEffect(() => {
    if (userData.phone && !stkPhone) {
      setStkPhone(userData.phone);
    }
  }, [userData.phone, stkPhone]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  // Build application payload (used for manual payment & backup)
  const buildApplicationPayload = () => {
    const fullName = [userData.firstName, userData.surname].filter(Boolean).join(' ').trim();
    const addressParts = [userData.poBox, userData.county, userData.subCounty].filter(Boolean);
    const fullAddress = addressParts.join(', ') || null;

    return {
      name: fullName,
      email: userData.email,
      phone: userData.phone,
      nationalId: userData.nationalId,
      kraPin: userData.kraPin || null,
      occupation: userData.occupation || null,
      address: fullAddress,
      poBox: userData.poBox || null,
      county: userData.county || null,
      subCounty: userData.subCounty || null,
      type: userData.occupation === 'Employed' ? 'EMPLOYEE' : 'NON_EMPLOYEE',
      consentGiven: userData.termsAccepted,
      idDocumentName: userData.idFile?.name ?? null,
      passportPhotoName: userData.photoFile?.name ?? null,
    };
  };

  // Create application in backend (common step)
  const createApplication = async () => {
    const payload = buildApplicationPayload();
    const createRes = await apiRequest('/api/applications', {
      method: 'POST',
      body: payload,
      accessToken,
    });
    if (!createRes.ok) throw new Error(createRes.json?.message || 'Application creation failed');
    const application = unwrapEnvelopeData(createRes.json);
    if (!application?.id) throw new Error('Application ID is missing');
    return application.id;
  };

  // Poll STK payment status from your backend (you must implement /api/stk-status)
  const pollPaymentStatus = (appId, checkoutId) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30; // 30 * 2s = 60s
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await apiRequest(`/api/stk-status?checkoutRequestId=${checkoutId}`, {
            method: 'GET',
            accessToken,
          });
          if (statusRes.ok && statusRes.json) {
            const data = statusRes.json;
            if (data.status === 'paid') {
              clearInterval(interval);
              resolve(data.mpesaReceipt);
            } else if (data.status === 'failed') {
              clearInterval(interval);
              reject(new Error(data.resultDesc || 'Payment failed'));
            }
          }
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error('Payment timeout. Please check M-PESA and retry.'));
          }
        } catch (err) {
          // ignore errors, continue polling
          console.warn('Polling error', err);
        }
      }, 2000);
      pollingInterval.current = interval;
    });
  };

  // STK Push flow
  const handleStkPayment = async () => {
    setError('');
    setShowWaitingDialog(true);
    setWaitingStatus('waiting');
    setProgress(0);
    setLoading(true);

    // Simulate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 3, 90));
    }, 200);

    try {
      // 1. Initiate STK push via worker
      const workerResponse = await fetch('https://kcb-mpesa.simrion.workers.dev/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: stkPhone,
          amount: REGISTRATION_FEE.toString(),
        }),
      });

      const workerData = await workerResponse.json();
      if (!workerResponse.ok || !workerData.success) {
        throw new Error(workerData.error || 'STK push initiation failed');
      }

      const checkoutId = workerData.checkoutRequestId;
      setCheckoutRequestId(checkoutId);

      // 2. Create application in your backend
      const applicationId = await createApplication();

      // 3. Poll for payment completion
      const receipt = await pollPaymentStatus(applicationId, checkoutId);
      clearInterval(progressInterval);
      setProgress(100);
      setWaitingStatus('success');

      // 4. Notify backend that payment is verified (optional – your backend already knows via callback)
      // We call the existing verify-payment to link the application.
      const verifyRes = await apiRequest(`/api/applications/${applicationId}/verify-payment`, {
        method: 'POST',
        body: {
          paymentReference: receipt,
          paymentPhone: stkPhone,
          paymentMethod: 'stk',
          amount: REGISTRATION_FEE,
        },
        accessToken,
      });
      if (!verifyRes.ok) throw new Error('Payment verification failed');

      // 5. Success – close waiting dialog after 1.5s
      setTimeout(() => {
        setShowWaitingDialog(false);
        setLoading(false);
        onPaymentSuccess();
      }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setWaitingStatus('failed');
      setError(err.message);
      setLoading(false);
      // Keep waiting dialog open to show error, close after 3s
      setTimeout(() => setShowWaitingDialog(false), 3000);
    } finally {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      clearInterval(progressInterval);
    }
  };

  // Manual receipt flow (unchanged, calls your existing verify-payment)
  const handleManualPayment = async () => {
    setError('');
    setLoading(true);
    setProgress(30);

    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    try {
      const applicationId = await createApplication();
      const verifyRes = await apiRequest(`/api/applications/${applicationId}/verify-payment`, {
        method: 'POST',
        body: {
          paymentReference: mpesaReceipt.trim(),
          paymentPhone: userData.phone,
          paymentMethod: 'manual',
          amount: REGISTRATION_FEE,
        },
        accessToken,
      });
      if (!verifyRes.ok) throw new Error(verifyRes.json?.message || 'Payment verification failed');
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

  const handleProceed = () => {
    setShowConfirmDialog(false);
    if (paymentMethod === 'stk') {
      handleStkPayment();
    } else {
      handleManualPayment();
    }
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
              <button onClick={() => copyToClipboard('522533')} className="text-gray-400 hover:text-[#8cc63f] transition">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Account Number:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-gray-800">7929884</span>
              <button onClick={() => copyToClipboard('7929884')} className="text-gray-400 hover:text-[#8cc63f] transition">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Use this Paybill and Account number when sending money via M-PESA.</p>
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
            <p className="text-xs text-gray-500">Ensure this number is registered with M-PESA. You will receive a prompt to enter your PIN.</p>
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

      {/* Manual Payment Section */}
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
            <p className="text-xs text-gray-500">Enter the 10‑character receipt number from your M-PESA confirmation message.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && paymentMethod === 'manual' && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full h-2" />
          <p className="text-sm text-gray-500 text-center">Processing payment and registration...</p>
        </div>
      )}

      <div className="flex justify-between gap-4">
        <Button
          type="button"
          className="p-2 h-13 bg-[#003a16] text-white rounded-md flex items-center justify-center gap-2"
          size="lg"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-light">Back</span>
            <span className="font-semibold">Personal Details</span>
          </div>
        </Button>
        <Button
          type="button"
          className="p-2 h-13 bg-[#8cc63f] text-white rounded-md flex items-center justify-center gap-2"
          size="lg"
          onClick={openConfirmDialog}
          disabled={isLoading}
        >
          <div className="flex flex-col text-left">
            <span className="text-xs font-light">Next</span>
            <span className="font-semibold">Confirm Payment</span>
          </div>
          <GrLinkNext />
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
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleProceed} disabled={isLoading} className="flex-1 bg-[#8cc63f] hover:bg-[#7ab52e] rounded-xl">
              {isLoading ? 'Processing...' : 'Proceed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiting Dialog with Animation */}
      <Dialog open={showWaitingDialog} onOpenChange={() => {}}>
        <DialogContent className="rounded-2xl max-w-sm text-center" hideCloseButton>
          <div className="py-6 flex flex-col items-center gap-4">
            {waitingStatus === 'waiting' && (
              <>
                <Loader2 className="w-16 h-16 text-[#8cc63f] animate-spin" />
                <h3 className="text-lg font-semibold">Awaiting Payment</h3>
                <p className="text-gray-500 text-sm">Please check your phone and enter M-PESA PIN.</p>
                <Progress value={progress} className="w-full h-2" />
              </>
            )}
            {waitingStatus === 'success' && (
              <>
                <CircleCheck className="w-16 h-16 text-green-500" />
                <h3 className="text-lg font-semibold text-green-700">Payment Successful!</h3>
                <p className="text-gray-500 text-sm">Your registration is now complete.</p>
              </>
            )}
            {waitingStatus === 'failed' && (
              <>
                <XCircle className="w-16 h-16 text-red-500" />
                <h3 className="text-lg font-semibold text-red-700">Payment Failed</h3>
                <p className="text-gray-500 text-sm">{error || 'Please try again or use manual receipt.'}</p>
                <Button onClick={() => setShowWaitingDialog(false)} className="mt-2 bg-[#8cc63f]">Close</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};