import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { getGuarantorRequest, respondToGuarantorRequest } from '../features/member/memberService.js'

const formatCurrency = (value) => `KES ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function GuarantorRequest() {
  const { token } = useParams()
  const [request, setRequest] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [guaranteeAmount, setGuaranteeAmount] = useState('')

  useEffect(() => {
    let cancelled = false
    getGuarantorRequest(token)
      .then((data) => { if (!cancelled) setRequest(data) })
      .catch((error) => { if (!cancelled) setMessage({ type: 'error', text: error?.message || 'This guarantor link is unavailable.' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  async function submit(decision) {
    if (decision === 'ACCEPTED' && Number(guaranteeAmount || 0) <= 0) {
      setMessage({ type: 'error', text: 'Enter the amount you agree to guarantee.' })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      await respondToGuarantorRequest(token, decision, guaranteeAmount)
      setRequest((current) => ({ ...current, status: decision }))
      setMessage({ type: 'success', text: `Your ${decision.toLowerCase()} response has been recorded.` })
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Could not submit your response.' })
    } finally {
      setSubmitting(false)
    }
  }

  const status = String(request?.status || '').toUpperCase()
  const disabled = submitting || ['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(status)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Clock3 className="text-sky-700" size={22} />
          <h1 className="text-xl font-semibold tracking-normal">Loan guarantor request</h1>
        </div>
        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading request...</p>
        ) : request ? (
          <div className="mt-6 space-y-4">
            <dl className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Applicant</dt><dd className="font-semibold">{request.loan?.applicant}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Loan type</dt><dd className="font-semibold">{request.loan?.type}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Loan amount</dt><dd className="font-semibold">{formatCurrency(request.loan?.amount)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Requested guarantee</dt><dd className="font-semibold">{formatCurrency(request.amount)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Expires</dt><dd className="font-semibold">{request.expiresAt ? new Date(request.expiresAt).toLocaleString() : '-'}</dd></div>
            </dl>
            {request.loan?.reason ? <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{request.loan.reason}</p> : null}
            <label className="block text-sm font-semibold text-slate-700">
              Amount I agree to guarantee
              <input
                type="number"
                min="1"
                max={request.loan?.amount || undefined}
                value={guaranteeAmount}
                onChange={(event) => setGuaranteeAmount(event.target.value.replace(/\D/g, ''))}
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 px-3.5 text-sm"
                placeholder="Enter amount"
                disabled={disabled}
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button disabled={disabled} onClick={() => submit('ACCEPTED')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={17} />Accept</button>
              <button disabled={disabled} onClick={() => submit('REJECTED')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><XCircle size={17} />Reject</button>
            </div>
          </div>
        ) : null}
        {message ? <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</p> : null}
      </section>
    </main>
  )
}
