import { useEffect } from "react";
import { buildApiUrl } from "../../lib/apiClient.js";

const getStoredToken = () => {
  try {
    return localStorage.getItem("ayedos_accessToken");
  } catch {
    return null;
  }
};

export function useDashboardEvents(accessToken, handlers = {}) {
  useEffect(() => {
    const token = accessToken || getStoredToken();
    if (!token || typeof fetch === "undefined") return undefined;

    const controller = new AbortController();
    const url = new URL(buildApiUrl("/api/v1/events"), window.location.origin);

    const dispatchEvent = (event) => {
      if (event.type !== "LOAN_PAYMENT_PROCESSED") return;
      try {
        handlers.onLoanPaymentProcessed?.(JSON.parse(event.data || "{}"));
      } catch {
        handlers.onRecoveryNeeded?.();
      }
    };

    const readStream = async () => {
      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
            "Ngrok-Skip-Browser-Warning": "true",
          },
        });

        if (!response.ok || !response.body) {
          handlers.onConnectionInterrupted?.();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split(/\n\n|\r\n\r\n/);
          buffer = messages.pop() || "";

          messages.forEach((message) => {
            const event = { type: "message", data: "" };
            message.split(/\r?\n/).forEach((line) => {
              if (line.startsWith("event:")) event.type = line.slice(6).trim();
              if (line.startsWith("data:")) event.data += line.slice(5).trim();
            });
            dispatchEvent(event);
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) handlers.onConnectionInterrupted?.();
      }
    };

    readStream();

    return () => controller.abort();
  }, [accessToken, handlers]);
}

export function applyLoanPaymentEvent(current, payload) {
  if (!payload?.loanId) return current;
  const transaction = payload.transaction
    ? {
        ...payload.transaction,
        paymentCategory: payload.transaction.paymentCategory || "loan_repayment",
        createdAt: payload.transaction.createdAt || payload.paymentTimestamp,
      }
    : null;

  const nextTransactions = transaction && !current.transactions?.some((item) => item.id === transaction.id)
    ? [transaction, ...(current.transactions || [])]
    : current.transactions || [];

  const nextLoans = (current.loans || []).map((loan) => (
    loan.id === payload.loanId
      ? {
          ...loan,
          balance: payload.newOutstandingBalance,
          outstandingBalance: payload.newOutstandingBalance,
          principalBalance: payload.remainingPrincipal,
          accruedInterest: payload.remainingInterest,
          paid: Number(loan.paid || 0) + Number(payload.totalPaid || 0),
          nextPaymentDueAt: payload.nextPaymentDueAt,
          status: payload.loanStatus || loan.status,
        }
      : loan
  ));

  const totals = current.reports?.totals
    ? {
        ...current.reports.totals,
        repayments: Number(current.reports.totals.repayments || 0) + Number(payload.totalPaid || 0),
        transactionAmount: Number(current.reports.totals.transactionAmount || 0) + Number(payload.totalPaid || 0),
        interests: {
          ...(current.reports.totals.interests || {}),
          total: Number(current.reports.totals.interests?.total || 0) + Number(payload.interestEarned || 0),
          loanRepaymentInterest: Number(current.reports.totals.interests?.loanRepaymentInterest || 0) + Number(payload.interestEarned || 0),
        },
      }
    : undefined;

  return {
    ...current,
    transactions: nextTransactions,
    loans: nextLoans,
    reports: totals ? { ...(current.reports || {}), totals } : current.reports,
  };
}
