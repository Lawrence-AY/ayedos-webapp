import { NavLink } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/collapsible.jsx";
import { ChevronDown } from "lucide-react";

const navItems = {
  ADMIN: [
    { label: "Overview", to: "/dashboard", exact: true },
    { label: "Members", to: "/dashboard/members" },
    { label: "Applications", to: "/dashboard/applications" },
    { label: "Loans", to: "/dashboard/loans" },
    { label: "Shares", to: "/dashboard/shares" },
    { label: "Deductions", to: "/dashboard/deductions" },
    { label: "Settings", to: "/dashboard/settings" },
  ],
  FINANCE: [
    { label: "Overview", to: "/dashboard", exact: true },
    { label: "Transactions", to: "/dashboard/transactions" },
    { label: "Loans", to: "/dashboard/loans" },
    { label: "Shares", to: "/dashboard/shares" },
    { label: "Dividends", to: "/dashboard/dividends" },
    { label: "Deductions", to: "/dashboard/deductions" },
  ],
};

// =====================================
// NavLink Item Component
// =====================================
function NavLinkItem({ to, label, exact = false }) {
  return (
    <NavLink
      to={to}
      end={exact}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 14,
        color: isActive ? "var(--color-white)" : "rgba(255, 255, 255, 0.82)",
        background: isActive ? "var(--color-accent)" : "transparent",
        fontWeight: isActive ? 700 : 400,
        textDecoration: "none",
        fontSize: 15,
        transition: "all 180ms ease",
        borderLeft: isActive
          ? "3px solid var(--color-accent)"
          : "3px solid transparent",
        paddingLeft: isActive ? 13 : 16,
      })}
    >
      {label}
    </NavLink>
  );
}

// =====================================
// Member Portal Sidebar
// =====================================
function MemberSidebar() {
  const [balancesOpen, setBalancesOpen] = useState(false);

  return (
    <aside
      className="sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 8,
        }}
      >
        <div>
          <p
            className="eyebrow"
            style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: 12 }}
          >
            AYEDOS SACCO
          </p>
          <p
            style={{
              margin: "2px 0 0",
              color: "rgba(255,255,255,0.82)",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Member Portal
          </p>
        </div>
      </div>

      <nav
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}
      >
        {/* Overview */}
        <NavLinkItem to="/dashboard" label="Overview" exact={true} />

        {/* Balances Section */}
        <Collapsible open={balancesOpen} onOpenChange={setBalancesOpen}>
          <CollapsibleTrigger
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 14,
              color: "rgba(255, 255, 255, 0.82)",
              background: "transparent",
              fontWeight: 400,
              border: "none",
              fontSize: 15,
              transition: "all 180ms ease",
              borderLeft: "3px solid transparent",
              paddingLeft: 16,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <span>Balances</span>
            <ChevronDown
              size={18}
              style={{
                transition: "transform 180ms ease",
                transform: balancesOpen ? "rotate(180deg)" : "rotate(0)",
              }}
            />
          </CollapsibleTrigger>
          <CollapsibleContent
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              paddingLeft: 16,
              marginTop: 4,
            }}
          >
            <NavLinkItem
              to="/dashboard/balances/share-capital"
              label="Share Capital"
            />
            <NavLinkItem to="/dashboard/balances/savings" label="Savings" />
          </CollapsibleContent>
        </Collapsible>

        {/* Loans */}
        <NavLinkItem to="/dashboard/loans" label="Loans" />

        {/* Transactions */}
        <NavLinkItem to="/dashboard/transactions" label="Transactions" />
      </nav>

      {/* Settings at Bottom */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <NavLinkItem to="/dashboard/settings" label="Settings" />
        <div
          style={{
            marginTop: 12,
            padding: 18,
            borderRadius: 18,
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <p
            style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 11 }}
          >
            © 2026 AYEDOS SACCO
          </p>
          <p
            style={{
              margin: "4px 0 0",
              color: "rgba(255,255,255,0.3)",
              fontSize: 10,
            }}
          >
            v1.0.0
          </p>
        </div>
      </div>
    </aside>
  );
}

// =====================================
// Default Sidebar for Admin/Finance
// =====================================
function DefaultSidebar({ role, items }) {
  return (
    <aside
      className="sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 8,
        }}
      >
        <div>
          <p
            className="eyebrow"
            style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: 12 }}
          >
            AYEDOS SACCO
          </p>
          <p
            style={{
              margin: "2px 0 0",
              color: "rgba(255,255,255,0.82)",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {role === "ADMIN"
              ? "Administrator"
              : role === "FINANCE"
                ? "Finance Officer"
                : "Member Portal"}
          </p>
        </div>
      </div>

      <nav
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 14,
              color: isActive
                ? "var(--color-white)"
                : "rgba(255, 255, 255, 0.82)",
              background: isActive ? "var(--color-accent)" : "transparent",
              fontWeight: isActive ? 700 : 400,
              textDecoration: "none",
              fontSize: 15,
              transition: "all 180ms ease",
              borderLeft: isActive
                ? "3px solid var(--color-accent)"
                : "3px solid transparent",
              paddingLeft: isActive ? 13 : 16,
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: 18,
          borderRadius: 18,
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
          © 2026 AYEDOS SACCO
        </p>
        <p
          style={{
            margin: "4px 0 0",
            color: "rgba(255,255,255,0.3)",
            fontSize: 10,
          }}
        >
          v1.0.0
        </p>
      </div>
    </aside>
  );
}

// =====================================
// Main Sidebar Export
// =====================================
export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const role = user?.role || "MEMBER";
  const items = navItems[role] || navItems.MEMBER;

  // Use enhanced member sidebar for MEMBER role
  if (role === "MEMBER") {
    return <MemberSidebar />;
  }

  // Use default sidebar for ADMIN and FINANCE roles
  return <DefaultSidebar role={role} items={items} />;
}
