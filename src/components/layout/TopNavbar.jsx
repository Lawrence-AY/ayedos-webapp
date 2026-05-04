import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";

export default function TopNavbar({ sidebarOpen, onToggleSidebar }) {
  const { user, logout } = useContext(AuthContext);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <header
      className="topbar"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        padding: "28px 36px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "1px solid rgba(10, 42, 67, 0.1)",
              background: "var(--color-white)",
              cursor: "pointer",
              transition: "all 200ms ease",
            }}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-text)" }}
            >
              {sidebarOpen ? (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        )}

        <div hidden>
          <p
            style={{
              margin: "2px 0 0",
              color: "rgba(255, 255, 255, 0.72)",
              fontSize: 13,
            }}
          >
            Dashboard{" "}
            <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
              ({user?.role || "MEMBER"})
            </span>
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "right", marginRight: 8 }}>
          <p
            style={{
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
              fontSize: 15,
            }}
          >
            {user?.name || "User"}
          </p>
          <p style={{ color: "var(--color-muted)", fontSize: 13, margin: 0 }}>
            {user?.email || ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: "10px 20px",
            borderRadius: 14,
            border: 0,
            background: "var(--color-secondary)",
            color: "var(--color-white)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 300ms ease",
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
