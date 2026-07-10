import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertTriangle, Banknote, Bell, BriefcaseBusiness, Building2, Camera, CheckCircle2,
  Clock3, CreditCard, Download, FileText, Filter, KeyRound, Landmark, LockKeyhole,
  PieChart, Plus, ReceiptText, RefreshCw, Search, ShieldAlert,
  TrendingDown, TrendingUp, UserRound, UsersRound, X, XCircle,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import { changePassword } from "../services/authService.js";
import {
  approveLoan, disburseLoan, getAllCompanies, getAllDeductions, getAllDividends,
  getAllLoans, getAllMembers, getAllShares, getAllTransactions, getFinancialReports,
  rejectLoan, verifyTransaction, voidTransaction, writeOffLoan,
} from "../features/finance/financeService.js";
import {
  AnalyticsPanel,
  ConfirmActionDialog,
  DataTable,
  DashboardHero,
  KpiCard,
  RoutePlaceholder,
  SectionHeader,
  SkeletonDashboard,
  StatusBadge,
  exportRowsToCsv,
  formatCurrency,
  formatDate,
  getMonthlySeries,
} from "../components/dashboard/EnterpriseDashboard.jsx";

function filterRows(rows, search, keys) {
  const term = search.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((row) => keys.some((key) => String(row?.[key] || "").toLowerCase().includes(term)));
}
function formatDateSafe(v) { try { return v ? new Date(v).toLocaleDateString() : "-"; } catch { return "-"; } }

const MOCK_COMPANIES = [
  { id: "c1", name: "Ministry of Education", employees: 48, totalDeductions: 480000, status: "Active" },
  { id: "c2", name: "County Government of Nairobi", employees: 32, totalDeductions: 320000, status: "Active" },
  { id: "c3", name: "Kenyatta National Hospital", employees: 26, totalDeductions: 260000, status: "Active" },
  { id: "c4", name: "Safaricom PLC", employees: 15, totalDeductions: 150000, status: "Active" },
];
const MOCK_MEMBERS_PROFILE = [
  { id: "M001", name: "John Kamau", phone: "+254712345678", company: "Ministry of Education", salary: 85000, deduction: 8500, savings: 250000, loans: 45000, shares: 35000, risk: "Low", status: "Active" },
  { id: "M002", name: "Mary Wanjiku", phone: "+254723456789", company: "County Government of Nairobi", salary: 65000, deduction: 6500, savings: 180000, loans: 120000, shares: 28000, risk: "Medium", status: "Active" },
  { id: "M003", name: "Peter Otieno", phone: "+254734567890", company: "Kenyatta National Hospital", salary: 92000, deduction: 9200, savings: 420000, loans: 0, shares: 50000, risk: "Low", status: "Active" },
  { id: "M004", name: "Jane Muthoni", phone: "+254745678901", company: "Safaricom PLC", salary: 110000, deduction: 11000, savings: 600000, loans: 250000, shares: 75000, risk: "Low", status: "Active" },
  { id: "M005", name: "David Kiprop", phone: "+254756789012", company: null, salary: 0, deduction: 0, savings: 50000, loans: 35000, shares: 15000, risk: "High", status: "Overdue" },
  { id: "M006", name: "Alice Wambui", phone: "+254767890123", company: null, salary: 0, deduction: 0, savings: 30000, loans: 80000, shares: 10000, risk: "High", status: "Default" },
];
const MOCK_LOANS_QUEUE = [
  { id: "L001", member: "John Kamau", type: "DEVELOPMENT", principal: 250000, balance: 210000, interest: 2, duration: 72, status: "ACTIVE", disbursedDate: "2026-01-15", nextPayment: 6250, paid: 40000, arrears: 0, repayments: 6, expected: 6 },
  { id: "L002", member: "Mary Wanjiku", type: "WELFARE", principal: 120000, balance: 80000, interest: 1.5, duration: 24, status: "ACTIVE", disbursedDate: "2026-03-10", nextPayment: 5800, paid: 40000, arrears: 11600, repayments: 5, expected: 7 },
  { id: "L003", member: "Jane Muthoni", type: "DEVELOPMENT", principal: 500000, balance: 450000, interest: 2, duration: 72, status: "ACTIVE", disbursedDate: "2026-02-20", nextPayment: 10200, paid: 50000, arrears: 0, repayments: 5, expected: 5 },
  { id: "L004", member: "Peter Otieno", type: "EMERGENCY", principal: 30000, balance: 0, interest: 1, duration: 12, status: "DISBURSED", disbursedDate: "2026-05-01", nextPayment: 0, paid: 30000, arrears: 0, repayments: 3, expected: 3 },
  { id: "L005", member: "Faith Wangari", type: "EDUCATION", principal: 80000, balance: 80000, interest: 1, duration: 24, status: "APPROVED", disbursedDate: null, nextPayment: 0, paid: 0, arrears: 0, repayments: 0, expected: 0 },
  { id: "L006", member: "Samuel Mwangi", type: "DEVELOPMENT", principal: 150000, balance: 150000, interest: 2, duration: 72, status: "PENDING", disbursedDate: null, nextPayment: 0, paid: 0, arrears: 0, repayments: 0, expected: 0 },
  { id: "L007", member: "Grace Achieng", type: "WELFARE", principal: 90000, balance: 90000, interest: 1.5, duration: 24, status: "REJECTED", disbursedDate: null, nextPayment: 0, paid: 0, arrears: 0, repayments: 0, expected: 0 },
  { id: "L008", member: "David Kiprop", type: "EMERGENCY", principal: 35000, balance: 28000, interest: 1, duration: 12, status: "OVERDUE", disbursedDate: "2025-11-01", nextPayment: 3500, paid: 7000, arrears: 14000, repayments: 2, expected: 6 },
  { id: "L009", member: "Alice Wambui", type: "DEVELOPMENT", principal: 180000, balance: 180000, interest: 2, duration: 72, status: "WRITTEN_OFF", disbursedDate: "2025-06-01", nextPayment: 0, paid: 20000, arrears: 60000, repayments: 4, expected: 18 },
];
const MOCK_DIVIDENDS = [
  { year: 2025, rate: "8.5%", totalDistributed: 425000, membersCount: 126, declaredDate: "2026-01-15", status: "Distributed" },
  { year: 2024, rate: "7.2%", totalDistributed: 360000, membersCount: 112, declaredDate: "2025-01-20", status: "Distributed" },
  { year: 2023, rate: "6.8%", totalDistributed: 310000, membersCount: 98, declaredDate: "2024-01-18", status: "Distributed" },
];
const MOCK_NOTIFICATIONS = [
  { id: 1, title: "New Loan Request", body: "Samuel Mwangi submitted a DEVELOPMENT loan of KES 150,000", type: "LOAN", subtype: "application", time: new Date().toISOString(), read: false },
  { id: 2, title: "Loan Repayment Received", body: "John Kamau repaid KES 6,250 on DEVELOPMENT loan", type: "LOAN", subtype: "repayment", time: new Date(Date.now()-3600000).toISOString(), read: false },
  { id: 3, title: "Deposit Recorded", body: "Jane Muthoni deposited KES 11,000 via M-Pesa", type: "TRANSACTION", subtype: "deposit", time: new Date(Date.now()-1800000).toISOString(), read: false },
  { id: 4, title: "Withdrawal Processed", body: "Peter Otieno withdrew KES 5,000 from savings", type: "TRANSACTION", subtype: "withdrawal", time: new Date(Date.now()-5400000).toISOString(), read: false },
  { id: 5, title: "Deposit Recorded", body: "Faith Wanjiku deposited KES 8,000 via bank transfer", type: "TRANSACTION", subtype: "deposit", time: new Date(Date.now()-7200000).toISOString(), read: true },
  { id: 6, title: "Overdue Alert", body: "David Kiprop is 2 months behind on EMERGENCY loan", type: "LOAN", subtype: "overdue", time: new Date(Date.now()-86400000).toISOString(), read: true },
  { id: 7, title: "New Loan Request", body: "Grace Achieng submitted an EDUCATION loan of KES 80,000", type: "LOAN", subtype: "application", time: new Date(Date.now()-100000).toISOString(), read: false },
  { id: 8, title: "Withdrawal Flagged", body: "Large withdrawal of KES 25,000 from Alice Wambui — requires review", type: "OVERDUE", subtype: "flag", time: new Date(Date.now()-1200000).toISOString(), read: false },
];

