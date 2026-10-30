import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { commitFinancialCsvImport } from "../../features/finance/financeService.js";
import { rowsToCsv } from "../../utils/spreadsheetImport.js";

const SHEETS = ["Bio Data", "Share Capital", "Savings", "Employer's Contribution", "Member Total", "Loan Account", "Sacco Account", "SAO (Money Movement In/Out)"];
const HEADER_FILL = "D9EAD3";
const normalizeSheet = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const SHEET_ALIASES = { "employercontribution": "Employer's Contribution", "employercontributions": "Employer's Contribution", "sao": "SAO (Money Movement In/Out)", "moneyinout": "SAO (Money Movement In/Out)", "saomovement": "SAO (Money Movement In/Out)" };
const standardSheetName = (name) => {
  const normalized = normalizeSheet(name);
  if (normalized.includes("sao") || normalized.includes("moneymovement") || normalized.includes("moneyinout")) return "SAO (Money Movement In/Out)";
  if (normalized.includes("employer") && normalized.includes("contribution")) return "Employer's Contribution";
  return SHEETS.find((sheet) => normalizeSheet(sheet) === normalized) || SHEET_ALIASES[normalized] || name;
};
const HEADER_HINTS = ["membernumber", "memberno", "memberid", "saccomemberno", "registrationnumber", "email", "staffid", "name", "amountpaid", "loanrepayment", "savings", "sharecapital", "employercontribution", "employercontrib", "interest", "balance", "paymentdate", "monthofpayment", "moneyin", "moneyout", "amount", "date", "description", "narration", "particulars", "transactiontype", "reference"];
const matrixToRecords = (matrix) => {
  const rows = matrix.filter((row) => row.some((cell) => String(cell ?? "").trim()));
  if (!rows.length) return [];
  const score = (row) => row.reduce((total, cell) => total + (HEADER_HINTS.includes(normalizeSheet(cell)) ? 1 : 0), 0);
  const headerIndex = rows.reduce((best, row, index) => {
    const currentScore = score(row);
    return currentScore > best.score ? { index, score: currentScore } : best;
  }, { index: 0, score: 0 }).index;
  const headers = rows[headerIndex].map((cell, index) => String(cell || `Column ${index + 1}`).trim() || `Column ${index + 1}`);
  return rows.slice(headerIndex + 1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))).filter((row) => Object.values(row).some((value) => String(value).trim()));
};
const moneyKeys = ["amount", "balance", "total", "value", "contribution", "savings", "share capital", "loan balance", "remaining balance"];
const sheetTotal = (rows = []) => rows.reduce((sum, row) => sum + Object.entries(row).reduce((rowSum, [key, value]) => {
  const normalized = normalizeSheet(key);
  if (!moneyKeys.some((hint) => normalized.includes(normalizeSheet(hint)))) return rowSum;
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? rowSum + number : rowSum;
}, 0), 0);

const parseWorkbook = async (file) => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheets = Object.fromEntries(workbook.SheetNames.map((name) => [standardSheetName(name), matrixToRecords(XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: false }))]));
  // Some Sacco workbooks keep the eight standard sheets in fixed order but
  // use an abbreviated or blank SAO tab name. Preserve that data as SAO.
  const saoSource = workbook.SheetNames[7];
  if (!(sheets["SAO (Money Movement In/Out)"] || []).length && saoSource) {
    sheets["SAO (Money Movement In/Out)"] = matrixToRecords(XLSX.utils.sheet_to_json(workbook.Sheets[saoSource], { header: 1, defval: "", raw: false }));
  }
  return sheets;
};

const downloadWorkbook = (sheets, fileName) => {
  const workbook = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([name, rows]) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
      if (cell) cell.s = { fill: { fgColor: { rgb: HEADER_FILL } }, font: { bold: true } };
    }
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  });
  XLSX.writeFile(workbook, fileName);
};

