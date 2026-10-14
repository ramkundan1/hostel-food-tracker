"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import PageNav from "@/components/PageNav";
import ProfileForm from "@/components/ProfileForm";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const [deleteStep, setDeleteStep] = useState<"idle" | "code" | "sending">("idle");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/auth/me");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      setLoading(false);
    }

    check();
  }, [router]);

  async function submitFeedback(event: FormEvent) {
    event.preventDefault();
    setFeedbackError("");

    if (feedback.trim().length < 5) {
      setFeedbackError("Write a little more so it's useful.");
      return;
    }

    setSendingFeedback(true);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: feedback }),
    });

    const data = await res.json();
    setSendingFeedback(false);

    if (!res.ok) {
      setFeedbackError(data.error ?? "Couldn't send that. Try again.");
      return;
    }

    setFeedback("");
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 4000);
  }

  async function startDelete() {
    const confirmed = window.confirm(
      "Delete your account? This removes every meal entry, price, and point permanently. We'll email you a code to confirm."
    );

    if (!confirmed) return;

    setDeleteStep("sending");
    setDeleteError("");

    const res = await fetch("/api/auth/request-delete", { method: "POST" });

    if (!res.ok) {
      setDeleteError("Couldn't send a code. Try again in a moment.");
      setDeleteStep("idle");
      return;
    }

    setDeleteStep("code");
  }

  async function confirmDelete(event: FormEvent) {
    event.preventDefault();
    setDeleteError("");

    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: deleteCode }),
    });

    const data = await res.json();

    if (!res.ok) {
      setDeleteError(data.error ?? "Something went wrong.");
      return;
    }

    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-slate-900">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white p-6 text-slate-900">
      <div className="mx-auto max-w-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Brand />
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
              Settings
            </h1>
          </div>
          <PageNav />
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-slate-500">
            The leaderboard shows your first name and the initial of your last
            name. Your age is never shown to anyone.
          </p>

          <div className="mt-5">
            <ProfileForm submitLabel="Save changes" onSaved={() => {}} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold">Feedback</h2>
          <p className="mt-1 text-sm text-slate-500">
            Found a bug, or have an idea? Tell us directly.
          </p>

          {feedbackSent ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Sent — thank you.
            </p>
          ) : (
            <form onSubmit={submitFeedback} className="mt-4 space-y-3">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                maxLength={2000}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              {feedbackError && (
                <p className="text-sm text-red-600">{feedbackError}</p>
              )}

              <button
                type="submit"
                disabled={sendingFeedback}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingFeedback ? "Sending..." : "Send feedback"}
              </button>
            </form>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-red-200 p-5">
          <h2 className="font-semibold text-red-700">Delete account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Permanently removes your account, meal history, prices, and
            points. This can't be undone.
          </p>

          {deleteStep === "idle" && (
            <button
              onClick={startDelete}
              className="mt-4 rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Delete my account
            </button>
          )}

          {deleteStep === "sending" && (
            <p className="mt-4 text-sm text-slate-500">
              Sending a code to your email...
            </p>
          )}

          {deleteStep === "code" && (
            <form onSubmit={confirmDelete} className="mt-4 space-y-3">
              <p className="text-sm text-slate-600">
                Enter the 6-digit code we emailed you. It expires in 15 minutes.
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={deleteCode}
                onChange={(e) => setDeleteCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full rounded-xl border border-slate-300 p-3 text-center text-lg tracking-[0.5em] outline-none focus:border-red-400"
              />

              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Permanently delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteStep("idle");
                    setDeleteCode("");
                    setDeleteError("");
                  }}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
