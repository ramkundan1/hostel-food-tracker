"use client";

import { useRouter } from "next/navigation";

// Back returns to wherever the person actually came from; Home always goes to
// the dashboard. They are deliberately separate buttons.
export default function PageNav() {
  const router = useRouter();

  function goBack() {
    // If the page was opened directly there is no history to go back to.
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <div className="no-print flex gap-2">
      <button
        type="button"
        onClick={goBack}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Back
      </button>
      <button
        type="button"
        onClick={() => router.push("/")}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Home
      </button>
    </div>
  );
}
