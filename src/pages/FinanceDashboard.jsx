import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  Bell,
  BriefcaseBusiness,
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Filter,
  KeyRound,
  Landmark,
  LockKeyhole,
  PieChart,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import StaffSecurityPage from "../components/staff-dashboard/StaffSecurityPage.jsx";
import SupportPage from "../components/user-dashboard/SupportPage.jsx";
import MemberFinancialProfile from "../components/staff-dashboard/MemberFinancialProfile.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import { changePassword } from "../services/authService.js";
import {
  approveLoan,
  disburseLoan,
  getAllCompanies,
  getAllDeductions,
  getAllDividends,
  getAllLoans,
  getAllMembers,
  getAllShares,
  getAllTransactions,
  getFinancialReports,
  getMemberFinancialProfile,
  rejectLoan,
  sendFinanceNotification,
  verifyTransaction,
  voidTransaction,
  writeOffLoan,
} from "../features/finance/financeService.js";
import {
  AnalyticsPanel,
  DataTable,
  DashboardHero,
  KpiCard,
  SectionHeader,
  SkeletonDashboard,
  StatusBadge,
  formatCurrency,
  formatDate,
  getMonthlySeries,
} from "../components/dashboard/EnterpriseDashboard.jsx";
import { findMemberByNumber } from "../features/search/searchService.js";

function filterRows(rows, search, keys) {
  const term = search.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((row) =>
    keys.some((key) =>
      String(row?.[key] || "")
        .toLowerCase()
        .includes(term),
    ),
  );
}
function formatDateSafe(v) {
  try {
    return v ? new Date(v).toLocaleDateString() : "-";
  } catch {
    return "-";
  }
}

const MOCK_COMPANIES = [
  {
    id: "c1",
    name: "Ministry of Education",
    employees: 48,
    totalDeductions: 480000,
    status: "Active",
  },
  {
    id: "c2",
    name: "County Government of Nairobi",
    employees: 32,
    totalDeductions: 320000,
    status: "Active",
  },
  {
    id: "c3",
    name: "Kenyatta National Hospital",
    employees: 26,
    totalDeductions: 260000,
    status: "Active",
  },
  {
    id: "c4",
    name: "Safaricom PLC",
    employees: 15,
    totalDeductions: 150000,
    status: "Active",
  },
];
const MOCK_MEMBERS_PROFILE = [
  {
    id: "M001",
    name: "John Kamau",
    phone: "+254712345678",
    company: "Ministry of Education",
    salary: 85000,
    deduction: 8500,
    savings: 250000,
    loans: 45000,
    shares: 35000,
    risk: "Low",
    status: "Active",
  },
  {
    id: "M002",
    name: "Mary Wanjiku",
    phone: "+254723456789",
    company: "County Government of Nairobi",
    salary: 65000,
    deduction: 6500,
    savings: 180000,
    loans: 120000,
    shares: 28000,
    risk: "Medium",
    status: "Active",
  },
  {
    id: "M003",
    name: "Peter Otieno",
    phone: "+254734567890",
    company: "Kenyatta National Hospital",
    salary: 92000,
    deduction: 9200,
    savings: 420000,
    loans: 0,
    shares: 50000,
    risk: "Low",
    status: "Active",
  },
  {
    id: "M004",
    name: "Jane Muthoni",
    phone: "+254745678901",
    company: "Safaricom PLC",
    salary: 110000,
    deduction: 11000,
    savings: 600000,
    loans: 250000,
    shares: 75000,
    risk: "Low",
    status: "Active",
  },
  {
    id: "M005",
    name: "David Kiprop",
    phone: "+254756789012",
    company: null,
    salary: 0,
    deduction: 0,
    savings: 50000,
    loans: 35000,
    shares: 15000,
    risk: "High",
    status: "Overdue",
  },
  {
    id: "M006",
    name: "Alice Wambui",
    phone: "+254767890123",
    company: null,
    salary: 0,
    deduction: 0,
    savings: 30000,
    loans: 80000,
    shares: 10000,
    risk: "High",
    status: "Default",
  },
];
const MOCK_LOANS_QUEUE = [
  {
    id: "L001",
    member: "John Kamau",
    type: "DEVELOPMENT",
    principal: 250000,
    balance: 210000,
    interest: 2,
    duration: 72,
    status: "ACTIVE",
    disbursedDate: "2026-01-15",
    nextPayment: 6250,
    paid: 40000,
    arrears: 0,
    repayments: 6,
    expected: 6,
  },
  {
    id: "L002",
    member: "Mary Wanjiku",
    type: "WELFARE",
    principal: 120000,
    balance: 80000,
    interest: 1.5,
    duration: 24,
    status: "ACTIVE",
    disbursedDate: "2026-03-10",
    nextPayment: 5800,
    paid: 40000,
    arrears: 11600,
    repayments: 5,
    expected: 7,
  },
  {
    id: "L003",
    member: "Jane Muthoni",
    type: "DEVELOPMENT",
    principal: 500000,
    balance: 450000,
    interest: 2,
    duration: 72,
    status: "ACTIVE",
    disbursedDate: "2026-02-20",
    nextPayment: 10200,
    paid: 50000,
    arrears: 0,
    repayments: 5,
    expected: 5,
  },
  {
    id: "L004",
    member: "Peter Otieno",
    type: "EMERGENCY",
    principal: 30000,
    balance: 0,
    interest: 1,
    duration: 12,
    status: "DISBURSED",
    disbursedDate: "2026-05-01",
    nextPayment: 0,
    paid: 30000,
    arrears: 0,
    repayments: 3,
    expected: 3,
  },
  {
    id: "L005",
    member: "Faith Wangari",
    type: "EDUCATION",
    principal: 80000,
    balance: 80000,
    interest: 1,
    duration: 24,
    status: "APPROVED",
    disbursedDate: null,
    nextPayment: 0,
    paid: 0,
    arrears: 0,
    repayments: 0,
    expected: 0,
  },
  {
    id: "L006",
    member: "Samuel Mwangi",
    type: "DEVELOPMENT",
    principal: 150000,
    balance: 150000,
    interest: 2,
    duration: 72,
    status: "PENDING",
    disbursedDate: null,
    nextPayment: 0,
    paid: 0,
    arrears: 0,
    repayments: 0,
    expected: 0,
  },
  {
    id: "L007",
    member: "Grace Achieng",
    type: "WELFARE",
    principal: 90000,
    balance: 90000,
    interest: 1.5,
    duration: 24,
    status: "REJECTED",
    disbursedDate: null,
    nextPayment: 0,
    paid: 0,
    arrears: 0,
    repayments: 0,
    expected: 0,
  },
  {
    id: "L008",
    member: "David Kiprop",
    type: "EMERGENCY",
    principal: 35000,
    balance: 28000,
    interest: 1,
    duration: 12,
    status: "OVERDUE",
    disbursedDate: "2025-11-01",
    nextPayment: 3500,
    paid: 7000,
    arrears: 14000,
    repayments: 2,
    expected: 6,
  },
  {
    id: "L009",
    member: "Alice Wambui",
    type: "DEVELOPMENT",
    principal: 180000,
    balance: 180000,
    interest: 2,
    duration: 72,
    status: "WRITTEN_OFF",
    disbursedDate: "2025-06-01",
    nextPayment: 0,
    paid: 20000,
    arrears: 60000,
    repayments: 4,
    expected: 18,
  },
];
const MOCK_DIVIDENDS = [
  {
    year: 2025,
    rate: "8.5%",
    totalDistributed: 425000,
    membersCount: 126,
    declaredDate: "2026-01-15",
    status: "Distributed",
  },
  {
    year: 2024,
    rate: "7.2%",
    totalDistributed: 360000,
    membersCount: 112,
    declaredDate: "2025-01-20",
    status: "Distributed",
  },
  {
    year: 2023,
    rate: "6.8%",
    totalDistributed: 310000,
    membersCount: 98,
    declaredDate: "2024-01-18",
    status: "Distributed",
  },
];
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: "New Loan Request",
    body: "Samuel Mwangi submitted a DEVELOPMENT loan of KES 150,000",
    type: "LOAN",
    subtype: "application",
    time: new Date().toISOString(),
    read: false,
  },
  {
    id: 2,
    title: "Loan Repayment Received",
    body: "John Kamau repaid KES 6,250 on DEVELOPMENT loan",
    type: "LOAN",
    subtype: "repayment",
    time: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
  {
    id: 3,
    title: "Deposit Recorded",
    body: "Jane Muthoni deposited KES 11,000 via M-Pesa",
    type: "TRANSACTION",
    subtype: "deposit",
    time: new Date(Date.now() - 1800000).toISOString(),
    read: false,
  },
  {
    id: 4,
    title: "Withdrawal Processed",
    body: "Peter Otieno withdrew KES 5,000 from savings",
    type: "TRANSACTION",
    subtype: "withdrawal",
    time: new Date(Date.now() - 5400000).toISOString(),
    read: false,
  },
  {
    id: 5,
    title: "Deposit Recorded",
    body: "Faith Wanjiku deposited KES 8,000 via bank transfer",
    type: "TRANSACTION",
    subtype: "deposit",
    time: new Date(Date.now() - 7200000).toISOString(),
    read: true,
  },
  {
    id: 6,
    title: "Overdue Alert",
    body: "David Kiprop is 2 months behind on EMERGENCY loan",
    type: "LOAN",
    subtype: "overdue",
    time: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
  {
    id: 7,
    title: "New Loan Request",
    body: "Grace Achieng submitted an EDUCATION loan of KES 80,000",
    type: "LOAN",
    subtype: "application",
    time: new Date(Date.now() - 100000).toISOString(),
    read: false,
  },
  {
    id: 8,
    title: "Withdrawal Flagged",
    body: "Large withdrawal of KES 25,000 from Alice Wambui — requires review",
    type: "OVERDUE",
    subtype: "flag",
    time: new Date(Date.now() - 1200000).toISOString(),
    read: false,
  },
];

function calculateReducingBalance(principal, annualRate, durationMonths) {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment =
    monthlyRate === 0
      ? principal / durationMonths
      : (principal * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -durationMonths));
  let schedule = [];
  let balance = principal;
  for (let i = 1; i <= durationMonths; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    schedule.push({
      month: i,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance),
    });
  }
  return {
    monthlyPayment,
    totalRepayment: monthlyPayment * durationMonths,
    totalInterest: monthlyPayment * durationMonths - principal,
    schedule,
  };
}

