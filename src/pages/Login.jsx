import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import logo from "../assets/logo-light.png";

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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
        padding: "100px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 450,
          background: "white",
          borderRadius: 14,
          padding: 40,
          boxShadow: "0 10px 10px rgba(15, 34, 58, 0.2)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginBottom: 32,
          }}
        >
          <div>
            <img
              src={logo}
              alt="Logo"
              style={{
                height: 32,
                width: "auto",
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 28,
            fontWeight: 600,
            color: "var(--color-primary)",
            marginBottom: 8,
          }}
        >
          Welcome Back!
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 14,
                color: "var(--color-text)",
              }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 16,
                transition: "all 300ms ease",
                background: "white",
                color: "var(--color-text)",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 14,
                color: "var(--color-text)",
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 16,
                transition: "all 300ms ease",
                background: "white",
                color: "var(--color-text)",
              }}
              required
            />
          </div>

          {(formError || authError) && (
            <div
              role="alert"
              style={{
                marginBottom: 20,
                padding: 12,
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {formError || authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 14,
              border: 0,
              background: "var(--color-accent)",
              color: "var(--color-white)",
              fontWeight: 700,
              fontSize: 16,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              transition: "all 300ms ease",
            }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>

          <p
            style={{
              marginTop: 20,
              textAlign: "center",
              color: "var(--color-muted)",
              fontSize: 14,
            }}
          >
            Don't have an account?{" "}
            <a
              href="/register"
              style={{
                color: "var(--color-primary)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Create account
            </a>
          </p>

          <p
            style={{
              marginTop: 12,
              textAlign: "center",
            }}
          >
            <a
              href="/forgot-password"
              style={{
                color: "var(--color-muted)",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Forgot your password?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
