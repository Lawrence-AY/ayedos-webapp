import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import TopNavbar from "../components/layout/TopNavbar.jsx";
import {
  getTransactions,
  getLoans,
  getShares,
  getDividends,
  getApplications,
  getDeductions,
} from "../services/api.js";
import { getSystemStats, getAllUsers } from "../features/admin/adminService.js";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
 import { Progress } from "@/components/ui/progress";
 import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, PiggyBank, TrendingUp } from "lucide-react";

const MEMBER_LOAN_PRODUCTS = [
  {
    name: "Emergency Loan",
    max: 50000,
    interest: 1,
    fee: 0,
    period: 12,
    eligibility: "All members",
    guarantors: "Not required",
  },
  {
    name: "Education Loan",
    max: 100000,
    interest: 1,
    fee: 0.5,
    period: 12,
    eligibility: "100% share capital paid",
    guarantors: 2,
  },
  {
    name: "Welfare Loan",
    max: 100000,
    interest: 1.5,
    fee: 1,
    period: 24,
    eligibility: "100% share capital paid",
    guarantors: 2,
  },
  {
    name: "Development Loan",
    max: 250000,
    interest: 2,
    fee: 1,
    period: 72,
    eligibility: "100% share capital paid",
    guarantors: 3,
  },
];

function formatCurrency(value) {
  return `KSh ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function LoanCalculator({ products }) {
  const [selectedProductName, setSelectedProductName] = useState(
    products[0]?.name || "",
  );
  const [amount, setAmount] = useState(25000);
  const [months, setMonths] = useState(12);

  const selectedProduct =
    products.find((product) => product.name === selectedProductName) ||
    products[0];

  if (!selectedProduct) return null;

  const maxAmount = selectedProduct.max;
  const maxMonths = selectedProduct.period;
  const loanAmount = Math.min(Math.max(Number(amount) || 1000, 1000), maxAmount);
  const loanTerm = Math.min(Math.max(Number(months) || 1, 1), maxMonths);
  const monthlyRate = selectedProduct.interest / 100;
  const processingFee = loanAmount * (selectedProduct.fee / 100);
  const totalInterest = loanAmount * monthlyRate * loanTerm;
  const repayableAmount = loanAmount + totalInterest;
  const monthlyRepayment = repayableAmount / loanTerm;
  const totalCost = repayableAmount + processingFee;

  const handleProductChange = (event) => {
    const nextProduct = products.find(
      (product) => product.name === event.target.value,
    );

    if (!nextProduct) return;

    setSelectedProductName(nextProduct.name);
    setAmount((currentAmount) =>
      Math.min(Math.max(Number(currentAmount) || 1000, 1000), nextProduct.max),
    );
    setMonths((currentMonths) =>
      Math.min(Math.max(Number(currentMonths) || 1, 1), nextProduct.period),
    );
  };

  const updateAmount = (value) => {
    setAmount(Math.min(Math.max(Number(value) || 1000, 1000), maxAmount));
  };

  const updateMonths = (value) => {
    setMonths(Math.min(Math.max(Number(value) || 1, 1), maxMonths));
  };

  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ marginBottom: 18 }}>Loan Calculator</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 18,
            padding: 18,
            border: "1px solid rgba(10, 42, 67, 0.08)",
            borderRadius: 18,
            background: "rgba(248, 250, 252, 0.78)",
          }}
        >
          <div className="field" style={{ marginBottom: 0 }}>
            <Label className="label" htmlFor="loan-product">
              Loan product
            </Label>
            <select
              id="loan-product"
              value={selectedProductName}
              onChange={handleProductChange}
              className="input"
            >
              {products.map((product) => (
                <option key={product.name} value={product.name}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <Label className="label" htmlFor="loan-amount" style={{ margin: 0 }}>
                Amount
              </Label>
              <span style={{ color: "var(--color-muted)", fontSize: 13 }}>
                Max {formatCurrency(maxAmount)}
              </span>
            </div>
            <Input
              id="loan-amount"
              type="number"
              min="1000"
              max={maxAmount}
              step="1000"
              value={loanAmount}
              onChange={(event) => updateAmount(event.target.value)}
              className="input"
            />
            <input
              type="range"
              min="1000"
              max={maxAmount}
              step="1000"
              value={loanAmount}
              onChange={(event) => updateAmount(event.target.value)}
              style={{ width: "100%", accentColor: "var(--color-accent)" }}
              aria-label="Loan amount"
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <Label className="label" htmlFor="loan-term" style={{ margin: 0 }}>
                Repayment period
              </Label>
              <span style={{ color: "var(--color-muted)", fontSize: 13 }}>
                Max {maxMonths} months
              </span>
            </div>
            <Input
              id="loan-term"
              type="number"
              min="1"
              max={maxMonths}
              value={loanTerm}
              onChange={(event) => updateMonths(event.target.value)}
              className="input"
            />
            <input
              type="range"
              min="1"
              max={maxMonths}
              value={loanTerm}
              onChange={(event) => updateMonths(event.target.value)}
              style={{ width: "100%", accentColor: "var(--color-accent)" }}
              aria-label="Repayment period"
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            padding: 18,
            borderRadius: 18,
            background:
              "linear-gradient(135deg, rgba(0, 58, 22, 0.96), rgba(13, 53, 84, 0.94))",
            color: "var(--color-white)",
            minHeight: 280,
          }}
        >
          <div>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.72)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.08,
                textTransform: "uppercase",
              }}
            >
              Estimated monthly repayment
            </p>
            <div
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                fontWeight: 800,
                marginTop: 8,
                lineHeight: 1,
              }}
            >
              {formatCurrency(monthlyRepayment)}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["Interest rate", `${selectedProduct.interest}% / month`],
              ["Loan amount", formatCurrency(loanAmount)],
              ["Total interest", formatCurrency(totalInterest)],
              ["Processing fee", formatCurrency(processingFee)],
              ["Repayable amount", formatCurrency(repayableAmount)],
              ["Total cost", formatCurrency(totalCost)],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <div
                  style={{
                    color: "rgba(255, 255, 255, 0.68)",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <strong style={{ fontSize: 15 }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



// ======================
// Overview Card Component
// ======================
function OverviewCard({ title, value, accent = false }) {
  return (
    <div
      className="summary-card"
      style={{
        padding: 20,
        borderLeft: accent
          ? "4px solid var(--color-accent)"
          : "4px solid var(--color-primary)",
        background: "var(--color-white)",
        borderRadius: 20,
        border: "1px solid rgba(10, 42, 67, 0.08)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <h3
        style={{
          marginTop: 8,
          fontSize: "clamp(1.35rem, 2vw, 1.8rem)",
          letterSpacing: -0.04,
          color: "var(--color-text)",
        }}
      >
        {value}
      </h3>
      <p
        style={{
          marginTop: 4,
          color: "var(--color-muted)",
          fontSize: 13,
        }}
      >
        {title}
      </p>
    </div>
  );
}

// ======================
// Admin Overview
// ======================
function AdminOverview({ stats, applications }) {
  const pendingApps = (applications || [])
    .filter((app) => app.status === "PENDING")
    .slice(0, 5);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 18,
          marginBottom: 32,
        }}
      >
        <OverviewCard
          title="Total Members"
          value={stats.totalMembers?.toLocaleString() || 0}
          accent
        />
        <OverviewCard
          title="Pending Applications"
          value={stats.pendingApplications || 0}
        />
        <OverviewCard title="Active Loans" value={stats.activeLoans || 0} />
        <OverviewCard
          title="Total Shares"
          value={`KSh ${(stats.totalShares || 0).toLocaleString()}`}
        />
      </div>

      {pendingApps.length > 0 && (
        <div className="feature-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Pending Applications</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--code-bg)",
                  }}
                >
                  <th
                    style={{
                      padding: "10px 0",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: "10px 0",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      padding: "10px 0",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingApps.map((app) => (
                  <tr
                    key={app.id}
                    style={{ borderBottom: "1px solid rgba(10, 42, 67, 0.06)" }}
                  >
                    <td style={{ padding: "10px 0" }}>
                      {app.applicantName || "N/A"}
                    </td>
                    <td style={{ padding: "10px 0" }}>
                      {app.applicantEmail || "N/A"}
                    </td>
                    <td style={{ padding: "10px 0" }}>
                      {app.submittedAt
                        ? new Date(app.submittedAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="feature-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 12 }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/dashboard/applications"
            className="button button-primary"
            style={{ padding: "12px 24px" }}
          >
            Review Applications
          </a>
          <a
            href="/dashboard/members"
            className="button button-secondary"
            style={{ padding: "12px 24px" }}
          >
            Manage Members
          </a>
        </div>
      </div>
    </div>
  );
}

// ======================
// Finance Overview
// ======================
function FinanceOverview({ stats }) {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Finance Dashboard</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 18,
          marginBottom: 32,
        }}
      >
        <OverviewCard
          title="Total Deposits"
          value={`KSh ${(stats.deposits || 0).toLocaleString()}`}
          accent
        />
        <OverviewCard
          title="Withdrawals"
          value={`KSh ${(stats.withdrawals || 0).toLocaleString()}`}
        />
        <OverviewCard
          title="Loans Disbursed"
          value={`KSh ${(stats.loansDisbursed || 0).toLocaleString()}`}
        />
        <OverviewCard
          title="Dividends"
          value={`KSh ${(stats.dividends || 0).toLocaleString()}`}
        />
      </div>
    </div>
  );
}

// ======================
// Member Overview
// ======================


function MemberOverview({ stats, memberName = "Member" }) {
  const MIN_SHARE_CAPITAL = 25000;
  const currentShares = stats.shares || 0;
  const remaining = Math.max(MIN_SHARE_CAPITAL - currentShares, 0);
  const progressPercent = Math.min((currentShares / MIN_SHARE_CAPITAL) * 100, 100);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-md font-bold">
            {greeting} 
          </div>
          
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button size="sm">Deposit</Button>
        
          <Button size="sm" variant="secondary">Apply Loan</Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        
        {/* Balance */}
        <Card className="hover:shadow-md transition">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">My Balance</p>
              <div className="text-xl font-bold text-blue-600">
                KSh {(stats.balance || 0).toLocaleString()}
              </div>
               
            </div>
            
          </CardContent>
        </Card>

        {/* Loans */}
        <Card className="hover:shadow-md transition">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Loans</p>
              <div className="text-2xl font-bold">
                {stats.activeLoans || 0}
              </div>
              
            </div>
       
          </CardContent>
        </Card>

        {/* Share Capital */}
        <Card className="hover:shadow-md transition">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Share Capital</p>
            
            </div>

            <div className="text-2xl font-bold mt-1">
              KSh {currentShares.toLocaleString()}
            </div>

            <div className="mt-3 space-y-2">
              <Progress value={progressPercent} className="h-2" />

              <p className="text-xs text-muted-foreground">
                {remaining === 0 ? (
                  <span className="text-green-600">
                    ✓ Requirement met
                  </span>
                ) : (
                  `KES ${remaining.toLocaleString()} remaining`
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div>
        <div className="text-lg font-semibold mb-3">Insights</div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Loan Eligibility */}
        <Card>
  <CardContent className="p-5 space-y-4">
    <p className="text-sm text-muted-foreground font-medium">
      Loan Eligibility
    </p>

    {[
      {
        name: "Emergency Loan",
        eligible: true,
        rule: " ",
      },
      {
        name: "Education Loan",
        eligible: currentShares >= 25000,
        rule: "100% minimum share capital paid",
      },
      {
        name: "Welfare Loan",
        eligible: currentShares >= 25000,
        rule: "100% minimum share capital paid",
      },
      {
        name: "Development Loan",
        eligible: currentShares >= 25000,
        rule: "100% minimum share capital paid",
      },
    ].map((loan, i) => (
      <div
        key={i}
        className="flex items-center justify-between border-b pb-2 last:border-none"
      >
        <div>
          <p className="text-sm font-medium">{loan.name}</p>
          <p className="text-xs text-muted-foreground">
            {loan.rule}
          </p>
        </div>

        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            loan.eligible
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {loan.eligible ? "Eligible" : "Not yet"}
        </span>
      </div>
    ))}
  </CardContent>
</Card>

          {/* Next Payment */}
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Next Payment
              </p>
              <div className="text-lg font-semibold">
                {stats.nextPayment || "No loans"}
              </div>
            </CardContent>
          </Card>

          {/* Savings */}
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Total Savings
              </p>
              <div className="text-xl font-bold text-green-600">
                KSh {(stats.totalSavings || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity (NEW 🔥) */}
      <div>
        <div className="text-lg font-semibold mb-3">Recent Activity</div>

        <Card>
          <CardContent className="p-5 space-y-3 text-sm">
            {(stats.recent || []).length === 0 ? (
              <p className="text-muted-foreground">No recent transactions</p>
            ) : (
              stats.recent.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.label}</span>
                  <span className="font-medium">
                    KSh {item.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
 
// ======================
// Generic Data Table
// ======================
function DataTable({ columns, data, emptyMessage }) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          borderRadius: 16,
          background: "var(--color-white)",
          border: "1px dashed rgba(10, 42, 67, 0.2)",
        }}
      >
        <p style={{ color: "var(--color-muted)" }}>
          {emptyMessage || "No data available"}
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              borderBottom: "1px solid var(--border)",
              background: "var(--code-bg)",
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "14px 0",
                  textAlign: "left",
                  color: "var(--color-muted)",
                  fontSize: 12,
                  letterSpacing: 0.08,
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              style={{ borderBottom: "1px solid rgba(10, 42, 67, 0.06)" }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "14px 0",
                    color: "var(--color-text)",
                    fontSize: 15,
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ======================
// Notification Panel
// ======================
function NotificationPanel({ notifications, onClose }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "75px",
        right: "30px",
        width: "360px",
        background: "var(--color-white)",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        border: "1px solid rgba(10,42,67,0.1)",
        zIndex: 100,
        maxHeight: "65vh",
        overflow: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: 0 , textcolor: "var(--color-text)", fontWeight: "bold" }}>System Updates</h3>
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text)" }}>
          No new updates
        </div>
      ) : (
        notifications.map((notif) => (
          <div
            key={notif.id}
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              textcolor: "var(--color-text)",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{notif.title}</div>
            <div style={{ marginTop: 6, fontSize: "14.5px", color: "var(--color-text)" }}>{notif.message}</div>
            <div style={{ marginTop: 8, fontSize: "12px", color: "var(--color-text)" }}>
              {notif.date}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ======================
// Main Dashboard Component
// ======================
export default function Dashboard() {
  const location = useLocation();
  const { user, accessToken } = useContext(AuthContext);
  const role = user?.role || "MEMBER";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
     
    // ==================== NOTIFICATION STATE ====================
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => n.unread).length;

  // Sample notifications - replace later with API
  useEffect(() => {
    setNotifications([
      {
        id: 1,
        title: "New Feature Released",
        message: "Loan approval process has been improved.",
        date: "2026-05-06",
        unread: true
      },
      {
        id: 2,
        title: "System Maintenance",
        message: "Scheduled update on May 10th from 2:00 AM to 4:00 AM.",
        date: "2026-05-05",
        unread: false
      }
    ]);
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };
  // ===========================================================

  const [data, setData] = useState({
    transactions: [],
    loans: [],
    shares: [],
    dividends: [],
    applications: [],
    deductions: [],
    users: [],
  });

  const getMemberStats = () => {
    const balance = data.transactions.reduce((sum, transaction) => {
      const amount = Number(transaction?.amount || 0);
      if (
        transaction?.type === "DEPOSIT" ||
        transaction?.type === "DIVIDEND" ||
        transaction?.type === "LOAN_REPAYMENT"
      ) {
        return sum + amount;
      }
      if (
        transaction?.type === "WITHDRAWAL" ||
        transaction?.type === "LOAN_DISBURSEMENT" ||
        transaction?.type === "MEMBERSHIP_FEE"
      ) {
        return sum - amount;
      }
      return sum;
    }, 0);

    const activeLoans = data.loans.filter((loan) =>
      ["ACTIVE", "APPROVED"].includes(loan.status),
    ).length;
    const shares = data.shares.reduce(
      (sum, share) => sum + Number(share?.shares || 0),
      0,
    );

    return {
      balance,
      activeLoans,
      shares,
      memberSince: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "N/A",
    };
  };

  // Data fetching
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessToken) return;

      setLoading(true);
      setError(null);

      // Build dynamic promise list with labels
      const promises = [
        getTransactions(accessToken),
        getLoans(accessToken),
        getShares(accessToken),
        getDividends(accessToken),
      ];
      const labels = ["transactions", "loans", "shares", "dividends"];

      if (role === "ADMIN" || role === "FINANCE") {
        promises.push(getApplications(accessToken));
        labels.push("applications");
        promises.push(getDeductions(accessToken));
        labels.push("deductions");
        promises.push(getSystemStats(accessToken));
        labels.push("stats");
      }

      if (role === "ADMIN") {
        promises.push(getAllUsers(accessToken));
        labels.push("users");
      }

      const results = await Promise.allSettled(promises);
      if (cancelled) return;

      const newData = {
        transactions: [],
        loans: [],
        shares: [],
        dividends: [],
        applications: [],
        deductions: [],
        users: [],
      };

      results.forEach((result, idx) => {
        const label = labels[idx];
        if (label === "stats") {
          if (result.status === "fulfilled") setStats(result.value);
        } else {
          newData[label] = result.status === "fulfilled" ? result.value : [];
        }
      });

      setData(newData);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, role]);

  // Helper: render content based on route
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: 60, textAlign: "center" }}>
          <div
            style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
          >
            <div className="spinner" />
            <p style={{ color: "var(--color-muted)" }}>Loading dashboard...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: 60, textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontWeight: 600, marginBottom: 16 }}>
            {error}
          </p>
          <button
            className="button button-secondary"
            onClick={() => window.location.reload()}
            style={{ padding: "12px 24px" }}
          >
            Retry
          </button>
        </div>
      );
    }

    const path = location.pathname;
    const dashboardStats =
      role === "ADMIN" || role === "FINANCE" ? stats || {} : getMemberStats();

    // Dashboard home
    if (path === "/dashboard" || path === "/dashboard/") {
      if (role === "ADMIN")
        return (
          <AdminOverview
            stats={dashboardStats}
            applications={data.applications}
          />
        );
      if (role === "FINANCE") return <FinanceOverview stats={dashboardStats} />;
      return <MemberOverview stats={dashboardStats} />;
    }

    // Transactions
    if (path.includes("/transactions")) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Transactions</h2>
          <div
            className="feature-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "type", label: "Type" },
                {
                  key: "amount",
                  label: "Amount",
                  render: (v) => `KSh ${Number(v).toLocaleString()}`,
                },
                { key: "description", label: "Description" },
                {
                  key: "createdAt",
                  label: "Date",
                  render: (v) => new Date(v).toLocaleDateString(),
                },
              ]}
              data={data.transactions}
              emptyMessage="No transactions found"
            />
          </div>
        </div>
      );
    }

    // Loans (Member view)
   if (path.includes("/loans") && role === "MEMBER") {
  const pendingLoans = data.loans.filter((loan) =>
    ["ACTIVE", "APPROVED"].includes(loan.status),
  );

  return (
    <div>
      <div style={{ marginBottom: 24,fontSize:18 }}>My Loans</div>

      {/* ALL-IN-ONE SECTION */}
      <div
        className="feature-card"
        style={{
          marginBottom: 10,
          padding: 24,
          borderRadius: 24,
        }}
      >
        {/* Top Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              padding: 20,
              borderRadius: 18,
              background: "rgba(var(--color-accent-rgb),0.08)",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              Active Loans
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              {pendingLoans.length}
            </div>
          </div>

          <div
            style={{
              padding: 20,
              borderRadius: 18,
              background: "rgba(34,197,94,0.08)",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              Outstanding Balance
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              KSh{" "}
              {pendingLoans
                .reduce((acc, loan) => acc + Number(loan.balance || 0), 0)
                .toLocaleString()}
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>
            Pending Payments
          </h3>

          <DataTable
            columns={[
              { key: "id", label: "Loan ID" },
              {
                key: "principal",
                label: "Amount",
                render: (v) =>
                  `KSh ${Number(v).toLocaleString()}`,
              },
              {
                key: "balance",
                label: "Balance",
                render: (v) =>
                  `KSh ${Number(v).toLocaleString()}`,
              },
              { key: "status", label: "Status" },
              {
                key: "approvedAt",
                label: "Approved",
                render: (v) =>
                  v
                    ? new Date(v).toLocaleDateString()
                    : "-",
              },
            ]}
            data={pendingLoans}
            emptyMessage="No pending loan payments"
          />
        </div>

        <LoanCalculator products={MEMBER_LOAN_PRODUCTS} />

        {/* Loan Products */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ marginBottom: 18 }}>
            Available Loan Products
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",
              gap: 16,
            }}
          >
            {MEMBER_LOAN_PRODUCTS.map((loan) => (
              <div
                key={loan.name}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 18,
                  padding: 18,
                  background: "var(--color-surface)",
                }}
              >
                <h4
                  style={{
                    marginTop: 0,
                    marginBottom: 14,
                  }}
                >
                  {loan.name}
                </h4>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    fontSize: 14,
                  }}
                >
                  <div>
                    <strong>Maximum:</strong> KSh{" "}
                    {loan.max.toLocaleString()}
                  </div>

                  <div>
                    <strong>Interest:</strong>{" "}
                    {loan.interest}% / month
                  </div>

                  <div>
                    <strong>Processing Fee:</strong>{" "}
                    {loan.fee}%
                  </div>

                  <div>
                    <strong>Repayment:</strong>{" "}
                    {loan.period} months
                  </div>

                  <div>
                    <strong>Eligibility:</strong>{" "}
                    {loan.eligibility}
                  </div>

                  <div>
                    <strong>Guarantors:</strong>{" "}
                    {loan.guarantors}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              console.log("Request Loan clicked");
            }}
            style={{
              padding: "14px 28px",
              borderRadius: 14,
              background: "var(--color-accent)",
              color: "var(--color-white)",
              border: "none",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms ease",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            Request Loan
          </button>

          <button
            onClick={() => {
              console.log("Repay Loan clicked");
            }}
            style={{
              padding: "14px 28px",
              borderRadius: 14,
              background: "transparent",
              color: "var(--color-accent)",
              border: "2px solid var(--color-accent)",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            Repay Loan
          </button>
        </div>
      </div>
    </div>
  );
}
    // Loans (admin/finance view)
    if (path.includes("/loans")) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Loans</h2>
          <div
            className="feature-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "type", label: "Type" },
                {
                  key: "principal",
                  label: "Principal",
                  render: (v) => `KSh ${Number(v).toLocaleString()}`,
                },
                {
                  key: "balance",
                  label: "Balance",
                  render: (v) => `KSh ${Number(v).toLocaleString()}`,
                },
                { key: "status", label: "Status" },
                {
                  key: "approvedAt",
                  label: "Approved",
                  render: (v) => (v ? new Date(v).toLocaleDateString() : "-"),
                },
              ]}
              data={data.loans}
              emptyMessage="No loans found"
            />
          </div>
        </div>
      );
    }

    // Shares
    if (path.includes("/shares")) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Shares</h2>
          <div
            className="feature-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                {
                  key: "shares",
                  label: "Shares",
                  render: (v) => Number(v).toLocaleString(),
                },
                {
                  key: "totalInvested",
                  label: "Invested",
                  render: (v) => `KSh ${Number(v).toLocaleString()}`,
                },
                {
                  key: "purchaseDate",
                  label: "Date",
                  render: (v) => new Date(v).toLocaleDateString(),
                },
              ]}
              data={data.shares}
              emptyMessage="No shares found"
            />
          </div>
        </div>
      );
    }

    // Dividends
    if (path.includes("/dividends")) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Dividends</h2>
          <div
            className="feature-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                {
                  key: "amount",
                  label: "Amount",
                  render: (v) => `KSh ${Number(v).toLocaleString()}`,
                },
                {
                  key: "sharePercentage",
                  label: "%",
                  render: (v) => `${v}%`,
                },
                {
                  key: "declaredAt",
                  label: "Declared",
                  render: (v) => new Date(v).toLocaleDateString(),
                },
                { key: "status", label: "Status" },
              ]}
              data={data.dividends}
              emptyMessage="No dividends found"
            />
          </div>
        </div>
      );
    }

    // Applications (admin/finance)
    if (
      path.includes("/applications") &&
      (role === "ADMIN" || role === "FINANCE")
    ) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Membership Applications</h2>
          <div
            className="feature-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "applicantName", label: "Applicant" },
                { key: "applicantEmail", label: "Email" },
                { key: "status", label: "Status" },
                {
                  key: "submittedAt",
                  label: "Submitted",
                  render: (v) => new Date(v).toLocaleDateString(),
                },
              ]}
              data={data.applications}
              emptyMessage="No applications found"
            />
          </div>
        </div>
      );
    }

    // Deductions (admin/finance)
    if (
      path.includes("/deductions") &&
      (role === "ADMIN" || role === "FINANCE")
    ) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Deductions</h2>
          <div
            className="feature-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "memberName", label: "Member" },
                {
                  key: "amount",
                  label: "Amount",
                  render: (v) => `KSh ${Number(v).toLocaleString()}`,
                },
                { key: "reason", label: "Reason" },
                {
                  key: "date",
                  label: "Date",
                  render: (v) => new Date(v).toLocaleDateString(),
                },
              ]}
              data={data.deductions}
              emptyMessage="No deductions found"
            />
          </div>
        </div>
      );
    }

    // Members (admin only)
    if (path.includes("/members") && role === "ADMIN") {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Members Management</h2>
          <div
            className="feature-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <DataTable
              columns={[
               // { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                { key: "role", label: "Role" },
                {
                  key: "active",
                  label: "Status",
                  render: (v) => (v ? "Active" : "Inactive"),
                },
              ]}
              data={data.users}
              emptyMessage="No members found"
            />
          </div>
        </div>
      );
    }

    // Profile
    if (path.includes("/profile")) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>My Profile</h2>
          <div className="feature-card" style={{ padding: 24 }}>
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <p
                  style={{
                    color: "var(--color-primary)",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Name
                </p>
                <p style={{ fontWeight: 600, fontSize: 16 }}>
                  {user?.name || "N/A"}
                </p>
              </div>
              <div>
                <p
                  style={{
                    color: "var(--color-primary)",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Email
                </p>
                <p style={{ fontWeight: 600, fontSize: 16 }}>
                  {user?.email || "N/A"}
                </p>
              </div>
              <div>
                <p
                  style={{
                    color: "var(--color-primary)",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Phone
                </p>
                <p style={{ fontWeight: 600, fontSize: 16 }}>
                  {user?.phone || "N/A"}
                </p>
              </div>
              <div>
                <p
                  style={{
                    color: "var(--color-primary)",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Role
                </p>
                <p style={{ fontWeight: 600, fontSize: 16 }}>
                  {user?.role || "MEMBER"}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Access Denied for restricted sections
    if (
      (path.includes("/applications") ||
        path.includes("/deductions") ||
        path.includes("/members")) &&
      role !== "ADMIN" &&
      role !== "FINANCE"
    ) {
      return (
        <div style={{ paddingTop: 40, textAlign: "center" }}>
          <h2 style={{ marginBottom: 24, color: "#ef4444" }}>Access Denied</h2>
          <p
            style={{
              color: "var(--color-muted)",
              marginBottom: 24,
              fontSize: 16,
            }}
          >
            You don't have permission to access this section. Only
            administrators and finance officers can view this content.
          </p>
          <a
            href="/dashboard"
            className="button button-primary"
            style={{ display: "inline-block", padding: "12px 24px" }}
          >
            Back to Dashboard
          </a>
        </div>
      );
    }

    // Fallback (should not occur)
    return <MemberOverview stats={dashboardStats} />;
  };

  // Main layout
  return (
    <div style={{ display: "flex", minHeight: "100vh",  }}>
      <div
        style={{
          visibility: sidebarOpen ? "visible" : "hidden",
          position: "fixed",
          inset: "0 auto 0 0",
          width: 280,
          zIndex: 20,
        }}
      >
        <Sidebar />
      </div>
      <main
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: sidebarOpen ? 280 : 0,
          transition: "margin-left 200ms ease",
        }}
      >
                <TopNavbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          unreadCount={unreadCount}
          onNotificationClick={toggleNotifications}
        />
               <div style={{ padding: "36px" }}>{renderContent()}</div>

        {/* ==================== NOTIFICATION PANEL ==================== */}
        {showNotifications && (
          <>
            {/* Backdrop */}
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                zIndex: 99,
              }}
              onClick={() => setShowNotifications(false)}
            />
            {/* Panel */}
            <NotificationPanel
              notifications={notifications}
              onClose={() => setShowNotifications(false)}
            />
          </>
        )}
      </main>
    </div>
  );
}
