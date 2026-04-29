/// StepIndicator.jsx
import { CheckCircle2 } from 'lucide-react';

export const StepIndicator = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'Personal Details' },
      { number: 2, title: 'Documents' },
    { number: 3, title: 'Payment' },
    { number: 4, title: 'Confirmation' },
  ];

  return (
    <div className="flex justify-between mb-8">
      {steps.map((step) => (
        <div key={step.number} className="flex-1 text-center">
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 transition-all
              ${
                currentStep > step.number
                  ? 'bg-green-500 text-white'
                  : currentStep === step.number
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                  : 'bg-muted text-muted-foreground'
              }
            `}
          >
            {currentStep > step.number ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              step.number
            )}
          </div>
          <p
            className={`text-sm ${
              currentStep === step.number
                ? 'font-medium text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {step.title}
          </p>
        </div>
      ))}
    </div>
  );
};