function calculateReducingBalance(principal, annualRate, durationMonths) {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = monthlyRate === 0 ? principal / durationMonths : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -durationMonths));
  let schedule = []; let balance = principal;
  for (let i = 1; i <= durationMonths; i++) {
    const interestPayment = balance * monthlyRate; const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    schedule.push({ month: i, payment: monthlyPayment, principal: principalPayment, interest: interestPayment, balance: Math.max(0, balance) });
  }
  return { monthlyPayment, totalRepayment: monthlyPayment*durationMonths, totalInterest: monthlyPayment*durationMonths-principal, schedule };
}

function getFinanceStats(data) {
  const tx = data.transactions || []; const loans = data.loans || []; const now = new Date();
  const isToday = (v) => { if (!v) return false; const d = new Date(v); return d.toDateString() === now.toDateString(); };
  const isMonth = (v) => { if (!v) return false; const d = new Date(v); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); };
  const byType = (type) => tx.filter((t) => String(t.type || "").toUpperCase().includes(type)).reduce((s, t) => s + Number(t.amount || 0), 0);
  return {
    dailyTransactions: tx.filter((t) => isToday(t.createdAt || t.date)).length, totalDeposits: byType("DEPOSIT"), totalWithdrawals: byType("WITHDRAWAL"),
    activeLoans: loans.filter((l) => ["ACTIVE","DISBURSED","APPROVED"].includes(String(l.status||"").toUpperCase())).length,
    loanRepayments: byType("REPAYMENT"), pendingDisbursements: loans.filter((l) => String(l.status||"").toUpperCase()==="APPROVED").length,
    monthlyRevenue: tx.filter((t) => isMonth(t.createdAt||t.date)).reduce((s,t)=>s+Number(t.amount||0),0),
    totalDisbursed: loans.filter((l)=>["DISBURSED","ACTIVE"].includes(String(l.status||"").toUpperCase())).reduce((s,l)=>s+Number(l.principal||0),0),
    overdueLoans: loans.filter((l)=>String(l.status||"").toUpperCase()==="OVERDUE").length,
    totalArrears: loans.filter((l)=>["OVERDUE","ACTIVE"].includes(String(l.status||"").toUpperCase())).reduce((s,l)=>s+Number(l.arrears||l.balance||0),0),
  };
}

