"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import PageNav from "@/components/PageNav";
import ProfileForm from "@/components/ProfileForm";

export default function ProfileSetupPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/profile");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      setHasProfile(Boolean(data.hasProfile));
      setChecking(false);
    }

    load();
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-slate-900">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white p-6 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* While profile setup is still mandatory, the brand is not a link. */}
          <Brand linked={hasProfile} />
          {hasProfile && <PageNav />}
        </div>

        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          {hasProfile ? "Edit your profile" : "Tell us who you are"}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Please use your real first and last name. The leaderboard shows only
          your first name and the initial of your last name. Your date of birth stays private — other users never see it.
        </p>

        <div className="mt-6">
          <ProfileForm
            submitLabel={hasProfile ? "Save" : "Continue"}
            onSaved={() => {
              router.push("/");
              router.refresh();
            }}
          />
        </div>
      </div>
    </main>
  );
}
