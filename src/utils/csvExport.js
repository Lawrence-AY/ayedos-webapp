const ORGANIZATION_NAME = "Ayedos SACCO Management System";

const CURRENCY_KEY_PATTERN =
  /(amount|balance|capital|savings|shares|loan|repayment|interest|contribution|arrears|deduction|dividend|income|salary|principal|fee|total|paid|value)/i;

function flattenRow(value, prefix = "", output = {}) {
  if (value == null) return output;
  if (value instanceof Date) {
    output[prefix] = value.toISOString();
    return output;
  }
  if (Array.isArray(value)) {
    output[prefix] = value
      .map((item) =>
        typeof item === "object" && item !== null
          ? JSON.stringify(item)
          : String(item ?? ""),
      )
      .join("; ");
    return output;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, nested]) => {
      flattenRow(nested, prefix ? `${prefix}.${key}` : key, output);
    });
    return output;
  }
  output[prefix] = value;
  return output;
}

function humanizeHeader(key) {
  const withSpaces = String(key)
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bid\b/gi, "ID")
    .replace(/\burl\b/gi, "URL")
    .replace(/\bno\b/gi, "No.");
  return withSpaces.replace(/\w\S*/g, (word) =>
    ["ID", "URL", "No."].includes(word)
      ? word
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatValue(key, value) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (CURRENCY_KEY_PATTERN.test(key) && Number.isFinite(Number(value))) {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value;
}

function getStoredExporterName() {
  try {
    const candidates = ["ayedos_user", "user", "authUser", "currentUser"];
    for (const key of candidates) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed;
      const name = user?.name || user?.fullName || user?.email;
      if (name) return name;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeColumns(rows, columns = []) {
  const preferred = columns.map((column) =>
    typeof column === "string"
      ? { key: column, label: humanizeHeader(column) }
      : { key: column.key, label: column.label || humanizeHeader(column.key) },
  );
  const keys = new Set(preferred.map((column) => column.key));
  rows.forEach((row) => {
    Object.keys(flattenRow(row)).forEach((key) => keys.add(key));
  });
  const orderedKeys = [
    ...preferred.map((column) => column.key),
    ...[...keys].filter((key) => !preferred.some((column) => column.key === key)),
  ];
  return orderedKeys.map((key) => ({
    key,
    label: preferred.find((column) => column.key === key)?.label || humanizeHeader(key),
  }));
}

export function exportRichCSV(rows, columns = [], filename = "export.csv", options = {}) {
  const exportRows = Array.isArray(rows) ? rows : [];
  const exportColumns = normalizeColumns(exportRows, columns);
  const generatedAt = new Date();
  const exportedBy = options.exportedBy || getStoredExporterName() || "Unknown User";
  const title =
    options.title ||
    filename
      .replace(/\.csv$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  const metadata = [
    [ORGANIZATION_NAME],
    [`Export Title: ${title}`],
    [`Generated: ${generatedAt.toISOString()} (${generatedAt.toLocaleString()})`, `Exported By: ${exportedBy}`],
    [],
  ];
  const header = exportColumns.map((column) => column.label);
  const body = exportRows.map((row) => {
    const flat = flattenRow(row);
    return exportColumns.map((column) => formatValue(column.key, flat[column.key]));
  });

  const csv = [...metadata, header, ...body]
    .map((line) => line.map(escapeCsv).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
