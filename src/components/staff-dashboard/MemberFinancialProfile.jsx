import { AlertTriangle, ArrowLeft, Landmark, ReceiptText, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate, StatusBadge } from "../dashboard/EnterpriseDashboard.jsx";

function EmptyRow({ columns, text }) {
  return <tr><td colSpan={columns} className="px-4 py-8 text-center text-sm text-slate-500">{text}</td></tr>;
}

export default function MemberFinancialProfile({ profile, loading, error, onBack }) {
  const member = profile?.member;
  const summary = profile?.summary || {};
  const user = member?.user || {};

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
        <ArrowLeft size={16} /> Back to member registry
      </button>
      {loading ? <div className="rounded-lg border bg-white p-10 text-center text-sm text-slate-500">Loading complete member financial history...</div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</div> : null}
      {!loading && member ? (
        <>
          <section className="rounded-lg border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="text-xl font-semibold">{user.name || "Member"}</h2><p className="mt-1 text-sm text-slate-500">{member.memberNumber} · {user.email || "No email"} · {user.phone || "No phone"}</p><p className="mt-1 text-xs text-slate-500">Internal ID: {member.id} · Joined: {formatDate(member.dateJoined)}</p></div>
              <StatusBadge status={member.status || "Pending"} />
            </div>
          </section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Savings", summary.savings, ReceiptText],
              ["Share capital", summary.shareCapital, TrendingUp],
              ["Share balance due", summary.shareCapitalBalance, AlertTriangle],
              ["Outstanding loans", summary.outstandingLoans, Landmark],
              ["Total repaid", summary.totalRepaid, ReceiptText],
            ].map(([label, value, Icon]) => <div key={label} className="rounded-lg border bg-white p-4"><Icon size={18} className="text-[#8cc63f]"/><p className="mt-3 text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{formatCurrency(value || 0)}</p></div>)}
          </div>
          <section className="overflow-hidden rounded-lg border bg-white">
            <div className="border-b p-4"><h3 className="font-semibold">All member transactions</h3><p className="text-sm text-slate-500">Every recorded deposit, fee, loan movement, repayment, and withdrawal.</p></div>
            <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-slate-50">{["Date","Reference","Category","Destination","Amount","Method","Status"].map((h)=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y">{profile.transactions?.length ? profile.transactions.map((t)=><tr key={t.id}><td className="px-4 py-3 text-sm">{formatDate(t.createdAt)}</td><td className="px-4 py-3 text-sm font-medium">{t.reference || t.id}</td><td className="px-4 py-3 text-sm">{t.category}</td><td className="px-4 py-3 text-sm">{t.destination}</td><td className="px-4 py-3 text-sm font-semibold">{formatCurrency(t.amount)}</td><td className="px-4 py-3 text-sm">{t.method || "—"}</td><td className="px-4 py-3"><StatusBadge status={t.status}/></td></tr>) : <EmptyRow columns={7} text="No transactions recorded for this member."/>}</tbody></table></div>
          </section>
          <section className="overflow-hidden rounded-lg border bg-white">
            <div className="border-b p-4"><h3 className="font-semibold">Loan borrowing and default history</h3><p className="text-sm text-slate-500">Applications, borrowed principal, repayments, balances, and delinquency status.</p></div>
            <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-slate-50">{["Applied","Loan","Principal","Repaid","Balance","Rate","Status"].map((h)=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y">{profile.loans?.length ? profile.loans.map((loan)=><tr key={loan.id}><td className="px-4 py-3 text-sm">{formatDate(loan.createdAt)}</td><td className="px-4 py-3 text-sm font-medium">{loan.type}</td><td className="px-4 py-3 text-sm">{formatCurrency(loan.principal)}</td><td className="px-4 py-3 text-sm text-emerald-700">{formatCurrency(loan.repaid)}</td><td className="px-4 py-3 text-sm">{formatCurrency(loan.balance)}</td><td className="px-4 py-3 text-sm">{loan.interestRate || 0}%</td><td className="px-4 py-3"><StatusBadge status={loan.status}/></td></tr>) : <EmptyRow columns={7} text="No loan history recorded."/>}</tbody></table></div>
          </section>
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="overflow-hidden rounded-lg border bg-white">
              <div className="border-b p-4"><h3 className="font-semibold">Loan repayment history</h3><p className="text-sm text-slate-500">Recorded repayments and their confirmation state.</p></div>
              <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-slate-50">{["Date","Reference","Amount","Status"].map((h)=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y">{profile.repayments?.length ? profile.repayments.map((t)=><tr key={t.id}><td className="px-4 py-3 text-sm">{formatDate(t.createdAt)}</td><td className="px-4 py-3 text-sm">{t.reference || t.id}</td><td className="px-4 py-3 text-sm font-semibold">{formatCurrency(t.amount)}</td><td className="px-4 py-3"><StatusBadge status={t.status}/></td></tr>) : <EmptyRow columns={4} text="No loan repayments recorded."/>}</tbody></table></div>
            </section>
            <section className="overflow-hidden rounded-lg border bg-white">
              <div className="border-b p-4"><h3 className="font-semibold">Defaulting history</h3><p className="text-sm text-slate-500">Overdue, defaulted, or written-off facilities.</p></div>
              <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-slate-50">{["Loan","Principal","Balance","Status"].map((h)=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y">{profile.defaults?.length ? profile.defaults.map((loan)=><tr key={loan.id}><td className="px-4 py-3 text-sm font-medium">{loan.type}</td><td className="px-4 py-3 text-sm">{formatCurrency(loan.principal)}</td><td className="px-4 py-3 text-sm">{formatCurrency(loan.balance)}</td><td className="px-4 py-3"><StatusBadge status={loan.status}/></td></tr>) : <EmptyRow columns={4} text="No defaulting history recorded."/>}</tbody></table></div>
            </section>
          </div>
          <section className="overflow-hidden rounded-lg border bg-white">
            <div className="border-b p-4"><h3 className="font-semibold">Share capital contribution history</h3><p className="text-sm text-slate-500">{profile.shares?.minimumAttained ? "Minimum share capital attained." : `Minimum not attained. Balance remaining: ${formatCurrency(profile.shares?.balanceRemaining || 0)}.`}</p></div>
            <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-slate-50">{["Date","Reference","Contribution","Method","Status"].map((h)=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y">{profile.shares?.contributionHistory?.length ? profile.shares.contributionHistory.map((t)=><tr key={t.id}><td className="px-4 py-3 text-sm">{formatDate(t.createdAt)}</td><td className="px-4 py-3 text-sm">{t.reference || t.id}</td><td className="px-4 py-3 text-sm font-semibold">{formatCurrency(t.amount)}</td><td className="px-4 py-3 text-sm">{t.method || "—"}</td><td className="px-4 py-3"><StatusBadge status={t.status}/></td></tr>) : <EmptyRow columns={5} text="No share capital contributions recorded."/>}</tbody></table></div>
          </section>
        </>
      ) : null}
    </div>
  );
}
