import { useState } from "react";
import { PiggyBank } from "lucide-react";
import { getContributionStatus, initiateContribution } from "../../features/member/memberService.js";

function FormField({ label, name, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={onChange}
        className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
      >
        {children}
      </select>
    </label>
  );
}

export default function SavingsContributionForm({ accessToken, user, onRefresh, onMessage }) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [paymentMode, setPaymentMode] = useState("STK");
  const [contributionType, setContributionType] = useState("monthly");      // for PAYBILL
  const [stkContributionType, setStkContributionType] = useState("monthly"); // for STK radio group
  const [submitting, setSubmitting] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  async function pollContributionStatus(transactionId) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
      const status = await getContributionStatus(transactionId, accessToken);
      if (status.status === "SUCCESS") {
        setPaymentResult((current) => ({
          ...current,
          ...status,
          status: "SUCCESS",
          mpesaReference: status.mpesaReference || status.reference,
        }));
        onMessage?.({
          type: "success",
          text: `Payment confirmed. MPESA reference: ${status.mpesaReference || status.reference}.`,
        });
        await onRefresh?.();
        return;
      }
      if (status.status === "FAILED") {
        setPaymentResult((current) => ({ ...current, ...status, status: "FAILED" }));
        onMessage?.({ type: "error", text: "MPESA payment failed or was cancelled." });
        await onRefresh?.();
        return;
      }
    }
  }

  async function submitContribution(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      // Determine which contribution type to use based on payment mode
      const finalContributionType = paymentMode === "STK" ? stkContributionType : contributionType;

      const result = await initiateContribution({
        amount,
        phone,
        paymentMode,
        contributionType: finalContributionType,
      }, accessToken);

      setPaymentResult(result);
      onMessage?.({
        type: "success",
        text: result?.message || (paymentMode === "STK" ? "STK push requested. Check your phone for the M-PESA PIN prompt." : "Contribution recorded. Follow the Paybill steps below."),
      });
      setAmount("");
      await onRefresh?.();
      if (paymentMode === "STK" && result?.id) {
        pollContributionStatus(result.id).catch(() => {});
      }
    } catch (error) {
      onMessage?.({ type: "error", text: error?.message || "Failed to initiate contribution." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submitContribution} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] md:items-end">
        <FormField label="Contribution amount" name="depositAmount" type="number" 
          min="1" step="any"
          value={amount} onChange={(event) => setAmount(event.target.value)} />
        <FormField label="MPESA phone" name="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        
        <SelectField label="Payment" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
          <option value="STK">STK push</option>
          <option value="PAYBILL">Paybill</option>
        </SelectField>

        {/* Contribution Type selection – different UI depending on payment mode */}
        {paymentMode === "STK" ? (
          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Contribution type (STK)
            </span>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="radio"
                  name="stkType"
                  value="monthly"
                  checked={stkContributionType === "monthly"}
                  onChange={(e) => setStkContributionType(e.target.value)}
                  className="h-4 w-4"
                />
                Monthly
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="radio"
                  name="stkType"
                  value="savings"
                  checked={stkContributionType === "savings"}
                  onChange={(e) => setStkContributionType(e.target.value)}
                  className="h-4 w-4"
                />
                Savings
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="radio"
                  name="stkType"
                  value="sharecapital"
                  checked={stkContributionType === "sharecapital"}
                  onChange={(e) => setStkContributionType(e.target.value)}
                  className="h-4 w-4"
                />
                Share capital
              </label>
            </div>
          </div>
        ) : (
          <SelectField label="Type" value={contributionType} onChange={(event) => setContributionType(event.target.value)}>
            <option value="monthly">Monthly contribution</option>
            <option value="savings">Savings</option>
            <option value="sharecapital">Share capital</option>
          </SelectField>
        )}

        <button
          disabled={!amount || submitting || (paymentMode === "STK" && !phone)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          <PiggyBank size={17} />
          {submitting ? "Sending..." : paymentMode === "STK" ? "Send STK" : "Get Paybill"}
        </button>
      </form>

      {/* Paybill instructions */}
      {paymentResult?.paybill ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Paybill</p>
              <p className="mt-1 text-lg font-bold">{paymentResult.paybill.businessNumber || "Not configured"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Account</p>
              <p className="mt-1 text-lg font-bold">{paymentResult.paybill.accountNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Amount</p>
              <p className="mt-1 text-lg font-bold">KSh {Number(paymentResult.paybill.amount || paymentResult.amount || 0).toLocaleString()}</p>
            </div>
          </div>
          <ol className="mt-4 list-decimal space-y-1 pl-5">
            {(paymentResult.paybill.steps || []).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* STK status */}
      {paymentResult?.kcbMpesa ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <p className="font-semibold">STK request sent to {phone}. Check your phone for the M-PESA PIN prompt.</p>
          <p className="mt-2">MPESA request reference: <span className="font-bold">{paymentResult.mpesaReference || paymentResult.reference}</span></p>
          {paymentResult.status === "SUCCESS" ? (
            <p className="mt-2 font-semibold text-emerald-700">Payment confirmed.</p>
          ) : (
            <p className="mt-2 text-sky-800">Waiting for M-PESA confirmation...</p>
          )}
        </div>
      ) : null}
    </div>
  );
}