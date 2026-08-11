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
  if (!user) return false;
  const role = String(user.role || "").toUpperCase();
  if (role === "PENDING") return false;
  if (role !== "MEMBER") return true;
  if (
    user.onboardingComplete ||
    user.onboardingCompleted ||
    user.isCompleted ||
    user.onboardingStatus === true ||
    String(user.onboardingStatus || '').toLowerCase() === 'complete' ||
    String(user.onboardingStatus || '').toLowerCase() === 'completed'
  ) return true;

  const member = user.Member || user.member || {};
  return Boolean(
    member.memberNumber &&
      member.isVerified &&
      String(member.status || 'ACTIVE').toUpperCase() === 'ACTIVE' &&
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
