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
  MailCheck,
  MapPin,
  MonitorSmartphone,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
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

          {message ? (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
            >
              {message.text}
            </div>
          ) : null}

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
    </div>
  );
}

function LoansPage({
  loans,
  stats,
  accessToken,
  onRefresh,
  search,
  showValues,
}) {
  const [loanForm, setLoanForm] = useState({
    type: "EMERGENCY",
    amount: "10000",
    duration: "12",
  });
  const [repayAmount, setRepayAmount] = useState("");
  const [message, setMessage] = useState(null);
  const activeLoans = loans.filter((loan) =>
    ["ACTIVE", "APPROVED"].includes(String(loan.status || "").toUpperCase()),
  );
  const [repayLoanId, setRepayLoanId] = useState("");
  const totalBalance = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.balance || loan.principal || 0),
    0,
  );
  const rows = loans.filter((loan) => matchesSearch(loan, search));
  const selectedProduct =
    LOAN_PRODUCTS.find((product) => product.type === loanForm.type) ||
    LOAN_PRODUCTS[0];
  const selectedRepayLoanId = repayLoanId || activeLoans[0]?.id || "";
  const requestedAmount = Math.min(
    Number(loanForm.amount || 0),
    selectedProduct.max,
  );
  const requestedDuration = Math.min(
    Number(loanForm.duration || 1),
    selectedProduct.duration,
  );
  const totalInterest =
    requestedAmount * (selectedProduct.interestRate / 100) * requestedDuration;
  const monthlyRepayment = requestedDuration
    ? (requestedAmount + totalInterest) / requestedDuration
    : 0;

  async function requestLoan(event) {
    event.preventDefault();
    if (requestedAmount <= 0) {
      setMessage({
        type: "error",
        text: "Enter a valid loan amount before submitting.",
      });
      return;
    }
    if (!selectedProduct) {
      setMessage({ type: "error", text: "Select a valid loan product." });
      return;
    }
    if (
      selectedProduct.requiresFullShareCapital &&
      stats.shareCapitalRemaining > 0
    ) {
      setMessage({
        type: "error",
        text: "This loan product requires that your minimum share capital is fully paid.",
      });
      return;
    }
    try {
      await applyForLoan(
        {
          type: loanForm.type,
          amount: requestedAmount,
          duration: requestedDuration,
          interestRate: selectedProduct.interestRate,
        },
        accessToken,
      );
      setMessage({
        type: "success",
        text: "Loan request submitted successfully.",
      });
      await onRefresh?.();
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to request loan.",
      });
    }
  }

  function submitRepayment(event) {
    event.preventDefault();
    repayLoan(selectedRepayLoanId, repayAmount, accessToken)
      .then(async () => {
        setMessage({
          type: "success",
          text: "Loan repayment recorded successfully.",
        });
        setRepayAmount("");
        await onRefresh?.();
      })
      .catch((error) =>
        setMessage({
          type: "error",
          text: error?.message || "Failed to repay loan.",
        }),
      );
  }

  const scrollToApplication = () => {
    const el = document.getElementById("loan-product-select");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait a moment for scroll to finish or use preventScroll to avoid jumps
      el.focus({ preventScroll: true });
    }
  };

  return (
    <div className="space-y-6">
      <LoanProducts stats={stats} />
      <EligibilityChecks stats={stats} />
      <button
        onClick={scrollToApplication}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-900"
      >
        <Plus className="text-[#8cc63f]" size={18} />
        New application
      </button>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={FileText}
          className="text-[#8cc63f]"
          label="Active loans"
          value={activeLoans.length}
          trend="Live"
          helper="Approved or currently active facilities"
          tone="blue"
        />
        <StatCard
          icon={CreditCard}
          className="text-[#8cc63f]"
          label="Outstanding balance"
          value={formatCurrency(totalBalance)}
          trend="-4.1%"
          helper="Estimated from loan records"
          tone="amber"
          blur={!showValues}
        />
        <StatCard
          icon={Clock3}
          className="text-[#8cc63f]"
          label="Next repayment"
          value="-"
          trend="Pending"
          helper="Repayment schedule will appear when available"
          tone="slate"
        />
      </div>
      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Surface className="p-5">
          <h5 className="text-base font-semibold tracking-normal text-slate-950">
            Request a loan
          </h5>
          <form onSubmit={requestLoan} className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Loan product
              <select
                id="loan-product-select"
                value={loanForm.type}
                onChange={(event) =>
                  setLoanForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm"
              >
                {LOAN_PRODUCTS.map((product) => (
                  <option key={product.type} value={product.type}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Amount"
              name="amount"
              type="number"
              value={loanForm.amount}
              onChange={(event) =>
                setLoanForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
            />
            <Field
              label="Duration (months)"
              name="duration"
              type="number"
              value={loanForm.duration}
              onChange={(event) =>
                setLoanForm((current) => ({
                  ...current,
                  duration: event.target.value,
                }))
              }
            />
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              <FileText className="text-[#8cc63f]" size={17} />
              Request loan
            </button>
          </form>
        </Surface>

        <Surface className="p-5">
          <h5 className="text-base font-semibold tracking-normal text-slate-950">
            Repay a loan
          </h5>
          <form onSubmit={submitRepayment} className="mt-4 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Loan
              <select
                value={selectedRepayLoanId}
                onChange={(event) => setRepayLoanId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm"
              >
                {activeLoans.length === 0 ? (
                  <option value="">No active loans</option>
                ) : (
                  activeLoans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.type} -{" "}
                      {formatCurrency(loan.balance || loan.principal)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <Field
              label="Repayment amount"
              name="repayAmount"
              type="number"
              value={repayAmount}
              onChange={(event) => setRepayAmount(event.target.value)}
            />
            <button
              disabled={!selectedRepayLoanId || !repayAmount}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 disabled:opacity-60"
            >
              <CreditCard className="text-[#8cc63f]" size={17} />
              Start repayment
            </button>
          </form>
        </Surface>
      </div>

      <LoanCalculator
        product={selectedProduct}
        amount={requestedAmount}
        duration={requestedDuration}
        totalInterest={totalInterest}
        monthlyRepayment={monthlyRepayment}
      />
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

function PortfolioPage({
  stats,
  transactions,
  shares,
  search,
  user,
  showValues,
  onToggleValues,
}) {
  const filteredTransactions = transactions.filter((transaction) =>
    matchesSearch(transaction, search),
  );
  const portfolioStats = [
    {
      label: "Estimated account value",
      value: formatCurrency(stats.balance),
      tone: "emerald",
    },
    {
      label: "Share capital",
      value: formatCurrency(stats.shareCapital),
      tone: "blue",
    },
    {
      label: "Loan balance",
      value: formatCurrency(stats.loanBalance),
      tone: "amber",
    },
    {
      label: "This month",
      value: formatCurrency(stats.monthlyContributions),
      tone: "slate",
    },
  ];

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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <ReadOnlyPortfolioDetails />
      </div>
    </div>
  );
}

function ReadOnlyPortfolioDetails() {
  return <Surface className="p-5 hidden"></Surface>;
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

function ReportsPage({ accessToken }) {
  const [reportType, setReportType] = useState("portfolio");
  const [duration, setDuration] = useState("all");
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);

  async function requestReport(event) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      await emailMemberReport(
        reportType,
        accessToken,
        duration === "all" ? undefined : Number(duration),
      );
      setMessage({
        type: "success",
        text: "Report request sent. Check your registered email.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to request report.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Reports" />
      <Surface className="p-5">
        {message ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
          >
            {message.text}
          </div>
        ) : null}
        <form
          onSubmit={requestReport}
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)_auto] md:items-end"
        >
          <label className="text-sm font-semibold text-slate-700">
            Report type
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm"
            >
              <option value="portfolio">Portfolio report</option>
              <option value="transactions">Transaction statement</option>
              <option value="loans">Loan statement</option>
              <option value="savings">Savings and share capital report</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Report duration
            <select
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm"
            >
              <option value="all">All time</option>
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
            </select>
          </label>
          <button
            disabled={sending}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <MailCheck className="text-[#8cc63f]" size={17} />
            {sending ? "Sending..." : "Email report"}
          </button>
        </form>
      </Surface>
    </div>
  );
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