function exportToCSV(rows, columns, filename = "export.csv") {
  const headers = columns.map((c) => typeof c === "string" ? c : c.label).join(",");
  const body = rows.map((row) => columns.map((c) => {
    const val = typeof c === "string" ? row[c] : c.render ? c.render(row[c.key], row) : row[c.key];
    return `"${String(val || "").replace(/"/g,'""')}"`;
  }).join(",")).join("\n");
  const blob = new Blob([headers + "\n" + body], { type: "text/csv" }); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
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

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Finance operations"
        title="Financial control desk"
        description="Verify payments, monitor cash movement, manage disbursements, review deductions, and prepare financial reports."
        metrics={[
          { label: "Today", value: stats.dailyTransactions },
          { label: "Active loans", value: stats.activeLoans },
          { label: "Revenue", value: formatCurrency(stats.monthlyRevenue) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

  useEffect(() => { loadAllData(); }, [accessToken]);
  useEffect(() => { const interval = setInterval(() => loadAllData({ showLoading: false }), 15000); return () => clearInterval(interval); }, [accessToken]);

  const stats = useMemo(() => getFinanceStats(data), [data]);
  function markAllNotificationsRead() { setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); }

function TransactionsPage({ transactions, embedded = false, onVerifyTransaction, onVoidTransaction, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () => filterRows(filterRows(transactions, globalSearch, ["id", "type", "description", "status", "reference"]), search, ["id", "type", "description", "status", "reference"]),
    [transactions, globalSearch, search],
  );

  const table = (
    <DataTable
      title={embedded ? "Recent transactions" : "Transaction processing"}
      description="Verify deposits, withdrawals, fees, disbursements, repayments, and dividend transactions"
      search={search}
      onSearch={setSearch}
      columns={[
        { key: "id", label: "Reference", render: (value, row) => row.reference || value || "-" },
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount", render: formatCurrency },
        { key: "status", label: "Status", render: (value) => <StatusBadge status={value || "Pending"} /> },
        { key: "description", label: "Description", render: (value) => value || "-" },
        { key: "createdAt", label: "Date", render: (value, row) => formatDate(value || row.date) },
        { key: "id", label: "Action", render: (value, row) => (
          <div className="flex gap-2">
            <button onClick={() => onVerifyTransaction?.(value)} className="text-sm font-semibold text-emerald-700">Verify</button>
            {onVoidTransaction ? (
              <button onClick={() => onVoidTransaction(value, row)} className="text-sm font-semibold text-rose-700">Void</button>
            ) : null}
          </div>
        ) },
      ]}
      data={rows}
      emptyTitle="No transactions found"
      emptyDescription="Finance transaction records will appear here once returned by the backend."
    />
  );

  function renderContent() {
    if (loading) return <SkeletonDashboard />;
    switch (activeSection) {
      case "transactions": return <TransactionsPage data={data} onVerifyTransaction={handleVerifyTransaction} onVoidTransaction={handleVoidTransaction} globalSearch={globalSearch} />;
      case "loans": return <UnifiedLoansPage loans={data.loans} onApproveLoan={handleApproveLoan} onRejectLoan={handleRejectLoan} onDisburseLoan={handleDisburseLoan} onWriteOffLoan={handleWriteOffLoan} globalSearch={globalSearch} />;
      case "deductions": return <SalaryDeductionPage data={data} accessToken={accessToken} onRefresh={() => loadAllData({ showLoading: false })} />;
      case "members": return <MemberProfilesPage data={data} accessToken={accessToken} onRefresh={() => loadAllData({ showLoading: false })} />;
      case "dividends": return <DividendsPage dividends={data.dividends} />;
      case "reports": return <FinancialReportsPage data={data} />;
      case "settings": return <FinancierProfileSettings user={user} stats={stats} accessToken={accessToken} />;
      case "notifications": return <NotificationsPanel notifications={notifications} onMarkAllRead={markAllNotificationsRead} />;
      default: return <FinanceHome data={data} stats={stats} globalSearch={globalSearch} onVerifyTransaction={handleVerifyTransaction} />;
    }
  }

  return (
    <div className="enterprise-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} />
      <main className={`min-h-screen transition-all ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-62"}`}>
        <TopNavbar sidebarOpen={sidebarOpen} onToggleSidebar={() => { if (window.innerWidth >= 1024) setSidebarCollapsed((c)=>!c); else setSidebarOpen((c)=>!c); }}
          unreadCount={unreadCount} searchValue={globalSearch} onSearchChange={setGlobalSearch}
          onNotificationClick={() => navigate(`${dashboardBase}/notifications`)} />
        <div className="mx-auto w-full max-w-[1500px] px-4 py-2 sm:px-2 lg:px-2">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function LoansPage({ loans, mode = "all", onApproveLoan, onRejectLoan, onDisburseLoan, onReviewLoan, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const filteredByMode = useMemo(
    () => loans.filter((loan) => {
      const status = String(loan.status || "").toUpperCase();
      if (mode === "disbursements") return ["APPROVED", "DISBURSED", "ACTIVE"].includes(status);
      if (mode === "repayments") return ["ACTIVE", "OVERDUE", "DISBURSED"].includes(status);
      return true;
    }),
    [loans, mode],
  );
  const rows = useMemo(
    () => filterRows(filterRows(filteredByMode, globalSearch, ["id", "type", "status", "memberName", "loanType", "memberId"]), search, ["id", "type", "status", "memberName", "loanType", "memberId"]),
    [filteredByMode, globalSearch, search],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={mode === "repayments" ? "Loan repayments" : "Loan disbursements"}
        title={mode === "repayments" ? "Repayment monitoring" : "Loan disbursement desk"}
        description="Track approved loans, disbursement readiness, repayment progress, overdue exposure, and finance actions."
      />
      <DataTable
        title="Loan records"
        description="Loan workflow records available to finance officers"
        search={search}
        onSearch={setSearch}
        columns={[
          { key: "memberName", label: "Member", render: (value, row) => value || row.member?.name || row.user?.name || "-" },
          { key: "type", label: "Loan Type", render: (value, row) => value || row.loanType || "-" },
          { key: "principal", label: "Amount", render: formatCurrency },
          { key: "balance", label: "Balance", render: formatCurrency },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
          { key: "approvalStage", label: "Approval Stage", render: (value) => value || "-" },
          { key: "dueDate", label: "Due Date", render: formatDate },
          { key: "id", label: "Action", render: (value) => (
            <div className="flex flex-wrap gap-2">
              {mode === "repayments" ? (
                <button onClick={() => onReviewLoan?.(value)} className="text-sm font-semibold text-emerald-700">Review</button>
              ) : (
                <>
                  <button onClick={() => onApproveLoan?.(value)} className="text-sm font-semibold text-emerald-700">Approve</button>
                  <button onClick={() => onDisburseLoan?.(value)} className="text-sm font-semibold text-sky-700">Disburse</button>
                  <button onClick={() => onRejectLoan?.(value)} className="text-sm font-semibold text-rose-700">Reject</button>
                </>
              )}
            </div>
          ) },
        ]}
        data={rows}
        emptyTitle="No loan records found"
        emptyDescription="Loan records for finance processing will appear here."
      />
    </div>
    <div className="space-y-3">{filtered.map((n) => (
      <div key={n.id} className={`rounded-lg border p-4 ${n.read ? "bg-white" : "border-rose-200 bg-rose-50"}`}>
        <div className="flex items-start justify-between"><div><h4 className="font-semibold">{n.title}</h4><p className="mt-1 text-sm text-slate-600">{n.body}</p></div><span className="text-xs text-slate-400">{new Date(n.time).toLocaleTimeString()}</span></div>
        <div className="mt-2 flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor(n)}`}>{typeLabel(n)}</span>{!n.read&&<span className="text-xs font-semibold text-rose-600">● Unread</span>}</div>
      </div>
    ))}</div>
  </div>);
}

function SavingsPage({ shares, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () => filterRows(filterRows(shares, globalSearch, ["id", "memberName", "memberId", "status"]), search, ["id", "memberName", "memberId", "status"]),
    [shares, globalSearch, search],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Savings accounts"
        title="Savings and share accounts"
        description="Review member savings history, share contributions, and account contribution records."
      />
      <DataTable
        title="Contribution records"
        description="Share and savings contribution data returned by finance endpoints"
        search={search}
        onSearch={setSearch}
        columns={[
          { key: "id", label: "Record ID" },
          { key: "memberName", label: "Member", render: (value, row) => value || row.member?.name || "-" },
          { key: "shares", label: "Shares", render: (value) => Number(value || 0).toLocaleString() },
          { key: "totalInvested", label: "Invested", render: formatCurrency },
          { key: "purchaseDate", label: "Date", render: formatDate },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={value || "Active"} /> },
        ]}
        data={rows}
        emptyTitle="No contribution records"
        emptyDescription="Savings and share account records will appear here."
      />
    </div>
  );
}

function DeductionsPage({ deductions, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () => filterRows(filterRows(deductions, globalSearch, ["id", "memberName", "memberId", "reason", "status"]), search, ["id", "memberName", "memberId", "reason", "status"]),
    [deductions, globalSearch, search],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Salary deductions"
        title="Deduction verification"
        description="Verify payroll deductions, track failed deductions, and prepare employer remittance reviews."
      />
      <DataTable
        title="Deduction records"
        description="Salary deduction records returned by finance endpoints"
        search={search}
        onSearch={setSearch}
        columns={[
          { key: "id", label: "Deduction ID" },
          { key: "memberName", label: "Member", render: (value, row) => value || row.member?.name || "-" },
          { key: "amount", label: "Amount", render: formatCurrency },
          { key: "reason", label: "Reason", render: (value) => value || "-" },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={value || "Pending"} /> },
          { key: "date", label: "Date", render: formatDate },
        ]}
        data={rows}
        emptyTitle="No deductions found"
        emptyDescription="Salary deduction records will appear here."
      />
    </div>
    <TransactionsPage data={data} embedded onVerifyTransaction={onVerifyTransaction} globalSearch={globalSearch} />
  </div>);
}

function DividendsPage({ dividends, onReviewDividend, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () => filterRows(filterRows(dividends, globalSearch, ["id", "memberId", "status"]), search, ["id", "memberId", "status"]),
    [dividends, globalSearch, search],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Dividends"
        title="Dividend processing"
        description="Review dividend declarations, payout approvals, distribution history, and report exports."
      />
      <DataTable
        title="Dividend records"
        description="Dividend declarations and payout history"
        search={search}
        onSearch={setSearch}
        columns={[
          { key: "id", label: "Dividend ID" },
          { key: "amount", label: "Amount", render: formatCurrency },
          { key: "sharePercentage", label: "Rate", render: (value) => (value ? `${value}%` : "-") },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={value || "Pending"} /> },
          { key: "declaredAt", label: "Declared", render: formatDate },
          { key: "id", label: "Action", render: (value) => <button onClick={() => onReviewDividend?.(value)} className="text-sm font-semibold text-emerald-700">Review</button> },
        ]}
        data={rows}
        emptyTitle="No dividends found"
        emptyDescription="Dividend declarations will appear here when available."
      />
    </div>
    <DataTable title={embedded?"Recent transactions":"Transaction processing"} description="Verify deposits, withdrawals, fees, disbursements, repayments, and dividend transactions" search={search} onSearch={setSearch}
      columns={[...columns, { key: "id", label: "Action", render: (v,r) => (<div className="flex gap-2"><button onClick={()=>onVerifyTransaction?.(v)} className="text-sm font-semibold text-emerald-700">Verify</button>{onVoidTransaction?<button onClick={()=>onVoidTransaction(v,r)} className="text-sm font-semibold text-rose-700">Void</button>:null}</div>)}]}
      data={filtered} emptyTitle="No transactions" emptyDescription="Transaction records will appear here." />
  </div>);
  if (embedded) return content;
  return (<div className="space-y-6"><SectionHeader eyebrow="Transactions" title="Transaction processing" description="Verify, filter by date range, classify deposits, and export data." />{content}</div>);
}

function ReportsPage({ data }) {
  const exportReport = (filename) => {
    exportRowsToCsv({
      filename,
      rows: [
        ...data.transactions.map((item) => ({ section: "Transaction", ...item })),
        ...data.loans.map((item) => ({ section: "Loan", ...item })),
        ...data.shares.map((item) => ({ section: "Savings", ...item })),
        ...data.dividends.map((item) => ({ section: "Dividend", ...item })),
      ],
      columns: [
        { key: "section", label: "Section" },
        { key: "id", label: "ID" },
        { key: "memberId", label: "Member ID" },
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount" },
        { key: "principal", label: "Principal" },
        { key: "status", label: "Status" },
        { key: "createdAt", label: "Created" },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Financial reports"
        title="Reports and exports"
        description="Generate cash flow, savings, repayment, dividend, and monthly financial summaries."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Export PDF</button>
            <button type="button" onClick={() => exportReport("finance-report.csv")} className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Export Excel</button>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel title="Cash flow" data={getMonthlySeries(data.transactions)} type="bar" />
        <AnalyticsPanel title="Dividend distribution" data={getMonthlySeries(data.dividends, (item) => item.amount)} color="#0369a1" />
        <AnalyticsPanel title="Loan repayments" data={getMonthlySeries(data.transactions.filter((item) => String(item.type || "").toUpperCase().includes("REPAYMENT")))} color="#047857" />
        <AnalyticsPanel title="Savings reports" data={getMonthlySeries(data.shares, (item) => item.totalInvested || item.shares)} color="#b45309" />
      </div>
    </div>
  </div>);
}

export default function FinanceDashboard() {
  const location = useLocation();
  const { accessToken } = useContext(AuthContext);
  const dashboardBasePath = getDashboardPath("FINANCE");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [data, setData] = useState({
    transactions: [],
    loans: [],
    shares: [],
    dividends: [],
    deductions: [],
  });

  async function loadDashboardData({ showLoading = true } = {}) {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    const results = await Promise.allSettled([
      getAllTransactions(accessToken),
      getAllLoans(accessToken),
      getAllShares(accessToken),
      getAllDividends(accessToken),
      getAllDeductions(accessToken),
    ]);

    const rejected = results.filter((result) => result.status === "rejected");
    setLoadError(rejected.length ? `${rejected.length} dashboard section${rejected.length === 1 ? "" : "s"} failed to refresh. Showing available data.` : "");
    setData({
      transactions: results[0].status === "fulfilled" && Array.isArray(results[0].value) ? results[0].value : [],
      loans: results[1].status === "fulfilled" && Array.isArray(results[1].value) ? results[1].value : [],
      shares: results[2].status === "fulfilled" && Array.isArray(results[2].value) ? results[2].value : [],
      dividends: results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : [],
      deductions: results[4].status === "fulfilled" && Array.isArray(results[4].value) ? results[4].value : [],
    });
    setLoading(false);
  }

function AddCompanyModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", registrationNumber: "", contactEmail: "", contactPhone: "" });
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}><div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e)=>e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h4 className="text-lg font-semibold">Add New Company</h4><button onClick={onClose}><X size={20}/></button></div><div className="grid gap-4">{[{l:"Company Name",n:"name"},{l:"Registration No.",n:"registrationNumber"},{l:"Contact Email",n:"contactEmail"},{l:"Contact Phone",n:"contactPhone"}].map((f)=>(<label key={f.n} className="block text-sm font-semibold text-slate-700">{f.l}<input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form[f.n]} onChange={(e)=>setForm((c)=>({...c,[f.n]:e.target.value}))}/></label>))}<button onClick={()=>{if(form.name.trim())onSubmit(form);}} className="rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white">Create Company</button></div></div></div>);
}

function AddMemberModal({ companies, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", phone: "", company: "", salary: "", deduction: "" });
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}><div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e)=>e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h4 className="text-lg font-semibold">Add Member</h4><button onClick={onClose}><X size={20}/></button></div><div className="grid gap-4"><label className="block text-sm font-semibold text-slate-700">Name<input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e)=>setForm((c)=>({...c,name:e.target.value}))}/></label><label className="block text-sm font-semibold text-slate-700">Phone<input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.phone} onChange={(e)=>setForm((c)=>({...c,phone:e.target.value}))}/></label><label className="block text-sm font-semibold text-slate-700">Company<select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.company} onChange={(e)=>setForm((c)=>({...c,company:e.target.value}))}><option value="">— Select —</option>{companies.map((c)=>(<option key={c.id} value={c.name}>{c.name}</option>))}</select></label><label className="block text-sm font-semibold text-slate-700">Salary<input type="number" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.salary} onChange={(e)=>setForm((c)=>({...c,salary:e.target.value}))}/></label><label className="block text-sm font-semibold text-slate-700">Deduction<input type="number" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.deduction} onChange={(e)=>setForm((c)=>({...c,deduction:e.target.value}))}/></label><button onClick={()=>{if(form.name.trim())onSubmit({...form,salary:Number(form.salary)||0,deduction:Number(form.deduction)||0});}} className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Add Member</button></div></div></div>);
}

    load();
    if (accessToken) {
      intervalId = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          loadDashboardData({ showLoading: false });
        }
      }, 120000);
    }
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeoutId = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  async function runAction(action, successMessage) {
    try {
      setFeedback(null);
      await action();
      setFeedback({ type: "success", message: successMessage });
      await loadDashboardData({ showLoading: false });
    } catch (error) {
      setFeedback({ type: "error", message: error?.message || "Action failed" });
    }
  }

