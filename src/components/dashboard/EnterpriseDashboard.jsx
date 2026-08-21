import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} EAT`;
}

export function normalizeStatus(status) {
  return String(status || "Pending").replace(/_/g, " ");
}

export function statusClass(status) {
  const normalized = normalizeStatus(status).toLowerCase();
  if (["active", "approved", "completed", "verified", "paid", "success"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (["pending", "processing", "review", "under review", "queued"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }
  if (["rejected", "suspended", "failed", "overdue", "voided"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </motion.div>
  );
}

export function Surface({ children, className = "" }) {
  return (
    <section className={`premium-surface rounded-lg ${className}`}>
      {children}
    </section>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}>
      {normalizeStatus(status)}
    </span>
  );
}

export function EmptyState({ icon: Icon = FileText, title = "No records found", description = "Records will appear here when available." }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <Icon size={26} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="shimmer h-36 rounded-lg bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div key={item} className="shimmer h-32 rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="shimmer h-96 rounded-lg bg-slate-200" />
        <div className="shimmer h-96 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export function KpiCard({ icon: Icon, label, value, trend, helper, tone = "emerald", bars = [] }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.24 }}
    >
    <Surface className="group overflow-hidden p-5 transition duration-200 hover:shadow-[0_22px_50px_rgba(15,23,42,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${tones[tone] || tones.emerald}`}>
          <Icon size={21} />
        </div>
        {trend ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {String(trend).startsWith("-") ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            {trend}
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.22 }}
        className="mt-1 text-2xl font-semibold tracking-normal text-slate-950"
      >
        {value}
      </motion.p>
      <div className="mt-4 flex h-8 items-end gap-1.5">
        {(bars.length ? bars : [12, 24, 18, 34, 28, 42]).map((bar, index) => (
          <span
            key={`${label}-${index}`}
            className="w-full rounded-t bg-emerald-100"
            style={{ height: `${Math.max(Number(bar || 0), 8)}%` }}
          />
        ))}
      </div>
      {helper ? <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </Surface>
    </motion.div>
  );
}