function getFinanceStats(data) {
  const tx = data.transactions || [];
  const loans = data.loans || [];
  const now = new Date();
  const isToday = (v) => {
    if (!v) return false;
    const d = new Date(v);
    return d.toDateString() === now.toDateString();
  };
  const isMonth = (v) => {
    if (!v) return false;
    const d = new Date(v);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  };
  const byType = (type) =>
    tx
      .filter((t) =>
        String(t.type || "")
          .toUpperCase()
          .includes(type),
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  return {
    dailyTransactions: tx.filter((t) => isToday(t.createdAt || t.date)).length,
    totalDeposits: byType("DEPOSIT"),
    totalWithdrawals: byType("WITHDRAWAL"),
    activeLoans: loans.filter((l) =>
      ["ACTIVE", "DISBURSED", "APPROVED"].includes(
        String(l.status || "").toUpperCase(),
      ),
    ).length,
    loanRepayments: byType("REPAYMENT"),
    pendingDisbursements: loans.filter(
      (l) => String(l.status || "").toUpperCase() === "APPROVED",
    ).length,
    monthlyRevenue: tx
      .filter((t) => isMonth(t.createdAt || t.date))
      .reduce((s, t) => s + Number(t.amount || 0), 0),
    totalDisbursed: loans
      .filter((l) =>
        ["DISBURSED", "ACTIVE"].includes(String(l.status || "").toUpperCase()),
      )
      .reduce((s, l) => s + Number(l.principal || 0), 0),
    overdueLoans: loans.filter(
      (l) => String(l.status || "").toUpperCase() === "OVERDUE",
    ).length,
    totalArrears: loans
      .filter((l) =>
        ["OVERDUE", "ACTIVE"].includes(String(l.status || "").toUpperCase()),
      )
      .reduce((s, l) => s + Number(l.arrears || l.balance || 0), 0),
  };
}

function exportToCSV(rows, columns, filename = "export.csv") {
  const headers = columns
    .map((c) => (typeof c === "string" ? c : c.label))
    .join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val =
            typeof c === "string"
              ? row[c]
              : c.csv
                ? c.csv(row[c.key], row)
                : c.render
                  ? c.render(row[c.key], row)
                  : row[c.key];
          return `"${String(val || "").replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// MAIN FINANCE DASHBOARD — sidebar-driven routing
// ============================================================
export default function FinanceDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const path = location.pathname;
  const dashboardBase = getDashboardPath("FINANCE");
  let activeSection = "home";
  if (path.includes("/transactions")) activeSection = "transactions";
  else if (path.includes("/loans")) activeSection = "loans";
  else if (path.includes("/deductions")) activeSection = "deductions";
  else if (path.includes("/members")) activeSection = "members";
  else if (path.includes("/dividends")) activeSection = "dividends";
  else if (path.includes("/reports")) activeSection = "reports";
  else if (path.includes("/settings")) activeSection = "settings";
  else if (path.includes("/security")) activeSection = "security";
  else if (path.includes("/support")) activeSection = "support";
  else if (path.includes("/notifications")) activeSection = "notifications";

  const [data, setData] = useState({
    transactions: [],
    loans: [],
    shares: [],
    deductions: [],
    dividends: [],
    members: [],
    companies: [],
    reports: {},
  });

  async function loadAllData({ showLoading = true } = {}) {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    const results = await Promise.allSettled([
      getAllTransactions(accessToken),
      getAllLoans(accessToken),
      getAllShares(accessToken),
      getAllDeductions(accessToken),
      getAllDividends(accessToken),
      getAllMembers(accessToken),
      getAllCompanies(accessToken),
      getFinancialReports(accessToken),
    ]);
    setData({
      transactions:
        results[0].status === "fulfilled" && Array.isArray(results[0].value)
          ? results[0].value
          : [],
      loans:
        results[1].status === "fulfilled" && Array.isArray(results[1].value)
          ? results[1].value
          : MOCK_LOANS_QUEUE,
      shares:
        results[2].status === "fulfilled" && Array.isArray(results[2].value)
          ? results[2].value
          : [],
      deductions:
        results[3].status === "fulfilled" && Array.isArray(results[3].value)
          ? results[3].value
          : [],
      dividends:
        results[4].status === "fulfilled" && Array.isArray(results[4].value)
          ? results[4].value
          : MOCK_DIVIDENDS,
      members:
        results[5].status === "fulfilled" && Array.isArray(results[5].value)
          ? results[5].value
          : MOCK_MEMBERS_PROFILE,
      companies:
        results[6].status === "fulfilled" && Array.isArray(results[6].value)
          ? results[6].value
          : MOCK_COMPANIES,
      reports: results[7].status === "fulfilled" ? results[7].value : {},
    });
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    loadAllData();
  }, [accessToken]);
  useEffect(() => {
    const interval = setInterval(
      () => loadAllData({ showLoading: false }),
      5 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [accessToken]);

  const stats = useMemo(() => getFinanceStats(data), [data]);
  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleVerifyTransaction(id) {
    try {
      await verifyTransaction(id, accessToken);
      await loadAllData({ showLoading: false });
    } catch (e) {
      alert(e.message);
    }
  }
  async function handleVoidTransaction(id) {
    const reason = prompt("Reason for voiding:");
    if (reason) {
      try {
        await voidTransaction(id, reason, accessToken);
        await loadAllData({ showLoading: false });
      } catch (e) {
        alert(e.message);
      }
    }
  }
  async function handleApproveLoan(id) {
    try {
      await approveLoan(id, accessToken);
      await loadAllData({ showLoading: false });
    } catch (e) {
      alert(e.message);
    }
  }
  async function handleRejectLoan(id) {
    const reason = prompt("Reason for rejection:");
    if (reason) {
      try {
        await rejectLoan(id, reason, accessToken);
        await loadAllData({ showLoading: false });
      } catch (e) {
        alert(e.message);
      }
    }
  }
  async function handleDisburseLoan(id) {
    try {
      await disburseLoan(id, accessToken);
      await loadAllData({ showLoading: false });
    } catch (e) {
      alert(e.message);
    }
  }
  async function handleWriteOffLoan(id) {
    const reason = prompt("Reason for write-off:");
    if (reason) {
      try {
        await writeOffLoan(id, reason, accessToken);
        await loadAllData({ showLoading: false });
      } catch (e) {
        alert(e.message);
      }
    }
  }

  function renderContent() {
    if (loading) return <SkeletonDashboard />;
    switch (activeSection) {
      case "transactions":
        return (
          <TransactionsPage
            data={data}
            onVerifyTransaction={handleVerifyTransaction}
            onVoidTransaction={handleVoidTransaction}
            globalSearch={globalSearch}
          />
        );
      case "loans":
        return (
          <UnifiedLoansPage
            loans={data.loans}
            onApproveLoan={handleApproveLoan}
            onRejectLoan={handleRejectLoan}
            onDisburseLoan={handleDisburseLoan}
            onWriteOffLoan={handleWriteOffLoan}
            globalSearch={globalSearch}
          />
        );
      case "deductions":
        return (
          <SalaryDeductionPage
            data={data}
            accessToken={accessToken}
            onRefresh={() => loadAllData({ showLoading: false })}
          />
        );
      case "members":
        return (
          <MemberProfilesPage
            data={data}
            accessToken={accessToken}
            onRefresh={() => loadAllData({ showLoading: false })}
          />
        );
      case "dividends":
        return <DividendsPage dividends={data.dividends} />;
      case "reports":
        return <FinancialReportsPage data={data} />;
      case "settings":
        return (
          <FinancierProfileSettings
            user={user}
            stats={stats}
            accessToken={accessToken}
          />
        );
      case "security":
        return <StaffSecurityPage user={user} accessToken={accessToken} />;
      case "support":
        return <SupportPage user={user} role="FINANCE" />;
      case "notifications":
        return (
          <NotificationsPanel
            notifications={notifications}
            members={data.members}
            onMarkAllRead={markAllNotificationsRead}
            accessToken={accessToken}
          />
        );
      default:
        return (
          <FinanceHome
            data={data}
            stats={stats}
            globalSearch={globalSearch}
            onVerifyTransaction={handleVerifyTransaction}
          />
        );
    }
  }

  return (
    <div className="enterprise-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />
      <main
        className={`min-h-screen transition-all ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-62"}`}
      >
        <TopNavbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => {
            if (window.innerWidth >= 1024) setSidebarCollapsed((c) => !c);
            else setSidebarOpen((c) => !c);
          }}
          unreadCount={unreadCount}
          searchValue={globalSearch}
          onSearchChange={setGlobalSearch}
          onNotificationClick={() => navigate(`${dashboardBase}/notifications`)}
        />
        <div className="mx-auto w-full max-w-[1500px] px-4 py-2 sm:px-2 lg:px-2">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function NotificationsPanel({
  notifications,
  members = [],
  onMarkAllRead,
  accessToken,
}) {
  const [notifTab, setNotifTab] = useState("all");
  const [form, setForm] = useState({
    audience: "MEMBER",
    recipientUserId: "",
    category: "announcement",
    severity: "info",
    title: "",
    body: "",
  });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const filtered =
    notifTab === "all"
      ? notifications
      : notifications.filter((n) => n.type === notifTab);
  const typeLabel = (n) => {
    if (n.type === "LOAN")
      return n.subtype === "application"
        ? "Loan Request"
        : n.subtype === "repayment"
          ? "Repayment"
          : n.subtype === "overdue"
            ? "Overdue"
            : "LOAN";
    if (n.type === "TRANSACTION")
      return n.subtype === "deposit"
        ? "Deposit"
        : n.subtype === "withdrawal"
          ? "Withdrawal"
          : "TRANSACTION";
    return n.type;
  };
  const typeColor = (n) => {
    if (n.type === "LOAN")
      return n.subtype === "application"
        ? "bg-sky-100 text-sky-700"
        : n.subtype === "overdue"
          ? "bg-rose-100 text-rose-700"
          : "bg-amber-100 text-amber-700";
    if (n.type === "TRANSACTION")
      return n.subtype === "deposit"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-rose-100 text-rose-700";
    return "bg-rose-100 text-rose-700";
  };
  const counts = {
    all: notifications.length,
    LOAN: notifications.filter((n) => n.type === "LOAN").length,
    TRANSACTION: notifications.filter((n) => n.type === "TRANSACTION").length,
    OVERDUE: notifications.filter(
      (n) =>
        n.type === "OVERDUE" || (n.type === "LOAN" && n.subtype === "overdue"),
    ).length,
  };
  async function handleSendNotification(e) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const result = await sendFinanceNotification(form, accessToken);
      setMessage({
        type: "success",
        text: `Notification sent to ${result?.sent || 0} recipient${result?.sent === 1 ? "" : "s"}.`,
      });
      setForm((current) => ({ ...current, title: "", body: "" }));
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to send notification.",
      });
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Notifications"
        title="Alert center"
        description="Categorized real-time alerts for loan applications, repayments, deposits, withdrawals, and overdue accounts."
      />
      <form
        onSubmit={handleSendNotification}
        className="grid gap-4 rounded-lg border bg-white p-5 lg:grid-cols-[1fr_1fr_1fr]"
      >
        <label className="text-sm font-semibold text-slate-700">
          Audience
          <select
            value={form.audience}
            onChange={(e) =>
              setForm((c) => ({
                ...c,
                audience: e.target.value,
                recipientUserId:
                  e.target.value === "INDIVIDUAL" ? c.recipientUserId : "",
              }))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="MEMBER">All Members</option>
            <option value="INDIVIDUAL">One Member</option>
            <option value="FINANCE">Finance team</option>
            <option value="ADMINS">Admins</option>
            <option value="ALL">Everyone</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Category
          <select
            value={form.category}
            onChange={(e) =>
              setForm((c) => ({ ...c, category: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="announcement">Announcement</option>
            <option value="loan">Loan</option>
            <option value="transaction">Transaction</option>
            <option value="deduction">Deduction</option>
            <option value="security">Security</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Priority
          <select
            value={form.severity}
            onChange={(e) =>
              setForm((c) => ({ ...c, severity: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        {form.audience === "INDIVIDUAL" && (
          <label className="text-sm font-semibold text-slate-700 lg:col-span-3">
            Member
            <select
              required
              value={form.recipientUserId}
              onChange={(e) =>
                setForm((c) => ({ ...c, recipientUserId: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Select member</option>
              {members
                .filter((m) => m.userId)
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name || m.id} {m.phone ? `- ${m.phone}` : ""}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="text-sm font-semibold text-slate-700 lg:col-span-3">
          Title
          <input
            required
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 lg:col-span-3">
          Message
          <textarea
            required
            value={form.body}
            onChange={(e) => setForm((c) => ({ ...c, body: e.target.value }))}
            className="mt-1 min-h-28 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-center gap-3 lg:col-span-3">
          <button
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <Bell size={14} />
            )}
            Send notification
          </button>
          {message && (
            <span
              className={`text-sm font-semibold ${message.type === "success" ? "text-emerald-700" : "text-rose-700"}`}
            >
              {message.text}
            </span>
          )}
        </div>
      </form>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: "all", label: "All", count: counts.all, icon: Bell },
            { key: "LOAN", label: "Loans", count: counts.LOAN, icon: FileText },
            {
              key: "TRANSACTION",
              label: "Transactions",
              count: counts.TRANSACTION,
              icon: ReceiptText,
            },
            {
              key: "OVERDUE",
              label: "Overdue",
              count: counts.OVERDUE,
              icon: AlertTriangle,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setNotifTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${notifTab === tab.key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              <tab.icon size={14} />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <button
          onClick={onMarkAllRead}
          className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Mark all read
        </button>
      </div>
      <div className="space-y-3">
        {filtered.map((n) => (
          <div
            key={n.id}
            className={`rounded-lg border p-4 ${n.read ? "bg-white" : "border-rose-200 bg-rose-50"}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold">{n.title}</h4>
                <p className="mt-1 text-sm text-slate-600">{n.body}</p>
              </div>
              <span className="text-xs text-slate-400">
                {new Date(n.time).toLocaleTimeString()}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor(n)}`}
              >
                {typeLabel(n)}
              </span>
              {!n.read && (
                <span className="text-xs font-semibold text-rose-600">
                  ● Unread
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// OVERVIEW
// ============================================================
function FinanceHome({ data, stats, globalSearch = "", onVerifyTransaction }) {
  const navigate = useNavigate();
  const dashboardBase = getDashboardPath("FINANCE");
  const transactionSeries = getMonthlySeries(data.transactions);
  const repaymentSeries = getMonthlySeries(
    data.transactions.filter((t) =>
      String(t.type || "")
        .toUpperCase()
        .includes("REPAYMENT"),
    ),
  );
  const txCards = [
    {
      label: "Daily Transactions",
      value: stats.dailyTransactions,
      icon: ReceiptText,
      tone: "blue",
      path: "/transactions?period=today",
    },
    {
      label: "Deposits",
      value: formatCurrency(stats.totalDeposits),
      icon: TrendingUp,
      tone: "emerald",
      path: "/transactions?type=deposit",
    },
    {
      label: "Withdrawals",
      value: formatCurrency(stats.totalWithdrawals),
      icon: TrendingDown,
      tone: "rose",
      path: "/transactions?type=withdrawal",
    },
  ];
  const loanCards = [
    {
      label: "Active Loans",
      value: stats.activeLoans,
      icon: Landmark,
      tone: "blue",
      path: "/loans?status=active",
    },
    {
      label: "Repayments",
      value: formatCurrency(stats.loanRepayments),
      icon: CreditCard,
      tone: "emerald",
      path: "/transactions?type=repayment",
    },
    {
      label: "Pending Disburse",
      value: stats.pendingDisbursements,
      icon: Banknote,
      tone: "amber",
      path: "/loans?status=approved",
    },
    {
      label: "Overdue",
      value: stats.overdueLoans,
      icon: AlertTriangle,
      tone: "rose",
      path: "/loans?status=overdue",
    },
    {
      label: "Arrears",
      value: formatCurrency(stats.totalArrears),
      icon: ShieldAlert,
      tone: "rose",
      path: "/loans?status=overdue",
    },
  ];
  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Finance operations"
        title="Financial control desk"
        description="Verify payments, manage loans, track deductions, and generate reports."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {txCards.map((c) => (
          <div
            key={c.label}
            onClick={() => navigate(`${dashboardBase}${c.path}`)}
            className="cursor-pointer"
          >
            <KpiCard {...c} trend="Live" />
          </div>
        ))}
        {loanCards.map((c) => (
          <div
            key={c.label}
            onClick={() => navigate(`${dashboardBase}${c.path}`)}
            className="cursor-pointer"
          >
            <KpiCard {...c} trend="Live" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel
          title="Transaction volume"
          data={transactionSeries}
          type="bar"
        />
        <AnalyticsPanel
          title="Repayment trends"
          data={repaymentSeries}
          color="#0369a1"
        />
      </div>
      <TransactionsPage
        data={data}
        embedded
        onVerifyTransaction={onVerifyTransaction}
        globalSearch={globalSearch}
      />
    </div>
  );
}

// ============================================================
// TRANSACTIONS
// ============================================================
function TransactionsPage({
  data,
  embedded = false,
  onVerifyTransaction,
  onVoidTransaction,
  globalSearch = "",
}) {
  const { search: routeSearch } = useLocation();
  const routeParams = new URLSearchParams(routeSearch);
  const initialType = routeParams.get("type") || "all";
  const initialPeriod = routeParams.get("period") || "";
  const today = new Date().toISOString().slice(0, 10);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(
    initialPeriod === "today" ? today : "",
  );
  const [toDate, setToDate] = useState(initialPeriod === "today" ? today : "");
  const [depositFilter, setDepositFilter] = useState(
    [
      "deposit",
      "withdrawal",
      "repayment",
      "share",
      "savings",
      "application_fee",
    ].includes(initialType)
      ? initialType
      : "all",
  );
  useEffect(() => {
    setDepositFilter(
      [
        "deposit",
        "withdrawal",
        "repayment",
        "share",
        "savings",
        "application_fee",
      ].includes(initialType)
        ? initialType
        : "all",
    );
    setFromDate(initialPeriod === "today" ? today : "");
    setToDate(initialPeriod === "today" ? today : "");
  }, [initialType, initialPeriod, today]);
  const transactions = data.transactions || [];
  let filtered = filterRows(
    filterRows(transactions, globalSearch, [
      "id",
      "type",
      "description",
      "category",
      "destination",
      "memberNumber",
      "memberName",
      "status",
      "reference",
    ]),
    search,
    [
      "id",
      "type",
      "description",
      "category",
      "destination",
      "memberNumber",
      "memberName",
      "status",
      "reference",
    ],
  );
  if (fromDate)
    filtered = filtered.filter((t) => {
      const d = t.createdAt || t.date;
      return d ? new Date(d) >= new Date(fromDate) : true;
    });
  if (toDate)
    filtered = filtered.filter((t) => {
      const d = t.createdAt || t.date;
      if (!d) return true;
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      return new Date(d) <= endDate;
    });
  if (depositFilter === "share")
    filtered = filtered.filter((t) => {
      return t.category === "SHARE_CAPITAL";
    });
  if (depositFilter === "savings")
    filtered = filtered.filter((t) => {
      return t.category === "SAVINGS";
    });
  if (depositFilter === "deposit")
    filtered = filtered.filter((t) =>
      String(t.type || "")
        .toLowerCase()
        .includes("deposit"),
    );
  if (depositFilter === "withdrawal")
    filtered = filtered.filter((t) =>
      String(t.type || "")
        .toLowerCase()
        .includes("withdraw"),
    );
  if (depositFilter === "repayment")
    filtered = filtered.filter((t) =>
      String(t.type || "")
        .toLowerCase()
        .includes("repayment"),
    );
  if (depositFilter === "application_fee")
    filtered = filtered.filter((t) => t.category === "MEMBER_APPLICATION_FEE");
  const columns = [
    {
      key: "id",
      label: "Reference",
      render: (v, r) => r.reference || v || "-",
      csv: (v, r) => r.reference || v || "-",
    },
    { key: "memberNumber", label: "Member Number", render: (v) => v || "—" },
    { key: "memberName", label: "Member", render: (v) => v || "—" },
    {
      key: "category",
      label: "Category",
      render: (v) => String(v || "UNCLASSIFIED").replaceAll("_", " "),
    },
    {
      key: "destination",
      label: "Destination",
      render: (v) => v || "Unclassified",
    },
    { key: "type", label: "Type" },
    {
      key: "amount",
      label: "Amount",
      render: (v) => formatCurrency(v),
      csv: (v) => formatCurrency(v),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v || "Pending"} />,
      csv: (v) => v || "Pending",
    },
    {
      key: "description",
      label: "Description",
      render: (v) => v || "-",
      csv: (v) => v || "-",
    },
    {
      key: "createdAt",
      label: "Date",
      render: (v, r) => formatDate(v || r.date),
      csv: (v, r) => formatDate(v || r.date),
    },
  ];
  const content = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-700">Date range:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          />
          <span>to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          />
        </div>
        <select
          value={depositFilter}
          onChange={(e) => setDepositFilter(e.target.value)}
          className="rounded border px-3 py-1 text-sm"
        >
          <option value="all">All Transactions</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="repayment">Repayments</option>
          <option value="share">Share Capital</option>
          <option value="savings">Savings Only</option>
          <option value="application_fee">Member Application Fees</option>
        </select>
        <button
          onClick={() => exportToCSV(filtered, columns, "transactions.csv")}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>
      <DataTable
        title={embedded ? "Recent transactions" : "Transaction processing"}
        description="Verify deposits, withdrawals, fees, disbursements, repayments, and dividend transactions"
        search={search}
        onSearch={setSearch}
        columns={[
          ...columns,
          {
            key: "id",
            label: "Action",
            render: (v, r) => (
              <div className="flex gap-2">
                <button
                  onClick={() => onVerifyTransaction?.(v)}
                  className="text-sm font-semibold text-emerald-700"
                >
                  Verify
                </button>
                {onVoidTransaction ? (
                  <button
                    onClick={() => onVoidTransaction(v, r)}
                    className="text-sm font-semibold text-rose-700"
                  >
                    Void
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyTitle="No transactions"
        emptyDescription="Transaction records will appear here."
      />
    </div>
  );
  if (embedded) return content;
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Transactions"
        title="Transaction processing"
        description="Verify, filter by date range, classify deposits, and export data."
      />
      {content}
    </div>
  );
}

// ============================================================
// UNIFIED LOAN MANAGEMENT
// ============================================================
function UnifiedLoansPage({
  loans,
  onApproveLoan,
  onRejectLoan,
  onDisburseLoan,
  onWriteOffLoan,
  globalSearch = "",
}) {
  const { search: routeSearch } = useLocation();
  const initialStatus = new URLSearchParams(routeSearch).get("status") || "all";
  const [loanTab, setLoanTab] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [showAmortization, setShowAmortization] = useState(null);
  const queueMap = {
    all: { label: "All Loans", filter: () => true, icon: Landmark },
    pending: {
      label: "Pending",
      filter: (l) => String(l.status || "").toUpperCase() === "PENDING",
      icon: Clock3,
    },
    approved: {
      label: "Approved",
      filter: (l) => String(l.status || "").toUpperCase() === "APPROVED",
      icon: CheckCircle2,
    },
    active: {
      label: "Active/Disbursed",
      filter: (l) =>
        ["ACTIVE", "DISBURSED"].includes(String(l.status || "").toUpperCase()),
      icon: TrendingUp,
    },
    overdue: {
      label: "Overdue",
      filter: (l) => String(l.status || "").toUpperCase() === "OVERDUE",
      icon: AlertTriangle,
    },
    rejected: {
      label: "Rejected",
      filter: (l) => String(l.status || "").toUpperCase() === "REJECTED",
      icon: XCircle,
    },
    writtenOff: {
      label: "Written Off",
      filter: (l) => String(l.status || "").toUpperCase() === "WRITTEN_OFF",
      icon: FileText,
    },
  };
  const queue = queueMap[loanTab] || queueMap.all;
  useEffect(() => {
    setLoanTab(queueMap[initialStatus] ? initialStatus : "all");
  }, [initialStatus]);
  const filtered = filterRows(
    filterRows(loans.filter(queue.filter), globalSearch, [
      "id",
      "type",
      "member",
      "memberName",
      "memberId",
      "status",
    ]),
    search,
    ["id", "type", "member", "memberName", "memberId", "status"],
  );
  const totalDisbursed = loans
    .filter((l) =>
      ["DISBURSED", "ACTIVE", "OVERDUE"].includes(
        String(l.status || "").toUpperCase(),
      ),
    )
    .reduce((s, l) => s + Number(l.principal || 0), 0);
  const totalRepaid = loans.reduce((s, l) => s + Number(l.paid || 0), 0);
  const loanColumns = [
    {
      key: "member",
      label: "Member",
      render: (v, r) => v || r.memberName || "-",
      csv: (v, r) => v || r.memberName || "-",
    },
    { key: "type", label: "Type" },
    {
      key: "principal",
      label: "Principal",
      render: (v) => formatCurrency(v),
      csv: (v) => formatCurrency(v),
    },
    {
      key: "balance",
      label: "Balance",
      render: (v) => formatCurrency(v || 0),
      csv: (v) => formatCurrency(v || 0),
    },
    {
      key: "nextPayment",
      label: "Next Payment",
      render: (v) => (v ? formatCurrency(v) : "-"),
      csv: (v) => (v ? formatCurrency(v) : "-"),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v || "Pending"} />,
      csv: (v) => v || "Pending",
    },
    {
      key: "disbursedDate",
      label: "Disbursed",
      render: (v) => formatDateSafe(v),
      csv: (v) => formatDateSafe(v),
    },
  ];
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Loan Management"
        title="Unified loan control center"
        description="Full lifecycle management with amortization, arrears, and product revenue."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          label="Disbursed"
          value={formatCurrency(totalDisbursed)}
          icon={Banknote}
          tone="blue"
        />
        <KpiCard
          label="Repaid"
          value={formatCurrency(totalRepaid)}
          icon={CreditCard}
          tone="emerald"
        />
        <KpiCard
          label="Active"
          value={
            loans.filter((l) =>
              ["ACTIVE", "DISBURSED"].includes(
                String(l.status || "").toUpperCase(),
              ),
            ).length
          }
          icon={Landmark}
          tone="blue"
        />
        <KpiCard
          label="Overdue"
          value={
            loans.filter(
              (l) => String(l.status || "").toUpperCase() === "OVERDUE",
            ).length
          }
          icon={AlertTriangle}
          tone="rose"
        />
        <KpiCard
          label="Rate"
          value={`${Math.round((totalRepaid / Math.max(totalDisbursed, 1)) * 100)}%`}
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Arrears"
          value={formatCurrency(
            loans.reduce((s, l) => s + Number(l.arrears || 0), 0),
          )}
          icon={ShieldAlert}
          tone="rose"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(queueMap).map(([k, q]) => (
          <button
            key={k}
            onClick={() => setLoanTab(k)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${loanTab === k ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <q.icon size={14} />
            {q.label} ({loans.filter(q.filter).length})
          </button>
        ))}
      </div>
      <DataTable
        title={`${queue.label} (${filtered.length})`}
        description="Loan lifecycle tracking"
        search={search}
        onSearch={setSearch}
        columns={[
          ...loanColumns,
          {
            key: "id",
            label: "Actions",
            render: (v, r) => {
              const s = String(r.status || "").toUpperCase();
              return (
                <div className="flex flex-wrap gap-1">
                  {s === "PENDING" && (
                    <>
                      <button
                        onClick={() => onApproveLoan?.(v)}
                        className="text-xs font-semibold text-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onRejectLoan?.(v)}
                        className="text-xs font-semibold text-rose-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {s === "APPROVED" && (
                    <button
                      onClick={() => onDisburseLoan?.(v)}
                      className="text-xs font-semibold text-sky-700"
                    >
                      Disburse
                    </button>
                  )}
                  {(s === "ACTIVE" || s === "DISBURSED") && (
                    <button
                      onClick={() => setShowAmortization(r)}
                      className="text-xs font-semibold text-sky-700"
                    >
                      Schedule
                    </button>
                  )}
                  {s === "OVERDUE" && (
                    <button
                      onClick={() => onWriteOffLoan?.(v)}
                      className="text-xs font-semibold text-rose-700"
                    >
                      Write Off
                    </button>
                  )}
                </div>
              );
            },
          },
        ]}
        data={filtered}
        emptyTitle="No loans"
      />
      <button
        onClick={() => exportToCSV(filtered, loanColumns, "loans.csv")}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
      >
        <Download size={14} />
        Export CSV
      </button>
      {showAmortization ? (
        <AmortizationPanel
          loan={showAmortization}
          onClose={() => setShowAmortization(null)}
        />
      ) : null}
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
        <div className="flex items-center gap-3">
          <ShieldAlert size={20} className="text-rose-700" />
          <h5 className="text-base font-semibold text-rose-900">
            Arrears & Risk
          </h5>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs text-slate-500">Total Arrears</p>
            <p className="mt-1 text-xl font-semibold text-rose-700">
              {formatCurrency(
                loans.reduce((s, l) => s + Number(l.arrears || 0), 0),
              )}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs text-slate-500">Penalties</p>
            <p className="mt-1 text-xl font-semibold text-rose-700">
              {formatCurrency(
                loans
                  .filter(
                    (l) => String(l.status || "").toUpperCase() === "OVERDUE",
                  )
                  .reduce((s, l) => s + Number(l.balance || 0) * 0.02, 0),
              )}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs text-slate-500">In Default</p>
            <p className="mt-1 text-xl font-semibold text-rose-700">
              {
                loans.filter(
                  (l) => String(l.status || "").toUpperCase() === "OVERDUE",
                ).length
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AmortizationPanel({ loan, onClose }) {
  const { monthlyPayment, schedule } = useMemo(
    () =>
      calculateReducingBalance(
        Number(loan.principal || 0),
        (loan.interest || 1) * 12,
        loan.duration || 12,
      ),
    [loan],
  );
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold">Amortization Schedule</h4>
            <p className="text-sm text-slate-500">
              {loan.member || loan.memberName} — {loan.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1 text-sm"
          >
            Close
          </button>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs">Monthly</p>
            <p className="font-semibold">{formatCurrency(monthlyPayment)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs">Paid</p>
            <p className="font-semibold text-emerald-700">
              {formatCurrency(loan.paid || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs">Remaining</p>
            <p className="font-semibold text-rose-700">
              {formatCurrency(loan.balance || 0)}
            </p>
          </div>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              {["Month", "Payment", "Principal", "Interest", "Balance"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedule
              .slice(0, Math.min(schedule.length, loan.duration || 12))
              .map((row) => (
                <tr
                  key={row.month}
                  className={
                    row.month <= (loan.repayments || 0)
                      ? "bg-emerald-50/50"
                      : ""
                  }
                >
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2">{formatCurrency(row.payment)}</td>
                  <td className="px-3 py-2">{formatCurrency(row.principal)}</td>
                  <td className="px-3 py-2 text-amber-700">
                    {formatCurrency(row.interest)}
                  </td>
                  <td className="px-3 py-2">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-500">
          Reducing balance. Green = paid. APR:{" "}
          {((loan.interest || 1) * 12).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

// ============================================================
// SALARY DEDUCTION PAGE
// ============================================================
function SalaryDeductionPage({ data, accessToken, onRefresh }) {
  const { companies = MOCK_COMPANIES, members = MOCK_MEMBERS_PROFILE } = data;
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [editingDeduction, setEditingDeduction] = useState(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const companyMembers =
    selectedCompany === "all"
      ? members
      : members.filter((m) => m.company === selectedCompany);
  const unassociated = members.filter((m) => !m.company);
  const displayedMembers =
    selectedCompany === "unassociated" ? unassociated : companyMembers;
  const deductionColumns = [
    { key: "name", label: "Member" },
    { key: "company", label: "Company", csv: (v) => v || "-" },
    {
      key: "salary",
      label: "Salary",
      csv: (v) => (v ? formatCurrency(v) : "-"),
    },
    {
      key: "deduction",
      label: "Deduction",
      csv: (v) => (v ? formatCurrency(v) : "-"),
    },
    { key: "savings", label: "Savings", csv: (v) => formatCurrency(v || 0) },
    { key: "status", label: "Status", csv: (v) => v || "Active" },
  ];
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Salary deductions"
        title="Deduction & Company Linkage"
        description="Filter by company, manage deductions, add companies, and add members."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCompany(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Building2 size={14} />
              Add Company
            </button>
            <button
              onClick={() => setShowAddMember(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus size={14} />
              Add Member
            </button>
            <button
              onClick={() =>
                exportToCSV(
                  displayedMembers,
                  deductionColumns,
                  "deductions.csv",
                )
              }
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        {companies.slice(0, 4).map((c) => (
          <button
            key={c.id}
            onClick={() =>
              setSelectedCompany(selectedCompany === c.name ? "all" : c.name)
            }
            className={`rounded-lg border p-4 text-left transition ${selectedCompany === c.name ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200" : "border-slate-200 bg-white hover:border-sky-200"}`}
          >
            <Building2 size={20} className="text-[#8cc63f]" />
            <p className="mt-2 font-semibold">{c.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {c.employees} employees · {formatCurrency(c.totalDeductions)}
            </p>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedCompany("all")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedCompany === "all" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          All ({companyMembers.length})
        </button>
        <button
          onClick={() => setSelectedCompany("unassociated")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedCompany === "unassociated" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Unassociated ({unassociated.length})
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50">
              {[
                "Member",
                "Company",
                "Salary",
                "Deduction",
                "Savings",
                "Status",
                "Edit",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedMembers.map((m, i) => (
              <tr key={m.id || i} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-semibold">{m.name}</td>
                <td className="px-4 py-3 text-sm">{m.company || "—"}</td>
                <td className="px-4 py-3 text-sm">
                  {m.salary ? formatCurrency(m.salary) : "—"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editingDeduction === m.id ? (
                    <input
                      type="number"
                      defaultValue={m.deduction}
                      className="w-24 rounded border px-2 py-1 text-sm"
                      onBlur={(e) => {
                        m.deduction = Number(e.target.value);
                        setEditingDeduction(null);
                      }}
                    />
                  ) : (
                    <span>
                      {m.deduction ? formatCurrency(m.deduction) : "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {formatCurrency(m.savings || 0)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge status={m.status || "Active"} />
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => setEditingDeduction(m.id)}
                    className="text-xs font-semibold text-sky-700"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAddCompany && (
        <AddCompanyModal
          onClose={() => setShowAddCompany(false)}
          onSubmit={(c) => {
            companies.push({
              id: "c" + (companies.length + 1),
              ...c,
              employees: 0,
              totalDeductions: 0,
              status: "Active",
            });
            setShowAddCompany(false);
          }}
        />
      )}
      {showAddMember && (
        <AddMemberModal
          companies={companies}
          onClose={() => setShowAddMember(false)}
          onSubmit={(m) => {
            members.push({
              id: "M00" + (members.length + 1),
              ...m,
              risk: "Low",
              status: "Active",
              savings: 0,
              loans: 0,
              shares: 0,
            });
            setShowAddMember(false);
          }}
        />
      )}
    </div>
  );
}

function AddCompanyModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    registrationNumber: "",
    contactEmail: "",
    contactPhone: "",
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold">Add New Company</h4>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-4">
          {[
            { l: "Company Name", n: "name" },
            { l: "Registration No.", n: "registrationNumber" },
            { l: "Contact Email", n: "contactEmail" },
            { l: "Contact Phone", n: "contactPhone" },
          ].map((f) => (
            <label
              key={f.n}
              className="block text-sm font-semibold text-slate-700"
            >
              {f.l}
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form[f.n]}
                onChange={(e) =>
                  setForm((c) => ({ ...c, [f.n]: e.target.value }))
                }
              />
            </label>
          ))}
          <button
            onClick={() => {
              if (form.name.trim()) onSubmit(form);
            }}
            className="rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Create Company
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMemberModal({ companies, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    company: "",
    salary: "",
    deduction: "",
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold">Add Member</h4>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-4">
          <label className="block text-sm font-semibold text-slate-700">
            Name
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Phone
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.phone}
              onChange={(e) =>
                setForm((c) => ({ ...c, phone: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Company
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.company}
              onChange={(e) =>
                setForm((c) => ({ ...c, company: e.target.value }))
              }
            >
              <option value="">— Select —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Salary
            <input
              type="number"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.salary}
              onChange={(e) =>
                setForm((c) => ({ ...c, salary: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Deduction
            <input
              type="number"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.deduction}
              onChange={(e) =>
                setForm((c) => ({ ...c, deduction: e.target.value }))
              }
            />
          </label>
          <button
            onClick={() => {
              if (form.name.trim())
                onSubmit({
                  ...form,
                  salary: Number(form.salary) || 0,
                  deduction: Number(form.deduction) || 0,
                });
            }}
            className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MEMBER PROFILES
// ============================================================
function MemberProfilesPage({ data, accessToken }) {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const members = data.members || MOCK_MEMBERS_PROFILE;
  const locallyFiltered = members.filter((m) =>
    search.trim()
      ? String(m.id || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        String(m.name || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        String(m.memberNumber || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      : true,
  );
  const filtered =
    searchMessage && !selectedMember
      ? [
          {
            id: search.trim(),
            name: searchMessage,
            company: "—",
            risk: searching ? "Searching" : "Not found",
            status: searching ? "Pending" : "Not found",
          },
        ]
      : locallyFiltered;
  async function searchMemberNumber() {
    setSearching(true);
    setSelectedMember(null);
    setSearchMessage("Searching by registration number...");
    try {
      const result = await findMemberByNumber(search, accessToken);
      if (!result.member) {
        setSelectedMember(null);
        setSearchMessage(result.message);
        return;
      }
      const member = result.member;
      setSelectedMember({
        ...member,
        id: member.id,
        memberId: member.id,
        memberNumber: member.memberNumber,
        name: member.user?.name || "Member",
        email: member.user?.email,
        phone: member.user?.phone,
        company:
          member.user?.occupation || member.user?.address || "Independent",
        risk: "Low",
      });
      setSearchMessage("Member found.");
    } catch (error) {
      setSelectedMember(null);
      setSearchMessage(error?.message || "Unable to search for this member.");
    } finally {
      setSearching(false);
    }
  }
  useEffect(() => {
    const memberNumber = search.trim();
    if (!memberNumber) {
      setSearchMessage("");
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      searchMemberNumber();
    }, 450);
    return () => window.clearTimeout(timeoutId);
    // Search is deliberately debounced and uses an indexed exact-match endpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Member profiles"
        title="Financial profiles"
        description="Search by ID, view risk flags, aggregated balances, and ledgers."
        action={
          <button
            onClick={() =>
              exportToCSV(
                members,
                [
                  { key: "id" },
                  { key: "memberNumber" },
                  { key: "name" },
                  { key: "company" },
                  { key: "risk" },
                  { key: "savings" },
                  { key: "loans" },
                  { key: "shares" },
                ],
                "members.csv",
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Download size={14} />
            Export
          </button>
        }
      />
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search by ID, member number, or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm"
        />
      </div>
      {selectedMember ? (
        <FinanceMemberFinancialDetail
          member={selectedMember}
          accessToken={accessToken}
          onBack={() => setSelectedMember(null)}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50">
                {[
                  "ID",
                  "Member Number",
                  "Name",
                  "Company",
                  "Risk",
                  "Savings",
                  "Loans",
                  "Shares",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m, i) => (
                <tr
                  key={m.id || i}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelectedMember(m)}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-sky-700">
                    {m.id}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold">
                    {m.memberNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{m.name}</td>
                  <td className="px-4 py-3 text-sm">{m.company || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${m.risk === "Low" ? "bg-emerald-100 text-emerald-700" : m.risk === "Medium" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
                    >
                      {m.risk}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(m.savings)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(m.loans)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(m.shares)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function FinanceMemberFinancialDetail({ member, accessToken, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const memberId = member.memberId || member.id;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getMemberFinancialProfile(memberId, accessToken)
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((requestError) => {
        if (!cancelled)
          setError(
            requestError?.message || "Failed to load member financial profile.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, memberId]);

  return (
    <MemberFinancialProfile
      profile={profile}
      loading={loading}
      error={error}
      onBack={onBack}
    />
  );
}
function MemberProfileDetail({ member, onBack }) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm font-semibold text-sky-700">
        &larr; Back
      </button>
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">{member.name}</h3>
            <p className="text-sm text-slate-500">
              {member.id} · {member.phone} · {member.company || "Independent"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${member.risk === "Low" ? "bg-emerald-100 text-emerald-700" : member.risk === "Medium" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
          >
            Risk: {member.risk}
          </span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {["Savings", "Loans", "Shares", "Salary"].map((label) => {
            const key = label.toLowerCase();
            const val = key === "salary" ? member.salary : member[key];
            return (
              <div key={label} className="rounded-lg border bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-semibold">
                  {val ? formatCurrency(val) : "—"}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 rounded-lg border p-4">
          <h5 className="font-semibold">Recent Ledger</h5>
          <div className="mt-3 space-y-2 text-sm">
            {[
              "Deposit — KES 5,000 — 2026-07-01",
              "Loan Repayment — KES 3,500 — 2026-06-28",
              "Deduction — KES 8,500 — 2026-06-25",
            ].map((t, i) => (
              <div key={i} className="flex justify-between border-b py-1">
                <span>{t}</span>
                <StatusBadge status="Completed" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REPORTS
// ============================================================
function FinancialReportsPage({ data }) {
  const [timeFilter, setTimeFilter] = useState("monthly");
  const transactions = useMemo(() => data.transactions || [], [data.transactions]);
  const loans = data.loans || MOCK_LOANS_QUEUE;

  const timeSeries = useMemo(() => {
    const series = {};
    const formatKey = (d) => {
      if (timeFilter === "daily") return d.toISOString().split("T")[0];
      if (timeFilter === "monthly")
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return `${d.getFullYear()}`;
    };
    transactions.forEach((t) => {
      const d = t.createdAt || t.date;
      if (!d) return;
      const key = formatKey(new Date(d));
      if (!series[key])
        series[key] = {
          deposits: 0,
          withdrawals: 0,
          repayments: 0,
          disbursements: 0,
          count: 0,
        };
      const type = String(t.type || "").toUpperCase();
      if (type.includes("DEPOSIT"))
        series[key].deposits += Number(t.amount || 0);
      else if (type.includes("WITHDRAW"))
        series[key].withdrawals += Number(t.amount || 0);
      else if (type.includes("REPAYMENT"))
        series[key].repayments += Number(t.amount || 0);
      else if (type.includes("DISBURSE"))
        series[key].disbursements += Number(t.amount || 0);
      series[key].count++;
    });
    return Object.entries(series)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([label, vals]) => ({ label, ...vals }));
  }, [transactions, timeFilter]);

  const reportRows = timeSeries;

  const totalDeposits = transactions
    .filter((t) =>
      String(t.type || "")
        .toUpperCase()
        .includes("DEPOSIT"),
    )
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const shareCapitalTxs = transactions.filter((t) => {
    const tp = String(t.type || "").toLowerCase();
    return (
      (tp.includes("deposit") || tp.includes("payment")) &&
      (tp.includes("share") || tp.includes("capital"))
    );
  });
  const savingsTxs = transactions.filter((t) => {
    const tp = String(t.type || "").toLowerCase();
    return (
      (tp.includes("deposit") || tp.includes("payment")) &&
      tp.includes("savings")
    );
  });
  const shareCapitalDeposits = shareCapitalTxs.reduce(
    (s, t) => s + Number(t.amount || 0),
    0,
  );
  const savingsDeposits = savingsTxs.reduce(
    (s, t) => s + Number(t.amount || 0),
    0,
  );

  const loanProducts = ["EMERGENCY", "EDUCATION", "DEVELOPMENT", "WELFARE"];
  const repayByProduct = {};
  const disburseByProduct = {};
  loanProducts.forEach((p) => {
    repayByProduct[p] = loans
      .filter((l) => String(l.type || "").toUpperCase() === p)
      .reduce((s, l) => s + Number(l.paid || 0), 0);
    disburseByProduct[p] = loans
      .filter(
        (l) =>
          String(l.type || "").toUpperCase() === p &&
          ["DISBURSED", "ACTIVE", "OVERDUE"].includes(
            String(l.status || "").toUpperCase(),
          ),
      )
      .reduce((s, l) => s + Number(l.principal || 0), 0);
  });
  const totalRepayments = loans.reduce((s, l) => s + Number(l.paid || 0), 0);
  const totalDisbursed = loans
    .filter((l) =>
      ["DISBURSED", "ACTIVE", "OVERDUE"].includes(
        String(l.status || "").toUpperCase(),
      ),
    )
    .reduce((s, l) => s + Number(l.principal || 0), 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Reports"
        title="Reports & analytics"
        description="Live KPI aggregates with daily, monthly, and yearly filtering."
        action={
          <button
            onClick={() =>
              exportToCSV(
                reportRows,
                [
                  { key: "label", label: "Period" },
                  { key: "deposits" },
                  { key: "withdrawals" },
                  { key: "repayments" },
                  { key: "disbursements" },
                  { key: "count" },
                ],
                "financial-reports.csv",
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Download size={14} />
            Export CSV
          </button>
        }
      />

      {/* Time filter */}
      <div className="flex items-center gap-3">
        {["daily", "monthly", "yearly"].map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeFilter(tf)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${timeFilter === tf ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* DEPOSITS GROUP */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-600" />
          <h5 className="text-base font-semibold text-slate-950">
            Total Deposits
          </h5>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            {formatCurrency(totalDeposits)}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">
              Share Capital
            </p>
            <p className="mt-1 text-xl font-semibold text-sky-700">
              {formatCurrency(shareCapitalDeposits)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Deposits allocated to share ownership
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">
              Savings Pools
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-700">
              {formatCurrency(savingsDeposits)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              General savings deposits
            </p>
          </div>
        </div>
      </div>

      {/* LOAN REPAYMENTS GROUP */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard size={20} className="text-sky-600" />
          <h5 className="text-base font-semibold text-slate-950">
            Loan Repayments
          </h5>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
            {formatCurrency(totalRepayments)}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {loanProducts.map((p) => (
            <div
              key={p}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-semibold text-slate-500">
                {p.charAt(0) + p.slice(1).toLowerCase()} Loans
              </p>
              <p className="mt-1 text-lg font-semibold text-sky-700">
                {formatCurrency(repayByProduct[p])}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* LOAN DISBURSEMENTS GROUP */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Banknote size={20} className="text-amber-600" />
          <h5 className="text-base font-semibold text-slate-950">
            Loan Disbursements
          </h5>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
            {formatCurrency(totalDisbursed)}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {loanProducts.map((p) => (
            <div
              key={p}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-semibold text-slate-500">
                {p.charAt(0) + p.slice(1).toLowerCase()} Loans
              </p>
              <p className="mt-1 text-lg font-semibold text-amber-700">
                {formatCurrency(disburseByProduct[p])}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel
          title={`Deposits (${timeFilter})`}
          data={timeSeries.map((s) => ({ label: s.label, value: s.deposits }))}
          type="bar"
          color="#8cc63f"
        />
        <AnalyticsPanel
          title={`Repayments (${timeFilter})`}
          data={timeSeries.map((s) => ({
            label: s.label,
            value: s.repayments,
          }))}
          type="bar"
          color="#0369a1"
        />
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50">
              {[
                "Period",
                "Deposits",
                "Withdrawals",
                "Repayments",
                "Disbursements",
                "Count",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {timeSeries.map((row, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-sm font-semibold">{row.label}</td>
                <td className="px-4 py-3 text-sm text-emerald-700">
                  {formatCurrency(row.deposits)}
                </td>
                <td className="px-4 py-3 text-sm text-rose-700">
                  {formatCurrency(row.withdrawals)}
                </td>
                <td className="px-4 py-3 text-sm text-sky-700">
                  {formatCurrency(row.repayments)}
                </td>
                <td className="px-4 py-3 text-sm text-amber-700">
                  {formatCurrency(row.disbursements)}
                </td>
                <td className="px-4 py-3 text-sm">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// DIVIDENDS
// ============================================================
function DividendsPage({ dividends }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Dividends"
        title="Historical distributions"
        description="Yearly dividend tracking."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {dividends.map((d, i) => (
          <div key={i} className="rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between">
              <h5 className="text-lg font-semibold">{d.year}</h5>
              <StatusBadge status={d.status} />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <strong>Rate:</strong> {d.rate}
              </p>
              <p>
                <strong>Distributed:</strong>{" "}
                {formatCurrency(d.totalDistributed)}
              </p>
              <p>
                <strong>Members:</strong> {d.membersCount}
              </p>
              <p>
                <strong>Declared:</strong> {formatDateSafe(d.declaredDate)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PROFILE SETTINGS — unified: profile image, edit profile, password change
// ============================================================
function FinancierProfileSettings({ user, stats, accessToken }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showing, setShowing] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [pwMessage, setPwMessage] = useState(null);
  const [profileImage, setProfileImage] = useState(
    user?.passportPhotoUrl || null,
  );
  const [imageFile, setImageFile] = useState(null);

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be under 1.5 MB." });
      return;
    }
    const preview = URL.createObjectURL(file);
    setProfileImage((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return preview;
    });
    setImageFile(file);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (passwords.new.length < 8) {
      setPwMessage({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPwMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setPwSaving(true);
    setPwMessage(null);
    try {
      await changePassword(
        { currentPassword: passwords.current, newPassword: passwords.new },
        accessToken,
      );
      setPwMessage({ type: "success", text: "Password changed successfully." });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPwMessage({
        type: "error",
        text: err?.message || "Failed to change password.",
      });
    } finally {
      setPwSaving(false);
    }
  }

  const pwField = (label, name) => (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="relative">
        <input
          type={showing[name] ? "text" : "password"}
          className="mt-1 w-full rounded-lg border px-3.5 py-3 pr-12 text-sm"
          value={passwords[name]}
          onChange={(e) =>
            setPasswords((c) => ({ ...c, [name]: e.target.value }))
          }
        />
        <button
          type="button"
          onClick={() => setShowing((s) => ({ ...s, [name]: !s[name] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500"
        >
          {showing[name] ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );

  return (
    <div className="max-w-6xl space-y-6">
      <SectionHeader eyebrow="Profile Settings" title="Manage your profile" />
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Image Section */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-500">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound size={32} />
            )}
          </div>
          <div>
            <h5 className="text-base font-semibold text-slate-950">
              Profile picture
            </h5>
            <p className="text-sm text-slate-500">
              Upload a clear profile photo.
            </p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Camera size={16} />
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageSelect}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Edit Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="space-y-4 rounded-lg border bg-white p-6"
        >
          <h5 className="text-base font-semibold text-slate-950">
            Personal information
          </h5>
          {[
            { l: "Full Name", n: "name", t: "text" },
            { l: "Email", n: "email", t: "email" },
            { l: "Phone", n: "phone", t: "text" },
          ].map((f) => (
            <label
              key={f.n}
              className="block text-sm font-semibold text-slate-700"
            >
              {f.l}
              <input
                type={f.t}
                className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm"
                value={form[f.n]}
                onChange={(e) =>
                  setForm((c) => ({ ...c, [f.n]: e.target.value }))
                }
              />
            </label>
          ))}
          <button
            disabled={saving}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            {saving ? (
              <RefreshCw className="animate-spin" size={17} />
            ) : (
              <CheckCircle2 size={17} />
            )}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <div className="space-y-4">
          {/* Change Password Form */}
          {pwMessage && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-medium ${pwMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
            >
              {pwMessage.text}
            </div>
          )}
          <form
            onSubmit={handlePasswordSubmit}
            className="space-y-4 rounded-lg border bg-white p-6"
          >
            <h5 className="text-base font-semibold text-slate-950">
              Change password
            </h5>
            {pwField("Current password", "current")}
            {pwField("New password", "new")}
            {pwField("Confirm new password", "confirm")}
            <button
              disabled={pwSaving}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              <LockKeyhole size={17} />
              {pwSaving ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
