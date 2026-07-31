import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
  LogOut,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
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
  sendGlobalBroadcast,
  sendDirectNotification,
  getAuditLogs,
  updateAdminProfile,
} from "../features/admin/adminService.js";
import {
  getAllTransactions,
  getAllLoans,
  getAllShares,
  getAllDividends,
  getAllDeductions,
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
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import StaffSecurityPage from "../components/staff-dashboard/StaffSecurityPage.jsx";
import SupportPage from "../components/user-dashboard/SupportPage.jsx";
import MemberFinancialProfile from "../components/staff-dashboard/MemberFinancialProfile.jsx";

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
function exportCSV(rows, columns, filename) {
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

const MOCK_MEMBERS = [
  {
    id: "M001",
    name: "John Kamau",
    phone: "+254712345678",
    company: "Ministry of Education",
    risk: "Low",
    status: "Active",
    savings: 250000,
    loans: 45000,
    shares: 35000,
    joined: "2025-01-15",
  },
  {
    id: "M002",
    name: "Mary Wanjiku",
    phone: "+254723456789",
    company: "County Government of Nairobi",
    risk: "Medium",
    status: "Active",
    savings: 180000,
    loans: 120000,
    shares: 28000,
    joined: "2025-03-22",
  },
  {
    id: "M003",
    name: "Peter Otieno",
    phone: "+254734567890",
    company: "Kenyatta National Hospital",
    risk: "Low",
    status: "Active",
    savings: 420000,
    loans: 0,
    shares: 50000,
    joined: "2025-06-01",
  },
  {
    id: "M004",
    name: "David Kiprop",
    phone: "+254756789012",
    company: null,
    risk: "High",
    status: "Overdue",
    savings: 50000,
    loans: 35000,
    shares: 15000,
    joined: "2024-11-08",
  },
  {
    id: "M005",
    name: "Alice Wambui",
    phone: "+254767890123",
    company: null,
    risk: "High",
    status: "Default",
    savings: 30000,
    loans: 80000,
    shares: 10000,
    joined: "2024-09-15",
  },
];
const MOCK_APPLICATIONS = [
  {
    id: "A001",
    name: "Faith Wangari",
    phone: "+254712345001",
    status: "PENDING",
    submittedDate: "2026-07-01",
    nationalId: "12345678",
  },
  {
    id: "A002",
    name: "Samuel Mwangi",
    phone: "+254723456002",
    status: "PENDING",
    submittedDate: "2026-06-28",
    nationalId: "87654321",
  },
  {
    id: "A003",
    name: "Grace Achieng",
    phone: "+254734567003",
    status: "APPROVED",
    submittedDate: "2026-06-15",
    nationalId: "45678901",
  },
];
const MOCK_ARCHIVED = [
  {
    id: "X001",
    name: "James Omondi",
    email: "james@example.com",
    optOutDate: "2025-12-10",
    reason: "Relocated abroad",
  },
  {
    id: "X002",
    name: "Lucy Wanjohi",
    email: "lucy@example.com",
    optOutDate: "2025-08-22",
    reason: "Financial constraints",
  },
];
const MOCK_AUDIT_LOGS = [
  {
    id: 1,
    timestamp: "2026-07-06 10:15:00",
    userId: "admin@ayedos.co.ke",
    actionType: "LOGIN",
    ipAddress: "192.168.1.1",
    affectedRecord: "N/A",
  },
  {
    id: 2,
    timestamp: "2026-07-06 09:45:00",
    userId: "M001",
    actionType: "LOAN_APPLICATION",
    ipAddress: "10.0.0.5",
    affectedRecord: "L001",
  },
  {
    id: 3,
    timestamp: "2026-07-06 09:30:00",
    userId: "M003",
    actionType: "DEPOSIT",
    ipAddress: "10.0.0.8",
    affectedRecord: "TX_DE_001",
  },
  {
    id: 4,
    timestamp: "2026-07-06 08:00:00",
    userId: "admin@ayedos.co.ke",
    actionType: "BROADCAST",
    ipAddress: "192.168.1.1",
    affectedRecord: "GLOBAL",
  },
];
const MOCK_ADMIN_NOTIFICATIONS = [
  {
    id: 1,
    title: "New Application",
    body: "Faith Wangari submitted a membership application",
    type: "APPLICATION",
    time: new Date().toISOString(),
    read: false,
  },
  {
    id: 2,
    title: "Opt-out Request",
    body: "James Omondi has requested to leave the SACCO",
    type: "OPTOUT",
    time: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
  {
    id: 3,
    title: "New Application",
    body: "Samuel Mwangi submitted a membership application",
    type: "APPLICATION",
    time: new Date(Date.now() - 7200000).toISOString(),
    read: true,
  },
];

export default function AdminDashboard() {
  const location = useLocation();
  const { user, accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState(MOCK_ADMIN_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

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
      getAllTransactions(accessToken),
      getAllLoans(accessToken),
      getAllShares(accessToken),
      getAllDividends(accessToken),
      getAllDeductions(accessToken),
      getAuditLogs(accessToken),
    ]);
    setData({
      users:
        r[0].status === "fulfilled" && Array.isArray(r[0].value)
          ? r[0].value
          : MOCK_MEMBERS,
      applications:
        r[1].status === "fulfilled" && Array.isArray(r[1].value)
          ? r[1].value
          : MOCK_APPLICATIONS,
      stats:
        r[2].status === "fulfilled"
          ? r[2].value
          : { totalMembers: 126, activeLoans: 9, totalSavings: 4200000 },
      archived:
        r[3].status === "fulfilled" && Array.isArray(r[3].value)
          ? r[3].value
          : MOCK_ARCHIVED,
      transactions:
        r[4].status === "fulfilled" && Array.isArray(r[4].value)
          ? r[4].value
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
        r[9].status === "fulfilled" && Array.isArray(r[9].value)
          ? r[9].value
          : MOCK_AUDIT_LOGS,
    });
    setLoading(false);
  }
  useEffect(() => {
    loadData();
  }, [accessToken]);
  useEffect(() => {
    const iv = setInterval(() => loadData({ showLoading: false }), 30000);
    return () => clearInterval(iv);
  }, [accessToken]);

  function markAllRead() {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
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
          <AdminReadOnlyTable
            title="Loan Management"
            data={data.loans}
            columns={[
              { key: "id", label: "ID" },
              { key: "type", label: "Type" },
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
              {
                key: "status",
                label: "Status",
                render: (v) => <StatusBadge status={v || "Pending"} />,
              },
            ]}
            fileName="admin-loans.csv"
          />
        );
      case "transactions":
        return (
          <AdminReadOnlyTable
            title="Transaction Ledger & Deposit Audit"
            data={data.transactions}
            columns={[
              {
                key: "reference",
                label: "Reference",
                render: (v, r) => v || r.id,
              },
              { key: "memberNumber", label: "Member Number" },
              { key: "memberName", label: "Member" },
              {
                key: "category",
                label: "Category",
                render: (v) => String(v || "UNCLASSIFIED").replaceAll("_", " "),
              },
              { key: "destination", label: "Destination" },
              { key: "type", label: "Type" },
              {
                key: "amount",
                label: "Amount",
                render: (v) => formatCurrency(v),
              },
              { key: "method", label: "Method" },
              {
                key: "status",
                label: "Status",
                render: (v) => <StatusBadge status={v || "Pending"} />,
              },
              { key: "createdAt", label: "Date", render: formatDateSafe },
            ]}
            fileName="admin-transactions.csv"
          />
        );
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
        return (
          <AdminReadOnlyTable
            title="Salary Deductions"
            data={data.deductions}
            columns={[
              { key: "name", label: "Member" },
              { key: "company", label: "Company" },
              {
                key: "salary",
                label: "Salary",
                render: (v) => (v ? formatCurrency(v) : "—"),
              },
              {
                key: "deduction",
                label: "Deduction",
                render: (v) => (v ? formatCurrency(v) : "—"),
              },
            ]}
            fileName="admin-deductions.csv"
          />
        );
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
            accessToken={accessToken}
          />
        );
      case "audit-logs":
        return <AdminAuditLogs data={data.auditLogs} />;
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
  const pendingApps = data.applications.filter(
    (a) => String(a.status || "").toUpperCase() === "PENDING",
  );
  const activeMembers = data.users.filter(
    (u) => u.status === "Active" || u.active !== false,
  );
  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Admin operations"
        title="System control center"
        description="Member lifecycle management, read-only financial oversight, communications hub, and audit logging."
        metrics={[
          { label: "Members", value: activeMembers.length },
          { label: "Pending Apps", value: pendingApps.length },
          { label: "Active Loans", value: data.stats.activeLoans || 0 },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active Members"
          value={activeMembers.length}
          icon={UsersRound}
          tone="blue"
          trend="Live"
        />
        <KpiCard
          label="Pending Applications"
          value={pendingApps.length}
          icon={Clock3}
          tone="amber"
          trend="Review"
        />
        <KpiCard
          label="Archived Members"
          value={data.archived.length}
          icon={LogOut}
          tone="rose"
        />
        <KpiCard
          label="Audit Entries"
          value={data.auditLogs.length}
          icon={ShieldAlert}
          tone="slate"
        />
      </div>
      <AdminApplications
        data={data}
        accessToken={accessToken}
        onRefresh={onRefresh}
        embedded
      />
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
        data.users.filter((u) => u.status !== "Archived").length +
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
                  : [...data.users, ...data.archived],
                mainTab === "applications"
                  ? [
                      { key: "id", label: "ID" },
                      { key: "name", label: "Name" },
                      { key: "phone", label: "Phone" },
                      { key: "status", label: "Status" },
                      { key: "submittedDate", label: "Date" },
                    ]
                  : [
                      { key: "id", label: "ID" },
                      { key: "name", label: "Name" },
                      { key: "company", label: "Company" },
                      { key: "status", label: "Status" },
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
  const active = data.users.filter((u) => u.status !== "Archived");
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
    "id",
    "memberNumber",
    "name",
    "phone",
    "company",
    "email",
    "reason",
  ]);

  const baseColumns =
    regTab === "active"
      ? [
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
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
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "optOutDate", label: "Opt-out Date", render: formatDateSafe },
          { key: "reason", label: "Reason" },
        ];
  const columns =
    regTab === "active"
      ? [
          baseColumns[0],
          { key: "memberNumber", label: "Member Number" },
          ...baseColumns.slice(1),
        ]
      : baseColumns;

  return (
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
          {filtered.map((row) => (
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
  const { applications = MOCK_APPLICATIONS } = data || {};
  const [search, setSearch] = useState("");
  const filtered = filterRows(applications, search, [
    "id",
    "name",
    "phone",
    "status",
    "nationalId",
  ]);

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
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "phone", label: "Phone" },
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
                "ID",
                "Name",
                "Phone",
                "National ID",
                "Date",
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
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-sm font-semibold">{a.id}</td>
                <td className="px-4 py-3 text-sm">{a.name}</td>
                <td className="px-4 py-3 text-sm">{a.phone}</td>
                <td className="px-4 py-3 text-sm">{a.nationalId}</td>
                <td className="px-4 py-3 text-sm">
                  {formatDateSafe(a.submittedDate)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {String(a.status || "").toUpperCase() === "PENDING" ? (
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
                      <span className="text-xs text-slate-400">Reviewed</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
function AdminReadOnlyTable({ title, data: rows, columns, fileName }) {
  const [search, setSearch] = useState("");
  const filtered = filterRows(
    rows,
    search,
    columns.map((c) => c.key),
  );
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
      <div className="flex items-center gap-3">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border py-2 pl-2 pr-4 text-sm"
        />
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
            {filtered.map((row, i) => (
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
    </div>
  );
}

// ============================================================
// MODULE 3: BIDIRECTIONAL NOTIFICATION ENGINE
// ============================================================
function AdminNotificationsPanel({
  notifications,
  onMarkAllRead,
  accessToken,
}) {
  const [tab, setTab] = useState("inbound");
  const [broadcast, setBroadcast] = useState({ title: "", body: "" });
  const [direct, setDirect] = useState({ memberId: "", title: "", body: "" });
  const [msg, setMsg] = useState(null);
  const [sending, setSending] = useState(false);

  const filtered = tab === "inbound" ? notifications : [];

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
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${n.type === "APPLICATION" ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-700"}`}
                >
                  {n.type}
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
      )}

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
function AdminAuditLogs({ data }) {
  const [search, setSearch] = useState("");
  const logs = data || MOCK_AUDIT_LOGS;
  const filtered = filterRows(logs, search, [
    "timestamp",
    "userId",
    "actionType",
    "ipAddress",
    "affectedRecord",
  ]);
  const columns = [
    { key: "timestamp", label: "Timestamp" },
    { key: "userId", label: "User" },
    { key: "actionType", label: "Action" },
    { key: "ipAddress", label: "IP Address" },
    { key: "affectedRecord", label: "Record" },
  ];
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Audit logs"
        title="Immutable audit trail"
        description="Every login, status change, broadcast, transaction, and override is logged."
        action={
          <button
            onClick={() => exportCSV(filtered, columns, "audit-logs.csv")}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Download size={14} />
            Export CSV
          </button>
        }
      />
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search audit logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border py-2 pl-9 pr-4 text-sm"
        />
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
            {filtered.map((log) => (
              <tr key={log.id}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-sm">
                    {log[c.key] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// MODULE 5: REPORTS EXPORT ENGINE (Shared Financier data, read-only)
// ============================================================
function AdminReportsPage({ data }) {
  const [timeFilter, setTimeFilter] = useState("monthly");
  const timeSeries = useMemo(() => {
    const transactions = data.transactions || [];
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
