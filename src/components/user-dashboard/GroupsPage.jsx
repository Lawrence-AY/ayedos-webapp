import { useState } from "react";
import {
  UsersRound,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Send,
  Plus,
  Clock3,
  BadgeCheck,
} from "lucide-react";

function formatCurrency(value) {
  return `KES ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MOCK_GROUPS = [
  { id: "g1", name: "Teachers Welfare Group", members: 24, description: "Teachers contributing to welfare and development loans.", joined: true, created: "2025-01-15" },
  { id: "g2", name: "Small Business Owners", members: 18, description: "Entrepreneurs pooling resources for business expansion loans.", joined: true, created: "2025-03-22" },
  { id: "g3", name: "Farmers Cooperative", members: 35, description: "Agricultural group seeking seasonal input and equipment financing.", joined: false, created: "2024-11-08" },
  { id: "g4", name: "Youth Empowerment Circle", members: 42, description: "Young professionals saving for education and startup capital.", joined: false, created: "2025-06-01" },
];

const GROUP_LOAN_TERMS = [
  "All group members must have been active for at least 6 months.",
  "The group must have a minimum of 5 contributing members.",
  "At least 60% of group members must have fully paid their share capital.",
  "The group must nominate a chairperson and secretary as loan signatories.",
  "Group loans are disbursed to a designated group account, not to individual members.",
  "Repayment is made collectively — each member is jointly liable.",
  "One defaulting member can affect the entire group's credit rating.",
  "Late repayments incur an additional 2% penalty per month on the outstanding balance.",
  "Groups must hold a meeting and pass a resolution authorizing the loan application.",
  "Loan amount is capped at 3× the group's total pooled savings.",
];

const GROUP_LOAN_RISKS = [
  { title: "Joint Liability", description: "Every group member is equally responsible for repayment. If one member defaults, the entire group's creditworthiness is impacted.", severity: "high" },
  { title: "Credit Rating Impact", description: "A single missed repayment lowers the group's internal SACCO rating, affecting all members' ability to access individual loans.", severity: "high" },
  { title: "Social Pressure", description: "Defaulting members may face community pressure and potential exclusion from the group.", severity: "medium" },
  { title: "Asset Freezing", description: "The SACCO reserves the right to freeze pooled group savings and share capital to recover defaulted amounts.", severity: "high" },
  { title: "Limited Individual Borrowing", description: "While a group loan is active, individual members may face restrictions on applying for personal loans.", severity: "medium" },
  { title: "Dispute Resolution", description: "Internal group disputes over loan utilization or repayment must first go through SACCO mediation.", severity: "low" },
];

const MOCK_MEMBERS = [
  { id: "m1", name: "Jane Muthoni", phone: "+254712345678", shareCapital: 28000, status: "Active" },
  { id: "m2", name: "Peter Kamau", phone: "+254723456789", shareCapital: 35000, status: "Active" },
  { id: "m3", name: "Grace Achieng", phone: "+254734567890", shareCapital: 25000, status: "Active" },
  { id: "m4", name: "David Otieno", phone: "+254745678901", shareCapital: 42000, status: "Active" },
  { id: "m5", name: "Faith Wanjiku", phone: "+254756789012", shareCapital: 30000, status: "Active" },
  { id: "m6", name: "John Njoroge", phone: "+254767890123", shareCapital: 22000, status: "Active" },
  { id: "m7", name: "Alice Wambui", phone: "+254778901234", shareCapital: 38000, status: "Active" },
  { id: "m8", name: "Michael Kiprop", phone: "+254789012345", shareCapital: 27000, status: "Active" },
];

export default function GroupsPage({ user, accessToken, stats, onRefresh }) {
  const [activeTab, setActiveTab] = useState("my-groups");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loanForm, setLoanForm] = useState({ amount: "", purpose: "", duration: "12" });
  const [message, setMessage] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [risksAcknowledged, setRisksAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [groupGuarantors, setGroupGuarantors] = useState([]);
  const [groupGuarantorAcceptance, setGroupGuarantorAcceptance] = useState({});
  const GROUP_GUARANTOR_COUNT = 3;

  const myGroups = MOCK_GROUPS.filter((g) => g.joined);
  const availableGroups = MOCK_GROUPS.filter((g) => !g.joined);
  const selectedGroupData = MOCK_GROUPS.find((g) => g.id === selectedGroup);

  function toggleGroupGuarantor(memberId) {
    setGroupGuarantors((prev) => {
      if (prev.includes(memberId)) {
        const next = prev.filter((id) => id !== memberId);
        setGroupGuarantorAcceptance((acc) => { const a = { ...acc }; delete a[memberId]; return a; });
        return next;
      }
      if (prev.length >= GROUP_GUARANTOR_COUNT) return prev;
      return [...prev, memberId];
    });
  }

  function simulateGroupGuarantorAccept(memberId) {
    setGroupGuarantorAcceptance((prev) => ({ ...prev, [memberId]: "accepted" }));
  }

  const selectedGroupGuarantorNames = groupGuarantors.map((id) => MOCK_MEMBERS.find((m) => m.id === id)?.name || id).join(", ");

  async function handleGroupLoanSubmit(e) {
    e.preventDefault();
    if (!selectedGroup) { setMessage({ type: "error", text: "Please select a group." }); return; }
    if (!loanForm.amount || Number(loanForm.amount) <= 0) { setMessage({ type: "error", text: "Enter a valid loan amount." }); return; }
    if (!loanForm.purpose.trim()) { setMessage({ type: "error", text: "Please describe the purpose of the loan." }); return; }
    if (!termsAccepted) { setMessage({ type: "error", text: "You must accept the terms and conditions." }); return; }
    if (!risksAcknowledged) { setMessage({ type: "error", text: "You must acknowledge the risks." }); return; }
    if (groupGuarantors.length < GROUP_GUARANTOR_COUNT) { setMessage({ type: "error", text: `Group loans require ${GROUP_GUARANTOR_COUNT} guarantors. Please select ${GROUP_GUARANTOR_COUNT} active SACCO members.` }); return; }
    const unaccepted = groupGuarantors.filter((id) => groupGuarantorAcceptance[id] !== "accepted");
    if (unaccepted.length > 0) { setMessage({ type: "error", text: "All guarantors must explicitly accept to guarantee the group's loan." }); return; }

    setSubmitting(true); setMessage(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setMessage({ type: "success", text: `Group loan application for "${selectedGroupData?.name}" submitted. The group signatories and guarantors will be notified.` });
      setLoanForm({ amount: "", purpose: "", duration: "12" });
      setTermsAccepted(false); setRisksAcknowledged(false);
      setGroupGuarantors([]); setGroupGuarantorAcceptance({});
      onRefresh?.();
    } catch (error) { setMessage({ type: "error", text: error?.message || "Failed to submit group loan application." }); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-[linear-gradient(135deg,#07182d_0%,#0f3443_48%,#155e3f_100%)] p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8cc63f]">Member Groups</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">Group Workspace</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">Join or create member groups to pool resources, save collectively, and apply for group loans as a unified entity.</p>
          </div>
          <button type="button" onClick={() => setActiveTab("apply-loan")} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"><Send size={16} className="text-[#8cc63f]" />Apply for group loan</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[{ key: "my-groups", label: `My Groups (${myGroups.length})` },{ key: "available", label: `Available Groups (${availableGroups.length})` },{ key: "apply-loan", label: "Group Loan Application" }].map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${activeTab === tab.key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{tab.label}</button>
        ))}
      </div>

      {message ? (<div className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</div>) : null}

      {activeTab === "my-groups" && (
        <div className="space-y-4">
          {myGroups.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center"><UsersRound size={40} className="mx-auto text-slate-300" /><h4 className="mt-4 text-base font-semibold text-slate-700">No groups yet</h4><p className="mt-2 text-sm text-slate-500">Join an available group or create a new one.</p></div>
          ) : myGroups.map((group) => (
            <div key={group.id} className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50"><UsersRound size={22} className="text-[#8cc63f]" /></div>
                  <div><h4 className="text-base font-semibold text-slate-950">{group.name}</h4><p className="mt-1 text-sm text-slate-500">{group.description}</p><div className="mt-3 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"><UsersRound size={12} /> {group.members} members</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><BadgeCheck size={12} /> Joined</span><span className="text-xs text-slate-400">Created {new Date(group.created).toLocaleDateString()}</span></div></div>
                </div>
                <button type="button" onClick={() => { setSelectedGroup(group.id); setActiveTab("apply-loan"); }} className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"><FileText size={16} />Apply group loan</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "available" && (
        <div className="space-y-4">
          {availableGroups.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center"><UsersRound size={40} className="mx-auto text-slate-300" /><h4 className="mt-4 text-base font-semibold text-slate-700">No available groups</h4><p className="mt-2 text-sm text-slate-500">All groups have been joined. Check back later.</p></div>
          ) : availableGroups.map((group) => (
            <div key={group.id} className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100"><UsersRound size={22} className="text-slate-400" /></div><div><h4 className="text-base font-semibold text-slate-950">{group.name}</h4><p className="mt-1 text-sm text-slate-500">{group.description}</p><div className="mt-3 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"><UsersRound size={12} /> {group.members} members</span><span className="text-xs text-slate-400">Created {new Date(group.created).toLocaleDateString()}</span></div></div></div>
                <button type="button" className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"><Plus size={16} className="text-[#8cc63f]" />Request to join</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "apply-loan" && (
        <div className="space-y-6">
          {/* Terms and Conditions */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3"><FileText size={20} className="mt-0.5 shrink-0 text-amber-700" /><div><h4 className="text-base font-semibold text-amber-900">Group Loan Terms & Conditions</h4><p className="mt-1 text-sm text-amber-700">Please read and accept all terms before applying.</p></div></div>
            <ul className="mt-4 space-y-3">{GROUP_LOAN_TERMS.map((term, i) => (<li key={i} className="flex items-start gap-3 text-sm text-amber-800"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-700">{i + 1}</span><span>{term}</span></li>))}</ul>
            <label className="mt-5 flex items-center gap-3"><input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" /><span className="text-sm font-semibold text-amber-900">I have read and accept all the terms and conditions.</span></label>
          </div>

          {/* Risks */}
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-start gap-3"><AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-700" /><div><h4 className="text-base font-semibold text-rose-900">Risks & Effects on the Group</h4><p className="mt-1 text-sm text-rose-700">Group borrowing carries collective responsibility.</p></div></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">{GROUP_LOAN_RISKS.map((risk, i) => (
              <div key={i} className="rounded-lg border border-rose-200 bg-white p-4"><div className="flex items-start gap-3"><span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${risk.severity === "high" ? "bg-rose-100 text-rose-700" : risk.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{risk.severity.toUpperCase()}</span><div><p className="text-sm font-semibold text-rose-900">{risk.title}</p><p className="mt-1 text-sm leading-5 text-rose-700">{risk.description}</p></div></div></div>
            ))}</div>
            <label className="mt-5 flex items-center gap-3"><input type="checkbox" checked={risksAcknowledged} onChange={(e) => setRisksAcknowledged(e.target.checked)} className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500" /><span className="text-sm font-semibold text-rose-900">I acknowledge and understand all the risks involved.</span></label>
          </div>

          {/* Application Form */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><Send size={20} className="text-[#8cc63f]" /></div><div><h4 className="text-base font-semibold text-slate-950">Group Loan Application Form</h4><p className="text-sm text-slate-500">Fill in the details below to apply on behalf of your group.</p></div></div>

            <form onSubmit={handleGroupLoanSubmit} className="grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2"><span className="text-sm font-semibold text-slate-700">Select Group</span><select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"><option value="">-- Select a group --</option>{myGroups.map((group) => (<option key={group.id} value={group.id}>{group.name} ({group.members} members)</option>))}</select></label>

              {selectedGroupData && (<div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><div className="flex flex-wrap items-center gap-4 text-sm"><span className="font-semibold text-emerald-900">{selectedGroupData.name}</span><span className="text-emerald-700">{selectedGroupData.members} members</span><span className="text-emerald-700">Group savings pool: {formatCurrency(selectedGroupData.members * 5000)}</span><span className="text-emerald-700">Max eligible: {formatCurrency(selectedGroupData.members * 15000)}</span></div></div>)}

              <label className="block"><span className="text-sm font-semibold text-slate-700">Loan Amount (KES)</span><input type="number" value={loanForm.amount} onChange={(e) => setLoanForm((f) => ({ ...f, amount: e.target.value }))} placeholder="e.g. 150000" className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></label>
              <label className="block"><span className="text-sm font-semibold text-slate-700">Duration (months)</span><select value={loanForm.duration} onChange={(e) => setLoanForm((f) => ({ ...f, duration: e.target.value }))} className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"><option value="6">6 months</option><option value="12">12 months</option><option value="18">18 months</option><option value="24">24 months</option><option value="36">36 months</option></select></label>
              <label className="block md:col-span-2"><span className="text-sm font-semibold text-slate-700">Loan Purpose</span><textarea value={loanForm.purpose} onChange={(e) => setLoanForm((f) => ({ ...f, purpose: e.target.value }))} rows={3} placeholder="Describe what the group loan will be used for..." className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></label>

              {/* Group Guarantor Management */}
              <div className="md:col-span-2 rounded-lg border border-sky-200 bg-sky-50 p-4">
                <div className="mb-3 flex items-center gap-2"><UsersRound size={16} className="text-sky-700" /><span className="text-sm font-semibold text-sky-900">Group Guarantor Management</span><span className="rounded-full bg-sky-200 px-2 py-0.5 text-xs font-semibold text-sky-700">{groupGuarantors.length}/{GROUP_GUARANTOR_COUNT} selected</span></div>
                <p className="mb-3 text-xs text-sky-700">Select {GROUP_GUARANTOR_COUNT} active SACCO members to guarantee this group loan. Each must be an existing SACCO member who explicitly accepts to guarantee the group's loan liability.</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {MOCK_MEMBERS.map((member) => {
                    const isSelected = groupGuarantors.includes(member.id);
                    const acceptance = groupGuarantorAcceptance[member.id];
                    return (
                      <div key={member.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${isSelected ? acceptance === "accepted" ? "border-emerald-300 bg-emerald-50" : "border-sky-300 bg-white" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center gap-3"><input type="checkbox" checked={isSelected} onChange={() => toggleGroupGuarantor(member.id)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" /><div><p className="text-sm font-semibold text-slate-800">{member.name}</p><p className="text-xs text-slate-500">{member.phone} · Share: {formatCurrency(member.shareCapital)}</p></div></div>
                        {isSelected ? (acceptance === "accepted" ? (<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12} /> Accepted</span>) : (<button type="button" onClick={() => simulateGroupGuarantorAccept(member.id)} className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-700">Accept (simulate)</button>)) : null}
                      </div>
                    );
                  })}
                </div>
                {groupGuarantors.length > 0 && (<p className="mt-3 text-xs font-medium text-sky-700">Selected guarantors: {selectedGroupGuarantorNames}</p>)}
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={submitting || !selectedGroup || !termsAccepted || !risksAcknowledged || !loanForm.amount || !loanForm.purpose.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><Clock3 size={17} className="animate-spin text-[#8cc63f]" />Submitting...</> : <><Send size={17} className="text-[#8cc63f]" />Submit group loan application</>}</button>
                {!submitting && (<div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck size={16} className="text-[#8cc63f]" /><span>Joint liability applies — all group members are co-responsible.</span></div>)}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}