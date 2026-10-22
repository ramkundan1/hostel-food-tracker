"use client";

import { FormEvent, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import nepaliDateConverter from "nepali-date-converter";
import { Trophy, Gift, Utensils } from "lucide-react";
import Brand from "@/components/Brand";
import PageNav from "@/components/PageNav";
import ProfileForm from "@/components/ProfileForm";
import { NEPALI_MONTHS } from "@/components/NepaliDatePicker";

type Profile = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
};

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 mt-8 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h2>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {children}
    </div>
  );
}

function NavRow({
  icon: Icon,
  title,
  text,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-slate-500">{text}</span>
      </span>
      <span aria-hidden="true" className="text-xl text-slate-300">
        ›
      </span>
    </button>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <p className="shrink-0 text-sm text-slate-500">{label}</p>
      <div className="min-w-0 text-right">{children}</div>
    </div>
  );
}

function dobText(dateOfBirth: string): { main: string; sub: string } {
  if (!dateOfBirth) return { main: "Not set", sub: "" };

  const english = new Date(dateOfBirth + "T00:00:00");
  const nepali = new nepaliDateConverter(english);

  return {
    main: `${NEPALI_MONTHS[nepali.getMonth()]} ${nepali.getDate()}, ${nepali.getYear()}`,
    sub: english.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  const [loggingOut, setLoggingOut] = useState(false);
  const [resetState, setResetState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const [deleteStep, setDeleteStep] = useState<"idle" | "code" | "sending">("idle");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteError, setDeleteError] = useState("");

  async function loadProfile() {
    const res = await fetch("/api/profile");

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    setProfile(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function sendResetLink() {
    if (!profile) return;

    setResetState("sending");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email }),
    });

    setResetState(res.ok ? "sent" : "error");
  }

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

  if (loading || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-slate-900">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  const fullName = [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(" ");
  const dob = dobText(profile.dateOfBirth);

  return (
    <main className="min-h-dvh bg-slate-50 p-4 pb-16 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Brand />
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Settings
            </h1>
          </div>
          <PageNav />
        </div>

        {notice && (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        <SectionTitle>Shortcuts</SectionTitle>
        <Group>
          <NavRow
            icon={Trophy}
            title="Leaderboard"
            text="Your points, streak and badges"
            onClick={() => router.push("/leaderboard")}
          />
          <NavRow
            icon={Gift}
            title="Rewards"
            text="Redeem points for automatic meal entries"
            onClick={() => router.push("/rewards")}
          />
          <NavRow
            icon={Utensils}
            title="Update prices"
            text="What a meal, egg, curd and chicken cost"
            onClick={() => router.push("/?prices=1")}
          />
          {profile.isAdmin && (
            <NavRow
              icon={ShieldIcon}
              title="Admin console"
              text="Users, rewards and account controls"
              onClick={() => router.push("/admin")}
            />
          )}
        </Group>

        <SectionTitle>Account details</SectionTitle>
        <Group>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <p className="font-semibold">Profile</p>
            <button
              onClick={() => setEditing((current) => !current)}
              className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>

          {editing ? (
            <div className="p-4">
              <ProfileForm
                submitLabel="Save changes"
                onSaved={() => {
                  setEditing(false);
                  setNotice("Profile updated.");
                  setTimeout(() => setNotice(""), 3000);
                  loadProfile();
                }}
              />
            </div>
          ) : (
            <>
              <DetailRow label="Name">
                <p className="break-words font-medium">{fullName || "Not set"}</p>
              </DetailRow>
              <DetailRow label="Date of birth">
                <p className="font-medium">{dob.main}</p>
                {dob.sub && <p className="text-xs text-slate-400">{dob.sub}</p>}
              </DetailRow>
              <DetailRow label="Email">
                <p className="break-all font-medium">{profile.email}</p>
                <p
                  className={`text-xs ${
                    profile.emailVerified ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {profile.emailVerified ? "Verified" : "Not verified"}
                </p>
              </DetailRow>
            </>
          )}
        </Group>
        <p className="mt-2 px-1 text-xs text-slate-400">
          The leaderboard shows only your first name and last initial. Your date
          of birth is never shown to other users.
        </p>

        <div className="mt-8">
          <button
            onClick={logout}
            disabled={loggingOut}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>

        <SectionTitle>Manage your account</SectionTitle>
        <Group>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">Password</p>
                <p className="text-sm text-slate-500">
                  We&apos;ll email you a link to choose a new one.
                </p>
              </div>
              <button
                onClick={sendResetLink}
                disabled={resetState === "sending" || resetState === "sent"}
                className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {resetState === "sending"
                  ? "Sending..."
                  : resetState === "sent"
                    ? "Sent"
                    : "Send link"}
              </button>
            </div>

            {resetState === "sent" && (
              <p className="mt-3 text-sm text-emerald-700">
                Check {profile.email} for the link. It expires in 1 hour.
              </p>
            )}
            {resetState === "error" && (
              <p className="mt-3 text-sm text-red-600">
                Couldn&apos;t send that. Try again in a few minutes.
              </p>
            )}
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-red-700">Delete account</p>
                <p className="text-sm text-slate-500">
                  Permanently removes your account, meals, prices and points.
                </p>
              </div>

              {deleteStep === "idle" && (
                <button
                  onClick={startDelete}
                  className="shrink-0 rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>

            {deleteStep === "sending" && (
              <p className="mt-3 text-sm text-slate-500">
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

            {deleteStep === "idle" && deleteError && (
              <p className="mt-3 text-sm text-red-600">{deleteError}</p>
            )}
          </div>
        </Group>

        <SectionTitle>Help &amp; feedback</SectionTitle>
        <Group>
          <div className="p-4">
            <p className="text-sm text-slate-500">
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
          </div>
        </Group>
      </div>
    </main>
  );
}
