import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Building2,
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
  LogOut,
  LockKeyhole,
  MailCheck,
  MapPin,
  MonitorSmartphone,
  PiggyBank,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  TrendingUp,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select.jsx";
import { getDashboardPath } from "../../utils/dashboardRoutes.js";
import { kenyaCounties } from "../onboarding/PersonalDetailsForm.jsx";
import SavingsContributionForm from "./SavingsContributionForm.jsx";
import {
  updateMemberProfile,
  requestMemberOptOut,
  searchOptOutTransferees,
  applyForLoan,
  emailMemberReport,
  initiateLoanRepaymentStk,
  getLoanPaymentStatus,
  searchQualifiedGuarantors,
  transferShareCapital,
} from "../../features/member/memberService.js";
import { findMemberByNumber } from "../../features/search/searchService.js";
import {
  changePassword,
  revokeAuthSession,
} from "../../services/authService.js";
import { uploadProfilePhoto } from "../../lib/supabaseStorage.js";
import { toast } from "sonner";
import ayedosLogo from "../../assets/logo-light.png";

const emptyProfile = {
  fullName: "",
  email: "",
  phone: "",
  nationalId: "",
  kraPin: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  poBox: "",
  county: "",
  subCounty: "",
  employer: "",
  jobTitle: "",
  monthlyIncome: "",
  payrollNumber: "",
  staffId: "",
  passportPhotoUrl: "",
};

const loanOutstandingBalance = (loan) => {
  const explicit = Number(loan?.outstandingBalance ?? loan?.balance);
  if (Number.isFinite(explicit)) return explicit;
  const principal = Number(loan?.principalBalance ?? loan?.principal ?? loan?.amount ?? 0);
  const interest = Number(loan?.accruedInterest || 0);
  return principal + interest;
};

const MIN_SHARE_CAPITAL = 25000;
const MAX_PROFILE_PHOTO_BYTES = 1.5 * 1024 * 1024;

function isAyedosMember(user = {}) {
  const company = String(user?.company || user?.employer || "").toLowerCase();
  return company === "ayedos" || Boolean(user?.isWhitelisted);
}

function hasStaffId(user = {}) {
  return Boolean(String(user?.staffId || user?.payrollNumber || "").trim());
}

