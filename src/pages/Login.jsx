import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getPostLoginPath } from "../utils/dashboardRoutes.js";
import { getApiBaseUrl, getApiErrorMessage, isApiDebugEnabled } from "../lib/apiClient.js";
import DotSwarmCanvas from "../components/landing/DotTextCanvas.jsx";
import dashboardLogo from "../assets/AUTH-LIGHT.png";
import dashboardLogoDark from "../assets/AUTH-DARK.png";
import { Eye, EyeOff } from "lucide-react";
import { 
  InputOTP,
  InputOTPGroup, 

  InputOTPSlot,
} from "@/components/ui/input-otp";

const OTP_COOLDOWN_SECONDS = 60;

export default function Login() {
  const navigate = useNavigate(); 
  const {
    login,
    completeLoginOtp,
    resendLoginOtp,
    clearOtpSession,
    otpSession,
    authError,
    isLoading,
  } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [submitCooldown, setSubmitCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [resendingOtp, setResendingOtp] = useState(false);
  const otpInputRef = useRef(null);
  const otpVerifyInFlightRef = useRef(false);
  const otpVerifyAbortRef = useRef(null);
  const maskEmail = (email) => {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  const visibleStart = localPart.slice(0, 1);
  const masked = visibleStart + '*'.repeat(Math.min(localPart.length - 1, 5));
  return `${masked}@${domain}`;
};

  async function verifyCurrentOtp() {
    if (otpVerifyInFlightRef.current || otpVerifying) return;

    setFormError(null);

    const verificationEmail = (email || otpSession?.email || "").trim();
    const code = otp.trim();
    const tempToken = otpSession?.tempToken || otpSession?.sessionId || null;

    if (!/^\d{6,8}$/.test(code)) {
      setFormError("Enter the 6 to 8 digit OTP sent to your email");
      return;
    }

    if (isApiDebugEnabled()) {
      console.log({
        apiUrl: `${getApiBaseUrl()}/auth/login/verify-otp`,
        email: verificationEmail,
        tempToken,
        otp: code,
      });
    }

    otpVerifyInFlightRef.current = true;
    otpVerifyAbortRef.current?.abort();
    const controller = new AbortController();
    otpVerifyAbortRef.current = controller;
    setOtpVerifying(true);
    try {
      const verifiedUser = await completeLoginOtp({
        email: verificationEmail,
        otp: code,
        tempToken,
        signal: controller.signal,
      });
      setOtp("");
      navigate(getPostLoginPath(verifiedUser), { replace: true });
    } catch (err) {
      if (err?.name !== "CanceledError" && err?.kind !== "cancelled") {
        setFormError(err?.message || "OTP verification failed");
      }
    } finally {
      otpVerifyInFlightRef.current = false;
      if (otpVerifyAbortRef.current === controller) otpVerifyAbortRef.current = null;
      setOtpVerifying(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setOtpMessage("");

    if (otpRequired) {
      await verifyCurrentOtp();
      return;
    }

    if (!email.trim()) return setFormError("Email is required");
    if (!password) return setFormError("Password is required");

    try {
      if (submitCooldown > 0 || submitting) return;

      setSubmitting(true);
      const loggedInUser = await login({ email: email.trim(), password });
      if (loggedInUser?.requiresOtp || loggedInUser?.requiresOTP) {
        const nextSession = loggedInUser?.otpSession;
        if (nextSession?.email) setEmail(nextSession.email);
        setOtpRequired(true);
        setOtpCountdown(Math.ceil(Math.max((nextSession?.resendAvailableAt || Date.now() + OTP_COOLDOWN_SECONDS * 1000) - Date.now(), 0) / 1000));
        setSubmitCooldown(0);
        setFormError(null);
        setOtpMessage("We sent a verification code to your email.");
        return;
      }
      navigate(getPostLoginPath(loggedInUser), { replace: true });
    } catch (err) {
      if (err?.status === 429 || err?.isRateLimited) {
        const seconds = Math.max(Number(err.retryAfterSeconds) || 60, 30);
        setSubmitCooldown(seconds);
        setFormError("Too many login attempts. Please wait before trying again.");
      } else if (err?.kind === "timeout") {
        setFormError("The request timed out. Please try again.");
      } else if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setFormError("You appear to be offline. Check your connection and try again.");
      } else {
        setFormError(getApiErrorMessage(err) || err?.message || "Login failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!otpRequired) return;
    window.setTimeout(() => otpInputRef.current?.focus(), 50);
  }, [otpRequired]);

  useEffect(() => {
    if (!otpSession?.email) return;
    setEmail((current) => current || otpSession.email);
    setOtpRequired(true);
    setOtpCountdown(Math.ceil(Math.max((otpSession.resendAvailableAt || Date.now()) - Date.now(), 0) / 1000));
  }, [otpSession]);

  useEffect(() => {
    if (!otpRequired) return;
    if (otpCountdown <= 0) return;
    const timerId = window.setInterval(() => {
      setOtpCountdown((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [otpCountdown, otpRequired]);

  useEffect(() => {
    if (submitCooldown <= 0) return;
    const timerId = window.setInterval(() => {
      setSubmitCooldown((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [submitCooldown]);

  useEffect(() => () => {
    otpVerifyAbortRef.current?.abort();
  }, []);

  async function handleResendOtp() {
    if (otpCountdown > 0 || resendingOtp || otpVerifying) return;

    setResendingOtp(true);
    setFormError(null);
    setOtpMessage("");

    try {
      const response = await resendLoginOtp();
      const nextSession = response?.otpSession;
      setOtp("");
      setOtpCountdown(Math.ceil(Math.max((nextSession?.resendAvailableAt || Date.now() + OTP_COOLDOWN_SECONDS * 1000) - Date.now(), 0) / 1000));
      setOtpMessage(response?.message || "A new OTP has been sent to your email.");
    } catch (err) {
      setFormError(err?.message || "Unable to resend OTP");
    } finally {
      setResendingOtp(false);
    }
  }

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
          maxWidth: 440,
          padding: "10px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "var(--auth-card-bg)",
            color: "var(--text)",
            backdropFilter: "blur(4px)",
            borderRadius: 20,
            padding: "48px 40px",
            boxShadow: "var(--auth-card-shadow)",
            border: "1px solid var(--auth-card-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 0,
            }}
          >
     {/* Light mode logo */}
    <img 
      src={dashboardLogo}
      alt="AYEDOS Logo" 
       style={{
                height: 100,
                width: "auto",
                objectFit: "contain",
              }}
      className="h-9 w-9 object-contain block dark:hidden" 
    />
    {/* Dark mode logo */}
    <img 
      src={dashboardLogoDark}
      alt="AYEDOS Logo" 
       style={{
                height: 100,
                width: "auto",
                objectFit: "contain",
              }}
      className="h-9 w-9 object-contain hidden dark:block" 
    />
  
           
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontface:"gotham-bold",
              color: "var(--color-primary, #1a202c)",
              marginBottom: 15,
            }}
          >
            Welcome Back !
          </div>

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="email" style={labelStyle}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={otpRequired}
                style={inputStyle}
                placeholder="name@email.com"
                required
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label htmlFor="password" style={labelStyle}>
                Password
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid var(--auth-input-border)",
                  borderRadius: 12,
                  background: "var(--auth-input-bg)",
                  paddingRight: 12,
                }}
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={otpRequired}
                  placeholder="••••••••"
                  required
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 15,
                    color: "var(--text)",
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 6,
                    color: "var(--text)",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {(formError || authError) && (
              <div role="alert" style={errorStyle}>
                {formError || authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || submitting || submitCooldown > 0 || otpVerifying}
              style={{
                ...buttonStyle,
                cursor: isLoading || submitting || submitCooldown > 0 || otpVerifying ? "not-allowed" : "pointer",
                opacity: isLoading || submitting || submitCooldown > 0 || otpVerifying ? 0.7 : 1,
              }}
            >
              {otpVerifying ? "Verifying..." : submitting || isLoading ? "Signing in..." : submitCooldown > 0 ? `Try again in ${submitCooldown}s` : otpRequired ? "Verify code" : "Sign in"}
            </button>

            <div style={mutedTextStyle}>
              Don't have an account?{" "}
              <Link to="/register" style={linkStyle}>
                Create account
              </Link>
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <Link to="/forgot-password" style={forgotPasswordStyle}>
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>

     {
  otpRequired && (
    <div style={modalBackdropStyle} role="presentation">
      <div style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="otp-title">
        <h2 id="otp-title" style={modalTitleStyle}>Verify sign in</h2>
        <p style={modalTextStyle}>
          Enter the code sent to <strong>{maskEmail((email || otpSession?.email || "").trim())}</strong>.
        </p>
        <p style={timerTextStyle}>
          {otpCountdown > 0 ? ` ` : "You can request another code now."}
        </p>

        {/* shadcn InputOTP component */}
        <InputOTP
          ref={otpInputRef}
          maxLength={8}
          value={otp}
          onChange={(value) => {
            setOtp(value.replace(/\D/g, ""));
            setFormError(null);
            setOtpMessage("");
          }}
          pattern="\d*"
          inputMode="numeric"
          autoComplete="one-time-code"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
            <InputOTPSlot index={6} />
            <InputOTPSlot index={7} />
          </InputOTPGroup>
        </InputOTP>

        {(formError || authError) && (
          <div role="alert" style={{ ...errorStyle, marginTop: 14, marginBottom: 0 }}>
            {formError || authError}
          </div>
        )}
        {otpMessage && (
          <div role="status" style={{ ...successStyle, marginTop: 14, marginBottom: 0 }}>
            {otpMessage}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => {
              otpVerifyAbortRef.current?.abort();
              otpVerifyInFlightRef.current = false;
              setOtpRequired(false);
              setOtp("");
              setOtpCountdown(0);
              setOtpMessage("");
              setFormError(null);
              clearOtpSession();
            }}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={otpCountdown > 0 || resendingOtp || otpVerifying}
            onClick={handleResendOtp}
            style={{
              ...secondaryButtonStyle,
              cursor: otpCountdown > 0 || resendingOtp || otpVerifying ? "not-allowed" : "pointer",
              opacity: otpCountdown > 0 || resendingOtp || otpVerifying ? 0.7 : 1,
            }}
          >
            {resendingOtp ? "Sending..." : otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend"}
          </button>
          <button
            type="button"
            disabled={otpVerifying || !/^\d{6,8}$/.test(otp.trim())}
            onClick={verifyCurrentOtp}
            style={{
              ...buttonStyle,
              padding: "12px 18px",
              opacity: otpVerifying || !/^\d{6,8}$/.test(otp.trim()) ? 0.7 : 1,
            }}
          >
            {otpVerifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>
    </div>
  )
}
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontWeight: 600,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.025em",
  color: "var(--auth-label)",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  border: "1px solid var(--auth-input-border)",
  borderRadius: 12,
  fontSize: 15,
  background: "var(--auth-input-bg)",
  color: "var(--text)",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

const buttonStyle = {
  width: "100%",
  padding: "16px 24px",
  borderRadius: 12,
  border: 0,
  background: "var(--color-accent, #3b82f6)",
  color: "white",
  fontWeight: 700,
  fontSize: 16,
  boxShadow: "0 4px 12px rgba(13, 184, 110, 0.25)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
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

const mutedTextStyle = {
  marginTop: 24,
  textAlign: "center",
  color: "var(--auth-muted)",
  fontSize: 14,
};

const linkStyle = {
  color: "var(--color-primary, #3b82f6)",
  fontWeight: 700,
  textDecoration: "none",
};

const forgotPasswordStyle = {
  color: "#94a3b8",
  fontSize: 13,
  textDecoration: "none",
};

const modalBackdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 10,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(2, 6, 23, 0.62)",
  backdropFilter: "blur(8px)",
};

const modalStyle = {
  width: "100%",
  maxWidth: 420,
  borderRadius: 16,
  background: "var(--auth-card-bg)",
  color: "var(--text)",
  border: "1px solid var(--auth-card-border)",
  padding: 28,
  boxShadow: "0 30px 80px rgba(2, 6, 23, 0.3)",
};

const modalTitleStyle = {
  margin: 0,
  color: "var(--text-h)",
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: 0,
};

const modalTextStyle = {
  margin: "8px 0 18px",
  color: "var(--auth-muted)",
  fontSize: 14,
  lineHeight: 1.6,
};

const timerTextStyle = {
  margin: "-8px 0 18px",
  color: "#166534",
  fontSize: 13,
  fontWeight: 700,
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "var(--auth-input-bg)",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
