import { useState } from 'react';
import { Toaster, toast } from 'sonner';
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
import { CiUser } from "react-icons/ci";
import { IoDocumentTextOutline } from "react-icons/io5";
import { CiMail } from "react-icons/ci";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    email: '',
    nationalId: '',
    kraPin: '',
    phone: '',
    occupation: '',
    address: '',
    idFile: null,
    photoFile: null,
    termsAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [showResetDialog, setShowResetDialog] = useState(false);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.step1 || errors.step2) setErrors({});
  };

  const validateStep1 = () => {
    const errMsg = !formData.firstName ? 'First name is required'
      : !formData.surname ? 'Surname is required'
      : !formData.email ? 'Email is required'
      : !formData.email.includes('@') ? 'Valid email is required'
      : !formData.nationalId ? 'National ID is required'
      : !formData.phone ? 'Phone number is required'
      : !formData.termsAccepted ? 'You must accept the terms and conditions'
      : null;

    if (errMsg) {
      setErrors({ step1: errMsg });
      toast.error(errMsg);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep2 = () => {
    const errMsg = !formData.idFile ? 'ID document is required'
      : !formData.photoFile ? 'Passport photo is required'
      : null;

    if (errMsg) {
      setErrors({ step2: errMsg });
      toast.error(errMsg);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
      toast.success('Personal details saved. Now upload documents.');
    }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (validateStep2()) {
      setCurrentStep(3);
      toast.success('Documents uploaded. Proceed to payment.');
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Registration and payment completed successfully!');
    setCurrentStep(4);
    setIsLoading(false);
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      surname: '',
      email: '',
      nationalId: '',
      kraPin: '',
      phone: '',
      occupation: '',
      address: '',
      idFile: null,
      photoFile: null,
      termsAccepted: false,
    });
    setCurrentStep(1);
    setErrors({});
    toast.info('Form has been reset. You can start a new registration.');
    setShowResetDialog(false);
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="container max-w-7xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-left border-b bg-white/50 rounded-t-xl">
              <CardDescription className="font-bold text-[12px] uppercase text-[#828385]">
                IDENTITY VERIFICATION
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-primary">
                AYEDOS SACCO KYC
              </CardTitle>
              <CardDescription>
                A few steps to verify your identity and meet regulatory requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main form area */}
                <div className="lg:col-span-2">
                  <StepIndicator currentStep={currentStep} />

                  {currentStep === 1 && (
                    <PersonalDetailsForm
                      formData={formData}
                      onChange={updateFormData}
                      errors={errors}
                      isLoading={isLoading}
                      onSubmit={handleStep1Submit}
                    />
                  )}
                  {currentStep === 2 && (
                    <DocumentsForm
                      formData={formData}
                      onFileChange={updateFormData}
                      errors={errors}
                      isLoading={isLoading}
                      onSubmit={handleStep2Submit}
                      onBack={() => setCurrentStep(1)}
                    />
                  )}
                  {currentStep === 3 && (
                    <PaymentForm
                      onBack={() => setCurrentStep(2)}
                      onPaymentSuccess={handlePaymentSuccess}
                      isLoading={isLoading}
                      setLoading={setIsLoading}
                      userData={formData}
                    />
                  )}
                  {currentStep === 4 && (
                    <ConfirmationStep onReset={() => setShowResetDialog(true)} />
                  )}
                </div>

                {/* Sidebar checklist */}
                <div className="lg:col-span-1">
                  <Card className="border-[0.5px] bg-muted/10">
                    <CardHeader className="text-left border-b">
                      <CardDescription className="font-bold">CHECKLIST</CardDescription>
                      <CardTitle className="text-md font-semibold">Before you submit</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <CiUser className="text-[#8cc63f] w-7 h-7 font-medium" />
                        <span className="text-sm font-medium text-gray-600">Name and ID must match your document exactly</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CiMail className="text-[#8cc63f] w-7 h-7 font-semibold" />
                        <span className="text-sm font-medium text-gray-600">Use contact details you can verify (OTP, email).</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IoDocumentTextOutline className="text-[#8cc63f] w-6 h-6 font-semibold" />
                        <span className="text-sm font-medium text-gray-600">PDF or Image, legible, under 2MB each</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Registration</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all entered data and files. You will lose any unsaved progress.
              Are you sure you want to reset?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Yes, Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default Onboarding;