import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";
import {
  getMyLoans,
  getMyNotifications,
  getMyShares,
  getMyTransactions,
  markAllNotificationsRead,
  markNotificationRead,
  searchDashboard,
} from "../features/member/memberService.js";
import { getAuthSessions } from "../services/authService.js";
import DashboardOverview from "../components/user-dashboard/DashboardOverview.jsx";
import LoansPage from "../components/user-dashboard/LoansPage.jsx";
import NotificationsPanel from "../components/user-dashboard/NotificationsPanel.jsx";
import PortfolioPage from "../components/user-dashboard/PortfolioPage.jsx";
import ProfileSettings from "../components/user-dashboard/ProfileSettings.jsx";
import ReportsPage from "../components/user-dashboard/ReportsPage.jsx";
import SavingsPage from "../components/user-dashboard/SavingsPage.jsx";
import SearchResultsPage from "../components/user-dashboard/SearchResultsPage.jsx";
import SecuritySection from "../components/user-dashboard/SecuritySection.jsx";
import SkeletonDashboard from "../components/user-dashboard/SkeletonDashboard.jsx";
import SupportPage from "../components/user-dashboard/SupportPage.jsx";
import TransactionsTable from "../components/user-dashboard/TransactionsTable.jsx";
import { MIN_SHARE_CAPITAL, matchesSearch, normalizeStatus } from "../components/user-dashboard/dashboardUtils.js";

