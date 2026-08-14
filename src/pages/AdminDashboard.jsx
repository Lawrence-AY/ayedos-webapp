import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  LogOut,
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
    reports: {},
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
      getAdminNotifications(accessToken),
      getFinancialReports(accessToken),
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
        r[9].status === "fulfilled" && Array.isArray(r[9].value)
          ? r[9].value
          : [],
      reports: r[11]?.status === "fulfilled" ? r[11].value : {},
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
    const iv = setInterval(() => loadData({ showLoading: false }), 30000);
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
                render: (v, row) => (
                  <div>
                    <StatusBadge status={row?.autoApproved ? "Auto-Approved (Emergency)" : v || "Pending"} />
                    {row?.autoApproved && row?.auditTimestamp ? <p className="mt-1 text-xs text-slate-500">{formatDate(row.auditTimestamp)}</p> : null}
                  </div>
                ),
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
            onMarkRead={markOneRead}
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
          { key: "phone", label: "Phone Number" },
          { key: "nationalId", label: "National ID" },
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
    "nationalId",
    "company",
    "email",
    "reason",
  ]);

  const baseColumns =
    regTab === "active"
      ? [
          { key: "id", label: "ID" },
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
          { key: "id", label: "ID" },
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
function AdminAuditLogs({ data }) {
  const [search, setSearch] = useState("");
  const logs = data || [];
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


