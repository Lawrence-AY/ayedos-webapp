// Onboarding.jsx
import { useState, useEffect } from 'react';
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
import DotSwarmCanvas from '../components/landing/DotTextCanvas'; // adjust path if needed
import logo from "../assets/logo-light.png"; // ensure you have the logo

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

  // Load registration data from sessionStorage and pre-populate form
  useEffect(() => {
    const registrationData = sessionStorage.getItem('registrationData');
    if (registrationData) {
      try {
        const data = JSON.parse(registrationData);
        setFormData((prev) => ({
          ...prev,
          firstName: data.firstName || '',
          surname: data.surname || '',
          email: data.email || '',
          phone: data.phone || '',
        }));
        toast.info('Your registration details have been pre-filled');
      } catch (err) {
        console.error('Failed to load registration data:', err);
      }
    }
  }, []);

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

 /* const handleStep2Submit = (e) => {
    e.preventDefault();
    if (validateStep2()) {
      setCurrentStep(3);
      toast.success('Documents uploaded. Proceed to payment.');
    }
  };
*/
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
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflowX: "hidden",
          padding: "2rem 1rem",
        }}
      >
        {/* Animated Background Canvas */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <DotSwarmCanvas
            textLine1="AYEDOS"
            textLine2="SACCO"
            color="#88cc63"
          />
        </div>

        {/* Glass Card Container */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.5)",
              backdropFilter: "blur(4px)",
              borderRadius: 24,
              padding: "32px 40px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0,0,0,0.02)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
            }}
          >
            {/* Logo & Header */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <img
                src={logo}
                alt="AYEDOS SACCO Logo"
                style={{ height: 48, width: "auto", objectFit: "contain" }}
              />
            </div>

            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  color: "#64748b",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Identity Verification ~ KYC Registration
              </div>
              
             
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Area */}
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
                  <PaymentForm
                    onBack={() => setCurrentStep(2)}
                    onPaymentSuccess={handlePaymentSuccess}
                    isLoading={isLoading}
                    setLoading={setIsLoading}
                    userData={formData}
                  />
                )}
                {currentStep === 3 && (
                  <ConfirmationStep onReset={() => setShowResetDialog(true)} />
                )}
              </div>

              {/* Checklist Sidebar */}
              <div className="lg:col-span-1">
                <Card className="border border-gray-200 bg-white/50 shadow-sm">
                 
                  <CardHeader className="border-b border-gray-100 pb-1">
                    <CardDescription className="font-bold text-xs uppercase text-[#828385]">
                      CHECKLIST
                    </CardDescription>
                    <CardTitle className="text-md font-semibold text-gray-800">
                      Before you submit
                    </CardTitle>
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
                    <div className="flex items-start gap-3">
                      <IoDocumentTextOutline className="text-[#8cc63f] w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">Upload clear, high-quality images.</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 8 }}>
                A few steps to verify your identity and meet regulatory requirements
              </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
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

      {/* Global style overrides to match Login form inputs/buttons */}
      <style>{`
        /* Glass card inner forms - override any default shadcn styles */
        .glass-card input,
        .glass-card select,
        .glass-card textarea,
        .glass-card [role="button"]:not(.no-style) {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          background: #f8fafc;
          color: #1e293b;
          transition: border-color 0.2s ease;
        }
        .glass-card input:focus,
        .glass-card select:focus,
        .glass-card textarea:focus {
          outline: none;
          border-color: #8cc63f;
          box-shadow: 0 0 0 3px rgba(140, 198, 63, 0.1);
        }
        .glass-card label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          color: #64748b;
        }
        .glass-card button[type="submit"],
        .glass-card .primary-button {
          width: 100%;
          padding: 16px 24px;
          border-radius: 12px;
          border: none;
          background: #8cc63f;
          color: white;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(140, 198, 63, 0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .glass-card button[type="submit"]:hover,
        .glass-card .primary-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(140, 198, 63, 0.3);
        }
        .glass-card .secondary-button {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #334155;
          box-shadow: none;
        }
        .glass-card .secondary-button:hover {
          background: #f1f5f9;
        }
        /* Fix file inputs */
        .glass-card input[type="file"] {
          padding: 10px;
          background: white;
        }
        /* Ensure all form groups inside the glass card */
        .glass-card .form-group,
        .glass-card .space-y-4 > div {
          margin-bottom: 1.25rem;
        }
      `}</style>
    </>
  );
}

export default Onboarding;