const LOAN_PRODUCTS = [
  {
    type: "EMERGENCY",
    name: "Emergency Loan",
    max: 50000,
    interestRate: 1,
    duration: 12,
    defaultRepaymentMonths: 12,
    guarantors: 0,
    requiresFullShareCapital: false,
  },
  {
    type: "EDUCATION",
    name: "Education Loan",
    max: 100000,
    interestRate: 1,
    duration: 24,
    defaultRepaymentMonths: 18,
    guarantors: 1,
    requiresFullShareCapital: true,
  },
  {
    type: "WELFARE",
    name: "Welfare Loan",
    max: 100000,
    interestRate: 1,
    duration: 24,
    defaultRepaymentMonths: 18,
    guarantors: 1,
    requiresFullShareCapital: true,
  },
  {
    type: "DEVELOPMENT",
    name: "Development Loan",
    max: 250000,
    interestRate: 1.5,
    duration: 72,
    defaultRepaymentMonths: 48,
    guarantors: 1,
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

function formatTransactionTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} EAT`;
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
  return String(status || "Pending").replace(/loan_repayments?/gi, "loan repayment").replace(/_/g, " ");
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
  const profilePath = getDashboardPath("MEMBER", "settings");
  const member = user?.Member || user?.member || {};
  const checks = [
    {
      label: "Identity details",
      complete: Boolean(user?.nationalId || user?.Member?.nationalId),
      icon: BadgeCheck,
    },
    { label: "KRA PIN", complete: Boolean(user?.kraPin), icon: Fingerprint },
    { label: "Address", complete: Boolean(user?.address || user?.poBox), icon: MapPin },
    { label: "County", complete: Boolean(user?.county), icon: MapPin },
    { label: "Sub-County", complete: Boolean(user?.subCounty), icon: MapPin },
    {
      label: "Verify phone number",
      complete: Boolean(
        user?.phoneVerified || user?.isPhoneVerified || user?.phone,
      ),
      icon: Smartphone,
    },
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
            to={profilePath}
            className="text-sm font-medium text-slate-500 transition hover:text-emerald-700"
          >
            Complete your personal details for faster approvals.
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
  const [selectedNotice, setSelectedNotice] = useState(null);
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
                      <button type="button" onClick={() => { setSelectedNotice(notice); if (!isRead) onMarkRead?.(notice.id); }} className="text-xs font-medium text-slate-500 hover:text-slate-700 transition">
                        View details →
                      </button>
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
      {selectedNotice && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Notification details</p><h3 className="mt-1 text-lg font-bold text-slate-950">{selectedNotice.title}</h3></div><button type="button" onClick={() => setSelectedNotice(null)} className="rounded-lg border px-3 py-1.5 text-sm font-semibold">Close</button></div><p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selectedNotice.body}</p>{selectedNotice.metadata?.reason && <p className="mt-3 text-sm font-bold text-rose-700">{selectedNotice.metadata.reason}</p>}<p className="mt-4 text-xs text-slate-500">{selectedNotice.time ? new Date(selectedNotice.time).toLocaleString() : ''}</p></div></div>}
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
                    Date &amp; time (EAT)
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
                        {transaction.createdAtEAT || formatTransactionTimestamp(createdAt)}
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
  const showEmployerContribution = hasStaffId(user);
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
    ...(showEmployerContribution
      ? [
          {
            label: "Employer Contribution",
            value: formatCurrency(stats.employerContribution || user?.employerContribution || 0),
            icon: Building2,
            tone: "violet",
          },
        ]
      : []),
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
          {stats.shareCapitalRemaining > 0 ? (
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
          ) : null}
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
  placeholder,
  min,
  max,
  disabled = false,
  helper = "",
}) {
  const controlClass =
    "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 dark:focus:border-emerald-500 dark:focus:ring-emerald-950";

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="relative">
        {as === "textarea" ? (
          <textarea
            className={`${controlClass} min-h-24 resize-y`}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
          />
        ) : as === "select" ? (
          <select
            className={controlClass}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
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
            placeholder={placeholder}
            min={min}
            max={max}
            disabled={disabled}
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
      {helper ? (
        <span className="mt-1 block text-xs font-medium text-slate-500">
          {helper}
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
    kraPin: profile?.kraPin || "",
    dateOfBirth: profile?.dateOfBirth || "",
    gender: profile?.gender || "",
    address: profile?.address || "",
    poBox: profile?.poBox || "",
    county: profile?.county || "",
    subCounty: profile?.subCounty || "",
    employer: profile?.employer || "",
    jobTitle: profile?.occupation || profile?.jobTitle || "",
    monthlyIncome: profile?.monthlyIncome || "",
    payrollNumber: profile?.payrollNumber || "",
    staffId: profile?.staffId || "",
    passportPhotoUrl: profile?.passportPhotoUrl || "",
  };
}

function ProfileSettings({ user, stats = {}, accessToken, onProfileUpdated, onRefresh }) {
  const memberNumber =
    user?.memberNumber ||
    user?.Member?.memberNumber ||
    user?.member?.memberNumber ||
    "";
  const [form, setForm] = useState(() => ({
    ...emptyProfile,
    fullName: user?.name || user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    nationalId: user?.nationalId || "",
    kraPin: user?.kraPin || "",
    dateOfBirth: user?.dateOfBirth || "",
    gender: user?.gender || "",
    address: user?.address || "",
    poBox: user?.poBox || "",
    county: user?.county || "",
    subCounty: user?.subCounty || "",
    employer: user?.employer || "",
    jobTitle: user?.jobTitle || "",
    monthlyIncome: user?.monthlyIncome || "",
    payrollNumber: user?.payrollNumber || "",
    staffId: user?.staffId || "",
    passportPhotoUrl: user?.passportPhotoUrl || "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [preview, setPreview] = useState(user?.passportPhotoUrl || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [showLockedValues, setShowLockedValues] = useState(false);
  const [optOutForm, setOptOutForm] = useState({
    reason: "",
    buyerMemberNumber: "",
    acknowledgedTerms: false,
  });
  const [submittingOptOut, setSubmittingOptOut] = useState(false);
  const [nominees, setNominees] = useState(() => user?.nominees || []);
  useEffect(() => {
    setForm(buildProfileForm(user));
    setPreview(user?.passportPhotoUrl || null);
    setPhotoFile(null);
    setNominees(user?.nominees || []);
  }, [user]);

  const maskedEmail = form.email ? maskEmail(form.email) : "—";
  const maskedPhone = form.phone ? maskPhone(form.phone) : "—";
  const maskedNationalId = form.nationalId
    ? maskNationalId(form.nationalId)
    : "—";
  const lockedProfileFields = {
    fullName: Boolean(user?.name || user?.fullName),
    email: Boolean(user?.email),
    phone: Boolean(user?.phone),
    nationalId: Boolean(user?.nationalId || user?.Member?.nationalId || user?.member?.nationalId),
    dateOfBirth: Boolean(user?.dateOfBirth),
    gender: Boolean(user?.gender),
  };
  const showValue = (value, masked = "••••••••") => {
    if (!value) return "—";
    return showLockedValues ? value : masked;
  };
  const showStaffId = hasStaffId(user);
  const shareCapital = Number(stats.shareCapital || 0);
  const subCountiesList = useMemo(() => (
    form.county && kenyaCounties[form.county] ? kenyaCounties[form.county] : []
  ), [form.county]);

  useEffect(() => {
    if (form.subCounty && !subCountiesList.includes(form.subCounty)) {
      setForm((current) => ({ ...current, subCounty: "" }));
    }
  }, [form.subCounty, subCountiesList]);

  function update(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function updateProfileField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "county" ? { subCounty: "" } : {}),
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
    if (nominees.length && Math.abs(nominees.reduce((sum, nominee) => sum + Number(nominee.allocationPercentage || 0), 0) - 100) > 0.001)
      nextErrors.nominees = "Nominee allocations must total 100%.";
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
      const passportPhotoUrl = uploadedProfile?.passportPhotoUrl || form.passportPhotoUrl;
      const changedPassportPhotoUrl = uploadedProfile?.passportPhotoUrl || "";

      if (photoFile && !passportPhotoUrl) {
        throw new Error(
          "Profile photo uploaded but no photo URL was returned.",
        );
      }

      const profilePayload = {
        kraPin: form.kraPin,
        address: form.address,
        poBox: form.poBox,
        county: form.county,
        subCounty: form.subCounty,
        occupation: form.jobTitle,
        monthlyIncome: form.monthlyIncome,
        payrollNumber: form.payrollNumber,
        employer: form.employer,
      };
      if (changedPassportPhotoUrl) profilePayload.passportPhotoUrl = changedPassportPhotoUrl;
      const completeNominees = nominees.filter((nominee) => (
        nominee.fullName?.trim() ||
        nominee.relationship?.trim() ||
        nominee.phone?.trim() ||
        nominee.nationalId?.trim() ||
        nominee.allocationPercentage
      ));
      if (completeNominees.length) profilePayload.nominees = completeNominees;
      else profilePayload.nominees = [];
      if (!lockedProfileFields.fullName) profilePayload.name = form.fullName;
      if (!lockedProfileFields.email) profilePayload.email = form.email;
      if (!lockedProfileFields.phone) profilePayload.phone = form.phone;
      if (!lockedProfileFields.nationalId) profilePayload.nationalId = form.nationalId;
      if (!lockedProfileFields.gender) profilePayload.gender = form.gender;
      if (!lockedProfileFields.dateOfBirth) profilePayload.dateOfBirth = form.dateOfBirth;

      const updatedProfile = await updateMemberProfile(
        profilePayload,
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
      setEditingPersonal(false);
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

        {/* Personal information */}
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <UserRound className="text-[#8cc63f] h-5 w-5" />
              <h3 className="text-lg font-semibold">Personal information</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowLockedValues((current) => !current)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {showLockedValues ? <EyeOff size={16} /> : <Eye size={16} />}
                {showLockedValues ? "Hide values" : "Show values"}
              </button>
              <button
                type="button"
                onClick={() => setEditingPersonal((current) => !current)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#8cc63f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7ab534]"
              >
                <Pencil size={16} />
                {editingPersonal ? "Close editor" : "Edit Profile"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Member Number</label>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                {memberNumber || "Not assigned"}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <p className="mt-1 text-sm text-foreground">
                {showValue(form.fullName)}
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="mt-1 text-sm text-foreground">{showValue(form.email, maskedEmail)}</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <p className="mt-1 text-sm text-foreground">{showValue(form.phone, maskedPhone)}</p>
            </div>

            {/* National ID */}
            <div>
              <label className="text-sm font-medium">National ID</label>
              <p className="mt-1 text-sm text-foreground">{showValue(form.nationalId, maskedNationalId)}</p>
            </div>

            <div>
              <label className="text-sm font-medium">KRA PIN</label>
              <p className="mt-1 text-sm text-foreground">{form.kraPin || "—"}</p>
            </div>

            {showStaffId ? (
              <div>
                <label className="text-sm font-medium">Staff ID</label>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {form.staffId || user?.staffId || "Not assigned"}
                </p>
              </div>
            ) : null}

            {/* Date of Birth */}
            <div>
              <label className="text-sm font-medium">Date of Birth</label>
              <p className="mt-1 text-sm text-foreground">
                {showValue(form.dateOfBirth)}
              </p>
            </div>

            {/* Gender */}
            <div>
              <label className="text-sm font-medium">Gender</label>
              <p className="mt-1 text-sm text-foreground">
                {showValue(form.gender)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">P.O. Box</label>
              <p className="mt-1 text-sm text-foreground">{form.poBox || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium">County</label>
              <p className="mt-1 text-sm text-foreground">{form.county || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Sub-County</label>
              <p className="mt-1 text-sm text-foreground">{form.subCounty || "—"}</p>
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
        {editingPersonal ? (
          <EditableSection title="Edit profile" icon={UserRound}>
            <Field label="Full Name" name="fullName" value={form.fullName} onChange={update} error={errors.fullName} disabled={lockedProfileFields.fullName} helper={lockedProfileFields.fullName ? "Captured during onboarding" : ""} />
            <Field label="Phone Number" name="phone" value={form.phone} onChange={update} error={errors.phone} disabled={lockedProfileFields.phone} helper={lockedProfileFields.phone ? "Captured during onboarding" : ""} />
            <Field label="National ID" name="nationalId" value={form.nationalId} onChange={update} error={errors.nationalId} disabled={lockedProfileFields.nationalId} helper={lockedProfileFields.nationalId ? "Captured during onboarding" : ""} />
            <Field label="KRA PIN" name="kraPin" value={form.kraPin} onChange={update} placeholder="e.g., A123456789B" />
            <Field label="Physical Address / P.O. Box" name="poBox" value={form.poBox} onChange={update} placeholder="e.g., P.O. Box 12345-00100" />
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">County</label>
              <Select value={form.county} onValueChange={(value) => updateProfileField("county", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your county" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Counties</SelectLabel>
                    {Object.keys(kenyaCounties).map((county) => (
                      <SelectItem key={county} value={county}>{county}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Sub-County</label>
              <Select
                value={form.subCounty}
                onValueChange={(value) => updateProfileField("subCounty", value)}
                disabled={!form.county}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={form.county ? "Select sub-county" : "Select county first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Sub-Counties</SelectLabel>
                    {subCountiesList.map((subCounty) => (
                      <SelectItem key={subCounty} value={subCounty}>{subCounty}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Field label="Address Notes" name="address" value={form.address} onChange={update} as="textarea" />
            <Field label="Date of Birth" name="dateOfBirth" value={form.dateOfBirth} onChange={update} type="date" disabled={lockedProfileFields.dateOfBirth} helper={lockedProfileFields.dateOfBirth ? "Captured during onboarding" : ""} />
            <Field
              label="Gender"
              name="gender"
              as="select"
              value={form.gender}
              onChange={update}
              disabled={lockedProfileFields.gender}
              helper={lockedProfileFields.gender ? "Captured during onboarding" : ""}
              options={[
                { label: "Select gender", value: "" },
                { label: "Female", value: "Female" },
                { label: "Male", value: "Male" },
                { label: "Prefer not to say", value: "Prefer not to say" },
              ]}
            />
          </EditableSection>
        ) : null}

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

        <Surface className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h5 className="font-semibold text-slate-950">Nominees</h5><p className="text-sm text-slate-500">Add up to 3 nominees. Allocations must total 100%.</p></div>
            <button type="button" disabled={nominees.length >= 3} onClick={() => setNominees((items) => [...items, { fullName: "", relationship: "", phone: "", nationalId: "", allocationPercentage: "" }])} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40"><Plus size={15} className="mr-1 inline" />Add nominee</button>
          </div>
          <div className="space-y-3">
            {nominees.map((nominee, index) => (
              <div key={index} className="grid gap-3 rounded-lg border bg-slate-50 p-4 md:grid-cols-2">
                {[['fullName','Full name'],['relationship','Relationship'],['phone','Phone'],['nationalId','National ID']].map(([name,label]) => <label key={name} className="text-sm font-semibold text-slate-700">{label}<input required={name !== 'nationalId'} value={nominee[name] || ''} onChange={(e) => setNominees((items) => items.map((item, i) => i === index ? { ...item, [name]: e.target.value } : item))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>)}
                <label className="text-sm font-semibold text-slate-700">Allocation (%)<input required type="number" min="0.01" max="100" step="0.01" value={nominee.allocationPercentage} onChange={(e) => setNominees((items) => items.map((item, i) => i === index ? { ...item, allocationPercentage: e.target.value } : item))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
                <button type="button" onClick={() => setNominees((items) => items.filter((_, i) => i !== index))} className="self-end justify-self-start text-sm font-semibold text-rose-600">Remove nominee</button>
              </div>
            ))}
          </div>
          <p className={`mt-3 text-sm font-semibold ${errors.nominees ? 'text-rose-600' : 'text-slate-600'}`}>Allocated: {nominees.reduce((sum, nominee) => sum + Number(nominee.allocationPercentage || 0), 0)}%</p>
        </Surface>
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
      <OptOutSection accessToken={accessToken} user={user} shareCapitalAmount={shareCapital} stats={stats} onRefresh={onRefresh} />
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
  onPasswordChanged,
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
      const response = await changePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        accessToken,
      );
      setMessage({ type: "success", text: response?.message || "Password changed successfully. Full portal access is now enabled." });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      await onPasswordChanged?.(response?.data?.notification);
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

    </div>
  );
}

function LoansPage({ loans, stats, accessToken, onRefresh, search, showValues }) {
  const isLoanEligible = Number(stats.shareCapital || 0) >= MIN_SHARE_CAPITAL;
  const loanEligibilityMessage = "You are not yet eligible to apply for a loan. Please complete the minimum required share capital purchase before submitting a loan application.";
  const [loanForm, setLoanForm] = useState({ type: "EMERGENCY", amount: "10000", duration: "12", reason: "", selfGuarantee: false });
  const [repayAmount, setRepayAmount] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [message, setMessage] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loanValuesVisible, setLoanValuesVisible] = useState(Boolean(showValues));
  const [calculationTime, setCalculationTime] = useState(() => Date.now());
  const [selectedGuarantors, setSelectedGuarantors] = useState([]);
  const [guarantorQuery, setGuarantorQuery] = useState("");
  const [guarantorResults, setGuarantorResults] = useState([]);
  const [guarantorLoading, setGuarantorLoading] = useState(false);
  const activeLoans = loans.filter((loan) => ["ACTIVE", "APPROVED", "DISBURSED"].includes(String(loan.status || "").toUpperCase()));
  const hasRestrictedLoan = loans.some((loan) => ["PENDING", "PENDING_GUARANTORS", "UNDER_REVIEW", "ACTIVE", "APPROVED", "DISBURSED"].includes(String(loan.status || "").toUpperCase()));
  const [repayLoanId, setRepayLoanId] = useState("");
  const totalBalance = activeLoans.reduce((sum, loan) => sum + loanOutstandingBalance(loan), 0);
  const rows = loans.filter((loan) => matchesSearch(loan, search));
  const selectedProduct = LOAN_PRODUCTS.find((p) => p.type === loanForm.type) || LOAN_PRODUCTS[0];
  const selectedRepayLoanId = repayLoanId || activeLoans[0]?.id || "";
  const requestedAmount = Math.min(Number(loanForm.amount || 0), selectedProduct.max);
  const requestedDuration = Math.min(Number(loanForm.duration || 1), selectedProduct.duration);
  const totalInterest = requestedAmount * (selectedProduct.interestRate / 100) * requestedDuration;
  const monthlyRepayment = requestedDuration ? (requestedAmount + totalInterest) / requestedDuration : 0;
  const selectedRepayLoan = activeLoans.find((loan) => loan.id === selectedRepayLoanId);
  const repayValue = Number(repayAmount || 0);
  const accrualStart = selectedRepayLoan?.lastInterestAccrualAt || selectedRepayLoan?.approvedAt || selectedRepayLoan?.createdAt;
  const accruedDays = accrualStart ? Math.max(0, Math.floor((calculationTime - new Date(accrualStart).getTime()) / 86400000)) : 0;
  const liveAccruedInterest = Number(selectedRepayLoan?.accruedInterest || 0) + Number(selectedRepayLoan?.principalBalance ?? selectedRepayLoan?.principal ?? 0) * (Number(selectedRepayLoan?.interestRate || 0) / 100 / 30) * accruedDays;
  const outstanding = selectedRepayLoan ? Number((Number(selectedRepayLoan.principalBalance ?? selectedRepayLoan.principal ?? 0) + liveAccruedInterest).toFixed(2)) : 0;
  const interestPortion = Math.min(repayValue, liveAccruedInterest);
  const principalPortion = Math.max(Math.min(repayValue - interestPortion, Number(selectedRepayLoan?.principalBalance ?? selectedRepayLoan?.principal ?? 0)), 0);
  const remainingAfterPayment = Math.max(outstanding - repayValue, 0);
  const scheduledLoans = [...activeLoans].filter((loan) => loan.nextPaymentDueAt).sort((a, b) => new Date(a.nextPaymentDueAt) - new Date(b.nextPaymentDueAt));
  const nextLoan = scheduledLoans[0];
  const nextAmount = nextLoan ? loanOutstandingBalance(nextLoan) / Math.max(Number(nextLoan.duration || 1), 1) : 0;
  const loanMoney = (value) => loanValuesVisible ? formatCurrency(value) : "KES ****";

  const savingsBalance = Number(stats.savings || stats.savingsBalance || 0);
  const requiresGuarantors = loanForm.type !== "EMERGENCY" && !loanForm.selfGuarantee;
  const selectedMemberNames = selectedGuarantors.map((member) => member.name || member.memberNumber).join(", ");

  useEffect(() => {
    if (!requiresGuarantors || guarantorQuery.trim().length < 2) {
      setGuarantorResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setGuarantorLoading(true);
      try {
        const results = await searchQualifiedGuarantors(guarantorQuery.trim(), accessToken);
        if (!cancelled) setGuarantorResults(results || []);
      } catch (error) {
        if (!cancelled) setMessage({ type: "error", text: error?.message || "Unable to search guarantors." });
      } finally {
        if (!cancelled) setGuarantorLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [accessToken, guarantorQuery, requiresGuarantors]);

  useEffect(() => {
    const timer = setInterval(() => setCalculationTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoanValuesVisible(Boolean(showValues));
  }, [showValues]);

  function toggleGuarantor(member) {
    const id = member.memberId;
    setSelectedGuarantors((prev) => {
      if (prev.some((item) => item.memberId === id)) return prev.filter((item) => item.memberId !== id);
      if (prev.length >= 5) return prev;
      return [...prev, member];
    });
  }

  async function requestLoan(event, confirmed = false) {
    event.preventDefault();
    if (hasRestrictedLoan) { toast.error("You already have an active or pending loan application", { duration: 4000 }); return; }
    if (!isLoanEligible) { setMessage({ type: "error", text: loanEligibilityMessage }); return; }
    if (requestedAmount <= 0) { setMessage({ type: "error", text: "Enter a valid loan amount." }); return; }
    if (!selectedProduct) { setMessage({ type: "error", text: "Select a valid loan product." }); return; }
    if (selectedProduct.requiresFullShareCapital && stats.shareCapitalRemaining > 0) { setMessage({ type: "error", text: "Minimum share capital must be fully paid." }); return; }
    if (loanForm.selfGuarantee && requestedAmount > savingsBalance) { setMessage({ type: "error", text: `Self-guarantee limit exceeded. Available savings: ${formatCurrency(savingsBalance)}.` }); return; }
    if (requiresGuarantors && selectedGuarantors.length < 1) { setMessage({ type: "error", text: "Select at least one guarantor, or use self-guarantee if your savings cover the loan." }); return; }
    if (loanForm.type !== "EMERGENCY" && !loanForm.reason.trim()) { setMessage({ type: "error", text: "Please add the reason for this loan request." }); return; }
    try {
      setBusyAction("borrow"); setConfirmation(null);
      const result = await applyForLoan({ type: loanForm.type, amount: requestedAmount, duration: requestedDuration, interestRate: selectedProduct.interestRate, reason: loanForm.reason.trim(), selfGuarantee: loanForm.selfGuarantee, selfGuaranteedAmount: loanForm.selfGuarantee ? requestedAmount : undefined, guarantors: requiresGuarantors ? selectedGuarantors.map((member) => ({ memberId: member.memberId, amount: requestedAmount })) : undefined }, accessToken);
      const text = result?.loanDetails?.autoApproved ? "Emergency Loan Auto-Approved & Disbursed" : "Loan application submitted successfully";
      setMessage({ type: "success", text }); toast.success(text, { duration: 4000 });
      setLoanForm((current) => ({ ...current, reason: "" }));
      setSelectedGuarantors([]); setGuarantorQuery(""); setGuarantorResults([]); await onRefresh?.();
    } catch (error) { const text = error?.message || "Loan application failed"; setMessage({ type: "error", text }); toast.error(text, { duration: 4000 }); }
    finally { setBusyAction(""); }
  }

  async function submitRepayment(event, confirmed = false) {
    event.preventDefault();
    if (!Number.isInteger(repayValue) || repayValue <= 0 || repayValue > outstanding) { toast.error(!Number.isInteger(repayValue) || repayValue <= 0 ? "Enter a whole-shilling repayment amount greater than zero" : "Payment exceeds the total outstanding loan balance", { duration: 4000 }); return; }
    if (!/^(?:254|0)?7\d{8}$/.test(mpesaPhone.replace(/\s+/g, ""))) { toast.error("Enter a valid M-Pesa phone number", { duration: 4000 }); return; }
    if (!confirmed) {
      setConfirmation({
        type: "REPAY",
        amount: repayValue,
        charges: interestPortion,
        phone: (
          <span>
            {mpesaPhone}
            <span className="mt-1 block text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Member number: {stats.memberNumber || "Not assigned"}
            </span>
          </span>
        ),
        memberNumber: stats.memberNumber,
      });
      return;
    }
    try {
      setBusyAction("repay"); setConfirmation(null);
      const request = await initiateLoanRepaymentStk(selectedRepayLoanId, repayValue, mpesaPhone, accessToken);
      toast.success("STK Push Sent!", { description: "Check your phone and input your M-Pesa PIN. Waiting for confirmation...", duration: 4000 });
      let payment = null;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        payment = await getLoanPaymentStatus(request.checkoutRequestId, accessToken);
        if (["SUCCESS", "FAILED"].includes(String(payment.status).toUpperCase())) break;
      }
      if (String(payment?.status).toUpperCase() === "SUCCESS") {
        const text = `Payment Received! M-Pesa Ref: ${payment.mpesaReceiptNumber}`;
        setMessage({ type: "success", text }); toast.success(text, { duration: 4000 }); setRepayAmount(""); await onRefresh?.();
      } else if (String(payment?.status).toUpperCase() === "FAILED") {
        throw new Error("Transaction failed or cancelled on phone. Please try again.");
      } else {
        throw new Error("Payment confirmation is taking longer than expected. Check your transactions before retrying.");
      }
    }
    catch (error) { const text = error?.message || "Payment Failed"; setMessage({ type: "error", text }); toast.error(text, { duration: 4000 }); }
    finally { setBusyAction(""); }
  }

  const scrollToApplication = () => {
    if (!isLoanEligible) {
      setMessage({ type: "error", text: loanEligibilityMessage });
      return;
    }
    const el = document.getElementById("loan-product-select");
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setLoanValuesVisible((current) => !current)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label={loanValuesVisible ? "Hide loan values" : "Show loan values"}
        >
          {loanValuesVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          {loanValuesVisible ? "Hide loan values" : "Show loan values"}
        </button>
      </div>
      <LoanProducts stats={stats} />
      <EligibilityChecks stats={stats} />
      {!isLoanEligible ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="alert">
          {loanEligibilityMessage}
        </div>
      ) : null}
      <button onClick={scrollToApplication} disabled={!isLoanEligible || hasRestrictedLoan} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-4 text-sm font-semibold text-white ${isLoanEligible && !hasRestrictedLoan ? "bg-slate-950" : "cursor-not-allowed bg-slate-400"}`}><Plus size={18} />{hasRestrictedLoan ? "Loan application unavailable while a loan is active" : "New application"}</button>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={FileText} label="Active loans" value={activeLoans.length} trend="Live" helper="Approved or currently active facilities" tone="blue" />
        <StatCard icon={CreditCard} label="Outstanding balance" value={loanMoney(totalBalance)} helper="Estimated from loan records" tone="amber" blur={!loanValuesVisible} />
        <button type="button" onClick={() => setShowSchedule(true)} disabled={!nextLoan} className="w-full text-left disabled:cursor-default sm:col-span-2 xl:col-span-1"><StatCard icon={Clock3} label="Next loan due" value={nextLoan ? new Date(nextLoan.nextPaymentDueAt).toLocaleDateString() : "-"} helper={nextLoan ? `Amount: ${loanMoney(nextAmount)}` : "No scheduled repayment"} tone="slate" /></button>
      </div>
      {message ? (<div className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"}`}>{message.text}</div>) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <Surface className="p-4 sm:p-5">
          <h5 className="text-base font-semibold tracking-normal text-slate-950 dark:text-slate-100">Request a loan</h5>
          <form onSubmit={requestLoan} className="mt-4 grid gap-4">
            <fieldset disabled={!isLoanEligible || hasRestrictedLoan || busyAction === "borrow"} className="contents">
            <label className="text-sm font-semibold text-slate-700">Loan product
              <select id="loan-product-select" value={loanForm.type} onChange={(e) => { setLoanForm((c) => ({ ...c, type: e.target.value, selfGuarantee: false })); setSelectedGuarantors([]); setGuarantorQuery(""); setGuarantorResults([]); }} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm">{LOAN_PRODUCTS.map((p) => (<option key={p.type} value={p.type}>{p.name}</option>))}</select>
            </label>
            <Field label="Amount" name="amount" type="number" value={loanForm.amount} onChange={(e) => setLoanForm((c) => ({ ...c, amount: e.target.value }))} />
            <Field label="Duration (months)" name="duration" type="number" value={loanForm.duration} onChange={(e) => setLoanForm((c) => ({ ...c, duration: e.target.value }))} />
            <label className="text-sm font-semibold text-slate-700">Reason
              <textarea value={loanForm.reason} onChange={(e) => setLoanForm((c) => ({ ...c, reason: e.target.value }))} className="mt-2 min-h-24 w-full rounded-lg border px-3.5 py-3 text-sm" placeholder="Purpose of the loan" />
            </label>
            {selectedProduct.guarantors > 0 ? (
              <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <input
                  type="checkbox"
                  checked={loanForm.selfGuarantee}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setLoanForm((current) => ({ ...current, selfGuarantee: checked }));
                    if (checked) {
                      setSelectedGuarantors([]);
                      setGuarantorQuery("");
                      setGuarantorResults([]);
                    }
                  }}
                  className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-700"
                />
                <span>
                  <span className="block font-semibold">Self-guarantee with my savings</span>
                  <span className="mt-1 block text-xs text-emerald-800">Available savings: {loanMoney(savingsBalance)}. If covered, this skips guarantor selection and goes straight to Finance.</span>
                </span>
              </label>
            ) : null}
            {requiresGuarantors ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <div className="mb-3 flex items-center gap-2"><UsersRound size={16} className="text-sky-700" /><span className="text-sm font-semibold text-sky-900">Guarantor management</span><span className="rounded-full bg-sky-200 px-2 py-0.5 text-xs font-semibold text-sky-700">{selectedGuarantors.length} selected</span></div>
                <p className="mb-3 text-xs text-sky-700">Search active qualified SACCO members by name or member number. Each selected guarantor receives a 72-hour secure link and chooses the amount they accept.</p>
                <div className="relative mb-3">
                  <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                  <input value={guarantorQuery} onChange={(e) => setGuarantorQuery(e.target.value)} className="w-full rounded-lg border border-sky-200 bg-white py-3 pl-9 pr-3 text-sm" placeholder="Search member name or number" />
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {guarantorLoading ? (<p className="text-xs text-sky-700">Searching qualified members...</p>) : null}
                  {!guarantorLoading && guarantorQuery.trim().length >= 2 && guarantorResults.length === 0 ? (<p className="text-xs text-slate-500">No qualified members found.</p>) : null}
                  {guarantorResults.map((member) => {
                    const isSelected = selectedGuarantors.some((item) => item.memberId === member.memberId);
                    return (<div key={member.memberId} className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${isSelected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}><div className="flex items-center gap-3"><input type="checkbox" checked={isSelected} onChange={() => toggleGuarantor(member)} className="h-4 w-4 rounded border-slate-300 text-sky-600" /><div><p className="text-sm font-semibold text-slate-800">{member.name}</p><p className="text-xs text-slate-500">{member.memberNumber}</p></div></div><span className="text-xs font-semibold text-sky-700">{member.status}</span></div>);
                  })}
                </div>
                {selectedGuarantors.length > 0 && (<p className="mt-3 text-xs font-medium text-sky-700">Selected: {selectedMemberNames}</p>)}
              </div>
            ) : null}
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><FileText size={17} />{busyAction === "borrow" ? "Submitting..." : "Request loan"}</button>
            </fieldset>
          </form>
        </Surface>
        <Surface className="p-4 sm:p-5">
          <h5 className="text-base font-semibold text-slate-950 dark:text-slate-100">Repay a loan</h5>
          <form onSubmit={submitRepayment} className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Loan
              <select value={selectedRepayLoanId} onChange={(e) => setRepayLoanId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                {activeLoans.length === 0 ? (<option>No active loans</option>) : activeLoans.map((loan) => (<option key={loan.id} value={loan.id}>{loan.type} - {loanMoney(loanOutstandingBalance(loan))}</option>))}
              </select>
            </label>
            <Field label="Repayment amount" name="repayAmount" type="number" min="1" max={outstanding} value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
            <Field label="M-Pesa phone number" name="mpesaPhone" type="tel" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="07XX XXX XXX" />
            {repayValue > 0 ? <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"><div className="flex justify-between gap-3"><span>Interest portion</span><strong className="text-right">{loanMoney(interestPortion)}</strong></div><div className="mt-2 flex justify-between gap-3"><span>Principal portion</span><strong className="text-right">{loanMoney(principalPortion)}</strong></div><div className="mt-2 flex justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-700"><span>Remaining balance</span><strong className="text-right">{loanMoney(remainingAfterPayment)}</strong></div></div> : null}
            <button disabled={!selectedRepayLoanId || !Number.isInteger(repayValue) || repayValue <= 0 || repayValue > outstanding || !mpesaPhone || busyAction === "repay"} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"><CreditCard size={17} className="shrink-0" />{busyAction === "repay" ? "Waiting for M-Pesa confirmation..." : "Pay Now"}</button>
          </form>
        </Surface>
      </div>
      <LoanCalculator product={selectedProduct} amount={requestedAmount} duration={requestedDuration} totalInterest={totalInterest} monthlyRepayment={monthlyRepayment} />
      <LoansTable loans={rows} showValues={loanValuesVisible} />
      {confirmation ? <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div role="dialog" aria-modal="true" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><h3 className="text-lg font-semibold">Confirm {confirmation.type === "BORROW" ? "loan application" : "M-Pesa repayment"}</h3><div className="mt-4 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">{confirmation.type === "REPAY" ? <div className="flex justify-between gap-4"><span className="text-slate-500 dark:text-slate-400">Account</span><strong className="text-right">Your SACCO member number</strong></div> : null}<div className="flex justify-between gap-4"><span className="text-slate-500 dark:text-slate-400">Action</span><strong>{confirmation.type === "BORROW" ? "Borrow" : "Repay"}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-500 dark:text-slate-400">Total amount</span><strong className="text-right">{formatCurrency(confirmation.amount)}</strong></div>{confirmation.type === "REPAY" ? <div className="flex justify-between gap-4"><span className="text-slate-500 dark:text-slate-400">M-Pesa phone</span><strong className="text-right">{confirmation.phone}</strong></div> : <div className="flex justify-between gap-4"><span className="text-slate-500 dark:text-slate-400">Calculated interest</span><strong className="text-right">{formatCurrency(confirmation.charges)}</strong></div>}</div>{confirmation.type === "REPAY" ? <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">An M-Pesa prompt will be sent to your phone {confirmation.phone}Please verify the details and enter your M-Pesa PIN to complete the repayment.</p> : null}<div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setConfirmation(null)} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold dark:border-slate-600 dark:text-slate-200">Cancel</button><button type="button" onClick={(event) => confirmation.type === "BORROW" ? requestLoan(event, true) : submitRepayment(event, true)} className="min-h-11 rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white dark:bg-emerald-700">{confirmation.type === "REPAY" ? "Send PIN Prompt" : "Confirm & Proceed"}</button></div></div></div> : null}
      {showSchedule ? <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div role="dialog" aria-modal="true" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><div className="flex items-start justify-between gap-4"><h3 className="text-lg font-semibold">Active loan repayment schedule</h3><button onClick={() => setShowSchedule(false)} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-xl dark:border-slate-700">×</button></div><div className="mt-4 space-y-3">{scheduledLoans.map((loan) => <div key={loan.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-800/60"><div className="flex flex-col gap-1 font-semibold sm:flex-row sm:justify-between"><span>{loan.type}</span><span>{new Date(loan.nextPaymentDueAt).toLocaleDateString()}</span></div><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Due amount: {loanMoney(loanOutstandingBalance(loan) / Math.max(Number(loan.duration || 1), 1))} · Balance: {loanMoney(loanOutstandingBalance(loan))}</p></div>)}</div></div></div> : null}
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
          const eligible = Number(stats.shareCapital || 0) >= MIN_SHARE_CAPITAL;
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