function getCellExportValue(row, column) {
  if (typeof column.exportValue === "function") return column.exportValue(row[column.key], row);
  const value = row?.[column.key];
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function exportRowsToCsv({ columns = [], rows = [], filename = "records.csv" }) {
  const exportableColumns = columns.filter((column) => column.export !== false && !/^(action|actions|decision)$/i.test(column.label || ""));
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const headerColor = "#8cc63f";
  const textColor = "#14532d";
  const html = `<!doctype html><html><head><meta charset="utf-8" /><style>
    table{border-collapse:collapse;width:100%}td,th{border:1px solid #b7dca2;padding:8px;mso-number-format:"\\@"}
    th{background-color:${headerColor};color:${textColor};font-weight:700;text-transform:uppercase}
  </style></head><body><table><thead><tr>${exportableColumns.map((column) => `<th bgcolor="${headerColor}" style="background-color:${headerColor};color:${textColor};font-weight:700;text-transform:uppercase;">${escapeHtml(column.label || column.key)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${exportableColumns.map((column) => `<td>${escapeHtml(getCellExportValue(row, column))}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/\.(csv|xlsx)$/i, ".xls").endsWith(".xls") ? filename.replace(/\.(csv|xlsx)$/i, ".xls") : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function Toolbar({ search, onSearch, placeholder = "Search records...", actionLabel = "Export CSV", onExport, onFilter }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {onFilter ? (
          <button type="button" onClick={onFilter} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-100">
            <Filter size={16} />
            Filter
          </button>
        ) : null}
        <button type="button" onClick={onExport} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200">
          <Download size={16} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export function DataTable({ title, description, columns, data = [], emptyTitle, emptyDescription, search, onSearch, pageSize = 10, exportFilename, onFilter, onRowClick }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = useMemo(() => data.slice(startIndex, startIndex + pageSize), [data, startIndex, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [data, pageSize, search]);

  const handleExport = () => {
    exportRowsToCsv({
      columns,
      rows: data,
      filename: exportFilename || `${String(title || "records").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "records"}.csv`,
    });
  };

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">{title}</h2>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {typeof search === "string" && onSearch ? <Toolbar search={search} onSearch={onSearch} onExport={handleExport} onFilter={onFilter} /> : null}
      {data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-[880px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50">
                  {columns.map((column, index) => (
                    <th key={`${column.key}-${index}`} scope="col" className="min-w-36 whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row, index) => (
                  <tr
                    key={row.id || row._id || index}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`${index % 2 ? "bg-slate-50/60" : "bg-white"} transition hover:bg-emerald-50/40 ${onRowClick ? "cursor-pointer" : ""}`}
                  >
                    {columns.map((column, columnIndex) => (
                      <td
                        key={`${column.key}-${columnIndex}`}
                        onClick={column.stopRowClick ? (event) => event.stopPropagation() : undefined}
                        className="max-w-72 truncate px-4 py-3 text-sm text-slate-700"
                        title={String(row[column.key] ?? "")}
                      >
                        {column.render ? column.render(row[column.key], row) : (row[column.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {startIndex + 1}-{Math.min(startIndex + pageSize, data.length)} of {data.length} record{data.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">{currentPage} / {totalPages}</span>
              <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </Surface>
  );
}

export function ReportBreakdownDialog({ breakdown, onClose }) {
  const [memberSearch, setMemberSearch] = useState("");
  useEffect(() => {
    setMemberSearch("");
    if (!breakdown) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [breakdown, onClose]);
  if (!breakdown) return null;
  const rows = breakdown.rows || [];
  const total = Number(breakdown.total || 0);
  const query = memberSearch.trim().toLowerCase();
  const visibleRows = query ? rows.filter((row) => [row.memberNumber, row.memberName].some((value) => String(value || "").toLowerCase().includes(query))) : rows;
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <section role="dialog" aria-modal="true" aria-labelledby="report-breakdown-title" className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Reports and analytics</p><h1 id="report-breakdown-title" className="text-xl font-bold text-slate-950 sm:text-2xl dark:text-white">{breakdown.title}</h1></div>
            <button type="button" onClick={onClose} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 dark:bg-emerald-600 dark:hover:bg-emerald-700">Back to reports</button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reconciled total</p><p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(total)}</p><p className="mt-1 text-sm text-slate-500">Sum of all member entries below</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contributing members</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{rows.length}</p><p className="mt-1 text-sm text-slate-500">Members included in this report</p></div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"><div><h2 className="font-bold text-slate-950 dark:text-white">Member contribution details</h2><p className="text-sm text-slate-500">Every row contributes directly to the reconciled total.</p></div><label className="relative block w-full sm:w-80"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search member or number" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"/></label></div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-200"><tr><th className="whitespace-nowrap px-5 py-4">Member number</th><th className="px-5 py-4">Member</th><th className="whitespace-nowrap px-5 py-4 text-right">Amount</th><th className="whitespace-nowrap px-5 py-4 text-right">Share of total</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visibleRows.map((row, index) => <tr key={row.memberId || index} className={index % 2 ? "bg-slate-50/70 dark:bg-slate-800/30" : "dark:bg-slate-900"}><td className="whitespace-nowrap px-5 py-4 font-mono font-semibold text-slate-700 dark:text-slate-200">{row.memberNumber || "—"}</td><td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{row.memberName || "Unknown member"}</td><td className="whitespace-nowrap px-5 py-4 text-right font-bold text-slate-950 dark:text-white">{formatCurrency(row.amount)}</td><td className="whitespace-nowrap px-5 py-4 text-right text-slate-600 dark:text-slate-300">{total > 0 ? `${((Number(row.amount) / total) * 100).toFixed(1)}%` : "0.0%"}</td></tr>)}</tbody></table>
              {!visibleRows.length ? <p className="p-10 text-center text-slate-500">{rows.length ? "No members match your search." : "No member entries contribute to this total yet."}</p> : null}
            </div>
            <footer className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 text-sm font-bold text-slate-900 sm:flex-row sm:justify-between dark:border-slate-800 dark:text-white"><span>Showing {visibleRows.length} of {rows.length} member{rows.length === 1 ? "" : "s"}</span><span>Reconciled total: {formatCurrency(total)}</span></footer>
          </div>
        </main>
      </section>
    </div>
  );
}

export function ConfirmActionDialog({ action, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  if (!action) return null;

  const requiresReason = Boolean(action.requiresReason);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-action-title" className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
        <h2 id="confirm-action-title" className="text-base font-semibold text-slate-950">{action.title || "Confirm action"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{action.description || "Please confirm before this action is applied."}</p>
        {requiresReason ? (
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="Enter the reason for this decision"
            />
          </label>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100">Cancel</button>
          <button
            type="button"
            disabled={requiresReason && !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPanel({ title, description, data = [], type = "area", dataKey = "value", color = "#047857" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26 }}>
    <Surface className="p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">{title}</h2>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
        <BarChart3 className="text-slate-400" size={21} />
      </div>
      {data.length === 0 ? (
        <EmptyState icon={BarChart3} title="No chart data" description="Analytics will render when matching records are available." />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip />
                <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Surface>
    </motion.div>
  );
}

export function DashboardHero({ eyebrow, title, description, metrics = [], action }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="finance-gradient overflow-hidden rounded-lg p-6 text-white shadow-[0_24px_70px_rgba(6,63,42,0.22)]"
    >
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-normal text-white sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50/86">{description}</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-white/14 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs font-medium text-emerald-100">{metric.label}</p>
              <p className="mt-1 text-lg font-bold text-white">{metric.value}</p>
            </div>
          ))}
          {action}
        </div>
      </div>
    </motion.section>
  );
}

export function RoutePlaceholder({ eyebrow, title, description, capabilities = [] }) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <Surface className="p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
            <AlertCircle size={22} />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-normal text-slate-950">Backend-ready workspace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This route is structured for API integration and can be wired to the matching service endpoint when the backend contract is available.
            </p>
            {capabilities.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {capabilities.map((item) => (
                  <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Surface>
    </div>
  );
}

export function getMonthlySeries(records = [], amountSelector = (item) => item.amount) {
  const buckets = new Map();
  records.forEach((record) => {
    const rawDate = record.createdAt || record.date || record.declaredAt || record.purchaseDate || record.approvedAt || record.submittedAt;
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) || 0) + Number(amountSelector(record) || 0));
  });
  return Array.from(buckets.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => {
      const [year, month] = key.split("-").map(Number);
      const date = new Date(year, month - 1, 1);
      return {
        label: date.toLocaleString("default", { month: "short", year: "2-digit" }),
        value,
      };
    });
}
