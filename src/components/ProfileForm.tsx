"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import nepaliDateConverter from "nepali-date-converter";
import { checkName, type NameCheck } from "@/lib/nameRules";
import { ageFrom, MIN_AGE } from "@/lib/age";
import {
  NEPALI_MONTHS,
  nepaliDateError,
  nepaliToAdString,
  todayNepali,
} from "@/components/NepaliDatePicker";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

const selectClass =
  "w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

// "all" is the first-time setup. Settings uses "name" and "dob" so each can be
// changed on its own.
export default function ProfileForm({
  submitLabel = "Save",
  fields = "all",
  onSaved,
}: {
  submitLabel?: string;
  fields?: "all" | "name" | "dob";
  onSaved: () => void;
}) {
  const router = useRouter();

  const showName = fields !== "dob";
  const showDob = fields !== "name";

  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  // Date of birth in the Nepali calendar; empty until chosen.
  const [dobYear, setDobYear] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = todayNepali();
  // Newest year first. Anyone born later than this is under the minimum age.
  const years = Array.from({ length: 96 }, (_, i) => today.year - MIN_AGE - i);

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
      setLockedUntil(data.nameChangeAvailableAt ?? null);

      if (data.dateOfBirth) {
        // Stored as an English date; show it in the Nepali calendar.
        const bs = new nepaliDateConverter(
          new Date(data.dateOfBirth + "T00:00:00")
        );

        setDobYear(String(bs.getYear()));
        setDobMonth(String(bs.getMonth()));
        setDobDay(String(bs.getDate()));
      }

      setReady(true);
    }

    load();
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);

    let tidy: Extract<NameCheck, { ok: true }> | null = null;
    let dateOfBirth: string | null = null;

    if (showName) {
      const check = checkName({ firstName, middleName, lastName });

      if (!check.ok) {
        setError(check.error);
        return;
      }

      tidy = check;
    }

    if (showDob) {
      if (!dobYear || !dobMonth || !dobDay) {
        setError("Select your full date of birth.");
        return;
      }

      const dob = {
        year: Number(dobYear),
        month: Number(dobMonth),
        day: Number(dobDay),
      };

      const dobProblem = nepaliDateError(dob);

      if (dobProblem) {
        setError(dobProblem);
        return;
      }

      dateOfBirth = nepaliToAdString(dob);

      const age = ageFrom(dateOfBirth);

      if (age === null) {
        setError("Enter a valid date of birth.");
        return;
      }

      if (age < MIN_AGE) {
        setError(`You must be at least ${MIN_AGE} years old to use e-tracker.`);
        return;
      }
    }

    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(showName ? { firstName, middleName, lastName } : {}),
        ...(showDob ? { dateOfBirth } : {}),
      }),
    });

    const data = await res.json();

    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    // Show the tidied-up version the server saved (e.g. "ram" -> "Ram").
    if (tidy) {
      setFirstName(tidy.firstName);
      setMiddleName(tidy.middleName);
      setLastName(tidy.lastName);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved();
  }

  if (!ready) {
    return <p className="text-sm text-slate-400">Loading...</p>;
  }

  // A name can only be changed once every 30 days.
  if (fields === "name" && lockedUntil) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        You changed your name recently. You can change it again on{" "}
        {new Date(lockedUntil).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showName && (
        <>
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
            <p className="mt-2 text-xs text-slate-400">
              Once saved, your name can be changed once every 30 days.
            </p>
          </div>
        </>
      )}

      {showDob && (
        <div>
          <p className={labelClass}>Date of birth (Nepali calendar)</p>

          <div className="grid grid-cols-3 gap-2">
            <select
              aria-label="Birth year"
              value={dobYear}
              onChange={(e) => setDobYear(e.target.value)}
              required
              className={selectClass}
            >
              <option value="" disabled>
                Year
              </option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              aria-label="Birth month"
              value={dobMonth}
              onChange={(e) => setDobMonth(e.target.value)}
              required
              className={selectClass}
            >
              <option value="" disabled>
                Month
              </option>
              {NEPALI_MONTHS.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <select
              aria-label="Birth day"
              value={dobDay}
              onChange={(e) => setDobDay(e.target.value)}
              required
              className={selectClass}
            >
              <option value="" disabled>
                Day
              </option>
              {Array.from({ length: 32 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            You must be at least {MIN_AGE} years old to use e-tracker.
          </p>
        </div>
      )}

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
