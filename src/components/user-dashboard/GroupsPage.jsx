import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, LogOut, Plus, RefreshCw, Search, Trash2, UserPlus, UsersRound, X } from 'lucide-react'
import { borrowForGroup, createGroup, getGroups, inviteGroupMember, leaveGroup, removeGroupMember, repayGroupLoan, respondGroupInvitation, searchGroupMembers } from '../../features/groups/groupService.js'

const money = (value) => `KES ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'medium' }).format(parsed) + ' EAT'
}
const badge = (status) => ({ ACCEPTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', ACTIVE: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200', REPAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' }[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200')

export default function GroupsPage({ accessToken, onRefresh }) {
  const [data, setData] = useState({ eligibility: null, groups: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })

  async function load() {
    try { setData(await getGroups(accessToken) || { eligibility: null, groups: [] }) }
    catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    load()
    const interval = window.setInterval(load, 15000)
    return () => window.clearInterval(interval)
  }, [accessToken])
  const selected = data.groups.find((group) => group.id === selectedId)
  useEffect(() => { if (selectedId && !selected) setSelectedId(null) }, [selectedId, selected])

  async function run(action, success) {
    setBusy(true); setMessage(null)
    try { await action(); setMessage({ type: 'success', text: success }); await load(); await onRefresh?.() }
    catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setBusy(false) }
  }
  async function submitCreate(event) {
    event.preventDefault()
    await run(async () => { const group = await createGroup(createForm, accessToken); setSelectedId(group.id); setShowCreate(false); setCreateForm({ name: '', description: '' }) }, 'Group created successfully.')
  }

  if (loading) return <div className="grid min-h-72 place-items-center"><RefreshCw className="animate-spin text-emerald-600" /></div>
  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <header className="rounded-xl border border-emerald-900/20 bg-[linear-gradient(135deg,#07182d_0%,#0f3443_48%,#155e3f_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b9e86d]">Group borrowing</p><h2 className="mt-2 text-2xl font-bold text-white">Your borrowing groups</h2><p className="mt-2 max-w-2xl text-sm text-slate-200">Create and manage groups, invite eligible members, borrow together, and follow every repayment.</p></div>
          <button disabled={!data.eligibility?.eligible} onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#8cc63f] px-4 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"><Plus size={18} />Create group</button>
        </div>
      </header>

      {message && <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200'}`}>{message.text}</div>}
      {!data.eligibility?.eligible && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"><strong>Group creation is locked.</strong> Complete share capital ({money(data.eligibility?.minimumShareCapital)}) and clear outstanding loans ({money(data.eligibility?.outstandingLoans)}).</div>}

      {showCreate && <form onSubmit={submitCreate} className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2"><div className="sm:col-span-2"><h3 className="font-bold">Create a borrowing group</h3><p className="text-sm text-slate-500 dark:text-slate-300">You will be the only member allowed to add or remove people.</p></div><label className="text-sm font-semibold">Group name<input required minLength={3} value={createForm.name} onChange={(e) => setCreateForm((form) => ({ ...form, name: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5" placeholder="e.g. Development Circle" /></label><label className="text-sm font-semibold">Purpose or description<input value={createForm.description} onChange={(e) => setCreateForm((form) => ({ ...form, description: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5" placeholder="What will the group borrow for?" /></label><div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white">Create group</button><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2.5 font-semibold">Cancel</button></div></form>}

      {selected ? <GroupDetail group={selected} accessToken={accessToken} busy={busy} run={run} onBack={() => setSelectedId(null)} /> : <GroupSummary groups={data.groups} onSelect={setSelectedId} />}
    </div>
  )
}

function GroupSummary({ groups, onSelect }) {
  const accepted = groups.filter((group) => group.viewerStatus === 'ACCEPTED')
  const pending = groups.filter((group) => group.viewerStatus === 'PENDING')
  if (!groups.length) return <div className="rounded-xl border bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"><UsersRound size={42} className="mx-auto text-slate-300" /><h3 className="mt-4 font-bold">No groups yet</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Create a group or wait for another member to invite you.</p></div>
  return <div className="space-y-5">{pending.length > 0 && <section><h3 className="mb-3 font-bold">Invitations requiring your response</h3><div className="grid gap-3 lg:grid-cols-2">{pending.map((group) => <GroupCard key={group.id} group={group} onClick={() => onSelect(group.id)} />)}</div></section>}<section><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Groups you belong to</h3><span className="text-sm text-slate-500 dark:text-slate-300">{accepted.length} total</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{accepted.map((group) => <GroupCard key={group.id} group={group} onClick={() => onSelect(group.id)} />)}</div></section></div>
}

function GroupCard({ group, onClick }) {
  const activeLoan = group.loans?.find((loan) => loan.status === 'ACTIVE')
  const acceptedMembers = group.members?.filter((member) => member.status === 'ACCEPTED').length || 0
  return <button onClick={onClick} className="rounded-xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold">{group.name}</h4><p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">{group.description || 'No description provided.'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge(group.viewerStatus)}`}>{group.viewerStatus}</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500 dark:text-slate-400">Members</p><p className="font-bold">{acceptedMembers}</p></div><div><p className="text-slate-500 dark:text-slate-400">Loan balance</p><p className="font-bold">{money(activeLoan?.balance)}</p></div></div></button>
}

function GroupDetail({ group, accessToken, busy, run, onBack }) {
  const [tab, setTab] = useState(group.viewerStatus === 'PENDING' ? 'overview' : 'loans')
  const [query, setQuery] = useState(''); const [results, setResults] = useState([]); const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState('')
  const [loanForm, setLoanForm] = useState({ amount: '', paymentPeriodMonths: '12', interestRate: '1' }); const [repayments, setRepayments] = useState({})
  const acceptedMembers = group.members?.filter((member) => member.status === 'ACCEPTED') || []
  const activeLoans = group.loans?.filter((loan) => loan.status === 'ACTIVE') || []
  const transactions = useMemo(() => [...(group.transactions || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [group.transactions])
  async function search(event) { event.preventDefault(); setSearching(true); setSearchError(''); try { setResults(await searchGroupMembers(query, accessToken) || []) } catch (error) { setResults([]); setSearchError(error.message) } finally { setSearching(false) } }
  const totalInterest = Number(loanForm.amount || 0) * Number(loanForm.interestRate || 0) / 100 * Number(loanForm.paymentPeriodMonths || 0)
  return <div className="space-y-5"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"><ArrowLeft size={17} />All groups</button>
    <section className="rounded-xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold">{group.name}</h3>{group.isCreator && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Creator</span>}</div><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{group.description || 'No description provided.'}</p></div>{group.viewerStatus === 'PENDING' ? <div className="flex gap-2"><button disabled={busy} onClick={() => run(() => respondGroupInvitation(group.id, group.viewerMembershipId, true, accessToken), 'Invitation accepted.')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white"><Check size={16} />Accept</button><button disabled={busy} onClick={() => run(() => respondGroupInvitation(group.id, group.viewerMembershipId, false, accessToken), 'Invitation rejected.')} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 font-semibold text-rose-700 dark:text-rose-300"><X size={16} />Reject</button></div> : !group.isCreator && <button disabled={busy} onClick={() => run(() => leaveGroup(group.id, accessToken), 'You left the group.')} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300"><LogOut size={16} />Leave group</button>}</div></section>
    {group.viewerStatus === 'ACCEPTED' && <><nav className="flex gap-1 overflow-x-auto rounded-lg border bg-white p-1 dark:border-slate-700 dark:bg-slate-900">{['loans','members','history'].map((item) => <button key={item} onClick={() => setTab(item)} className={`min-w-max rounded-md px-4 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-slate-950 text-white dark:bg-emerald-700' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{item === 'loans' ? 'Borrow & repay' : item}</button>)}</nav>
      {tab === 'loans' && <div className="grid gap-5 xl:grid-cols-2">{group.isCreator && <form onSubmit={(e) => { e.preventDefault(); run(() => borrowForGroup(group.id, { ...loanForm, amount: Number(loanForm.amount), paymentPeriodMonths: Number(loanForm.paymentPeriodMonths), interestRate: Number(loanForm.interestRate) }, accessToken), 'Group loan recorded.'); setLoanForm({ amount: '', paymentPeriodMonths: '12', interestRate: '1' }) }} className="space-y-4 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div><h4 className="font-bold">New group borrowing</h4><p className="text-sm text-slate-500 dark:text-slate-300">Set the amount and repayment period, just like a member loan.</p></div><label className="block text-sm font-semibold">Amount (KES)<input required type="number" min="1" value={loanForm.amount} onChange={(e) => setLoanForm((form) => ({ ...form, amount: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Payment period<select value={loanForm.paymentPeriodMonths} onChange={(e) => setLoanForm((form) => ({ ...form, paymentPeriodMonths: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5">{[3,6,12,18,24,36].map((m) => <option key={m} value={m}>{m} months</option>)}</select></label><label className="text-sm font-semibold">Monthly interest<input type="number" min="0" max="100" step="0.1" value={loanForm.interestRate} onChange={(e) => setLoanForm((form) => ({ ...form, interestRate: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5" /></label></div><div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><div className="flex justify-between"><span>Total interest</span><strong>{money(totalInterest)}</strong></div><div className="mt-1 flex justify-between"><span>Total due</span><strong>{money(Number(loanForm.amount || 0) + totalInterest)}</strong></div></div><button disabled={busy} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white">Submit group borrowing</button></form>}
        <section className="space-y-3 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h4 className="font-bold">Active loans</h4>{!activeLoans.length && <p className="text-sm text-slate-500 dark:text-slate-300">No outstanding group loans.</p>}{activeLoans.map((loan) => <div key={loan.id} className="rounded-lg border p-4 dark:border-slate-700"><div className="flex justify-between"><div><p className="font-bold">{money(loan.amount)}</p><p className="text-xs text-slate-500 dark:text-slate-400">{loan.paymentPeriodMonths} months · {loan.interestRate}% monthly</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${badge(loan.status)}`}>{loan.status}</span></div><div className="mt-3 flex justify-between text-sm"><span>Balance</span><strong>{money(loan.balance)}</strong></div><form onSubmit={(e) => { e.preventDefault(); run(() => repayGroupLoan(group.id, loan.id, Number(repayments[loan.id]), accessToken), 'Repayment recorded.'); setRepayments((values) => ({ ...values, [loan.id]: '' })) }} className="mt-3 flex gap-2"><input required type="number" min="1" max={loan.balance} value={repayments[loan.id] || ''} onChange={(e) => setRepayments((values) => ({ ...values, [loan.id]: e.target.value }))} className="min-w-0 flex-1 rounded-lg border px-3 py-2" placeholder="Repayment amount" /><button disabled={busy} className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white dark:bg-emerald-700">Repay</button></form></div>)}</section></div>}
      {tab === 'members' && <div className="grid gap-5 xl:grid-cols-2">{group.isCreator && <section className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h4 className="font-bold">Add an eligible member</h4><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">They will receive a request to accept or reject.</p><form onSubmit={search} className="mt-4 flex gap-2"><input required minLength={2} value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2.5" placeholder="Name or 29903-001" /><button className="rounded-lg border px-4"><Search size={17} /></button></form><div className="mt-3 space-y-2">{searching && <p className="text-sm">Searching…</p>}{results.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 dark:border-slate-700"><div><p className="font-semibold">{member.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{member.memberNumber}</p></div><button disabled={busy} onClick={() => run(() => inviteGroupMember(group.id, member.memberNumber, accessToken), 'Invitation sent.')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"><UserPlus size={15} />Invite</button></div>)}</div></section>}
        {searchError && <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{searchError}</p>}<section className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="flex justify-between"><h4 className="font-bold">Group members</h4><span className="text-sm text-slate-500">{acceptedMembers.length} active</span></div><div className="mt-3 divide-y dark:divide-slate-700">{group.members.filter((member) => ['ACCEPTED','PENDING'].includes(member.status)).map((member) => <div key={member.id} className="flex items-center justify-between gap-3 py-3"><div><div className="flex items-center gap-2"><p className="font-semibold">{member.name}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge(member.status)}`}>{member.status}</span></div><p className="text-xs text-slate-500 dark:text-slate-400">{member.memberNumber} · {member.role}</p></div>{group.isCreator && member.role !== 'CREATOR' && <button disabled={busy} onClick={() => run(() => removeGroupMember(group.id, member.id, accessToken), 'Member removed.')} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950" title="Remove member"><Trash2 size={17} /></button>}</div>)}</div></section></div>}
      {tab === 'history' && <section className="overflow-hidden rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-900"><div className="border-b p-5 dark:border-slate-700"><h4 className="font-bold">Group transaction and borrowing history</h4><p className="text-sm text-slate-500 dark:text-slate-300">Visible to every accepted group member.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800"><tr>{['Date','Type','Reference','Amount','Status'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody className="divide-y dark:divide-slate-700">{transactions.map((tx) => <tr key={tx.id}><td className="px-4 py-3">{date(tx.createdAt)}</td><td className="px-4 py-3">{tx.type.replaceAll('_',' ')}</td><td className="px-4 py-3 font-mono text-xs">{tx.reference}</td><td className="px-4 py-3 font-semibold">{money(tx.amount)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${badge(tx.status)}`}>{tx.status}</span></td></tr>)}{!transactions.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No group transactions yet.</td></tr>}</tbody></table></div></section>}</>}
  </div>
}