export default function FinancialRecordsPage({ data, accessToken, onRefresh }) {
  const [session, setSession] = useState(null);
  const [activeSheet, setActiveSheet] = useState(SHEETS[0]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [history, setHistory] = useState([]);
  const rows = session?.sheets?.[activeSheet] || [];
  const pageSize = 25;
  const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const cardRows = session?.sheets || {};
  const cardDescriptions = {
    "Bio Data": "Member identity and profile records",
    "Share Capital": "Member share ownership and contributions",
    Savings: "Member savings and deposits",
    "Employer's Contribution": "Employer contribution records",
    "Member Total": "Consolidated member balances",
    "Loan Account": "Loan balances and repayment history",
    "Sacco Account": "SACCO account ledger activity",
    "SAO (Money Movement In/Out)": "Money movement in and out",
  };
  const cardIcons = ["👤", "📈", "💰", "🏢", "🧾", "🏦", "📒", "↔️"];
  const totalRows = useMemo(() => Object.values(session?.sheets || {}).reduce((sum, items) => sum + items.length, 0), [session]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error("Upload an .xlsx or .xls workbook");
    try {
      setBusy(true);
      const sheets = await parseWorkbook(file);
      setSession({ file, fileName: file.name, sheets, createdAt: new Date().toISOString() });
      setActiveSheet(SHEETS.find((name) => sheets[name]) || Object.keys(sheets)[0] || SHEETS[0]);
      setPage(0);
      toast.success("Workbook staged successfully. Review the tabs before importing.");
    } catch (error) { toast.error(error.message || "Unable to read workbook"); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!session) return;
    try {
      setBusy(true);
      const allRows = Object.entries(session.sheets).flatMap(([sheet, items]) => items.map((row) => ({ Sheet: sheet, ...row })));
      const result = await commitFinancialCsvImport(rowsToCsv(allRows), accessToken);
      setHistory((items) => [{ id: crypto.randomUUID(), fileName: session.fileName, uploadedBy: "Current user", createdAt: new Date().toISOString(), total: allRows.length, status: "Success", result }, ...items]);
      toast.success(`Imported ${result?.imported?.length || allRows.length} financial records`);
      onRefresh?.();
    } catch (error) {
      setHistory((items) => [{ id: crypto.randomUUID(), fileName: session.fileName, uploadedBy: "Current user", createdAt: new Date().toISOString(), total: totalRows, status: "Failed" }, ...items]);
      toast.error(error.message || "Financial import failed");
    } finally { setBusy(false); }
  }

  function exportMaster() {
    const sheets = {
      "Bio Data": data.members || [],
      "Share Capital": data.shares || [],
      Savings: (data.transactions || []).filter((row) => String(row.paymentCategory || "").toLowerCase().includes("saving")),
      "Employer's Contribution": (data.transactions || []).filter((row) => String(row.paymentCategory || "").toLowerCase().includes("employer")),
      "Member Total": data.members || [],
      "Loan Account": data.loans || [],
      "Sacco Account": data.transactions || [],
      "SAO (Money Movement In/Out)": data.transactions || [],
    };
    downloadWorkbook(sheets, `master-financial-record-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Finance Portal</p><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Financial Records</h1><p className="mt-1 text-sm text-slate-500">Stage, review, import, and export the master financial workbook.</p></div><button type="button" onClick={exportMaster} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Download size={16}/>Export Master Financial Record</button></div>
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-slate-900"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm dark:bg-slate-800"><FileSpreadsheet className="text-emerald-700" size={24}/></span><div><h2 className="font-bold">Workbook Upload & Preview</h2><p className="text-sm text-slate-500">Upload, review the 8 sheets, then confirm the import.</p></div></div><div className="flex flex-wrap items-center gap-2">{session ? <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300">{session.fileName} · {totalRows} parsed records</span> : null}<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><Upload size={16}/>{session ? "Replace workbook" : busy ? "Processing..." : "Choose workbook"}<input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile}/></label>{session ? <button type="button" onClick={() => { setSession(null); setPage(0); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Clear</button> : null}</div></div>
    </section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{SHEETS.map((name, index) => { const items = cardRows[name] || []; const total = sheetTotal(items); const hasTotal = items.some((row) => Object.keys(row).some((key) => moneyKeys.some((hint) => normalizeSheet(key).includes(normalizeSheet(hint))))); return <button type="button" key={name} onClick={() => { setActiveSheet(name); setPage(0); document.getElementById("financial-records-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${activeSheet === name ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-100 dark:bg-emerald-950/30" : "bg-white"}`}><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald-950/50">{cardIcons[index]}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{items.length} rows</span></div><h3 className="mt-4 font-bold text-slate-900 dark:text-white">{name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{cardDescriptions[name]}</p>{hasTotal ? <p className="mt-3 text-lg font-bold text-emerald-700">KES {total.toLocaleString("en-KE", { maximumFractionDigits: 2 })}</p> : <p className="mt-3 text-xs font-semibold text-slate-400">Ready for workbook data</p>}</button>; })}</section>
    {session && <section id="financial-records-viewer" className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Tabbed Workbook Viewer</h2><p className="text-xs text-slate-500">{session.fileName} · {totalRows} parsed records</p></div><button type="button" disabled={busy} onClick={commit} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm Import</button></div><div className="mt-4 flex gap-2 overflow-x-auto border-b pb-2">{SHEETS.map((name) => <button type="button" key={name} onClick={() => { setActiveSheet(name); setPage(0); }} className={`whitespace-nowrap rounded-t px-3 py-2 text-sm font-semibold ${activeSheet === name ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500"}`}>{name}</button>)}</div><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="bg-[#D9EAD3]">{Object.keys(rows[0] || { "No data": "" }).map((key) => <th key={key} className="px-3 py-2 font-bold">{key}</th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={index} className="border-b last:border-0">{Object.keys(rows[0] || { "No data": "" }).map((key) => <td key={key} className="px-3 py-2">{String(row[key] ?? "")}</td>)}</tr>)}</tbody></table></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Showing {rows.length ? page * pageSize + 1 : 0}-{Math.min((page + 1) * pageSize, rows.length)} of {rows.length}</span><div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><button type="button" disabled={(page + 1) * pageSize >= rows.length} onClick={() => setPage((value) => value + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div></section>}
    <section className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-bold">Import History Log</h2><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="px-3 py-2">Import ID</th><th className="px-3 py-2">File Name</th><th className="px-3 py-2">Uploaded By</th><th className="px-3 py-2">Date/Time</th><th className="px-3 py-2">Records</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-b"><td className="px-3 py-2 font-mono text-xs">{item.id.slice(0, 8)}</td><td className="px-3 py-2">{item.fileName}</td><td className="px-3 py-2">{item.uploadedBy}</td><td className="px-3 py-2">{new Date(item.createdAt).toLocaleString("en-KE")}</td><td className="px-3 py-2">{item.total}</td><td className="px-3 py-2">{item.status}</td></tr>)}{!history.length && <tr><td colSpan="6" className="px-3 py-8 text-center text-slate-500">No workbook imports in this session.</td></tr>}</tbody></table></div></section>
  </div>;
}
