import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Receipt } from "lucide-react";

export const ConfirmationStep = ({ mpesaReference }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="space-y-6 text-center px-2 sm:px-0">
      <div className="flex justify-center">
        <CheckCircle2 className="w-20 h-20 text-green-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Membership Application Complete!</h2>
        <div className="bg-muted/30 p-4 rounded-lg">
          <p>Your application has been successfully submitted.</p>

          {mpesaReference && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 mx-auto max-w-xs">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Receipt className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">
                  M-Pesa Reference Code
                </span>
              </div>
              <p className="text-xl font-mono font-bold text-green-900 tracking-widest break-all">
                {mpesaReference}
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-2">
            You will receive a confirmation email shortly.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Redirecting to dashboard in 5 seconds...
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={handleGoToDashboard} className="mt-4">
          Go to Dashboard Now
        </Button>
        s
      </div>
    </div>
  );
};