export default function UserDashboard() {
  const location = useLocation();
  const { user, accessToken, loadCurrentUser, updateCurrentUser } = useContext(AuthContext);
  const dashboardBasePath = getDashboardPath("MEMBER");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [remoteSearch, setRemoteSearch] = useState({ loading: false, error: "", results: null, query: "" });
  const [showValues, setShowValues] = useState(false);
  const [data, setData] = useState({
    transactions: [],
    loans: [],
    shares: [],
    notifications: [],
    activeSessions: [],
    loginHistory: [],
  });

  async function loadDashboardData({ showLoading = true } = {}) {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      if (showLoading) setLoading(true);
      const results = await Promise.allSettled([
        getMyTransactions(accessToken),
        getMyLoans(accessToken),
        getMyShares(accessToken),
        getAuthSessions(accessToken),
        getMyNotifications(accessToken, { limit: 100 }),
      ]);
      const sessions = results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : [];

      setData({
        transactions: results[0].status === "fulfilled" && Array.isArray(results[0].value) ? results[0].value : [],
        loans: results[1].status === "fulfilled" && Array.isArray(results[1].value) ? results[1].value : [],
        shares: results[2].status === "fulfilled" && Array.isArray(results[2].value) ? results[2].value : [],
        notifications: results[4].status === "fulfilled" && Array.isArray(results[4].value) ? results[4].value : [],
        activeSessions: sessions.filter((session) => String(session.status || "").toUpperCase() === "ACTIVE"),
        loginHistory: sessions.map((session) => ({
          date: session.date ? new Date(session.date).toLocaleString() : "-",
          event: session.event || "Login",
          device: session.device || session.deviceName || "Unknown device",
          ip: session.ip || "",
          location: session.location || "",
          status: session.isNewDevice ? "New device" : normalizeStatus(session.status),
        })),
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
        loadDashboardData({ showLoading: false });
      }, 120000);
    }
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    const query = search.trim();
    if (!accessToken || query.length < 2) {
      setRemoteSearch({ loading: false, error: "", results: null, query });
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setRemoteSearch((current) => ({ ...current, loading: true, error: "", query }));
      try {
        const payload = await searchDashboard(query, accessToken, { limit: 8 });
        if (!controller.signal.aborted) {
          setRemoteSearch({ loading: false, error: "", results: payload.results, query });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRemoteSearch({ loading: false, error: error?.message || "Search is using local dashboard data.", results: null, query });
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [accessToken, search]);

  const stats = useMemo(() => {
    const successfulTransactions = data.transactions.filter((transaction) => {
      const status = String(transaction.status || "").toUpperCase();
      return ["SUCCESS", "PAID", "COMPLETED"].includes(status);
    });
    const getCategory = (transaction) => String(
      transaction.paymentCategory ||
      transaction.kcbEndpoint ||
      transaction.description ||
      transaction.type ||
      ""
    ).toLowerCase();
    const categoryTotal = (tokens) => successfulTransactions.reduce((sum, transaction) => {
      const category = getCategory(transaction);
      return tokens.some((token) => category.includes(token))
        ? sum + Number(transaction.amount || 0)
        : sum;
    }, 0);

    const savings = categoryTotal(["savings"]);
    const paidShareCapital = categoryTotal(["share_capital", "sharecapital", "share capital"]);
    const shareAccountCapital = data.shares.reduce((sum, share) => sum + Number(share.totalInvested || 0), 0);
    const shareCapital = Math.max(paidShareCapital, shareAccountCapital);
    const balance = successfulTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const loanBalance = data.loans.reduce((sum, loan) => sum + Number(loan.balance || loan.principal || 0), 0);
    const now = new Date();
    const monthlyContributions = successfulTransactions.reduce((sum, transaction) => {
      const date = transaction.createdAt || transaction.date;
      const transactionDate = date ? new Date(date) : null;
      const isCurrentMonth =
        transactionDate &&
        transactionDate.getMonth() === now.getMonth() &&
        transactionDate.getFullYear() === now.getFullYear();
      const category = getCategory(transaction);
      const isMonthlyContribution = category.includes("monthly_contribution") || category.includes("monthlycontributions");
      return isCurrentMonth && isMonthlyContribution ? sum + Number(transaction.amount || 0) : sum;
    }, 0);

    return {
      balance,
      totalSavings: savings,
      shareCapital,
      loanBalance,
      monthlyContributions,
      activeLoans: data.loans.filter((loan) => ["ACTIVE", "APPROVED"].includes(String(loan.status || "").toUpperCase())).length,
      shareCapitalRemaining: Math.max(MIN_SHARE_CAPITAL - shareCapital, 0),
      shareCapitalProgress: Math.min((shareCapital / MIN_SHARE_CAPITAL) * 100, 100),
    };
  }, [data]);

  const path = location.pathname;
  const memberName = user?.firstName || user?.name?.split(" ")?.[0] || "Member";
  const isDashboardHome =
    path === "/dashboard" ||
    path === "/dashboard/" ||
    path === dashboardBasePath ||
    path === `${dashboardBasePath}/`;

  function renderContent() {
    if (loading) return <SkeletonDashboard />;
    if (search.trim()) {
      return <SearchResultsPage search={search.trim()} data={data} stats={stats} user={user} showValues={showValues} remoteSearch={remoteSearch} />;
    }
    if (isDashboardHome) {
      return (
        <div className="space-y-6">
      
        <DashboardOverview
          stats={stats}
          transactions={data.transactions.filter((transaction) => matchesSearch(transaction, search))}
          memberName={memberName}
          user={user}
          notifications={data.notifications}
          showValues={showValues}
          accessToken={accessToken}
          onToggleValues={() => setShowValues((current) => !current)}
        />
        </div>
      );
    }
    if (path.includes("/transactions")) {
      return (
        <div className="space-y-6">
          <TransactionsTable
            transactions={data.transactions.filter((transaction) => matchesSearch(transaction, search))}
            accessToken={accessToken}
            paginate
            pageSize={10}
          />
        </div>
      );
    }
    if (path.includes("/loans")) {
      return <LoansPage loans={data.loans} stats={stats} accessToken={accessToken} onRefresh={() => loadDashboardData({ showLoading: false })} search={search} showValues={showValues} />;
    }
    if (path.includes("/security")) {
      return (
        <SecuritySection
          user={user}
          accessToken={accessToken}
          activeSessions={data.activeSessions}
          loginHistory={data.loginHistory}
          onRefresh={() => loadDashboardData({ showLoading: false })}
        />
      );
    }
    if (path.includes("/settings") || path.includes("/profile")) {
      return (
        <ProfileSettings
          user={user}
          accessToken={accessToken}
          onProfileUpdated={(updatedUser) => {
            updateCurrentUser?.(updatedUser);
            return loadCurrentUser?.(accessToken);
          }}
        />
      );
    }
    if (path.includes("/notifications")) {
      return (
        <div className="space-y-6">
          <NotificationsPanel
            items={data.notifications}
            paginate
            pageSize={10}
            onMarkRead={async (id) => {
              await markNotificationRead(id, accessToken);
              await loadDashboardData({ showLoading: false });
            }}
            onMarkAllRead={async () => {
              await markAllNotificationsRead(accessToken);
              await loadDashboardData({ showLoading: false });
            }}
          />
        </div>
      );
    }
    if (path.includes("/portfolio")) {
      return <PortfolioPage stats={stats} transactions={data.transactions} shares={data.shares} search={search} user={user} showValues={showValues} onToggleValues={() => setShowValues((current) => !current)} />;
    }
    if (path.includes("/reports")) {
      return <ReportsPage accessToken={accessToken} />;
    }
    if (path.includes("/savings")) {
      return <SavingsPage stats={stats} transactions={data.transactions} accessToken={accessToken} onRefresh={() => loadDashboardData({ showLoading: false })} showValues={showValues} onToggleValues={() => setShowValues((current) => !current)} user={user} />;
    }
  
    if (path.includes("/support")) {
      return <SupportPage user={user} />;
    }
    return (
      <DashboardOverview
        stats={stats}
        transactions={data.transactions}
        memberName={memberName}
        user={user}
        notifications={data.notifications}
        showValues={showValues}
        accessToken={accessToken}
        onToggleValues={() => setShowValues((current) => !current)}
      />
    );
  }

  return (
    <div className="enterprise-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} onClearSearch={() => setSearch('')} />
      <main className={`min-h-screen transition-all ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-62"}`}>
        <TopNavbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => {
            if (window.innerWidth >= 1024) setSidebarCollapsed((current) => !current);
            else setSidebarOpen((current) => !current);
          }}
          unreadCount={data.notifications.filter((notification) => !notification.isRead && !notification.readAt).length}
          searchValue={search}
          onSearchChange={setSearch}
        />
        <div className="mx-auto w-full max-w-[1500px] px-4 py-2 sm:px-2 lg:px-2">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
