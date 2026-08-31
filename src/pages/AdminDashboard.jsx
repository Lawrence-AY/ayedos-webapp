import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
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
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import { exportRichCSV } from "../utils/csvExport.js";
import { changePassword } from "../services/authService.js";
import {
  getAllUsers,
  getAllApplications,
  getSystemStats,
  reviewApplication,
  toggleUserStatus,
  getArchivedMembers,
  getMemberFinancialProfile,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  sendGlobalBroadcast,
  sendDirectNotification,
  getAuditLogs,
  getBlockedIdentityAttempts,
  unblockIdentityAttempt,
  updateAdminProfile,
  previewMemberCsvImport,
  commitMemberCsvImport,
} from "../features/admin/adminService.js";
import {
  getAllTransactions,
  getAllLoans,
  getAllShares,
  getAllDividends,
  getAllDeductions,
  getFinancialReports,
  getGroupBorrowingOverview,
} from "../features/finance/financeService.js";
import GroupBorrowingOverview from "../components/staff-dashboard/GroupBorrowingOverview.jsx";
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
  getMonthlySeries,
} from "../components/dashboard/EnterpriseDashboard.jsx";
import { findMemberByNumber } from "../features/search/searchService.js";
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import StaffSecurityPage from "../components/staff-dashboard/StaffSecurityPage.jsx";
import SupportPage from "../components/user-dashboard/SupportPage.jsx";
import MemberFinancialProfile from "../components/staff-dashboard/MemberFinancialProfile.jsx";
import OptOutRequestsPage from "../components/staff-dashboard/OptOutRequestsPage.jsx";
import SentNotificationsPanel from "../components/staff-dashboard/SentNotificationsPanel.jsx";
import { applyLoanPaymentEvent, useDashboardEvents } from "../features/realtime/dashboardEvents.js";

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
function normalizeAdminNotification(n) {
  const category = String(n.category || n.type || "ALERT").toUpperCase();
  return {
    ...n,
    type: category,
    time: n.time || n.createdAt,
    read: Boolean(n.isRead || n.read || n.readAt),
  };
}
function exportCSV(rows, columns, filename, options = {}) {
  exportRichCSV(rows, columns, filename, options);
}

