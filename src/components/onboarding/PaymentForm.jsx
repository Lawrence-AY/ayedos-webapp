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
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { apiRequest, unwrapEnvelopeData, getApiErrorMessage } from '../../lib/apiClient';
import { AuthContext } from '../../context/AuthContext.jsx';

export const PaymentForm = ({ onBack, onPaymentSuccess, isLoading, setLoading, userData, documents = {} }) => {
  const { accessToken, updateCurrentUser } = useContext(AuthContext);

  const [paymentMethod, setPaymentMethod] = useState('stk');
  const [stkPhone, setStkPhone] = useState('');
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [error, setError] = useState('');
  const [showWaitingDialog, setShowWaitingDialog] = useState(false);
  const [waitingStatus, setWaitingStatus] = useState('waiting');
  const [progress, setProgress] = useState(0);
  const [mpesaReferenceDisplay, setMpesaReferenceDisplay] = useState(null);
  const [paybillApplicationId, setPaybillApplicationId] = useState(null);
  const pollingInterval = useRef(null);
  const progressInterval = useRef(null);

  const REGISTRATION_FEE = 1;
  const PENDING_STK_STORAGE_KEY = 'ayedos_pending_onboarding_stk';

  // Helper: format phone to 254XXXXXXXXX
  const formatPhoneForBackend = (phone) => {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = '254' + p.slice(1);
    if (!p.startsWith('254')) p = '254' + p;
    return p;
  };

  const getShortApplicationCode = (applicationId) => {
    const digits = String(applicationId || '').replace(/\D/g, '');
    if (digits) return digits.slice(-5);
    let hash = 0;
    for (const char of String(applicationId || '')) {
      hash = ((hash * 31) + char.charCodeAt(0)) % 100000;
    }
    return String(hash || 1).padStart(5, '0');
  };

  const getRegistrationAccountReference = (applicationId) => `AYEDOSSACCO-${getShortApplicationCode(applicationId)}`;

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

    // Backend member/application enums support employee vs non-employee.
    const membershipType = userData.occupation === 'Employed' ? 'EMPLOYEE' : 'NON_EMPLOYEE';
    const identityType = userData.idType === 'driverlicense'
      ? 'drivers_license'
      : userData.idType || 'national';

    // Determine identityNumber based on idType
    let identityNumber = userData.nationalId;
    if (userData.idType === 'passport') identityNumber = userData.passportNumber;
    if (userData.idType === 'driverlicense') identityNumber = userData.driverLicenseNumber;

    const nationalIdDocument = documents.idFile instanceof File
      ? await fileToBase64(documents.idFile)
      : null;
    const passportPhoto = documents.photoFile instanceof File
      ? await fileToBase64(documents.photoFile)
      : null;
    const identityDocument = userData.idDocument instanceof File
      ? await fileToBase64(userData.idDocument)
      : nationalIdDocument;
    const addressParts = [userData.poBox, userData.county, userData.subCounty].filter((item) => String(item || '').trim());

    const application = {
      name: fullName,
      email: userData.email,
      phone: formatPhoneForBackend(userData.phone),
      identityType,
      identityNumber: identityNumber || userData.nationalId || '',
      idDocument: identityDocument,
      passportPhoto: userData.idType === 'passport' ? null : passportPhoto,
      occupation: userData.occupation || null,
      address: addressParts.length ? addressParts.join(', ') : null,
      poBox: userData.poBox || null,
      county: userData.county || null,
      subCounty: userData.subCounty || null,
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
      timeoutMs: 60000,
      retry: false,
      cache: false,
    });
    if (!res.ok) throw new Error(res.json?.message || 'Application creation failed');
    const app = unwrapEnvelopeData(res.json);
    if (!app?.id) throw new Error('Application ID missing');
    return app.id;
  };

  const getPaybillApplicationId = async () => {
    if (paybillApplicationId) return paybillApplicationId;
    const appId = await createApplication();
    setPaybillApplicationId(appId);
    return appId;
  };

  const buildCompletedUser = (profile = {}) => ({
    ...profile,
    role: 'MEMBER',
    onboardingComplete: true,
    onboardingCompleted: true,
    isCompleted: true,
    onboardingStatus: true,
    consentGiven: true,
  });

  const markOnboardingComplete = async () => {
    const fullName = [userData.firstName, userData.secondName, userData.surname]
      .filter(Boolean)
      .join(' ')
      .trim();

    let identityNumber = userData.nationalId;
    if (userData.idType === 'passport') identityNumber = userData.passportNumber;
    if (userData.idType === 'driverlicense') identityNumber = userData.driverLicenseNumber;
    const addressParts = [userData.poBox, userData.county, userData.subCounty].filter((item) => String(item || '').trim());

    const profile = {
      name: fullName,
      phone: formatPhoneForBackend(userData.phone),
      nationalId: identityNumber || userData.nationalId,
      occupation: userData.occupation || '',
      address: addressParts.join(', '),
      poBox: userData.poBox || '',
      county: userData.county || '',
      subCounty: userData.subCounty || '',
      consentGiven: Boolean(userData.termsAccepted),
      consentGivenAt: new Date().toISOString(),
    };
    if (userData.kraPin?.trim()) profile.kraPin = userData.kraPin.trim();

    const res = await apiRequest('/api/member/profile', {
      method: 'PUT',
      accessToken,
      body: profile,
      timeoutMs: 60000,
      retry: false,
      cache: false,
    });

    if (!res.ok) {
      throw new Error(res.json?.message || 'Could not finalize onboarding profile');
    }

    const updatedProfile = unwrapEnvelopeData(res.json);
    const completedUser = buildCompletedUser(updatedProfile);
    updateCurrentUser?.(completedUser);
    return completedUser;
  };

  const completeOnboardingForRedirect = async () => {
    try {
      return await markOnboardingComplete();
    } catch (err) {
      const fallbackUser = buildCompletedUser({
        name: [userData.firstName, userData.secondName, userData.surname].filter(Boolean).join(' ').trim(),
        email: userData.email,
        phone: formatPhoneForBackend(userData.phone || stkPhone),
      });
      updateCurrentUser?.(fallbackUser);
      return fallbackUser;
    }
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
        if (!result.ok) {
          throw result.error || new Error(result.json?.message || 'Unable to confirm payment status');
        }
        const data = unwrapEnvelopeData(result.json);
        const status = String(data?.status || '').toLowerCase();

        if (status === 'paid' || status === 'success' || status === 'completed') {
          const receipt = data.mpesaReceipt;
          if (!receipt) {
            // A callback can persist its status just before its receipt. Keep
            // polling until the complete confirmation record is available.
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
            timeoutMs: 60000,
            retry: false,
            cache: false,
          });

          if (verifyRes.ok) {
            const completedUser = await completeOnboardingForRedirect();
            sessionStorage.removeItem(PENDING_STK_STORAGE_KEY);
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
            if (progressInterval.current) clearInterval(progressInterval.current);
            setProgress(100);
            setWaitingStatus('success');
            setMpesaReferenceDisplay(receipt);
            setTimeout(() => {
              setShowWaitingDialog(false);
              setLoading(false);
              onPaymentSuccess({ reference: receipt, user: completedUser });
            }, 450);
          } else {
            throw new Error('Verification failed on server');
          }
        } else if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
          sessionStorage.removeItem(PENDING_STK_STORAGE_KEY);
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

  useEffect(() => {
    try {
      const pending = JSON.parse(sessionStorage.getItem(PENDING_STK_STORAGE_KEY) || 'null');
      const startedAt = Number(pending?.startedAt);
      const isRecentPayment = Number.isFinite(startedAt)
        && Date.now() - startedAt < 10 * 60 * 1000;

      if (
        isRecentPayment
        && pending?.checkoutId
        && pending?.appId
        && pending?.phone
        && !pollingInterval.current
      ) {
        setShowWaitingDialog(true);
        setWaitingStatus('waiting');
        setLoading(true);
        startPolling(pending.checkoutId, pending.appId, pending.phone);
      } else if (pending) {
        sessionStorage.removeItem(PENDING_STK_STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(PENDING_STK_STORAGE_KEY);
    }
  // Resume once when the payment step mounts; startPolling uses current auth/profile state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const appId = await getPaybillApplicationId();
      const accountReference = getRegistrationAccountReference(appId);
      const workerRes = await apiRequest('/api/mpesa/stk', {
        method: 'POST',
        body: {
          phone,
          amount: REGISTRATION_FEE,
          applicationId: appId,
          accountReference,
          paymentCategory: 'registration',
          category: 'registration',
          type: 'MEMBERSHIP_FEE',
          internalReference: `REG-${appId}-${Date.now()}`,
        },
        accessToken,
        timeoutMs: 125000,
        retry: false,
        cache: false,
      });
      const workerData = unwrapEnvelopeData(workerRes.json) || workerRes.json;
      if (!workerRes.ok || !workerData?.success) {
        throw workerRes.error || new Error(workerData?.message || workerData?.error || 'STK push initiation failed');
      }
      const checkoutId = workerData.checkoutRequestId;

      sessionStorage.setItem(PENDING_STK_STORAGE_KEY, JSON.stringify({
        checkoutId,
        appId,
        phone: stkPhone,
        startedAt: Date.now(),
      }));
      startPolling(checkoutId, appId, stkPhone);
    } catch (err) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setWaitingStatus('failed');
      const isTimeout = err?.kind === 'timeout' || /timed out|timeout/i.test(String(err?.message || ''));
      const message = isTimeout
        ? 'M-PESA is taking longer than usual. Please do not retry immediately. If the prompt appears, enter your PIN once; otherwise try again after one minute.'
        : getApiErrorMessage(err) || (err?.message ?? 'Payment prompt service failed. Please try again.');
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
        timeoutMs: 60000,
        retry: false,
        cache: false,
      });
      if (!verifyRes.ok) throw new Error(verifyRes.json?.message || 'Payment verification failed');
      const completedUser = await completeOnboardingForRedirect();
      clearInterval(interval);
      setProgress(100);
      setMpesaReferenceDisplay(receiptValue);
      setWaitingStatus('success');
      setTimeout(() => onPaymentSuccess({ reference: receiptValue, user: completedUser }), 350);
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
    if (paymentMethod === 'paybill' && !paybillApplicationId) {
      setLoading(true);
      getPaybillApplicationId()
        .then((appId) => toast.success(`Use account number ${getRegistrationAccountReference(appId)} to complete your Paybill payment.`))
        .catch((err) => setError(getApiErrorMessage(err) || err?.message || 'Could not reserve your application number.'))
        .finally(() => setLoading(false));
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
                <li>Enter <strong className="font-mono">{paybillApplicationId ? getRegistrationAccountReference(paybillApplicationId) : 'AYEDOSSACCO-#####'}</strong> as the Account Number</li>
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
              {paybillApplicationId
                ? `Use account number ${getRegistrationAccountReference(paybillApplicationId)}, then enter the 10-character receipt number from your M-PESA confirmation message.`
                : 'Click Make Payment to reserve your application number, then enter the receipt number from your M-PESA confirmation message.'}
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
            <span className="font-semibold">Make Payment</span>
          </div>
          <GrLinkNext />
        </Button>
      </div>

      {/* Waiting Dialog for STK Push */}
      <Dialog open={showWaitingDialog} onOpenChange={() => {}}>
        <DialogContent className="rounded-2xl max-w-sm text-center" showCloseButton={false}>
          <DialogTitle className="sr-only">
            {waitingStatus === 'success'
              ? 'Payment successful'
              : waitingStatus === 'failed'
                ? 'Payment failed'
                : 'Confirm payment on your phone'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {waitingStatus === 'success'
              ? 'Your registration payment has been confirmed.'
              : waitingStatus === 'failed'
                ? 'The M-PESA payment prompt failed or timed out.'
                : 'Please check your phone and enter your M-PESA PIN to complete registration payment.'}
          </DialogDescription>
          <div className="py-6 flex flex-col items-center gap-4">
            {waitingStatus === 'waiting' && (
              <> 
                <div className="relative grid h-24 w-24 place-items-center">
                  <span className="absolute h-20 w-20 animate-[mpesa-ping_1.7s_ease-out_infinite] rounded-full bg-[#8cc63f]/20" />
                  <span className="absolute h-16 w-16 animate-[mpesa-pulse_1.7s_ease-in-out_infinite] rounded-full bg-[#8cc63f]/15" />
                  <div className="relative grid h-16 w-16 animate-[mpesa-phone-float_1.8s_ease-in-out_infinite] place-items-center rounded-full bg-[#8cc63f]/10 ring-1 ring-[#8cc63f]/30">
                    <Phone className="h-9 w-9 text-[#8cc63f]" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">Confirm Payment on Your Phone</h3>
                <p className="text-gray-500 text-sm">Please check your phone and enter M-PESA PIN.</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-[mpesa-dot_1.2s_ease-in-out_infinite] rounded-full bg-[#8cc63f]" />
                  <span className="h-2 w-2 animate-[mpesa-dot_1.2s_ease-in-out_150ms_infinite] rounded-full bg-[#8cc63f]" />
                  <span className="h-2 w-2 animate-[mpesa-dot_1.2s_ease-in-out_300ms_infinite] rounded-full bg-[#8cc63f]" />
                </div>
                <style>{`
                  @keyframes mpesa-ping {
                    0% { transform: scale(0.72); opacity: 0.55; }
                    75%, 100% { transform: scale(1.28); opacity: 0; }
                  }
                  @keyframes mpesa-pulse {
                    0%, 100% { transform: scale(0.92); opacity: 0.55; }
                    50% { transform: scale(1.08); opacity: 0.9; }
                  }
                  @keyframes mpesa-phone-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                  }
                  @keyframes mpesa-dot {
                    0%, 100% { transform: translateY(0); opacity: 0.45; }
                    50% { transform: translateY(-4px); opacity: 1; }
                  }
                `}</style>
              </>
            )}
            {waitingStatus === 'success' && (
              <>
                <div className="grid h-20 w-20 animate-[payment-success-pop_520ms_ease-out_both] place-items-center rounded-full bg-green-50 ring-8 ring-green-100">
                  <CircleCheck className="h-14 w-14 animate-[payment-success-check_520ms_ease-out_80ms_both] text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-700">Payment Successful!</h3>
                {mpesaReferenceDisplay && (
                  <div className="bg-green-100 rounded-lg p-3 w-full">
                    <p className="text-xs text-green-600">M-Pesa Reference</p>
                    <p className="text-base font-mono font-bold text-green-800">{mpesaReferenceDisplay}</p>
                  </div>
                )}
                <p className="text-gray-500 text-sm">Your registration is now complete.</p>
                <style>{`
                  @keyframes payment-success-pop {
                    0% { transform: scale(0.82); opacity: 0; }
                    60% { transform: scale(1.06); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                  }
                  @keyframes payment-success-check {
                    0% { transform: scale(0.7) rotate(-8deg); opacity: 0; }
                    100% { transform: scale(1) rotate(0); opacity: 1; }
                  }
                `}</style>
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
