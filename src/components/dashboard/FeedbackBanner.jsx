import { useEffect } from "react";
import { X } from "lucide-react";

export default function FeedbackBanner({ feedback, onDismiss }) {
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  return (
    <div
      className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
        feedback.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current"
      >
        <X size={16} />
      </button>
    </div>
  );
}
