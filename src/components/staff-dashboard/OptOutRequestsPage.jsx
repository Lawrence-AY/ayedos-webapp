import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, WalletCards, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../../lib/apiClient";

const eat = (value) => value ? new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
}).format(new Date(value)).replace(",", "") + " EAT" : "—";

export default function OptOutRequestsPage({ role, accessToken, embedded = false }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [busy, setBusy] = useState(null);
  const finance = String(role).toUpperCase() === "FINANCE";
  const load = useCallback(async () => {
    const res = await apiRequest(`/api/opt-out-requests?page=${page}&limit=10`, { accessToken });
    if (!res.ok) throw new Error(res.json?.message || "Unable to load opt-out requests");
    setRows(res.json?.data || []); setPagination(res.json?.meta?.pagination || { totalPages: 1, total: 0 }); setLoading(false);
  }, [accessToken, page]);
  useEffect(() => { load().catch((e) => toast.error(e.message)); const id = setInterval(() => load().catch(() => {}), 10000); return () => clearInterval(id); }, [load]);

  async function review(id, approve) {
    const reason = approve ? undefined : window.prompt("Rejection reason"); if (!approve && !reason) return;
    setBusy(id); try {
      const res = await apiRequest(`/api/opt-out-requests/${id}/review`, { method: "PATCH", accessToken, body: { approve, reason } });
      if (!res.ok) throw new Error(res.json?.message || "Review failed"); toast.success(res.json.message); await load();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  }
  async function disburse(id) {
    if (!window.confirm("Disburse the member's full active savings balance?")) return;
    setBusy(id); try {
      const res = await apiRequest(`/api/opt-out-requests/${id}/disburse`, { method: "POST", accessToken });
      if (!res.ok) throw new Error(res.json?.message || "Disbursement failed"); toast.success(res.json.message); await load();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  }
  return <section className="space-y-5">
    <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Membership exits</p><h2 className={`${embedded ? "text-lg" : "text-2xl"} font-bold text-slate-950 dark:text-white`}>Opt-out approvals & disbursement</h2><p className="text-sm text-slate-600 dark:text-slate-300">Admin and Finance decisions synchronize automatically every 10 seconds.</p></div><button onClick={load} className="rounded-lg border p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Refresh"><RefreshCw size={18}/></button></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <table className="min-w-[1100px] w-full text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-200"><tr>{["Requested", "Member", "Member no.", "Admin approved", "Finance approved", "Status", "Actions"].map(x => <th key={x} className="whitespace-nowrap px-4 py-3">{x}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((r, i) => <tr key={r.id} className={i % 2 ? "bg-slate-50/70 dark:bg-slate-800/30" : "dark:bg-slate-900"}><td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">{r.requestedAtEAT || eat(r.requestedAt)}</td><td className="max-w-52 truncate px-4 py-3 font-medium text-slate-900 dark:text-white" title={r.memberName}>{r.memberName || "—"}</td><td className="whitespace-nowrap px-4 py-3 dark:text-slate-200">{r.memberNumber}</td><td className="whitespace-nowrap px-4 py-3">{r.adminApproval ? "Yes" : "No"}</td><td className="whitespace-nowrap px-4 py-3">{r.financeApproval ? "Yes" : "No"}</td><td className="whitespace-nowrap px-4 py-3 font-semibold">{r.status}</td><td className="whitespace-nowrap px-4 py-3"><div className="flex gap-2">{r.status === "PENDING" && !(finance ? r.financeApproval : r.adminApproval) ? <><button disabled={busy === r.id} onClick={() => review(r.id, true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={15}/>Approve</button><button disabled={busy === r.id} onClick={() => review(r.id, false)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><XCircle size={15}/>Reject</button></> : null}{finance && r.canDisburse ? <button disabled={busy === r.id} onClick={() => disburse(r.id)} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"><WalletCards size={15}/>Disburse savings</button> : null}</div></td></tr>)}</tbody></table>
      {!loading && !rows.length ? <p className="p-8 text-center text-slate-500">No opt-out requests found.</p> : null}
    </div>
    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300"><span>{pagination.total || 0} requests</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><span className="px-2 py-2">{page} / {pagination.totalPages || 1}</span><button disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div></div>
  </section>;
}
