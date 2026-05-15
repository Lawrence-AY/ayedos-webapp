import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export const ConfirmationStep = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="w-20 h-20 text-green-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Membership Application Complete!</h2>
        <div className="bg-muted/30 p-4 rounded-lg">
          <p>Your application has been successfully submitted.</p>
          <p className="text-sm text-muted-foreground mt-2">
            You will receive a confirmation email shortly.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Redirecting to dashboard in 3 seconds...
          </p>
        </div>
      </div>
      <Button onClick={handleGoToDashboard} className="mt-4">
        Go to Dashboard Now
      </Button>
    </div>
  );
};
