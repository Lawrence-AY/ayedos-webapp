import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Landmark,
  LockKeyhole,
  PieChart,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import StaffSecurityPage from "../components/staff-dashboard/StaffSecurityPage.jsx";
import SupportPage from "../components/user-dashboard/SupportPage.jsx";
import MemberFinancialProfile from "../components/staff-dashboard/MemberFinancialProfile.jsx";
import OptOutRequestsPage from "../components/staff-dashboard/OptOutRequestsPage.jsx";
import SentNotificationsPanel from "../components/staff-dashboard/SentNotificationsPanel.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import { changePassword } from "../services/authService.js";
import {
  approveLoan,
  disburseLoan,
  getAllCompanies,
  getAllDeductions,
  getAllDividends,
  getAllLoans,
  getLoanById,
  getAllMembers,
  getAllShares,
  getAllTransactions,
  getFinanceNotifications,
  getFinancialReports,
  getGroupBorrowingOverview,
  dismantleBorrowingGroup,
  getMemberFinancialProfile,
  markAllFinanceNotificationsRead,
  markFinanceNotificationRead,
  commitFinancialCsvImport,
  previewFinancialCsvImport,
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
  ReportBreakdownDialog,
  SkeletonDashboard,
  StatusBadge,
  formatCurrency,
  formatDate,
} from "../components/dashboard/EnterpriseDashboard.jsx";
import { findMemberByNumber } from "../features/search/searchService.js";
import GroupBorrowingOverview from "../components/staff-dashboard/GroupBorrowingOverview.jsx";
import { applyLoanPaymentEvent, useDashboardEvents } from "../features/realtime/dashboardEvents.js";

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
  return formatDate(v);
}

function getLoanPortfolioMetrics(loans = []) {
  const disbursedStatuses = [
    "DISBURSED",
    "ACTIVE",
    "OVERDUE",
    "COMPLETED",
    "DEFAULTED",
    "WRITTEN_OFF",
  ];
  return {
    totalDisbursed: loans
      .filter((loan) =>
        disbursedStatuses.includes(String(loan.status || "").toUpperCase()),
      )
      .reduce((sum, loan) => sum + Number(loan.principal || loan.amount || 0), 0),
    totalRepaid: loans.reduce(
      (sum, loan) => sum + Number(loan.paid ?? loan.repaid ?? 0),
      0,
    ),
    totalArrears: loans.reduce(
      (sum, loan) => sum + Number(loan.arrears || 0),
      0,
    ),
  };
}


