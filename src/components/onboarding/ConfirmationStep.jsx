import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export const ConfirmationStep = ({ onReset }) => {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="w-20 h-20 text-green-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Registration Complete!</h2>
        <div className="bg-muted/30 p-4 rounded-lg">
          <p>Your registration has been successfully processed.</p>
          <p className="text-sm text-muted-foreground mt-2">
            You will receive a confirmation email shortly.
          </p>
        </div>
      </div>
       
    </div>
  );
};