import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Calculator,
  Camera,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  KeyRound,
  Landmark,
  LockKeyhole,
  LogOut,
  MailCheck,
  MapPin,
  MonitorSmartphone,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table.jsx";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "../ui/pagination.jsx";
import { getDashboardPath } from "../../utils/dashboardRoutes.js";
import SavingsContributionForm from "./SavingsContributionForm.jsx";
import {
  updateMemberProfile,
  applyForLoan,
  emailMemberReport,
  repayLoan,
  requestMemberOptOut,
} from "../../features/member/memberService.js";
import {
  changePassword,
  revokeAuthSession,
} from "../../services/authService.js";
import { uploadProfilePhoto } from "../../lib/supabaseStorage.js";

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
  passportPhotoUrl: "",
};

const MIN_SHARE_CAPITAL = 25000;
const MAX_PROFILE_PHOTO_BYTES = 1.5 * 1024 * 1024;

const LOAN_PRODUCTS = [
  {
    type: "EMERGENCY",
    name: "Emergency Loan",
    max: 50000,
    interestRate: 1,
    duration: 12,
    guarantors: 0,
    requiresFullShareCapital: false,
  },
  {
    type: "EDUCATION",
    name: "Education Loan",
    max: 100000,
    interestRate: 1,
    duration: 12,
    guarantors: 2,
    requiresFullShareCapital: true,
  },
  {
    type: "WELFARE",
    name: "Welfare Loan",
    max: 100000,
    interestRate: 1.5,
    duration: 24,
    guarantors: 2,
    requiresFullShareCapital: true,
  },
  {
    type: "DEVELOPMENT",
    name: "Development Loan",
    max: 250000,
    interestRate: 2,
    duration: 72,
    guarantors: 3,
    requiresFullShareCapital: true,
  },
];

function formatCurrency(value, options = {}) {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;
  const amount = Math.abs(Number(value || 0));
  return `KES ${amount.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
}

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function maskEmail(email) {
  const normalized = String(email || "");
  const [local, domain] = normalized.split("@");
  if (!domain) return normalized;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${local.slice(-1)}@${domain}`;
}

function maskPhone(phone) {
  const normalized = String(phone || "");
  const digits = normalized.replace(/\D/g, "");
  if (!digits) return normalized;
  const prefix = normalized.trim().startsWith("+") ? "+" : "";
  const last = digits.slice(-4);
  const showStart = digits.length > 7 ? digits.slice(0, 3) : digits.slice(0, 1);
  const hiddenCount = digits.length - showStart.length - 4;
  if (hiddenCount <= 0) return `${prefix}${digits}`;
  return `${prefix}${showStart}${"*".repeat(hiddenCount)}${last}`;
}

function maskNationalId(nationalId) {
  const normalized = String(nationalId || "").trim();
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 2)}${"*".repeat(Math.max(1, normalized.length - 4))}${normalized.slice(-2)}`;
}

function normalizeStatus(status) {
  return String(status || "Pending").replace(/_/g, " ");
}

function getTransactionPromptLabel(transaction) {
  const endpoint = transaction?.kcbEndpoint;
  const category = transaction?.paymentCategory;
  const label =
    category ||
    endpoint ||
    transaction?.description ||
    transaction?.type ||
    "Payment";
  return normalizeStatus(label).replace(/^\/+/, "");
}

function buildPromptSummary(transactions = []) {
  return transactions.reduce((summary, transaction) => {
    if (!transaction?.paymentCategory && !transaction?.kcbEndpoint)
      return summary;
    const key = transaction.paymentCategory || transaction.kcbEndpoint;
    const current = summary[key] || {
      key,
      label: getTransactionPromptLabel(transaction),
      total: 0,
      pending: 0,
      success: 0,
      failed: 0,
      amount: 0,
    };
    const status = String(transaction.status || "").toUpperCase();
    current.total += 1;
    current.amount += Number(transaction.amount || 0);
    if (status === "SUCCESS") current.success += 1;
    else if (status === "FAILED") current.failed += 1;
    else current.pending += 1;
    return { ...summary, [key]: current };
  }, {});
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status).toLowerCase();
  if (
    [
      "completed",
      "approved",
      "verified",
      "trusted",
      "success",
      "paid",
    ].includes(normalized)
  ) {
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
  if (["string", "number", "boolean"].includes(typeof value))
    return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value.map((item) => searchTextFrom(item, seen)).join(" ");
  if (typeof value === "object") {
    if (seen.has(value)) return "";
    seen.add(value);
    return Object.entries(value)
      .filter(
        ([key]) =>
          !["password", "otp", "token", "refreshToken", "accessToken"].some(
            (secret) => key.toLowerCase().includes(secret.toLowerCase()),
          ),
      )
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

function SectionHeader({ action }) {
  return action ? <div className="flex justify-end">{action}</div> : null;
}

function Surface({ children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white transition-all duration-200 ease-out hover:border-emerald-200   ${className}`}
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
          <div
            key={item}
            className="h-36 animate-pulse rounded-lg bg-slate-200"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  helper,
  tone = "emerald",
  blur = false,
}) {
  const tones = {
    emerald: "bg-gray-100/30",
    blue: "bg-gray-100/30",
    amber: "bg-gray-100/30",
    slate: "bg-gray-100/30",
  };

  const displayValue = blur ? (
    <span className="inline-block text-slate-950 blur-sm">{value}</span>
  ) : (
    value
  );

  return (
    <Surface className="group p-5 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`grid h-11 w-11 place-items-center rounded-lg transition duration-200 group-hover:scale-110 ${tones[tone]}`}
        >
          <Icon size={21} className="text-[#8cc63f]/90 font-light" />
        </div>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
        {displayValue}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
    </Surface>
  );
}

