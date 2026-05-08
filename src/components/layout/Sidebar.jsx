import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  PieChart,
  ReceiptText,
  Settings,
  Shield,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { getDashboardPath } from "../../utils/dashboardRoutes.js";

const memberNavItems = [
  { label: "Dashboard", suffix: "", exact: true, icon: LayoutDashboard },
  { label: "My Account", suffix: "account", icon: WalletCards },
  { label: "Savings", suffix: "savings", icon: BriefcaseBusiness },
  { label: "Transactions", suffix: "transactions", icon: ReceiptText },
  { label: "Loans", suffix: "loans", icon: FileText },
  { label: "Applications", suffix: "applications", icon: FileText },
  { label: "Portfolio", suffix: "portfolio", icon: PieChart },
  { label: "Reports", suffix: "reports", icon: ReceiptText },
  { label: "Notifications", suffix: "notifications", icon: Bell },
  { label: "Security", suffix: "security", icon: Shield },
  { label: "Profile Settings", suffix: "settings", icon: Settings },
  { label: "Support", suffix: "support", icon: Headphones },
];

const adminNavItems = [
  { label: "Dashboard Overview", suffix: "", exact: true, icon: LayoutDashboard },
  { label: "Member Management", suffix: "members", icon: UserRound },
  { label: "Membership Applications", suffix: "applications", icon: FileText },
  { label: "Loan Management", suffix: "loans", icon: FileText },
  { label: "Transactions", suffix: "transactions", icon: ReceiptText },
  { label: "Savings Accounts", suffix: "savings", icon: BriefcaseBusiness },
  { label: "Share Accounts", suffix: "shares", icon: WalletCards },
  { label: "Dividends", suffix: "dividends", icon: BriefcaseBusiness },
  { label: "Salary Deductions", suffix: "deductions", icon: ReceiptText },
  { label: "Reports & Analytics", suffix: "reports", icon: LayoutDashboard },
  { label: "Notifications", suffix: "notifications", icon: Bell },
  { label: "Audit Logs", suffix: "audit-logs", icon: Shield },
  { label: "System Configuration", suffix: "configuration", icon: Settings },
  { label: "Staff & Roles", suffix: "staff-roles", icon: UserRound },
  { label: "Security", suffix: "security", icon: Shield },
  { label: "Support", suffix: "support", icon: Headphones },
];

const financeNavItems = [
  { label: "Dashboard", suffix: "", exact: true, icon: LayoutDashboard },
  { label: "Transactions", suffix: "transactions", icon: ReceiptText },
  { label: "Savings Accounts", suffix: "savings", icon: BriefcaseBusiness },
  { label: "Loan Disbursements", suffix: "loan-disbursements", icon: FileText },
  { label: "Loan Repayments", suffix: "loan-repayments", icon: FileText },
  { label: "Salary Deductions", suffix: "deductions", icon: ReceiptText },
  { label: "Dividends", suffix: "dividends", icon: BriefcaseBusiness },
  { label: "Financial Reports", suffix: "reports", icon: LayoutDashboard },
  { label: "Member Financial Profiles", suffix: "member-profiles", icon: UserRound },
  { label: "Notifications", suffix: "notifications", icon: Bell },
  { label: "Security", suffix: "security", icon: Shield },
];

const navItems = {
  ADMIN: adminNavItems,
  FINANCE: financeNavItems,
  MEMBER: memberNavItems,
};

function NavLinkItem({ to, label, icon: Icon, exact = false, onClick, collapsed = false }) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      className={({ isActive }) =>
        [
          `flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold transition ${collapsed ? "justify-center" : ""}`,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
          isActive
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-300 hover:bg-white/10 hover:text-white",
        ].join(" ")
      }
    >
      <Icon size={18} />
      <span className={`truncate ${collapsed ? "sr-only" : ""}`}>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open = false, onClose, collapsed = false }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const role = String(user?.role || "MEMBER").toUpperCase();
  const items = navItems[role] || navItems.MEMBER;
  const portalLabel =
    role === "ADMIN" ? "Administrator" : role === "FINANCE" ? "Finance Officer" : "Member Portal";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/45 transition lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex ${collapsed ? "lg:w-20" : "w-72"} flex-col border-r border-white/10 bg-[#07182d] text-white shadow-2xl transition-all duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-20 items-center justify-between gap-3 border-b border-white/10 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-500 text-base font-black text-slate-950">
              A
            </div>
            <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                AYEDOS SACCO
              </p>
              <p className="truncate text-lg font-semibold text-white">{portalLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {items.map((item) => (
            <NavLinkItem
              key={item.suffix || "dashboard"}
              to={getDashboardPath(role, item.suffix)}
              label={item.label}
              icon={item.icon}
              exact={item.exact}
              onClick={onClose}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="space-y-4 border-t border-white/10 p-4">
          <div className={`rounded-lg border border-white/10 bg-white/5 p-4 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Account security
            </p>
            <p className="mt-2 text-sm leading-5 text-slate-200">
              2 active sessions. Review new logins regularly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-100"
          >
            <LogOut size={18} />
            <span className={collapsed ? "lg:sr-only" : ""}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
