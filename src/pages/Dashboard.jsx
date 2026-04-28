import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'
import TopNavbar from '../components/layout/TopNavbar.jsx'
import { getTransactions, getLoans, getShares, getDividends, getApplications, getDeductions } from '../services/api.js'

// Overview Card Component
function OverviewCard({ title, value, accent = false }) {
  return (
    <div className="summary-card" style={{
      padding: 20,
      borderLeft: accent ? '4px solid var(--color-accent)' : '4px solid var(--color-primary)',
      background: 'var(--color-white)',
      borderRadius: 20,
      border: '1px solid rgba(10, 42, 67, 0.08)',
      boxShadow: 'var(--shadow-soft)',
    }}>
      <h3 style={{
        marginTop: 8,
        fontSize: 'clamp(1.35rem, 2vw, 1.8rem)',
        letterSpacing: -0.04,
        color: 'var(--color-text)',
      }}>
        {value}
      </h3>
      <p style={{
        marginTop: 4,
        color: 'var(--color-muted)',
        fontSize: 13,
      }}>
        {title}
      </p>
    </div>
  )
}

// Admin Overview
function AdminOverview({ stats }) {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Administrator Dashboard</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18,
        marginBottom: 32,
      }}>
        <OverviewCard title="Total Members" value={stats.totalMembers?.toLocaleString() || 0} accent />
        <OverviewCard title="Pending Applications" value={stats.pendingApplications || 0} />
        <OverviewCard title="Active Loans" value={stats.activeLoans || 0} />
        <OverviewCard title="Total Shares" value={`KSh ${(stats.totalShares || 0).toLocaleString()}`} />
      </div>
      <div className="feature-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 12 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/dashboard/applications" className="button button-primary" style={{ padding: '12px 24px' }}>
            Review Applications
          </a>
          <a href="/dashboard/members" className="button button-secondary" style={{ padding: '12px 24px' }}>
            Manage Members
          </a>
        </div>
      </div>
    </div>
  )
}

// Finance Overview
function FinanceOverview({ stats }) {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Finance Dashboard</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18,
        marginBottom: 32,
      }}>
        <OverviewCard title="Total Deposits" value={`KSh ${(stats.deposits || 0).toLocaleString()}`} accent />
        <OverviewCard title="Withdrawals" value={`KSh ${(stats.withdrawals || 0).toLocaleString()}`} />
        <OverviewCard title="Loans Disbursed" value={`KSh ${(stats.loansDisbursed || 0).toLocaleString()}`} />
        <OverviewCard title="Dividends" value={`KSh ${(stats.dividends || 0).toLocaleString()}`} />
      </div>
    </div>
  )
}

// Member Overview
function MemberOverview({ stats }) {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Member Dashboard</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18,
        marginBottom: 32,
      }}>
        <OverviewCard title="My Balance" value={`KSh ${(stats.balance || 0).toLocaleString()}`} accent />
        <OverviewCard title="Active Loans" value={stats.activeLoans || 0} />
        <OverviewCard title="My Shares" value={stats.shares || 0} />
        <OverviewCard title="Member Since" value={stats.memberSince || 'N/A'} />
      </div>
    </div>
  )
}

