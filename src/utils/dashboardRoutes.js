export function getDashboardPath(role, suffix = "") {
  const normalizedRole = String(role || "MEMBER").toUpperCase();
  const base =
    normalizedRole === "ADMIN"
      ? "/dashboard/admin"
      : normalizedRole === "FINANCE"
        ? "/dashboard/finance"
        : "/dashboard/user";

  if (!suffix) return base;
  return `${base}/${String(suffix).replace(/^\/+/, "")}`;
}
