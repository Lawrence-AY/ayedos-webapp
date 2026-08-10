import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import { formatDate } from "../dashboard/EnterpriseDashboard.jsx";

export default function SentNotificationsPanel({ accessToken }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const res = await apiRequest("/api/notifications/sent?limit=100", { accessToken });
    if (!res.ok) throw new Error(res.json?.message || "Unable to load sent notifications");
    setItems(res.json?.data || []); setLoading(false);
  }, [accessToken]);
  useEffect(() => { load().catch((err) => { setError(err.message); setLoading(false); }); }, [load]);
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-950 dark:text-white">Sent notifications</h2><p className="text-sm text-slate-500">Messages you sent, their audience, delivery count, and read progress.</p></div><button type="button" onClick={() => load().catch((err) => setError(err.message))} className="rounded-lg border p-2.5 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Refresh sent notifications"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/></button></div>
    {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {!loading && !items.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"><Send className="mx-auto text-slate-400"/><h3 className="mt-3 font-semibold text-slate-900 dark:text-white">No sent notifications yet</h3><p className="mt-1 text-sm text-slate-500">Messages sent from this account will appear here.</p></div> : null}
    <div className="grid gap-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-950 dark:text-white">{item.title}</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{String(item.audience || "Member").replaceAll("_", " ")}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p></div><time className="shrink-0 text-xs text-slate-500">{formatDate(item.sentAt)}</time></div><div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300"><span>Delivered: {item.recipientCount}</span><span>Read: {item.readCount}</span><span>Unread: {Math.max(Number(item.recipientCount) - Number(item.readCount), 0)}</span><span>Category: {item.category}</span></div></article>)}</div>
  </div>;
}
