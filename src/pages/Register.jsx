import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import bgImage from "../assets/hero.png";
import logo from "../assets/logo-light.png";

export default function Register() {
  const navigate = useNavigate();
  const { register, authError, isLoading } = useContext(AuthContext);

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
      data-register-container
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        background: "var(--color-background)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left Column - Image with Wave */}
      <div
        data-register-image
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          height: "100vh",
          width: "100%",

          position: "relative",
        }}
      >
        {/* SVG Wave separator */}
        <svg
          style={{
            position: "absolute",
            right: "-80px",
            top: 0,
            width: "200px",
            height: "100%",
            preserveAspectRatio: "none",
            zIndex: 10,
          }}
          viewBox="0 0 100 1000"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter
              id="waveShadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
            </filter>
          </defs>
          <path
            d="M 0 0 C 120 150, 120 850, 0 1000 L 100 1000 L 100 0 Z"
            fill="white"
            opacity="1"
            filter="url(#waveShadow)"
          />
        </svg>

        {/* Content placeholder with gradient and text */}
        <div
          style={{
            textAlign: "center",
            color: "white",
            zIndex: 5,
            padding: "10px",
          }}
        ></div>
      </div>

      {/* Right Column - Form */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px",
          background: "var(--color-white)",
          overflowY: "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          <img
            src={logo}
            alt="Logo"
            style={{
              height: 50,
              width: "auto",
              objectFit: "contain",
              marginBottom: 30,
            }}
          />
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--color-primary)",
              margin: "0 0 24px 0",
            }}
          >
            Sign up
          </h1>

          <form onSubmit={onSubmit} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* First Name */}
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="First name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "white",
                  color: "var(--color-text)",
                  boxSizing: "border-box",
                }}
                required
              />

              {/* Last Name */}
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Last name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "white",
                  color: "var(--color-text)",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  transition: "all 300ms ease",
                  background: "white",
                  color: "var(--color-text)",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Phone number"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  transition: "all 300ms ease",
                  background: "white",
                  color: "var(--color-text)",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  transition: "all 300ms ease",
                  background: "white",
                  color: "var(--color-text)",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  transition: "all 300ms ease",
                  background: "white",
                  color: "var(--color-text)",
                  boxSizing: "border-box",
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
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                  fontWeight: 600,
                  fontSize: 13,
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
                padding: "12px 24px",
                borderRadius: 8,
                border: 0,
                background: "var(--color-accent)",
                color: "var(--color-white)",
                fontWeight: 700,
                fontSize: 14,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                transition: "all 300ms ease",
              }}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              color: "var(--color-muted)",
              fontSize: 13,
            }}
          >
            Already have an account?{" "}
            <a
              href="/login"
              style={{
                color: "var(--color-primary)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>

      {/* Responsive Media Query - Stack on smaller screens */}
      <style>{`
        @media (max-width: 1024px) {
          [data-register-container] {
            grid-template-columns: 1fr;
          }
          [data-register-image] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