// Generic Data Table
function DataTable({ columns, data, emptyMessage }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', borderRadius: 16, background: 'var(--color-white)', border: '1px dashed rgba(10, 42, 67, 0.2)' }}>
        <p style={{ color: 'var(--color-muted)' }}>{emptyMessage || 'No data available'}</p>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--code-bg)' }}>
            {columns.map((col) => (
              <th key={col.key} style={{
                padding: '14px 0',
                textAlign: 'left',
                color: 'var(--color-muted)',
                fontSize: 12,
                letterSpacing: 0.08,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id || idx} style={{ borderBottom: '1px solid rgba(10, 42, 67, 0.06)' }}>
              {columns.map((col) => (
                <td key={col.key} style={{
                  padding: '14px 0',
                  color: 'var(--color-text)',
                  fontSize: 15,
                }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Dashboard() {
  const location = useLocation()
  const { user, accessToken } = useContext(AuthContext)
  const role = user?.role || 'MEMBER'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    transactions: [],
    loans: [],
    shares: [],
    dividends: [],
    applications: [],
    deductions: [],
  })

  // Mock stats - replace with real /stats endpoint
  const stats = {
    totalMembers: role === 'MEMBER' ? 0 : 1274,
    pendingApplications: role === 'MEMBER' ? 0 : 42,
    activeLoans: role === 'MEMBER' ? 2 : 487,
    totalShares: role === 'MEMBER' ? 0 : 35800000,
    deposits: 4580000,
    withdrawals: 2890000,
    loansDisbursed: 12500000,
    dividends: 850000,
    balance: 157500,
    loanBalance: 85000,
    shares: 150,
    dividendBalance: 12500,
    memberSince: 'Jan 2023',
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!accessToken) return

      setLoading(true)
      setError(null)

      try {
        const opts = { accessToken }
        const results = await Promise.allSettled([
          getTransactions(accessToken),
          getLoans(accessToken),
          getShares(accessToken),
          getDividends(accessToken),
          (role === 'ADMIN' || role === 'FINANCE') ? getApplications(accessToken) : Promise.resolve([]),
          (role === 'ADMIN' || role === 'FINANCE') ? getDeductions(accessToken) : Promise.resolve([]),
        ])

        if (cancelled) return

        const getData = (r) => r.status === 'fulfilled' ? r.value : []

        setData({
          transactions: getData(results[0]),
          loans: getData(results[1]),
          shares: getData(results[2]),
          dividends: getData(results[3]),
          applications: getData(results[4]),
          deductions: getData(results[5]),
        })
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [accessToken, role])

  const path = location.pathname

  function renderContent() {
    if (loading) {
      return (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 24,
              height: 24,
              border: '2px solid rgba(10, 42, 67, 0.1)',
              borderTopColor: 'var(--color-accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: 'var(--color-muted)' }}>Loading dashboard...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: 16 }}>{error}</p>
          <button
            className="button button-secondary"
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px' }}
          >
            Retry
          </button>
        </div>
      )
    }

    // Role-based routing
    if (path === '/dashboard' || path === '/dashboard/') {
      if (role === 'ADMIN') return <AdminOverview stats={stats} />
      if (role === 'FINANCE') return <FinanceOverview stats={stats} />
      return <MemberOverview stats={stats} />
    }

    if (path.includes('/transactions')) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Transactions</h2>
          <div className="feature-card" style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'type', label: 'Type' },
                { key: 'amount', label: 'Amount', render: (v) => `KSh ${Number(v).toLocaleString()}` },
                { key: 'description', label: 'Description' },
                { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
              ]}
              data={data.transactions}
              emptyMessage="No transactions found"
            />
          </div>
        </div>
      )
    }

    if (path.includes('/loans')) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Loans</h2>
          <div className="feature-card" style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'type', label: 'Type' },
                { key: 'principal', label: 'Principal', render: (v) => `KSh ${Number(v).toLocaleString()}` },
                { key: 'balance', label: 'Balance', render: (v) => `KSh ${Number(v).toLocaleString()}` },
                { key: 'status', label: 'Status' },
                { key: 'approvedAt', label: 'Approved', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
              ]}
              data={data.loans}
              emptyMessage="No loans found"
            />
          </div>
        </div>
      )
    }

    if (path.includes('/shares')) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Shares</h2>
          <div className="feature-card" style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'shares', label: 'Shares', render: (v) => Number(v).toLocaleString() },
                { key: 'totalInvested', label: 'Invested', render: (v) => `KSh ${Number(v).toLocaleString()}` },
                { key: 'purchaseDate', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
              ]}
              data={data.shares}
              emptyMessage="No shares found"
            />
          </div>
        </div>
      )
    }

    if (path.includes('/dividends')) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Dividends</h2>
          <div className="feature-card" style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'amount', label: 'Amount', render: (v) => `KSh ${Number(v).toLocaleString()}` },
                { key: 'sharePercentage', label: '%', render: (v) => `${v}%` },
                { key: 'declaredAt', label: 'Declared', render: (v) => new Date(v).toLocaleDateString() },
                { key: 'status', label: 'Status' },
              ]}
              data={data.dividends}
              emptyMessage="No dividends found"
            />
          </div>
        </div>
      )
    }

    if (path.includes('/applications') && (role === 'ADMIN' || role === 'FINANCE')) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Membership Applications</h2>
          <div className="feature-card" style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'applicantName', label: 'Applicant' },
                { key: 'applicantEmail', label: 'Email' },
                { key: 'status', label: 'Status' },
                { key: 'submittedAt', label: 'Submitted', render: (v) => new Date(v).toLocaleDateString() },
              ]}
              data={data.applications}
              emptyMessage="No applications found"
            />
          </div>
        </div>
      )
    }

    if (path.includes('/deductions') && (role === 'ADMIN' || role === 'FINANCE')) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>Deductions</h2>
          <div className="feature-card" style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'memberName', label: 'Member' },
                { key: 'amount', label: 'Amount', render: (v) => `KSh ${Number(v).toLocaleString()}` },
                { key: 'reason', label: 'Reason' },
                { key: 'date', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
              ]}
              data={data.deductions}
              emptyMessage="No deductions found"
            />
          </div>
        </div>
      )
    }

    if (path.includes('/profile')) {
      return (
        <div>
          <h2 style={{ marginBottom: 24 }}>My Profile</h2>
          <div className="feature-card" style={{ padding: 24 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 4 }}>Name</p>
                <p style={{ fontWeight: 600, fontSize: 16 }}>{user?.name || 'N/A'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 4 }}>Email</p>
                <p style={{ fontWeight: 600, fontSize: 16 }}>{user?.email || 'N/A'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 4 }}>Phone</p>
                <p style={{ fontWeight: 600, fontSize: 16 }}>{user?.phone || 'N/A'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 4 }}>Role</p>
                <p style={{ fontWeight: 600, fontSize: 16 }}>{user?.role || 'MEMBER'}</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return <MemberOverview stats={stats} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background)' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0 }}>
        <TopNavbar />
        <div style={{ padding: '36px' }}>
          {renderContent()}
        </div>
      </main>
    </div>
  )
}