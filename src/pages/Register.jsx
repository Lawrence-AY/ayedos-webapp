import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { resendOtp } from "../services/authService.js";
import logo from "../assets/logo-light.png";
import DotSwarmCanvas from "../components/landing/DotTextCanvas.jsx";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const OTP_COOLDOWN_SECONDS = 60;

export default function Register() {
  const navigate = useNavigate();
  const { register, completeRegistrationOtp, authError, isLoading } = useContext(AuthContext);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpError, setOtpError] = useState(null);
  const [otpMessage, setOtpMessage] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [submitCooldown, setSubmitCooldown] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setOtpError(null);
    setOtpMessage("");

    if (!firstName.trim()) return setFormError("First name is required");
    if (!lastName.trim()) return setFormError("Last name is required");
    if (!email.trim()) return setFormError("Email is required");
    if (!phone.trim()) return setFormError("Phone number is required");
    if (password !== confirmPassword)
      return setFormError("Passwords do not match");

    setIsRegistering(true);

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: "MEMBER",
      });

      setPendingEmail(email.trim());
      setOtpDialogOpen(true);
      setOtpCountdown(OTP_COOLDOWN_SECONDS);
      setSubmitCooldown(OTP_COOLDOWN_SECONDS);
    } catch (err) {
      setFormError(err?.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleVerifyOtp() {
    setOtpError(null);
    setOtpMessage("");

    if (!/^\d{6,8}$/.test(otp.trim())) {
      setOtpError("Enter the 6 to 8 digit OTP sent to your email");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      await completeRegistrationOtp({ email: pendingEmail, otp: otp.trim() });

      // Store registration data in sessionStorage for onboarding pre-population
      const registrationData = {
        firstName,
        surname: lastName,
        email: pendingEmail,
        phone,
      };
      sessionStorage.setItem(
        "registrationData",
        JSON.stringify(registrationData),
      );

      setOtpDialogOpen(false);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setOtpError(err?.message || "OTP verification failed");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    setOtpError(null);
    setOtpMessage("");

    if (!pendingEmail) {
      setOtpError("Please create your account again to request a new OTP");
      return;
    }

    setIsResendingOtp(true);

    try {
      const response = await resendOtp(pendingEmail);
      setOtp("");
      setOtpCountdown(OTP_COOLDOWN_SECONDS);
      setOtpMessage(response?.message || "A new OTP has been sent to your email");
    } catch (err) {
      setOtpError(err?.message || "Unable to resend OTP");
    } finally {
      setIsResendingOtp(false);
    }
  }

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timerId = window.setInterval(() => {
      setOtpCountdown((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [otpCountdown]);

  useEffect(() => {
    if (submitCooldown <= 0) return;
    const timerId = window.setInterval(() => {
      setSubmitCooldown((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [submitCooldown]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        overflowX: "hidden",
      }}
    >
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
        <DotSwarmCanvas textLine1="AYEDOS" textLine2="SACCO" color="#88cc63" />
      </div>

      {/* Content Layer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 480,
          padding: "40px 20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "var(--auth-card-bg)",
            color: "var(--text)",
            backdropFilter: "blur(4px)",
            borderRadius: 20,
            padding: "40px",
            boxShadow: "var(--auth-card-shadow)",
            border: "1px solid var(--auth-card-border)",
          }}
        >
          {/* Logo Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 5,
            }}
          >
            <img
              src={logo}
              alt="Logo"
              style={{
                height: 45,
                width: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              textAlign: "center",
              letterSpacing: "-0.02em",
              color: "var(--color-primary, #1a202c)",
              margin: "0 0 10px 0",
            }}
          >
            Create Account
          </h1>

          <form onSubmit={onSubmit}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {(formError || authError) && (
              <div role="alert" style={errorStyle}>
                {formError || authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering || isLoading || submitCooldown > 0}
              style={{
                ...buttonStyle,
                cursor: isRegistering || isLoading || submitCooldown > 0 ? "not-allowed" : "pointer",
                opacity: isRegistering || isLoading || submitCooldown > 0 ? 0.7 : 1,
              }}
            >
              {isRegistering ? "Sending OTP..." : submitCooldown > 0 ? `Try again in ${submitCooldown}s` : "Create account"}
            </button>
          </form>
          <AlertDialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
            <AlertDialogContent className="bg-white text-slate-950 dark:bg-slate-900 dark:text-slate-50">
              <AlertDialogHeader>
                <AlertDialogTitle>Verify your email</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="space-y-4">
                <p style={{ margin: 0, color: "#475569" }}>
                  Enter the code sent to <strong>{pendingEmail}</strong> to
                  continue.
                </p>
                <p style={timerTextStyle}>
                  You can resend a code in {otpCountdown}s.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter verification code"
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 8));
                    setOtpError(null);
                  }}
                  style={inputStyle}
                />
                {otpMessage && (
                  <div role="status" style={successStyle}>
                    {otpMessage}
                  </div>
                )}
                {(otpError || authError) && (
                  <div role="alert" style={errorStyle}>
                    {otpError || authError}
                  </div>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp || isVerifyingOtp || otpCountdown > 0}
                >
                  {isResendingOtp ? "Sending..." : otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                </Button>
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || isResendingOtp || !/^\d{6,8}$/.test(otp.trim())}
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div style={mutedTextStyle}>
            Already have an account?{" "}
            <Link to="/login" style={linkStyle}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  border: "1px solid var(--auth-input-border)",
  borderRadius: 12,
  fontSize: 15,
  background: "var(--auth-input-bg)",
  color: "var(--text)",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "16px 24px",
  borderRadius: 12,
  border: 0,
  background: "#8cc63f",
  color: "white",
  fontWeight: 700,
  fontSize: 16,

  transition: "all 0.2s ease",
};

const errorStyle = {
  marginBottom: 20,
  padding: 14,
  borderRadius: 12,
  background: "#fef2f2",
  border: "1px solid #fee2e2",
  color: "#b91c1c",
  fontWeight: 500,
  fontSize: 14,
};

const successStyle = {
  marginBottom: 20,
  padding: 14,
  borderRadius: 12,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontWeight: 500,
  fontSize: 14,
};

const timerTextStyle = {
  margin: "-8px 0 0",
  color: "#166534",
  fontSize: 13,
  fontWeight: 700,
};

const mutedTextStyle = {
  marginTop: 20,
  textAlign: "center",
  color: "var(--auth-muted)",
  fontSize: 14,
};

const linkStyle = {
  color: "var(--color-primary, #003a16)",
  fontWeight: 700,
  textDecoration: "none",
};
