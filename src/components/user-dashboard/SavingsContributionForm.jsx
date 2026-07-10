import { useState } from "react";
import { X } from "lucide-react";
import { getContributionStatus, initiateContribution } from "../../features/member/memberService.js";

const promptOptions = [
  { value: "savings", label: "Savings deposit" },
  
  { value: "sharecapital", label: "Share capital" },
  { value: "wallet", label: "Wallet top-up" },
  { value: "loans_repayment", label: "Loan repayment" },
 
];

function FormField({ label, name, value, onChange, type = "text", min, step, inputMode, maxLength, pattern }) {
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
        min={min}
        step={step}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
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
  const [contributionType, setContributionType] = useState("savings");      // for PAYBILL
  const [stkContributionType, setStkContributionType] = useState("savings"); // for STK prompt category
  const [submitting, setSubmitting] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [showPaybillDialog, setShowPaybillDialog] = useState(false);

  const amountValue = Number(amount || 0);
  const phoneDigits = String(phone || "").replace(/\D/g, "").slice(0, 12);
  const amountIsValid = Number.isInteger(amountValue) && amountValue >= 1;
  const phoneIsValid = paymentMode !== "STK" || phoneDigits.length >= 10;

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

  const [showStkConfirm, setShowStkConfirm] = useState(false);

  async function submitContribution(event) {
    event.preventDefault();
    if (!amountIsValid) {
      onMessage?.({ type: "error", text: "Amount must be at least KES 1." });
      return;
    }
    if (!phoneIsValid) {
      onMessage?.({ type: "error", text: "Enter a valid numeric MPESA phone number." });
      return;
    }
    // For STK, show confirmation dialog first
    if (paymentMode === "STK") {
      setShowStkConfirm(true);
      return;
    }
    // For Paybill, proceed directly
    await executeContribution();
  }

  async function executeContribution() {
    setSubmitting(true);
    setShowStkConfirm(false);
    try {
      if (!amountIsValid) {
        onMessage?.({ type: "error", text: "Amount must be at least KES 1." });
        return;
      }
      if (!phoneIsValid) {
        onMessage?.({ type: "error", text: "Enter a valid numeric MPESA phone number." });
        return;
      }
      // Determine which contribution type to use based on payment mode
      const finalContributionType = paymentMode === "STK" ? stkContributionType : contributionType;

      const result = await initiateContribution({
        amount: String(Math.floor(amountValue)),
        phone: phoneDigits,
        paymentMode,
        contributionType: finalContributionType,
      }, accessToken);

      setPaymentResult(result);
      if (paymentMode === "PAYBILL" && result?.paybill) {
        setShowPaybillDialog(true);
      }
      onMessage?.({
        type: "success",
        text: result?.message || (paymentMode === "STK" ? "Check your phone for the M-PESA PIN prompt." : "Follow the Paybill steps below."),
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
        <FormField label="Amount" name="depositAmount" type="number"
          min="1" step="1" inputMode="numeric"
          value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} />
        <FormField
          label="MPESA phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          maxLength={12}
          pattern="[0-9]*"
          value={phoneDigits}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 12))}
        />
        
        <SelectField label="Payment" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
          <option value="STK">Mpesa Prompt</option>
          <option value="PAYBILL">Paybill</option>
        </SelectField>

        {/* Contribution Type selection – different UI depending on payment mode */}
        {paymentMode === "STK" ? (
          <SelectField label="type" value={stkContributionType} onChange={(event) => setStkContributionType(event.target.value)}>
            {promptOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
        ) : (
          <SelectField label="Type" value={contributionType} onChange={(event) => setContributionType(event.target.value)}>
            {promptOptions.slice(0, 6).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
        )}

        <button
          disabled={!amountIsValid || submitting || !phoneIsValid}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
       
          {submitting ? "Sending..." : paymentMode === "STK" ? "Send" : "Get Paybill"}
        </button>
      </form>

      {/* Paybill instructions */}
      {paymentResult?.paybill && showPaybillDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Paybill payment</h3>
                <p className="text-sm text-slate-500">Complete the payment from M-PESA.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaybillDialog(false)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close Paybill dialog"
              >
                <X size={17} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Paybill</p>
                <p className="mt-1 text-lg font-bold text-emerald-950">{paymentResult.paybill.businessNumber || "Not configured"}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Account</p>
                <p className="mt-1 text-lg font-bold text-emerald-950">{paymentResult.paybill.accountNumber}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Amount</p>
                <p className="mt-1 text-lg font-bold text-emerald-950">KSh {Number(paymentResult.paybill.amount || paymentResult.amount || 0).toLocaleString()}</p>
              </div>
            </div>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {(paymentResult.paybill.steps || []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      {/* STK status */}
      {paymentResult?.kcbMpesa ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <p className="font-semibold">STK request sent to {phoneDigits}. Check your phone for the M-PESA PIN prompt.</p>
           {paymentResult.status === "SUCCESS" ? (
            <p className="mt-2 font-semibold text-emerald-700">Payment confirmed.</p>
          ) : (
            <p className="mt-2 text-sky-800">Waiting for M-PESA confirmation...</p>
          )}
        </div>
      ) : null}

      {/* STK Confirmation Dialog */}
      {showStkConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Confirm Payment</h3>
                <p className="text-sm text-slate-500">You are about to send an M-PESA payment request.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowStkConfirm(false)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close confirmation"
              >
                <X size={17} />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Amount</p>
                <p className="mt-1 text-xl font-bold text-slate-950">KSh {Number(amount || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phone Number</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{phoneDigits}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Payment Type</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 capitalize">{stkContributionType.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowStkConfirm(false)}
                className="flex-1 min-h-12 rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeContribution}
                className="flex-1 min-h-12 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
