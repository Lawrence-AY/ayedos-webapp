import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Receipt } from "lucide-react";
import { getDashboardPath } from "../../utils/dashboardRoutes";

export const ConfirmationStep = ({ mpesaReference }) => {
  const navigate = useNavigate();
  const dashboardPath = getDashboardPath("MEMBER");

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(dashboardPath, { replace: true });
    }, 900);

    return () => clearTimeout(timer);
  }, [dashboardPath, navigate]);

  const handleGoToDashboard = () => {
    navigate(dashboardPath, { replace: true });
  };

  return (
    <div className="space-y-6 text-center px-2 sm:px-0">
      <div className="flex justify-center">
        <div className="grid h-24 w-24 animate-[success-pop_700ms_ease-out_both] place-items-center rounded-full bg-green-50 ring-8 ring-green-100">
          <CheckCircle2 className="h-16 w-16 animate-[success-check_700ms_ease-out_120ms_both] text-green-600" />
        </div>
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
<<<<<<< Updated upstream
            Redirecting to sign in in 5 seconds...
=======
            Redirecting to dashboard...
>>>>>>> Stashed changes
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={handleGoToDashboard} className="mt-4">
          Continue to Sign In
        </Button>
      </div>
      <style>{`
        @keyframes success-pop {
          0% { transform: scale(0.82); opacity: 0; }
          60% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes success-check {
          0% { transform: scale(0.75) rotate(-8deg); opacity: 0; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
