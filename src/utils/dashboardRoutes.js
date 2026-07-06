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

export function isMemberOnboardingComplete(user) {
  if (!user || String(user.role || "").toUpperCase() !== "MEMBER") return true;

  const member = user.Member || user.member || {};
  return Boolean(
    user.consentGiven &&
      (user.nationalId || member.nationalId) &&
      (user.phone || user.phoneNumber) &&
      (user.address || user.county || user.subCounty)
  );
}

export function getPostLoginPath(user) {
  if (!isMemberOnboardingComplete(user)) return "/onboarding";
  return getDashboardPath(user?.role);
}