function LoansTable({ loans, showValues = true }) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const loanMoney = (value) => showValues ? formatCurrency(value) : "KES ****";
  const formatLoanDuration = (loan) => {
    const duration = loan.duration || loan.loanDuration || loan.term;
    return duration ? `${duration} month${Number(duration) === 1 ? "" : "s"}` : "-";
  };
  const statusMap = {
    PENDING_GUARANTORS: "Pending Guarantors",
    UNDER_REVIEW: "Under Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    DISBURSED: "Disbursed",
    ACTIVE: "Disbursed",
  };
  const filteredLoans = loans.filter((loan) => {
    const status = String(loan.status || "").toUpperCase();
    const date = loan.createdAt ? new Date(loan.createdAt) : null;
    const statusMatches = statusFilter === "ALL" || status === statusFilter || (statusFilter === "DISBURSED" && status === "ACTIVE");
    const fromMatches = !dateFrom || (date && date >= new Date(`${dateFrom}T00:00:00`));
    const toMatches = !dateTo || (date && date <= new Date(`${dateTo}T23:59:59`));
    return statusMatches && fromMatches && toMatches;
  });
  return (
    <Surface className="overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h5 className="text-base font-semibold tracking-normal text-slate-950">
          My loan records
        </h5>
        <p className="text-sm text-slate-500">
          Requests, approvals, active balances, and repayments.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm">
              <option value="ALL">All statuses</option>
              <option value="PENDING_GUARANTORS">Pending Guarantors</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DISBURSED">Disbursed</option>
            </select>
          </label>
          <Field label="From" name="loanDateFrom" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Field label="To" name="loanDateTo" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      </div>
      {filteredLoans.length === 0 ? (
        <EmptyState
          className="text-[#8cc63f]"
          icon={FileText}
          title="No loans found"
          description="Loan requests and repayments will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[840px]">
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
                  Duration
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
              {filteredLoans.map((loan) => (
                <tr key={loan.id}>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                    {loan.type}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {loanMoney(loan.principal)}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {loanMoney(loanOutstandingBalance(loan))}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {formatLoanDuration(loan)}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {loan.selfGuaranteed ? "Self-guaranteed | " : ""}{statusMap[String(loan.status || "").toUpperCase()] || normalizeStatus(loan.status)}
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
  const [calculatorProductType, setCalculatorProductType] = useState(
    product.type,
  );
  const [loanAmount, setLoanAmount] = useState(
    String(Math.min(Math.max(amount || product.max / 2, 1000), product.max)),
  );
  const [repaymentMonths, setRepaymentMonths] = useState(
    Math.min(
      Math.max(duration || product.defaultRepaymentMonths || product.duration, 1),
      product.duration,
    ),
  );
  const selectedCalculatorProduct =
    LOAN_PRODUCTS.find((item) => item.type === calculatorProductType) ||
    LOAN_PRODUCTS[0];

  const clampLoanAmount = (value, maxAmount) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return "";
    }

    return String(Math.min(Math.max(numericValue, 1000), maxAmount));
  };

  useEffect(() => {
    setCalculatorProductType(product.type);
    setLoanAmount(String(Math.min(Math.max(amount || product.max / 2, 1000), product.max)));
    setRepaymentMonths(
      Math.min(
        Math.max(duration || product.defaultRepaymentMonths || product.duration, 1),
        product.duration,
      ),
    );
  }, [amount, duration, product]);

  useEffect(() => {
    setLoanAmount((currentAmount) =>
      clampLoanAmount(currentAmount, selectedCalculatorProduct.max),
    );
    setRepaymentMonths((currentMonths) =>
      Math.min(Math.max(currentMonths, 1), selectedCalculatorProduct.duration),
    );
  }, [selectedCalculatorProduct]);

  const loanSummary = useMemo(() => {
    const principal = Number(loanAmount) || 0;
    const months = Number(repaymentMonths) || 0;
    const rate = selectedCalculatorProduct.interestRate / 100;

    if (principal <= 0 || months <= 0) {
      return {
        monthlyPayment: 0,
        totalRepayment: 0,
        totalInterest: 0,
      };
    }

    const monthlyPayment =
      rate === 0
        ? principal / months
        : (principal * rate) / (1 - Math.pow(1 + rate, -months));
    const totalRepayment = monthlyPayment * months;
    const totalInterest = totalRepayment - principal;

    return {
      monthlyPayment,
      totalRepayment,
      totalInterest,
    };
  }, [loanAmount, repaymentMonths, selectedCalculatorProduct]);

  return (
    <Surface className="overflow-hidden border-[#8cc63f]/20 bg-linear-to-br from-white via-[#f8fff0] to-[#eef7e2]">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#8cc63f]/15 px-3 py-1 text-sm font-semibold text-[#8cc63f]">
            <Calculator size={17} />
            Loan calculator
          </div>
          <h5 className="text-2xl font-semibold tracking-normal text-slate-950">
            Estimate your monthly repayment
          </h5>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Pick a product, set your amount, and adjust the repayment period to
            see an estimated monthly installment based on the listed monthly
            interest rate.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Loan product
              <select
                value={calculatorProductType}
                onChange={(event) =>
                  setCalculatorProductType(event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#8cc63f]"
              >
                {LOAN_PRODUCTS.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Loan amount
              <input
                type="text"
                inputMode="numeric"
                value={loanAmount}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  if (/^\d*$/.test(nextValue)) {
                    setLoanAmount(nextValue);
                  }
                }}
                onBlur={() =>
                  setLoanAmount((currentAmount) =>
                    clampLoanAmount(currentAmount, selectedCalculatorProduct.max),
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#8cc63f]"
              />
              <span className="mt-2 block text-xs font-medium text-slate-500">
                Maximum for this product:{" "}
                {formatCurrency(selectedCalculatorProduct.max, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </label>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700">
                Repayment period
              </span>
              <span className="rounded-full bg-[#8cc63f]/15 px-3 py-1 text-sm font-semibold text-[#8cc63f]">
                {repaymentMonths} months
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={selectedCalculatorProduct.duration}
              step="1"
              value={repaymentMonths}
              onChange={(event) =>
                setRepaymentMonths(Number(event.target.value))
              }
              className="w-full accent-[#8cc63f]"
            />
            <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
              <span>1 month</span>
              <span>{selectedCalculatorProduct.duration} months</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/80 bg-white/85 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Estimated repayment summary
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            {formatCurrency(loanSummary.monthlyPayment, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
            <span className="ml-2 text-base font-medium text-slate-500">
              / month
            </span>
          </p>

          <div className="mt-5 grid gap-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">
                Total repayment
              </span>
              <strong className="text-sm text-slate-950">
                {formatCurrency(loanSummary.totalRepayment, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">
                Total interest
              </span>
              <strong className="text-sm text-slate-950">
                {formatCurrency(loanSummary.totalInterest, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">
                Monthly interest rate
              </span>
              <strong className="text-sm text-slate-950">
                {selectedCalculatorProduct.interestRate.toFixed(1)}%
              </strong>
            </div>
          </div>

          <p className="mt-5 text-xs leading-6 text-slate-500">
            This is an estimate for planning purposes and may vary from final
            approved loan terms, fees, or SACCO review outcomes.
          </p>
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
      <div className="p-5" style={{display:'none'}}>
        <div className="flex items-center justify-between gap-4">
          <div style={{display:'none'}}>
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
          <div className="text-right" style={{display:'none'}}>
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
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Portfolio" title="SACCO portfolio" />
      <Surface className="p-8">
        <EmptyState
          icon={Landmark}
          title="Audited portfolio data is not available"
          description="Portfolio allocations, performance, and dividend projections will appear once they are supplied by the SACCO ledger. No illustrative values are shown."
        />
      </Surface>
    </div>
  );
  // Legacy illustrative layout is retained temporarily for a future ledger-backed rewrite.
  // eslint-disable-next-line no-unreachable
  {
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
  const [loanReportTab, setLoanReportTab] = useState("loans");
  const [duration, setDuration] = useState("all");
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);
  const [tabSending, setTabSending] = useState(null);
  const [showOnScreen, setShowOnScreen] = useState(false);
  const { transactions = [], loans = [], shares = [], stats: reportStats } = data;
  const user = data.user || data.profile || {};
  const showPayrollReports = hasStaffId(user);
  const successfulTransactions = transactions.filter((transaction) => ["SUCCESS", "PAID", "COMPLETED"].includes(String(transaction.status || "").toUpperCase()));

  const filterByDuration = (items, df = "createdAt") => {
    if (duration === "all") return items;
    const now = new Date(); const ago = new Date(); ago.setMonth(now.getMonth() - Number(duration));
    return items.filter(i => { const d = i[df] || i.date; return d ? new Date(d) >= ago : true; });
  };
  const ft = filterByDuration(successfulTransactions); const fl = filterByDuration(loans); const fs = filterByDuration(shares, "createdAt");
  const lbl = (tx) => { const l = getTransactionPromptLabel(tx).toLowerCase(); return l; };
  const fw = ft.filter(t => lbl(t).includes("withdraw")||lbl(t).includes("payout")||lbl(t).includes("disburse"));
  const fr = ft.filter(t => lbl(t).includes("repay")||lbl(t).includes("loan")||lbl(t).includes("credit"));
  const fd = ft.filter(t => lbl(t).includes("dividend"));
  const fpd = showPayrollReports ? ft.filter(t => lbl(t).includes("payroll")||lbl(t).includes("deduction")||lbl(t).includes("salary")) : [];
  const dateTime = (value) => value ? new Date(value).toLocaleString() : "-";
  const loanAmount = (loan) => Number(loan.amount || loan.principal || loan.requestedAmount || 0);
  const loanInterest = (loan) => {
    const savedInterest = Number(loan.interestToBePaid || loan.totalInterest || loan.interestAmount || 0);
    if (savedInterest) return savedInterest;
    const rate = Number(loan.interestRate || loan.interest || 0);
    const durationValue = Number(loan.duration || loan.term || loan.loanDuration || 1);
    return loanAmount(loan) && rate ? (loanAmount(loan) * rate * durationValue) / 100 : 0;
  };
  const loanGuarantors = (loan) => Array.isArray(loan.guarantors) ? loan.guarantors : Array.isArray(loan.Guarantors) ? loan.Guarantors : [];
  const guarantorDisplayName = (guarantor) => guarantor.Member?.User?.name || guarantor.Member?.User?.fullName || guarantor.Member?.name || guarantor.Member?.fullName || guarantor.User?.name || guarantor.User?.fullName || guarantor.name || guarantor.guarantorName || guarantor.memberName || guarantor.fullName || guarantor.memberNumber || guarantor.Member?.memberNumber || "Guarantor";
  const formatKenyanPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("254")) return `+${digits.slice(-12)}`;
    if (digits.length >= 10 && digits.startsWith("0")) return `+254${digits.slice(-9)}`;
    if (digits.length >= 9) return `+254${digits.slice(-9)}`;
    return "";
  };
  const transactionPhone = (transaction) => {
    return formatKenyanPhone(transaction.phoneNumber || transaction.phone || transaction.msisdn || transaction.customerPhone || transaction.memberPhone || transaction.sourcePhone || transaction.senderPhone || transaction.User?.phone || transaction.Member?.User?.phone) || "-";
  };
  const transactionCategory = (transaction) => {
    const label = getTransactionPromptLabel(transaction).toLowerCase();
    if (label.includes("loan")) return "Loan repayment";
    if (label.includes("share")) return "Share capital";
    if (label.includes("saving") || label.includes("monthly")) return "Savings";
    if (label.includes("withdraw")) return "Withdrawal";
    if (label.includes("deposit")) return "Deposit";
    return getTransactionPromptLabel(transaction);
  };
  const transactionDetails = (transaction) => {
    const label = getTransactionPromptLabel(transaction).toLowerCase();
    if (label.includes("withdraw")) return `Withdrawn from ${transaction.sourceAccount || transaction.accountName || transaction.walletName || "member account"}`;
    return `Deposited to ${transaction.destinationAccount || transaction.accountName || transaction.walletName || transactionCategory(transaction).toLowerCase()}`;
  };
  const loanGuarantorLabel = (loan) => {
    if (loan.selfGuaranteed) return "Self-guaranteed";
    const guarantors = loanGuarantors(loan);
    if (!guarantors.length) return "-";
    return guarantors.map(guarantorDisplayName).join(", ");
  };
  const guarantorRows = fl.flatMap((loan) => {
    const guarantors = loanGuarantors(loan);
    return guarantors.map((guarantor) => {
      const guaranteedAmount = Number(guarantor.guaranteedAmount || guarantor.amount || guarantor.liabilityAmount || 0);
      return {
        "Guarantor Name": guarantorDisplayName(guarantor),
        "Guaranteed Amount": formatCurrency(guaranteedAmount),
        Status: normalizeStatus(guarantor.status || loan.status || "Active"),
        "Guaranteed Loan Type": loan.type || loan.loanType || "Loan",
        _amount: guaranteedAmount,
      };
    });
  });

  const reportData = {
    transactions: { title: "Transaction Statement", headers: ["Date","Phone Number","Details","Reference","Amount"], rows: ft.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-","Phone Number":transactionPhone(t),Details:transactionDetails(t),Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0))})),summary:{"Share capital":formatCurrency(ft.filter(t=>transactionCategory(t)==="Share capital").reduce((s,t)=>s+Number(t.amount||0),0)),"Savings":formatCurrency(ft.filter(t=>transactionCategory(t)==="Savings").reduce((s,t)=>s+Number(t.amount||0),0))} },
    savings: { title: "Share Capital Report", headers: ["Date","Record","Amount","Status"], rows: fs.map(s=>({Date:s.createdAt?new Date(s.createdAt).toLocaleDateString():"-",Record:s.type||"Share",Amount:formatCurrency(Number(s.totalInvested||s.amount||0)),Status:normalizeStatus(s.status||"Active")})),summary:{"Share Capital":formatCurrency(reportStats?.shareCapital||fs.reduce((s,sh)=>s+Number(sh.totalInvested||0),0)),Count:fs.length} },
    dividend: { title: "Dividend Report", headers: ["Date","Reference","Amount","Status"], rows: fd.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-",Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Status:normalizeStatus(t.status||"Completed")})),summary:{"Total Dividends":formatCurrency(fd.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fd.length} },
    ...(showPayrollReports ? { "payroll-deduction": { title: "Payroll Deduction Report", headers: ["Date","Reference","Amount","Status"], rows: fpd.map(t=>({Date:t.createdAt||t.date?new Date(t.createdAt||t.date).toLocaleDateString():"-",Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Status:normalizeStatus(t.status||"Completed")})),summary:{"Total Deducted":formatCurrency(fpd.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fpd.length} } } : {}),
  };
  const loanReportData = {
    loans: { title: "Loans", headers: ["Date & Time","Type","Amount","Guarantor","Status","Loan Duration","Interest to be Paid","Reason"], rows: fl.map(l=>({"Date & Time":dateTime(l.createdAt||l.date),Type:l.type||l.loanType||"Loan",Amount:formatCurrency(loanAmount(l)),Guarantor:loanGuarantorLabel(l),Status:normalizeStatus(l.status||"Pending"),"Loan Duration":l.duration||l.loanDuration||l.term?`${l.duration||l.loanDuration||l.term} month${Number(l.duration||l.loanDuration||l.term)===1?"":"s"}`:"-","Interest to be Paid":formatCurrency(loanInterest(l)),Reason:l.reason||"-"})),summary:{"Active Balance":formatCurrency(fl.reduce((s,l)=>s+Number(l.balance||l.outstandingBalance||l.principal||l.amount||0),0)),Count:fl.length} },
    "loan-repayment": { title: "Loan Repayment", headers: ["Date","Amount","Balance","Duration Remaining","Interest","Reference"], rows: fr.map(t=>({Date:dateTime(t.createdAt||t.date),Amount:formatCurrency(Number(t.amount||0)),Balance:formatCurrency(Number(t.balance||t.outstandingBalance||t.remainingBalance||0)),"Duration Remaining":t.durationRemaining||t.remainingDuration||"-",Interest:formatCurrency(Number(t.interest||t.interestAmount||0)),Reference:t.mpesaReference||t.reference||t.id||"-"})),summary:{"Total Repaid":formatCurrency(fr.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fr.length} },
    guarantor: { title: "Guarantor", headers: ["Guarantor Name","Guaranteed Amount","Status","Guaranteed Loan Type"], rows: guarantorRows, summary:{"Guaranteed Amount":formatCurrency(guarantorRows.reduce((s,row)=>s+Number(row._amount||0),0)),Count:guarantorRows.length} },
    withdrawals: { title: "Withdrawals", headers: ["Date & Time","Destination Device","Reference","Amount","Type"], rows: fw.map(t=>({"Date & Time":dateTime(t.createdAt||t.date),"Destination Device":t.destinationDevice||t.phoneNumber||t.msisdn||"-",Reference:t.mpesaReference||t.reference||t.id||"-",Amount:formatCurrency(Number(t.amount||0)),Type:getTransactionPromptLabel(t)})),summary:{"Total Withdrawn":formatCurrency(fw.reduce((s,t)=>s+Number(t.amount||0),0)),Count:fw.length} },
  };
  const loanTabs = [
    { key: "loans", label: "Loans", reportType: "loans" },
    { key: "loan-repayment", label: "Loan Repayment", reportType: "loan-repayment" },
    { key: "guarantor", label: "Guarantor", reportType: "guarantor" },
    { key: "withdrawals", label: "Withdrawals", reportType: "withdrawals" },
  ];
  const cr = reportType === "loans" ? loanReportData[loanReportTab] : (reportData[reportType] || reportData.transactions);

  async function sendReport(type, label, setBusy) {
    setBusy(true); setMessage(null);
    try { await emailMemberReport(type, accessToken, duration==="all"?undefined:Number(duration)); setMessage({ type: "success", text: `${label} sent to your email as a PDF.` }); }
    catch (err) { setMessage({ type: "error", text: err?.message || "Failed to send report." }); }
    finally { setBusy(false); }
  }

  async function requestReport(e) { e.preventDefault(); await sendReport(reportType, reportType==="loans"?"Full loans report":"Report", setSending); }

  return (<div className="space-y-6">
    <SectionHeader eyebrow="Reports" title="Generate & view reports" description="Select a report type and duration filter. Data renders instantly on screen." />
    <Surface className="p-5">
      {message&&<div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</div>}
      <form onSubmit={requestReport} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,200px)_auto_auto] md:items-end">
        <label className="text-sm font-semibold text-slate-700">Report type<select value={reportType} onChange={e=>{setReportType(e.target.value);setShowOnScreen(true);}} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm"><option value="transactions">Transaction statement</option><option value="loans">Loans report</option><option value="savings">Savings & share capital</option>{showPayrollReports ? <option value="payroll-deduction">Payroll deduction report</option> : null}</select></label>
        <label className="text-sm font-semibold text-slate-700">Duration<select value={duration} onChange={e=>{setDuration(e.target.value);setShowOnScreen(true);}} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm"><option value="all">All time</option><option value="1">Last month</option><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select></label>
        <button type="button" onClick={()=>setShowOnScreen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800"><Eye size={17}/>View on screen</button>
        <button disabled={sending} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><MailCheck size={17}/>{sending?"Sending...":"Email report"}</button>
      </form>
    </Surface>
    {showOnScreen?<Surface className="overflow-hidden"><div className="border-b p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-base font-semibold">{cr.title}</h4><p className="mt-1 text-sm text-slate-500">{duration==="all"?"All records":`Last ${duration} month${Number(duration)>1?"s":""}`} · {cr.rows.length} row{cr.rows.length!==1?"s":""}</p></div><div className="flex flex-wrap gap-3">{Object.entries(cr.summary).map(([l,v])=>(<div key={l} className="rounded-lg bg-slate-50 px-4 py-2"><p className="text-xs font-semibold text-slate-500">{l}</p><p className="text-sm font-semibold">{v}</p></div>))}</div></div>{reportType==="loans"?<div className="mt-5 flex flex-wrap items-center gap-2">{loanTabs.map(tab=>(<button key={tab.key} type="button" onClick={()=>setLoanReportTab(tab.key)} className={`inline-flex min-h-10 items-center rounded-lg border px-4 py-2 text-sm font-semibold transition ${loanReportTab===tab.key?"border-slate-950 bg-slate-950 text-white":"border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{tab.label}</button>))}<button type="button" disabled={tabSending===loanReportTab} onClick={()=>{const tab=loanTabs.find(item=>item.key===loanReportTab);sendReport(tab.reportType, `${tab.label} report`, (busy)=>setTabSending(busy?loanReportTab:null));}} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-60"><Download size={16}/>{tabSending===loanReportTab?"Sending...":"Email tab PDF"}</button></div>:null}</div><div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-slate-50">{cr.headers.map((h,index)=>(<th key={h} className={`${index===0?"pl-12 pr-5":"px-5"} py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500`}>{h}</th>))}</tr></thead><tbody className="divide-y divide-slate-100">{cr.rows.length===0?<tr><td colSpan={cr.headers.length} className="px-5 py-12 text-center text-sm text-slate-500">No records found.</td></tr>:cr.rows.map((row,i)=>(<tr key={i} className="bg-white transition hover:bg-slate-50">{cr.headers.map((h,index)=>(<td key={h} className={`${index===0?"pl-12 pr-5":"px-5"} py-4 text-sm text-slate-700`}>{row[h]||"-"}</td>))}</tr>))}</tbody></table></div></Surface>:<Surface className="p-8"><EmptyState icon={FileText} title="Generate a report" description="Select report type and duration above, then click 'View on screen'." /></Surface>}
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

  const displayBalance = (value) =>
    showValues ? value : <span className="inline-block blur-sm">{value}</span>;

  return (
    <SimplePage icon={PiggyBank}>
      {message ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {message.text}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Surface className="group p-5 hover:-translate-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-gray-100/30 transition duration-200 group-hover:scale-110">
                <PiggyBank size={21} className="text-[#8cc63f]/90 font-light" />
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleValues}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {showValues ? (
                <EyeOff className="text-[#8cc63f]" size={14} />
              ) : (
                <Eye className="text-[#8cc63f]" size={14} />
              )}
              {showValues ? "Hide" : "Show"}
            </button>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500">Savings balance</p>
          <p className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            {displayBalance(formatCurrency(stats.totalSavings))}
          </p>
        </Surface>
        <Surface className="group p-5 hover:-translate-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-gray-100/30 transition duration-200 group-hover:scale-110">
                <WalletCards size={21} className="text-[#8cc63f]/90 font-light" />
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400">Share capital</span>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500">Share capital</p>
          <p className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            {displayBalance(formatCurrency(stats.shareCapital))}
          </p>
        </Surface>
      </div>
      <SavingsContributionForm
        accessToken={accessToken}
        user={user}
        onRefresh={onRefresh}
        onMessage={setMessage}
        loanEligible={Number(stats.shareCapital || 0) >= MIN_SHARE_CAPITAL}
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

function OptOutSection({ accessToken, user, shareCapitalAmount = 0, stats = {}, onRefresh }) {
  const [form, setForm] = useState({
    reason: "",
    transfereeInfo: "",
    transferRecipientName: "",
    transferRecipientMemberNumber: "",
    transferRecipientPhone: "",
    transferAmount: "",
    confirm: "",
  });
  const [signedForm, setSignedForm] = useState(null);
  const [selectedTransferee, setSelectedTransferee] = useState(null);
  const [transfereeMatches, setTransfereeMatches] = useState([]);
  const [lookupStatus, setLookupStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [step, setStep] = useState("initial"); // initial | details | final | success
  const [optOutResult, setOptOutResult] = useState(null);
  // The API is the source of truth for loan and guarantor eligibility.
  const canOptOut = true;
  const memberNumber = user?.memberNumber || user?.membershipNumber || user?.memberId || "Auto";
  const exitShareCapital = Number(stats.shareCapital ?? shareCapitalAmount ?? user?.shareCapital ?? 0);
  const exitSavings = Number(stats.totalSavings ?? stats.savings ?? user?.savings ?? 0);
  const exitLoans = Number(stats.loanBalance ?? user?.loans ?? 0);
  const exitDividendsInterest = Number(stats.dividends ?? stats.dividend ?? stats.interest ?? user?.interest ?? 0);
  const exitEmployerContribution = hasStaffId(user) ? Number(stats.employerContribution || user?.employerContribution || user?.Member?.employerContribution || 0) : 0;
  const refundAmount = exitSavings + exitDividendsInterest + exitEmployerContribution;
  const saccoAdminFee = exitShareCapital * 0.05;
  const transferableShareCapital = Math.max(exitShareCapital - saccoAdminFee, 0);
  const memberName = user?.name || user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";
  const transferAmount = Number(form.transferAmount || 0);
  const transferSummary = form.transfereeInfo || [
    form.transferRecipientName ? `Full name: ${form.transferRecipientName}` : "",
    form.transferRecipientMemberNumber ? `Member ID: ${form.transferRecipientMemberNumber}` : "",
    form.transferRecipientPhone ? `Phone number: ${form.transferRecipientPhone}` : "",
    transferAmount > 0 ? `Share capital sale amount: ${formatCurrency(transferAmount)}` : "",
  ].filter(Boolean).join("; ");

  useEffect(() => {
    if (step !== "details") return undefined;
    const query = form.transferRecipientMemberNumber.trim() || form.transferRecipientName.trim();
    if (query.length < 2) {
      setTransfereeMatches([]);
      setLookupStatus("");
      return undefined;
    }
    let cancelled = false;
    setLookupStatus("Searching...");
    const id = setTimeout(async () => {
      try {
        const matches = await searchOptOutTransferees(query, accessToken);
        if (cancelled) return;
        setTransfereeMatches(matches);
        setLookupStatus(matches.length ? `${matches.length} match${matches.length === 1 ? "" : "es"} found` : "No matching member found");
        const exact = matches.find((member) => (
          String(member.memberNumber || "").toLowerCase() === query.toLowerCase()
          || String(member.fullName || "").toLowerCase() === query.toLowerCase()
        ));
        if (exact) applyTransferee(exact);
      } catch (error) {
        if (!cancelled) {
          setTransfereeMatches([]);
          setLookupStatus(error?.message || "Unable to search members");
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [accessToken, form.transferRecipientMemberNumber, form.transferRecipientName, step]);

  function applyTransferee(member) {
    if (!member) return;
    setSelectedTransferee(member);
    setForm((current) => ({
      ...current,
      transferRecipientName: member.fullName || current.transferRecipientName,
      transferRecipientMemberNumber: member.memberNumber || current.transferRecipientMemberNumber,
      transferRecipientPhone: member.phone || current.transferRecipientPhone,
    }));
    setTransfereeMatches([]);
    setLookupStatus("Recipient details filled from member records.");
  }

  function downloadOptOutForm() {
    if (!form.reason.trim()) {
      setMsg({ type: "error", text: "Enter your reason for leaving before downloading the form." });
      return;
    }
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const executionDate = new Date().toLocaleDateString();
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>SACCO Exit Form - ${esc(memberNumber)}</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#111827}.brand{display:flex;align-items:center;gap:14px;border-bottom:3px solid #8cc63f;padding-bottom:12px}img{height:44px;width:auto}h1{font-size:20px;margin:0}h2{font-size:14px;margin:22px 0 0;color:#14532d}table{border-collapse:collapse;width:100%;margin-top:10px}td{border:1px solid #b7dca2;padding:9px;vertical-align:top}.label{font-weight:bold;background:#eaf7df;width:34%}.title{background:#d9f0c9;font-weight:bold;text-transform:uppercase;color:#14532d}.sign{height:64px}.muted{color:#64748b;font-size:12px}</style></head><body><div class="brand"><img src="${ayedosLogo}" alt="AYEDOS SACCO Logo"><div><h1>SACCO Exit Form</h1><p class="muted">Prefilled from the member portal. Save this print view as PDF, sign, and upload the signed copy before confirming.</p></div></div><h2>Transferor Details</h2><table><tr><td class="title" colspan="2">Member Identity</td></tr><tr><td class="label">Full Name</td><td>${esc(memberName)}</td></tr><tr><td class="label">Member ID Number</td><td>${esc(memberNumber)}</td></tr><tr><td class="label">Phone Number</td><td>${esc(user?.phone)}</td></tr><tr><td class="title" colspan="2">System Balances</td></tr><tr><td class="label">Share Capital</td><td>${esc(formatCurrency(exitShareCapital))}</td></tr><tr><td class="label">Total Savings</td><td>${esc(formatCurrency(exitSavings))}</td></tr><tr><td class="label">Active Loan Balance</td><td>${esc(formatCurrency(exitLoans))}</td></tr><tr><td class="label">Dividends / Interest</td><td>${esc(formatCurrency(exitDividendsInterest))}</td></tr><tr><td class="label">Employer Contributions</td><td>${esc(hasStaffId(user) ? formatCurrency(exitEmployerContribution) : "Not applicable")}</td></tr><tr><td class="label">Refund Amount</td><td>${esc(formatCurrency(refundAmount))}</td></tr></table><h2>Transferee Details</h2><table><tr><td class="title" colspan="2">Recipient Information</td></tr><tr><td class="label">Full Name</td><td>${esc(form.transferRecipientName || "Skipped for now")}</td></tr><tr><td class="label">Member ID</td><td>${esc(form.transferRecipientMemberNumber || "Skipped for now")}</td></tr><tr><td class="label">Phone Number</td><td>${esc(form.transferRecipientPhone || "Skipped for now")}</td></tr><tr><td class="label">Share Capital</td><td>${esc(formatCurrency(selectedTransferee?.shareCapital || 0))}</td></tr><tr><td class="label">Savings</td><td>${esc(formatCurrency(selectedTransferee?.savings || 0))}</td></tr><tr><td class="label">Loan Balance</td><td>${esc(formatCurrency(selectedTransferee?.loanBalance || 0))}</td></tr></table><h2>Transaction Metadata</h2><table><tr><td class="title" colspan="2">Share Capital Transfer</td></tr><tr><td class="label">Transfer Amount</td><td>${esc(transferAmount > 0 ? formatCurrency(transferAmount) : "Skipped for now")}</td></tr><tr><td class="label">SACCO Administration Fee (5%)</td><td>${esc(formatCurrency(saccoAdminFee))}</td></tr><tr><td class="label">Transferable Share Capital</td><td>${esc(formatCurrency(transferableShareCapital))}</td></tr><tr><td class="label">Execution Date</td><td>${esc(executionDate)}</td></tr><tr><td class="label">Reason for Exit</td><td>${esc(form.reason)}</td></tr><tr><td class="label">Member Signature</td><td class="sign"></td></tr><tr><td class="label">Date Signed</td><td class="sign"></td></tr></table><script>window.addEventListener("load",()=>window.print())</script></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  function handleSignedForm(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignedForm({ name: file.name, dataUrl: String(reader.result || "") });
    reader.onerror = () => setMsg({ type: "error", text: "Unable to read the uploaded signed form." });
    reader.readAsDataURL(file);
  }

  async function handleOptOut(e) {
    e.preventDefault();
    if (!form.reason.trim()) { setMsg({ type: "error", text: "Reason for leaving is required." }); return; }
    if (!signedForm?.dataUrl) { setMsg({ type: "error", text: "Upload the signed opt-out form before confirming." }); return; }
    if (form.confirm.trim().toUpperCase() !== "CONFIRM") { setMsg({ type: "error", text: 'Type "CONFIRM" to proceed.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const result = await requestMemberOptOut({
        reason: form.reason,
        transfereeInfo: transferSummary,
        transfereeMemberId: selectedTransferee?.memberId,
        transferAmount: transferAmount > 0 ? transferAmount : undefined,
        uploadedFormName: signedForm.name,
        uploadedFormDataUrl: signedForm.dataUrl,
        confirmText: form.confirm,
        acknowledgedTerms: true,
      }, accessToken);
      setOptOutResult(result);
      setStep("success");
    }
    catch (err) { setMsg({ type: "error", text: err?.message || "Failed to submit." }); }
    finally { setSaving(false); }
  }

  function advanceToFinal(skipTransfer = false) {
    if (!form.reason.trim()) {
      setMsg({ type: "error", text: "Reason for leaving is required." });
      return;
    }
    if (!skipTransfer) {
      if (!form.transferRecipientName.trim() && !form.transferRecipientMemberNumber.trim() && !form.transferRecipientPhone.trim()) {
        setMsg({ type: "error", text: "Enter recipient information or choose Skip Now." });
        return;
      }
      if (!transferAmount || transferAmount <= 0) {
        setMsg({ type: "error", text: "Enter the share capital amount to be sold or choose Skip Now." });
        return;
      }
      if (transferAmount > exitShareCapital) {
        setMsg({ type: "error", text: `Amount cannot exceed available share capital (${formatCurrency(exitShareCapital)}).` });
        return;
      }
    }
    setMsg(null);
    setStep("final");
    if (skipTransfer) {
      setSelectedTransferee(null);
      setForm((current) => ({
        ...current,
        transfereeInfo: "",
        transferRecipientName: "",
        transferRecipientMemberNumber: "",
        transferRecipientPhone: "",
        transferAmount: "",
      }));
    } else {
      setForm((current) => ({ ...current, transfereeInfo: transferSummary }));
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className={step === "details" || step === "final" ? "rounded-lg border border-rose-300 bg-rose-50/60 p-6" : "rounded-lg border border-slate-200 bg-slate-50/60 p-6"}>
          <div className="mb-4 flex items-center gap-3">
            <div className={step === "details" || step === "final" ? "grid h-10 w-10 place-items-center rounded-lg bg-rose-100" : "grid h-10 w-10 place-items-center rounded-lg bg-slate-200"}>
              <LogOut size={20} className={step === "details" || step === "final" ? "text-rose-600" : "text-slate-400"} />
            </div>
            <div>
              <h5 className={step === "details" || step === "final" ? "text-base font-semibold text-rose-900" : "text-base font-medium text-slate-500"}>
                Opt-Out of SACCO
              </h5>
              <p className={step === "details" || step === "final" ? "text-sm text-rose-700" : "text-xs text-slate-400"}>
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
              onClick={() => setStep("details")}
              className="text-xs font-medium text-slate-400 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-600 hover:decoration-slate-500"
            >
              Request membership cancellation
            </button>
          ) : step === "details" ? (
            <div className="space-y-5">
              {msg && <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200":"border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"}`}>{msg.text}</div>}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-rose-700 dark:text-rose-200">Step 1</p>
                <h5 className="text-base font-semibold text-slate-950 dark:text-white">Exit details & share capital transfer</h5>
              </div>
              <div className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 md:grid-cols-3">
                <span><strong>Refund amount:</strong> {formatCurrency(refundAmount)}</span>
                <span><strong>SACCO fee:</strong> {formatCurrency(saccoAdminFee)}</span>
                <span><strong>Transferable share capital:</strong> {formatCurrency(transferableShareCapital)}</span>
                <span className="md:col-span-3 text-xs text-emerald-800">Refund = total savings + dividends / interest</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-rose-900 dark:text-rose-200">Reason for leaving<textarea value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} rows={4} className="mt-1 w-full rounded-lg border border-rose-200 px-3.5 py-3 text-sm dark:border-rose-800" placeholder="Explain why you wish to leave the SACCO..." required /></label>
                <div className="rounded-lg border border-rose-200 bg-white p-4 dark:border-rose-800 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">Transfer of Share Capital / Recipient Information <span className="font-normal text-slate-400">(optional)</span></p>
                  <div className="relative mt-3 grid gap-3">
                    <input value={form.transferRecipientName} onChange={e=>{setSelectedTransferee(null);setForm(f=>({...f,transferRecipientName:e.target.value}))}} className="w-full rounded-lg border border-rose-200 px-3.5 py-3 text-sm dark:border-rose-800" placeholder="Recipient full name" />
                    <input value={form.transferRecipientMemberNumber} onChange={e=>{setSelectedTransferee(null);setForm(f=>({...f,transferRecipientMemberNumber:e.target.value}))}} className="w-full rounded-lg border border-rose-200 px-3.5 py-3 text-sm dark:border-rose-800" placeholder="Recipient member ID" />
                    <input value={form.transferRecipientPhone} onChange={e=>setForm(f=>({...f,transferRecipientPhone:e.target.value}))} className="w-full rounded-lg border border-rose-200 px-3.5 py-3 text-sm dark:border-rose-800" placeholder="Recipient phone number" />
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Amount of share capital to be sold<input type="number" min="1" max={exitShareCapital || undefined} step="0.01" value={form.transferAmount} onChange={e=>setForm(f=>({...f,transferAmount:e.target.value}))} className="mt-1 w-full rounded-lg border border-rose-200 px-3.5 py-3 text-sm normal-case tracking-normal text-slate-900 dark:border-rose-800" placeholder={`Max ${formatCurrency(exitShareCapital)}`} /></label>
                    {lookupStatus ? <p className="text-xs font-medium text-slate-500">{lookupStatus}</p> : null}
                    {transfereeMatches.length ? (
                      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        {transfereeMatches.map((member) => (
                          <button key={member.memberId} type="button" onClick={() => applyTransferee(member)} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                            <span><strong>{member.fullName}</strong><span className="block text-xs text-slate-500">{member.memberNumber} • {member.phone || "No phone"}</span></span>
                            <span className="text-xs text-slate-500">{formatCurrency(member.shareCapital)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {selectedTransferee ? (
                      <div className="grid gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900 md:grid-cols-3">
                        <span><strong>Recipient shares:</strong> {formatCurrency(selectedTransferee.shareCapital)}</span>
                        <span><strong>Savings:</strong> {formatCurrency(selectedTransferee.savings)}</span>
                        <span><strong>Loan:</strong> {formatCurrency(selectedTransferee.loanBalance)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => advanceToFinal(false)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"><CheckCircle2 size={16} />Confirm Transfer</button>
                <button type="button" onClick={() => advanceToFinal(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><ArrowRight size={16} />Skip Now</button>
                <button type="button" onClick={()=>{setStep("initial");setMsg(null);}} className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Cancel</button>
              </div>
            </div>
          ) : step === "final" ? (
            <div className="space-y-5">
              {msg && <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200":"border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"}`}>{msg.text}</div>}
              <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-700 dark:text-rose-200">Step 2</p>
                <h5 className="font-semibold text-slate-950 dark:text-white">Completed opt-out form</h5>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Download the prefilled form, sign it, then upload the signed copy before final confirmation.</p>
                <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200 md:grid-cols-3">
                  <span><strong>Member:</strong> {memberNumber}</span>
                  <span><strong>Share capital:</strong> {formatCurrency(exitShareCapital)}</span>
                  <span><strong>Savings:</strong> {formatCurrency(exitSavings)}</span>
                  <span><strong>Loan:</strong> {formatCurrency(exitLoans)}</span>
                  <span><strong>Refund:</strong> {formatCurrency(refundAmount)}</span>
                  <span><strong>Transferable shares:</strong> {formatCurrency(transferableShareCapital)}</span>
                  <span className="md:col-span-3"><strong>Reason:</strong> {form.reason}</span>
                  <span className="md:col-span-3"><strong>Transfer:</strong> {transferSummary || "Skipped for now"}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={downloadOptOutForm} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><Download size={16} />Download PDF</button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><FileText size={16} />Upload signed form<input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e)=>handleSignedForm(e.target.files?.[0])} className="sr-only" /></label>
                  {signedForm?.name ? <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{signedForm.name}</span> : null}
                </div>
              </div>
              <form onSubmit={handleOptOut} className="space-y-4">
                <label className="block text-sm font-semibold text-rose-900 dark:text-rose-200">Type CONFIRM to proceed<input value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} className="mt-1 w-full rounded-lg border border-rose-200 px-3.5 py-3 text-sm dark:border-rose-800" placeholder='Type "CONFIRM" to verify'/></label>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    {saving?<RefreshCw className="animate-spin" size={17}/>:<LogOut size={17}/>}
                    {saving?"Submitting...":"Confirm opt-out"}
                  </button>
                  <button type="button" onClick={()=>{setStep("details");setMsg(null);}} className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Back</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>

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

function TransferShareCapitalForm({ accessToken, shareCapitalAmount, optOut = false, onComplete, onCancel }) {
  const [form, setForm] = useState({ memberId: "", amount: String(shareCapitalAmount || "") });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [recipient, setRecipient] = useState(null);

  async function searchRecipient() {
    setMsg(null); setRecipient(null);
    try { const result = await findMemberByNumber(form.memberId, accessToken); setRecipient(result.member); }
    catch (err) { setMsg({ type: "error", text: err.message }); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.memberId.trim()) { setMsg({ type: "error", text: "Member ID is required." }); return; }
    if (!amount || amount <= 0) { setMsg({ type: "error", text: "Enter a valid share capital amount." }); return; }
    if (amount > shareCapitalAmount) { setMsg({ type: "error", text: `Amount cannot exceed your share capital (${formatCurrency(shareCapitalAmount)}).` }); return; }
    setSaving(true); setMsg(null);
    try {
      if (!recipient) throw new Error("Search and select a recipient before confirming.");
      const result = await transferShareCapital({ recipientMemberNumber: recipient.memberNumber, amount, optOut, confirmed: true }, accessToken);
      setMsg({ type: "success", text: `Transfer complete. ${formatCurrency(result.feeAmount)} was routed to SACCO revenue.` });
      setTimeout(() => onComplete?.(), 2000);
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Failed to transfer share capital." });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {msg && <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}
      <label className="block text-sm font-semibold text-slate-700">
        Recipient membership number
        <div className="mt-1 flex gap-2"><input type="text" value={form.memberId} onChange={(e) => { setForm((f) => ({ ...f, memberId: e.target.value })); setRecipient(null); }} className="w-full rounded-lg border px-3.5 py-3 text-sm" placeholder="29903-001" /><button type="button" onClick={searchRecipient} className="rounded-lg border px-4 text-sm font-semibold">Search</button></div>
      </label>
      {recipient ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm"><strong>{recipient.name || recipient.User?.name || recipient.memberNumber}</strong><br />{recipient.memberNumber}</div> : null}
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
          {saving ? "Transferring..." : "Confirm transfer"}
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

function ShareCapitalTransfer({ stats, accessToken, onRefresh }) {
  return (<Surface className="p-5">
    <div className="mb-4"><h5 className="text-base font-semibold text-slate-950">Transfer Share Capital</h5><p className="text-sm text-slate-500">A 5% fee applies. Your remaining balance must stay at or above {formatCurrency(MIN_SHARE_CAPITAL)}.</p></div>
    <TransferShareCapitalForm accessToken={accessToken} shareCapitalAmount={Math.max(Number(stats.shareCapital || 0) - MIN_SHARE_CAPITAL, 0)} onComplete={onRefresh} />
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