// ============================================================
// REPORTS
// ============================================================
function FinancialReportsPage({ data }) {
  const [timeFilter, setTimeFilter] = useState("monthly");
  const transactions = data.transactions || [];
  const loans = data.loans || MOCK_LOANS_QUEUE;

  const timeSeries = useMemo(() => {
    const series = {};
    const formatKey = (d) => {
      if (timeFilter==="daily") return d.toISOString().split("T")[0];
      if (timeFilter==="monthly") return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      return `${d.getFullYear()}`;
    };
    transactions.forEach((t) => {
      const d = t.createdAt||t.date; if(!d) return;
      const key = formatKey(new Date(d));
      if(!series[key]) series[key]={deposits:0,withdrawals:0,repayments:0,disbursements:0,count:0};
      const type = String(t.type||"").toUpperCase();
      if(type.includes("DEPOSIT")) series[key].deposits+=Number(t.amount||0);
      else if(type.includes("WITHDRAW")) series[key].withdrawals+=Number(t.amount||0);
      else if(type.includes("REPAYMENT")) series[key].repayments+=Number(t.amount||0);
      else if(type.includes("DISBURSE")) series[key].disbursements+=Number(t.amount||0);
      series[key].count++;
    });
    return Object.entries(series).sort(([a],[b])=>a.localeCompare(b)).slice(-30).map(([label,vals])=>({label,...vals}));
  }, [transactions, timeFilter]);

  const reportRows = timeSeries;

  const totalDeposits = transactions.filter((t) => String(t.type||"").toUpperCase().includes("DEPOSIT")).reduce((s,t)=>s+Number(t.amount||0),0);
  const shareCapitalTxs = transactions.filter((t) => { const tp = String(t.type||"").toLowerCase(); return (tp.includes("deposit")||tp.includes("payment")) && (tp.includes("share")||tp.includes("capital")); });
  const savingsTxs = transactions.filter((t) => { const tp = String(t.type||"").toLowerCase(); return (tp.includes("deposit")||tp.includes("payment")) && (tp.includes("savings")); });
  const shareCapitalDeposits = shareCapitalTxs.reduce((s,t)=>s+Number(t.amount||0),0);
  const savingsDeposits = savingsTxs.reduce((s,t)=>s+Number(t.amount||0),0);

  const loanProducts = ["EMERGENCY","EDUCATION","DEVELOPMENT","WELFARE"];
  const repayByProduct = {};
  const disburseByProduct = {};
  loanProducts.forEach((p) => {
    repayByProduct[p] = loans.filter((l) => String(l.type||"").toUpperCase()===p).reduce((s,l)=>s+Number(l.paid||0),0);
    disburseByProduct[p] = loans.filter((l) => String(l.type||"").toUpperCase()===p && ["DISBURSED","ACTIVE","OVERDUE"].includes(String(l.status||"").toUpperCase())).reduce((s,l)=>s+Number(l.principal||0),0);
  });
  const totalRepayments = loans.reduce((s,l)=>s+Number(l.paid||0),0);
  const totalDisbursed = loans.filter((l) => ["DISBURSED","ACTIVE","OVERDUE"].includes(String(l.status||"").toUpperCase())).reduce((s,l)=>s+Number(l.principal||0),0);

  return (<div className="space-y-6">
    <SectionHeader eyebrow="Reports" title="Reports & analytics" description="Live KPI aggregates with daily, monthly, and yearly filtering."
      action={<button onClick={()=>exportToCSV(reportRows,[{key:"label",label:"Period"},{key:"deposits"},{key:"withdrawals"},{key:"repayments"},{key:"disbursements"},{key:"count"}],"financial-reports.csv")} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><Download size={14}/>Export CSV</button>} />

    {/* Time filter */}
    <div className="flex items-center gap-3">
      {["daily","monthly","yearly"].map((tf)=>(<button key={tf} onClick={()=>setTimeFilter(tf)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${timeFilter===tf?"bg-slate-950 text-white":"bg-slate-100 text-slate-700"}`}>{tf}</button>))}
    </div>

    {/* DEPOSITS GROUP */}
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-600" /><h5 className="text-base font-semibold text-slate-950">Total Deposits</h5><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{formatCurrency(totalDeposits)}</span></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Share Capital</p><p className="mt-1 text-xl font-semibold text-sky-700">{formatCurrency(shareCapitalDeposits)}</p><p className="mt-1 text-xs text-slate-500">Deposits allocated to share ownership</p></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Savings Pools</p><p className="mt-1 text-xl font-semibold text-emerald-700">{formatCurrency(savingsDeposits)}</p><p className="mt-1 text-xs text-slate-500">General savings deposits</p></div>
      </div>
    </div>

    {/* LOAN REPAYMENTS GROUP */}
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2"><CreditCard size={20} className="text-sky-600" /><h5 className="text-base font-semibold text-slate-950">Loan Repayments</h5><span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">{formatCurrency(totalRepayments)}</span></div>
      <div className="grid gap-3 md:grid-cols-4">
        {loanProducts.map((p) => (<div key={p} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{p.charAt(0)+p.slice(1).toLowerCase()} Loans</p><p className="mt-1 text-lg font-semibold text-sky-700">{formatCurrency(repayByProduct[p])}</p></div>))}
      </div>
    </div>

    {/* LOAN DISBURSEMENTS GROUP */}
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2"><Banknote size={20} className="text-amber-600" /><h5 className="text-base font-semibold text-slate-950">Loan Disbursements</h5><span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{formatCurrency(totalDisbursed)}</span></div>
      <div className="grid gap-3 md:grid-cols-4">
        {loanProducts.map((p) => (<div key={p} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{p.charAt(0)+p.slice(1).toLowerCase()} Loans</p><p className="mt-1 text-lg font-semibold text-amber-700">{formatCurrency(disburseByProduct[p])}</p></div>))}
      </div>
    </div>

    {/* CHARTS */}
    <div className="grid gap-5 xl:grid-cols-2">
      <AnalyticsPanel title={`Deposits (${timeFilter})`} data={timeSeries.map(s=>({label:s.label,value:s.deposits}))} type="bar" color="#8cc63f"/>
      <AnalyticsPanel title={`Repayments (${timeFilter})`} data={timeSeries.map(s=>({label:s.label,value:s.repayments}))} type="bar" color="#0369a1"/>
    </div>

    {/* TABLE */}
    <div className="overflow-x-auto rounded-lg border"><table className="min-w-full"><thead><tr className="bg-slate-50">{["Period","Deposits","Withdrawals","Repayments","Disbursements","Count"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{timeSeries.map((row,i)=>(<tr key={i}><td className="px-4 py-3 text-sm font-semibold">{row.label}</td><td className="px-4 py-3 text-sm text-emerald-700">{formatCurrency(row.deposits)}</td><td className="px-4 py-3 text-sm text-rose-700">{formatCurrency(row.withdrawals)}</td><td className="px-4 py-3 text-sm text-sky-700">{formatCurrency(row.repayments)}</td><td className="px-4 py-3 text-sm text-amber-700">{formatCurrency(row.disbursements)}</td><td className="px-4 py-3 text-sm">{row.count}</td></tr>))}</tbody></table></div>
  </div>);
}

  const handleVoidTransaction = (transactionId) =>
    setPendingAction({
      title: "Void transaction",
      description: "Provide a reason before voiding this transaction.",
      requiresReason: true,
      action: (reason) => runAction(() => voidTransaction(transactionId, reason, accessToken), "Transaction voided successfully"),
    });

  const handleApproveLoan = (loanId) =>
    setPendingAction({
      title: "Approve loan",
      description: "This will approve the selected loan for the next workflow step.",
      action: () => runAction(() => approveLoan(loanId, accessToken), "Loan approved successfully"),
    });

  const handleRejectLoan = (loanId) =>
    setPendingAction({
      title: "Reject loan",
      description: "Provide a reason so the decision is recorded clearly.",
      requiresReason: true,
      action: (reason) => runAction(() => rejectLoan(loanId, reason, accessToken), "Loan rejected successfully"),
    });

  const handleDisburseLoan = (loanId) =>
    setPendingAction({
      title: "Disburse loan",
      description: "This will mark the selected loan for disbursement. Confirm the loan details before continuing.",
      action: () => runAction(() => disburseLoan(loanId, accessToken), "Loan disbursed successfully"),
    });

  const handleReviewLoan = (loanId) =>
    setFeedback({ type: "success", message: `Loan ${loanId} selected for repayment review.` });

  const handleReviewDividend = (dividendId) =>
    setFeedback({ type: "success", message: `Dividend ${dividendId} selected for review.` });

  const pwField = (label, name) => (<label className="block text-sm font-semibold text-slate-700">{label}<div className="relative"><input type={showing[name]?"text":"password"} className="mt-1 w-full rounded-lg border px-3.5 py-3 pr-12 text-sm" value={passwords[name]} onChange={(e)=>setPasswords((c)=>({...c,[name]:e.target.value}))}/><button type="button" onClick={()=>setShowing((s)=>({...s,[name]:!s[name]}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">{showing[name]?"Hide":"Show"}</button></div></label>);

  const content = (() => {
    if (loading) return <SkeletonDashboard />;
    if (isHome) return <FinanceHome data={data} onVerifyTransaction={handleVerifyTransaction} globalSearch={globalSearch} />;
    if (path.includes("/transactions")) return <TransactionsPage transactions={data.transactions} onVerifyTransaction={handleVerifyTransaction} onVoidTransaction={handleVoidTransaction} globalSearch={globalSearch} />;
    if (path.includes("/loan-disbursements") || path.includes("/loans")) return <LoansPage loans={data.loans} mode="disbursements" onApproveLoan={handleApproveLoan} onRejectLoan={handleRejectLoan} onDisburseLoan={handleDisburseLoan} globalSearch={globalSearch} />;
    if (path.includes("/loan-repayments")) return <LoansPage loans={data.loans} mode="repayments" onReviewLoan={handleReviewLoan} globalSearch={globalSearch} />;
    if (path.includes("/savings") || path.includes("/shares")) return <SavingsPage shares={data.shares} globalSearch={globalSearch} />;
    if (path.includes("/deductions")) return <DeductionsPage deductions={data.deductions} globalSearch={globalSearch} />;
    if (path.includes("/dividends")) return <DividendsPage dividends={data.dividends} onReviewDividend={handleReviewDividend} globalSearch={globalSearch} />;
    if (path.includes("/reports")) return <ReportsPage data={data} />;
    if (path.includes("/member-profiles")) {
      return <RoutePlaceholder eyebrow="Member financial profiles" title="Member financial profiles" description="View savings history, share contributions, loan repayment history, salary deductions, and dividend history by member." capabilities={["Savings history", "Share contributions", "Loan repayments", "Salary deductions", "Dividend history"]} />;
    }
    if (path.includes("/notifications")) {
      return <RoutePlaceholder eyebrow="Notifications" title="Finance notifications" description="Payment failures, approval events, disbursement reminders, and reporting alerts." capabilities={["Failed payment alerts", "Pending disbursements", "Payroll reminders", "Dividend notices"]} />;
    }
    if (path.includes("/security")) {
      return <RoutePlaceholder eyebrow="Security" title="Finance security" description="Security status, session review, verification controls, and role-based access protections." capabilities={["JWT sessions", "Session expiry", "Role-based access", "Access audit trail"]} />;
    }
    return <FinanceHome data={data} />;
  })();

  return (
    <div className="enterprise-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:pl-72">
        <TopNavbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
          unreadCount={0}
          searchValue={globalSearch}
          onSearchChange={setGlobalSearch}
        />
        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
          {loadError ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {loadError}
            </div>
          ) : null}
          {feedback ? (
            <div className={`mb-4 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              <span>{feedback.message}</span>
              <button type="button" onClick={() => setFeedback(null)} className="text-xs font-semibold uppercase tracking-[0.12em]">Close</button>
            </div>
          ) : null}
          {content}
        </div>
      </main>
      <ConfirmActionDialog
        action={pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={async (reason) => {
          const action = pendingAction;
          setPendingAction(null);
          await action?.action(reason);
        }}
      />
    </div>

    {/* Edit Profile Form */}
    <form onSubmit={handleSaveProfile} className="space-y-4 rounded-lg border bg-white p-6">
      <h5 className="text-base font-semibold text-slate-950">Personal information</h5>
      {[{l:"Full Name",n:"name",t:"text"},{l:"Email",n:"email",t:"email"},{l:"Phone",n:"phone",t:"text"}].map((f)=>(<label key={f.n} className="block text-sm font-semibold text-slate-700">{f.l}<input type={f.t} className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm" value={form[f.n]} onChange={(e)=>setForm((c)=>({...c,[f.n]:e.target.value}))}/></label>))}
      <button disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white">{saving?<RefreshCw className="animate-spin" size={17}/>:<CheckCircle2 size={17}/>}{saving?"Saving...":"Save changes"}</button>
    </form>

    {/* Change Password Form */}
    {pwMessage && <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${pwMessage.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{pwMessage.text}</div>}
    <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-lg border bg-white p-6">
      <h5 className="text-base font-semibold text-slate-950">Change password</h5>
      {pwField("Current password","current")}{pwField("New password","new")}{pwField("Confirm new password","confirm")}
      <button disabled={pwSaving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white"><LockKeyhole size={17}/>{pwSaving?"Updating...":"Update password"}</button>
    </form>
  </div>);
}

function FinancierSecuritySection({ user, accessToken }) {
  return <FinancierProfileSettings user={user} accessToken={accessToken} />;
}