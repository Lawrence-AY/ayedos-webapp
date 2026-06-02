import { useContext, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GrLinkNext } from 'react-icons/gr';
import { ArrowLeft, Phone, Receipt, XCircle, CircleCheck, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { apiRequest, unwrapEnvelopeData, getApiErrorMessage } from '../../lib/apiClient';
import { AuthContext } from '../../context/AuthContext.jsx';

export const PaymentForm = ({ onBack, onPaymentSuccess, isLoading, setLoading, userData }) => {
  const { accessToken, loadCurrentUser, updateCurrentUser } = useContext(AuthContext);

  const [paymentMethod, setPaymentMethod] = useState('stk');
  const [stkPhone, setStkPhone] = useState('');
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [error, setError] = useState('');
  const [showWaitingDialog, setShowWaitingDialog] = useState(false);
  const [waitingStatus, setWaitingStatus] = useState('waiting');
  const [progress, setProgress] = useState(0);
  const [mpesaReferenceDisplay, setMpesaReferenceDisplay] = useState(null);
  const pollingInterval = useRef(null);
  const progressInterval = useRef(null);

  const REGISTRATION_FEE = 1;

  // Helper: format phone to 254XXXXXXXXX
  const formatPhoneForBackend = (phone) => {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = '254' + p.slice(1);
    if (!p.startsWith('254')) p = '254' + p;
    return p;
  };

  // Pre‑fill phone from userData
  useEffect(() => {
    if (userData.phone && !stkPhone) {
      setStkPhone(userData.phone);
    }
  }, [userData.phone, stkPhone]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // Convert file to base64 for sending to backend
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Build application payload for POST /api/applications
  const buildApplicationPayload = async () => {
    const fullName = [userData.firstName, userData.secondName, userData.surname]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Map occupation to membershipType (must match PostgreSQL enum)
    let membershipType = 'NON_EMPLOYEE';
    if (userData.occupation === 'Employed') membershipType = 'EMPLOYEE';
    else if (userData.occupation === 'Self-employed') membershipType = 'SELF_EMPLOYED';
    else if (userData.occupation === 'Student') membershipType = 'STUDENT';
    else if (userData.occupation === 'Retired') membershipType = 'RETIRED';

    // Determine identityNumber based on idType
    let identityNumber = userData.nationalId;
    if (userData.idType === 'passport') identityNumber = userData.passportNumber;
    if (userData.idType === 'driverlicense') identityNumber = userData.driverLicenseNumber;

    // Base64 encode identity document if present
    let idDocumentBase64 = null;
    if (userData.idDocument instanceof File) {
      idDocumentBase64 = await fileToBase64(userData.idDocument);
    }

    const application = {
      name: fullName,
      email: userData.email,
      phone: formatPhoneForBackend(userData.phone),
      identityType: userData.idType || 'national',
      identityNumber: identityNumber || userData.nationalId || '',
      idDocument: idDocumentBase64,
      occupation: userData.occupation || null,
      address: userData.poBox ? `${userData.poBox}, ${userData.county}, ${userData.subCounty}` : null,
      type: membershipType,
      consentGiven: userData.termsAccepted,
    };
    if (userData.kraPin?.trim()) application.kraPin = userData.kraPin.trim();
    return application;
  };

  const createApplication = async () => {
    const payload = await buildApplicationPayload();
    const res = await apiRequest('/api/applications', {
      method: 'POST',
      body: payload,
      accessToken,
    });
    if (!res.ok) throw new Error(res.json?.message || 'Application creation failed');
    const app = unwrapEnvelopeData(res.json);
    if (!app?.id) throw new Error('Application ID missing');
    return app.id;
  };

  const markOnboardingComplete = async () => {
    const fullName = [userData.firstName, userData.secondName, userData.surname]
      .filter(Boolean)
      .join(' ')
      .trim();

    let identityNumber = userData.nationalId;
    if (userData.idType === 'passport') identityNumber = userData.passportNumber;
    if (userData.idType === 'driverlicense') identityNumber = userData.driverLicenseNumber;

    const profile = {
      name: fullName,
      phone: formatPhoneForBackend(userData.phone),
      nationalId: identityNumber || userData.nationalId,
      occupation: userData.occupation || '',
      address: userData.poBox ? `${userData.poBox}, ${userData.county}, ${userData.subCounty}` : '',
      consentGiven: Boolean(userData.termsAccepted),
      consentGivenAt: new Date().toISOString(),
    };
    if (userData.kraPin?.trim()) profile.kraPin = userData.kraPin.trim();

    const res = await apiRequest('/api/member/profile', {
      method: 'PUT',
      accessToken,
      body: profile,
    });

    if (!res.ok) {
      throw new Error(res.json?.message || 'Could not finalize onboarding profile');
    }

    updateCurrentUser?.(unwrapEnvelopeData(res.json));
    await loadCurrentUser?.(accessToken, { force: true });
  };

  // Poll STK status and verify payment when paid
  const startPolling = (checkoutId, appId, rawPhone) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    const formattedPhone = formatPhoneForBackend(rawPhone);
    const startedAt = Date.now();
    let inFlight = false;

    const checkPaymentStatus = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await apiRequest(`/api/stk-status?checkoutRequestId=${encodeURIComponent(checkoutId)}`, {
          method: 'GET',
          accessToken,
          timeoutMs: 8000,
          cache: false,
        });
        const data = unwrapEnvelopeData(result.json);

        // Ensure data exists and status is paid
        if (data && data.status === 'paid') {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;

          // Ensure we actually have a receipt number before calling verify
          const receipt = data.mpesaReceipt;
          if (!receipt) {
            return;
          }

          const payload = {
            paymentReference: receipt,
            paymentPhone: formattedPhone,
            checkoutRequestId: checkoutId,
          };

          const verifyRes = await apiRequest(`/api/applications/${appId}/verify-payment`, {
            method: 'POST',
            body: payload,
            accessToken,
          });

          if (verifyRes.ok) {
            await markOnboardingComplete();
            if (progressInterval.current) clearInterval(progressInterval.current);
            setProgress(100);
            setWaitingStatus('success');
            setMpesaReferenceDisplay(receipt);
            setTimeout(() => {
              setShowWaitingDialog(false);
              setLoading(false);
              onPaymentSuccess(receipt);
            }, 1500);
          } else {
            throw new Error('Verification failed on server');
          }
        } else if (data && data.status === 'failed') {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          if (progressInterval.current) clearInterval(progressInterval.current);
          setWaitingStatus('failed');
          setError('Payment failed or was cancelled. Please try again.');
          setLoading(false);
        } else if (Date.now() - startedAt > 90 * 1000) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          if (progressInterval.current) clearInterval(progressInterval.current);
          setWaitingStatus('failed');
          setError('Payment confirmation is taking too long. If you paid, use the receipt option to complete onboarding.');
          setLoading(false);
        }
      } catch (err) {
        const message = getApiErrorMessage(err) || 'Unable to confirm payment status. Please try again.';
        setError(message);
      } finally {
        inFlight = false;
      }
    };

    checkPaymentStatus();
    pollingInterval.current = setInterval(checkPaymentStatus, 1500);
  };

  // STK Push flow - NO confirmation dialog, processes immediately
  const handleStkPayment = async () => {
    setError('');
    if (!stkPhone.trim()) {
      toast.error('Please enter your M-PESA phone number');
      return;
    }

    setShowWaitingDialog(true);
    setWaitingStatus('waiting');
    setProgress(0);
    setLoading(true);

    progressInterval.current = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 94));
    }, 200);

    try {
      const phone = formatPhoneForBackend(stkPhone);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      let workerRes;
      try {
        workerRes = await fetch('https://kcb-mpesa.simrion.workers.dev/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, amount: REGISTRATION_FEE.toString() }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
      const workerData = await workerRes.json();
      if (!workerRes.ok || !workerData.success) {
        throw new Error(workerData.error || 'STK push initiation failed');
      }
      const checkoutId = workerData.checkoutRequestId;

      const appId = await createApplication();
      startPolling(checkoutId, appId, stkPhone);
    } catch (err) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setWaitingStatus('failed');
      const message = getApiErrorMessage(err) || (err?.message ?? 'Payment prompt service failed. Please try again.');
      setError(message);
      setLoading(false);
      setTimeout(() => setShowWaitingDialog(false), 3000);
    }
  };

  // Manual Paybill flow (already paid) - NO confirmation dialog
  const handlePaybillPayment = async () => {
    setError('');
    if (!mpesaReceipt.trim()) {
      toast.error('Please enter the M-PESA receipt number');
      return;
    }

    setLoading(true);
    setProgress(30);

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 300);

    try {
      const appId = await createApplication();
      const receiptValue = mpesaReceipt.trim();
      const payload = {
        paymentReference: receiptValue,
        paymentPhone: formatPhoneForBackend(userData.phone),
      };
      const verifyRes = await apiRequest(`/api/applications/${appId}/verify-payment`, {
        method: 'POST',
        body: payload,
        accessToken,
      });
      if (!verifyRes.ok) throw new Error(verifyRes.json?.message || 'Payment verification failed');
      await markOnboardingComplete();
      clearInterval(interval);
      setProgress(100);
      setMpesaReferenceDisplay(receiptValue);
      setTimeout(() => onPaymentSuccess(receiptValue), 500);
    } catch (err) {
      clearInterval(interval);
      const message = getApiErrorMessage(err) || (err?.message ?? 'Payment registration failed');
      setError(message);
      setLoading(false);
    }
  };

  // Direct submit handler - processes immediately without confirmation dialog
  const handleSubmit = () => {
    setError('');
    if (paymentMethod === 'stk' && !stkPhone.trim()) {
      toast.error('Please enter your M-PESA phone number');
      return;
    }
    if (paymentMethod === 'paybill' && !mpesaReceipt.trim()) {
      toast.error('Please enter the M-PESA receipt number');
      return;
    }

    if (paymentMethod === 'stk') {
      handleStkPayment();
    } else {
      handlePaybillPayment();
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="space-y-3">
        <Label className="text-gray-700">Select Payment Method</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={setPaymentMethod}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div
            className={`flex-1 flex items-center gap-3 p-4 border rounded-xl transition cursor-pointer ${
              paymentMethod === 'stk'
                ? 'border-[#8cc63f] bg-[#8cc63f]/5'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setPaymentMethod('stk')}
          >
            <RadioGroupItem value="stk" id="stk" />
            <Label htmlFor="stk" className="flex items-center gap-2 cursor-pointer flex-1">
              <Phone className="w-5 h-5 text-[#8cc63f] shrink-0" />
              <span className="font-medium text-sm md:text-base">Pay via Mpesa Prompt</span>
            </Label>
          </div>

          <div
            className={`flex-1 flex items-center gap-3 p-4 border rounded-xl transition cursor-pointer ${
              paymentMethod === 'paybill'
                ? 'border-[#8cc63f] bg-[#8cc63f]/5'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setPaymentMethod('paybill')}
          >
            <RadioGroupItem value="paybill" id="paybill" />
            <Label htmlFor="paybill" className="flex items-center gap-2 cursor-pointer flex-1">
              <Receipt className="w-5 h-5 text-[#8cc63f] shrink-0" />
              <span className="font-medium text-sm md:text-base">Use Paybill</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* M-Pesa Reference display after successful payment */}
      {mpesaReferenceDisplay && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <CircleCheck className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-800">Payment Confirmed</p>
          <p className="text-xs text-green-600 mt-1">M-Pesa Reference Code:</p>
          <p className="text-lg font-mono font-bold text-green-900 tracking-wider mt-1">
            {mpesaReferenceDisplay}
          </p>
        </div>
      )}

      {/* STK Push Section */}
      {paymentMethod === 'stk' && (
        <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="space-y-2">
            <Label htmlFor="stkPhone" className="text-gray-700">
              M-PESA Phone Number
            </Label>
            <Input
              id="stkPhone"
              value={stkPhone}
              onChange={(e) => setStkPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g., 0712345678"
              disabled={isLoading}
              className="bg-white border-gray-200 rounded-xl p-3"
            />
            <p className="text-xs text-gray-500">
              Ensure this number is the one you will receive a prompt to enter your PIN.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Amount (KES)</Label>
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 text-gray-800 font-medium">
              {REGISTRATION_FEE} KES
            </div>
          </div>
        </div>
      )}

      {/* Paybill (Manual) Section */}
      {paymentMethod === 'paybill' && (
        <div className="space-y-4 bg-linear-to-r from-[#8cc63f]/10 to-transparent border border-[#8cc63f]/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-[#8cc63f] mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#8cc63f]">How to pay via M-PESA Paybill:</p>
              <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1 ml-2">
                <li>Go to your M-PESA menu → Lipa na M-PESA → Paybill</li>
                <li>Enter <strong className="font-mono">522533</strong> as the Business Number</li>
                <li>Enter <strong className="font-mono">7929884</strong> as the Account Number</li>
                <li>Enter Amount: <strong>KES {REGISTRATION_FEE}</strong></li>
                <li>Enter your M-PESA PIN and confirm</li>
                <li>You will receive a confirmation SMS with a receipt number (10 characters)</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            <Label htmlFor="receipt" className="text-gray-700">
              M-PESA Receipt Number
            </Label>
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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && paymentMethod === 'paybill' && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full h-2" />
          <p className="text-sm text-gray-500 text-center">Verifying payment and submitting application...</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4">
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
          onClick={handleSubmit}
          disabled={isLoading}
        >
          <div className="flex flex-col text-left">
            <span className="text-xs font-light">Next</span>
            <span className="font-semibold">Confirm Payment</span>
          </div>
          <GrLinkNext />
        </Button>
      </div>

      {/* Waiting Dialog for STK Push */}
      <Dialog open={showWaitingDialog} onOpenChange={() => {}}>
        <DialogContent className="rounded-2xl max-w-sm text-center" hideCloseButton>
          <div className="py-6 flex flex-col items-center gap-4">
            {waitingStatus === 'waiting' && (
              <>
                <Phone className="w-16 h-16 text-[#8cc63f]" />
                <h3 className="text-lg font-semibold">Confirm Payment on Your Phone</h3>
                <p className="text-gray-500 text-sm">Please check your phone and enter M-PESA PIN.</p>
              </>
            )}
            {waitingStatus === 'success' && (
              <>
                <CircleCheck className="w-16 h-16 text-green-500" />
                <h3 className="text-lg font-semibold text-green-700">Payment Successful!</h3>
                {mpesaReferenceDisplay && (
                  <div className="bg-green-100 rounded-lg p-3 w-full">
                    <p className="text-xs text-green-600">M-Pesa Reference</p>
                    <p className="text-base font-mono font-bold text-green-800">{mpesaReferenceDisplay}</p>
                  </div>
                )}
                <p className="text-gray-500 text-sm">Your registration is now complete.</p>
              </>
            )}
            {waitingStatus === 'failed' && (
              <>
                <XCircle className="w-16 h-16 text-red-500" />
                <h3 className="text-lg font-semibold text-red-700">Payment Failed</h3>
                <p className="text-gray-500 text-sm">{error || 'Please try again or use manual receipt.'}</p>
                <Button onClick={() => setShowWaitingDialog(false)} className="mt-2 bg-[#8cc63f]">
                  Close
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
