"use client";

import { FormEvent, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import nepaliDateConverter from "nepali-date-converter";
import { Gift, Utensils } from "lucide-react";
import Brand from "@/components/Brand";
import PageNav from "@/components/PageNav";
import ProfileForm from "@/components/ProfileForm";
import { NEPALI_MONTHS } from "@/components/NepaliDatePicker";
import { ageFrom, MIN_AGE } from "@/lib/age";

type Profile = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  nameChangeAvailableAt: string | null;
};

type View = "home" | "profile" | "name" | "dob" | "email" | "manage" | "help";

const TITLES: Record<View, string> = {
  home: "Settings",
  profile: "Profile",
  name: "Name",
  dob: "Date of birth",
  email: "Email",
  manage: "Manage your account",
  help: "Help & feedback",
};

// Where the back button on each screen goes.
const PARENTS: Record<View, View | null> = {
  home: null,
  profile: "home",
  name: "profile",
  dob: "profile",
  email: "profile",
  manage: "home",
  help: "home",
};

function SvgIcon({ className, children }: { className?: string; children: ReactNode }) {
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
      {children}
    </svg>
  );
}

const ShieldIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}>
    <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </SvgIcon>
);

const UserIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </SvgIcon>
);

const LockIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </SvgIcon>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <SvgIcon className={className}>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
  </SvgIcon>
);

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

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
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
  icon?: ComponentType<{ className?: string }>;
  title: string;
  text?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50"
    >
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        {text && <span className="block text-sm text-slate-500">{text}</span>}
      </span>
      <span aria-hidden="true" className="text-xl text-slate-300">
        ›
      </span>
    </button>
  );
}

const longDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

function dobText(dateOfBirth: string): { main: string; sub: string } {
  if (!dateOfBirth) return { main: "Not set", sub: "" };

  const english = new Date(dateOfBirth + "T00:00:00");
  const nepali = new nepaliDateConverter(english);
  const age = ageFrom(dateOfBirth);

  return {
    main: `${NEPALI_MONTHS[nepali.getMonth()]} ${nepali.getDate()}, ${nepali.getYear()}`,
    sub: `${longDate(english)}${age !== null ? ` · ${age} years old` : ""}`,
  };
}

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("home");
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

  function go(next: View) {
    setView(next);
    setEditing(false);
    window.scrollTo(0, 0);
  }

  function saved(message: string) {
    setEditing(false);
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
    loadProfile();
  }

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
  const nameLocked = Boolean(profile.nameChangeAvailableAt);
  const parent = PARENTS[view];

  const editButton =
    "mt-4 rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";

  return (
    <main className="min-h-dvh bg-slate-50 p-4 pb-16 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Brand />
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {TITLES[view]}
            </h1>
          </div>

          {parent === null ? (
            <PageNav />
          ) : (
            <button
              onClick={() => go(parent)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ‹ {TITLES[parent]}
            </button>
          )}
        </div>

        {notice && (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        {view === "home" && (
          <>
            <SectionTitle>Shortcuts</SectionTitle>
            <Group>
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
              <NavRow
                icon={UserIcon}
                title="Profile"
                text="Name, date of birth and email"
                onClick={() => go("profile")}
              />
              <NavRow
                icon={LockIcon}
                title="Manage your account"
                text="Reset your password or delete your account"
                onClick={() => go("manage")}
              />
            </Group>

            <SectionTitle>Support</SectionTitle>
            <Group>
              <NavRow
                icon={ChatIcon}
                title="Help & feedback"
                text="Report a problem or share an idea"
                onClick={() => go("help")}
              />
            </Group>

            <div className="mt-10">
              <button
                onClick={logout}
                disabled={loggingOut}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </>
        )}

        {view === "profile" && (
          <div className="mt-6">
            <Group>
              <NavRow
                title="Name"
                text="View or change your name"
                onClick={() => go("name")}
              />
              <NavRow
                title="Date of birth"
                text="View or change your date of birth"
                onClick={() => go("dob")}
              />
              <NavRow
                title="Email"
                text="View your email address"
                onClick={() => go("email")}
              />
            </Group>
          </div>
        )}

        {view === "name" && (
          <>
            <Card>
              <p className="text-sm text-slate-500">Your name</p>
              <p className="mt-1 break-words text-2xl font-semibold">
                {fullName || "Not set"}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                {nameLocked && profile.nameChangeAvailableAt
                  ? `You changed your name recently. You can change it again on ${longDate(profile.nameChangeAvailableAt)}.`
                  : "You can change your name once every 30 days. Use your real first and last name."}
              </p>

              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  disabled={nameLocked}
                  className={editButton}
                >
                  Edit name
                </button>
              )}
            </Card>

            {editing && (
              <Card>
                <ProfileForm
                  fields="name"
                  submitLabel="Save name"
                  onSaved={() => saved("Name updated.")}
                />
              </Card>
            )}
          </>
        )}

        {view === "dob" && (
          <>
            <Card>
              <p className="text-sm text-slate-500">Your date of birth</p>
              <p className="mt-1 text-2xl font-semibold">{dob.main}</p>
              {dob.sub && <p className="mt-1 text-sm text-slate-500">{dob.sub}</p>}
              <p className="mt-3 text-sm text-slate-500">
                You must be at least {MIN_AGE} years old to use e-tracker. Only
                you and the e-tracker admin can see this.
              </p>

              {!editing && (
                <button onClick={() => setEditing(true)} className={editButton}>
                  Edit date of birth
                </button>
              )}
            </Card>

            {editing && (
              <Card>
                <ProfileForm
                  fields="dob"
                  submitLabel="Save date of birth"
                  onSaved={() => saved("Date of birth updated.")}
                />
              </Card>
            )}
          </>
        )}

        {view === "email" && (
          <Card>
            <p className="text-sm text-slate-500">Your email</p>
            <p className="mt-1 break-all text-xl font-semibold">{profile.email}</p>
            <p
              className={`mt-1 text-sm ${
                profile.emailVerified ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {profile.emailVerified ? "Verified" : "Not verified"}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              This is the address you sign in with and where password reset links
              are sent. It can&apos;t be changed here yet.
            </p>
          </Card>
        )}

        {view === "manage" && (
          <>
            <Card>
              <h2 className="font-semibold">Reset password</h2>
              <p className="mt-1 text-sm text-slate-500">
                We&apos;ll email {profile.email} a link to choose a new password.
              </p>

              <button
                onClick={sendResetLink}
                disabled={resetState === "sending" || resetState === "sent"}
                className={editButton}
              >
                {resetState === "sending"
                  ? "Sending..."
                  : resetState === "sent"
                    ? "Link sent"
                    : "Send reset link"}
              </button>

              {resetState === "sent" && (
                <p className="mt-3 text-sm text-emerald-700">
                  Check your inbox. The link expires in 1 hour.
                </p>
              )}
              {resetState === "error" && (
                <p className="mt-3 text-sm text-red-600">
                  Couldn&apos;t send that. Try again in a few minutes.
                </p>
              )}
            </Card>

            <div className="mt-6 rounded-2xl border border-red-200 bg-white p-5">
              <h2 className="font-semibold text-red-700">Delete your account</h2>
              <p className="mt-1 text-sm text-slate-500">
                Permanently removes your account, meals, prices and points. This
                can&apos;t be undone.
              </p>

              {deleteStep === "idle" && (
                <button
                  onClick={startDelete}
                  className="mt-4 rounded-full border border-red-300 px-5 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete my account
                </button>
              )}

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
          </>
        )}

        {view === "help" && (
          <Card>
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
                  rows={5}
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
          </Card>
        )}
      </div>
    </main>
  );
}
