import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Fingerprint,
  KeyRound,
  Landmark,
  LockKeyhole,
  MailCheck,
  MapPin,
  MonitorSmartphone,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import {
  getMyLoans,
  getMyShares,
  getMyTransactions,
  updateMemberProfile,
  applyForLoan,
  emailMemberReport,
  repayLoan,
  depositSavings,
} from "../features/member/memberService.js";
import { changePassword, getAuthSessions, revokeAuthSession } from "../services/authService.js";

const emptyProfile = {
  fullName: "",
  email: "",
  phone: "",
  nationalId: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  employer: "",
  jobTitle: "",
  monthlyIncome: "",
  payrollNumber: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
};

const MIN_SHARE_CAPITAL = 25000;

const LOAN_PRODUCTS = [
  { type: "EMERGENCY", name: "Emergency Loan", max: 50000, interestRate: 1, duration: 12, guarantors: 0, requiresFullShareCapital: false },
  { type: "EDUCATION", name: "Education Loan", max: 100000, interestRate: 1, duration: 12, guarantors: 2, requiresFullShareCapital: true },
  { type: "WELFARE", name: "Welfare Loan", max: 100000, interestRate: 1.5, duration: 24, guarantors: 2, requiresFullShareCapital: true },
  { type: "DEVELOPMENT", name: "Development Loan", max: 250000, interestRate: 2, duration: 72, guarantors: 3, requiresFullShareCapital: true },
];

function formatCurrency(value) {
  return `KSh ${Math.abs(Math.round(Number(value || 0))).toLocaleString()}`;
}

