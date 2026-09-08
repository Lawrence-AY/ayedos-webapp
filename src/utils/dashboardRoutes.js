export function normalizeDashboardRole(role) {
  return String(role || "MEMBER").toUpperCase();
}

export function getDashboardPath(role, suffix = "") {
  const normalizedRole = normalizeDashboardRole(role);
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
  const role = normalizeDashboardRole(user.role);
  if (role === "PENDING") return false;
  if (!["MEMBER", "EMPLOYEE"].includes(role)) return true;
  if (
    user.onboardingComplete ||
    user.onboardingCompleted ||
    user.isCompleted ||
    user.onboardingStatus === true ||
    String(user.onboardingStatus || '').toLowerCase() === 'complete' ||
    String(user.onboardingStatus || '').toLowerCase() === 'completed'
  ) return true;

  const member = user.Member || user.member || {};
  const activeVerifiedMember = Boolean(
    member.memberNumber &&
      member.isVerified &&
      String(member.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
  );
  if (activeVerifiedMember) return true;
  if (
    activeVerifiedMember &&
    (user.isWhitelisted || String(user.employer || user.company || '').toLowerCase() === 'ayedos')
  ) {
    return true;
  }
  return Boolean(
    activeVerifiedMember &&
      (user.address || user.county || user.subCounty)
  );
}

export function getPostLoginPath(user) {
  if (user?.mustChangePassword) return getDashboardPath(user?.role, "security");
  if (!isMemberOnboardingComplete(user)) return "/onboarding";
  return getDashboardPath(user?.role);
}