export default function AdminDashboard() {
  const location = useLocation();
  const { user, accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => !n.read && !n.isRead && !n.readAt).length;

  const path = location.pathname;
  const db = getDashboardPath("ADMIN");
  let section = "home";
  if (path.includes("/members")) section = "members";
  else if (path.includes("/loans")) section = "loans";
  else if (path.includes("/transactions")) section = "transactions";
  else if (path.includes("/dividends")) section = "dividends";
  else if (path.includes("/deductions")) section = "deductions";
  else if (path.includes("/reports")) section = "reports";
  else if (path.includes("/settings")) section = "settings";
  else if (path.includes("/security")) section = "security";
  else if (path.includes("/support")) section = "support";
  else if (path.includes("/notifications")) section = "notifications";
  else if (path.includes("/audit-logs")) section = "audit-logs";

  const [data, setData] = useState({
    users: [],
    applications: [],
    stats: {},
    archived: [],
    transactions: [],
    loans: [],
    shares: [],
    dividends: [],
    deductions: [],
    auditLogs: [],
    auditSummary: { activeAdminSessions: 0 },
    reports: {},
    groupBorrowing: { items: [], summary: {} },
  });

  async function loadData({ showLoading = true } = {}) {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    const r = await Promise.allSettled([
      getAllUsers(accessToken),
      getAllApplications(accessToken),
      getSystemStats(accessToken),
      getArchivedMembers(accessToken),
      getAllTransactions(accessToken, { limit: 500 }),
      getAllLoans(accessToken),
      getAllShares(accessToken),
      getAllDividends(accessToken),
      getAllDeductions(accessToken),
      getAuditLogs(accessToken, { limit: 500 }),
      getAdminNotifications(accessToken),
      getFinancialReports(accessToken),
      getGroupBorrowingOverview(accessToken),
    ]);
    setData({
      users:
        r[0].status === "fulfilled" && Array.isArray(r[0].value)
          ? r[0].value
          : [],
      applications:
        r[1].status === "fulfilled" && Array.isArray(r[1].value)
          ? r[1].value
          : [],
      stats:
        r[2].status === "fulfilled"
          ? r[2].value
          : {},
      archived:
        r[3].status === "fulfilled" && Array.isArray(r[3].value)
          ? r[3].value
          : [],
      transactions:
        r[4].status === "fulfilled" && Array.isArray(r[4].value)
          ? r[4].value.filter((transaction) => ["SUCCESS", "PAID", "COMPLETED"].includes(String(transaction.status || "").toUpperCase()))
          : [],
      loans:
        r[5].status === "fulfilled" && Array.isArray(r[5].value)
          ? r[5].value
          : [],
      shares:
        r[6].status === "fulfilled" && Array.isArray(r[6].value)
          ? r[6].value
          : [],
      dividends:
        r[7].status === "fulfilled" && Array.isArray(r[7].value)
          ? r[7].value
          : [],
      deductions:
        r[8].status === "fulfilled" && Array.isArray(r[8].value)
          ? r[8].value
          : [],
      auditLogs:
        r[9].status === "fulfilled" && Array.isArray(r[9].value?.items || r[9].value)
          ? (r[9].value.items || r[9].value)
          : [],
      auditSummary: r[9].status === "fulfilled" ? (r[9].value?.summary || { activeAdminSessions: 0 }) : { activeAdminSessions: 0 },
      reports: r[11]?.status === "fulfilled" ? r[11].value : {},
      groupBorrowing: r[12]?.status === "fulfilled" ? r[12].value : { items: [], summary: {} },
    });
    if (r[10].status === "fulfilled" && Array.isArray(r[10].value)) {
      setNotifications(r[10].value.map(normalizeAdminNotification));
    }
    setLoading(false);
  }
  useEffect(() => {
    loadData();
  }, [accessToken]);
  useEffect(() => {
    const iv = setInterval(() => loadData({ showLoading: false }), 15000);
    return () => clearInterval(iv);
  }, [accessToken]);

  const realtimeHandlers = useMemo(() => ({
    onLoanPaymentProcessed: (payload) => {
      setData((current) => applyLoanPaymentEvent(current, payload));
      window.setTimeout(() => loadData({ showLoading: false }), 250);
    },
    onRecoveryNeeded: () => loadData({ showLoading: false }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [accessToken]);
  useDashboardEvents(accessToken, realtimeHandlers);

  async function markAllRead() {
    const readAt = new Date().toISOString();
    setNotifications((p) => p.map((n) => ({ ...n, read: true, isRead: true, readAt: n.readAt || readAt })));
    try {
      await markAllAdminNotificationsRead(accessToken);
    } catch (error) {
      loadData({ showLoading: false });
      alert(error.message);
    }
  }

  async function markOneRead(id) {
    const readAt = new Date().toISOString();
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true, isRead: true, readAt: n.readAt || readAt } : n)));
    try {
      await markAdminNotificationRead(id, accessToken);
    } catch (error) {
      loadData({ showLoading: false });
      alert(error.message);
    }
  }

  function renderContent() {
    if (loading) return <SkeletonDashboard />;
    switch (section) {
      case "members":
        return (
          <AdminMemberLifecycle
            data={data}
            accessToken={accessToken}
            onRefresh={() => loadData({ showLoading: false })}
          />
        );
      case "loans":
        return (
          <div className="space-y-6">
          <AdminReadOnlyTable
            title="Loan Management"
            data={data.loans}
            columns={[
              { key: "memberNumber", label: "Member Number" },
              { key: "memberName", label: "Member Name", render: (v, row) => v || row.member || "—" },
              { key: "type", label: "Loan Type" },
              {
                key: "principal",
                label: "Principal",
                render: (v) => formatCurrency(v),
              },
              {
                key: "balance",
                label: "Balance",
                render: (v) => formatCurrency(v || 0),
              },
              { key: "interestRate", label: "Interest Rate", render: (v) => `${Number(v || 0)}%` },
              { key: "duration", label: "Term (months)" },
              {
                key: "status",
                label: "Status",
                render: (v, row) => (
                  <div>
                    <StatusBadge status={row?.autoApproved ? "Auto-Approved (Emergency)" : v || "Pending"} />
                    {row?.autoApproved && row?.auditTimestamp ? <p className="mt-1 text-xs text-slate-500">{formatDate(row.auditTimestamp)}</p> : null}
                  </div>
                ),
              },
              { key: "createdAt", label: "Application Timestamp", render: formatDateSafe },
              { key: "disbursedDate", label: "Disbursed", render: formatDateSafe },
              { key: "nextPaymentDueAt", label: "Next Payment", render: formatDateSafe },
            ]}
            fileName="admin-loans.csv"
          />
          <GroupBorrowingOverview data={data.groupBorrowing} onRefresh={() => loadData({ showLoading: false })} title="Group Borrowing Oversight" />
          </div>
        );
      case "transactions":
        return <AdminTransactions data={data} />;
      case "dividends":
        return (
          <AdminReadOnlyTable
            title="Dividends"
            data={data.dividends}
            columns={[
              { key: "year", label: "Year" },
              { key: "rate", label: "Rate" },
              {
                key: "totalDistributed",
                label: "Distributed",
                render: (v) => formatCurrency(v),
              },
              { key: "membersCount", label: "Members" },
            ]}
            fileName="admin-dividends.csv"
          />
        );
      case "deductions":
        return <AdminSalaryDeductions data={data} />;
      case "reports":
        return <AdminReportsPage data={data} />;
      case "settings":
        return <AdminProfileSettings user={user} accessToken={accessToken} />;
      case "security":
        return <StaffSecurityPage user={user} accessToken={accessToken} />;
      case "support":
        return <SupportPage user={user} role="ADMIN" />;
      case "notifications":
        return (
          <AdminNotificationsPanel
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onMarkRead={markOneRead}
            accessToken={accessToken}
          />
        );
      case "audit-logs":
        return <AdminAuditLogs data={data.auditLogs} summary={data.auditSummary} />;
      default:
        return (
          <AdminHome
            data={data}
            accessToken={accessToken}
            onRefresh={() => loadData({ showLoading: false })}
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
        />
        <div className="mx-auto w-full max-w-[1500px] px-4 py-2 sm:px-2 lg:px-2">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function AdminHome({ data, accessToken, onRefresh }) {
  const [breakdown, setBreakdown] = useState("members");
  const pendingApps = data.applications.filter(
    (a) => String(a.status || "").toUpperCase() === "PENDING",
  );
  const activeMembers = data.users
    .filter((u) => u.membershipComplete === true)
    .map((u) => ({
      ...u,
      memberId: u.Member?.id || u.member?.id || u.memberId || "",
      memberNumber: u.Member?.memberNumber || u.member?.memberNumber || u.memberNumber || "",
      dateJoined: u.Member?.dateJoined || u.member?.dateJoined || u.createdAt,
      name: u.name || [u.firstName, u.lastName].filter(Boolean).join(" "),
      status: u.Member?.status || u.member?.status || "ACTIVE",
    }));
  const activeStatuses = new Set(["ACTIVE", "DISBURSED", "IN_ARREARS"]);
  const activeLoans = data.loans.filter((loan) => activeStatuses.has(String(loan.status || loan.financeStatus || "").toUpperCase()));
  const memberRows = activeMembers.map((member) => {
    const loans = activeLoans.filter((loan) => loan.memberId === member.memberId || (member.memberNumber && loan.memberNumber === member.memberNumber));
    return { ...member, activeLoans: loans.length, activeLoanBalance: loans.reduce((sum, loan) => sum + Number(loan.balance || 0), 0) };
  });
  const memberColumns = [
    { key: "memberNumber", label: "Member Number" },
    { key: "name", label: "Member Name" },
    { key: "createdAt", label: "Account Timestamp", render: formatDateSafe },
    { key: "activeLoans", label: "Active Loans" },
    { key: "activeLoanBalance", label: "Loan Balance", render: (v) => formatCurrency(v || 0) },
    { key: "dateJoined", label: "Date Joined", render: formatDateSafe },
    { key: "phone", label: "Phone Number" },
    { key: "nationalId", label: "National ID" },
    { key: "company", label: "Company", render: (v, row) => v || row.employer || "—" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v || "ACTIVE"} /> },
  ];
  const loanColumns = [
    { key: "memberNumber", label: "Member Number" },
    { key: "memberName", label: "Member Name", render: (v, row) => v || row.member || "—" },
    { key: "type", label: "Loan Type" },
    { key: "principal", label: "Principal", render: (v) => formatCurrency(v || 0) },
    { key: "balance", label: "Outstanding", render: (v) => formatCurrency(v || 0) },
    { key: "interestRate", label: "Interest Rate", render: (v) => `${Number(v || 0)}%` },
    { key: "duration", label: "Term (months)" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
    { key: "createdAt", label: "Application Timestamp", render: formatDateSafe },
    { key: "disbursedDate", label: "Disbursed", render: formatDateSafe },
    { key: "nextPaymentDueAt", label: "Next Payment", render: formatDateSafe },
  ];
  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Admin operations"
        title="System control center"
        description="Member lifecycle management, read-only financial oversight, communications hub, and audit logging."
        metrics={[
          { label: "Members", value: activeMembers.length },
          { label: "Pending Apps", value: pendingApps.length },
          { label: "Active Loans", value: activeLoans.length },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active Members"
          value={activeMembers.length}
          icon={UsersRound}
          tone="blue"
          trend="Live"
          onClick={() => setBreakdown("members")}
        />
        <KpiCard
          label="Pending Applications"
          value={pendingApps.length}
          icon={Clock3}
          tone="amber"
          trend="Review"
          onClick={() => setBreakdown("applications")}
        />
        <KpiCard
          label="Loans"
          value={activeLoans.length}
          icon={Landmark}
          tone="emerald"
          onClick={() => setBreakdown("loans")}
        />
        <KpiCard
          label="Audit Entries"
          value={data.auditLogs.length}
          icon={ShieldAlert}
          tone="slate"
          onClick={() => setBreakdown("audit")}
        />
      </div>
      {breakdown === "members" ? <AdminReadOnlyTable title="Active Member Breakdown" data={memberRows} columns={memberColumns} fileName="active-members.csv" />
        : breakdown === "loans" ? <AdminReadOnlyTable title="Active Loan Details" data={activeLoans} columns={loanColumns} fileName="active-loans.csv" />
        : breakdown === "audit" ? <AdminAuditLogs data={data.auditLogs} summary={data.auditSummary} embedded />
        : <AdminApplications data={data} accessToken={accessToken} onRefresh={onRefresh} embedded />}
    </div>
  );
}

// ============================================================
// MODULE 1: UNIFIED MEMBER MANAGEMENT — Tabbed: Applications + Registry
// ============================================================
function AdminMemberLifecycle({ data, accessToken, onRefresh }) {
  const [mainTab, setMainTab] = useState("applications");
  const [regTab, setRegTab] = useState("active");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearchMessage, setMemberSearchMessage] = useState("");
  const [memberSearchBusy, setMemberSearchBusy] = useState(false);

  async function searchMemberNumber(event) {
    event.preventDefault();
    setMemberSearchBusy(true);
    setMemberSearchMessage("");
    try {
      const result = await findMemberByNumber(search, accessToken);
      if (!result.member) {
        setSelectedMember(null);
        setMemberSearchMessage(result.message);
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
      });
      setMemberSearchMessage("Member found.");
    } catch (error) {
      setSelectedMember(null);
      setMemberSearchMessage(
        error?.message || "Unable to search for this member.",
      );
    } finally {
      setMemberSearchBusy(false);
    }
  }

  const mainTabs = [
    {
      key: "applications",
      label: "Membership Applications",
      icon: FileText,
      count: data.applications.filter(
        (a) => String(a.status || "").toUpperCase() === "PENDING",
      ).length,
    },
    {
      key: "registry",
      label: "Member Registry",
      icon: UsersRound,
      count:
        data.users.filter((u) => u.membershipComplete === true).length +
        data.archived.length,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Member management"
        title="Unified member control center"
        description="Process incoming membership applications and manage the complete member registry from one place."
        action={
          <button
            onClick={() =>
              exportCSV(
                mainTab === "applications"
                  ? data.applications
                  : [...data.users, ...data.archived].map((row) => ({
                      ...row,
                      memberNumber: row.memberNumber || row.Member?.memberNumber || row.member?.memberNumber || "",
                      dateJoined: row.dateJoined || row.Member?.dateJoined || row.member?.dateJoined || row.createdAt,
                    })),
                mainTab === "applications"
                  ? [
                      { key: "name", label: "Name" },
                      { key: "phone", label: "Phone Number" },
                      { key: "onboardingStage", label: "Onboarding Page" },
                      { key: "paymentStatus", label: "Payment" },
                      { key: "status", label: "Status" },
                      { key: "submittedDate", label: "Date" },
                    ]
                  : [
                      { key: "memberNumber", label: "Member Number" },
                      { key: "name", label: "Name" },
                      { key: "phone", label: "Phone Number" },
                      { key: "nationalId", label: "National ID" },
                      { key: "company", label: "Company" },
                      { key: "status", label: "Status" },
                      { key: "dateJoined", label: "Date Joined", render: formatDateSafe },
                    ],
                `members-${mainTab}.csv`,
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Download size={14} />
            Export CSV
          </button>
        }
      />
      <div className="flex gap-2">
        {mainTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setMainTab(t.key);
              setSelectedMember(null);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${mainTab === t.key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <t.icon size={14} />
            {t.label}
            {t.count > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${mainTab === t.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {mainTab === "applications" ? (
        <AdminApplications
          data={data}
          accessToken={accessToken}
          onRefresh={onRefresh}
        />
      ) : (
        <div className="space-y-6">
          <AdminBulkMemberImport accessToken={accessToken} onImported={onRefresh} />
          <div className="flex items-center gap-3">
            {[
              { k: "active", l: "Active Members" },
              { k: "archived", l: "Archived History" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setRegTab(t.k)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${regTab === t.k ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {t.l}
              </button>
            ))}
            <form
              onSubmit={searchMemberNumber}
              className="ml-auto flex items-center gap-2"
            >
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Registration/member number"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setMemberSearchMessage("");
                  }}
                  className="rounded-lg border py-2 pl-9 pr-4 text-sm"
                />
              </div>
              <button
                disabled={memberSearchBusy}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {memberSearchBusy ? "Searching..." : "Search"}
              </button>
            </form>
          </div>
          {memberSearchMessage ? (
            <p
              className={`text-sm font-medium ${selectedMember ? "text-emerald-700" : "text-amber-700"}`}
            >
              {memberSearchMessage}
            </p>
          ) : null}
          {selectedMember ? (
            <AdminMemberFinancialDetail
              member={selectedMember}
              accessToken={accessToken}
              onBack={() => setSelectedMember(null)}
            />
          ) : (
            <MemberRegistryTable
              regTab={regTab}
              data={data}
              search={search}
              onSelectMember={setSelectedMember}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MemberRegistryTable({ regTab, data, search, onSelectMember }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const active = data.users.filter((u) => u.membershipComplete === true);
  const archived = data.archived;
  const rows = regTab === "active" ? active : archived;
  const normalizedRows = rows.map((row) => ({
    ...row,
    memberId: row.memberId || row.Member?.id || row.member?.id || "",
    memberNumber:
      row.memberNumber ||
      row.Member?.memberNumber ||
      row.member?.memberNumber ||
      "",
  }));
  const filtered = filterRows(normalizedRows, search, [
    "memberNumber",
    "name",
    "phone",
    "nationalId",
    "company",
    "email",
    "reason",
  ]);
  useEffect(() => setPage(1), [search, regTab, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const baseColumns =
    regTab === "active"
      ? [
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone Number" },
          { key: "nationalId", label: "National ID" },
          { key: "company", label: "Company", render: (v) => v || "—" },
          {
            key: "risk",
            label: "Risk",
            render: (v) => (
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${v === "Low" ? "bg-emerald-100 text-emerald-700" : v === "Medium" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
              >
                {v}
              </span>
            ),
          },
          {
            key: "savings",
            label: "Savings",
            render: (v) => formatCurrency(v || 0),
          },
          {
            key: "loans",
            label: "Loans",
            render: (v) => formatCurrency(v || 0),
          },
          {
            key: "status",
            label: "Status",
            render: (v) => <StatusBadge status={v || "Active"} />,
          },
        ]
      : [
          { key: "memberNumber", label: "Member Number" },
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone Number" },
          { key: "nationalId", label: "National ID" },
          {
            key: "status",
            label: "Status",
            render: (v) => <StatusBadge status={v || "Archived"} />,
          },
          { key: "email", label: "Email" },
          { key: "optOutDate", label: "Opt-out Date", render: formatDateSafe },
          { key: "reason", label: "Reason" },
        ];
  const columns =
    regTab === "active"
      ? [
          { key: "memberNumber", label: "Member Number" },
          ...baseColumns,
          { key: "dateJoined", label: "Date Joined", render: formatDateSafe },
        ]
      : baseColumns;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>{filtered.length} member{filtered.length === 1 ? "" : "s"} found</p>
        <label className="flex items-center gap-2">Rows per page
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border px-3 py-2">
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visibleRows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => onSelectMember(row)}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-sm">
                  {c.render ? c.render(row[c.key], row) : row[c.key] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Page {page} of {pageCount}</p>
        <div className="flex gap-2">
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
          <button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

function AdminBulkMemberImport({ accessToken, onImported }) {
  const [csv, setCsv] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const text = extension === "xls" || extension === "xlsx"
        ? workbookRowsToCsv(XLSX.read(await file.arrayBuffer(), { type: "array" }))
        : await file.text();
      if (!text.trim()) throw new Error("The selected file is empty or has no tabular rows.");
      setCsv(text);
      setFileInfo({ name: file.name, size: file.size, rows: text.split(/\r\n|\r|\n/).filter(Boolean).length });
      setPreview(null);
      setMessage(null);
    } catch (error) {
      setCsv("");
      setFileInfo(null);
      setPreview(null);
      setMessage({ type: "error", text: error?.message || "Unable to read import file." });
    } finally {
      event.target.value = "";
    }
  }

  async function previewImport() {
    setBusy(true);
    setMessage(null);
    try {
      setPreview(await previewMemberCsvImport(csv, accessToken));
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Preview failed." });
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await commitMemberCsvImport(csv, accessToken);
      setMessage({ type: "success", text: `Imported ${result.imported?.length || 0} member${result.imported?.length === 1 ? "" : "s"}.` });
      setPreview(null);
      setCsv("");
      setFileInfo(null);
      await onImported?.();
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Import failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Bulk Ayedos member onboarding</h3>
          <p className="text-sm text-slate-500">Bulk-register new members, create default-login accounts, and initialize baseline savings and share capital.</p>
          <p className="text-xs text-slate-500">CSV columns: Staff ID, Email, Member ID, Share Capital, Savings, Join Date, Status, National ID, Name, Phone Number.</p>
          {fileInfo ? <p className="mt-1 text-xs font-semibold text-emerald-700">Loaded {fileInfo.name} ({fileInfo.rows} row{fileInfo.rows === 1 ? "" : "s"}, {fileInfo.size.toLocaleString()} bytes)</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
            <FileText size={14} />
            Choose CSV
            <input type="file" accept=".csv,text/csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={handleFile} />
          </label>
          <button disabled={!csv || busy} onClick={previewImport} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Working..." : "Preview"}</button>
          <button disabled={!preview?.readyCount || busy} onClick={commitImport} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Import ready rows</button>
        </div>
      </div>
      {message ? <p className={`mt-3 text-sm font-semibold ${message.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>{message.text}</p> : null}
      {preview ? (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <div className="border-b bg-slate-50 px-4 py-2 text-sm font-semibold">{preview.readyCount} ready, {preview.errorCount} need fixes</div>
          <table className="min-w-full">
            <thead><tr className="bg-slate-50">{["Row", "Staff ID", "Email", "Member ID", "Share Capital", "Savings", "Join Date", "Status", "National ID", "Name", "Phone Number", "Readiness"].map((h) => <th key={h} className="px-3 py-2 text-left text-xs uppercase text-slate-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {preview.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td className="px-3 py-2 text-sm">{row.rowNumber}</td>
                  <td className="px-3 py-2 text-sm">{row.data.staffId || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.email || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.memberNumber || "Auto"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.shareCapital || 0}</td>
                  <td className="px-3 py-2 text-sm">{row.data.savings || 0}</td>
                  <td className="px-3 py-2 text-sm">{row.data.joinDate || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.status || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.nationalId || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.fullName || "-"}</td>
                  <td className="px-3 py-2 text-sm">{row.data.phone || "-"}</td>
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

function AdminMemberFinancialDetail({ member, accessToken, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const memberId =
    member.memberId || member.Member?.id || member.member?.id || member.id;

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

function AdminMemberDetail({ member, onBack, data }) {
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
              {member.id} · {member.phone || member.email} ·{" "}
              {member.company || "Independent"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${member.risk === "Low" ? "bg-emerald-100 text-emerald-700" : member.risk === "Medium" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
          >
            Risk: {member.risk || "Low"}
          </span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Savings Balance</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(member.savings || 0)}
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Share Capital</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(member.shares || 0)}
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Outstanding Loans</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(member.loans || 0)}
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Last Dividend</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency((member.shares || 0) * 0.085)}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h5 className="font-semibold">Guaranteed Loans</h5>
            <div className="mt-3 space-y-2 text-sm">
              {[
                "DEVELOPMENT — KES 250,000 (John Kamau)",
                "WELFARE — KES 120,000 (Mary Wanjiku)",
              ].map((t, i) => (
                <div key={i} className="border-b py-1 text-slate-600">
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <h5 className="font-semibold">Guarantors for Member</h5>
            <div className="mt-3 space-y-2 text-sm">
              {[
                {
                  name: "Jane Muthoni",
                  type: "Development Loan",
                  amount: 250000,
                },
                { name: "Peter Kamau", type: "Education Loan", amount: 80000 },
              ].map((g, i) => (
                <div key={i} className="border-b py-1 text-slate-600">
                  {g.name} — {g.type} — {formatCurrency(g.amount)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-lg border p-4">
          <h5 className="font-semibold">Dividend History</h5>
          <div className="mt-3 space-y-2 text-sm">
            {[
              { year: 2025, rate: "8.5%", amount: 2125 },
              { year: 2024, rate: "7.2%", amount: 1800 },
            ].map((d, i) => (
              <div key={i} className="flex justify-between border-b py-1">
                <span>{d.year}</span>
                <span>{d.rate}</span>
                <span className="text-emerald-700">
                  {formatCurrency(d.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODULE 1B: APPLICATIONS (used within unified member management)
// ============================================================
function AdminApplications({ data, accessToken, onRefresh, embedded = false }) {
  const { applications = [] } = data || {};
  const [search, setSearch] = useState("");
  const [applicationFilter, setApplicationFilter] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [blockedAttempts, setBlockedAttempts] = useState([]);
  const [resettingId, setResettingId] = useState("");
  useEffect(() => { if (accessToken) getBlockedIdentityAttempts(accessToken).then((rows) => setBlockedAttempts(Array.isArray(rows) ? rows : [])).catch(() => setBlockedAttempts([])); }, [accessToken]);
  const searched = filterRows(applications, search, [
    "name",
    "phone",
    "email",
    "status",
    "nationalId",
    "onboardingStage",
    "paymentStatus",
  ]);
  const filtered = searched.filter((application) => applicationFilter === "ALL" || String(application.status || "").toUpperCase() === applicationFilter);
  useEffect(() => setPage(1), [search, applicationFilter]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleApplications = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleUnblock(id) {
    setResettingId(id);
    try {
      await unblockIdentityAttempt(id, accessToken);
      setBlockedAttempts(await getBlockedIdentityAttempts(accessToken));
    } catch (error) { alert(error.message); }
    finally { setResettingId(""); }
  }

  async function handleReview(id, status) {
    try {
      await reviewApplication(id, status, "", accessToken);
      onRefresh?.();
    } catch (e) {
      alert(e.message);
    }
  }

  const table = (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{["PENDING", "APPROVED", "REJECTED", "ALL"].map((value) => <button type="button" key={value} onClick={() => setApplicationFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${applicationFilter === value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>{value === "ALL" ? "All Applications" : `${value[0]}${value.slice(1).toLowerCase()}`}</button>)}</div>
      <div className="flex items-center gap-3">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search applications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border py-2 pl-2 pr-4 text-sm"
        />
        <button
          onClick={() =>
            exportCSV(
              applications,
              [
                { key: "name", label: "Name" },
                { key: "phone", label: "Phone Number" },
                { key: "email", label: "Email" },
                { key: "memberType", label: "Member Type" },
                { key: "onboardingStage", label: "Onboarding Page" },
                { key: "paymentStatus", label: "Payment" },
                { key: "status", label: "Status" },
                { key: "submittedDate", label: "Date" },
              ],
              "applications.csv",
            )
          }
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          <Download size={14} />
          CSV
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50">
              {[
                "Name",
                "Phone Number",
                "Email",
                "Member Type",
                "Onboarding Page",
                "Payment",
                "Submitted",
                "Status",
                "Action",
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
            {visibleApplications.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-sm">{a.name}</td>
                <td className="px-4 py-3 text-sm">{a.phone}</td>
                <td className="px-4 py-3 text-sm">{a.email || "—"}</td>
                <td className="px-4 py-3 text-sm">{String(a.memberType || "—").replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-sm">{a.onboardingStage || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={a.paymentStatus || "PENDING"} /></td>
                <td className="px-4 py-3 text-sm">
                  {formatDateSafe(a.submittedDate)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {String(a.applicationStatus || "").toUpperCase() === "PENDING_APPROVAL" ? (
                      <>
                        <button
                          onClick={() => handleReview(a.id, "APPROVED")}
                          className="text-xs font-semibold text-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(a.id, "REJECTED")}
                          className="text-xs font-semibold text-rose-700"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">{a.status === "PENDING" ? "Awaiting completion" : "Reviewed"}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Page {page} of {pageCount} · {filtered.length} applications</p><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><button disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div>
      {applicationFilter === "APPROVED" ? <div className="rounded-lg border bg-white p-4"><h3 className="font-semibold">Blocked registration attempts</h3><p className="mb-3 text-sm text-slate-500">Identity verification lockouts requiring administrator review.</p><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500">{["Email", "ID / Passport", "Timestamp", "Attempts", "Status", "Reason", "Action"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody>{blockedAttempts.slice(0, 10).map((attempt) => <tr key={attempt.id} className="border-b"><td className="px-3 py-3 font-semibold">{attempt.email}</td><td className="px-3 py-3">{attempt.documentNumber}</td><td className="px-3 py-3">{formatDateSafe(attempt.timestamp)}</td><td className="px-3 py-3">{attempt.attemptCount}</td><td className="px-3 py-3"><StatusBadge status={attempt.blockStatus ? "BLOCKED" : "RESET"} /></td><td className="px-3 py-3">{attempt.reason || "Identity verification mismatch"}</td><td className="px-3 py-3"><button disabled={!attempt.blockStatus || resettingId === attempt.id} onClick={() => handleUnblock(attempt.id)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{resettingId === attempt.id ? "Resetting..." : "Unblock"}</button></td></tr>)}{!blockedAttempts.length ? <tr><td colSpan={7} className="p-6 text-center text-slate-500">No blocked registration attempts.</td></tr> : null}</tbody></table></div></div> : null}
    </div>
  );

  if (embedded) return table;
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Applications"
        title="Membership applications"
        description="Review pending membership registrations."
      />
      {table}
    </div>
  );
}

// ============================================================
// MODULE 2: READ-ONLY FINANCIAL TABLES (Shared Finance Data Matrix)
// Admin fetches the same data pipeline as Financier but renders READ-ONLY
// ============================================================
function AdminSalaryDeductions({ data }) {
  const [company, setCompany] = useState("ALL");
  const deductionMap = new Map((data.deductions || []).map((row) => [row.memberId, row]));
  const rows = (data.users || []).filter((user) => user.membershipComplete).map((user) => {
    const member = user.Member || user.member || {};
    const deduction = deductionMap.get(member.id);
    return { memberNumber: member.memberNumber, name: user.name, company: user.company || user.employer || "Unassociated", salary: Number(user.monthlyIncome || 0), deduction: Number(deduction?.amount || 0), savings: Number(member.savings || 0), status: deduction ? (deduction.isActive ? "ACTIVE" : "INACTIVE") : "NOT SET" };
  });
  const companies = [...new Set(rows.map((row) => row.company))].sort();
  const displayed = company === "ALL" ? rows : rows.filter((row) => row.company === company);
  return <div className="space-y-5"><SectionHeader eyebrow="Finance synchronized" title="Salary Deductions" description="Read-only member payroll deductions from the same member and deduction records used by Finance." /><div className="flex flex-wrap gap-2"><button onClick={() => setCompany("ALL")} className={`rounded-full px-4 py-2 text-sm font-semibold ${company === "ALL" ? "bg-slate-950 text-white" : "bg-slate-100"}`}>All ({rows.length})</button>{companies.map((name) => <button key={name} onClick={() => setCompany(name)} className={`rounded-full px-4 py-2 text-sm font-semibold ${company === name ? "bg-slate-950 text-white" : "bg-slate-100"}`}>{name} ({rows.filter((row) => row.company === name).length})</button>)}</div><AdminReadOnlyTable title={company === "ALL" ? "All Member Deductions" : `${company} Deductions`} data={displayed} columns={[{ key: "memberNumber", label: "Member Number" }, { key: "name", label: "Member" }, { key: "company", label: "Company" }, { key: "salary", label: "Salary", render: (v) => v ? formatCurrency(v) : "—" }, { key: "deduction", label: "Deduction", render: (v) => v ? formatCurrency(v) : "—" }, { key: "savings", label: "Savings", render: (v) => formatCurrency(v || 0) }, { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> }]} fileName="salary-deductions.csv" /></div>;
}

function AdminTransactions({ data }) {
  const [category, setCategory] = useState("all");
  const [loanView, setLoanView] = useState("repayments");
  const transactions = data.transactions || [];
  const savings = transactions.filter((row) => ["SAVINGS", "WITHDRAWAL"].includes(String(row.category || "").toUpperCase()));
  const shareCapital = transactions.filter((row) => ["SHARE_CAPITAL", "SHARE_CAPITAL_TRANSFER", "OPT_OUT_SHARE_TRANSFER"].includes(String(row.category || "").toUpperCase()));
  const repayments = transactions.filter((row) => String(row.category || row.type || "").toUpperCase().includes("LOAN_REPAYMENT"));
  const disbursements = transactions.filter((row) => String(row.category || row.type || "").toUpperCase().includes("LOAN_DISBURSEMENT"));
  const transactionColumns = [
    { key: "reference", label: "Reference", render: (v) => v || "—" },
    { key: "memberNumber", label: "Member Number" },
    { key: "memberName", label: "Member Name" },
    { key: "category", label: "Category", render: (v) => String(v || "UNCLASSIFIED").replaceAll("_", " ") },
    { key: "destination", label: "Ledger Destination" },
    { key: "type", label: "Transaction Type", render: (v) => String(v || "—").replaceAll("_", " ") },
    { key: "amount", label: "Amount", render: (v) => formatCurrency(v || 0) },
    { key: "principalPaid", label: "Principal Portion", render: (v) => v == null ? "—" : formatCurrency(v) },
    { key: "interestPaid", label: "Interest Portion", render: (v) => v == null ? "—" : formatCurrency(v) },
    { key: "method", label: "Method" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v || "Pending"} /> },
    { key: "createdAt", label: "Timestamp", render: formatDateSafe },
  ];
  const total = (rows) => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  let rows = transactions;
  let title = "All Reconciled Transactions";
  let columns = transactionColumns;
  let fileName = "all-transactions.csv";
  if (category === "savings") { rows = savings; title = "Savings Transactions"; fileName = "savings-transactions.csv"; }
  if (category === "shares") { rows = shareCapital; title = "Share Capital Transactions"; fileName = "share-capital-transactions.csv"; }
  if (category === "loans") {
    if (loanView === "repayments") { rows = repayments; title = "Loan Repayments"; fileName = "loan-repayments.csv"; }
    if (loanView === "disbursements") { rows = disbursements; title = "Loan Disbursements"; fileName = "loan-disbursements.csv"; }
  }
  return <div className="space-y-6">
    <SectionHeader eyebrow="Financial ledger" title="Transactions" description="Reconciled savings, share capital, and loan movements from the same ledger used by the Finance and Member dashboards." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="All Transactions" value={transactions.length} helper={formatCurrency(total(transactions))} icon={ReceiptText} tone="slate" onClick={() => setCategory("all")} />
      <KpiCard label="Savings" value={savings.length} helper={formatCurrency(total(savings))} icon={WalletCards} tone="blue" onClick={() => setCategory("savings")} />
      <KpiCard label="Share Capital" value={shareCapital.length} helper={formatCurrency(total(shareCapital))} icon={TrendingUp} tone="emerald" onClick={() => setCategory("shares")} />
      <KpiCard label="Loans" value={repayments.length + disbursements.length} helper={`${repayments.length} repayments · ${disbursements.length} disbursements`} icon={Landmark} tone="amber" onClick={() => setCategory("loans")} />
    </div>
    {category === "loans" ? <div className="flex flex-wrap gap-2">{[["repayments", "Repayments"], ["disbursements", "Disbursements"]].map(([key, label]) => <button type="button" key={key} onClick={() => setLoanView(key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${loanView === key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>{label}</button>)}</div> : null}
    <AdminReadOnlyTable title={title} data={rows} columns={columns} fileName={fileName} />
  </div>;
}

function AdminReadOnlyTable({ title, data: rows, columns, fileName }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const searched = filterRows(
    rows,
    search,
    columns.map((c) => c.key),
  );
  const statuses = [...new Set(rows.map((row) => String(row.status || "").toUpperCase()).filter(Boolean))].sort();
  const filtered = searched.filter((row) => statusFilter === "ALL" || String(row.status || "").toUpperCase() === statusFilter);
  useEffect(() => setPage(1), [search, statusFilter, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Read-only view — shared Financier data"
        title={title}
        description="This data mirrors the Financier's pipeline. The Admin dashboard fetches the identical ground-truth dataset but renders it completely read-only. No edits, forms, or action controls are available from this role."
        action={
          <button
            onClick={() => exportCSV(filtered, columns, fileName)}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Download size={14} />
            Export CSV
          </button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-64 flex-1 rounded-lg border py-2 pl-2 pr-4 text-sm"
        />
        {statuses.length ? <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="ALL">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select> : null}
        <select aria-label="Rows per page" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm">{[10, 25, 50].map((size) => <option key={size} value={size}>{size} rows</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-sm">
                    {c.render ? c.render(row[c.key], row) : row[c.key] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</p>
        <div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div>
      </div>
    </div>
  );
}

// ============================================================
// MODULE 3: BIDIRECTIONAL NOTIFICATION ENGINE
// ============================================================
function AdminNotificationsPanel({
  notifications,
  onMarkAllRead,
  onMarkRead,
  accessToken,
}) {
  const [tab, setTab] = useState("inbound");
  const [broadcast, setBroadcast] = useState({ title: "", body: "" });
  const [direct, setDirect] = useState({ memberId: "", title: "", body: "" });
  const [msg, setMsg] = useState(null);
  const [sending, setSending] = useState(false);

  const filtered = tab === "inbound" ? notifications : [];

  async function openInboundNotification(notification) {
    if (!notification.read) await onMarkRead?.(notification.id);
  }

  async function handleBroadcast(e) {
    e.preventDefault();
    if (!broadcast.title.trim() || !broadcast.body.trim()) {
      setMsg({ type: "error", text: "Title and body are required." });
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      await sendGlobalBroadcast(broadcast, accessToken);
      setMsg({
        type: "success",
        text: "Global broadcast sent to all members and financiers.",
      });
      setBroadcast({ title: "", body: "" });
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Failed." });
    } finally {
      setSending(false);
    }
  }

  async function handleDirect(e) {
    e.preventDefault();
    if (
      !direct.memberId.trim() ||
      !direct.title.trim() ||
      !direct.body.trim()
    ) {
      setMsg({ type: "error", text: "All fields are required." });
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      await sendDirectNotification(direct, accessToken);
      setMsg({
        type: "success",
        text: `Notification sent to member ${direct.memberId}.`,
      });
      setDirect({ memberId: "", title: "", body: "" });
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Failed." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Notifications"
        title="Communication hub"
        description="Inbound alerts and outbound broadcasts to members and financiers."
      />
      <div className="flex gap-2">
        {[
          { k: "inbound", l: "Inbound Alerts" },
          { k: "opt-outs", l: "Opt-out Approvals" },
          { k: "sent", l: "Sent Notifications" },
          { k: "broadcast", l: "Global Broadcast" },
          { k: "direct", l: "Direct Message" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t.k ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {t.l}
          </button>
        ))}
      </div>
      {msg && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {msg.text}
        </div>
      )}

      {tab === "inbound" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={onMarkAllRead}
              className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Mark all read
            </button>
          </div>
          {filtered.map((n) => (
            <button
              type="button"
              key={n.id}
              onClick={() => openInboundNotification(n)}
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
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${n.type === "APPLICATION" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {n.type}
                </span>
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
                {!n.read && (
                  <span className="text-xs font-semibold text-rose-600">
                    ● Unread
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "opt-outs" && (
        <OptOutRequestsPage role="ADMIN" accessToken={accessToken} embedded />
      )}
      {tab === "sent" && <SentNotificationsPanel accessToken={accessToken} />}

      {tab === "broadcast" && (
        <form
          onSubmit={handleBroadcast}
          className="space-y-4 rounded-lg border bg-white p-6"
        >
          <h5 className="text-base font-semibold">Global Broadcast</h5>
          <label className="block text-sm font-semibold text-slate-700">
            Title
            <input
              value={broadcast.title}
              onChange={(e) =>
                setBroadcast((f) => ({ ...f, title: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Body
            <textarea
              value={broadcast.body}
              onChange={(e) =>
                setBroadcast((f) => ({ ...f, body: e.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {sending ? (
              <RefreshCw className="animate-spin" size={17} />
            ) : (
              <Send size={17} />
            )}
            {sending ? "Sending..." : "Send to all"}
          </button>
        </form>
      )}

      {tab === "direct" && (
        <form
          onSubmit={handleDirect}
          className="space-y-4 rounded-lg border bg-white p-6"
        >
          <h5 className="text-base font-semibold">Direct Message</h5>
          <label className="block text-sm font-semibold text-slate-700">
            Membership ID
            <input
              value={direct.memberId}
              onChange={(e) =>
                setDirect((f) => ({ ...f, memberId: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm"
              placeholder="e.g. M001"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Title
            <input
              value={direct.title}
              onChange={(e) =>
                setDirect((f) => ({ ...f, title: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Body
            <textarea
              value={direct.body}
              onChange={(e) =>
                setDirect((f) => ({ ...f, body: e.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-lg border px-3.5 py-3 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {sending ? (
              <RefreshCw className="animate-spin" size={17} />
            ) : (
              <Send size={17} />
            )}
            {sending ? "Sending..." : "Send to member"}
          </button>
        </form>
      )}
    </div>
  );
}

// ============================================================
// MODULE 4: AUDIT LOGS
// ============================================================
function AdminAuditLogs({ data, summary = {}, embedded = false }) {
  const defaultFrom = useMemo(() => new Date(Date.now() - 86400000).toISOString().slice(0, 16), []);
  const [filters, setFilters] = useState({ search: "", category: "ALL", severity: "ALL", status: "ALL", from: defaultFrom, to: "" });
  const [expanded, setExpanded] = useState(null);
  const logs = data || [];
  const filtered = logs.filter((log) => {
    const term = filters.search.trim().toLowerCase();
    const searchable = [log.actorName, log.staffId, log.memberNumber, log.memberName, log.targetId, log.target, log.event].join(" ").toLowerCase();
    const time = new Date(log.timestamp).getTime();
    return (!term || searchable.includes(term))
      && (filters.category === "ALL" || log.category === filters.category)
      && (filters.severity === "ALL" || log.severity === filters.severity)
      && (filters.status === "ALL" || log.status === filters.status)
      && (!filters.from || time >= new Date(filters.from).getTime())
      && (!filters.to || time <= new Date(filters.to).getTime());
  });
  const last24Hours = logs.filter((log) => new Date(log.timestamp).getTime() >= Date.now() - 86400000);
  const timestamp = (value) => value ? `${new Date(value).toISOString().replace("T", " ").replace("Z", " UTC")}` : "—";
  const exportColumns = [
    { key: "timestamp", label: "Timestamp" }, { key: "actorName", label: "Actor" }, { key: "staffId", label: "Staff ID" },
    { key: "actorRole", label: "Role" }, { key: "category", label: "Category" }, { key: "event", label: "Action Executed" },
    { key: "target", label: "Target Entity" }, { key: "status", label: "Status" }, { key: "severity", label: "Severity" },
  ];
  const updateFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={embedded ? "Overview drill-down" : "Audit logs"} title="Immutable audit trail" description="Financial, lending, member KYC, and access-control activity recorded in real time." action={<button onClick={() => exportCSV(filtered, exportColumns, "audit-logs.csv")} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><Download size={14} />Export CSV</button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Log Volume (24h)" value={last24Hours.length} icon={FileText} tone="blue" />
        <KpiCard label="Failed Actions" value={last24Hours.filter((log) => log.status === "FAILED").length} icon={XCircle} tone="rose" />
        <KpiCard label="High-Risk Events" value={last24Hours.filter((log) => log.severity === "CRITICAL").length} icon={ShieldAlert} tone="amber" />
        <KpiCard label="Active Admin Sessions" value={summary.activeAdminSessions || 0} icon={UserRound} tone="emerald" />
      </div>
      <div className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-3 xl:grid-cols-6">
        <div className="relative lg:col-span-3 xl:col-span-2"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={filters.search} onChange={updateFilter("search")} placeholder="Actor, member ID, transaction reference..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" /></div>
        <input type="datetime-local" aria-label="From date and time" value={filters.from} onChange={updateFilter("from")} className="rounded-lg border px-3 py-2 text-sm" />
        <input type="datetime-local" aria-label="To date and time" value={filters.to} onChange={updateFilter("to")} className="rounded-lg border px-3 py-2 text-sm" />
        <select aria-label="Category" value={filters.category} onChange={updateFilter("category")} className="rounded-lg border px-3 py-2 text-sm"><option value="ALL">All categories</option>{["Financial", "Loan Management", "Member KYC", "Access Control", "System"].map((value) => <option key={value}>{value}</option>)}</select>
        <div className="grid grid-cols-2 gap-2"><select aria-label="Severity" value={filters.severity} onChange={updateFilter("severity")} className="rounded-lg border px-2 py-2 text-sm"><option value="ALL">All risks</option>{["INFO", "WARN", "CRITICAL"].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Outcome" value={filters.status} onChange={updateFilter("status")} className="rounded-lg border px-2 py-2 text-sm"><option value="ALL">All outcomes</option>{["SUCCESS", "FAILED", "PENDING_APPROVAL"].map((value) => <option key={value}>{value}</option>)}</select></div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white"><table className="min-w-full"><thead><tr className="bg-slate-50">{["Timestamp", "Actor", "Category", "Action Executed", "Target Entity", "Status & Severity"].map((label) => <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
        {filtered.map((log) => <Fragment key={log.id}><tr className="cursor-pointer hover:bg-slate-50" onClick={() => setExpanded((value) => value === log.id ? null : log.id)}>
          <td className="whitespace-nowrap px-4 py-3 text-xs font-medium">{timestamp(log.timestamp)}</td>
          <td className="px-4 py-3 text-sm"><p className="font-semibold">{log.actorName || "System"}</p><p className="text-xs text-slate-500">{log.staffId || "—"}</p><StatusBadge status={String(log.actorRole || "SYSTEM").replaceAll("_", " ")} /></td>
          <td className="px-4 py-3 text-sm"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{log.category}</span></td>
          <td className="px-4 py-3 font-mono text-xs font-semibold">{log.event}</td><td className="px-4 py-3 text-sm">{log.target || "—"}</td>
          <td className="px-4 py-3"><div className="flex gap-2"><StatusBadge status={log.status} /><StatusBadge status={log.severity} /></div></td>
        </tr>{expanded === log.id ? <tr><td colSpan={6} className="bg-slate-50 p-5"><div className="grid gap-5 xl:grid-cols-2"><div className="rounded-lg border bg-white p-4"><h4 className="font-semibold">Network & Session Context</h4><dl className="mt-3 grid grid-cols-[130px_1fr] gap-2 text-sm"><dt className="text-slate-500">IP address</dt><dd>{log.ipAddress || "—"}</dd><dt className="text-slate-500">Device</dt><dd className="break-all">{log.device || "—"}</dd><dt className="text-slate-500">Endpoint</dt><dd className="font-mono text-xs">{log.endpoint || "—"}</dd><dt className="text-slate-500">Location</dt><dd>{log.location || "Not available"}</dd><dt className="text-slate-500">Session</dt><dd>{log.sessionRef || "—"}</dd></dl></div><div className="rounded-lg border bg-white p-4"><h4 className="font-semibold">State Delta</h4><div className="mt-3 grid gap-3 md:grid-cols-2"><div><p className="mb-1 text-xs font-semibold uppercase text-rose-700">Before</p><pre className="max-h-52 overflow-auto rounded bg-rose-50 p-3 text-xs">{JSON.stringify(log.beforeState, null, 2) || "No prior state"}</pre></div><div><p className="mb-1 text-xs font-semibold uppercase text-emerald-700">After</p><pre className="max-h-52 overflow-auto rounded bg-emerald-50 p-3 text-xs">{JSON.stringify(log.afterState, null, 2) || "No resulting state"}</pre></div></div>{log.status === "FAILED" ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3"><p className="text-xs font-semibold uppercase text-rose-700">Failure reason</p><p className="mt-1 break-all text-sm text-rose-900">{log.failureReason || "No failure detail recorded"}</p></div> : null}</div></div></td></tr> : null}</Fragment>)}
      </tbody></table>{!filtered.length ? <p className="p-10 text-center text-sm text-slate-500">No audit events match the selected filters.</p> : null}</div>
      <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><LockKeyhole className="mt-0.5 shrink-0" size={18} /><p><strong>System guardrail:</strong> Audit logs are immutable, encrypted, and recorded in real time. Logs cannot be modified or purged.</p></div>
    </div>
  );
}

// ============================================================
// MODULE 5: REPORTS EXPORT ENGINE (Shared Financier data, read-only)
// ============================================================
function AdminReportsPage({ data }) {
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [breakdown, setBreakdown] = useState(null);
  const report = data?.reports || {};
  const totals = report.totals || {};
  const timeSeries = (data?.reports?.timeSeries?.[timeFilter] || []).slice(-30);

  const reportColumns = [
    { key: "label", label: "Period" },
    { key: "deposits", label: "Deposits", render: (v) => formatCurrency(v) },
    {
      key: "withdrawals",
      label: "Withdrawals",
      render: (v) => formatCurrency(v),
    },
    {
      key: "repayments",
      label: "Repayments",
      render: (v) => formatCurrency(v),
    },
    {
      key: "disbursements",
      label: "Disbursements",
      render: (v) => formatCurrency(v),
    },
    { key: "count", label: "Count" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Reports — Shared Financier data pipeline"
        title="Reports & analytics"
        description="Read-only analytics from the same ground-truth data source used by the Financier. Daily, monthly, and yearly filtering."
        action={
          <button
            onClick={() =>
              exportCSV(timeSeries, reportColumns, "admin-reports.csv")
            }
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Download size={14} />
            Export CSV
          </button>
        }
      />
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["shareCapitalDeposits", "Share capital", totals.shareCapitalDeposits, "text-sky-700"],
          ["savingsDeposits", "Savings deposits", totals.savingsDeposits, "text-emerald-700"],
          ["repayments", "Loan repayments", totals.repayments, "text-violet-700"],
          ["disbursements", "Loan disbursements", totals.disbursements, "text-amber-700"],
        ].map(([key, label, total, tone]) => (
          <button type="button" key={key} onClick={() => setBreakdown({ title: label, total: Number(total || 0), rows: report.memberBreakdowns?.[key] || [] })} className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{formatCurrency(total || 0)}</p><p className="mt-2 text-xs font-semibold text-slate-500">View member summary</p>
          </button>
        ))}
      </div>
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
// MODULE 6: ADMIN PROFILE SELF-MANAGEMENT
// ============================================================
function AdminProfileSettings({ user, accessToken }) {
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
  const [msg, setMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);
  const [profileImage, setProfileImage] = useState(
    user?.passportPhotoUrl || null,
  );

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setMsg({ type: "error", text: "Image must be under 1.5 MB." });
      return;
    }
    setProfileImage(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await updateAdminProfile(form, accessToken);
      setMsg({ type: "success", text: "Profile updated." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    if (passwords.new.length < 8) {
      setPwMsg({ type: "error", text: "Min 8 characters." });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPwMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await changePassword(
        { currentPassword: passwords.current, newPassword: passwords.new },
        accessToken,
      );
      setPwMsg({ type: "success", text: "Password changed." });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPwMsg({ type: "error", text: err?.message || "Failed." });
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
      <SectionHeader
        eyebrow="Profile Settings"
        title="Admin profile management"
      />
      {msg && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {msg.text}
        </div>
      )}
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
            <h5 className="text-base font-semibold">Profile picture</h5>
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
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-lg border bg-white p-6"
        >
          <h5 className="text-base font-semibold">Personal information</h5>
          {[
            { l: "Full Name", n: "name" },
            { l: "Email", n: "email" },
            { l: "Phone", n: "phone" },
          ].map((f) => (
            <label
              key={f.n}
              className="block text-sm font-semibold text-slate-700"
            >
              {f.l}
              <input
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
          {pwMsg && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-medium ${pwMsg.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
            >
              {pwMsg.text}
            </div>
          )}
          <form
            onSubmit={handlePassword}
            className="space-y-4 rounded-lg border bg-white p-6"
          >
            <h5 className="text-base font-semibold">Change password</h5>
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


