import { useState } from "react";
import { UsersRound, FileText, AlertTriangle, CheckCircle2, Plus, ShieldCheck, Clock3, BadgeCheck, Send } from "lucide-react";

function formatCurrency(v) { return `KES ${Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }

const MOCK_GROUPS = [
  { id: "g1", name: "Teachers Welfare Group", members: 24, description: "Teachers contributing to welfare and development loans.", joined: true, created: "2025-01-15" },
  { id: "g2", name: "Small Business Owners", members: 18, description: "Entrepreneurs pooling resources for business expansion loans.", joined: true, created: "2025-03-22" },
  { id: "g3", name: "Farmers Cooperative", members: 35, description: "Agricultural group seeking seasonal input and equipment financing.", joined: false, created: "2024-11-08" },
  { id: "g4", name: "Youth Empowerment Circle", members: 42, description: "Young professionals saving for education and startup capital.", joined: false, created: "2025-06-01" },
];

const TERMS = [
  "All group members must have been active for at least 6 months.",
  "The group must have a minimum of 5 contributing members.",
  "At least 60% of group members must have fully paid their share capital.",
  "Group must nominate a chairperson and secretary as loan signatories.",
  "Group loans are disbursed to a designated group account, not to individuals.",
  "Repayment is made collectively — each member is jointly liable.",
  "One defaulting member can affect the entire group's credit rating.",
  "Late repayments incur an additional 2% penalty per month on outstanding balance.",
  "Groups must hold a meeting and pass a resolution authorizing the loan application.",
  "Loan amount is capped at 3× the group's total pooled savings.",
];

const RISKS = [
  { title: "Joint Liability", desc: "Every group member is equally responsible. One default impacts all members' creditworthiness.", severity: "high" },
  { title: "Credit Rating Impact", desc: "A missed repayment lowers the group's SACCO rating, affecting all members' individual loan access.", severity: "high" },
  { title: "Social Pressure", desc: "Defaulting members may face community pressure and potential exclusion.", severity: "medium" },
  { title: "Asset Freezing", desc: "The SACCO reserves the right to freeze pooled savings/share capital to recover defaults.", severity: "high" },
  { title: "Limited Individual Borrowing", desc: "During active group loans, members may face restrictions on personal loan applications.", severity: "medium" },
  { title: "Dispute Resolution", desc: "Internal disputes go through SACCO mediation before legal recourse.", severity: "low" },
];

const MEMBERS = [
  { id: "m1", name: "Jane Muthoni", phone: "+254712345678", shareCapital: 28000 },
  { id: "m2", name: "Peter Kamau", phone: "+254723456789", shareCapital: 35000 },
  { id: "m3", name: "Grace Achieng", phone: "+254734567890", shareCapital: 25000 },
  { id: "m4", name: "David Otieno", phone: "+254745678901", shareCapital: 42000 },
  { id: "m5", name: "Faith Wanjiku", phone: "+254756789012", shareCapital: 30000 },
  { id: "m6", name: "John Njoroge", phone: "+254767890123", shareCapital: 22000 },
  { id: "m7", name: "Alice Wambui", phone: "+254778901234", shareCapital: 38000 },
  { id: "m8", name: "Michael Kiprop", phone: "+254789012345", shareCapital: 27000 },
];

export default function GroupsPage({ user, accessToken, stats, onRefresh }) {
  const [tab, setTab] = useState("my-groups");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loan, setLoan] = useState({ amount: "", purpose: "", duration: "12" });
  const [msg, setMsg] = useState(null);
  const [termsOk, setTermsOk] = useState(false);
  const [risksOk, setRisksOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guarantors, setGuarantors] = useState([]);
  const [acceptance, setAcceptance] = useState({});
  const G_COUNT = 3;

  const myGroups = MOCK_GROUPS.filter(g => g.joined);
  const availGroups = MOCK_GROUPS.filter(g => !g.joined);
  const groupData = MOCK_GROUPS.find(g => g.id === selectedGroup);
  const gNames = guarantors.map(id => MEMBERS.find(m => m.id === id)?.name || id).join(", ");

  function toggleG(id) { setGuarantors(p => { if (p.includes(id)) { setAcceptance(a => { const n = { ...a }; delete n[id]; return n; }); return p.filter(x => x !== id); } if (p.length >= G_COUNT) return p; return [...p, id]; }); }
  function acceptG(id) { setAcceptance(p => ({ ...p, [id]: "accepted" })); }

  async function submit(e) {
    e.preventDefault();
    if (!selectedGroup) { setMsg({ type: "error", text: "Select a group." }); return; }
    if (!loan.amount || Number(loan.amount) <= 0) { setMsg({ type: "error", text: "Enter a valid loan amount." }); return; }
    if (!loan.purpose.trim()) { setMsg({ type: "error", text: "Describe the purpose." }); return; }
    if (!termsOk) { setMsg({ type: "error", text: "Accept terms." }); return; }
    if (!risksOk) { setMsg({ type: "error", text: "Acknowledge risks." }); return; }
    if (guarantors.length < G_COUNT) { setMsg({ type: "error", text: `${G_COUNT} guarantors required.` }); return; }
    if (guarantors.some(id => acceptance[id] !== "accepted")) { setMsg({ type: "error", text: "All guarantors must accept." }); return; }
    setSubmitting(true); setMsg(null);
    try { await new Promise(r => setTimeout(r, 1500)); setMsg({ type: "success", text: `Loan for "${groupData?.name}" submitted. Guarantors notified.` }); setLoan({ amount: "", purpose: "", duration: "12" }); setTermsOk(false); setRisksOk(false); setGuarantors([]); setAcceptance({}); onRefresh?.(); }
    catch (err) { setMsg({ type: "error", text: err.message }); }
    finally { setSubmitting(false); }
  }

  return (<div className="space-y-6">
    <div className="rounded-lg border border-slate-200 bg-[linear-gradient(135deg,#07182d_0%,#0f3443_48%,#155e3f_100%)] p-6 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-[#8cc63f]">Member Groups</p><h2 className="mt-1 text-2xl font-semibold">Group Workspace</h2><p className="mt-2 max-w-xl text-sm text-slate-300">Join or create groups to pool resources, save collectively, and apply for group loans.</p></div><button onClick={()=>setTab("apply-loan")} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-white"><Send size={16} className="text-[#8cc63f]"/>Apply for group loan</button></div>
    </div>

    <div className="flex gap-2 border-b border-slate-200 pb-3">
      {[{k:"my-groups",l:`My Groups (${myGroups.length})`},{k:"available",l:`Available (${availGroups.length})`},{k:"apply-loan",l:"Loan Application"}].map(t=>(<button key={t.k} onClick={()=>setTab(t.k)} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab===t.k?"bg-slate-950 text-white":"bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{t.l}</button>))}
    </div>

    {msg&&<div className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}

    {tab==="my-groups"&&<div className="space-y-4">{myGroups.length===0?<div className="rounded-lg border bg-white p-12 text-center"><UsersRound size={40} className="mx-auto text-slate-300"/><h4 className="mt-4 text-base font-semibold">No groups yet</h4></div>:myGroups.map(g=>(<div key={g.id} className="rounded-lg border bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50"><UsersRound size={22} className="text-[#8cc63f]"/></div><div><h4 className="text-base font-semibold">{g.name}</h4><p className="mt-1 text-sm text-slate-500">{g.description}</p><div className="mt-3 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold"><UsersRound size={12}/>{g.members} members</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><BadgeCheck size={12}/>Joined</span></div></div></div><button onClick={()=>{setSelectedGroup(g.id);setTab("apply-loan");}} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"><FileText size={16}/>Apply group loan</button></div></div>))}</div>}

    {tab==="available"&&<div className="space-y-4">{availGroups.map(g=>(<div key={g.id} className="rounded-lg border bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100"><UsersRound size={22} className="text-slate-400"/></div><div><h4 className="text-base font-semibold">{g.name}</h4><p className="mt-1 text-sm text-slate-500">{g.description}</p><div className="mt-3 flex items-center gap-3"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold"><UsersRound size={12}/>{g.members} members</span></div></div></div><button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} className="text-[#8cc63f]"/>Request to join</button></div></div>))}</div>}

    {tab==="apply-loan"&&<div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><FileText size={20} className="mt-0.5 shrink-0 text-amber-700"/><div><h4 className="text-base font-semibold text-amber-900">Terms & Conditions</h4></div></div><ul className="mt-4 space-y-3">{TERMS.map((t,i)=>(<li key={i} className="flex items-start gap-3 text-sm text-amber-800"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-700">{i+1}</span><span>{t}</span></li>))}</ul><label className="mt-5 flex items-center gap-3"><input type="checkbox" checked={termsOk} onChange={e=>setTermsOk(e.target.checked)} className="h-4 w-4 rounded border-amber-300"/><span className="text-sm font-semibold text-amber-900">I accept all terms.</span></label></div>

      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5"><div className="flex items-start gap-3"><AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-700"/><div><h4 className="text-base font-semibold text-rose-900">Risks & Effects</h4></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{RISKS.map((r,i)=>(<div key={i} className="rounded-lg border border-rose-200 bg-white p-4"><div className="flex items-start gap-3"><span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.severity==="high"?"bg-rose-100 text-rose-700":r.severity==="medium"?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600"}`}>{r.severity.toUpperCase()}</span><div><p className="text-sm font-semibold text-rose-900">{r.title}</p><p className="mt-1 text-sm leading-5 text-rose-700">{r.desc}</p></div></div></div>))}</div><label className="mt-5 flex items-center gap-3"><input type="checkbox" checked={risksOk} onChange={e=>setRisksOk(e.target.checked)} className="h-4 w-4 rounded border-rose-300"/><span className="text-sm font-semibold text-rose-900">I acknowledge all risks.</span></label></div>

      <div className="rounded-lg border bg-white p-5">
        <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><Send size={20} className="text-[#8cc63f]"/></div><div><h4 className="text-base font-semibold">Group Loan Application</h4></div></div>
        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
          <label className="block md:col-span-2"><span className="text-sm font-semibold text-slate-700">Select Group</span><select value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm"><option value="">-- Select --</option>{myGroups.map(g=>(<option key={g.id} value={g.id}>{g.name} ({g.members} members)</option>))}</select></label>
          {groupData&&<div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><div className="flex flex-wrap items-center gap-4 text-sm"><span className="font-semibold text-emerald-900">{groupData.name}</span><span className="text-emerald-700">{groupData.members} members</span><span className="text-emerald-700">Pool: {formatCurrency(groupData.members*5000)}</span><span className="text-emerald-700">Max: {formatCurrency(groupData.members*15000)}</span></div></div>}
          <label className="block"><span className="text-sm font-semibold text-slate-700">Amount (KES)</span><input type="number" value={loan.amount} onChange={e=>setLoan(f=>({...f,amount:e.target.value}))} placeholder="e.g. 150000" className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm"/></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Duration</span><select value={loan.duration} onChange={e=>setLoan(f=>({...f,duration:e.target.value}))} className="mt-2 w-full rounded-lg border px-3.5 py-3 text-sm"><option value="6">6 months</option><option value="12">12 months</option><option value="18">18 months</option><option value="24">24 months</option><option value="36">36 months</option></select></label>
          <label className="block md:col-span-2"><span className="text-sm font-semibold text-slate-700">Purpose</span><textarea value={loan.purpose} onChange={e=>setLoan(f=>({...f,purpose:e.target.value}))} rows={3} placeholder="Describe what the loan is for..." className="mt-2 w-full resize-y rounded-lg border px-3.5 py-3 text-sm"/></label>

          <div className="md:col-span-2 rounded-lg border border-sky-200 bg-sky-50 p-4">
            <div className="mb-3 flex items-center gap-2"><UsersRound size={16} className="text-sky-700"/><span className="text-sm font-semibold text-sky-900">Group Guarantors</span><span className="rounded-full bg-sky-200 px-2 py-0.5 text-xs font-semibold text-sky-700">{guarantors.length}/{G_COUNT}</span></div>
            <p className="mb-3 text-xs text-sky-700">Select {G_COUNT} active SACCO members. Each must explicitly accept.</p>
            <div className="max-h-48 space-y-2 overflow-y-auto">{MEMBERS.map(m=>{const sel=guarantors.includes(m.id);const ok=acceptance[m.id];return(<div key={m.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${sel?ok==="accepted"?"border-emerald-300 bg-emerald-50":"border-sky-300 bg-white":"border-slate-200 bg-white"}`}><div className="flex items-center gap-3"><input type="checkbox" checked={sel} onChange={()=>toggleG(m.id)} className="h-4 w-4 rounded border-slate-300"/><div><p className="text-sm font-semibold">{m.name}</p><p className="text-xs text-slate-500">{m.phone} · {formatCurrency(m.shareCapital)}</p></div></div>{sel&&(ok==="accepted"?<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12}/>Accepted</span>:<button type="button" onClick={()=>acceptG(m.id)} className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">Accept (simulate)</button>)}</div>);})}</div>
            {guarantors.length>0&&<p className="mt-3 text-xs font-medium text-sky-700">Selected: {gNames}</p>}
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={submitting||!selectedGroup||!termsOk||!risksOk||!loan.amount||!loan.purpose.trim()} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{submitting?<><Clock3 size={17} className="animate-spin"/>Submitting...</>:<><Send size={17} className="text-[#8cc63f]"/>Submit application</>}</button>
            <div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck size={16} className="text-[#8cc63f]"/><span>Joint liability — all members co-responsible.</span></div>
          </div>
        </form>
      </div>
    </div>}
  </div>);
}