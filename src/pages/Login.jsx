import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import logo from "../assets/logo-light.png";
import DotSwarmCanvas from "../components/landing/DotTextCanvas.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login, authError, isLoading } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) return setFormError("Email is required");
    if (password.length < 6)
      return setFormError("Password must be at least 6 characters");

    try {
      await login({ email: email.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setFormError(err?.message || "Login failed");
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
        <DotSwarmCanvas
          textLine1="AYEDOS"
          textLine2="SACCO"
          color="#88cc63"
        />
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
            backdropFilter: "blur(4px)",  
            borderRadius: 20,
            padding: "48px 40px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0,0,0,0.02)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
          }}
        >
        
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <img
              src={logo}
              alt="Logo"
              style={{
                height: 40,
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
              color: "var(--color-primary, #1a202c)",
              marginBottom: 32,
            }}
          >
            Welcome Back !
          </div>

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="email" style={labelStyle}>Email Address</label>
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
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
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
              {isLoading ? "Signing in..." : "Sign in"}
            </button>

            <div style={mutedTextStyle}>
              Don't have an account?{" "}
              <a href="/register" style={linkStyle}>Create account</a>
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <a href="/forgot-password" style={forgotPasswordStyle}>
                Forgot your password?
              </a>
            </div>
          </form>
        </div>
      </div>
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