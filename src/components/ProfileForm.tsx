"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkName } from "@/lib/nameRules";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

export default function ProfileForm({
  submitLabel = "Save",
  onSaved,
}: {
  submitLabel?: string;
  onSaved: () => void;
}) {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/profile");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      setFirstName(data.firstName ?? "");
      setMiddleName(data.middleName ?? "");
      setLastName(data.lastName ?? "");
      setAge(data.age ? String(data.age) : "");
      setReady(true);
    }

    load();
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);

    const check = checkName({ firstName, middleName, lastName });

    if (!check.ok) {
      setError(check.error);
      return;
    }

    const ageNumber = Number(age);

    if (!Number.isInteger(ageNumber) || ageNumber < 5 || ageNumber > 120) {
      setError("Enter a valid age.");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, middleName, lastName, age: ageNumber }),
    });

    const data = await res.json();

    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    // Show the tidied-up version the server saved (e.g. "ram" -> "Ram").
    setFirstName(check.firstName);
    setMiddleName(check.middleName);
    setLastName(check.lastName);

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved();
  }

  if (!ready) {
    return <p className="text-sm text-slate-400">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="firstName" className={labelClass}>
          First name
        </label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          required
          maxLength={30}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="middleName" className={labelClass}>
          Middle name{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="middleName"
          type="text"
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          autoComplete="additional-name"
          maxLength={30}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="lastName" className={labelClass}>
          Last name
        </label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
          required
          maxLength={30}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="age" className={labelClass}>
          Age
        </label>
        <input
          id="age"
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
          min={5}
          max={120}
          className={inputClass}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : submitLabel}
        </button>

        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