function QuickActions() {
  const actions = [
    { label: "Apply Loan", icon: FileText, to: "loans" },
    { label: "Repay Loan", icon: CreditCard, to: "loans" },
    { label: "Deposit", icon: PiggyBank, to: "savings" },

    { label: "Request Report", icon: Download, to: "reports" },
    { label: "View Sacco Portfolio", icon: WalletCards, to: "portfolio" },
    { label: "Update Profile", icon: UserRound, to: "settings" },
  ];

  return (
    <Surface className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h5 className="text-base font-semibold tracking-normal text-slate-950">
            Quick actions
          </h5>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={getDashboardPath("MEMBER", action.to)}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <span className="flex min-w-0 items-center gap-3">
              <action.icon size={18} className="text-[#8cc63f]" />
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
  const nextOfKinPath = `${getDashboardPath("MEMBER", "settings")}#next-of-kin`;
  const hasNextOfKin = Boolean(
    (user?.nextOfKinName || user?.nextOfKin?.name) &&
    (user?.nextOfKinRelationship || user?.nextOfKin?.relationship) &&
    (user?.nextOfKinPhone || user?.nextOfKin?.phone),
  );
  const checks = [
    {
      label: "Identity details",
      complete: Boolean(user?.nationalId || user?.Member?.nationalId),
      icon: BadgeCheck,
    },
    {
      label: "Verify phone number",
      complete: Boolean(
        user?.phoneVerified || user?.isPhoneVerified || user?.phone,
      ),
      icon: Smartphone,
    },
    { label: "Add next of kin", complete: hasNextOfKin, icon: UsersRound },
  ];
  const completed = checks.filter((item) => item.complete).length;
  const completion = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((item) => !item.complete);

  if (completion >= 100) return null;

  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h5 className="text-base font-semibold tracking-normal text-slate-950">
            Profile completion
          </h5>
          <Link
            to={nextOfKinPath}
            className="text-sm font-medium text-slate-500 transition hover:text-emerald-700"
          >
            Finish verification to unlock faster approvals.
          </Link>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {completion}%
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${completion}%` }}
        />
      </div>
      <div className="mt-5 space-y-3">
        {missing.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={17} />
            Profile verification is complete
          </div>
        ) : (
          missing.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-3 text-slate-700">
                <item.icon size={17} />
                {item.label}
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                Pending
              </span>
            </div>
          ))
        )}
      </div>
    </Surface>
  );
}

function NotificationsPanel({
  items = [],
  compact = false,
  paginate = false,
  pageSize = 10,
  onMarkRead,
  onMarkAllRead,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const unreadCount = items.filter(
    (notice) => !notice.readAt && !notice.isRead,
  ).length;
  const tabs = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "read", label: "Read" },
  ];
  const filteredItems = items.filter((notice) => {
    if (activeTab === "unread") return !notice.readAt && !notice.isRead;
    if (activeTab === "read") return Boolean(notice.readAt || notice.isRead);
    return true;
  });
  const totalPages = paginate
    ? Math.max(1, Math.ceil(filteredItems.length / pageSize))
    : 1;
  const visibleItems = paginate
    ? filteredItems.slice((page - 1) * pageSize, page * pageSize)
    : compact
      ? filteredItems.slice(0, 5)
      : filteredItems;

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  // Helper: format time relative to now (like WhatsApp)
  const formatRelativeTime = (time) => {
    if (!time) return "";
    const date = new Date(time);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // Helper: get initials from title
  const getInitial = (title) => title?.charAt(0).toUpperCase() || "?";

  return (
    <Surface className="p-5">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h5 className="text-base font-semibold tracking-normal text-slate-950">
              Notifications
            </h5>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && onMarkAllRead ? (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Mark all read
              </button>
            ) : null}
            <Bell size={20} className="text-[#8cc63f]" />
          </div>
        </div>
        <div className="mt-4 flex border-b border-slate-200 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp‑style chat list */}
      {filteredItems.length === 0 ? (
        <EmptyState
          className="text-[#8cc63f]"
          icon={Bell}
          title="No notifications"
          description="Loan, deposit, profile, and security notifications will appear here when available."
        />
      ) : (
        <div className="flex flex-col">
          {visibleItems.map((notice) => {
            const isRead = Boolean(notice.readAt || notice.isRead);
            return (
              <div
                key={notice.id}
                className={`
                  group flex items-start gap-3 py-3 border-b border-slate-100
                  ${!isRead ? "bg-emerald-50/30" : ""}
                  hover:bg-slate-50 transition-colors
                `}
              >
                {/* Avatar circle with initial */}
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm">
                    {getInitial(notice.title)}
                  </div>
                </div>

                {/* Content area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`text-sm font-semibold truncate ${
                        !isRead ? "text-slate-900" : "text-slate-700"
                      }`}
                    >
                      {notice.title}
                    </p>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(notice.time)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {notice.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {!isRead && onMarkRead && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(notice.id)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition"
                      >
                        Mark read
                      </button>
                    )}
                    {notice.actionUrl && (
                      <Link
                        to={notice.actionUrl}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 transition"
                      >
                        View details →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Unread green dot (WhatsApp style) */}
                {!isRead && (
                  <div className="flex-shrink-0 self-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {paginate && totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

function TransactionsTable({
  transactions,
  limit = null,
  showViewAll = false,
  paginate = false,
  pageSize = 10,
  accessToken,
}) {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const totalPages = paginate
    ? Math.max(1, Math.ceil(transactions.length / pageSize))
    : 1;
  const limitedRows = limit ? transactions.slice(0, limit) : transactions;
  const rows = paginate
    ? transactions.slice((page - 1) * pageSize, page * pageSize)
    : limitedRows;
  const hasMore = transactions.length > rows.length;

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  async function emailTransactions() {
    if (!accessToken || exporting) return;
    setExporting(true);
    setExportMessage(null);
    try {
      await emailMemberReport("transactions", accessToken);
      setExportMessage({
        type: "success",
        text: "Transaction statement sent to your email.",
      });
    } catch (error) {
      setExportMessage({
        type: "error",
        text: error?.message || "Failed to email transaction statement.",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className=" tracking-normal text-slate-950">
            Recent transactions
          </h4>
          <p className="text-sm text-slate-500">
            Deposits, transfers, dividends, and repayments
          </p>
        </div>
        <button
          type="button"
          onClick={emailTransactions}
          disabled={!accessToken || exporting}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <Download className="text-[#8cc63f]" size={16} />
          {exporting ? "Sending..." : "Email export"}
        </button>
      </div>
      {exportMessage ? (
        <div
          className={`border-b px-5 py-3 text-sm font-medium ${exportMessage.type === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-rose-100 bg-rose-50 text-rose-800"}`}
        >
          {exportMessage.text}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          className="text-[#8cc63f]"
          title="No transactions yet"
          description="Your deposits, repayments, and transfers will appear here."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[980px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Transaction type
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    reference
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
                  const amount = Number(
                    transaction.amount || transaction.value || 0,
                  );
                  const description = getTransactionPromptLabel(transaction);
                  const createdAt = transaction.createdAt || transaction.date;
                  const mpesaReference =
                    transaction.mpesaReference ||
                    transaction.mpesaReceipt ||
                    transaction.checkoutRequestId ||
                    transaction.merchantRequestId ||
                    transaction.reference;
                  return (
                    <tr
                      key={transaction.id || index}
                      className="bg-white text-center transition hover:bg-slate-50"
                    >
                      <td className="px-5  text-center pl-5 py-4 text-sm text-slate-600">
                        {createdAt
                          ? new Date(createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                        {description}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {mpesaReference || "-"}
                      </td>
                      <td
                        className={`px-5 py-4 text-right text-sm font-semibold ${amount < 0 ? "text-rose-700" : "text-emerald-700"}`}
                      >
                        {amount < 0 ? "-" : "+"}
                        {formatCurrency(amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(transaction.status || "Completed")}`}
                        >
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
            <span>
              {showViewAll && hasMore
                ? `  `
                : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
            </span>
            {showViewAll ? (
              <Link
                to={getDashboardPath("MEMBER", "transactions")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              >
                View all
                <ArrowUpRight size={16} />
              </Link>
            ) : paginate && totalPages > 1 ? (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <PaginationItem key={index}>
                      <PaginationLink
                        isActive={page === index + 1}
                        onClick={() => setPage(index + 1)}
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
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
        <Icon size={26} className="text-[#8cc63f]" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function PaymentPromptSummary({ transactions }) {
  const prompts = Object.values(buildPromptSummary(transactions))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  if (prompts.length === 0) return null;

  return <Surface className="p-5 hidden" hidden></Surface>;
}

function DashboardOverview({
  stats,
  transactions,
  memberName,
  user,
  notifications,
  showValues,
  accessToken,
  onToggleValues,
}) {
  const greeting = getGreeting();
  const cards = [
    {
      label: "Share Capital",
      value: formatCurrency(stats.shareCapital),
      icon: WalletCards,

      tone: "emerald",
    },
    {
      label: "Savings Balance",
      value: formatCurrency(stats.totalSavings),
      icon: PiggyBank,

      tone: "blue",
    },
    {
      label: "Active Loan Balance",
      value: formatCurrency(stats.loanBalance),
      icon: Landmark,
      helper: `${stats.activeLoans} active loan${stats.activeLoans === 1 ? "" : "s"}`,
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-2">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(135deg,#07182d_0%,#0f3443_48%,#155e3f_100%)] p-2 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mt-3 font-semibold tracking-normal text-white sm:text-3xl">
              {greeting}, {memberName}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <Link
              to={getDashboardPath("MEMBER", "loans")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-slate-950 transition "
            >
              <FileText size={17} className="text-[#8cc63f]" />
              Apply loan
            </Link>
            <Link
              to={getDashboardPath("MEMBER", "security")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <ShieldCheck size={17} className="text-[#8cc63f]" />
              Review security
            </Link>
            <button
              type="button"
              onClick={onToggleValues}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {showValues ? (
                <EyeOff className="text-[#8cc63f]" size={16} />
              ) : (
                <Eye className="text-[#8cc63f]" size={16} />
              )}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} blur={!showValues} />
        ))}
      </div>

      {/* Dividend Projection Card */}
      <DividendProjection stats={stats} showValues={showValues} />

      <PaymentPromptSummary transactions={transactions} />

      <Surface className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="    tracking-normal text-slate-950">
              Share capital requirement
            </h4>
            <p className="mt-1 text-[12px] text-slate-500">
              {stats.shareCapitalRemaining > 0
                ? `${formatCurrency(stats.shareCapitalRemaining)} remaining to reach the minimum share capital of ${formatCurrency(MIN_SHARE_CAPITAL)}.`
                : "Minimum share capital requirement has been met."}
            </p>
          </div>
          <div className="min-w-56">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>{formatCurrency(stats.shareCapital)}</span>
              <span>{Math.round(stats.shareCapitalProgress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${stats.shareCapitalProgress}%` }}
              />
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <TransactionsTable
            transactions={transactions}
            limit={5}
            showViewAll
            accessToken={accessToken}
          />
          <NotificationsPanel items={notifications} compact />
        </div>
        <div className="space-y-5">
          <QuickActions />
          <ProfileCompletion user={user} />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  error,
  as = "input",
  options = [],
  suffix = null,
}) {
  const controlClass =
    "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative">
        {as === "textarea" ? (
          <textarea
            className={`${controlClass} min-h-24 resize-y`}
            name={name}
            value={value}
            onChange={onChange}
          />
        ) : as === "select" ? (
          <select
            className={controlClass}
            name={name}
            value={value}
            onChange={onChange}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={`${controlClass} ${suffix ? "pr-12" : ""}`}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
          />
        )}
        {suffix ? (
          <div className="pointer-events-auto absolute inset-y-0 right-3 flex items-center">
            {suffix}
          </div>
        ) : null}
      </div>
      {error ? (
        <span className="mt-1 block text-xs font-medium text-rose-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function buildProfileForm(profile = {}) {
  return {
    ...emptyProfile,
    fullName: profile?.name || profile?.fullName || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    nationalId: profile?.nationalId || profile?.Member?.nationalId || "",
    dateOfBirth: profile?.dateOfBirth || "",
    gender: profile?.gender || "",
    address: profile?.address || "",
    employer: profile?.employer || "",
    jobTitle: profile?.occupation || profile?.jobTitle || "",
    monthlyIncome: profile?.monthlyIncome || "",
    payrollNumber: profile?.payrollNumber || "",
    nextOfKinName: profile?.nextOfKinName || profile?.nextOfKin?.name || "",
    nextOfKinRelationship:
      profile?.nextOfKinRelationship || profile?.nextOfKin?.relationship || "",
    nextOfKinPhone: profile?.nextOfKinPhone || profile?.nextOfKin?.phone || "",
    passportPhotoUrl: profile?.passportPhotoUrl || "",
  };
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
    nextOfKinRelationship:
      user?.nextOfKinRelationship || user?.nextOfKin?.relationship || "",
    nextOfKinPhone: user?.nextOfKinPhone || user?.nextOfKin?.phone || "",
    passportPhotoUrl: user?.passportPhotoUrl || "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [preview, setPreview] = useState(user?.passportPhotoUrl || null);
  const [photoFile, setPhotoFile] = useState(null);
  useEffect(() => {
    setForm(buildProfileForm(user));
    setPreview(user?.passportPhotoUrl || null);
    setPhotoFile(null);
  }, [user]);

  useEffect(() => {
    if (window.location.hash !== "#next-of-kin") return;

    window.requestAnimationFrame(() => {
      document.getElementById("next-of-kin")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const maskedEmail = form.email ? maskEmail(form.email) : "—";
  const maskedPhone = form.phone ? maskPhone(form.phone) : "—";
  const maskedNationalId = form.nationalId
    ? maskNationalId(form.nationalId)
    : "—";

  function update(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAlert({ type: "error", message: "Upload a JPG, PNG, or WebP image." });
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setAlert({
        type: "error",
        message: "Profile photo must be 1.5 MB or smaller.",
      });
      event.target.value = "";
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return previewUrl;
    });
    setPhotoFile(file);
    setAlert(null);

    setSaving(true);
    try {
      const uploadedProfile = await uploadProfilePhoto(file, accessToken);
      const passportPhotoUrl = uploadedProfile?.passportPhotoUrl;

      if (!passportPhotoUrl) {
        throw new Error(
          "Profile photo uploaded but no photo URL was returned.",
        );
      }

      setForm((current) => ({ ...current, passportPhotoUrl }));
      setPreview((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return passportPhotoUrl;
      });
      setPhotoFile(null);
      await onProfileUpdated?.(uploadedProfile);
      setAlert({
        type: "success",
        message: "Profile photo saved successfully.",
      });
    } catch (error) {
      setPreview(form.passportPhotoUrl || user?.passportPhotoUrl || null);
      setPhotoFile(null);
      setAlert({
        type: "error",
        message: error?.message || "Failed to upload profile photo.",
      });
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  function validate() {
    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      nextErrors.email = "Enter a valid email address.";
    if (form.phone.replace(/\D/g, "").length < 10)
      nextErrors.phone = "Enter a valid phone number.";
    if (!form.nationalId.trim())
      nextErrors.nationalId = "National ID is required.";
    if (!form.nextOfKinName.trim())
      nextErrors.nextOfKinName = "Next of kin name is required.";
    if (!form.nextOfKinRelationship.trim())
      nextErrors.nextOfKinRelationship = "Relationship is required.";
    if (form.nextOfKinPhone.replace(/\D/g, "").length < 10)
      nextErrors.nextOfKinPhone = "Enter a valid next of kin phone number.";
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setAlert({
        type: "error",
        message: "Please review the highlighted fields.",
      });
      return;
    }

    setSaving(true);
    try {
      const uploadedProfile = photoFile
        ? await uploadProfilePhoto(photoFile, accessToken)
        : null;
      const passportPhotoUrl =
        uploadedProfile?.passportPhotoUrl || form.passportPhotoUrl;

      if (photoFile && !passportPhotoUrl) {
        throw new Error(
          "Profile photo uploaded but no photo URL was returned.",
        );
      }

      const updatedProfile = await updateMemberProfile(
        {
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          nationalId: form.nationalId,
          address: form.address,
          occupation: form.jobTitle,
          monthlyIncome: form.monthlyIncome,
          payrollNumber: form.payrollNumber,
          ...(passportPhotoUrl ? { passportPhotoUrl } : {}),
          nextOfKinName: form.nextOfKinName,
          nextOfKinRelationship: form.nextOfKinRelationship,
          nextOfKinPhone: form.nextOfKinPhone,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          employer: form.employer,
          nextOfKin: {
            name: form.nextOfKinName,
            relationship: form.nextOfKinRelationship,
            phone: form.nextOfKinPhone,
          },
        },
        accessToken,
      );
      setForm((current) => ({ ...current, passportPhotoUrl }));
      setPreview(passportPhotoUrl || null);
      setPhotoFile(null);
      await onProfileUpdated?.({
        ...updatedProfile,
        passportPhotoUrl: updatedProfile?.passportPhotoUrl || passportPhotoUrl,
      });
      setAlert({
        type: "success",
        message: "Profile changes saved successfully.",
      });
    } catch (error) {
      setAlert({
        type: "error",
        message: error?.message || "Failed to save profile changes.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Profile settings" />

      {alert ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${alert.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {alert.message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Surface className="p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-500">
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="text-[#8cc63f]" size={32} />
                )}
              </div>
              <div>
                <h5 className="text-base font-semibold tracking-normal text-slate-950">
                  Profile picture
                </h5>
                <p className="text-sm text-slate-500">
                  Upload a clear member profile photo.
                </p>
              </div>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <Camera className="text-[#8cc63f]" size={17} />
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImage}
              />
            </label>
          </div>
        </Surface>

        {/* Personal information – read‑only */}
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserRound className="text-[#8cc63f] h-5 w-5" />
            <h3 className="text-lg font-semibold">Personal information</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <p className="mt-1 text-sm text-foreground">
                {form.fullName || "—"}
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="mt-1 text-sm text-foreground">{maskedEmail}</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <p className="mt-1 text-sm text-foreground">{maskedPhone}</p>
            </div>

            {/* National ID */}
            <div>
              <label className="text-sm font-medium">National ID</label>
              <p className="mt-1 text-sm text-foreground">{maskedNationalId}</p>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-sm font-medium">Date of Birth</label>
              <p className="mt-1 text-sm text-foreground">
                {form.dateOfBirth || "—"}
              </p>
            </div>

            {/* Gender */}
            <div>
              <label className="text-sm font-medium">Gender</label>
              <p className="mt-1 text-sm text-foreground">
                {form.gender || "—"}
              </p>
            </div>

            {/* Address (full width) */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                {form.address || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Employment information – editable */}
        <EditableSection
          title="Employment information"
          icon={BriefcaseBusiness}
          className="text-[#8cc63f]"
        >
          <Field
            label="Employer"
            name="employer"
            value={form.employer}
            onChange={update}
          />
          <Field
            label="Job Title"
            name="jobTitle"
            value={form.jobTitle}
            onChange={update}
          />
          <Field
            label="Monthly Income"
            name="monthlyIncome"
            value={form.monthlyIncome}
            onChange={update}
            type="number"
          />
          <Field
            label="Payroll Number"
            name="payrollNumber"
            value={form.payrollNumber}
            onChange={update}
          />
        </EditableSection>

        {/* Next of kin – editable */}
        <EditableSection
          id="next-of-kin"
          title="Next of kin"
          icon={UsersRound}
          className="text-[#8cc63f]"
        >
          <Field
            label="Name"
            name="nextOfKinName"
            value={form.nextOfKinName}
            onChange={update}
            error={errors.nextOfKinName}
          />
          <Field
            label="Relationship"
            name="nextOfKinRelationship"
            as="select"
            value={form.nextOfKinRelationship}
            onChange={update}
            error={errors.nextOfKinRelationship}
            options={[
              { label: "Select relationship", value: "" },
              { label: "Spouse", value: "Spouse" },
              { label: "Parent", value: "Parent" },
              { label: "Sibling", value: "Sibling" },
              { label: "Child", value: "Child" },
              { label: "Friend", value: "Friend" },
              { label: "Other", value: "Other" },
            ]}
          />
          <Field
            label="Phone Number"
            name="nextOfKinPhone"
            value={form.nextOfKinPhone}
            onChange={update}
            error={errors.nextOfKinPhone}
          />
        </EditableSection>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? (
              <RefreshCw className="text-[#8cc63f] animate-spin" size={17} />
            ) : (
              <CheckCircle2 className="text-[#8cc63f]" size={17} />
            )}
            {saving ? "Saving changes" : "Save changes"}
          </button>
        </div>
      </form>
      {/* Opt-Out Section at bottom of profile */}
      <OptOutSection accessToken={accessToken} />
    </div>
  );
}

function EditableSection({ id, title, icon: Icon, children }) {
  return (
    <Surface id={id} className="scroll-mt-24 p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
          <Icon size={20} className="text-[#8cc63f]" />
        </div>
        <h5 className="text-base font-semibold tracking-normal text-slate-950">
          {title}
        </h5>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </Surface>
  );
}

function SecuritySection({
  user,
  accessToken,
  activeSessions = [],
  loginHistory = [],
  onRefresh,
}) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState(null);

  function updatePassword(event) {
    setPasswordForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Use at least 8 characters for the new password.",
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }
    try {
      await changePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        accessToken,
      );
      setMessage({ type: "success", text: "Password changed successfully." });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to change password.",
      });
    }
  }

  async function handleRevokeSession(sessionId) {
    setMessage(null);
    try {
      await revokeAuthSession(sessionId, accessToken);
      setMessage({ type: "success", text: "Session revoked successfully." });
      await onRefresh?.();
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to revoke session.",
      });
    }
  }

  // Login history pagination
  const [loginPage, setLoginPage] = useState(1);
  const LOGIN_PAGE_SIZE = 6;
  const LOGIN_MAX_EVENTS = 12;
  const visibleLoginHistory = (loginHistory || []).slice(0, LOGIN_MAX_EVENTS);
  const loginTotalPages = Math.max(
    1,
    Math.ceil(visibleLoginHistory.length / LOGIN_PAGE_SIZE),
  );
  const paginatedLogin = visibleLoginHistory.slice(
    (loginPage - 1) * LOGIN_PAGE_SIZE,
    loginPage * LOGIN_PAGE_SIZE,
  );

  useEffect(() => {
    setLoginPage((current) => Math.min(current, loginTotalPages));
  }, [loginTotalPages]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Security center" />

      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {message.text}
        </div>
      ) : null}

      {/* 1. LOGIN HISTORY - TOP */}
      <div className="grid xl:grid-cols-1">
        <Surface className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h5 className="text-base font-semibold tracking-normal text-slate-950">
              Login history
            </h5>
            <p className="text-sm text-slate-500">
              Recent account access events and verification results.
            </p>
          </div>
          {visibleLoginHistory.length === 0 ? (
            <EmptyState
              icon={Clock3}
              className="text-[#8cc63f]"
              title="No login history"
              description="Recent login and security events will appear here when available."
            />
          ) : (
            <>
              <Table className=" ">
                <TableHeader>
                  <TableRow className=" ">
                    <TableHead className="px-1 pl-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Date
                    </TableHead>
                    <TableHead className="px-1 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Event
                    </TableHead>
                    <TableHead className="px-1 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Device
                    </TableHead>
                    <TableHead className="px-1 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Location
                    </TableHead>
                    <TableHead className="px-1 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      IP
                    </TableHead>
                    <TableHead className="px-1 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 pl3">
                  {paginatedLogin.map((item) => (
                    <TableRow
                      key={`${item.date}-${item.event}`}
                      className="pl-3 "
                    >
                      <TableCell className="px-1 pl-4 py-4 text-sm text-slate-600">
                        {item.date}
                      </TableCell>
                      <TableCell className="px-1 py-4 text-sm font-semibold text-slate-900">
                        {item.event}
                      </TableCell>
                      <TableCell className="px-1 py-4 text-sm text-slate-600">
                        {item.device}
                      </TableCell>
                      <TableCell className="px-1 py-4 text-sm text-slate-600">
                        {item.location}
                      </TableCell>
                      <TableCell className="px-1 py-4 text-sm text-slate-600">
                        {item.ip}
                      </TableCell>
                      <TableCell className="px-1 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="px-4 py-3">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setLoginPage((p) => Math.max(1, p - 1))}
                      />
                    </PaginationItem>
                    {Array.from({ length: loginTotalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={loginPage === i + 1}
                          onClick={() => setLoginPage(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setLoginPage((p) => Math.min(loginTotalPages, p + 1))
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </Surface>
      </div>

      {/* 2. UPDATE PASSWORD - SECOND */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Surface className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <KeyRound className="text-[#8cc63f]" size={20} />
            </div>
            <div>
              <h5 className="text-base font-semibold tracking-normal text-slate-950">
                Change password
              </h5>
              <p className="text-sm text-slate-500">
                Use a unique password for your SACCO account.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <Field
              label="Current password"
              name="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={updatePassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((current) => !current)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  {showCurrentPassword ? "Hide" : "Show"}
                </button>
              }
            />
            <Field
              label="New password"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={updatePassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              }
            />
            <Field
              label="Confirm new password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={updatePassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              }
            />
            <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              <LockKeyhole size={17} />
              Update password
            </button>
          </form>
        </Surface>

        {/* 3. SECURITY INFORMATION (2FA + Active Sessions) - THIRD */}
        <div className="space-y-5">
          <Surface className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h5 className="text-base font-semibold tracking-normal text-slate-950">
                  Multi-factor authentication
                </h5>
                <p className="mt-1 text-sm text-slate-500">
                  Authenticator and SMS verification will be available in a
                  future release.
                </p>
              </div>
              <button
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
              >
                <Fingerprint className="text-[#8cc63f]" size={17} />
                Coming soon
              </button>
            </div>
          </Surface>

          <Surface className="overflow-hidden">
            <div className="border-b border-slate-200 p-5">
              <h5 className="text-base font-semibold tracking-normal text-slate-950">
                Active sessions
              </h5>
              <p className="text-sm text-slate-500">
                Devices currently trusted to access your account.
              </p>
            </div>
            {activeSessions.length === 0 ? (
              <EmptyState
                icon={MonitorSmartphone}
                className="text-[#8cc63f]"
                title="No active sessions"
                description="Trusted devices will appear here after successful sign in."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {activeSessions.map((session) => (
                  <div
                    key={session.id || `${session.device}-${session.ip}`}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600">
                        <MonitorSmartphone
                          className="text-[#8cc63f]"
                          size={19}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">
                          {session.device}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <MapPin className="text-[#8cc63f]" size={14} />
                          {session.location}
                          <span>{session.ip}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <span className="text-sm font-medium text-slate-600">
                        {session.lastActive
                          ? new Date(session.lastActive).toLocaleString()
                          : "-"}
                      </span>
                      {session.current ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Current device
                        </span>
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
        </div>
      </div>

      {/* 4. OPT-OUT SECTION - BOTTOM */}
      <OptOutSection accessToken={accessToken} user={user} />
    </div>
  );
}

function LoansPage({ loans, stats, accessToken, onRefresh, search, showValues }) {
  const [loanForm, setLoanForm] = useState({ type: "EMERGENCY", amount: "10000", duration: "12" });
  const [repayAmount, setRepayAmount] = useState("");
  const [message, setMessage] = useState(null);
  const [selectedGuarantors, setSelectedGuarantors] = useState([]);
  const [guarantorAcceptance, setGuarantorAcceptance] = useState({});
  const activeLoans = loans.filter((loan) => ["ACTIVE", "APPROVED"].includes(String(loan.status || "").toUpperCase()));
  const [repayLoanId, setRepayLoanId] = useState("");
  const totalBalance = activeLoans.reduce((sum, loan) => sum + Number(loan.balance || loan.principal || 0), 0);
  const rows = loans.filter((loan) => matchesSearch(loan, search));
  const selectedProduct = LOAN_PRODUCTS.find((p) => p.type === loanForm.type) || LOAN_PRODUCTS[0];
  const selectedRepayLoanId = repayLoanId || activeLoans[0]?.id || "";
  const requestedAmount = Math.min(Number(loanForm.amount || 0), selectedProduct.max);
  const requestedDuration = Math.min(Number(loanForm.duration || 1), selectedProduct.duration);
  const totalInterest = requestedAmount * (selectedProduct.interestRate / 100) * requestedDuration;
  const monthlyRepayment = requestedDuration ? (requestedAmount + totalInterest) / requestedDuration : 0;

  const MOCK_MEMBERS = [
    { id: "m1", name: "Jane Muthoni", phone: "+254712345678", shareCapital: 28000 },
    { id: "m2", name: "Peter Kamau", phone: "+254723456789", shareCapital: 35000 },
    { id: "m3", name: "Grace Achieng", phone: "+254734567890", shareCapital: 25000 },
    { id: "m4", name: "David Otieno", phone: "+254745678901", shareCapital: 42000 },
    { id: "m5", name: "Faith Wanjiku", phone: "+254756789012", shareCapital: 30000 },
    { id: "m6", name: "John Njoroge", phone: "+254767890123", shareCapital: 22000 },
    { id: "m7", name: "Alice Wambui", phone: "+254778901234", shareCapital: 38000 },
    { id: "m8", name: "Michael Kiprop", phone: "+254789012345", shareCapital: 27000 },
  ];

  const requiresGuarantors = selectedProduct.guarantors > 0;
  const selectedMemberNames = selectedGuarantors.map((id) => MOCK_MEMBERS.find((m) => m.id === id)?.name || id).join(", ");

  function toggleGuarantor(id) {
    setSelectedGuarantors((prev) => {
      if (prev.includes(id)) { const n = prev.filter((x) => x !== id); setGuarantorAcceptance((a) => { const c = { ...a }; delete c[id]; return c; }); return n; }
      if (prev.length >= selectedProduct.guarantors) return prev;
      return [...prev, id];
    });
  }
  function simulateAccept(id) { setGuarantorAcceptance((prev) => ({ ...prev, [id]: "accepted" })); }

  async function requestLoan(event) {
    event.preventDefault();
    if (requestedAmount <= 0) { setMessage({ type: "error", text: "Enter a valid loan amount." }); return; }
    if (!selectedProduct) { setMessage({ type: "error", text: "Select a valid loan product." }); return; }
    if (selectedProduct.requiresFullShareCapital && stats.shareCapitalRemaining > 0) { setMessage({ type: "error", text: "Minimum share capital must be fully paid." }); return; }
    if (requiresGuarantors && selectedGuarantors.length < selectedProduct.guarantors) { setMessage({ type: "error", text: `This loan requires ${selectedProduct.guarantors} guarantor${selectedProduct.guarantors > 1 ? "s" : ""}.` }); return; }
    if (requiresGuarantors && selectedGuarantors.some((id) => guarantorAcceptance[id] !== "accepted")) { setMessage({ type: "error", text: "All guarantors must explicitly accept." }); return; }
    try {
      await applyForLoan({ type: loanForm.type, amount: requestedAmount, duration: requestedDuration, interestRate: selectedProduct.interestRate, guarantors: requiresGuarantors ? selectedGuarantors : undefined }, accessToken);
      setMessage({ type: "success", text: "Loan request submitted." });
      setSelectedGuarantors([]); setGuarantorAcceptance({}); await onRefresh?.();
    } catch (error) { setMessage({ type: "error", text: error?.message || "Failed to request loan." }); }
  }

  function submitRepayment(event) { event.preventDefault(); repayLoan(selectedRepayLoanId, repayAmount, accessToken).then(async () => { setMessage({ type: "success", text: "Loan repayment recorded." }); setRepayAmount(""); await onRefresh?.(); }).catch((error) => setMessage({ type: "error", text: error?.message || "Failed." })); }

  const scrollToApplication = () => { const el = document.getElementById("loan-product-select"); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); } };

  return (
    <div className="space-y-6">
      <LoanProducts stats={stats} />
      <EligibilityChecks stats={stats} />
      <button onClick={scrollToApplication} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-4 text-sm font-semibold text-white"><Plus size={18} />New application</button>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={FileText} label="Active loans" value={activeLoans.length} trend="Live" helper="Approved or currently active facilities" tone="blue" />
        <StatCard icon={CreditCard} label="Outstanding balance" value={formatCurrency(totalBalance)} helper="Estimated from loan records" tone="amber" blur={!showValues} />
        <StatCard icon={Clock3} label="Next repayment" value="-" helper="Repayment schedule will appear when available" tone="slate" />
      </div>
      {message ? (<div className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</div>) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <Surface className="p-5">
          <h5 className="text-base font-semibold tracking-normal text-slate-950">Request a loan</h5>
          <form onSubmit={requestLoan} className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">Loan product
              <select id="loan-product-select" value={loanForm.type} onChange={(e) => { setLoanForm((c) => ({ ...c, type: e.target.value })); setSelectedGuarantors([]); setGuarantorAcceptance({}); }} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm">{LOAN_PRODUCTS.map((p) => (<option key={p.type} value={p.type}>{p.name}</option>))}</select>
            </label>
            <Field label="Amount" name="amount" type="number" value={loanForm.amount} onChange={(e) => setLoanForm((c) => ({ ...c, amount: e.target.value }))} />
            <Field label="Duration (months)" name="duration" type="number" value={loanForm.duration} onChange={(e) => setLoanForm((c) => ({ ...c, duration: e.target.value }))} />
            {requiresGuarantors ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <div className="mb-3 flex items-center gap-2"><UsersRound size={16} className="text-sky-700" /><span className="text-sm font-semibold text-sky-900">Guarantor management</span><span className="rounded-full bg-sky-200 px-2 py-0.5 text-xs font-semibold text-sky-700">{selectedGuarantors.length}/{selectedProduct.guarantors} selected</span></div>
                <p className="mb-3 text-xs text-sky-700">Select {selectedProduct.guarantors} active SACCO member{selectedProduct.guarantors > 1 ? "s" : ""}. Each must explicitly accept.</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {MOCK_MEMBERS.map((member) => {
                    const isSelected = selectedGuarantors.includes(member.id);
                    const acceptance = guarantorAcceptance[member.id];
                    return (<div key={member.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${isSelected ? acceptance === "accepted" ? "border-emerald-300 bg-emerald-50" : "border-sky-300 bg-white" : "border-slate-200 bg-white"}`}><div className="flex items-center gap-3"><input type="checkbox" checked={isSelected} onChange={() => toggleGuarantor(member.id)} className="h-4 w-4 rounded border-slate-300 text-sky-600" /><div><p className="text-sm font-semibold text-slate-800">{member.name}</p><p className="text-xs text-slate-500">{member.phone} · Share: {formatCurrency(member.shareCapital)}</p></div></div>{isSelected ? (acceptance === "accepted" ? (<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12} /> Accepted</span>) : (<button type="button" onClick={() => simulateAccept(member.id)} className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700">Accept (simulate)</button>)) : null}</div>);
                  })}
                </div>
                {selectedGuarantors.length > 0 && (<p className="mt-3 text-xs font-medium text-sky-700">Selected: {selectedMemberNames}</p>)}
              </div>
            ) : null}
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white"><FileText size={17} />Request loan</button>
          </form>
        </Surface>
        <Surface className="p-5">
          <h5 className="text-base font-semibold">Repay a loan</h5>
          <form onSubmit={submitRepayment} className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">Loan
              <select value={selectedRepayLoanId} onChange={(e) => setRepayLoanId(e.target.value)} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm">
                {activeLoans.length === 0 ? (<option>No active loans</option>) : activeLoans.map((loan) => (<option key={loan.id} value={loan.id}>{loan.type} - {formatCurrency(loan.balance || loan.principal)}</option>))}
              </select>
            </label>
            <Field label="Repayment amount" name="repayAmount" type="number" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
            <button disabled={!selectedRepayLoanId || !repayAmount} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 disabled:opacity-60"><CreditCard size={17} />Start repayment</button>
          </form>
        </Surface>
      </div>
      <LoanCalculator product={selectedProduct} amount={requestedAmount} duration={requestedDuration} totalInterest={totalInterest} monthlyRepayment={monthlyRepayment} />
      <LoansTable loans={rows} />
    </div>
  );
}

function LoanProducts({ stats }) {
  return (
    <Surface className="p-5">
      <h5 className="text-base font-semibold tracking-normal text-slate-950">
        Available loan products
      </h5>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LOAN_PRODUCTS.map((product) => {
          const eligible =
            !product.requiresFullShareCapital ||
            stats.shareCapitalRemaining === 0;
          return (
            <div
              key={product.type}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="text-base font-semibold tracking-normal text-slate-950">
                {product.name}
              </h3>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  <strong className="text-slate-900">Maximum:</strong>{" "}
                  {formatCurrency(product.max)}
                </p>
                <p>
                  <strong className="text-slate-900">Interest:</strong>{" "}
                  {product.interestRate}% monthly
                </p>
                <p>
                  <strong className="text-slate-900">Guarantors:</strong>{" "}
                  {product.guarantors || "Not required"}
                </p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eligible ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {eligible ? "Eligible" : "Not yet eligible"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function EligibilityChecks({ stats }) {
  const checks = [
    {
      label: "Minimum share capital",
      passed: stats.shareCapitalRemaining === 0,
      helper:
        stats.shareCapitalRemaining === 0
          ? "Met"
          : `${formatCurrency(stats.shareCapitalRemaining)} remaining`,
    },
    { label: "Active membership", passed: true, helper: "Account is active" },
  ];
  return (
    <Surface className="p-5">
      <h5 className="text-base font-semibold tracking-normal text-slate-950">
        Loan eligibility status
      </h5>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {checks.map((check) => (
          <div
            key={check.label}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <p className="font-semibold text-slate-900">{check.label}</p>
            <p
              className={`mt-2 text-sm font-semibold ${check.passed ? "text-emerald-700" : "text-amber-700"}`}
            >
              {check.passed ? "Passed" : "Pending"}
            </p>
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
        <h5 className="text-base font-semibold tracking-normal text-slate-950">
          My loan records
        </h5>
        <p className="text-sm text-slate-500">
          Requests, approvals, active balances, and repayments.
        </p>
      </div>
      {loans.length === 0 ? (
        <EmptyState
          className="text-[#8cc63f]"
          icon={FileText}
          title="No loans found"
          description="Loan requests and repayments will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Balance
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                    {loan.type}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {formatCurrency(loan.principal)}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {formatCurrency(loan.balance)}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {normalizeStatus(loan.status)}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {loan.createdAt
                      ? new Date(loan.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  );
}

function LoanCalculator({ product, amount, duration }) {
  const [calculator, setCalculator] = useState({
    amount: Math.max(1000, amount || 10000),
    duration: Math.max(1, duration || product.duration),
    extraMonthly: 0,
  });
  const safeAmount = Math.min(
    Math.max(Number(calculator.amount || 0), 1000),
    product.max,
  );
  const safeDuration = Math.min(
    Math.max(Number(calculator.duration || 1), 1),
    product.duration,
  );
  const extraMonthly = Math.max(Number(calculator.extraMonthly || 0), 0);
  const totalInterest =
    safeAmount * (product.interestRate / 100) * safeDuration;
  const totalRepayable = safeAmount + totalInterest;
  const monthlyRepayment = safeDuration ? totalRepayable / safeDuration : 0;
  const boostedPayment = monthlyRepayment + extraMonthly;
  const monthsWithExtra = boostedPayment
    ? Math.ceil(totalRepayable / boostedPayment)
    : safeDuration;
  const savedMonths = Math.max(safeDuration - monthsWithExtra, 0);
  const affordabilityScore = Math.max(
    0,
    Math.min(100, 100 - (monthlyRepayment / Math.max(safeAmount, 1)) * 100),
  );

  return (
    <Surface className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h5 className="text-base font-semibold tracking-normal text-slate-950">
                Interactive loan calculator
              </h5>
              <p className="mt-1 text-sm text-slate-500">
                Tune amount, duration, and optional extra payments before
                applying.
              </p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[8cc63f]/50 ">
              <Calculator className="text-[#8cc63f]" size={20} />
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <label className="grid gap-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">Principal</span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(safeAmount)}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max={product.max}
                step="1000"
                value={safeAmount}
                onChange={(event) =>
                  setCalculator((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                className="bg-[#8cc63f]"
              />
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>KES 1,000</span>
                <span>{formatCurrency(product.max)}</span>
              </div>
            </label>

            <label className="grid gap-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">Duration</span>
                <span className="font-bold text-slate-950">
                  {safeDuration} months
                </span>
              </div>
              <input
                type="range"
                min="1"
                max={product.duration}
                step="1"
                value={safeDuration}
                onChange={(event) =>
                  setCalculator((current) => ({
                    ...current,
                    duration: event.target.value,
                  }))
                }
                className="bg-[#8cc63f]"
              />
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>1 month</span>
                <span>{product.duration} months</span>
              </div>
            </label>

            <label className="grid gap-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">
                  Extra monthly payment
                </span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(extraMonthly)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(5000, Math.round(monthlyRepayment))}
                step="500"
                value={extraMonthly}
                onChange={(event) =>
                  setCalculator((current) => ({
                    ...current,
                    extraMonthly: event.target.value,
                  }))
                }
                className="bg-[#8cc63f]"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-500">
              {product.name}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              {formatCurrency(monthlyRepayment)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Estimated monthly repayment
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <TrendingUp size={16} /> Interest
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatCurrency(totalInterest)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {product.interestRate}% monthly for {safeDuration} months
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock3 size={16} /> Payoff impact
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {savedMonths
                  ? `${savedMonths} months faster`
                  : "Standard schedule"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                With {formatCurrency(extraMonthly)} extra per month
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>Payment comfort</span>
              <span>{Math.round(affordabilityScore)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#8cc63f]"
                style={{ width: `${affordabilityScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function SimplePage({ eyebrow, title, description, icon: Icon, children }) {
  return (
    <div className="space-y-6">
      {eyebrow || title || description ? (
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
      ) : null}
      <Surface className="p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </Surface>
    </div>
  );
}

const SACCO_UTILIZATION_ALLOCATIONS = [
  {
    label: "Member loan disbursements",
    description: "Working capital, emergency, education, and development loans issued to members.",
    amount: 9800000,
    percent: 49,
    icon: FileText,
    status: "Active lending",
    color: "#063f2a",
  },
  {
    label: "Liquidity reserve",
    description: "Cash kept available for withdrawals, approved payouts, and short-term SACCO obligations.",
    amount: 4200000,
    percent: 21,
    icon: Landmark,
    status: "Protected reserve",
    color: "#8cc63f",
  },
  {
    label: "Fixed income investments",
    description: "Low-risk deposits and treasury-style instruments used to earn stable returns for members.",
    amount: 3000000,
    percent: 15,
    icon: TrendingUp,
    status: "Earning returns",
    color: "#0f766e",
  },
  {
    label: "Welfare and emergency fund",
    description: "Member support pool for welfare claims, urgent needs, and community assistance.",
    amount: 1600000,
    percent: 8,
    icon: UsersRound,
    status: "Member support",
    color: "#65a30d",
  },
  {
    label: "Operations and compliance",
    description: "Audit, payment processing, member records, security, and service delivery costs.",
    amount: 900000,
    percent: 5,
    icon: ShieldCheck,
    status: "Governed spend",
    color: "#39414d",
  },
  {
    label: "Technology improvement",
    description: "Digital onboarding, dashboards, reporting, and payment reliability improvements.",
    amount: 500000,
    percent: 2,
    icon: MonitorSmartphone,
    status: "In progress",
    color: "#94a3b8",
  },
];

const SACCO_IMPACT_METRICS = [
  { label: "Members financed", value: "126", helper: "Across emergency, welfare, education, and development loans." },
  { label: "Average approval time", value: "2.4 days", helper: "For complete applications with verified member details." },
  { label: "Portfolio yield", value: "11.8%", helper: "Estimated annual return from lending and low-risk placements." },
  { label: "Reserve coverage", value: "4.6 months", helper: "Operating runway held for liquidity and member protection." },
];

const SACCO_PROJECTS = [
  { title: "Education loan cycle", amount: 2100000, status: "Disbursed", date: "May 2026", progress: 82 },
  { title: "Member emergency advances", amount: 1450000, status: "Revolving", date: "May 2026", progress: 64 },
  { title: "Treasury deposit placement", amount: 3000000, status: "Maturing Aug 2026", date: "Apr 2026", progress: 55 },
  { title: "Digital records upgrade", amount: 500000, status: "Implementation", date: "Jun 2026", progress: 38 },
];

function DividendProjection({ stats, showValues }) {
  const currentYear = new Date().getFullYear();
  const shareCapital = Number(stats.shareCapital || 0);
  const savings = Number(stats.totalSavings || 0);
  const totalBase = Math.max(shareCapital, savings);
  const projectedRate = 8.5;
  const projectedDividend = totalBase * (projectedRate / 100);
  const displayValue = (value) => showValues ? value : <span className="inline-block blur-sm">{value}</span>;
  return (
    <Surface className="overflow-hidden border-amber-200 bg-linear-to-br from-amber-50 to-white">
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-600" />
              <h5 className="text-base font-semibold text-slate-950">
                Expected Dividends for {currentYear}
              </h5>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Based on your current share capital ({displayValue(formatCurrency(shareCapital))}) and savings ({displayValue(formatCurrency(savings))}) at a projected {projectedRate}% rate.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-slate-500">Projected dividend</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {displayValue(formatCurrency(projectedDividend))}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Increases as you deposit more
            </p>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function PortfolioPage({ stats, transactions, shares, search, user, showValues, onToggleValues }) {
  const filteredTransactions = transactions.filter((transaction) => matchesSearch(transaction, search));
  const activeShareRecords = shares.filter((share) => matchesSearch(share, search)).length;
  const pooledFunds = SACCO_UTILIZATION_ALLOCATIONS.reduce((sum, item) => sum + item.amount, 0);
  const allocationChartData = SACCO_UTILIZATION_ALLOCATIONS.map((item) => ({
    name: item.label,
    label: item.label,
    value: item.percent,
    percent: item.percent,
    amount: item.amount,
    color: item.color,
  }));
  const memberName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Member";
  const currentYear = new Date().getFullYear();
  const displayValue = (value) => showValues ? value : <span className="inline-block blur-sm">KES 000,000.00</span>;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Portfolio"
        title="SACCO portfolio"
        action={
          <button
            type="button"
            onClick={onToggleValues}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {showValues ? (
              <EyeOff className="text-[#8cc63f]" size={16} />
            ) : (
              <Eye className="text-[#8cc63f]" size={16} />
            )}
          </button>
        }
      />

      {/* ===== 1. FUND UTILIZATION ===== */}
      <Surface className="overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100">
              <TrendingUp size={20} className="text-emerald-700" />
            </div>
            <div>
              <h5 className="text-base font-semibold tracking-normal text-slate-950">
                Fund Utilization
              </h5>
              <p className="text-sm text-slate-500">
                Breakdown of how SACCO capital is actively deployed across lending, reserves, investments, welfare, operations, and technology.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-xl font-semibold tracking-normal text-slate-950">
                  Active deployment summary
                </h4>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  {memberName}, this breakdown shows how pooled member funds are currently allocated across the SACCO.
                </p>
              </div>
              <span className="w-fit rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
                {currentYear} Report
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Total fund pool", value: formatCurrency(pooledFunds), helper: "Aggregate deployed capital" },
                { label: "Lending ratio", value: "49%", helper: "Share directed to member loans" },
                { label: "Reserve coverage", value: "4.6 months", helper: "Liquidity runway" },
              ].map((item) => (
                <div key={item.label} className="border-l-2 border-[#8cc63f] pl-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold tracking-normal text-slate-950">{displayValue(item.value)}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Use of funds</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Share</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {SACCO_UTILIZATION_ALLOCATIONS.map((item) => (
                    <tr key={item.label}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-950">{item.label}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{displayValue(formatCurrency(item.amount))}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-950">{item.percent}%</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ALLOCATION OVERVIEW MAP — RETAINED */}
          <div className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Allocation overview</p>
                <p className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{displayValue(formatCurrency(pooledFunds))}</p>
              </div>
              <WalletCards size={24} className="text-[#8cc63f]" />
            </div>
            <div className="relative mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={3}
                  >
                    {allocationChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value, name, props) => [
                      `${value}% - ${formatCurrency(props.payload.amount)}`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Mapped</p>
                  <p className="text-2xl font-semibold text-slate-950">100%</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {allocationChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-semibold text-slate-950">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      {/* ===== 2. HISTORICAL PERFORMANCE ===== */}
      <Surface className="overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-100">
              <Landmark size={20} className="text-amber-700" />
            </div>
            <div>
              <h5 className="text-base font-semibold tracking-normal text-slate-950">
                Historical Performance
              </h5>
              <p className="text-sm text-slate-500">
                Financial outcomes, yields, and returns for the previous fiscal year ({currentYear - 1}).
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: `${currentYear - 1} Total Deposits`, value: formatCurrency(4200000), icon: PiggyBank, trend: "+12.4% YoY", color: "text-emerald-700" },
              { label: `${currentYear - 1} Loans Disbursed`, value: formatCurrency(9800000), icon: FileText, trend: "+8.2% YoY", color: "text-blue-700" },
              { label: `${currentYear - 1} Net Growth`, value: formatCurrency(1320000), icon: TrendingUp, trend: "+5.7% surplus", color: "text-amber-700" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
                  <item.icon size={18} className="text-[#8cc63f]" />
                </div>
                <p className="mt-2 text-xl font-semibold text-slate-950">{displayValue(item.value)}</p>
                <p className={`mt-1 text-xs font-medium ${item.color}`}>{item.trend}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h6 className="text-sm font-semibold text-slate-700">Portfolio Performance Metrics ({currentYear - 1})</h6>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Portfolio yield", value: "11.8%", helper: "Annual return from lending" },
                { label: "Members financed", value: "126", helper: "Active loan recipients" },
                { label: "Avg. approval time", value: "2.4 days", helper: "Complete applications" },
                { label: "Reserve coverage", value: "4.6 months", helper: "Liquidity protection" },
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg bg-white p-4 border border-slate-100">
                  <p className="text-xs font-semibold uppercase text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{metric.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      {/* ===== 3. CURRENT POOL ===== */}
      <Surface className="overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-100">
              <WalletCards size={20} className="text-blue-700" />
            </div>
            <div>
              <h5 className="text-base font-semibold tracking-normal text-slate-950">
                Current Pool — {currentYear}
              </h5>
              <p className="text-sm text-slate-500">
                Dedicated breakdown of investments and allocations for the current fiscal year.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total pool size", value: formatCurrency(pooledFunds), helper: `${currentYear} aggregate` },
              { label: "Your share capital", value: formatCurrency(stats.shareCapital), helper: "Personal contribution" },
              { label: "Active share records", value: activeShareRecords, helper: "Verified share entries" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-blue-200 bg-blue-50/50 p-5">
                <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{displayValue(item.value)}</p>
                <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">Current Investment Allocations</p>
            </div>
            {SACCO_PROJECTS.map((project) => (
              <div key={project.title} className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950">{project.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{project.date} - {project.status}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-950">{displayValue(formatCurrency(project.amount))}</p>
                  <p className="mt-1 text-xs font-medium text-blue-700">{project.progress}% allocated</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Surface>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500">
        Portfolio data presented is illustrative. Connect to audited SACCO ledger data for live reporting. Values shown are for demonstration.
      </div>
    </div>
  );
}

function SearchResultsPage({
  search,
  data,
  stats,
  user,
  showValues,
  remoteSearch,
}) {
  const remote = remoteSearch?.results || {};
  const resultGroups = [
    {
      title: "Transactions",
      icon: ReceiptText,
      items:
        remote.transactions ||
        data.transactions.filter((item) => matchesSearch(item, search)),
      render: (item) =>
        `${normalizeStatus(item.type || item.transactionType || "Transaction")} - ${formatCurrency(item.amount)} - ${item.reference || item.status || item.id || ""}`,
      to: "transactions",
    },
    {
      title: "Loans",
      icon: FileText,
      items:
        remote.loans ||
        data.loans.filter((item) => matchesSearch(item, search)),
      render: (item) =>
        `${normalizeStatus(item.type || "Loan")} - ${formatCurrency(item.balance || item.principal || item.amount)} - ${normalizeStatus(item.status)}`,
      to: "loans",
    },
    {
      title: "Shares and Savings",
      icon: PiggyBank,
      items: [
        ...(remote.shareAccounts || []),
        ...(remote.savingsAccounts || []),
      ].length
        ? [...(remote.shareAccounts || []), ...(remote.savingsAccounts || [])]
        : data.shares.filter((item) => matchesSearch(item, search)),
      render: (item) =>
        `${item.type || "Share record"} - ${formatCurrency(item.totalInvested || item.shares || item.amount)} - ${item.status || ""}`,
      to: "savings",
    },
    {
      title: "Security Sessions",
      icon: MonitorSmartphone,
      items: [...data.activeSessions, ...data.loginHistory].filter((item) =>
        matchesSearch(item, search),
      ),
      render: (item) =>
        `${item.device || item.deviceName || "Device"} - ${item.location || ""} ${item.ip || ""} - ${item.status || item.event || ""}`,
      to: "security",
    },
    {
      title: "Notifications",
      icon: Bell,
      items: data.notifications.filter((item) => matchesSearch(item, search)),
      render: (item) => `${item.title || "Notification"} - ${item.body || ""}`,
      to: "notifications",
    },
    {
      title: "Profile",
      icon: UserRound,
      items: matchesSearch(user, search) ? [user] : [],
      render: () =>
        `${user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Member"} - ${user?.email || ""} - ${user?.phone || ""}`,
      to: "settings",
    },
  ];

  const totalResults = resultGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Search"
        title={`Search results for "${search}"`}
        description={`${totalResults} result${totalResults === 1 ? "" : "s"} found across dashboard data, records, notifications, profile, and security events.`}
      />
      {remoteSearch?.loading || remoteSearch?.error ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${remoteSearch.error ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-200 bg-sky-50 text-sky-800"}`}
        >
          {remoteSearch.error || "Searching live dashboard records..."}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Search}
          className="text-[#8cc63f]"
          label="Matches"
          value={totalResults}
          trend="Live"
          helper="Updates as data refreshes"
          tone="blue"
        />
        <StatCard
          icon={WalletCards}
          className="text-[#8cc63f]"
          label="Balance"
          value={formatCurrency(stats.balance)}
          trend="Context"
          helper="Current account context"
          tone="emerald"
          blur={!showValues}
        />
        <StatCard
          icon={MonitorSmartphone}
          className="text-[#8cc63f]"
          label="Sessions"
          value={data.activeSessions.length}
          trend="Protected"
          helper="Only one active device is allowed"
          tone="slate"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {resultGroups.map((group) => (
          <Surface key={group.title} className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-200 p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
                <group.icon size={20} className="text-[#8cc63f]" />
              </div>
              <div>
                <h5 className="text-base font-semibold tracking-normal text-slate-950">
                  {group.title}
                </h5>
                <p className="text-sm text-slate-500">
                  {group.items.length} matching record
                  {group.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {group.items.length === 0 ? (
              <EmptyState
                icon={group.icon}
                className="text-[#8cc63f]"
                title="No matches"
                description="Try a name, status, amount, reference, device, IP, location, or page term."
              />
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

function ReportsPage({ accessToken, data = {} }) {
  const [reportType, setReportType] = useState("transactions");
  const [duration, setDuration] = useState("all");
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);
  const [showOnScreen, setShowOnScreen] = useState(false);
  const { transactions = [], loans = [], shares = [], stats: reportStats } = data;

  const filterByDuration = (items, df = "createdAt") => {
    if (duration === "all") return items;
    const now = new Date(); const ago = new Date(); ago.setMonth(now.getMonth() - Number(duration));
    return items.filter(i => { const d = i[df] || i.date; return d ? new Date(d) >= ago : true; });
  };
  const ft = filterByDuration(transactions); const fl = filterByDuration(loans); const fs = filterByDuration(shares, "createdAt");
  const lbl = (tx) => { const l = getTransactionPromptLabel(tx).toLowerCase(); return l; };
  const fw = ft.filter(t => lbl(t).includes("withdraw")||lbl(t).includes("payout")||lbl(t).includes("disburse"));
  const fr = ft.filter(t => lbl(t).includes("repay")||lbl(t).includes("loan")||lbl(t).includes("credit"));
  const fd = ft.filter(t => lbl(t).includes("dividend"));
  const fpd = ft.filter(t => lbl(t).includes("payroll")||lbl(t).includes("deduction")||lbl(t).includes("salary"));

  const reportData = {
    transactions: { title: "Transaction Statement", headers: ["Date","Type","Reference","Amount","Status"], rows: ft.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-",Type:getTransactionPromptLabel(t),Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Status:normalizeStatus(t.status||"Completed")})),summary:{Total:formatCurrency(ft.reduce((s,t)=>s+Number(t.amount||0),0)),Count:ft.length} },
    loans: { title: "Loan Statement", headers: ["Type","Principal","Balance","Status","Date"], rows: fl.map(l=>({Type:l.type||"Loan",Principal:formatCurrency(Number(l.principal||0)),Balance:formatCurrency(Number(l.balance||0)),Status:normalizeStatus(l.status),Date:l.createdAt?new Date(l.createdAt).toLocaleDateString():"-"})),summary:{"Active Balance":formatCurrency(fl.reduce((s,l)=>s+Number(l.balance||l.principal||0),0)),Count:fl.length} },
    savings: { title: "Savings & Share Capital Report", headers: ["Record","Amount","Status","Date"], rows: fs.map(s=>({Record:s.type||"Share",Amount:formatCurrency(Number(s.totalInvested||s.amount||0)),Status:normalizeStatus(s.status||"Active"),Date:s.createdAt?new Date(s.createdAt).toLocaleDateString():"-"})),summary:{"Share Capital":formatCurrency(reportStats?.shareCapital||fs.reduce((s,sh)=>s+Number(sh.totalInvested||0),0)),Count:fs.length} },
    withdrawals: { title: "Withdrawal Report", headers: ["Date","Reference","Amount","Status"], rows: fw.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-",Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Status:normalizeStatus(t.status||"Completed")})),summary:{"Total Withdrawn":formatCurrency(fw.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fw.length} },
    "loan-repayment": { title: "Loan Repayment Report", headers: ["Date","Reference","Amount","Status"], rows: fr.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-",Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Status:normalizeStatus(t.status||"Completed")})),summary:{"Total Repaid":formatCurrency(fr.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fr.length} },
    dividend: { title: "Dividend Report", headers: ["Date","Reference","Amount","Status"], rows: fd.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-",Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Status:normalizeStatus(t.status||"Completed")})),summary:{"Total Dividends":formatCurrency(fd.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fd.length} },
    guarantor: { title: "Guarantor Report", headers: ["Date","Reference","Amount","Status"], rows: fr.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-",Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Status:normalizeStatus(t.status||"Completed")})),summary:{"Guaranteed Amount":formatCurrency(fr.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fr.length} },
    "payroll-deduction": { title: "Payroll Deduction Report", headers: ["Date","Reference","Amount","Status"], rows: fpd.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-",Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Status:normalizeStatus(t.status||"Completed")})),summary:{"Total Deducted":formatCurrency(fpd.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fpd.length} },
  };
  const cr = reportData[reportType] || reportData.transactions;

  async function requestReport(e) { e.preventDefault(); setSending(true); setMessage(null); try { await emailMemberReport(reportType, accessToken, duration==="all"?undefined:Number(duration)); setMessage({ type: "success", text: "Report sent to your email." }); } catch (err) { setMessage({ type: "error", text: err?.message || "Failed." }); } finally { setSending(false); } }

  return (<div className="space-y-6">
    <SectionHeader eyebrow="Reports" title="Generate & view reports" description="Select a report type and duration filter. Data renders instantly on screen." />
    <Surface className="p-5">
      {message&&<div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</div>}
      <form onSubmit={requestReport} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,200px)_auto_auto] md:items-end">
        <label className="text-sm font-semibold text-slate-700">Report type<select value={reportType} onChange={e=>{setReportType(e.target.value);setShowOnScreen(true);}} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm"><option value="transactions">Transaction statement</option><option value="loans">Loan statement</option><option value="savings">Savings & share capital</option><option value="withdrawals">Withdrawal report</option><option value="loan-repayment">Loan repayment report</option><option value="dividend">Dividend report</option><option value="guarantor">Guarantor report</option><option value="payroll-deduction">Payroll deduction report</option></select></label>
        <label className="text-sm font-semibold text-slate-700">Duration<select value={duration} onChange={e=>{setDuration(e.target.value);setShowOnScreen(true);}} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm"><option value="all">All time</option><option value="1">Last month</option><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select></label>
        <button type="button" onClick={()=>setShowOnScreen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800"><Eye size={17}/>View on screen</button>
        <button disabled={sending} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><MailCheck size={17}/>{sending?"Sending...":"Email report"}</button>
      </form>
    </Surface>
    {showOnScreen?<Surface className="overflow-hidden"><div className="border-b p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-base font-semibold">{cr.title}</h4><p className="mt-1 text-sm text-slate-500">{duration==="all"?"All records":`Last ${duration} month${Number(duration)>1?"s":""}`} · {cr.rows.length} row{cr.rows.length!==1?"s":""}</p></div><div className="flex flex-wrap gap-3">{Object.entries(cr.summary).map(([l,v])=>(<div key={l} className="rounded-lg bg-slate-50 px-4 py-2"><p className="text-xs font-semibold text-slate-500">{l}</p><p className="text-sm font-semibold">{v}</p></div>))}</div></div></div><div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-slate-50">{cr.headers.map(h=>(<th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{h}</th>))}</tr></thead><tbody className="divide-y divide-slate-100">{cr.rows.length===0?<tr><td colSpan={cr.headers.length} className="px-5 py-12 text-center text-sm text-slate-500">No records found.</td></tr>:cr.rows.map((row,i)=>(<tr key={i} className="bg-white transition hover:bg-slate-50">{cr.headers.map(h=>(<td key={h} className="px-5 py-4 text-sm text-slate-700">{row[h]||"-"}</td>))}</tr>))}</tbody></table></div></Surface>:<Surface className="p-8"><EmptyState icon={FileText} title="Generate a report" description="Select report type and duration above, then click 'View on screen'." /></Surface>}
  </div>);
}

function SavingsPage({
  stats,
  transactions = [],
  accessToken,
  onRefresh,
  showValues,
  onToggleValues,
  user,
}) {
  const [message, setMessage] = useState(null);
  const savingsTransactions = transactions.filter((transaction) => {
    const category = String(
      transaction.paymentCategory ||
        transaction.kcbEndpoint ||
        transaction.type ||
        "",
    ).toLowerCase();
    return ["savings", "monthly", "share", "wallet", "fine", "loan"].some(
      (token) => category.includes(token),
    );
  });

  return (
    <SimplePage icon={PiggyBank}>
      {message ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {message.text}
        </div>
      ) : null}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleValues}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {showValues ? (
            <EyeOff className="text-[#8cc63f]" size={16} />
          ) : (
            <Eye className="text-[#8cc63f]" size={16} />
          )}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          icon={PiggyBank}
          className="text-[#8cc63f]"
          label="Savings balance"
          value={formatCurrency(stats.totalSavings)}
          trend="Paid"
          tone="emerald"
          blur={!showValues}
        />
        <StatCard
          icon={WalletCards}
          className="text-[#8cc63f]"
          label="Share capital"
          value={formatCurrency(stats.shareCapital)}
          trend="Equity"
          tone="blue"
          blur={!showValues}
        />
      </div>
      <SavingsContributionForm
        accessToken={accessToken}
        user={user}
        onRefresh={onRefresh}
        onMessage={setMessage}
      />
      <TransactionsTable
        transactions={savingsTransactions}
        limit={6}
        showViewAll
        accessToken={accessToken}
      />
    </SimplePage>
  );
}

function OptOutSection({ accessToken, user }) {
  const [form, setForm] = useState({ reason: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [step, setStep] = useState("initial"); // initial | confirm | success | shareCapitalModal
  const [optOutResult, setOptOutResult] = useState(null);
  const MOCK_LOAN_BALANCE = 0;
  const MOCK_IS_GUARANTOR = false;
  const canOptOut = MOCK_LOAN_BALANCE === 0 && !MOCK_IS_GUARANTOR;

  async function handleOptOut(e) {
    e.preventDefault();
    if (!canOptOut) { setMsg({ type: "error", text: "Cannot opt out: you have outstanding loans or active guarantor obligations." }); return; }
    if (form.confirm.trim().toUpperCase() !== "CONFIRM") { setMsg({ type: "error", text: 'Type "CONFIRM" to proceed.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const result = await requestMemberOptOut({ reason: form.reason, acknowledgedTerms: true }, accessToken);
      setOptOutResult(result);
      setStep("shareCapitalModal");
    }
    catch (err) { setMsg({ type: "error", text: err?.message || "Failed to submit." }); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="space-y-6">
        <div className={step === "confirm" ? "rounded-lg border border-rose-300 bg-rose-50/60 p-6" : "rounded-lg border border-slate-200 bg-slate-50/60 p-6"}>
          <div className="mb-4 flex items-center gap-3">
            <div className={step === "confirm" ? "grid h-10 w-10 place-items-center rounded-lg bg-rose-100" : "grid h-10 w-10 place-items-center rounded-lg bg-slate-200"}>
              <LogOut size={20} className={step === "confirm" ? "text-rose-600" : "text-slate-400"} />
            </div>
            <div>
              <h5 className={step === "confirm" ? "text-base font-semibold text-rose-900" : "text-base font-medium text-slate-500"}>
                Opt-Out of SACCO
              </h5>
              <p className={step === "confirm" ? "text-sm text-rose-700" : "text-xs text-slate-400"}>
                Voluntary membership exit. This action is irreversible pending financier approval.
              </p>
            </div>
          </div>

          {!canOptOut ? (
            <div className="space-y-2 text-sm text-rose-700">
              <p>&#x2716; You must have zero outstanding loan balances.</p>
              <p>&#x2716; You must not be an active guarantor for another member.</p>
            </div>
          ) : step === "initial" ? (
            <button
              onClick={() => setStep("confirm")}
              className="text-xs font-medium text-slate-400 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-600 hover:decoration-slate-500"
            >
              Request membership cancellation
            </button>
          ) : step === "confirm" ? (
            <form onSubmit={handleOptOut} className="space-y-4">
              {msg && <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}
              <label className="block text-sm font-semibold text-rose-900">Reason for leaving<textarea value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} rows={3} className="mt-1 w-full rounded-lg border border-rose-200 px-3.5 py-3 text-sm" placeholder="Explain why you wish to leave the SACCO..."/></label>
              <label className="block text-sm font-semibold text-rose-900">Type CONFIRM to proceed<input value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} className="mt-1 w-full rounded-lg border border-rose-200 px-3.5 py-3 text-sm" placeholder='Type "CONFIRM" to verify'/></label>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {saving?<RefreshCw className="animate-spin" size={17}/>:<LogOut size={17}/>}
                  {saving?"Submitting...":"Confirm opt-out"}
                </button>
                <button type="button" onClick={()=>{setStep("initial");setMsg(null);}} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      {/* PHASE 2.1: Share Capital Transfer Modal after opt-out */}
      {step === "shareCapitalModal" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-100">
                  <Send size={20} className="text-sky-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Transfer Share Capital</h3>
                  <p className="text-sm text-slate-500">List your share capital for other members to bid on.</p>
                </div>
              </div>
              <button
                onClick={() => setStep("success")}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="mb-4 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Your opt-out request has been submitted. Your share capital of <strong>{formatCurrency(optOutResult?.shareCapitalAmount || 0)}</strong> will be listed on the marketplace for other members to bid on.
              </p>
              <TransferShareCapitalForm
                accessToken={accessToken}
                shareCapitalAmount={optOutResult?.shareCapitalAmount || 0}
                memberNumber={user?.memberNumber || user?.Member?.memberNumber || ""}
                onComplete={() => setStep("success")}
                onCancel={() => setStep("success")}
              />
            </div>
          </div>
        </div>
      ) : null}

      {step === "success" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <div>
              <h5 className="text-base font-semibold text-emerald-900">Opt-out request submitted</h5>
              <p className="text-sm text-emerald-700">The SACCO financier will review and process your exit.</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TransferShareCapitalForm({ accessToken, shareCapitalAmount, memberNumber, onComplete, onCancel }) {
  const [form, setForm] = useState({ memberId: memberNumber || "", amount: String(shareCapitalAmount || "") });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.memberId.trim()) { setMsg({ type: "error", text: "Member ID is required." }); return; }
    if (!amount || amount <= 0) { setMsg({ type: "error", text: "Enter a valid share capital amount." }); return; }
    if (amount > shareCapitalAmount) { setMsg({ type: "error", text: `Amount cannot exceed your share capital (${formatCurrency(shareCapitalAmount)}).` }); return; }
    setSaving(true); setMsg(null);
    try {
      // Submit the share capital listing to the marketplace
      await apiListingCreate({ memberId: form.memberId, amount, accessToken });
      setMsg({ type: "success", text: "Share capital listing created successfully. Other members can now place bids." });
      setTimeout(() => onComplete?.(), 2000);
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Failed to create listing." });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {msg && <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}
      <label className="block text-sm font-semibold text-slate-700">
        Member ID (auto-filled)
        <input
          type="text"
          value={form.memberId}
          readOnly
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 cursor-not-allowed"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Share Capital Amount (KES)
        <span className="text-xs font-normal text-slate-400 ml-1">Max: {formatCurrency(shareCapitalAmount)}</span>
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm(f => ({...f, amount: e.target.value}))}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          placeholder="Amount to list for bidding"
          max={shareCapitalAmount}
        />
      </label>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {saving ? <RefreshCw className="animate-spin" size={17} /> : <Send size={17} />}
          {saving ? "Creating listing..." : "List on marketplace"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}

// API helper for share capital listing
async function apiListingCreate({ memberId, amount, accessToken }) {
  const { apiRequest, unwrapEnvelopeData } = await import("../../lib/apiClient.js");
  const res = await apiRequest("/api/shares/listings", {
    method: "POST",
    accessToken,
    body: { memberId, amount: Number(amount) },
  });
  if (!res.ok) throw new Error(res.json?.message || "Failed to create listing");
  return unwrapEnvelopeData(res.json);
}

function ShareCapitalTransfer({ stats, accessToken }) {
  const [form, setForm] = useState({ recipientId: "", amount: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const maxTransfer = Math.min(Number(stats.shareCapital || 0), Number(stats.shareCapital || 0));

  async function handleTransfer(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.recipientId.trim()) { setMsg({ type: "error", text: "Enter a valid recipient Membership ID." }); return; }
    if (!amount || amount <= 0) { setMsg({ type: "error", text: "Enter a valid amount to transfer." }); return; }
    if (amount > maxTransfer) { setMsg({ type: "error", text: `Cannot transfer more than your share capital (${formatCurrency(maxTransfer)}).` }); return; }
    setSaving(true); setMsg(null);
    try { await new Promise(r => setTimeout(r, 1200)); setMsg({ type: "success", text: `Transfer of ${formatCurrency(amount)} to ${form.recipientId} initiated. Ledger type: SHARE_CAPITAL_TRANSFER.` }); setForm({ recipientId: "", amount: "" }); }
    catch (err) { setMsg({ type: "error", text: err.message }); }
    finally { setSaving(false); }
  }

  return (<Surface className="p-5">
    <div className="mb-4"><h5 className="text-base font-semibold text-slate-950">Transfer Share Capital</h5><p className="text-sm text-slate-500">Non-refundable share capital can be transferred to another active member.</p></div>
    {msg && <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${msg.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}
    <form onSubmit={handleTransfer} className="grid gap-4">
      <label className="block text-sm font-semibold text-slate-700">Recipient Membership ID<input value={form.recipientId} onChange={e=>setForm(f=>({...f,recipientId:e.target.value}))} className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm" placeholder="e.g. M001"/></label>
      <label className="block text-sm font-semibold text-slate-700">Amount (KES) <span className="text-xs font-normal text-slate-400">Max: {formatCurrency(maxTransfer)}</span><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm" placeholder="Amount to transfer"/></label>
      <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{saving?<RefreshCw className="animate-spin" size={17}/>:<Send size={17}/>}{saving?"Processing...":"Transfer shares"}</button>
    </form>
  </Surface>);
}

export {
  MIN_SHARE_CAPITAL,
  normalizeStatus,
  matchesSearch,
  SectionHeader,
  SkeletonDashboard,
  DashboardOverview,
  TransactionsTable,
  NotificationsPanel,
  LoansPage,
  SecuritySection,
  ProfileSettings,
  PortfolioPage,
  SearchResultsPage,
  ReportsPage,
  SavingsPage,
  SimplePage,
};
