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
    if (!token || typeof EventSource === "undefined") return undefined;

    const url = new URL(buildApiUrl("/api/v1/events"), window.location.origin);
    url.searchParams.set("access_token", token);
    const source = new EventSource(url.toString(), { withCredentials: true });

    source.addEventListener("LOAN_PAYMENT_PROCESSED", (event) => {
      try {
        handlers.onLoanPaymentProcessed?.(JSON.parse(event.data));
      } catch {
        handlers.onRecoveryNeeded?.();
      }
    });
    source.onerror = () => {
      handlers.onConnectionInterrupted?.();
    };

    return () => source.close();
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