function normalizeStatus(status) {
  return String(status || "Pending").replace(/_/g, " ");
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status).toLowerCase();
  if (["completed", "approved", "verified", "trusted"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (["processing", "pending", "reviewed"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }
  if (["blocked", "failed", "rejected"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

function searchTextFrom(value, seen = new WeakSet()) {
  if (value === null || typeof value === "undefined") return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => searchTextFrom(item, seen)).join(" ");
  if (typeof value === "object") {
    if (seen.has(value)) return "";
    seen.add(value);
    return Object.entries(value)
      .filter(([key]) => !["password", "otp", "token", "refreshToken", "accessToken"].some((secret) => key.toLowerCase().includes(secret.toLowerCase())))
      .map(([, item]) => searchTextFrom(item, seen))
      .join(" ");
  }
  return "";
}

function matchesSearch(value, search) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return searchTextFrom(value).toLowerCase().includes(term);
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function Surface({ children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="h-28 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, helper, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <Surface className="group p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,23,42,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={21} />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          <TrendingUp size={13} />
          {trend}
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
    </Surface>
  );
}

function QuickActions() {
  const actions = [
    { label: "Apply Loan", icon: FileText, to: "loans" },
    { label: "Repay Loan", icon: CreditCard, to: "loans" },
    { label: "Deposit Savings", icon: PiggyBank, to: "savings" },
    { label: "Transfer Funds", icon: Send, to: "transactions" },
    { label: "Request Report", icon: Download, to: "reports" },
    { label: "View Portfolio", icon: WalletCards, to: "portfolio" },
    { label: "Update Profile", icon: UserRound, to: "settings" },
  ];

  return (
    <Surface className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">
            Quick actions
          </h2>
          <p className="text-sm text-slate-500">Common member tasks</p>
        </div>
        <Plus className="text-emerald-700" size={20} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={getDashboardPath("MEMBER", action.to)}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <span className="flex min-w-0 items-center gap-3">
              <action.icon size={18} />
              <span className="truncate">{action.label}</span>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </div>
    </Surface>
  );
}

function ProfileCompletion({ user }) {
  const checks = [
    { label: "Upload ID", complete: Boolean(user?.nationalIdDocument || user?.nationalIdUrl), icon: Upload },
    { label: "Verify phone number", complete: Boolean(user?.phoneVerified || user?.isPhoneVerified), icon: Smartphone },
    { label: "Add next of kin", complete: Boolean(user?.nextOfKinName || user?.nextOfKin?.name), icon: UsersRound },
  ];
  const completed = checks.filter((item) => item.complete).length;
  const completion = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((item) => !item.complete);

  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">
            Profile completion
          </h2>
          <p className="text-sm text-slate-500">Finish verification to unlock faster approvals.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {completion}%
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${completion}%` }} />
      </div>
      <div className="mt-5 space-y-3">
        {missing.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={17} />
            Profile verification is complete
          </div>
        ) : missing.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-3 text-slate-700">
              <item.icon size={17} />
              {item.label}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Pending
            </span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function NotificationsPanel({ items = [], compact = false }) {
  return (
    <Surface className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">
            Notifications
          </h2>
          <p className="text-sm text-slate-500">Security and account alerts</p>
        </div>
        <Bell size={20} className="text-slate-500" />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Loan, deposit, profile, and security notifications will appear here when available."
        />
      ) : (
      <div className={compact ? "space-y-3" : "grid gap-3 md:grid-cols-2"}>
        {items.map((notice) => (
          <div
            key={notice.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  notice.tone === "success"
                    ? "bg-emerald-500"
                    : notice.tone === "warning"
                      ? "bg-amber-500"
                      : "bg-sky-500"
                }`}
              />
              <div>
                <p className="font-semibold text-slate-900">{notice.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{notice.body}</p>
                <p className="mt-2 text-xs font-medium text-slate-500">{notice.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </Surface>
  );
}

function TransactionsTable({ transactions }) {
  const rows = transactions;

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">
            Recent transactions
          </h2>
          <p className="text-sm text-slate-500">Deposits, transfers, dividends, and repayments</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Download size={16} />
          Export
        </button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No transactions yet"
          description="Your deposits, repayments, and transfers will appear here."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[760px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Transaction type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Reference
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((transaction, index) => {
                  const amount = Number(transaction.amount || transaction.value || 0);
                  const type = normalizeStatus(transaction.type || transaction.transactionType);
                  const createdAt = transaction.createdAt || transaction.date;
                  return (
                    <tr key={transaction.id || index} className="bg-white transition hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {createdAt ? new Date(createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">{type}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {transaction.reference || transaction.id || "-"}
                      </td>
                      <td className={`px-5 py-4 text-right text-sm font-semibold ${amount < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        {amount < 0 ? "-" : "+"}
                        {formatCurrency(amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(transaction.status || "Completed")}`}>
                          {normalizeStatus(transaction.status || "Completed")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>Showing 1-4 of {Math.max(rows.length, 4)} records</span>
            <div className="flex items-center gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500">
                <ChevronLeft size={16} />
              </button>
              <span className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">1</span>
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </Surface>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={26} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function DashboardOverview({ stats, transactions, memberName, user, notifications }) {
  const cards = [
    {
      label: "Account Balance",
      value: formatCurrency(stats.balance),
      icon: WalletCards,
      trend: "+8.4%",
      helper: "Available for transfers and repayments",
      tone: "emerald",
    },
    {
      label: "Savings Balance",
      value: formatCurrency(stats.totalSavings),
      icon: PiggyBank,
      trend: "+12.2%",
      helper: "Monthly saving target is on track",
      tone: "blue",
    },
    {
      label: "Active Loan Balance",
      value: formatCurrency(stats.loanBalance),
      icon: Landmark,
      trend: "-4.1%",
      helper: `${stats.activeLoans} active loan${stats.activeLoans === 1 ? "" : "s"}`,
      tone: "amber",
    },
    {
      label: "Monthly Contributions",
      value: formatCurrency(stats.monthlyContributions),
      icon: CalendarClock,
      trend: "Paid",
      helper: "Next contribution window closes May 31",
      tone: "slate",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(135deg,#07182d_0%,#0f3443_48%,#155e3f_100%)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
              Member dashboard
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
              Welcome back, {memberName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Monitor your savings, loans, security alerts, and SACCO activity from one trusted workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to={getDashboardPath("MEMBER", "loans")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-50"
            >
              <FileText size={17} />
              Apply loan
            </Link>
            <Link
              to={getDashboardPath("MEMBER", "security")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <ShieldCheck size={17} />
              Review security
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <Surface className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-normal text-slate-950">Share capital requirement</h2>
            <p className="mt-1 text-sm text-slate-500">
              {stats.shareCapitalRemaining > 0
                ? `${formatCurrency(stats.shareCapitalRemaining)} remaining to reach the minimum share capital of ${formatCurrency(MIN_SHARE_CAPITAL)}.`
                : "Minimum share capital requirement has been met."}
            </p>
          </div>
          <div className="min-w-56">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>{formatCurrency(stats.totalSavings)}</span>
              <span>{Math.round(stats.shareCapitalProgress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${stats.shareCapitalProgress}%` }} />
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <TransactionsTable transactions={transactions} />
          <NotificationsPanel items={notifications} />
        </div>
        <div className="space-y-5">
          <QuickActions />
          <ProfileCompletion user={user} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", error, as = "input" }) {
  const controlClass =
    "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {as === "textarea" ? (
        <textarea
          className={`${controlClass} min-h-24 resize-y`}
          name={name}
          value={value}
          onChange={onChange}
        />
      ) : (
        <input
          className={controlClass}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
        />
      )}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function ProfileSettings({ user, accessToken, onProfileUpdated }) {
  const [form, setForm] = useState(() => ({
    ...emptyProfile,
    fullName: user?.name || user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    nationalId: user?.nationalId || "",
    dateOfBirth: user?.dateOfBirth || "",
    gender: user?.gender || "",
    address: user?.address || "",
    employer: user?.employer || "",
    jobTitle: user?.jobTitle || "",
    monthlyIncome: user?.monthlyIncome || "",
    payrollNumber: user?.payrollNumber || "",
    nextOfKinName: user?.nextOfKinName || user?.nextOfKin?.name || "",
    nextOfKinRelationship: user?.nextOfKinRelationship || user?.nextOfKin?.relationship || "",
    nextOfKinPhone: user?.nextOfKinPhone || user?.nextOfKin?.phone || "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [preview, setPreview] = useState(null);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  function validate() {
    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Enter a valid email address.";
    if (form.phone.replace(/\D/g, "").length < 10) nextErrors.phone = "Enter a valid phone number.";
    if (!form.nationalId.trim()) nextErrors.nationalId = "National ID is required.";
    if (!form.nextOfKinName.trim()) nextErrors.nextOfKinName = "Next of kin name is required.";
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setAlert({ type: "error", message: "Please review the highlighted fields." });
      return;
    }

    setSaving(true);
    try {
      await updateMemberProfile({
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        nationalId: form.nationalId,
        address: form.address,
        occupation: form.jobTitle,
        monthlyIncome: form.monthlyIncome,
        payrollNumber: form.payrollNumber,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        employer: form.employer,
        nextOfKin: {
          name: form.nextOfKinName,
          relationship: form.nextOfKinRelationship,
          phone: form.nextOfKinPhone,
        },
      }, accessToken);
      await onProfileUpdated?.();
      setAlert({ type: "success", message: "Profile changes saved successfully." });
    } catch (error) {
      setAlert({ type: "error", message: error?.message || "Failed to save profile changes." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Profile settings"
        title="Member profile"
        description="Keep personal, employment, next of kin, and verification records accurate for faster SACCO services."
      />

      {alert ? (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${alert.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {alert.message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Surface className="p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-500">
                {preview ? (
                  <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={32} />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-normal text-slate-950">Profile picture</h2>
                <p className="text-sm text-slate-500">Upload a clear member profile photo.</p>
              </div>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <Camera size={17} />
              Upload photo
              <input type="file" accept="image/*" className="sr-only" onChange={handleImage} />
            </label>
          </div>
        </Surface>

        <EditableSection title="Personal information" icon={UserRound}>
          <Field label="Full Name" name="fullName" value={form.fullName} onChange={update} error={errors.fullName} />
          <Field label="Email" name="email" value={form.email} onChange={update} error={errors.email} />
          <Field label="Phone Number" name="phone" value={form.phone} onChange={update} error={errors.phone} />
          <Field label="National ID" name="nationalId" value={form.nationalId} onChange={update} error={errors.nationalId} />
          <Field label="Date of Birth" name="dateOfBirth" value={form.dateOfBirth} onChange={update} type="date" />
          <Field label="Gender" name="gender" value={form.gender} onChange={update} />
          <div className="md:col-span-2">
            <Field label="Address" name="address" value={form.address} onChange={update} as="textarea" />
          </div>
        </EditableSection>

        <EditableSection title="Employment information" icon={BriefcaseBusiness}>
          <Field label="Employer" name="employer" value={form.employer} onChange={update} />
          <Field label="Job Title" name="jobTitle" value={form.jobTitle} onChange={update} />
          <Field label="Monthly Income" name="monthlyIncome" value={form.monthlyIncome} onChange={update} type="number" />
          <Field label="Payroll Number" name="payrollNumber" value={form.payrollNumber} onChange={update} />
        </EditableSection>

        <EditableSection title="Next of kin" icon={UsersRound}>
          <Field label="Name" name="nextOfKinName" value={form.nextOfKinName} onChange={update} error={errors.nextOfKinName} />
          <Field label="Relationship" name="nextOfKinRelationship" value={form.nextOfKinRelationship} onChange={update} />
          <Field label="Phone Number" name="nextOfKinPhone" value={form.nextOfKinPhone} onChange={update} />
        </EditableSection>

        <DocumentUploads />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <RefreshCw className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
            {saving ? "Saving changes" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditableSection({ title, icon: Icon, children }) {
  return (
    <Surface className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
          <Icon size={20} />
        </div>
        <h2 className="text-base font-semibold tracking-normal text-slate-950">{title}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </Surface>
  );
}

function DocumentUploads() {
  const documents = ["Profile Picture", "National ID", "Payslip", "KRA PIN"];
  return (
    <Surface className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
          <FileCheck2 size={20} />
        </div>
        <h2 className="text-base font-semibold tracking-normal text-slate-950">Document uploads</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {documents.map((document) => (
          <label
            key={document}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <span className="flex items-center gap-3 font-semibold text-slate-800">
              <Upload size={17} />
              {document}
            </span>
            <span className="text-xs font-medium text-slate-500">PDF, JPG, PNG</span>
            <input type="file" className="sr-only" />
          </label>
        ))}
      </div>
    </Surface>
  );
}

function SecuritySection({ user, accessToken, activeSessions = [], loginHistory = [], onRefresh }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState(null);
  const emailVerified = Boolean(user?.emailVerified || user?.isEmailVerified);

  function updatePassword(event) {
    setPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: "error", text: "Use at least 8 characters for the new password." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, accessToken);
      setMessage({ type: "success", text: "Password changed successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Failed to change password." });
    }
  }

  async function handleRevokeSession(sessionId) {
    setMessage(null);
    try {
      await revokeAuthSession(sessionId, accessToken);
      setMessage({ type: "success", text: "Session revoked successfully." });
      await onRefresh?.();
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Failed to revoke session." });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Security center"
        title="Protect your AYEDOS account"
        description="Review account access, password health, login history, email verification, and future two-factor authentication readiness."
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck size={17} />
            Security score 86%
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <SecurityMetric icon={LockKeyhole} label="Password" value="Strong" tone="emerald" />
        <SecurityMetric icon={Fingerprint} label="2FA" value="Coming soon" tone="amber" />
        <SecurityMetric icon={MonitorSmartphone} label="Active sessions" value={activeSessions.length} tone="blue" />
        <SecurityMetric icon={MailCheck} label="Email status" value={emailVerified ? "Verified" : "Unverified"} tone={emailVerified ? "emerald" : "amber"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Surface className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-normal text-slate-950">Change password</h2>
              <p className="text-sm text-slate-500">Use a unique password for your SACCO account.</p>
            </div>
          </div>

          {message ? (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {message.text}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <Field label="Current password" name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={updatePassword} />
            <Field label="New password" name="newPassword" type="password" value={passwordForm.newPassword} onChange={updatePassword} />
            <Field label="Confirm new password" name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={updatePassword} />
            <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              <LockKeyhole size={17} />
              Update password
            </button>
          </form>
        </Surface>

        <div className="space-y-5">
          <Surface className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-normal text-slate-950">Two-factor authentication</h2>
                <p className="mt-1 text-sm text-slate-500">Authenticator and SMS verification will be available in a future release.</p>
              </div>
              <button
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
              >
                <Fingerprint size={17} />
                Enable later
              </button>
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-normal text-slate-950">Email verification status</h2>
                <p className="mt-1 text-sm text-slate-500">{user?.email || "No email on file"}</p>
              </div>
              <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${emailVerified ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                {emailVerified ? <BadgeCheck size={16} /> : <AlertCircle size={16} />}
                {emailVerified ? "Verified" : "Verification pending"}
              </span>
            </div>
          </Surface>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Surface className="overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-base font-semibold tracking-normal text-slate-950">Active sessions</h2>
            <p className="text-sm text-slate-500">Devices currently trusted to access your account.</p>
          </div>
          {activeSessions.length === 0 ? (
            <EmptyState
              icon={MonitorSmartphone}
              title="No active sessions"
              description="Trusted devices will appear here after successful sign in."
            />
          ) : (
          <div className="divide-y divide-slate-100">
            {activeSessions.map((session) => (
              <div key={session.id || `${session.device}-${session.ip}`} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600">
                    <MonitorSmartphone size={19} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{session.device}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <MapPin size={14} />
                      {session.location}
                      <span>{session.ip}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className="text-sm font-medium text-slate-600">{session.lastActive ? new Date(session.lastActive).toLocaleString() : "-"}</span>
                  {session.current ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Current device</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-800"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </Surface>

        <Surface className="overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-base font-semibold tracking-normal text-slate-950">Login history</h2>
            <p className="text-sm text-slate-500">Recent account access events and verification results.</p>
          </div>
          {loginHistory.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title="No login history"
              description="Recent login and security events will appear here when available."
            />
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[560px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Event</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Device</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Location</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">IP</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loginHistory.map((item) => (
                  <tr key={`${item.date}-${item.event}`} className="bg-white">
                    <td className="px-5 py-4 text-sm text-slate-600">{item.date}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{item.event}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{item.device}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{item.location}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{item.ip}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Surface>
      </div>
    </div>
  );
}

function SecurityMetric({ icon: Icon, label, value, tone }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-sky-50 text-sky-700",
  };

  return (
    <Surface className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-normal text-slate-950">{value}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
    </Surface>
  );
}

function LoansPage({ loans, stats, accessToken, onRefresh, search }) {
  const [loanForm, setLoanForm] = useState({ type: "EMERGENCY", amount: "10000", duration: "12" });
  const [repayAmount, setRepayAmount] = useState("");
  const [message, setMessage] = useState(null);
  const activeLoans = loans.filter((loan) => ["ACTIVE", "APPROVED"].includes(String(loan.status || "").toUpperCase()));
  const [repayLoanId, setRepayLoanId] = useState("");
  const totalBalance = activeLoans.reduce((sum, loan) => sum + Number(loan.balance || loan.principal || 0), 0);
  const rows = loans.filter((loan) => matchesSearch(loan, search));
  const selectedProduct = LOAN_PRODUCTS.find((product) => product.type === loanForm.type) || LOAN_PRODUCTS[0];
  const selectedRepayLoanId = repayLoanId || activeLoans[0]?.id || "";
  const requestedAmount = Math.min(Number(loanForm.amount || 0), selectedProduct.max);
  const requestedDuration = Math.min(Number(loanForm.duration || 1), selectedProduct.duration);
  const totalInterest = requestedAmount * (selectedProduct.interestRate / 100) * requestedDuration;
  const monthlyRepayment = requestedDuration ? (requestedAmount + totalInterest) / requestedDuration : 0;

  async function requestLoan(event) {
    event.preventDefault();
    try {
      await applyForLoan({
        type: loanForm.type,
        amount: requestedAmount,
        duration: requestedDuration,
        interestRate: selectedProduct.interestRate,
      }, accessToken);
      setMessage({ type: "success", text: "Loan request submitted successfully." });
      await onRefresh?.();
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Failed to request loan." });
    }
  }

  function submitRepayment(event) {
    event.preventDefault();
    repayLoan(selectedRepayLoanId, repayAmount, accessToken)
      .then(async () => {
        setMessage({ type: "success", text: "Loan repayment recorded successfully." });
        setRepayAmount("");
        await onRefresh?.();
      })
      .catch((error) => setMessage({ type: "error", text: error?.message || "Failed to repay loan." }));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Loans"
        title="Loan management"
        description="Apply for SACCO loan products, review active balances, and prepare for repayment workflows."
        action={
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            <Plus size={17} />
            New application
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={FileText} label="Active loans" value={activeLoans.length} trend="Live" helper="Approved or currently active facilities" tone="blue" />
        <StatCard icon={CreditCard} label="Outstanding balance" value={formatCurrency(totalBalance)} trend="-4.1%" helper="Estimated from loan records" tone="amber" />
        <StatCard icon={Clock3} label="Next repayment" value="-" trend="Pending" helper="Repayment schedule will appear when available" tone="slate" />
      </div>
      {message ? (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Surface className="p-5">
          <h2 className="text-base font-semibold tracking-normal text-slate-950">Request a loan</h2>
          <form onSubmit={requestLoan} className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Loan product
              <select value={loanForm.type} onChange={(event) => setLoanForm((current) => ({ ...current, type: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm">
                {LOAN_PRODUCTS.map((product) => <option key={product.type} value={product.type}>{product.name}</option>)}
              </select>
            </label>
            <Field label="Amount" name="amount" type="number" value={loanForm.amount} onChange={(event) => setLoanForm((current) => ({ ...current, amount: event.target.value }))} />
            <Field label="Duration (months)" name="duration" type="number" value={loanForm.duration} onChange={(event) => setLoanForm((current) => ({ ...current, duration: event.target.value }))} />
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              <FileText size={17} />
              Request loan
            </button>
          </form>
        </Surface>

        <Surface className="p-5">
          <h2 className="text-base font-semibold tracking-normal text-slate-950">Repay a loan</h2>
          <form onSubmit={submitRepayment} className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Loan
              <select value={selectedRepayLoanId} onChange={(event) => setRepayLoanId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm">
                {activeLoans.length === 0 ? <option value="">No active loans</option> : activeLoans.map((loan) => <option key={loan.id} value={loan.id}>{loan.type} - {formatCurrency(loan.balance || loan.principal)}</option>)}
              </select>
            </label>
            <Field label="Repayment amount" name="repayAmount" type="number" value={repayAmount} onChange={(event) => setRepayAmount(event.target.value)} />
            <button disabled={!selectedRepayLoanId || !repayAmount} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 disabled:opacity-60">
              <CreditCard size={17} />
              Start repayment
            </button>
          </form>
        </Surface>
      </div>

      <EligibilityChecks stats={stats} />
      <LoansTable loans={rows} />
      <LoanProducts stats={stats} />
      <LoanCalculator product={selectedProduct} amount={requestedAmount} duration={requestedDuration} totalInterest={totalInterest} monthlyRepayment={monthlyRepayment} />
    </div>
  );
}

function LoanProducts({ stats }) {
  return (
    <Surface className="p-5">
      <h2 className="text-base font-semibold tracking-normal text-slate-950">Available loan products</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LOAN_PRODUCTS.map((product) => {
          const eligible = !product.requiresFullShareCapital || stats.shareCapitalRemaining === 0;
          return (
          <div key={product.type} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold tracking-normal text-slate-950">{product.name}</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><strong className="text-slate-900">Maximum:</strong> {formatCurrency(product.max)}</p>
              <p><strong className="text-slate-900">Interest:</strong> {product.interestRate}% monthly</p>
              <p><strong className="text-slate-900">Guarantors:</strong> {product.guarantors || "Not required"}</p>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eligible ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {eligible ? "Eligible" : "Not yet eligible"}
              </span>
            </div>
          </div>
        )})}
      </div>
    </Surface>
  );
}

function EligibilityChecks({ stats }) {
  const checks = [
    { label: "Minimum share capital", passed: stats.shareCapitalRemaining === 0, helper: stats.shareCapitalRemaining === 0 ? "Met" : `${formatCurrency(stats.shareCapitalRemaining)} remaining` },
    { label: "Active membership", passed: true, helper: "Account is active" },
    { label: "No overdue loan data", passed: true, helper: "Backend overdue checks can attach here" },
  ];
  return (
    <Surface className="p-5">
      <h2 className="text-base font-semibold tracking-normal text-slate-950">Loan eligibility checks</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {checks.map((check) => (
          <div key={check.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{check.label}</p>
            <p className={`mt-2 text-sm font-semibold ${check.passed ? "text-emerald-700" : "text-amber-700"}`}>{check.passed ? "Passed" : "Pending"}</p>
            <p className="mt-1 text-sm text-slate-500">{check.helper}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function LoansTable({ loans }) {
  return (
    <Surface className="overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-semibold tracking-normal text-slate-950">My loan records</h2>
        <p className="text-sm text-slate-500">Requests, approvals, active balances, and repayments.</p>
      </div>
      {loans.length === 0 ? <EmptyState icon={FileText} title="No loans found" description="Loan requests and repayments will appear here." /> : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px]">
            <thead><tr className="bg-slate-50"><th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">Type</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">Amount</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">Balance</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{loans.map((loan) => <tr key={loan.id}><td className="px-5 py-4 text-sm font-semibold text-slate-900">{loan.type}</td><td className="px-5 py-4 text-sm">{formatCurrency(loan.principal)}</td><td className="px-5 py-4 text-sm">{formatCurrency(loan.balance)}</td><td className="px-5 py-4 text-sm">{normalizeStatus(loan.status)}</td><td className="px-5 py-4 text-sm">{loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : "-"}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </Surface>
  );
}

function LoanCalculator({ product, amount, duration, totalInterest, monthlyRepayment }) {
  return (
    <Surface className="p-5">
      <h2 className="text-base font-semibold tracking-normal text-slate-950">Loan calculator</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <StatCard icon={Landmark} label="Product" value={product.name} trend="Selected" helper="Based on request form" tone="blue" />
        <StatCard icon={WalletCards} label="Principal" value={formatCurrency(amount)} trend="Estimate" helper={`Max ${formatCurrency(product.max)}`} tone="emerald" />
        <StatCard icon={TrendingUp} label="Total interest" value={formatCurrency(totalInterest)} trend={`${product.interestRate}%`} helper={`${duration} months`} tone="amber" />
        <StatCard icon={CreditCard} label="Monthly repayment" value={formatCurrency(monthlyRepayment)} trend="Estimate" helper="Before fees or penalties" tone="slate" />
      </div>
    </Surface>
  );
}

function SimplePage({ eyebrow, title, description, icon: Icon, children }) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <Surface className="p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
            <Icon size={27} />
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </Surface>
    </div>
  );
}

function PortfolioPage({ stats, transactions, shares, search, user }) {
  const filteredTransactions = transactions.filter((transaction) => matchesSearch(transaction, search));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Portfolio"
        title="My SACCO portfolio"
        description="A consolidated view of your savings, share capital, loan exposure, and recent financial activity."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={PiggyBank} label="Share Capital" value={formatCurrency(stats.totalSavings)} trend={`${Math.round(stats.shareCapitalProgress)}%`} helper={`${formatCurrency(stats.shareCapitalRemaining)} remaining`} tone="emerald" />
        <StatCard icon={Landmark} label="Loan Exposure" value={formatCurrency(stats.loanBalance)} trend={`${stats.activeLoans} active`} helper="Outstanding loan balance" tone="amber" />
        <StatCard icon={ReceiptText} label="Transactions" value={filteredTransactions.length} trend="Filtered" helper="Matches current search" tone="blue" />
        <StatCard icon={WalletCards} label="Accounts" value={shares.length} trend="Live" helper="Share and savings records" tone="slate" />
      </div>
      <ReadOnlyPortfolioDetails user={user} />
      <TransactionsTable transactions={filteredTransactions} />
    </div>
  );
}

function ReadOnlyPortfolioDetails({ user }) {
  const details = [
    ["Member name", user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "-"],
    ["Email", user?.email || "-"],
    ["Phone", user?.phone || "-"],
    ["National ID", user?.nationalId || user?.Member?.nationalId || "-"],
    ["Member number", user?.Member?.memberNumber || "-"],
    ["Membership type", user?.Member?.type || "Member"],
  ];

  return (
    <Surface className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
          <WalletCards size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">Portfolio details</h2>
          <p className="text-sm text-slate-500">Read-only member details from backend records.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function SearchResultsPage({ search, data, stats, user }) {
  const resultGroups = [
    {
      title: "Transactions",
      icon: ReceiptText,
      items: data.transactions.filter((item) => matchesSearch(item, search)),
      render: (item) => `${normalizeStatus(item.type || item.transactionType || "Transaction")} - ${formatCurrency(item.amount)} - ${item.reference || item.status || item.id || ""}`,
      to: "transactions",
    },
    {
      title: "Loans",
      icon: FileText,
      items: data.loans.filter((item) => matchesSearch(item, search)),
      render: (item) => `${normalizeStatus(item.type || "Loan")} - ${formatCurrency(item.balance || item.principal)} - ${normalizeStatus(item.status)}`,
      to: "loans",
    },
    {
      title: "Shares and Savings",
      icon: PiggyBank,
      items: data.shares.filter((item) => matchesSearch(item, search)),
      render: (item) => `${item.type || "Share record"} - ${formatCurrency(item.totalInvested || item.shares || item.amount)} - ${item.status || ""}`,
      to: "savings",
    },
    {
      title: "Security Sessions",
      icon: MonitorSmartphone,
      items: [...data.activeSessions, ...data.loginHistory].filter((item) => matchesSearch(item, search)),
      render: (item) => `${item.device || item.deviceName || "Device"} - ${item.location || ""} ${item.ip || ""} - ${item.status || item.event || ""}`,
      to: "security",
    },
    {
      title: "Profile",
      icon: UserRound,
      items: matchesSearch(user, search) ? [user] : [],
      render: () => `${user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Member"} - ${user?.email || ""} - ${user?.phone || ""}`,
      to: "settings",
    },
  ];

  const totalResults = resultGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Search"
        title={`Search results for "${search}"`}
        description={`${totalResults} result${totalResults === 1 ? "" : "s"} found across dashboard data, records, profile, and security events.`}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Search} label="Matches" value={totalResults} trend="Live" helper="Updates as data refreshes" tone="blue" />
        <StatCard icon={WalletCards} label="Balance" value={formatCurrency(stats.balance)} trend="Context" helper="Current account context" tone="emerald" />
        <StatCard icon={MonitorSmartphone} label="Sessions" value={data.activeSessions.length} trend="Protected" helper="Only one active device is allowed" tone="slate" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {resultGroups.map((group) => (
          <Surface key={group.title} className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-200 p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
                <group.icon size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-normal text-slate-950">{group.title}</h2>
                <p className="text-sm text-slate-500">{group.items.length} matching record{group.items.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            {group.items.length === 0 ? (
              <EmptyState icon={group.icon} title="No matches" description="Try a name, status, amount, reference, device, IP, location, or page term." />
            ) : (
              <div className="divide-y divide-slate-100">
                {group.items.slice(0, 8).map((item, index) => (
                  <Link
                    key={item?.id || `${group.title}-${index}`}
                    to={getDashboardPath("MEMBER", group.to)}
                    className="block px-5 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {group.render(item)}
                  </Link>
                ))}
              </div>
            )}
          </Surface>
        ))}
      </div>
    </div>
  );
}

function ReportsPage({ accessToken }) {
  const [reportType, setReportType] = useState("portfolio");
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);

  async function requestReport(event) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      await emailMemberReport(reportType, accessToken);
      setMessage({ type: "success", text: "Report request sent. Check your registered email." });
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Failed to request report." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Reports"
        title="Request member reports"
        description="Request portfolio, transaction, savings, or loan reports and receive them on your registered email."
      />
      <Surface className="p-5">
        {message ? (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {message.text}
          </div>
        ) : null}
        <form onSubmit={requestReport} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="text-sm font-semibold text-slate-700">
            Report type
            <select value={reportType} onChange={(event) => setReportType(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm">
              <option value="portfolio">Portfolio report</option>
              <option value="transactions">Transaction statement</option>
              <option value="loans">Loan statement</option>
              <option value="savings">Savings and share capital report</option>
            </select>
          </label>
          <button disabled={sending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            <MailCheck size={17} />
            {sending ? "Sending..." : "Email report"}
          </button>
        </form>
      </Surface>
    </div>
  );
}

function SavingsPage({ stats, accessToken, onRefresh }) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState(null);

  async function submitDeposit(event) {
    event.preventDefault();
    try {
      await depositSavings(amount, accessToken);
      setMessage({ type: "success", text: "Savings deposit recorded successfully." });
      setAmount("");
      await onRefresh?.();
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Failed to deposit savings." });
    }
  }

  return (
    <SimplePage eyebrow="Savings" title="Savings wallet" description="Monitor contribution progress and prepare deposit workflows." icon={PiggyBank}>
      {message ? (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {message.text}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard icon={PiggyBank} label="Savings balance" value={formatCurrency(stats.totalSavings)} trend="+12.2%" helper="Includes share capital and voluntary savings" tone="emerald" />
        <StatCard icon={ArrowDownLeft} label="Monthly deposits" value={formatCurrency(stats.monthlyContributions)} trend="Paid" helper="Current month deposits" tone="blue" />
      </div>
      <form onSubmit={submitDeposit} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <Field label="Deposit amount" name="depositAmount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <button disabled={!amount} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          <PiggyBank size={17} />
          Deposit savings
        </button>
      </form>
    </SimplePage>
  );
}

export default function UserDashboard() {
  const location = useLocation();
  const { user, accessToken, loadCurrentUser } = useContext(AuthContext);
  const dashboardBasePath = getDashboardPath("MEMBER");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState({
    transactions: [],
    loans: [],
    shares: [],
    notifications: [],
    activeSessions: [],
    loginHistory: [],
  });

  async function loadDashboardData({ showLoading = true } = {}) {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      if (showLoading) setLoading(true);
      const results = await Promise.allSettled([
        getMyTransactions(accessToken),
        getMyLoans(accessToken),
        getMyShares(accessToken),
        getAuthSessions(accessToken),
      ]);
      const sessions = results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : [];

      setData({
        transactions: results[0].status === "fulfilled" && Array.isArray(results[0].value) ? results[0].value : [],
        loans: results[1].status === "fulfilled" && Array.isArray(results[1].value) ? results[1].value : [],
        shares: results[2].status === "fulfilled" && Array.isArray(results[2].value) ? results[2].value : [],
        notifications: [],
        activeSessions: sessions.filter((session) => String(session.status || "").toUpperCase() === "ACTIVE"),
        loginHistory: sessions.map((session) => ({
          date: session.date ? new Date(session.date).toLocaleString() : "-",
          event: session.event || "Login",
          device: session.device || session.deviceName || "Unknown device",
          ip: session.ip || "-",
          location: session.location || "Location unavailable",
          status: session.isNewDevice ? "New device" : normalizeStatus(session.status),
        })),
      });
      setLoading(false);
    }

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    async function load() {
      await loadDashboardData();
      if (cancelled) return;
    }

    load();
    if (accessToken) {
      intervalId = window.setInterval(() => {
        loadDashboardData({ showLoading: false });
      }, 30000);
    }
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const stats = useMemo(() => {
    const balance = data.transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const savings = data.shares.reduce((sum, share) => sum + Number(share.totalInvested || share.shares || 0), 0);
    const loanBalance = data.loans.reduce((sum, loan) => sum + Number(loan.balance || loan.principal || 0), 0);
    const now = new Date();
    const monthlyContributions = data.transactions.reduce((sum, transaction) => {
      const date = transaction.createdAt || transaction.date;
      const transactionDate = date ? new Date(date) : null;
      const isCurrentMonth =
        transactionDate &&
        transactionDate.getMonth() === now.getMonth() &&
        transactionDate.getFullYear() === now.getFullYear();
      const type = String(transaction.type || transaction.transactionType || "").toLowerCase();
      const isContribution = type.includes("deposit") || type.includes("saving") || type.includes("contribution");
      return isCurrentMonth && isContribution ? sum + Number(transaction.amount || 0) : sum;
    }, 0);

    return {
      balance,
      totalSavings: savings,
      loanBalance,
      monthlyContributions,
      activeLoans: data.loans.filter((loan) => ["ACTIVE", "APPROVED"].includes(String(loan.status || "").toUpperCase())).length,
      shareCapitalRemaining: Math.max(MIN_SHARE_CAPITAL - savings, 0),
      shareCapitalProgress: Math.min((savings / MIN_SHARE_CAPITAL) * 100, 100),
    };
  }, [data]);

  const path = location.pathname;
  const memberName = user?.firstName || user?.name?.split(" ")?.[0] || "Member";
  const isDashboardHome =
    path === "/dashboard" ||
    path === "/dashboard/" ||
    path === dashboardBasePath ||
    path === `${dashboardBasePath}/`;

  function renderContent() {
    if (loading) return <SkeletonDashboard />;
    if (search.trim()) {
      return <SearchResultsPage search={search.trim()} data={data} stats={stats} user={user} />;
    }
    if (isDashboardHome) {
      return (
        <DashboardOverview
          stats={stats}
          transactions={data.transactions.filter((transaction) => matchesSearch(transaction, search))}
          memberName={memberName}
          user={user}
          notifications={data.notifications}
        />
      );
    }
    if (path.includes("/transactions")) {
      return (
        <div className="space-y-6">
          <SectionHeader eyebrow="Transactions" title="Transaction history" description="Track deposits, transfers, repayments, dividends, references, and statuses." />
          <TransactionsTable transactions={data.transactions.filter((transaction) => matchesSearch(transaction, search))} />
        </div>
      );
    }
    if (path.includes("/loans")) {
      return <LoansPage loans={data.loans} stats={stats} accessToken={accessToken} onRefresh={() => loadDashboardData({ showLoading: false })} search={search} />;
    }
    if (path.includes("/security")) {
      return (
        <SecuritySection
          user={user}
          accessToken={accessToken}
          activeSessions={data.activeSessions}
          loginHistory={data.loginHistory}
          onRefresh={() => loadDashboardData({ showLoading: false })}
        />
      );
    }
    if (path.includes("/settings") || path.includes("/profile")) {
      return <ProfileSettings user={user} accessToken={accessToken} onProfileUpdated={() => loadCurrentUser?.(accessToken)} />;
    }
    if (path.includes("/notifications")) {
      return (
        <div className="space-y-6">
          <SectionHeader eyebrow="Notifications" title="Member notifications" description="Recent account, loan, deposit, and security updates." />
          <NotificationsPanel items={data.notifications} />
        </div>
      );
    }
    if (path.includes("/portfolio")) {
      return <PortfolioPage stats={stats} transactions={data.transactions} shares={data.shares} search={search} user={user} />;
    }
    if (path.includes("/reports")) {
      return <ReportsPage accessToken={accessToken} />;
    }
    if (path.includes("/savings")) {
      return <SavingsPage stats={stats} accessToken={accessToken} onRefresh={() => loadDashboardData({ showLoading: false })} />;
    }
    if (path.includes("/account")) {
      return (
        <SimplePage eyebrow="My account" title="Account summary" description="A concise account view for wallet, membership, and verification details." icon={WalletCards}>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={WalletCards} label="Account balance" value={formatCurrency(stats.balance)} trend="+8.4%" helper="Available account balance" tone="emerald" />
            <StatCard icon={BadgeCheck} label="Member status" value="Active" trend="Verified" helper="Role-based access: MEMBER" tone="blue" />
            <StatCard icon={Eye} label="Visibility" value="Private" trend="Protected" helper="Only authorized roles can access this dashboard" tone="slate" />
          </div>
        </SimplePage>
      );
    }
    if (path.includes("/support")) {
      return (
        <SimplePage eyebrow="Support" title="Member support" description="Prepare helpdesk workflows for tickets, statements, and SACCO service requests." icon={Bell}>
          <div className="grid gap-3 md:grid-cols-3">
            {["Request statement", "Report login issue", "Contact loans desk"].map((item) => (
              <button key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-semibold text-slate-800 transition hover:bg-emerald-50">
                {item}
              </button>
            ))}
          </div>
        </SimplePage>
      );
    }
    return (
      <DashboardOverview
        stats={stats}
        transactions={data.transactions}
        memberName={memberName}
        user={user}
        notifications={data.notifications}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} />
      <main className={`min-h-screen transition-all ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <TopNavbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => {
            if (window.innerWidth >= 1024) setSidebarCollapsed((current) => !current);
            else setSidebarOpen((current) => !current);
          }}
          unreadCount={data.notifications.length}
          searchValue={search}
          onSearchChange={setSearch}
        />
        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
