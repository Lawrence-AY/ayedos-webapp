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
  return `KSh ${Math.round(Number(value || 0)).toLocaleString()}`;
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
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

export function KpiCard({ icon: Icon, label, value, trend = "Live", helper, tone = "emerald", bars = [] }) {
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
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {String(trend).startsWith("-") ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
          {trend}
        </span>
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
        {(bars.length ? bars : [0, 0, 0, 0, 0, 0]).map((bar, index) => (
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

export function Toolbar({ search, onSearch, placeholder = "Search records...", actionLabel = "Export" }) {
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
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Filter size={16} />
          Filter
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          <Download size={16} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export function DataTable({ title, description, columns, data = [], emptyTitle, emptyDescription, search, onSearch }) {
  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">{title}</h2>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {typeof search === "string" && onSearch ? <Toolbar search={search} onSearch={onSearch} /> : null}
      {data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[880px]">
              <thead>
                <tr className="bg-slate-50">
                  {columns.map((column) => (
                    <th key={column.key} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, index) => (
                  <tr key={row.id || row._id || index} className="bg-white transition hover:bg-emerald-50/40">
                    {columns.map((column) => (
                      <td key={column.key} className="px-5 py-4 text-sm text-slate-700">
                        {column.render ? column.render(row[column.key], row) : (row[column.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>Showing {data.length} record{data.length === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500">
                <ChevronLeft size={16} />
              </button>
              <span className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">1</span>
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </Surface>
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
    const label = date.toLocaleString("default", { month: "short" });
    buckets.set(label, (buckets.get(label) || 0) + Number(amountSelector(record) || 0));
  });
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}
