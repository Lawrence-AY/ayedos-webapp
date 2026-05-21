import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getPostLoginPath } from "../utils/dashboardRoutes.js";
import logo from "../assets/AUTH.png";
import DotSwarmCanvas from "../components/landing/DotTextCanvas.jsx";
import { Eye, EyeOff } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const OTP_COOLDOWN_SECONDS = 60;

export default function Login() {
  const navigate = useNavigate();
  const { login, completeLoginOtp, authError, isLoading } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [submitCooldown, setSubmitCooldown] = useState(0);
  const otpInputRef = useRef(null);
  const lastAttemptedOtpRef = useRef("");
  const otpVerifyingRef = useRef(false);
  const maskEmail = (email) => {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  const visibleStart = localPart.slice(0, 1);
  const masked = visibleStart + '*'.repeat(Math.min(localPart.length - 1, 5));
  return `${masked}@${domain}`;
};

  async function onSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) return setFormError("Email is required");
    if (!password) return setFormError("Password is required");

    try {
      if (otpRequired) {
        if (!otp.trim()) return setFormError("OTP is required");
        const verifiedUser = await completeLoginOtp({ email: email.trim(), otp: otp.trim() });
        navigate(getPostLoginPath(verifiedUser), { replace: true });
        return;
      }

      if (submitCooldown > 0) return;

      const loggedInUser = await login({ email: email.trim(), password });
      if (loggedInUser?.requiresOtp) {
        setOtpRequired(true);
        setOtpCountdown(OTP_COOLDOWN_SECONDS);
        setSubmitCooldown(OTP_COOLDOWN_SECONDS);
        setFormError(null);
        return;
      }
      navigate(getPostLoginPath(loggedInUser), { replace: true });
    } catch (err) {
      setFormError(err?.message || "Login failed");
    }
  }

  useEffect(() => {
    if (!otpRequired) return;
    window.setTimeout(() => otpInputRef.current?.focus(), 50);
  }, [otpRequired]);

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

  useEffect(() => {
    otpVerifyingRef.current = otpVerifying;
  }, [otpVerifying]);

  useEffect(() => {
    const normalizedOtp = otp.trim();
    if (!otpRequired || otpVerifyingRef.current || normalizedOtp.length < 6 || lastAttemptedOtpRef.current === normalizedOtp) return;

    let cancelled = false;
    async function verifyOtp() {
      setOtpVerifying(true);
      lastAttemptedOtpRef.current = normalizedOtp;
      setFormError(null);
      try {
        const verifiedUser = await completeLoginOtp({ email: email.trim(), otp: normalizedOtp });
        if (!cancelled) navigate(getPostLoginPath(verifiedUser), { replace: true });
      } catch (err) {
        if (!cancelled) setFormError(err?.message || "OTP verification failed");
      } finally {
        if (!cancelled) setOtpVerifying(false);
      }
    }

    verifyOtp();
    return () => {
      cancelled = true;
    };
  }, [completeLoginOtp, email, navigate, otp, otpRequired]);

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
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            colorScheme: "light",
            backdropFilter: "blur(4px)",
            borderRadius: 20,
            padding: "48px 40px",
            boxShadow:
              "0 20px 40px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0,0,0,0.02)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 0,
            }}
          >
            <img
              src={logo}
              alt="Logo"
              style={{
                height: 100,
                width: "auto",
                objectFit: "contain",
              }}
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
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  background: "#f8fafc",
                  paddingRight: 12,
                }}
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 15,
                    color: "#1e293b",
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
                    color: "black",
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
              disabled={isLoading || submitCooldown > 0}
              style={{
                ...buttonStyle,
                cursor: isLoading || submitCooldown > 0 ? "not-allowed" : "pointer",
                opacity: isLoading || submitCooldown > 0 ? 0.7 : 1,
              }}
            >
              {isLoading ? "Signing in..." : submitCooldown > 0 ? `Try again in ${submitCooldown}s` : "Sign in"}
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
          Enter the code sent to <strong>{maskEmail(email.trim())}</strong>.
        </p>
        <p style={timerTextStyle}>
          Code expires soon. You can request another code in {otpCountdown}s.
        </p>

        {/* shadcn InputOTP component */}
        <InputOTP
          maxLength={8}
          value={otp}
          onChange={(value) => setOtp(value.replace(/\D/g, ""))}
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

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => {
              setOtpRequired(false);
              setOtp("");
              setOtpCountdown(0);
              lastAttemptedOtpRef.current = "";
              setFormError(null);
            }}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={otpVerifying || otp.trim().length < 6}
            onClick={async () => {
              setOtpVerifying(true);
              try {
                const verifiedUser = await completeLoginOtp({
                  email: email.trim(),
                  otp: otp.trim(),
                });
                navigate(getPostLoginPath(verifiedUser), { replace: true });
              } catch (err) {
                setFormError(err?.message || "OTP verification failed");
              } finally {
                setOtpVerifying(false);
              }
            }}
            style={{
              ...buttonStyle,
              padding: "12px 18px",
              opacity: otpVerifying || otp.trim().length < 6 ? 0.7 : 1,
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
  color: "#64748b",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  fontSize: 15,
  background: "#f8fafc",
  color: "#1e293b",
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

const mutedTextStyle = {
  marginTop: 24,
  textAlign: "center",
  color: "#64748b",
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
  background: "white",
  colorScheme: "light",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  padding: 28,
  boxShadow: "0 30px 80px rgba(2, 6, 23, 0.3)",
};

const modalTitleStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: 0,
};

const modalTextStyle = {
  margin: "8px 0 18px",
  color: "#64748b",
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
  background: "white",
  color: "#334155",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
