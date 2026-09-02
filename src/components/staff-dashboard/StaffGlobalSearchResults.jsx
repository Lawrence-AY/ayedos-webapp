import { useEffect, useMemo, useState } from "react";
import { FileText, Landmark, ReceiptText, Search, UserRound, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { searchDashboard } from "../../features/member/memberService.js";
import { getDashboardPath } from "../../utils/dashboardRoutes.js";
import { formatCurrency } from "../dashboard/EnterpriseDashboard.jsx";

const GROUPS = [
  { key: "members", title: "Members", icon: UserRound, section: "members" },
  { key: "applications", title: "Applications", icon: FileText, section: "members" },
  { key: "transactions", title: "Transactions", icon: ReceiptText, section: "transactions" },
  { key: "loans", title: "Loans", icon: Landmark, section: "loans" },
  { key: "savingsAccounts", title: "Savings Accounts", icon: WalletCards, section: "members" },
  { key: "shareAccounts", title: "Share Accounts", icon: WalletCards, section: "members" },
  { key: "dividends", title: "Dividends", icon: WalletCards, section: "dividends" },
  { key: "salaryDeductions", title: "Salary Deductions", icon: ReceiptText, section: "deductions" },
];

function memberName(item) {
  return item?.user?.name || item?.name || [item?.firstName, item?.lastName].filter(Boolean).join(" ") || "Unnamed member";
}

function describe(key, item) {
  if (key === "members") return `${memberName(item)} · ${item.memberNumber || "No member number"} · ${item.user?.email || item.user?.phone || "No contact"}`;
  if (key === "applications") return `${item.name || "Applicant"} · ${item.nationalId || item.email || item.phone || "No identifier"} · ${item.status || "Pending"}`;
  if (key === "transactions") return `${item.memberNumber || "Member"} · ${item.reference || item.type || "Transaction"} · ${formatCurrency(item.amount || 0)} · ${item.status || ""}`;
  if (key === "loans") return `${item.memberNumber || "Member"} · ${item.type || "Loan"} · ${formatCurrency(item.amount || 0)} · ${item.status || ""}`;
  return `${item.memberNumber || "Member"} · ${formatCurrency(item.balance ?? item.amount ?? item.contribution ?? (Number(item.shares || 0) * Number(item.shareValue || 0)))}${item.year ? ` · ${item.year}` : ""}`;
}

export default function StaffGlobalSearchResults({ query, accessToken, role }) {
  const normalizedQuery = query.trim();
  const [state, setState] = useState({ loading: false, error: "", results: {} });

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setState({ loading: false, error: "", results: {} });
      return undefined;
    }
    let active = true;
    async function runSearch() {
      setState((current) => ({ ...current, loading: true, error: "" }));
      try {
        const response = await searchDashboard(normalizedQuery, accessToken, { limit: 12 });
        if (active) setState({ loading: false, error: "", results: response.results || {} });
      } catch (error) {
        if (active) setState({ loading: false, error: error?.message || "Search failed. Please try again.", results: {} });
      }
    }
    runSearch();
    return () => {
      active = false;
    };
  }, [accessToken, normalizedQuery]);

  const groups = useMemo(() => GROUPS.map((group) => ({ ...group, items: state.results[group.key] || [] })), [state.results]);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-lime-50 text-[#6f9f32] dark:bg-lime-950"><Search size={21} /></div>
          <div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Dashboard search</p><h1 className="text-xl font-bold text-slate-950 dark:text-white">Results for “{normalizedQuery}”</h1></div>
        </div>
        <p className="mt-3 text-sm text-slate-500">{normalizedQuery.length < 2 ? "Enter at least two characters to search." : state.loading ? "Searching live SACCO records…" : state.error || `${total} matching record${total === 1 ? "" : "s"} found.`}</p>
      </div>
      {normalizedQuery.length >= 2 && !state.loading && !state.error && total === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No records match this search. Try a member name, member number, phone, email, national ID, transaction reference, loan type, or status.</div> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.filter((group) => group.items.length).map((group) => (
          <section key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800"><group.icon size={19} className="text-[#8cc63f]" /><div><h2 className="font-semibold text-slate-950 dark:text-white">{group.title}</h2><p className="text-xs text-slate-500">{group.items.length} match{group.items.length === 1 ? "" : "es"}</p></div></div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{group.items.map((item, index) => <Link key={item.id || `${group.key}-${index}`} to={getDashboardPath(role, group.section)} className="block px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">{describe(group.key, item)}</Link>)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
