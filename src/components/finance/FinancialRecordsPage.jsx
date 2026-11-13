import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { applySaccoLedgerImport, commitSaccoLedger, getSaccoLedgerImport, getSaccoLedgerImports } from "../../features/finance/financeService.js";

const SHEETS = ["Bio Data", "Share Capital", "Savings", "Employer's Contribution", "Member Total", "Loan Account", "Sacco Account", "SAO (Money Movement In/Out)"];
const HEADER_FILL = "D9EAD3";
const normalizeSheet = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const SHEET_ALIASES = { "employercontribution": "Employer's Contribution", "employercontributions": "Employer's Contribution", "sao": "SAO (Money Movement In/Out)", "moneyinout": "SAO (Money Movement In/Out)", "saomovement": "SAO (Money Movement In/Out)" };
const standardSheetName = (name) => {
  const normalized = normalizeSheet(name);
  if (normalized === "soa" || normalized === "sao" || normalized.includes("moneymovement") || normalized.includes("moneyinout")) return "SAO (Money Movement In/Out)";
  if (normalized.includes("employer") && normalized.includes("contribution")) return "Employer's Contribution";
  return SHEETS.find((sheet) => normalizeSheet(sheet) === normalized) || SHEET_ALIASES[normalized] || name;
};
const HEADER_HINTS = ["membernumber", "memberno", "memberid", "saccomemberno", "registrationnumber", "email", "staffid", "name", "beneficiary", "payer", "loanstatus", "loanamount", "loanrepayment", "repayperiodmonths", "interestmonth", "loanfee", "pmt", "items", "period", "amountpaid", "savings", "sharecapital", "employercontribution", "employercontrib", "interest", "balance", "paymentdate", "monthofpayment", "moneyin", "moneyout", "amount", "date", "description", "narration", "particulars", "transactiontype", "reference"];
const matrixToRecords = (matrix, sheetName = "") => {
  const rows = matrix.filter((row) => row.some((cell) => String(cell ?? "").trim()));
  if (!rows.length) return { records: [], summary: {} };
  const score = (row) => row.reduce((total, cell) => total + (HEADER_HINTS.includes(normalizeSheet(cell)) ? 1 : 0), 0);
  const headerIndex = rows.reduce((best, row, index) => {
    const currentScore = score(row);
    return currentScore > best.score ? { index, score: currentScore } : best;
  }, { index: 0, score: 0 }).index;
  const headers = rows[headerIndex].map((cell, index) => String(cell || `Column ${index + 1}`).trim() || `Column ${index + 1}`);
  const summary = {};
  const summaryRow = rows[0] || [];
  headers.forEach((header, index) => {
    const value = summaryRow[index];
    if (value !== "" && value !== null && value !== undefined && Number.isFinite(Number(String(value).replace(/,/g, "")))) {
      summary[header] = Number(String(value).replace(/,/g, ""));
    }
  });
  const normalizedHeaders = headers.map(normalizeSheet);
  if (normalizeSheet(sheetName).includes("loanaccount")) {
    const outstanding = Number(String(summaryRow[0] || "").replace(/,/g, ""));
    if (Number.isFinite(outstanding)) summary["Outstanding Loan Balance"] = outstanding;
  }
  const balanceLabelIndex = summaryRow.findIndex((value) => normalizeSheet(value) === "balance");
  if (normalizedHeaders.includes("moneyin")) summary["Money IN"] = Number(String(summaryRow[normalizedHeaders.indexOf("moneyin")] || 0).replace(/,/g, ""));
  if (normalizedHeaders.includes("moneyout")) summary["Money OUT"] = Number(String(summaryRow[normalizedHeaders.indexOf("moneyout")] || 0).replace(/,/g, ""));
  if (balanceLabelIndex >= 0) summary["Current Balance"] = Number(String(summaryRow[balanceLabelIndex + 1] || 0).replace(/,/g, ""));
  return {
    records: rows.slice(headerIndex + 1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))).filter((row) => Object.values(row).some((value) => String(value).trim())),
    summary,
  };
};
const moneyKeys = ["amount", "balance", "total", "value", "contribution", "savings", "share capital", "loan balance", "remaining balance", "money in", "money out"];
const sheetTotal = (rows = []) => rows.reduce((sum, row) => sum + Object.entries(row).reduce((rowSum, [key, value]) => {
  const normalized = normalizeSheet(key);
  if (!moneyKeys.some((hint) => normalized.includes(normalizeSheet(hint)))) return rowSum;
  const cleaned = String(value ?? "").trim().replace(/,/g, "").replace(/[()]/g, (match) => (match === "(" ? "-" : ""));
  const number = Number(cleaned);
  return Number.isFinite(number) ? rowSum + number : rowSum;
}, 0), 0);
const summaryValue = (summary = {}, aliases = []) => {
  const aliasesNormalized = aliases.map(normalizeSheet);
  const entry = Object.entries(summary).find(([key]) => aliasesNormalized.includes(normalizeSheet(key)));
  if (!entry) return null;
  const value = Number(String(entry[1] ?? "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
};
const parseMoney = (value) => {
  const cleaned = String(value ?? "").trim().replace(/,/g, "").replace(/[()]/g, (match) => (match === "(" ? "-" : ""));
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const sumColumn = (rows = [], aliases = []) => rows.reduce((sum, row) => {
  const aliasSet = aliases.map(normalizeSheet);
  const value = Object.entries(row).find(([key]) => aliasSet.includes(normalizeSheet(key)))?.[1];
  return sum + (parseMoney(value) ?? 0);
}, 0);
const lastNonZeroColumn = (rows = [], aliases = []) => {
  const aliasSet = aliases.map(normalizeSheet);
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = Object.entries(rows[index]).find(([key]) => aliasSet.includes(normalizeSheet(key)))?.[1];
    const parsed = parseMoney(value);
    if (parsed !== null && parsed !== 0) return parsed;
  }
  return null;
};

const parseWorkbook = async (file) => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheets = {};
  const summaries = {};
  workbook.SheetNames.forEach((name) => {
    const standardName = standardSheetName(name);
    const parsed = matrixToRecords(XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: false }), standardName);
    sheets[standardName] = parsed.records;
    summaries[standardName] = parsed.summary;
  });
  // Some Sacco workbooks keep the eight standard sheets in fixed order but
  // use an abbreviated or blank SAO tab name. Preserve that data as SAO.
  const saoSource = workbook.SheetNames[7];
  if (!(sheets["SAO (Money Movement In/Out)"] || []).length && saoSource) {
    const saoRows = matrixToRecords(XLSX.utils.sheet_to_json(workbook.Sheets[saoSource], { header: 1, defval: "", raw: false }), "SAO (Money Movement In/Out)");
    sheets["SAO (Money Movement In/Out)"] = saoRows.records;
    summaries["SAO (Money Movement In/Out)"] = saoRows.summary;
  }
  return { sheets, summaries };
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

