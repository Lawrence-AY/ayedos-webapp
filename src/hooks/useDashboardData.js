import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A shared hook for dashboard data fetching with:
 * - Visibility-aware polling (pauses when tab is hidden)
 * - Loading state management
 * - Error tracking per data key
 * - Cleanup on unmount
 *
 * @param {Object} options
 * @param {Function} options.fetchFn - Async function that returns { data, errors }
 * @param {number} options.pollIntervalMs - Polling interval in ms (default 120000)
 * @param {boolean} options.enabled - Whether polling is enabled (default true)
 * @returns {{ loading, data, errors, refresh, setData }}
 */
export default function useDashboardData({ fetchFn, pollIntervalMs = 120000, enabled = true }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);

  // Keep fetchFn ref current without triggering re-renders
  fetchFnRef.current = fetchFn;

  const load = useCallback(async ({ showLoading = true } = {}) => {
    if (!fetchFnRef.current) return;

    if (showLoading) setLoading(true);
    try {
      const result = await fetchFnRef.current();
      if (mountedRef.current) {
        setData(result.data || {});
        setErrors(result.errors || {});
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrors((prev) => ({ ...prev, _global: error?.message || "Failed to load data" }));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    load();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Refresh immediately when tab becomes visible again
        load({ showLoading: false });
        intervalRef.current = window.setInterval(() => {
          load({ showLoading: false });
        }, pollIntervalMs);
      }
    };

    intervalRef.current = window.setInterval(() => {
      load({ showLoading: false });
    }, pollIntervalMs);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, pollIntervalMs, load]);

  return { loading, data, errors, refresh: load, setData };
}
