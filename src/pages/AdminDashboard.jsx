import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  Landmark,
  ReceiptText,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import {
  getAllApplications,
  getAllUsers,
  getSystemStats,
  reviewApplication,
  toggleUserStatus,
} from "../features/admin/adminService.js";
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
} from "../features/finance/financeService.js";
import {
  AnalyticsPanel,
  DataTable,
  KpiCard,
  RoutePlaceholder,
  SectionHeader,
  SkeletonDashboard,
  StatusBadge,
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

function AdminHome({ stats, users, applications, onReviewApplication }) {
  const pendingApplications = applications.filter((app) => String(app.status || "").toUpperCase().startsWith("PENDING"));
  const activeMembers = users.filter((user) => user.active !== false && String(user.role || "").toUpperCase() === "MEMBER");
  const applicationSeries = getMonthlySeries(applications, () => 1);
  const memberSeries = getMonthlySeries(users, () => 1);

  const cards = [
    { label: "Total Members", value: stats.totalMembers ?? activeMembers.length, icon: UsersRound, tone: "emerald", helper: "Registered member accounts" },
    { label: "Active Loans", value: stats.activeLoans ?? 0, icon: Landmark, tone: "blue", helper: "Loans currently active" },
    { label: "Total Savings", value: formatCurrency(stats.totalSavings), icon: WalletCards, tone: "emerald", helper: "Aggregate member savings" },
    { label: "Total Share Capital", value: formatCurrency(stats.totalShares ?? stats.totalShareCapital), icon: BriefcaseBusiness, tone: "slate", helper: "Paid share capital" },
    { label: "Monthly Transactions", value: stats.monthlyTransactions ?? 0, icon: ReceiptText, tone: "blue", helper: "Transactions this month" },
    { label: "Pending Applications", value: stats.pendingApplications ?? pendingApplications.length, icon: ClipboardCheck, tone: "amber", helper: "Awaiting admin review" },
    { label: "Pending Loan Approvals", value: stats.pendingLoanApprovals ?? 0, icon: FileText, tone: "amber", helper: "Loan workflow queue" },
    { label: "Total Dividends Paid", value: formatCurrency(stats.totalDividendsPaid), icon: BadgeCheck, tone: "emerald", helper: "Approved dividend payouts" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-[linear-gradient(135deg,#07182d_0%,#0f3443_52%,#155e3f_100%)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Admin command center</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
          SACCO operations overview
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
          Monitor member growth, applications, loans, dividends, controls, and financial governance from one enterprise workspace.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} trend="Live" />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel title="Application volume" description="Monthly membership application activity" data={applicationSeries} type="bar" />
        <AnalyticsPanel title="Member growth" description="New member records by month" data={memberSeries} color="#0369a1" />
      </div>

      <DataTable
        title="Pending applications queue"
        description="Latest applications requiring review"
        columns={[
          { key: "applicantName", label: "Applicant", render: (value, row) => value || row.name || "-" },
          { key: "applicantEmail", label: "Email", render: (value, row) => value || row.email || "-" },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
          { key: "submittedAt", label: "Submitted", render: formatDate },
          { key: "id", label: "Action", render: (value) => (
            <div className="flex gap-2">
              <button onClick={() => onReviewApplication(value, "APPROVED")} className="text-sm font-semibold text-emerald-700">Approve</button>
              <button onClick={() => onReviewApplication(value, "REJECTED")} className="text-sm font-semibold text-rose-700">Reject</button>
            </div>
          ) },
        ]}
        data={pendingApplications.slice(0, 8)}
        emptyTitle="No pending applications"
        emptyDescription="Membership applications awaiting approval will appear here."
      />
    </div>
  );
}

function MembersPage({ users, onToggleStatus, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const members = users.filter((user) => String(user.role || "MEMBER").toUpperCase() === "MEMBER");
  const rows = filterRows(filterRows(members, globalSearch, ["memberNumber", "name", "email", "phone", "nationalId"]), search, ["memberNumber", "name", "email", "phone", "nationalId"]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Member management"
        title="Members"
        description="Search, inspect, suspend, reactivate, export, and prepare KYC workflows for member records."
      />
      <DataTable
        title="Member register"
        description="All SACCO member accounts returned by the admin users endpoint"
        search={search}
        onSearch={setSearch}
        columns={[
          { key: "memberNumber", label: "Member Number", render: (value, row) => value || row.id || "-" },
          { key: "name", label: "Name" },
          { key: "nationalId", label: "ID Number", render: (value) => value || "-" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone", render: (value) => value || "-" },
          { key: "membershipType", label: "Membership Type", render: (value) => value || "Member" },
          { key: "verificationStatus", label: "Verification Status", render: (value, row) => <StatusBadge status={value || (row.emailVerified ? "Verified" : "Pending")} /> },
          { key: "active", label: "Account Status", render: (value, row) => <StatusBadge status={(value === false || row.isVerified === false) ? "Suspended" : "Active"} /> },
          { key: "id", label: "Action", render: (value, row) => (
            <button onClick={() => onToggleStatus(value, row.active === false || row.isVerified === false)} className="text-sm font-semibold text-emerald-700">
              {(row.active === false || row.isVerified === false) ? "Reactivate" : "Suspend"}
            </button>
          ) },
        ]}
        data={rows}
        emptyTitle="No members found"
        emptyDescription="Member records will appear here once returned by the backend."
      />
    </div>
  );
}

function ApplicationsPage({ applications, onReviewApplication, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const rows = filterRows(filterRows(applications, globalSearch, ["applicantName", "applicantEmail", "status", "id"]), search, ["applicantName", "applicantEmail", "status", "id"]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Application approval"
        title="Membership applications"
        description="Review KYC status, membership fee verification, application notes, and approval decisions."
      />
      <DataTable
        title="Applications queue"
        description="Approve or reject membership applications after KYC and payment review"
        search={search}
        onSearch={setSearch}
        columns={[
          { key: "id", label: "Application ID" },
          { key: "applicantName", label: "Applicant", render: (value, row) => value || row.name || "-" },
          { key: "applicantEmail", label: "Email", render: (value, row) => value || row.email || "-" },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
          { key: "kycStatus", label: "KYC", render: (value) => <StatusBadge status={value || "Pending"} /> },
          { key: "membershipFeeStatus", label: "Fee", render: (value) => <StatusBadge status={value || "Pending"} /> },
          { key: "submittedAt", label: "Submitted", render: formatDate },
          { key: "id", label: "Decision", render: (value) => <div className="flex gap-2"><button onClick={() => onReviewApplication(value, "APPROVED")} className="text-sm font-semibold text-emerald-700">Approve</button><button onClick={() => onReviewApplication(value, "REJECTED")} className="text-sm font-semibold text-rose-700">Reject</button></div> },
        ]}
        data={rows}
        emptyTitle="No applications found"
        emptyDescription="Membership applications will appear here when submitted."
      />
    </div>
  );
}

function NotificationsPage() {
  return (
    <RoutePlaceholder
      eyebrow="Notifications"
      title="Admin notifications"
      description="System alerts, approval notices, risk events, and service messages for administrators."
      capabilities={["Notification service integration", "Read/unread state", "Approval alerts", "Security notices"]}
    />
  );
}

function AdminLoansPage({ loans, onApproveLoan, onRejectLoan, onDisburseLoan, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const rows = filterRows(filterRows(loans, globalSearch, ["id", "type", "status", "memberName", "memberId"]), search, ["id", "type", "status", "memberName", "memberId"]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Loan management" title="Loan operations" description="Approve, reject, disburse, and monitor loan workflow records." />
      <DataTable
        title="Loan register"
        description="All loan records available through finance loan services"
        search={search}
        onSearch={setSearch}
        columns={[
          { key: "memberName", label: "Member", render: (value, row) => value || row.member?.name || row.memberId || "-" },
          { key: "type", label: "Loan Type" },
          { key: "principal", label: "Amount", render: formatCurrency },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
          { key: "approvalStage", label: "Approval Stage", render: (value, row) => value || row.status || "-" },
          { key: "dueDate", label: "Due Date", render: formatDate },
          { key: "id", label: "Actions", render: (value, row) => (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onApproveLoan(value)} className="text-sm font-semibold text-emerald-700">Approve</button>
              <button onClick={() => onDisburseLoan(value)} className="text-sm font-semibold text-sky-700">Disburse</button>
              <button onClick={() => onRejectLoan(value, row)} className="text-sm font-semibold text-rose-700">Reject</button>
            </div>
          ) },
        ]}
        data={rows}
        emptyTitle="No loan records"
        emptyDescription="Loan records will appear here when members apply."
      />
    </div>
  );
}

function AdminTransactionsPage({ transactions, onVerifyTransaction, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const rows = filterRows(filterRows(transactions, globalSearch, ["id", "reference", "type", "status", "description"]), search, ["id", "reference", "type", "status", "description"]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Transactions" title="Transaction management" description="View, filter, verify, and prepare reversal workflows for all SACCO transactions." />
      <DataTable
        title="Transaction register"
        description="Deposits, withdrawals, fees, disbursements, repayments, and dividends"
        search={search}
        onSearch={setSearch}
        columns={[
          { key: "id", label: "Reference", render: (value, row) => row.reference || value || "-" },
          { key: "type", label: "Type" },
          { key: "amount", label: "Amount", render: formatCurrency },
          { key: "status", label: "Status", render: (value) => <StatusBadge status={value} /> },
          { key: "createdAt", label: "Date", render: formatDate },
          { key: "id", label: "Action", render: (value) => <button onClick={() => onVerifyTransaction(value)} className="text-sm font-semibold text-emerald-700">Verify</button> },
        ]}
        data={rows}
        emptyTitle="No transactions"
        emptyDescription="Transaction records will appear here after posting."
      />
    </div>
  );
}

function AdminSimpleDataPage({ eyebrow, title, description, rows, columns, emptyTitle, emptyDescription, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const filteredRows = filterRows(filterRows(rows, globalSearch, ["id", "memberId", "memberName", "status", "reason"]), search, ["id", "memberId", "memberName", "status", "reason"]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <DataTable
        title={title}
        description={description}
        search={search}
        onSearch={setSearch}
        columns={columns}
        data={filteredRows}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}

function AdminSecurityPage() {
  return (
    <RoutePlaceholder
      eyebrow="Security"
      title="Admin security"
      description="Central controls for privileged access, session review, staff permissions, and security posture."
      capabilities={["Role-based permissions", "Session expiration handling", "Privileged access review", "Audit event monitoring"]}
    />
  );
}

export default function AdminDashboard() {
  const location = useLocation();
  const { accessToken } = useContext(AuthContext);
  const dashboardBasePath = getDashboardPath("ADMIN");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({});
  const [data, setData] = useState({
    users: [],
    applications: [],
    loans: [],
    transactions: [],
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
      getAllApplications(accessToken),
      getSystemStats(accessToken),
      getAllUsers(accessToken),
      getAllLoans(accessToken),
      getAllTransactions(accessToken),
      getAllShares(accessToken),
      getAllDividends(accessToken),
      getAllDeductions(accessToken),
    ]);

    setData({
      applications: results[0].status === "fulfilled" && Array.isArray(results[0].value) ? results[0].value : [],
      users: results[2].status === "fulfilled" && Array.isArray(results[2].value) ? results[2].value : [],
      loans: results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : [],
      transactions: results[4].status === "fulfilled" && Array.isArray(results[4].value) ? results[4].value : [],
      shares: results[5].status === "fulfilled" && Array.isArray(results[5].value) ? results[5].value : [],
      dividends: results[6].status === "fulfilled" && Array.isArray(results[6].value) ? results[6].value : [],
      deductions: results[7].status === "fulfilled" && Array.isArray(results[7].value) ? results[7].value : [],
    });
    setStats(results[1].status === "fulfilled" && results[1].value ? results[1].value : {});
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

  const handleReviewApplication = (applicationId, status) =>
    runAction(
      () => reviewApplication(applicationId, status, status === "REJECTED" ? "Rejected by admin" : "", accessToken),
      `Application ${status.toLowerCase()} successfully`,
    );

  const handleToggleStatus = (userId, activate) =>
    runAction(
      () => toggleUserStatus(userId, activate, accessToken),
      activate ? "Member reactivated successfully" : "Member suspended successfully",
    );

  const handleApproveLoan = (loanId) =>
    runAction(() => approveLoan(loanId, accessToken), "Loan approved successfully");

  const handleRejectLoan = (loanId) =>
    runAction(() => rejectLoan(loanId, "Rejected by admin", accessToken), "Loan rejected successfully");

  const handleDisburseLoan = (loanId) =>
    runAction(() => disburseLoan(loanId, accessToken), "Loan disbursed successfully");

  const handleVerifyTransaction = (transactionId) =>
    runAction(() => verifyTransaction(transactionId, accessToken), "Transaction verified successfully");

  const path = location.pathname;
  const isHome = path === "/dashboard" || path === "/dashboard/" || path === dashboardBasePath || path === `${dashboardBasePath}/`;

  const content = (() => {
    if (loading) return <SkeletonDashboard />;
    if (isHome) return <AdminHome stats={stats} users={data.users} applications={data.applications} onReviewApplication={handleReviewApplication} />;
    if (path.includes("/members")) return <MembersPage users={data.users} onToggleStatus={handleToggleStatus} globalSearch={globalSearch} />;
    if (path.includes("/applications")) return <ApplicationsPage applications={data.applications} onReviewApplication={handleReviewApplication} globalSearch={globalSearch} />;
    if (path.includes("/notifications")) return <NotificationsPage />;
    if (path.includes("/security")) return <AdminSecurityPage />;
    if (path.includes("/loans")) return <AdminLoansPage loans={data.loans} onApproveLoan={handleApproveLoan} onRejectLoan={handleRejectLoan} onDisburseLoan={handleDisburseLoan} globalSearch={globalSearch} />;
    if (path.includes("/transactions")) return <AdminTransactionsPage transactions={data.transactions} onVerifyTransaction={handleVerifyTransaction} globalSearch={globalSearch} />;
    if (path.includes("/savings") || path.includes("/shares")) {
      return <AdminSimpleDataPage eyebrow="Accounts" title={path.includes("/savings") ? "Savings accounts" : "Share accounts"} description="Contribution records available through finance account services." rows={data.shares} columns={[
        { key: "id", label: "Record ID" },
        { key: "memberId", label: "Member" },
        { key: "shares", label: "Shares", render: (value) => Number(value || 0).toLocaleString() },
        { key: "totalInvested", label: "Invested", render: formatCurrency },
        { key: "purchaseDate", label: "Date", render: formatDate },
      ]} emptyTitle="No account records" emptyDescription="Savings and share records will appear here." globalSearch={globalSearch} />;
    }
    if (path.includes("/deductions")) {
      return <AdminSimpleDataPage eyebrow="Salary deductions" title="Salary deductions" description="Payroll deduction records and verification history." rows={data.deductions} columns={[
        { key: "id", label: "Deduction ID" },
        { key: "memberName", label: "Member", render: (value, row) => value || row.memberId || "-" },
        { key: "amount", label: "Amount", render: formatCurrency },
        { key: "reason", label: "Reason" },
        { key: "date", label: "Date", render: formatDate },
      ]} emptyTitle="No deductions" emptyDescription="Salary deduction records will appear here." globalSearch={globalSearch} />;
    }
    if (path.includes("/dividends")) {
      return <AdminSimpleDataPage eyebrow="Dividends" title="Dividend management" description="Configure rates, calculate payouts, approve dividends, and generate distribution reports." rows={data.dividends} columns={[
        { key: "id", label: "Dividend ID" },
        { key: "memberId", label: "Member" },
        { key: "amount", label: "Amount", render: formatCurrency },
        { key: "sharePercentage", label: "Rate", render: (value) => (value ? `${value}%` : "-") },
        { key: "status", label: "Status", render: (value) => <StatusBadge status={value || "Declared"} /> },
        { key: "declaredAt", label: "Declared", render: formatDate },
      ]} emptyTitle="No dividends" emptyDescription="Dividend records will appear here." globalSearch={globalSearch} />;
    }
    if (path.includes("/reports")) {
      return <div className="space-y-6"><SectionHeader eyebrow="Reports" title="Reports & analytics" description="Financial and operational analytics generated from live system data." /><div className="grid gap-5 xl:grid-cols-2"><AnalyticsPanel title="Applications" data={getMonthlySeries(data.applications, () => 1)} type="bar" /><AnalyticsPanel title="Members" data={getMonthlySeries(data.users, () => 1)} color="#0369a1" /></div></div>;
    }
    if (path.includes("/audit-logs")) {
      return <RoutePlaceholder eyebrow="Audit logs" title="Audit log system" description="Track login activity, approvals, member changes, transaction modifications, and password changes." capabilities={["User", "Action", "Timestamp", "IP address", "Module affected"]} />;
    }
    if (path.includes("/configuration")) {
      return <RoutePlaceholder eyebrow="Configuration" title="System configuration" description="Configure SACCO policy values and financial rules." capabilities={["Membership fee", "Share capital minimum", "Loan interest rates", "Dividend rates", "OTP expiry"]} />;
    }
    if (path.includes("/staff-roles")) {
      return <RoutePlaceholder eyebrow="Staff & roles" title="Staff and role management" description="Manage internal staff, finance officers, administrators, and permission groups." capabilities={["Create staff", "Assign roles", "Deactivate access", "Permission matrix"]} />;
    }
    if (path.includes("/support")) {
      return <RoutePlaceholder eyebrow="Support" title="Admin support" description="Operational support queue for member issues, account escalations, and service requests." capabilities={["Ticket queue", "Escalations", "Member issue history", "Response tracking"]} />;
    }
    return <AdminHome stats={stats} users={data.users} applications={data.applications} />;
  })();

  return (
    <div className="min-h-screen bg-slate-100">
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
          {feedback ? (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {feedback.message}
            </div>
          ) : null}
          {content}
        </div>
      </main>
    </div>
  );
}