export default function FinancialRecordsPage({ data, accessToken, user, onRefresh }) {
  const [session, setSession] = useState(null);
  const [activeSheet, setActiveSheet] = useState(SHEETS[0]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [history, setHistory] = useState([]);
  const [savedImports, setSavedImports] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState("");
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

  const openSavedImport = useCallback(async (importId) => {
    if (!importId) return;
    setSavedLoading(true);
    setSavedError("");
    try {
      const saved = await getSaccoLedgerImport(importId, accessToken);
      const sheets = {};
      (saved?.records || []).forEach((record) => {
        const sheetName = record.sheet || "Other";
        if (!sheets[sheetName]) sheets[sheetName] = [];
        sheets[sheetName].push(record.data || {});
      });
      setSession({
        fileName: saved?.import?.sourceFile || "Saved workbook import",
        sheets,
        summaries: saved?.import?.summaries || {},
        saved: true,
        importId: saved?.import?.importId || importId,
        createdAt: saved?.import?.createdAt || null,
      });
      setActiveSheet(SHEETS.find((name) => sheets[name]?.length) || Object.keys(sheets)[0] || SHEETS[0]);
      setPage(0);
    } catch (error) {
      setSavedError(error.message || "Unable to load saved workbook records");
    } finally {
      setSavedLoading(false);
    }
  }, [accessToken]);

  async function applyArchivedImport(importId) {
    if (!importId) return;
    try {
      setBusy(true);
      const result = await applySaccoLedgerImport(importId, accessToken);
      const accountImport = result?.accountImport || {};
      const unmatched = accountImport.unmatchedMembers || 0;
      const summary = `Applied balances for ${accountImport.matchedMembers || 0} members, ${accountImport.importedTransactions || 0} transactions, and ${accountImport.importedLoans || 0} loans.`;
      if (unmatched) toast.warning(`${summary} ${unmatched} workbook members still need identity matching.`);
      else toast.success(summary);
      const imports = await getSaccoLedgerImports(accessToken);
      setSavedImports(Array.isArray(imports) ? imports : []);
      await openSavedImport(importId);
      onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Could not apply this archived workbook");
      const imports = await getSaccoLedgerImports(accessToken).catch(() => null);
      if (Array.isArray(imports)) setSavedImports(imports);
    } finally {
      setBusy(false);
    }
  }

  const uploaderName = (item) => {
    const listedUser = [...(data?.users || []), ...(data?.members || [])].find((row) => row.id === item.importedBy || row.userId === item.importedBy);
    const listedName = listedUser?.name || [listedUser?.firstName, listedUser?.lastName].filter(Boolean).join(" ");
    const currentName = item.importedBy === user?.id
      ? user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
      : null;
    return item.importedByName || listedName || currentName || item.importedBy || "—";
  };

  useEffect(() => {
    let cancelled = false;
    async function loadImports() {
      setSavedLoading(true);
      try {
        const imports = await getSaccoLedgerImports(accessToken);
        if (cancelled) return;
        setSavedImports(Array.isArray(imports) ? imports : []);
        if (imports?.length) await openSavedImport(imports[0].importId);
        else setSession(null);
      } catch (error) {
        if (!cancelled) setSavedError(error.message || "Unable to load saved workbook imports");
      } finally {
        if (!cancelled) setSavedLoading(false);
      }
    }
    loadImports();
    return () => { cancelled = true; };
  }, [accessToken, openSavedImport]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error("Upload an .xlsx or .xls workbook");
    try {
      setBusy(true);
      const parsed = await parseWorkbook(file);
      setSession({ file, fileName: file.name, sheets: parsed.sheets, summaries: parsed.summaries, saved: false, createdAt: new Date().toISOString() });
      setActiveSheet(SHEETS.find((name) => parsed.sheets[name]) || Object.keys(parsed.sheets)[0] || SHEETS[0]);
      setPage(0);
      toast.success("Workbook staged successfully. Review the tabs before importing.");
    } catch (error) { toast.error(error.message || "Unable to read workbook"); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!session) return;
    try {
      setBusy(true);
      const allRows = Object.entries(session.sheets).flatMap(([sheet, items]) => items.map((row, index) => ({ sheet, rowNumber: index + 1, row })));
      const result = await commitSaccoLedger(allRows, session.fileName, accessToken, session.summaries || {});
      setHistory((items) => [{ id: result?.importId || crypto.randomUUID(), fileName: session.fileName, uploadedBy: "Current user", createdAt: new Date().toISOString(), total: result?.recordCount || allRows.length, status: "Success", result }, ...items]);
      const accountImport = result?.accountImport;
      const unmatched = accountImport?.unmatchedMembers || 0;
      const message = `Updated accounts for ${accountImport?.matchedMembers || 0} members and saved ${result?.recordCount || allRows.length} workbook rows.${unmatched ? ` ${unmatched} workbook members were unmatched.` : ""}`;
      if (unmatched) toast.warning(message);
      else toast.success(message);
      try {
        const imports = await getSaccoLedgerImports(accessToken);
        setSavedImports(Array.isArray(imports) ? imports : []);
        await openSavedImport(result.importId);
      } catch (error) {
        setSavedError(`Workbook saved, but saved imports could not be refreshed: ${error.message || "Unknown error"}`);
      }
      onRefresh?.();
    } catch (error) {
      const message = error?.message || error?.response?.data?.message || "Financial import failed";
      const displayMessage = error?.requestId ? `${message} (Reference: ${error.requestId})` : message;
      setHistory((items) => [{ id: crypto.randomUUID(), fileName: session.fileName, uploadedBy: "Current user", createdAt: new Date().toISOString(), total: totalRows, status: "Failed", error: displayMessage }, ...items]);
      toast.error(displayMessage);
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
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-slate-900"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm dark:bg-slate-800"><FileSpreadsheet className="text-emerald-700" size={24}/></span><div><h2 className="font-bold">Workbook Upload & Preview</h2><p className="text-sm text-slate-500">Import monthly member balances into their accounts and save all 8 workbook sheets for Finance/Admin review.</p></div></div><div className="flex flex-wrap items-center gap-2">{session ? <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300">{session.fileName} · {totalRows} parsed records</span> : null}<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><Upload size={16}/>{session ? "Replace workbook" : busy ? "Processing..." : "Choose workbook"}<input type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={handleFile}/></label>{session ? <button type="button" disabled={busy} onClick={() => { setSession(null); setPage(0); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Clear</button> : null}</div></div>
    </section>
    {busy && <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-100"><span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent"/><span>{session ? "Uploading and saving workbook rows… Please keep this page open." : "Reading workbook sheets…"}</span><span className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-emerald-200"><span className="block h-full w-1/2 animate-pulse rounded-full bg-emerald-600"/></span></div>}
    <section className="rounded-xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Saved workbook imports</h2><p className="text-xs text-slate-500">Review archived rows or apply an import that was archived before account reconciliation.</p></div><select aria-label="Select saved workbook import" value={session?.saved ? session.importId : ""} onChange={(event) => openSavedImport(event.target.value)} disabled={savedLoading || !savedImports.length} className="min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">{savedLoading ? "Loading imports…" : savedImports.length ? "Select an import" : "No saved imports yet"}</option>{savedImports.map((item) => <option key={item.importId} value={item.importId}>{item.sourceFile || "Workbook"} · {item.recordCount || 0} rows · {item.status || "Archived"} · {item.createdAt ? new Date(item.createdAt).toLocaleString("en-KE") : "Date unavailable"}</option>)}</select></div>{savedError && <p role="alert" className="mt-3 text-sm text-rose-700">{savedError}</p>}{savedImports.length > 0 && <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="px-3 py-2">Workbook</th><th className="px-3 py-2">Uploaded by</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Rows</th><th className="px-3 py-2">Account update</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{savedImports.map((item) => { const matched = item.accountImport?.matchedMembers || 0; const unmatched = item.accountImport?.unmatchedMembers || 0; const reconciliation = item.status === "COMPLETED" ? `Updated ${matched} members${unmatched ? ` · ${unmatched} unmatched` : ""}` : item.status === "ACCOUNT_UPDATE_FAILED" ? "Failed" : item.status === "ARCHIVED" ? "Not applied" : "Processing"; const unmatchedNames = item.accountImport?.unmatchedMemberNames || []; return <tr key={item.importId} className="border-b last:border-0"><td className="px-3 py-2">{item.sourceFile || "Workbook"}</td><td className="px-3 py-2">{uploaderName(item)}</td><td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString("en-KE") : "—"}</td><td className="px-3 py-2">{item.recordCount || 0}</td><td className="px-3 py-2" title={unmatchedNames.length ? `Needs matching: ${unmatchedNames.join(", ")}` : ""}>{reconciliation}</td><td className="px-3 py-2">{item.status !== "COMPLETED" ? <button type="button" disabled={busy} onClick={() => applyArchivedImport(item.importId)} className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Apply to accounts</button> : <span className="text-xs text-emerald-700">Applied</span>}</td></tr>; })}</tbody></table></div>}</section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{SHEETS.map((name, index) => { const items = cardRows[name] || []; const summary = session?.summaries?.[name] || {}; const isSao = name === "SAO (Money Movement In/Out)"; const isSaccoAccount = name === "Sacco Account"; const isLoanAccount = name === "Loan Account"; const moneyIn = summaryValue(summary, ["Money IN"]) ?? sumColumn(items, ["Money IN", "Cash In"]); const moneyOut = summaryValue(summary, ["Money OUT"]) ?? sumColumn(items, ["Money OUT", "Cash Out"]); const calculatedBalance = moneyIn - moneyOut; const savedTotal = summaryValue(summary, isSao ? ["Current Balance", "Balance"] : isSaccoAccount ? ["Total"] : isLoanAccount ? ["Outstanding Loan Balance", "Loan Balance"] : ["Total"]); const total = savedTotal ?? (isSao ? calculatedBalance : isSaccoAccount ? lastNonZeroColumn(items, ["Total"]) : sheetTotal(items)); const hasTotal = savedTotal !== null || (isSao && items.length > 0) || (isSaccoAccount && total !== null) || items.some((row) => Object.keys(row).some((key) => moneyKeys.some((hint) => normalizeSheet(key).includes(normalizeSheet(hint))))); return <button type="button" key={name} onClick={() => { setActiveSheet(name); setPage(0); document.getElementById("financial-records-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${activeSheet === name ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-100 dark:bg-emerald-950/30" : "bg-white"}`}><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald-950/50">{cardIcons[index]}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{items.length} rows</span></div><h3 className="mt-4 font-bold text-slate-900 dark:text-white">{name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{cardDescriptions[name]}</p>{hasTotal ? <div className="mt-3"><p className="text-lg font-bold text-emerald-700">{isSao ? "Current balance" : isLoanAccount ? "Outstanding loans" : "Total"}: KES {total.toLocaleString("en-KE", { maximumFractionDigits: 2 })}</p>{isSao && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600"><span>Money IN: KES {moneyIn.toLocaleString("en-KE", { maximumFractionDigits: 2 })}</span><span>Money OUT: KES {moneyOut.toLocaleString("en-KE", { maximumFractionDigits: 2 })}</span></div>}</div> : <p className="mt-3 text-xs font-semibold text-slate-500">{items.length ? "Data available" : "No rows found"}</p>}</button>; })}</section>
    {session && <section id="financial-records-viewer" className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Tabbed Workbook Viewer</h2><p className="text-xs text-slate-500">{session.fileName} · {totalRows} parsed records</p></div><button type="button" disabled={busy || session.saved} onClick={commit} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{session.saved ? "Saved Import" : "Confirm Import"}</button></div><div className="mt-4 flex gap-2 overflow-x-auto border-b pb-2">{SHEETS.map((name) => <button type="button" key={name} onClick={() => { setActiveSheet(name); setPage(0); }} className={`whitespace-nowrap rounded-t px-3 py-2 text-sm font-semibold ${activeSheet === name ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500"}`}>{name}</button>)}</div><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="bg-[#D9EAD3]">{Object.keys(rows[0] || { "No data": "" }).map((key) => <th key={key} className="px-3 py-2 font-bold">{key}</th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={index} className="border-b last:border-0">{Object.keys(rows[0] || { "No data": "" }).map((key) => <td key={key} className="px-3 py-2">{String(row[key] ?? "")}</td>)}</tr>)}</tbody></table></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Showing {rows.length ? page * pageSize + 1 : 0}-{Math.min((page + 1) * pageSize, rows.length)} of {rows.length}</span><div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><button type="button" disabled={(page + 1) * pageSize >= rows.length} onClick={() => setPage((value) => value + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div></section>}
    <section className="rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-bold">Import History Log</h2><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="px-3 py-2">Import ID</th><th className="px-3 py-2">File Name</th><th className="px-3 py-2">Uploaded By</th><th className="px-3 py-2">Date/Time</th><th className="px-3 py-2">Records</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-b"><td className="px-3 py-2 font-mono text-xs">{item.id.slice(0, 8)}</td><td className="px-3 py-2">{item.fileName}</td><td className="px-3 py-2">{item.uploadedBy}</td><td className="px-3 py-2">{new Date(item.createdAt).toLocaleString("en-KE")}</td><td className="px-3 py-2">{item.total}</td><td className="px-3 py-2" title={item.error || ""}>{item.status}{item.error ? <span className="ml-2 text-xs text-rose-600">({item.error})</span> : null}</td></tr>)}{!history.length && <tr><td colSpan="6" className="px-3 py-8 text-center text-slate-500">No workbook imports in this session.</td></tr>}</tbody></table></div></section>
  </div>;
}
