import { useCallback, useEffect, useState } from "react";
import SecuritySection from "../user-dashboard/SecuritySection.jsx";
import { getAuthSessions } from "../../services/authService.js";

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

  const loadSessions = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await getAuthSessions(accessToken);
      setSessions(Array.isArray(result) ? result.map(normalizeSession) : []);
    } catch {
      setSessions([]);
    }
  }, [accessToken]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <SecuritySection
      user={user}
      accessToken={accessToken}
      activeSessions={sessions.filter(
        (session) => String(session.status || "").toUpperCase() === "ACTIVE",
      )}
      loginHistory={sessions}
      onRefresh={loadSessions}
    />
  );
}
