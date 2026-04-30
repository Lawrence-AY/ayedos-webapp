import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import logo from "../assets/logo-light.png";
import DotSwarmCanvas from "../components/landing/DotTextCanvas.jsx";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function Register() {
  const navigate = useNavigate();
  const { register, authError, isLoading } = useContext(AuthContext);
  const [value, setValue] = React.useState("");
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

    if (!firstName.trim()) return setFormError("First name is required");
    if (!lastName.trim()) return setFormError("Last name is required");
    if (!email.trim()) return setFormError("Email is required");
    if (!phone.trim()) return setFormError("Phone number is required");
    if (password.length < 8)
      return setFormError("Password must be at least 8 characters");
    if (password !== confirmPassword)
      return setFormError("Passwords do not match");

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: "MEMBER",
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setFormError(err?.message || "Registration failed");
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
      {/* Background Layer - Fixed to prevent gaps during scroll */}
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
            background: "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(4px)",
            borderRadius: 20,
            padding: "40px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.06)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
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
              margin: "0 0 32px 0",
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
              disabled={isLoading}
              style={{
                ...buttonStyle,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Show Dialog</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <InputOTP
                maxLength={6}
                value={value}
                onChange={(value) => setValue(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <div className="text-center text-sm">
                {value === "" ? (
                  <>Enter your one-time password.</>
                ) : (
                  <>You entered: {value}</>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div style={mutedTextStyle}>
            Already have an account?{" "}
            <a href="/login" style={linkStyle}>
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  fontSize: 15,
  background: "#f8fafc",
  color: "#1e293b",
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

const mutedTextStyle = {
  marginTop: 20,
  textAlign: "center",
  color: "#64748b",
  fontSize: 14,
};

const linkStyle = {
  color: "var(--color-primary, #003a16)",
  fontWeight: 700,
  textDecoration: "none",
};
