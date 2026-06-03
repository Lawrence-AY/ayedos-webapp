import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Headphones,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { toast } from "sonner";

const contactDetails = [
  {
    label: "Call",
    value: "+254 733 556 617",
    href: "tel:+254733556617",
    icon: Phone,
  },
  {
    label: "Email",
    value: "info@cowrie.io",
    href: "mailto:info@cowrie.io",
    icon: Mail,
  },
  {
    label: "Visit",
    value: "1st Floor Africa Reit House, Karen",
    helper: "Nairobi, Kenya",
    href: "https://www.google.com/maps/search/?api=1&query=1st%20Floor%20Africa%20Reit%20House%20Karen%20Nairobi%20Kenya",
    icon: MapPin,
  },
];

const inquiryTypes = [
  "General inquiry",
  "Savings and contributions",
  "Loan support",
  "Account update",
  "Feedback",
];

function buildMailtoUrl({ user, form }) {
  const memberName =
    form.name ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Member";
  const memberEmail = form.email || user?.email || "";
  const memberPhone = form.phone || user?.phone || user?.phoneNumber || "";
  const subject = `AYEDOS SACCO ${form.type}: ${form.subject}`;
  const body = [
    `Name: ${memberName}`,
    memberEmail ? `Email: ${memberEmail}` : null,
    memberPhone ? `Phone: ${memberPhone}` : null,
    `Inquiry type: ${form.type}`,
    "",
    "Message:",
    form.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `mailto:info@cowrie.io?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function SupportPage({ user }) {
  const initialName =
    user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const [form, setForm] = useState({
    name: initialName || "",
    email: user?.email || "",
    phone: user?.phone || user?.phoneNumber || "",
    type: "General inquiry",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const charactersLeft = useMemo(
    () => Math.max(0, 800 - form.message.length),
    [form.message.length],
  );

  function updateField(field, value) {
    setSubmitted(false);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const missingFields = [
      ["name", "your name"],
      ["email", "your email"],
      ["subject", "a subject"],
      ["message", "your message"],
    ].filter(([field]) => !String(form[field] || "").trim());

    if (missingFields.length) {
      toast.error(`Please add ${missingFields[0][1]}.`);
      return;
    }

    window.location.href = buildMailtoUrl({ user, form });
    setSubmitted(true);
    toast.success("Your inquiry has been prepared for email.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-950 text-[#8cc63f]">
            <Headphones size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-[#8cc63f]">
              Member support
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              Reach us
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Monday - Friday, 8am - 5pm (GMT +3)
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {contactDetails.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.label === "Visit" ? "_blank" : undefined}
              rel={item.label === "Visit" ? "noreferrer" : undefined}
              className="group flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#8cc63f] ring-1 ring-slate-200">
                  <item.icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-normal text-slate-500">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-950">
                    {item.value}
                  </span>
                  {item.helper ? (
                    <span className="mt-1 block text-xs font-medium text-slate-500">
                      {item.helper}
                    </span>
                  ) : null}
                </span>
              </span>
              <ArrowUpRight
                size={17}
                className="shrink-0 text-slate-400 transition group-hover:text-emerald-700"
              />
            </a>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
          <Clock3 size={18} className="shrink-0" />
          Responses are handled during working hours.
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-normal text-slate-950">
              Send feedback or inquiry
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Fill in the details below and the message will be prepared for
              email.
            </p>
          </div>
          {submitted ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 size={14} />
              Prepared
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Name
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              placeholder="Your full name"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              placeholder="you@example.com"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Phone
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              placeholder="+254..."
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Inquiry type
            <select
              value={form.type}
              onChange={(event) => updateField("type", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              {inquiryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Subject
          <input
            value={form.subject}
            onChange={(event) => updateField("subject", event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            placeholder="What do you need help with?"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Message
          <textarea
            value={form.message}
            maxLength={800}
            onChange={(event) => updateField("message", event.target.value)}
            className="mt-2 min-h-36 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium leading-6 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            placeholder="Share your feedback, question, or the issue you need support with."
          />
        </label>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">
            {charactersLeft} characters left
          </p>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Send size={17} className="text-[#8cc63f]" />
            Send inquiry
          </button>
        </div>
      </form>
    </div>
  );
}
