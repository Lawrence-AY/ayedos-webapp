import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Banknote,
  CreditCard,
  Landmark,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import {
  approveLoan,
  disburseLoan,
  getAllDeductions,
  getAllDividends,
  getAllLoans,
  getAllShares,
  getAllTransactions,
  rejectLoan,
  verifyTransaction,
  voidTransaction,
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
  return rows.filter((row) =>
    keys.some((key) => String(row?.[key] || "").toLowerCase().includes(term)),
  );
}

function getFinanceStats(data) {
  const transactions = data.transactions || [];
  const loans = data.loans || [];
  const now = new Date();
  const isToday = (value) => {
    if (!value) return false;
    const date = new Date(value);
    return date.toDateString() === now.toDateString();
  };
  const isMonth = (value) => {
    if (!value) return false;
    const date = new Date(value);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };
  const byType = (type) =>
    transactions
      .filter((transaction) => String(transaction.type || "").toUpperCase().includes(type))
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  return {
    dailyTransactions: transactions.filter((transaction) => isToday(transaction.createdAt || transaction.date)).length,
    totalDeposits: byType("DEPOSIT"),
    totalWithdrawals: byType("WITHDRAWAL"),
    activeLoans: loans.filter((loan) => ["ACTIVE", "DISBURSED", "APPROVED"].includes(String(loan.status || "").toUpperCase())).length,
    loanRepayments: transactions
      .filter((transaction) => String(transaction.type || "").toUpperCase().includes("REPAYMENT"))
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    pendingDisbursements: loans.filter((loan) => String(loan.status || "").toUpperCase() === "APPROVED").length,
    monthlyRevenue: transactions
      .filter((transaction) => isMonth(transaction.createdAt || transaction.date))
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
  };
}

function FinanceHome({ data, onVerifyTransaction, globalSearch = "" }) {
  const stats = getFinanceStats(data);
  const transactionSeries = getMonthlySeries(data.transactions);
  const repaymentSeries = getMonthlySeries(
    data.transactions.filter((transaction) => String(transaction.type || "").toUpperCase().includes("REPAYMENT")),
  );

  const cards = [
    { label: "Daily Transactions", value: stats.dailyTransactions, icon: ReceiptText, tone: "blue", helper: "Transactions posted today" },
    { label: "Total Deposits", value: formatCurrency(stats.totalDeposits), icon: TrendingUp, tone: "emerald", helper: "Deposit transactions" },
    { label: "Total Withdrawals", value: formatCurrency(stats.totalWithdrawals), icon: TrendingDown, tone: "rose", helper: "Withdrawal transactions" },
    { label: "Active Loans", value: stats.activeLoans, icon: Landmark, tone: "blue", helper: "Active or disbursed loans" },
    { label: "Loan Repayments", value: formatCurrency(stats.loanRepayments), icon: CreditCard, tone: "emerald", helper: "Repayment collections" },
    { label: "Pending Disbursements", value: stats.pendingDisbursements, icon: Banknote, tone: "amber", helper: "Approved loans awaiting payout" },
    { label: "Monthly Revenue", value: formatCurrency(stats.monthlyRevenue), icon: WalletCards, tone: "slate", helper: "Current month transaction value" },
  ];

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

      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel title="Transaction volume" description="Monthly transaction value from finance records" data={transactionSeries} type="bar" />
        <AnalyticsPanel title="Loan repayment trends" description="Monthly repayment collections" data={repaymentSeries} color="#0369a1" />
      </div>

      <TransactionsPage transactions={data.transactions} embedded onVerifyTransaction={onVerifyTransaction} globalSearch={globalSearch} />
    </div>
  );
}

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

  if (embedded) return table;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Transactions"
        title="Transaction processing"
        description="Verify transactions, process manual deposits, handle disbursements, review salary deductions, and track failed payments."
      />
      {table}
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
  );
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
  );
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
  );
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
  );
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

  const handleVerifyTransaction = (transactionId) =>
    runAction(() => verifyTransaction(transactionId, accessToken), "Transaction verified successfully");

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

  const path = location.pathname;
  const isHome = path === "/dashboard" || path === "/dashboard/" || path === dashboardBasePath || path === `${dashboardBasePath}/`;

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
  );
}