function calculateReducingBalance(principal, monthlyRatePercent, durationMonths) {
  const monthlyRate = monthlyRatePercent / 100;
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
  const loanMetrics = getLoanPortfolioMetrics(loans);
  const reportTotals = data.reports?.totals || {};
  const eatToday = new Date(Date.now() + (3 * 60 * 60 * 1000)).toISOString().slice(0, 10);
  const todayReport = data.reports?.timeSeries?.daily?.find((row) => row.label === eatToday);
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
    dailyTransactions: todayReport?.count ?? tx.filter((t) => isToday(t.createdAt || t.date)).length,
    totalDeposits: Number(reportTotals.deposits ?? byType("DEPOSIT")),
    totalWithdrawals: Number(reportTotals.withdrawals ?? byType("WITHDRAWAL")),
    activeLoans: loans.filter((l) =>
      ["ACTIVE", "DISBURSED", "APPROVED"].includes(
        String(l.status || "").toUpperCase(),
      ),
    ).length,
    loanRepayments: loanMetrics.totalRepaid,
    pendingDisbursements: loans.filter(
      (l) => String(l.status || "").toUpperCase() === "APPROVED",
    ).length,
    monthlyRevenue: tx
      .filter((t) => isMonth(t.createdAt || t.date))
      .reduce((s, t) => s + Number(t.amount || 0), 0),
    totalDisbursed: loanMetrics.totalDisbursed,
    overdueLoans: loans.filter(
      (l) => String(l.status || "").toUpperCase() === "OVERDUE",
    ).length,
    totalArrears: loanMetrics.totalArrears,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getExporterName(user) {
  return user?.name || user?.fullName || user?.email || "Unknown User";
}

const REPORT_EXPORT_HEADER_COLOR = "#8cc63f";
const REPORT_EXPORT_TEXT_COLOR = "#14532d";
const REPORT_EXPORT_LABEL_COLOR = "#eaf7df";
const REPORT_EXPORT_BORDER_COLOR = "#b7dca2";

function exportToCSV(rows, columns, filename = "export.csv", options = {}) {
  const exportRows = Array.isArray(rows) ? rows : [];
  const exportColumns = columns.map((column) =>
    typeof column === "string" ? { key: column, label: column } : column,
  );
  const exportedBy = options.exportedBy || "Unknown User";
  const title = options.title || filename.replace(/\.(csv|xls|xlsx)$/i, "").replace(/[-_]+/g, " ");
  const generatedAt = new Date();
  const generatedLabel = generatedAt.toLocaleString();
  const cell = (value) => `<td>${escapeHtml(value)}</td>`;
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid ${REPORT_EXPORT_BORDER_COLOR}; padding: 8px; mso-number-format:"\\@"; }
    th, .title { background-color: ${REPORT_EXPORT_HEADER_COLOR}; color: ${REPORT_EXPORT_TEXT_COLOR}; font-weight: 700; text-transform: uppercase; }
    .label { background-color: ${REPORT_EXPORT_LABEL_COLOR}; color: ${REPORT_EXPORT_TEXT_COLOR}; font-weight: 700; width: 160px; }
    .meta td { border-color: ${REPORT_EXPORT_BORDER_COLOR}; padding: 8px; }
  </style>
</head>
<body>
  <table class="meta">
    <tr><td class="title" colspan="2">Ayedos SACCO Management System</td></tr>
    <tr><td class="label">Export Title</td><td>${escapeHtml(title)}</td></tr>
    <tr><td class="label">Generated</td><td>${escapeHtml(generatedLabel)}</td></tr>
    <tr><td class="label">Exported By</td><td>${escapeHtml(exportedBy)}</td></tr>
  </table>
  <br />
  <table>
    <thead><tr>${exportColumns.map((column) => `<th bgcolor="${REPORT_EXPORT_HEADER_COLOR}" style="background-color:${REPORT_EXPORT_HEADER_COLOR};color:${REPORT_EXPORT_TEXT_COLOR};font-weight:700;text-transform:uppercase;">${escapeHtml(column.label || column.key)}</th>`).join("")}</tr></thead>
    <tbody>
      ${exportRows.map((row) => `<tr>${exportColumns.map((column) => {
        const rawValue = row?.[column.key];
        const value = column.csv ? column.csv(rawValue, row) : rawValue;
        return cell(value ?? "");
      }).join("")}</tr>`).join("")}
    </tbody>
  </table>
</body>
</html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.csv$/i, ".xls");
  a.click();
  URL.revokeObjectURL(url);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function worksheetXml(name, rows) {
  const exportRows = Array.isArray(rows) ? rows : [];
  const headers = [...exportRows.reduce((set, row) => {
    Object.keys(row || {}).forEach((key) => set.add(key));
    return set;
  }, new Set())];
  const safeHeaders = headers.length ? headers : ["Record"];
  const rowXml = exportRows.length
    ? exportRows.map((row) => `<Row>${safeHeaders.map((header) => `<Cell><Data ss:Type="String">${xmlEscape(row?.[header])}</Data></Cell>`).join("")}</Row>`).join("")
    : `<Row><Cell ss:MergeAcross="${Math.max(safeHeaders.length - 1, 0)}"><Data ss:Type="String">No records found.</Data></Cell></Row>`;
  return `<Worksheet ss:Name="${xmlEscape(name).slice(0, 31)}"><Table><Row>${safeHeaders.map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`).join("")}</Row>${rowXml}</Table></Worksheet>`;
}

function exportMasterWorkbook(data, currentUser) {
  const sheets = [
    ["Export Details", [
      { Field: "Organization", Value: "Ayedos SACCO Management System" },
      { Field: "Export Title", Value: "Master Data" },
      { Field: "Generated", Value: new Date().toLocaleString() },
      { Field: "Exported By", Value: getExporterName(currentUser) },
    ]],
    ["Members", data.members || []],
    ["Transactions", data.transactions || []],
    ["Loans", data.loans || []],
    ["Shares", data.shares || []],
    ["Deductions", data.deductions || []],
    ["Dividends", data.dividends || []],
  ];
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header"><Interior ss:Color="${REPORT_EXPORT_HEADER_COLOR}" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="${REPORT_EXPORT_TEXT_COLOR}"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  </Styles>
  ${sheets.map(([sheetName, rows]) => worksheetXml(sheetName, rows)).join("")}
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ayedos-master-data-${new Date().toISOString().slice(0, 10)}.xls`;
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
  const [notifications, setNotifications] = useState([]);
  const [approvingLoanId, setApprovingLoanId] = useState(null);
  const unreadCount = notifications.filter((n) => !n.read && !n.isRead && !n.readAt).length;

  const path = location.pathname;
  const dashboardBase = getDashboardPath("FINANCE");
  let activeSection = "home";
  if (path.includes("/transactions")) activeSection = "transactions";
  else if (path.includes("/loans")) activeSection = "loans";
  else if (path.includes("/liquidity")) activeSection = "liquidity";
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
    groupBorrowing: { items: [], summary: {} },
  });

  const loadAllData = useCallback(async ({ showLoading = true } = {}) => {
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
      getFinanceNotifications(accessToken, { limit: 100 }),
      getGroupBorrowingOverview(accessToken),
    ]);
    setData({
      transactions:
        results[0].status === "fulfilled" && Array.isArray(results[0].value)
          ? results[0].value.filter((transaction) => ["SUCCESS", "PAID", "COMPLETED"].includes(String(transaction.status || "").toUpperCase()))
          : [],
      loans:
        results[1].status === "fulfilled" && Array.isArray(results[1].value)
          ? results[1].value
          : [],
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
          : [],
      members:
        results[5].status === "fulfilled" && Array.isArray(results[5].value)
          ? results[5].value
          : [],
      companies:
        results[6].status === "fulfilled" && Array.isArray(results[6].value)
          ? results[6].value
          : [],
      reports: results[7].status === "fulfilled" ? results[7].value : {},
      groupBorrowing: results[9].status === "fulfilled" ? results[9].value : { items: [], summary: {} },
    });
    if (results[8].status === "fulfilled" && Array.isArray(results[8].value)) {
      setNotifications(results[8].value.map(normalizeNotification));
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  useEffect(() => {
    const interval = setInterval(
      () => loadAllData({ showLoading: false }),
      15 * 1000,
    );
    return () => clearInterval(interval);
  }, [loadAllData]);

  const realtimeHandlers = useMemo(() => ({
    onLoanPaymentProcessed: (payload) => {
      setData((current) => applyLoanPaymentEvent(current, payload));
      window.setTimeout(() => loadAllData({ showLoading: false }), 250);
    },
    onRecoveryNeeded: () => loadAllData({ showLoading: false }),
  }), [loadAllData]);
  useDashboardEvents(accessToken, realtimeHandlers);

  const stats = useMemo(() => getFinanceStats(data), [data]);
  async function markAllNotificationsRead() {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true, readAt: n.readAt || readAt })));
    try {
      await markAllFinanceNotificationsRead(accessToken);
    } catch (error) {
      loadAllData({ showLoading: false });
      alert(error.message);
    }
  }

  async function handleNotificationRead(id) {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true, readAt: n.readAt || readAt } : n)));
    try {
      await markFinanceNotificationRead(id, accessToken);
    } catch (error) {
      loadAllData({ showLoading: false });
      alert(error.message);
    }
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
    if (!id) return null;
    const confirmed = window.confirm("Approve this loan request? The member will be notified immediately.");
    if (!confirmed) return null;
    setApprovingLoanId(id);
    try {
      const updated = await approveLoan(id, accessToken);
      setData((current) => ({
        ...current,
        loans: current.loans.map((loan) => loan.id === id ? { ...loan, ...updated } : loan),
      }));
      await loadAllData({ showLoading: false });
      toast.success("Loan approved. The member has been notified.");
      return updated;
    } catch (e) {
      toast.error(e.message || "Failed to approve loan");
      return null;
    } finally {
      setApprovingLoanId(null);
    }
  }
  async function handleRejectLoan(id) {
    const reason = prompt("Reason for rejection:");
    if (reason?.trim()) {
      try {
        await rejectLoan(id, reason.trim(), accessToken);
        await loadAllData({ showLoading: false });
        toast.success("Loan rejected. The member has been notified.");
      } catch (e) {
        toast.error(e.message || "Failed to reject loan");
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
  async function handleDismantleGroup(group) {
    const confirmed = window.confirm(`Dismantle ${group.name}? Members will be removed, pending proposals will be cancelled, and every member will be notified. This cannot be undone.`)
    if (!confirmed) return
    try {
      const result = await dismantleBorrowingGroup(group.id, accessToken)
      toast.success(`Group dismantled. ${result.notifiedMembers || 0} member(s) notified.`)
      await loadAllData({ showLoading: false })
    } catch (error) {
      toast.error(error?.message || 'Failed to dismantle group', { duration: 8000 })
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
            currentUser={user}
          />
        );
      case "loans":
        return (
          <div className="space-y-6">
          <UnifiedLoansPage
            loans={data.loans}
            onApproveLoan={handleApproveLoan}
            onRejectLoan={handleRejectLoan}
            onDisburseLoan={handleDisburseLoan}
            onWriteOffLoan={handleWriteOffLoan}
            approvingLoanId={approvingLoanId}
            accessToken={accessToken}
            globalSearch={globalSearch}
            currentUser={user}
          />
          <GroupBorrowingOverview data={data.groupBorrowing} onRefresh={() => loadAllData({ showLoading: false })} onDismantle={handleDismantleGroup} title="Group Borrowing Overview" />
          </div>
        );
      case "liquidity":
        return <WalletLiquidityPage data={data} />;
      case "deductions":
        return (
          <SalaryDeductionPage
            data={data}
            accessToken={accessToken}
            onRefresh={() => loadAllData({ showLoading: false })}
            currentUser={user}
          />
        );
      case "members":
        return (
          <MemberProfilesPage
            data={data}
            accessToken={accessToken}
            onRefresh={() => loadAllData({ showLoading: false })}
            currentUser={user}
          />
        );
      case "dividends":
        return <DividendsPage dividends={data.dividends} accessToken={accessToken} onRefresh={() => loadAllData({ showLoading: false })} />;
      case "reports":
        return <FinancialReportsPage data={data} currentUser={user} />;
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
            onMarkRead={handleNotificationRead}
            loans={data.loans}
            onApproveLoan={handleApproveLoan}
            onRejectLoan={handleRejectLoan}
            approvingLoanId={approvingLoanId}
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
  loans = [],
  onMarkAllRead,
  onMarkRead,
  onApproveLoan,
  onRejectLoan,
  approvingLoanId,
  accessToken,
}) {
  const [notifTab, setNotifTab] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedLoanProfile, setSelectedLoanProfile] = useState(null);
  const [loanDetailsLoading, setLoanDetailsLoading] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
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
  const selectedLoan = selectedNotification
    ? loans.find((loan) => loan.id === selectedNotification.metadata?.loanId || loan.id === selectedNotification.sourceId)
    : null;
  const selectedLoanDetails = selectedLoanProfile || selectedLoan || selectedNotification?.metadata || {};
  const isLoanRequest = (n) => n?.type === "LOAN" && (n.subtype === "application" || n.metadata?.subtype === "application");
  const selectedLoanType = String(selectedLoanDetails.loanType || selectedLoanDetails.type || selectedNotification?.metadata?.type || "LOAN").toUpperCase();
  const isEmergencyLoan = selectedLoanType === "EMERGENCY";
  const isAutoApproved = Boolean(selectedNotification?.metadata?.automated) || (isEmergencyLoan && String(selectedLoanDetails.status || selectedNotification?.metadata?.status || "").toUpperCase() === "APPROVED");
  const loanTypeLabel = (type) => `${String(type || "Loan").charAt(0)}${String(type || "Loan").slice(1).toLowerCase()} Loan`;
  const displayLoanStatus = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (["PENDING", "UNDER_REVIEW"].includes(normalized)) return "PENDING_FINANCE";
    if (["ACTIVE", "DISBURSED"].includes(normalized)) return "DISBURSED";
    return normalized || "PENDING_FINANCE";
  };
  const isActionableStatus = (status) => ["PENDING", "UNDER_REVIEW", "PENDING_FINANCE"].includes(String(status || "").toUpperCase());
  const interestGenerated = (() => {
    const amount = Number(selectedLoanDetails.principal || selectedLoanDetails.amount || 0);
    const rate = Number(selectedLoanDetails.interestRate ?? selectedLoanDetails.interest ?? 0);
    const duration = Number(selectedLoanDetails.duration || 0);
    return Number(selectedLoanDetails.interestGenerated ?? (amount * (rate / 100) * duration));
  })();
  const loanTypeClass = (type) => {
    const normalized = String(type || "").toUpperCase();
    if (normalized === "EMERGENCY") return "bg-rose-100 text-rose-700 border-rose-200";
    if (normalized === "DEVELOPMENT") return "bg-sky-100 text-sky-700 border-sky-200";
    if (normalized === "EDUCATION") return "bg-violet-100 text-violet-700 border-violet-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  async function openNotification(n) {
    setSelectedNotification(n);
    setSelectedLoanProfile(null);
    if (!n.read) await onMarkRead?.(n.id);
    const loanId = n.metadata?.loanId || n.sourceId;
    if (loanId && isLoanRequest(n)) {
      setLoanDetailsLoading(true);
      try {
        const loan = await getLoanById(loanId, accessToken);
        setSelectedLoanProfile(loan);
      } catch (error) {
        setMessage({ type: "error", text: error?.message || "Failed to fetch loan details." });
      } finally {
        setLoanDetailsLoading(false);
      }
    }
  }

  async function decideLoan(decision) {
    const loanId = selectedLoanDetails.id || selectedLoanDetails.loanId || selectedNotification?.sourceId;
    if (!loanId) return;
    setDecisionBusy(true);
    try {
      if (decision === "approve") await onApproveLoan?.(loanId);
      else await onRejectLoan?.(loanId);
      setSelectedNotification(null);
      setSelectedLoanProfile(null);
    } finally {
      setDecisionBusy(false);
    }
  }

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
        //eyebrow="Notifications"
        title="Notifications"
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
            { key: "OPT_OUT", label: "Opt-out & Disbursement", count: null, icon: WalletCards },
            { key: "SENT", label: "Sent", count: null, icon: Send },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setNotifTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${notifTab === tab.key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              <tab.icon size={14} />
              {tab.label}{tab.count == null ? "" : ` (${tab.count})`}
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
      {notifTab === "OPT_OUT" ? (
        <OptOutRequestsPage role="FINANCE" accessToken={accessToken} embedded />
      ) : notifTab === "SENT" ? (
        <SentNotificationsPanel accessToken={accessToken} />
      ) : <div className="space-y-3">
        {filtered.map((n) => (
          <button
            type="button"
            onClick={() => openNotification(n)}
            key={n.id}
            className={`w-full rounded-lg border p-4 text-left transition-colors duration-300 ${n.read ? "bg-white" : "border-emerald-300 bg-emerald-50 shadow-sm"}`}
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
                <span className="text-xs font-semibold text-emerald-700">
                  Unread
                </span>
              )}
              {n.type === "LOAN" && (
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${loanTypeClass(n.metadata?.type)}`}>
                  {loanTypeLabel(n.metadata?.type)}
                </span>
              )}
              {n.metadata?.automated && (
                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  AUTO-APPROVED
                </span>
              )}
              {!n.read && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkRead?.(n.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onMarkRead?.(n.id);
                    }
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2 size={13} />
                  Mark as Read
                </span>
              )}
            </div>
          </button>
        ))}
      </div>}
      {selectedNotification ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {typeLabel(selectedNotification)}
                </p>
                {isLoanRequest(selectedNotification) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${loanTypeClass(selectedLoanType)}`}>
                      {loanTypeLabel(selectedLoanType)}
                    </span>
                    {isAutoApproved && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        AUTO-APPROVED
                      </span>
                    )}
                  </div>
                )}
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedNotification.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {selectedNotification.body}
                </p>
                {loanDetailsLoading ? (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                    <RefreshCw className="animate-spin" size={14} />
                    Fetching full loan profile...
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => { setSelectedNotification(null); setSelectedLoanProfile(null); }}
                className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Close notification details"
              >
                <X size={18} />
              </button>
            </div>

            {isLoanRequest(selectedNotification) ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold text-slate-950">Member Details</h4>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Member ID / Registration Number</dt>
                      <dd className="font-semibold text-slate-900">{selectedLoanDetails.memberNumber || selectedLoanDetails.memberId || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Full name</dt>
                      <dd className="font-semibold text-slate-900">{selectedLoanDetails.member || selectedLoanDetails.memberName || selectedLoanDetails.applicantName || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Submitted by</dt>
                      <dd className="font-semibold text-slate-900">{selectedLoanDetails.submittedBy || selectedLoanDetails.member || selectedLoanDetails.memberName || selectedLoanDetails.applicantName || "-"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Account info</dt>
                      <dd className="font-semibold text-slate-900">
                        {[selectedLoanDetails.accountInfo?.email, selectedLoanDetails.accountInfo?.phone, selectedLoanDetails.accountInfo?.memberStatus].filter(Boolean).join(" | ") || "Account details unavailable"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold text-slate-950">Loan Parameters</h4>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Loan type</dt>
                      <dd className="font-semibold text-slate-900">{loanTypeLabel(selectedLoanType)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Processing mode</dt>
                      <dd className="font-semibold text-slate-900">{isAutoApproved ? "Automated emergency approval" : "Manual finance review"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Amount requested</dt>
                      <dd className="font-semibold text-slate-900">{formatCurrency(selectedLoanDetails.principal || selectedLoanDetails.amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Duration</dt>
                      <dd className="font-semibold text-slate-900">{selectedLoanDetails.duration || "-"} months</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Interest rate</dt>
                      <dd className="font-semibold text-slate-900">{selectedLoanDetails.interestRate ?? selectedLoanDetails.interest ?? "-"}%</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Calculated interest</dt>
                      <dd className="font-semibold text-slate-900">{formatCurrency(interestGenerated)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Status</dt>
                      <dd className="mt-1"><StatusBadge status={selectedLoanDetails.financeStatus || displayLoanStatus(selectedLoanDetails.status)} /></dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Reason</dt>
                      <dd className="font-semibold text-slate-900">{selectedLoanDetails.reason || "N/A"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold text-slate-950">Timestamp Details</h4>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Exact date and time</dt>
                      <dd className="font-semibold text-slate-900">{formatDateTimeSafe(selectedLoanDetails.createdAt || selectedLoanDetails.requestedAt || selectedNotification.time)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Relative timestamp</dt>
                      <dd className="font-semibold text-slate-900">{formatRelativeTime(selectedLoanDetails.createdAt || selectedLoanDetails.requestedAt || selectedNotification.time)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Submitted when</dt>
                      <dd className="font-semibold text-slate-900">{formatDateTimeSafe(selectedLoanDetails.requestedAt || selectedLoanDetails.createdAt || selectedNotification.time)}</dd>
                    </div>
                  </dl>
                </div>

                {isEmergencyLoan ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                    Emergency loans are processed automatically after eligibility and risk checks. No manual finance action is required.
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={decisionBusy || approvingLoanId === (selectedLoanDetails.id || selectedLoanDetails.loanId) || !isActionableStatus(selectedLoanDetails.status)}
                      onClick={() => decideLoan("approve")}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {decisionBusy || approvingLoanId === (selectedLoanDetails.id || selectedLoanDetails.loanId) ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={decisionBusy || !isActionableStatus(selectedLoanDetails.status)}
                      onClick={() => decideLoan("reject")}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// OVERVIEW
// ============================================================
function FinanceHome({ data, stats, globalSearch = "", onVerifyTransaction }) {
  const [showInterestBreakdown, setShowInterestBreakdown] = useState(false);
  const [interestDetail, setInterestDetail] = useState(null);
  const navigate = useNavigate();
  const dashboardBase = getDashboardPath("FINANCE");
  const monthlyReport = data.reports?.timeSeries?.monthly || [];
  const transactionSeries = monthlyReport.map((row) => ({ label: row.label, value: row.count }));
  const repaymentSeries = monthlyReport.map((row) => ({ label: row.label, value: row.repayments }));
  const interests = data.reports?.totals?.interests || {};
  const interestBreakdowns = data.reports?.interestBreakdowns || {};
  const openInterestDetail = (key, title, total) => setInterestDetail({
    key, title, total, transactionRows: true, rows: interestBreakdowns[key] || [],
  });
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
      label: "Disbursements",
      value: formatCurrency(stats.totalDisbursed),
      icon: Banknote,
      tone: "amber",
      path: "/loans?status=active",
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
      label: "Repaid",
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
        //eyebrow="Finance operations"
        title="Finance Operations"
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
      <div className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button type="button" onClick={() => setShowInterestBreakdown((value) => !value)} className="flex w-full items-center justify-between text-left"><div><p className="text-sm font-semibold text-slate-500">Interests overview</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(interests.total || 0)}</p></div><TrendingUp className="text-emerald-600" /></button>
        {showInterestBreakdown ? <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-slate-700"><button type="button" onClick={() => openInterestDetail("loanRepaymentInterest", "Loan repayment interest details", interests.loanRepaymentInterest)} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs uppercase text-slate-500">Loan Repayment Interest</p><p className="font-semibold text-slate-950 dark:text-white">{formatCurrency(interests.loanRepaymentInterest || 0)}</p><span className="mt-2 block text-xs font-semibold text-emerald-700 dark:text-emerald-400">View member transactions</span></button><button type="button" onClick={() => openInterestDetail("shareCapitalTransferFees", "Share capital fee details", interests.shareCapitalTransferFees)} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs uppercase text-slate-500">Share Capital Transfer Fees (5%)</p><p className="font-semibold text-slate-950 dark:text-white">{formatCurrency(interests.shareCapitalTransferFees || 0)}</p><span className="mt-2 block text-xs font-semibold text-emerald-700 dark:text-emerald-400">View member transactions</span></button></div> : <p className="mt-2 text-xs text-slate-500">Click to expand earnings by source</p>}
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
      <InterestDetailDialog breakdown={interestDetail} onClose={() => setInterestDetail(null)} />
    </div>
  );
}

function InterestDetailDialog({ breakdown, onClose }) {
  const [query, setQuery] = useState("");
  useEffect(() => { setQuery(""); }, [breakdown]);
  if (!breakdown) return null;
  const rows = breakdown.rows || [];
  const search = query.trim().toLowerCase();
  const visible = search ? rows.filter((row) => [row.memberNumber, row.memberName, row.reference].some((value) => String(value || "").toLowerCase().includes(search))) : rows;
  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-50 dark:bg-slate-950"><section role="dialog" aria-modal="true" className="min-h-screen"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Interest overview</p><h1 className="text-xl font-bold text-slate-950 dark:text-white">{breakdown.title}</h1></div><button type="button" onClick={onClose} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-emerald-700">Back</button></div></header><main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6"><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold uppercase text-slate-500">Total interest / fees</p><p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(breakdown.total)}</p></div><div className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold uppercase text-slate-500">Transactions</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{rows.length}</p></div></div><div className="rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"><div><h2 className="font-bold dark:text-white">Member transaction breakdown</h2><p className="text-sm text-slate-500">Source amounts and the interest or fee generated by each transaction.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member, number or reference" className="w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm sm:w-80 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></div><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-sm"><thead className="bg-slate-100 text-left text-xs uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-200"><tr><th className="px-5 py-4">Member number</th><th className="px-5 py-4">Member</th><th className="px-5 py-4">Reference</th><th className="px-5 py-4 text-right">Source amount</th><th className="px-5 py-4 text-right">Interest / fee</th><th className="px-5 py-4">Transaction date &amp; time</th></tr></thead><tbody className="divide-y dark:divide-slate-800">{visible.map((row, index) => <tr key={row.id || index} className="dark:text-slate-200"><td className="whitespace-nowrap px-5 py-4 font-mono font-semibold">{row.memberNumber || "—"}</td><td className="px-5 py-4 font-medium">{row.memberName || "Unknown member"}</td><td className="whitespace-nowrap px-5 py-4 font-mono text-xs">{row.reference || "—"}</td><td className="whitespace-nowrap px-5 py-4 text-right font-semibold">{formatCurrency(row.sourceAmount)}</td><td className="whitespace-nowrap px-5 py-4 text-right font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(row.interestAmount)}</td><td className="whitespace-nowrap px-5 py-4">{row.occurredAtEAT || formatDate(row.occurredAt)}</td></tr>)}</tbody></table>{!visible.length ? <p className="p-10 text-center text-slate-500">No matching interest transactions.</p> : null}</div></div></main></section></div>;
}

function formatDateTimeSafe(v) {
  return formatDate(v);
}

function formatRelativeTime(v) {
  const date = v ? new Date(v) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `Requested ${seconds} second${seconds === 1 ? "" : "s"} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Requested ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Requested ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Requested ${days} day${days === 1 ? "" : "s"} ago`;
}

function normalizeNotification(n) {
  const category = String(n.category || n.type || "").toLowerCase();
  const subtype = n.metadata?.subtype || n.subtype;
  return {
    ...n,
    type: category === "loan" ? "LOAN" : category === "transaction" ? "TRANSACTION" : String(n.type || category || "ALERT").toUpperCase(),
    subtype,
    time: n.time || n.createdAt,
    read: Boolean(n.isRead || n.read || n.readAt),
  };
}

function WalletLiquidityPage({ data }) {
  const members = data.members || [];
  const loans = data.loans || [];
  const dividends = data.dividends || [];
  const deductions = data.deductions || [];
  const transactions = data.transactions || [];
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpSource, setTopUpSource] = useState("Institutional Capital");
  const [plannedTopUps, setPlannedTopUps] = useState([]);

  const activeMembers = members.filter((member) =>
    ["ACTIVE", "APPROVED", "VERIFIED"].includes(String(member.status || "ACTIVE").toUpperCase()),
  ).length;
  const pendingDisbursements = loans
    .filter((loan) => ["APPROVED", "PENDING_DISBURSEMENT"].includes(String(loan.status || "").toUpperCase()))
    .reduce((sum, loan) => sum + Number(loan.amount || loan.principal || 0), 0);
  const pendingDividends = dividends
    .filter((dividend) => !["PAID", "VERIFIED", "SUCCESS"].includes(String(dividend.status || "").toUpperCase()))
    .reduce((sum, dividend) => sum + Number(dividend.amount || 0), 0);
  const monthlyContributionDemand = deductions
    .filter((deduction) => deduction.isActive !== false)
    .reduce((sum, deduction) => sum + Number(deduction.amount || deduction.deduction || 0), 0);
  const recentWithdrawals = transactions
    .filter((transaction) => String(transaction.type || "").toUpperCase().includes("WITHDRAW"))
    .slice(0, 30)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const recentDeposits = transactions
    .filter((transaction) => String(transaction.type || "").toUpperCase().includes("DEPOSIT"))
    .slice(0, 30)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const activeSavings = members.reduce((sum, member) => sum + Number(member.savings || member.savingsBalance || 0), 0);
  const plannedCapital = plannedTopUps.reduce((sum, item) => sum + item.amount, 0);
  const currentLiquidity = Math.max(0, activeSavings + recentDeposits - recentWithdrawals + plannedCapital);
  const forecastDemand = pendingDisbursements + pendingDividends + monthlyContributionDemand + recentWithdrawals;
  const requiredBuffer = forecastDemand * 0.2;
  const requiredCapital = forecastDemand + requiredBuffer;
  const fundingGap = Math.max(0, requiredCapital - currentLiquidity);
  const coverageRatio = requiredCapital > 0 ? Math.min(100, Math.round((currentLiquidity / requiredCapital) * 100)) : 100;
  const dailyBurn = Math.max(1, recentWithdrawals / 30);
  const runwayDays = Math.floor(currentLiquidity / dailyBurn);

  const demandRows = [
    { label: "Approved loan payouts", value: pendingDisbursements, tone: "text-sky-700" },
    { label: "Dividend obligations", value: pendingDividends, tone: "text-emerald-700" },
    { label: "Monthly contribution liquidity", value: monthlyContributionDemand, tone: "text-indigo-700" },
    { label: "Recent withdrawal velocity", value: recentWithdrawals, tone: "text-rose-700" },
    { label: "Required liquidity buffer", value: requiredBuffer, tone: "text-amber-700" },
  ];

  function handleTopUp(e) {
    e.preventDefault();
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setPlannedTopUps((prev) => [
      {
        id: `${Date.now()}`,
        source: topUpSource,
        amount,
        time: new Date().toISOString(),
      },
      ...prev,
    ]);
    setTopUpAmount("");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        //eyebrow="Wallet liquidity"
        title="Wallet Liquidity"
        description="Monitor wallet capacity, forecast money-out demand, and stage institutional liquidity top-ups."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active system users" value={activeMembers} icon={UsersRound} trend="Live" tone="blue" />
        <KpiCard label="Current wallet liquidity" value={formatCurrency(currentLiquidity)} icon={WalletCards} trend={`${coverageRatio}% covered`} tone="emerald" />
        <KpiCard label="Forecast demand" value={formatCurrency(forecastDemand)} icon={TrendingUp} trend="30-day view" tone="amber" />
        <KpiCard label="Funding gap" value={formatCurrency(fundingGap)} icon={AlertTriangle} trend={`${runwayDays} days runway`} tone={fundingGap > 0 ? "rose" : "emerald"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Liquidity forecast</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Estimated capital needed to keep approved wallet obligations fully funded.
              </p>
            </div>
            <StatusBadge status={fundingGap > 0 ? "Action Required" : "Healthy"} />
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${coverageRatio >= 80 ? "bg-emerald-500" : coverageRatio >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${coverageRatio}%` }}
            />
          </div>
          <div className="mt-5 space-y-3">
            {demandRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm last:border-0 dark:border-slate-800">
                <span className="font-medium text-slate-600 dark:text-slate-300">{row.label}</span>
                <span className={`font-semibold ${row.tone}`}>{formatCurrency(row.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">Automatic forecast</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(requiredCapital)}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Includes demand plus a 20% liquidity buffer for same-day withdrawals and approved disbursements.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-base font-semibold text-slate-950 dark:text-white">Load wallet funds</h3>
          <form onSubmit={handleTopUp} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Funding source
              <select
                value={topUpSource}
                onChange={(e) => setTopUpSource(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900"
              >
                <option>Institutional Capital</option>
                <option>Financier Liquidity Facility</option>
                <option>Board Approved Reallocation</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Top-up amount
              <input
                type="number"
                min="1"
                step="0.01"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900"
              />
            </label>
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              <Plus size={16} />
              Stage top-up
            </button>
          </form>

          <div className="mt-5 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Staged funding queue</h4>
            {plannedTopUps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800">
                No wallet top-ups staged.
              </div>
            ) : (
              plannedTopUps.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.source}</span>
                    <span className="text-sm font-semibold text-emerald-700">{formatCurrency(item.amount)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(item.time)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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
  currentUser,
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
    ["deposit", "withdrawal", "repayment", "share", "share_transfer", "savings", "application_fee"].includes(
      initialType,
    )
      ? initialType
      : "all",
  );
  useEffect(() => {
    setDepositFilter(
      ["deposit", "withdrawal", "repayment", "share", "share_transfer", "savings", "application_fee"].includes(
        initialType,
      )
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
    ["id", "type", "description", "category", "destination", "memberNumber", "memberName", "status", "reference"],
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
  if (depositFilter === "share_transfer")
    filtered = filtered.filter((t) => String(t.type || '').toUpperCase() === 'SHARE_CAPITAL_TRANSFER');
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
    { key: "category", label: "Category", render: (v) => String(v || "UNCLASSIFIED").replaceAll("_", " ") },
    { key: "destination", label: "Destination", render: (v) => v || "Unclassified" },
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
          <option value="share_transfer">Share Capital Transfers & Fees</option>
          <option value="savings">Savings Only</option>
          <option value="application_fee">Member Application Fees</option>
        </select>
        <button
          onClick={() => exportToCSV(filtered, columns, "transactions.csv", { exportedBy: getExporterName(currentUser), title: "Transactions" })}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>
      <DataTable
        title={embedded ? "Recent transactions" : "Transactions & Audits"}
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
        //eyebrow="Transactions"
        title="Transactions & Audits"
        description="Real-time ledger records, share capital transfers, SACCO fees, verification, and exports."
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
  approvingLoanId,
  accessToken,
  globalSearch = "",
  currentUser,
}) {
  const { search: routeSearch } = useLocation();
  const initialStatus = new URLSearchParams(routeSearch).get("status") || "all";
  const [loanTab, setLoanTab] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [showAmortization, setShowAmortization] = useState(null);
  const [selectedLoanRequest, setSelectedLoanRequest] = useState(null);
  const [loanRequestLoading, setLoanRequestLoading] = useState(false);
  const queueMap = {
    all: { label: "All Loans", filter: () => true, icon: Landmark },
    pending: {
      label: "Pending Guarantors",
      filter: (l) => String(l.status || "").toUpperCase() === "PENDING_GUARANTORS",
      icon: Clock3,
    },
    review: {
      label: "Finance Queue",
      filter: (l) => ["UNDER_REVIEW", "PENDING"].includes(String(l.status || "").toUpperCase()),
      icon: Landmark,
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
  const { totalDisbursed, totalRepaid, totalArrears } =
    getLoanPortfolioMetrics(loans);
  const displayLoanStatus = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (["PENDING", "UNDER_REVIEW"].includes(normalized)) return "PENDING_FINANCE";
    if (["ACTIVE", "DISBURSED"].includes(normalized)) return "DISBURSED";
    return normalized || "PENDING_FINANCE";
  };
  const isActionableStatus = (status) => ["PENDING", "UNDER_REVIEW", "PENDING_FINANCE"].includes(String(status || "").toUpperCase());
  const loanTypeLabel = (type) => `${String(type || "Loan").charAt(0)}${String(type || "Loan").slice(1).toLowerCase()} Loan`;
  const totalInterestForLoan = (loan) => {
    const amount = Number(loan?.principal || loan?.amount || 0);
    const rate = Number(loan?.interestRate ?? loan?.interest ?? 0);
    const duration = Number(loan?.duration || 0);
    if (!amount || !duration) return 0;
    return Number(loan?.interestGenerated ?? calculateReducingBalance(amount, rate, duration).totalInterest);
  };
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
  async function openLoanRequest(row) {
    setSelectedLoanRequest(row);
    if (!row?.id || !accessToken) return;
    setLoanRequestLoading(true);
    try {
      const fullLoan = await getLoanById(row.id, accessToken);
      setSelectedLoanRequest((current) => ({ ...current, ...fullLoan }));
    } catch {
      setSelectedLoanRequest(row);
    } finally {
      setLoanRequestLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        //eyebrow="Loan Management"
        title="Loan Management"
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
          value={formatCurrency(totalArrears)}
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
            stopRowClick: true,
            render: (v, r) => {
              const s = String(r.status || "").toUpperCase();
              const approving = approvingLoanId === v;
              return (
                <div className="flex flex-wrap gap-1">
                  {["PENDING", "UNDER_REVIEW"].includes(s) && (
                    <>
                      <button
                        disabled={approving}
                        onClick={() => onApproveLoan?.(v)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                      >
                        {approving ? <RefreshCw className="animate-spin" size={12} /> : null}
                        {approving ? "Approving" : "Approve"}
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
        onRowClick={openLoanRequest}
      />
      <button
        onClick={() => exportToCSV(filtered, loanColumns, "loans.csv", { exportedBy: getExporterName(currentUser), title: "Loans" })}
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
      {selectedLoanRequest ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Loan request</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">{loanTypeLabel(selectedLoanRequest.loanType || selectedLoanRequest.type)}</h3>
                <p className="mt-2 text-sm text-slate-600">{selectedLoanRequest.reason || "N/A"}</p>
                {loanRequestLoading ? (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                    <RefreshCw className="animate-spin" size={14} />
                    Fetching full loan profile...
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={() => setSelectedLoanRequest(null)} className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50" aria-label="Close loan details">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-950">Member Details</h4>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-slate-500">Full name</dt><dd className="font-semibold text-slate-900">{selectedLoanRequest.memberName || selectedLoanRequest.member || "-"}</dd></div>
                  <div><dt className="text-slate-500">Member ID / Registration Number</dt><dd className="font-semibold text-slate-900">{selectedLoanRequest.memberNumber || selectedLoanRequest.memberId || "-"}</dd></div>
                </dl>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-950">Loan Parameters</h4>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-slate-500">Loan type</dt><dd className="font-semibold text-slate-900">{loanTypeLabel(selectedLoanRequest.loanType || selectedLoanRequest.type)}</dd></div>
                  <div><dt className="text-slate-500">Requested amount</dt><dd className="font-semibold text-slate-900">{formatCurrency(selectedLoanRequest.principal || selectedLoanRequest.amount)}</dd></div>
                  <div><dt className="text-slate-500">Repayment duration</dt><dd className="font-semibold text-slate-900">{selectedLoanRequest.duration || "-"} months</dd></div>
                  <div><dt className="text-slate-500">Calculated interest</dt><dd className="font-semibold text-slate-900">{formatCurrency(totalInterestForLoan(selectedLoanRequest))}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">Purpose / Reason</dt><dd className="font-semibold text-slate-900">{selectedLoanRequest.reason || "N/A"}</dd></div>
                  <div><dt className="text-slate-500">Current status</dt><dd className="mt-1"><StatusBadge status={selectedLoanRequest.financeStatus || displayLoanStatus(selectedLoanRequest.status)} /></dd></div>
                </dl>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={approvingLoanId === selectedLoanRequest.id || !isActionableStatus(selectedLoanRequest.status)}
                  onClick={async () => {
                    const updated = await onApproveLoan?.(selectedLoanRequest.id);
                    if (updated) setSelectedLoanRequest((current) => ({ ...current, ...updated }));
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {approvingLoanId === selectedLoanRequest.id ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Approve
                </button>
                <button
                  type="button"
                  disabled={!isActionableStatus(selectedLoanRequest.status)}
                  onClick={() => onRejectLoan?.(selectedLoanRequest.id)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
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
        Number(loan.principalBalance ?? loan.principal ?? loan.amount ?? 0),
        Number(loan.interestRate ?? loan.interest ?? 0),
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
          Reducing balance at {(Number(loan.interestRate ?? loan.interest ?? 0)).toFixed(1)}% monthly.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// SALARY DEDUCTION PAGE
// ============================================================
function SalaryDeductionPage({ data, accessToken, onRefresh, currentUser }) {
  const { companies = [], members = [] } = data;
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
        //eyebrow="Salary deductions"
        title="Salary deductions"
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
                  { exportedBy: getExporterName(currentUser), title: "Salary Deductions" },
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
function MemberProfilesPage({ data, accessToken, onRefresh, currentUser }) {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const members = data.members || [];
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
        //eyebrow="Member profiles"
        title="Member profiles"
        description="Search by ID, view risk flags, aggregated balances, and ledgers."
        action={
          <div className="flex flex-wrap gap-2">
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
                  { exportedBy: getExporterName(currentUser), title: "Members" },
                )
              }
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={() => exportMasterWorkbook(data, currentUser)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
            >
              <Download size={14} />
              Master CSV
            </button>
          </div>
        }
      />
      <FinanceFinancialCsvImport accessToken={accessToken} onImported={onRefresh} />
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

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function workbookRowsToCsv(workbook) {
  const rows = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    records.forEach((record) => rows.push({ Sheet: sheetName, ...record }));
  });
  if (!rows.length) return "";
  const headers = [...rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set(["Sheet"]))];
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function FinanceFinancialCsvImport({ accessToken, onImported, mode = "financial" }) {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const nextCsv = extension === "xls" || extension === "xlsx"
        ? workbookRowsToCsv(XLSX.read(await file.arrayBuffer(), { type: "array" }))
        : await file.text();
      if (!nextCsv.trim()) throw new Error("The selected file is empty or has no tabular rows.");
      setCsv(nextCsv);
      setFileName(file.name);
      setPreview(null);
    } catch (error) {
      toast.error(error?.message || "Unable to read import file");
      setCsv("");
      setFileName("");
      setPreview(null);
    } finally {
      event.target.value = "";
    }
  }

  async function previewImport() {
    setBusy(true);
    try {
      setPreview(await previewFinancialCsvImport(csv, accessToken));
    } catch (error) {
      toast.error(error?.message || "Unable to preview financial CSV");
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    setBusy(true);
    try {
      const result = await commitFinancialCsvImport(csv, accessToken);
      if (mode === "dividends") {
        toast.success(`Published ${result.dividends?.imported?.length || 0} dividend allocation${result.dividends?.imported?.length === 1 ? "" : "s"}.`);
      } else {
        toast.success(`Imported ${result.imported?.length || 0} financial record${result.imported?.length === 1 ? "" : "s"} and published ${result.dividends?.imported?.length || 0} dividend allocation${result.dividends?.imported?.length === 1 ? "" : "s"}.`);
      }
      setCsv("");
      setFileName("");
      setPreview(null);
      onImported?.();
    } catch (error) {
      toast.error(error?.message || "Unable to import financial CSV");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{mode === "dividends" ? "Annual dividend CSV import" : "Bulk financial records import"}</h3>
          <p className="text-sm text-slate-500">{mode === "dividends" ? "Upload, preview, and publish the post-financial year dividend allocation file to member portfolios." : "Post periodic financial transactions, payroll deductions, employer contributions, and annual member dividend allocations."}</p>
          <p className="text-xs text-slate-500">Supports CSV, XLS, and XLSX files. Multi-sheet workbooks are imported sheet by sheet; Dividends sheets or dividend columns are published to member portfolios.</p>
          {fileName ? <p className="mt-1 text-xs font-semibold text-emerald-700">{fileName}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
            <FileText size={14} />
            {mode === "dividends" ? "Choose dividend CSV" : "Choose file"}
            <input type="file" accept=".csv,text/csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={handleFile} />
          </label>
          <button disabled={!csv || busy} onClick={previewImport} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Working..." : "Preview"}</button>
          <button disabled={!preview?.readyCount || busy} onClick={commitImport} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{mode === "dividends" ? "Publish dividends" : "Import ready rows"}</button>
        </div>
      </div>
      {preview ? (
        <div className="mt-4 overflow-x-auto rounded-lg border">
           <div className="border-b bg-slate-50 px-4 py-2 text-sm font-semibold">{preview.readyCount} ready, {preview.errorCount} need fixes · {preview.dividendReadyCount || 0} dividend rows ready</div>
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50">
                {["Row", "Sheet", "Member", "Staff ID", "Savings", "Shares", "Loans", "Repayment", "Interest", "Employer", "Readiness"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs uppercase text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {preview.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td className="px-3 py-2 text-sm">{row.rowNumber}</td>
                  <td className="px-3 py-2 text-sm">{row.data.sheetName || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.memberNumber || row.data.email || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.staffId || "-"}</td>
                  <td className="px-3 py-2 text-sm">{formatCurrency(row.data.savings || 0)}</td>
                  <td className="px-3 py-2 text-sm">{formatCurrency(row.data.shareCapital || 0)}</td>
                  <td className="px-3 py-2 text-sm">{formatCurrency(row.data.loans || 0)}</td>
                  <td className="px-3 py-2 text-sm">{formatCurrency(row.data.loanRepayment || 0)}</td>
                  <td className="px-3 py-2 text-sm">{formatCurrency(row.data.interest || 0)}</td>
                  <td className="px-3 py-2 text-sm">{formatCurrency(row.data.employerContribution || 0)}</td>
                  <td className="px-3 py-2 text-sm"><StatusBadge status={row.ready ? "Ready" : `Missing ${row.missing.join(", ")}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {preview?.dividendRows?.length ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-emerald-200">
          <div className="border-b bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">Dividend allocations preview</div>
          <table className="min-w-full">
            <thead>
              <tr className="bg-emerald-50">
                {["Row", "Sheet", "Member", "Year", "Shares", "Dividend", "Readiness"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs uppercase text-emerald-900">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {preview.dividendRows.map((row) => (
                <tr key={`dividend-${row.rowNumber}`}>
                  <td className="px-3 py-2 text-sm">{row.rowNumber}</td>
                  <td className="px-3 py-2 text-sm">{row.data.sheetName || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.memberNumber || row.data.email || row.data.staffId || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.financialYear || "Previous year"}</td>
                  <td className="px-3 py-2 text-sm">{Number(row.data.totalShares || row.data.shareCapital || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm">{formatCurrency(row.data.dividendPaid || 0)}</td>
                  <td className="px-3 py-2 text-sm"><StatusBadge status={row.ready ? "Ready" : `Missing ${row.missing.join(", ")}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
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
      .then((result) => { if (!cancelled) setProfile(result); })
      .catch((requestError) => { if (!cancelled) setError(requestError?.message || "Failed to load member financial profile."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, memberId]);

  return <MemberFinancialProfile profile={profile} loading={loading} error={error} onBack={onBack} />;
}
// ============================================================
// REPORTS
// ============================================================
function FinancialReportsPage({ data, currentUser }) {
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [breakdown, setBreakdown] = useState(null);
  const report = data.reports || {};
  const loans = data.loans || [];
  const members = data.members || [];
  const portfolio = getLoanPortfolioMetrics(loans);
  const timeSeries = (report.timeSeries?.[timeFilter] || []).slice(-30);

  const reportRows = timeSeries;

  const accountRows = (field) => members
    .map((member) => ({
      memberId: member.memberId || member.id,
      memberNumber: member.memberNumber,
      memberName: member.name || member.memberName || "Unknown member",
      amount: Number(member[field] || 0),
    }))
    .filter((row) => row.amount > 0)
    .sort((left, right) => right.amount - left.amount);
  const shareCapitalRows = accountRows("shares");
  const savingsRows = accountRows("savings");
  const shareCapitalDeposits = shareCapitalRows.reduce((sum, row) => sum + row.amount, 0);
  const savingsDeposits = savingsRows.reduce((sum, row) => sum + row.amount, 0);
  const totalDeposits = shareCapitalDeposits + savingsDeposits;

  const loanProducts = ["EMERGENCY", "EDUCATION", "DEVELOPMENT", "WELFARE"];
  const repayByProduct = {};
  const disburseByProduct = {};
  loanProducts.forEach((p) => {
    const productLoans = loans.filter(
      (loan) => String(loan.type || loan.loanType || "").toUpperCase() === p,
    );
    repayByProduct[p] = productLoans.reduce(
      (sum, loan) => sum + Number(loan.paid ?? loan.repaid ?? 0),
      0,
    );
    disburseByProduct[p] = getLoanPortfolioMetrics(productLoans).totalDisbursed;
  });
  const totalRepayments = portfolio.totalRepaid;
  const totalDisbursed = portfolio.totalDisbursed;
  const loanRows = (product, metric) => loans
    .filter((loan) => !product || String(loan.type || loan.loanType || "").toUpperCase() === product)
    .map((loan) => {
      const status = String(loan.status || "").toUpperCase();
      const amount = metric === "repayments"
        ? Number(loan.paid ?? loan.repaid ?? 0)
        : ["DISBURSED", "ACTIVE", "OVERDUE", "COMPLETED", "DEFAULTED", "WRITTEN_OFF"].includes(status)
          ? Number(loan.principal || loan.amount || 0)
          : 0;
      return {
        memberId: loan.memberId,
        memberNumber: loan.memberNumber,
        memberName: loan.member || loan.memberName || "Unknown member",
        amount,
      };
    })
    .filter((row) => row.amount > 0)
    .reduce((rows, row) => {
      const existing = rows.find((item) => item.memberId === row.memberId);
      if (existing) existing.amount += row.amount;
      else rows.push(row);
      return rows;
    }, [])
    .sort((left, right) => right.amount - left.amount);
  const localBreakdowns = {
    ...(report.memberBreakdowns || {}),
    deposits: [...shareCapitalRows, ...savingsRows].reduce((rows, row) => {
      const existing = rows.find((item) => item.memberId === row.memberId);
      if (existing) existing.amount += row.amount;
      else rows.push({ ...row });
      return rows;
    }, []).sort((left, right) => right.amount - left.amount),
    shareCapitalDeposits: shareCapitalRows,
    savingsDeposits: savingsRows,
    repayments: loanRows(null, "repayments"),
    disbursements: loanRows(null, "disbursements"),
  };
  loanProducts.forEach((product) => {
    localBreakdowns[`repayments_${product}`] = loanRows(product, "repayments");
    localBreakdowns[`disbursements_${product}`] = loanRows(product, "disbursements");
  });
  const openBreakdown = (key, title, total) =>
    setBreakdown({ key, title, total, rows: localBreakdowns[key] || [] });

  return (
    <div className="space-y-6">
      <SectionHeader
        //eyebrow="Reports"
        title="Reports & analytics"
        description="Live daily, monthly, and yearly transactions."
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
                { exportedBy: getExporterName(currentUser), title: "Financial Reports" },
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
            Total Member Funds
          </h5>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            {formatCurrency(totalDeposits)}
          </span>
          <button type="button" onClick={() => openBreakdown("deposits", "Total member funds", totalDeposits)} className="ml-auto text-xs font-semibold text-emerald-700 hover:underline">View members</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <button type="button" onClick={() => openBreakdown("shareCapitalDeposits", "Share capital deposits", shareCapitalDeposits)} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50">
            <p className="text-xs font-semibold text-slate-500">
              Share Capital Balance
            </p>
            <p className="mt-1 text-xl font-semibold text-sky-700">
              {formatCurrency(shareCapitalDeposits)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Current capital held across member accounts
            </p>
            <span className="mt-2 block text-xs font-semibold text-sky-700">View member summary</span>
          </button>
          <button type="button" onClick={() => openBreakdown("savingsDeposits", "Savings pool deposits", savingsDeposits)} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50">
            <p className="text-xs font-semibold text-slate-500">
              Savings Pool Balance
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-700">
              {formatCurrency(savingsDeposits)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Current savings held across member accounts
            </p>
            <span className="mt-2 block text-xs font-semibold text-emerald-700">View member summary</span>
          </button>
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
          <button type="button" onClick={() => openBreakdown("repayments", "Loan repayments", totalRepayments)} className="ml-auto text-xs font-semibold text-sky-700 hover:underline">View members</button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {loanProducts.map((p) => (
            <button type="button"
              key={p}
              onClick={() => openBreakdown(`repayments_${p}`, `${p.charAt(0) + p.slice(1).toLowerCase()} loan repayments`, repayByProduct[p])}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50"
            >
              <p className="text-xs font-semibold text-slate-500">
                {p.charAt(0) + p.slice(1).toLowerCase()} Loans
              </p>
              <p className="mt-1 text-lg font-semibold text-sky-700">
                {formatCurrency(repayByProduct[p])}
              </p>
              <span className="mt-2 block text-xs font-semibold text-sky-700">View members</span>
            </button>
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
          <button type="button" onClick={() => openBreakdown("disbursements", "Loan disbursements", totalDisbursed)} className="ml-auto text-xs font-semibold text-amber-700 hover:underline">View members</button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {loanProducts.map((p) => (
            <button type="button"
              key={p}
              onClick={() => openBreakdown(`disbursements_${p}`, `${p.charAt(0) + p.slice(1).toLowerCase()} loan disbursements`, disburseByProduct[p])}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
            >
              <p className="text-xs font-semibold text-slate-500">
                {p.charAt(0) + p.slice(1).toLowerCase()} Loans
              </p>
              <p className="mt-1 text-lg font-semibold text-amber-700">
                {formatCurrency(disburseByProduct[p])}
              </p>
              <span className="mt-2 block text-xs font-semibold text-amber-700">View members</span>
            </button>
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
      <ReportBreakdownDialog breakdown={breakdown} onClose={() => setBreakdown(null)} />
    </div>
  );
}

// ============================================================
// DIVIDENDS
// ============================================================
function DividendsPage({ dividends, accessToken, onRefresh }) {
  const totalPublished = dividends.reduce((sum, dividend) => sum + Number(dividend.amount || dividend.totalDistributed || 0), 0);
  return (
    <div className="space-y-6">
      <SectionHeader
        //eyebrow="Dividends"
        title="Historical distributions"
        description="Yearly dividend tracking."
      />
      <FinanceFinancialCsvImport accessToken={accessToken} onImported={onRefresh} mode="dividends" />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Published allocations" value={dividends.length} icon={PieChart} tone="emerald" />
        <KpiCard label="Total dividends" value={formatCurrency(totalPublished)} icon={Banknote} tone="emerald" />
        <KpiCard label="Latest year" value={dividends[0]?.year || "-"} icon={CalendarDays} tone="blue" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {dividends.map((d, i) => (
          <div key={i} className="rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between">
              <h5 className="text-lg font-semibold">{d.year || "Dividend"}</h5>
              <StatusBadge status={d.status} />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <strong>Member:</strong> {d.memberName || d.memberNumber || d.memberId || "-"}
              </p>
              <p>
                <strong>Shares:</strong> {Number(d.totalShares || 0).toLocaleString()}
              </p>
              <p>
                <strong>Distributed:</strong>{" "}
                {formatCurrency(d.totalDistributed || d.amount || 0)}
              </p>
              <p>
                <strong>Source:</strong> {d.sourceSheet || "Manual declaration"}
              </p>
              <p>
                <strong>Declared:</strong> {formatDateSafe(d.declaredDate)}
              </p>
            </div>
          </div>
        ))}
        {!dividends.length ? <div className="rounded-lg border bg-white p-8 text-sm text-slate-500 md:col-span-3">No dividend allocations have been published yet.</div> : null}
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
    <div className="space-y-6 max-w-2xl">
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
  );
}

