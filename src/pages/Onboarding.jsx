// Onboarding.jsx
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { decryptData } from '../lib/storageCrypto';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StepIndicator } from '../components/onboarding/StepIndicator';
import { PersonalDetailsForm } from '../components/onboarding/PersonalDetailsForm';
import { DocumentsForm } from '../components/onboarding/DocumentsForm';
import { PaymentForm } from '../components/onboarding/PaymentForm';
import { ConfirmationStep } from '../components/onboarding/ConfirmationStep';
import { CiUser } from 'react-icons/ci';
import { CiMail } from 'react-icons/ci';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [mpesaReference, setMpesaReference] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
    surname: '',
    email: '',
    idType: '',
    nationalId: '',
    passportNumber: '',
    driverLicenseNumber: '',
    idDocument: null,
    kraPin: '',
    phone: '',
    occupation: '',
    poBox: '',
    county: '',
    subCounty: '',
    termsAccepted: false,
  });
  const [documents, setDocuments] = useState({
    idFile: null,
    photoFile: null,
  });
  const [errors, setErrors] = useState({});
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    const prefillSavedDetails = async () => {
      const rawData = sessionStorage.getItem('registrationData') || localStorage.getItem('ayedos_user');

      if (rawData) {
        try {
          const decrypted = await decryptData(rawData);
        const data = decrypted && typeof decrypted === 'object' ? decrypted : JSON.parse(rawData);

        let firstName = '';
        let secondName = '';
        let surname = '';

        if (data.firstName && typeof data.firstName === 'string') firstName = data.firstName;
        if (data.lastName && typeof data.lastName === 'string') surname = data.lastName;

        if ((!firstName || !surname) && data.name && typeof data.name === 'string') {
          const nameParts = data.name.trim().split(/\s+/);
          if (nameParts.length === 1) { firstName = nameParts[0]; surname = ''; }
          else if (nameParts.length === 2) { firstName = nameParts[0]; surname = nameParts[1]; }
          else { firstName = nameParts[0]; secondName = nameParts.slice(1, -1).join(' '); surname = nameParts[nameParts.length - 1]; }
        }

        if (data.surname && typeof data.surname === 'string' && !surname) surname = data.surname;

        setFormData((prev) => ({
          ...prev,
          firstName: firstName || prev.firstName,
          secondName: secondName || prev.secondName,
          surname: surname || prev.surname,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
        }));

        toast.success('Your saved details have been pre-filled');
        } catch {
          toast.error('Could not load saved details');
        }
      }
    };

    prefillSavedDetails();
  }, []);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.step1) setErrors({});
  };

  const handleFileChange = (field, file) => {
    setFormData((prev) => ({ ...prev, [field]: file }));
    if (errors.step1) setErrors({});
  };

  const updateDocuments = (field, file) => {
    setDocuments((prev) => ({ ...prev, [field]: file }));
    if (errors.step2) setErrors({});
  };

  const getIdentityNumber = () => {
    if (formData.idType === 'national') return formData.nationalId;
    if (formData.idType === 'passport') return formData.passportNumber;
    if (formData.idType === 'driverlicense') return formData.driverLicenseNumber;
    return '';
  };

  const validateStep1 = () => {
    if (!formData.firstName) { setErrors({ step1: 'First name is required' }); toast.error('First name is required'); return false; }
    if (!formData.surname) { setErrors({ step1: 'Surname is required' }); toast.error('Surname is required'); return false; }
    if (!formData.email) { setErrors({ step1: 'Email is required' }); toast.error('Email is required'); return false; }
    if (!formData.email.includes('@')) { setErrors({ step1: 'Valid email is required' }); toast.error('Valid email is required'); return false; }
    if (!formData.idType) { setErrors({ step1: 'Please select an ID type' }); toast.error('Please select an ID type'); return false; }
    const identityNumber = getIdentityNumber();
    if (!identityNumber) { setErrors({ step1: 'ID number is required' }); toast.error('ID number is required'); return false; }
    if (!formData.phone) { setErrors({ step1: 'Phone number is required' }); toast.error('Phone number is required'); return false; }
    if (!formData.poBox) { setErrors({ step1: 'Physical address (PO Box) is required' }); toast.error('Physical address (PO Box) is required'); return false; }
    if (!formData.county) { setErrors({ step1: 'County is required' }); toast.error('County is required'); return false; }
    if (!formData.subCounty) { setErrors({ step1: 'Sub-county is required' }); toast.error('Sub-county is required'); return false; }
    if (!formData.termsAccepted) { setErrors({ step1: 'You must accept the terms and conditions' }); toast.error('You must accept the terms and conditions'); return false; }
    setErrors({});
    return true;
  };

  const validateStep2 = () => {
    if (!documents.idFile) { setErrors({ step2: 'Please upload the front side of your ID' }); toast.error('ID front is required'); return false; }
    if (!documents.photoFile) { setErrors({ step2: 'Please upload the back side of your ID' }); toast.error('ID back is required'); return false; }
    if ((formData.idType === 'passport' || formData.idType === 'driverlicense') && !formData.idDocument) {
      setErrors({ step2: `Please upload your ${formData.idType === 'passport' ? 'passport' : "driver's license"} document` });
      toast.error('Identity document is required');
      return false;
    }
    setErrors({});
    return true;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (validateStep1()) { setCurrentStep(2); toast.success('Personal details saved.'); }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (validateStep2()) { setCurrentStep(3); toast.success('Documents uploaded.'); }
  };

  const handlePaymentSuccess = (reference) => {
    if (reference) setMpesaReference(reference);
    setCurrentStep(4);
    setIsLoading(false);
  };

  const handleReset = () => {
    setFormData({
      firstName: '', secondName: '', surname: '', email: '',
      idType: '', nationalId: '', passportNumber: '', driverLicenseNumber: '', idDocument: null,
      kraPin: '', phone: '', occupation: '', poBox: '', county: '', subCounty: '', termsAccepted: false,
    });
    setDocuments({ idFile: null, photoFile: null });
    setMpesaReference(null);
    setCurrentStep(1);
    setErrors({});
    toast.info('Form has been reset. You can start a new registration.');
    setShowResetDialog(false);
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div style={{ minHeight: '100vh', width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'hidden', padding: '2rem 1rem' }}>
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1280, margin: '0 auto' }}>
          <div className="glass-card relative z-10 w-full max-w-7xl mx-auto rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 sm:p-6 md:p-10 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="flex justify-center mb-5">
              <img src="/logos/logo-light.png" alt="AYEDOS SACCO Logo" className="h-12 w-auto block dark:hidden" />
              <img src="/logos/logo-dark.png" alt="AYEDOS SACCO Logo" className="h-12 w-auto hidden dark:block" />
            </div>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
                Identity Verification ~ KYC Registration
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 min-w-0">
                <StepIndicator currentStep={currentStep} totalSteps={4} />
                {currentStep === 1 && (
                  <PersonalDetailsForm formData={formData} onChange={updateFormData} errors={errors} isLoading={isLoading} onSubmit={handleStep1Submit} />
                )}
                {currentStep === 2 && (
                  <DocumentsForm
                    formData={documents}
                    onFileChange={updateDocuments}
                    idType={formData.idType}
                    idDocument={formData.idDocument}
                    onIdDocumentChange={handleFileChange}
                    errors={errors}
                    isLoading={isLoading}
                    onSubmit={handleStep2Submit}
                    onBack={() => setCurrentStep(1)}
                  />
                )}
                {currentStep === 3 && (
                  <PaymentForm onBack={() => setCurrentStep(2)} onPaymentSuccess={handlePaymentSuccess} isLoading={isLoading} setLoading={setIsLoading} userData={formData} documents={documents} />
                )}
                {currentStep === 4 && (
                  <ConfirmationStep mpesaReference={mpesaReference} onReset={() => setShowResetDialog(true)} />
                )}
              </div>
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 bg-white/60 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                  <CardHeader className="border-b border-slate-100 pb-1 dark:border-slate-800">
                    <CardDescription className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400">CHECKLIST</CardDescription>
                    <CardTitle className="text-md font-semibold text-slate-900 dark:text-slate-100">Before you submit</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <CiUser className="text-[#8cc63f] w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Name and ID must match your document exactly</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CiMail className="text-[#8cc63f] w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Use contact details you can verify (OTP, email).</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>A few steps to verify your identity and meet regulatory requirements</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Registration</AlertDialogTitle>
            <AlertDialogDescription>This will clear all entered data. You will lose any unsaved progress. Are you sure you want to reset?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Yes, Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <style>{`
        .glass-card input, .glass-card select, .glass-card textarea, .glass-card [role="button"]:not(.no-style) {
          width: 100%; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 15px; background: #f8fafc; color: #0f172a; transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
        }
        .glass-card input:focus, .glass-card select:focus, .glass-card textarea:focus { outline: none; border-color: #8cc63f; box-shadow: 0 0 0 3px rgba(140,198,63,0.1); }
        .glass-card label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.025em; color: #64748b; }
        .glass-card button[type="submit"], .glass-card .primary-button { width: 100%; padding: 16px 24px; border-radius: 12px; border: none; background: #8cc63f; color: white; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(140,198,63,0.25); transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
        .glass-card button[type="submit"]:hover, .glass-card .primary-button:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(140,198,63,0.3); }
        .dark .glass-card input, .dark .glass-card select, .dark .glass-card textarea, .dark .glass-card [role="button"]:not(.no-style) { background: #0f172a; color: #e2e8f0; border-color: #334155; }
        .dark .glass-card label { color: #cbd5e1; }
        @media (max-width: 640px) { .glass-card { padding: 1rem !important; border-radius: 1rem !important; } .glass-card .grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}

export default Onboarding;
