import * as XLSX from "xlsx";

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const HEADER_HINTS = [
  "name",
  "fullname",
  "memberno",
  "membernumber",
  "status",
  "idnumber",
  "nationalid",
  "joiningdate",
  "joindate",
  "sharecapital",
  "savings",
  "membershipfee",
  "phone",
  "email",
];
const normalizeHeader = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const toNumber = (value) => {
  const text = String(value ?? "").replace(/,/g, "").replace(/-/g, "").trim();
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
};

export function rowsToCsv(rows) {
  if (!rows.length) return "";
  const headers = [...rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set())];
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

export function workbookRowsToCsv(workbook) {
  const memberStatementCsv = memberStatementWorkbookToCsv(workbook);
  if (memberStatementCsv) return memberStatementCsv;

  const rows = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: false });
    const headerIndex = matrix.reduce((best, row, index) => {
      const score = row.reduce((sum, cell) => sum + (HEADER_HINTS.includes(normalizeHeader(cell)) ? 1 : 0), 0);
      return score > best.score ? { index, score } : best;
    }, { index: 0, score: 0 }).index;
    const headers = (matrix[headerIndex] || []).map((header, index) => String(header || `Column ${index + 1}`).trim() || `Column ${index + 1}`);
    const records = matrix.slice(headerIndex + 1).map((values) => (
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
    )).filter((record) => Object.values(record).some(Boolean));
    records.forEach((record) => rows.push({ Sheet: sheetName, ...record }));
  });
  return rowsToCsv(rows);
}

function sheetMatrix(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: false });
}

function matrixToRecords(matrix) {
  const headerIndex = matrix.reduce((best, row, index) => {
    const score = row.reduce((sum, cell) => sum + (HEADER_HINTS.includes(normalizeHeader(cell)) ? 1 : 0), 0);
    return score > best.score ? { index, score } : best;
  }, { index: 0, score: 0 }).index;
  const headers = (matrix[headerIndex] || []).map((header, index) => String(header || `Column ${index + 1}`).trim() || `Column ${index + 1}`);
  return matrix.slice(headerIndex + 1).map((values) => (
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  )).filter((record) => Object.values(record).some(Boolean));
}

function parseStatementSheet(sheetName, matrix) {
  const findValue = (label) => {
    const normalizedLabel = normalizeHeader(label);
    const row = matrix.find((cells) => normalizeHeader(cells[0]) === normalizedLabel);
    return row?.find((cell, index) => index > 0 && String(cell || "").trim()) || "";
  };
  const periods = [];
  const headerIndex = matrix.findIndex((row) => normalizeHeader(row[0]) === "from" && normalizeHeader(row[1]) === "to");
  if (headerIndex >= 0) {
    for (const row of matrix.slice(headerIndex + 1)) {
      const first = normalizeHeader(row[0]);
      if (!row.some(Boolean)) continue;
      if (first === "total") break;
      if (!row[0] && !row[1]) continue;
      periods.push({
        from: row[0] || "",
        to: row[1] || "",
        shareCapital: toNumber(row[2]),
        savings: toNumber(row[3]),
        employerContribution: toNumber(row[4]),
      });
    }
  }
  const totalRow = matrix.find((row) => normalizeHeader(row[0]) === "total");
  return {
    sheetName,
    name: findValue("Name"),
    nationalId: findValue("Id number"),
    memberNumber: findValue("SACCO member No."),
    periods,
    totals: {
      shareCapital: toNumber(totalRow?.[2]),
      savings: toNumber(totalRow?.[3]),
      employerContribution: toNumber(totalRow?.[4]),
    },
  };
}

function memberStatementWorkbookToCsv(workbook) {
  const bioSheetName = workbook.SheetNames.find((name) => normalizeHeader(name) === "biodata");
  if (!bioSheetName || workbook.SheetNames.length < 2) return "";

  const bioRows = matrixToRecords(sheetMatrix(workbook.Sheets[bioSheetName]));
  const statements = new Map();
  workbook.SheetNames.filter((name) => name !== bioSheetName).forEach((sheetName) => {
    const statement = parseStatementSheet(sheetName, sheetMatrix(workbook.Sheets[sheetName]));
    if (statement.memberNumber) statements.set(normalizeHeader(statement.memberNumber), statement);
  });
  if (!bioRows.length || !statements.size) return "";

  const rows = bioRows.map((row) => {
    const memberNoKey = normalizeHeader(row["Member No."] || row["Member No"] || row["Member Number"] || row.memberNumber);
    const statement = statements.get(memberNoKey);
    const statementDetails = statement ? JSON.stringify(statement) : "";
    return {
      ...row,
      "Statement Sheet": statement?.sheetName || "",
      "Share Capital": statement?.totals?.shareCapital || "",
      "Savings": statement?.totals?.savings || "",
      "Employer Contribution": statement?.totals?.employerContribution || "",
      "Statement Details": statementDetails,
    };
  });

  return rowsToCsv(rows);
}

function xmlNodeToRows(text) {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "application/xml");
  if (document.querySelector("parsererror")) return "";
  const rowNodes = [...document.querySelectorAll("Row, row, Record, record, Member, member")];
  const rows = rowNodes.map((node) => {
    const cells = [...node.children];
    if (cells.every((cell) => cell.children.length === 0)) {
      return Object.fromEntries(cells.map((cell) => [cell.tagName, cell.textContent?.trim() || ""]));
    }
    return Object.fromEntries(cells.map((cell, index) => {
      const valueNode = cell.querySelector("Data") || cell;
      return [cell.getAttribute("name") || cell.getAttribute("field") || cell.tagName || `Column ${index + 1}`, valueNode.textContent?.trim() || ""];
    }));
  }).filter((row) => Object.values(row).some(Boolean));
  return rowsToCsv(rows);
}

export async function fileToImportCsv(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xls" || extension === "xlsx") {
    return workbookRowsToCsv(XLSX.read(await file.arrayBuffer(), { type: "array" }));
  }
  if (extension === "xml") {
    const text = await file.text();
    try {
      const workbookCsv = workbookRowsToCsv(XLSX.read(text, { type: "string" }));
      if (workbookCsv.trim()) return workbookCsv;
    } catch {
      // Some XML files are structured data rather than Excel XML workbooks.
    }
    return xmlNodeToRows(text);
  }
  return file.text();
}
