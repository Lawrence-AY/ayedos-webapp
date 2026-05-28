import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
import dashboardLogo from "../../assets/Dashboard.png";
import dashboardLogoDark from "../../assets/Dashboard-dark.png";

const memberNavItems = [
  { label: "Dashboard", suffix: "", exact: true, icon: LayoutDashboard },
 
  { label: "Deposit", suffix: "savings", icon: BriefcaseBusiness },
  { label: "Transactions", suffix: "transactions", icon: ReceiptText },
  { label: "Loans", suffix: "loans", icon: FileText },
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
          `group relative flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${
            collapsed ? "justify-center" : ""
          }`,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
          isActive
            ? "bg-white text-emerald-800 shadow-[0_14px_32px_rgba(6,63,42,0.14)] ring-1 ring-emerald-100 dark:bg-slate-900 dark:text-emerald-300 dark:ring-emerald-900/50"
            : "text-slate-600 hover:bg-white/70 hover:text-slate-950 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500"
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            />
          ) : null}
      <Icon
        className="transition duration-200 group-hover:scale-110"
        size={collapsed ? 22 : 18}
        strokeWidth={collapsed ? 2 : 1.8}
      />
      <span className={`truncate ${collapsed ? "sr-only" : ""}`}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open = false, onClose, collapsed = false }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const role = String(user?.role || "MEMBER").toUpperCase();
  const items = navItems[role] || navItems.MEMBER;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`fixed inset-y-0 left-0 z-40 flex ${
          collapsed ? "lg:w-20" : "w-62"
        } flex-col border-r border-emerald-900/10 bg-[linear-gradient(180deg,#f7fbf4_0%,#ffffff_42%,#eef7e9_100%)] shadow-[14px_0_45px_rgba(16,25,35,0.06)] transition-all duration-200 dark:border-slate-800 dark:bg-slate-950 dark:bg-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex min-h-20 items-center justify-between gap-3 border-b border-emerald-900/10 px-5 dark:border-slate-800">
         <div className="flex min-w-0 items-center gap-2">
  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-emerald-900/10 dark:bg-slate-900 dark:ring-slate-800">
    {/* Light mode logo */}
    <img 
      src={dashboardLogo}
      alt="AYEDOS Logo" 
      className="h-9 w-9 object-contain block dark:hidden" 
    />
    {/* Dark mode logo */}
    <img 
      src={dashboardLogoDark}
      alt="AYEDOS Logo" 
      className="h-9 w-9 object-contain hidden dark:block" 
    />
  </div>
  <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
    <p 
      className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-white"
      style={{ fontFamily: "Pirulen, sans-serif" }}
    >
      AYEDOS
    </p>
     <p 
      className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300"
      style={{ fontFamily: "Pirulen, sans-serif" }}
    >
      SACCO
    </p>
  </div>
</div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation - hidden scrollbar */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <p className={`mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 ${collapsed ? "lg:sr-only" : ""}`}>
            Workspace
          </p>
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

        {/* Footer / Logout */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className={`mb-3 rounded-lg bg-emerald-950 px-3 py-3 text-white shadow-sm ${collapsed ? "lg:hidden" : ""}`}>
            <p className="text-xs font-semibold text-emerald-200">Secure session</p>
            <p className="mt-1 text-sm font-bold">{role.charAt(0) + role.slice(1).toLowerCase()} portal</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
          >
            <LogOut
              className="transition duration-200 group-hover:scale-110"
              size={collapsed ? 22 : 18}
              strokeWidth={collapsed ? 2 : 1.8}
            />
            <span className={collapsed ? "lg:sr-only" : ""}>Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
