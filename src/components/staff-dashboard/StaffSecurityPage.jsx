import { useCallback, useEffect, useState } from "react";
import SecuritySection from "../user-dashboard/SecuritySection.jsx";
import { getAuthSessions } from "../../services/authService.js";
import { getBlockedIdentityAttempts, unblockIdentityAttempt } from "../../features/admin/adminService.js";

function normalizeSession(session) {
  return {
    ...session,
    date: session.date || session.createdAt || session.lastActivityAt,
    event: session.event || "Login",
    device: session.device || session.deviceName || "Unknown device",
    location: session.location || "",
    status: session.isNewDevice ? "New device" : session.status || "Active",
  };
}

export default function StaffSecurityPage({ user, accessToken }) {
  const [sessions, setSessions] = useState([]);
  const [blockedAttempts, setBlockedAttempts] = useState([]);
  const [blockedError, setBlockedError] = useState("");
  const [resettingId, setResettingId] = useState("");
  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(String(user?.role || "").toUpperCase());

  const loadSessions = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await getAuthSessions(accessToken);
      setSessions(Array.isArray(result) ? result.map(normalizeSession) : []);
    } catch {
      setSessions([]);
    }
  }, [accessToken]);

  const loadBlockedAttempts = useCallback(async () => {
    if (!accessToken || !isAdmin) return;
    try {
      const result = await getBlockedIdentityAttempts(accessToken);
      setBlockedAttempts(Array.isArray(result) ? result : []);
      setBlockedError("");
    } catch (error) {
      setBlockedAttempts([]);
      setBlockedError(error.message || "Unable to load blocked identity attempts");
    }
  }, [accessToken, isAdmin]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadBlockedAttempts();
  }, [loadBlockedAttempts]);

  async function handleUnblock(id) {
    setResettingId(id);
    try {
      await unblockIdentityAttempt(id, accessToken);
      await loadBlockedAttempts();
    } catch (error) {
      setBlockedError(error.message || "Unable to reset identity block");
    } finally {
      setResettingId("");
    }
  }

  return (
    <div className="space-y-6">
      <SecuritySection
        user={user}
        accessToken={accessToken}
        activeSessions={sessions.filter(
          (session) => String(session.status || "").toUpperCase() === "ACTIVE",
        )}
        loginHistory={sessions}
        onRefresh={() => {
          loadSessions();
          loadBlockedAttempts();
        }}
      />
      {isAdmin && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Blocked registration attempts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">IPRS identity mismatch lockouts and admin resets.</p>
            </div>
            <button type="button" onClick={loadBlockedAttempts} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Refresh
            </button>
          </div>
          {blockedError ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{blockedError}</div> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="py-3 pr-4">User Email</th>
                  <th className="py-3 pr-4">ID/Passport Number</th>
                  <th className="py-3 pr-4">Timestamp</th>
                  <th className="py-3 pr-4">Attempt Count</th>
                  <th className="py-3 pr-4">Block Status</th>
                  <th className="py-3 pr-4">Reason</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {blockedAttempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b last:border-0 dark:border-slate-800">
                    <td className="py-3 pr-4 font-semibold">{attempt.email}</td>
                    <td className="py-3 pr-4">{attempt.documentNumber}</td>
                    <td className="py-3 pr-4">{attempt.timestamp ? new Date(attempt.timestamp).toLocaleString() : "-"}</td>
                    <td className="py-3 pr-4">{attempt.attemptCount}</td>
                    <td className="py-3 pr-4">{attempt.blockStatus ? "Blocked" : "Reset"}</td>
                    <td className="py-3 pr-4">{attempt.reason || "IPRS identity mismatch (3 failed attempts)"}</td>
                    <td className="py-3">
                      <button type="button" disabled={!attempt.blockStatus || resettingId === attempt.id} onClick={() => handleUnblock(attempt.id)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-emerald-700">
                        {resettingId === attempt.id ? "Resetting..." : "Unblock"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!blockedAttempts.length && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">No blocked identity attempts.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
