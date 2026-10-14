"use client";

import { useMemo } from "react";
import nepaliDateConverter from "nepali-date-converter";

export type NepaliDateValue = { year: number; month: number; day: number };

export const NEPALI_MONTHS = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

export function todayNepali(): NepaliDateValue {
  const t = new nepaliDateConverter();
  return { year: t.getYear(), month: t.getMonth(), day: t.getDate() };
}

// null when the date is fine, otherwise a message to show the person.
export function nepaliDateError(v: NepaliDateValue): string | null {
  const today = todayNepali();
  const candidate = new nepaliDateConverter(v.year, v.month, v.day);

  // The library rolls a day that doesn't exist into the next month instead of
  // failing, so a changed month means the day was invalid.
  if (candidate.getMonth() !== v.month) {
    return "That day doesn't exist in the selected month.";
  }

  const isFuture =
    v.year > today.year ||
    (v.year === today.year &&
      (v.month > today.month ||
        (v.month === today.month && v.day > today.day)));

  return isFuture ? "Pick today or an earlier date." : null;
}

// The API stores an English (AD) date and works out the Nepali one itself.
export function nepaliToAdString(v: NepaliDateValue): string {
  const d = new nepaliDateConverter(v.year, v.month, v.day).toJsDate();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${month}-${day}`;
}

const selectClass =
  "w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export default function NepaliDatePicker({
  value,
  onChange,
}: {
  value: NepaliDateValue;
  onChange: (next: NepaliDateValue) => void;
}) {
  const today = useMemo(() => todayNepali(), []);
  const years = Array.from({ length: 11 }, (_, i) => today.year - 10 + i);
  const error = nepaliDateError(value);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label="Year"
          value={value.year}
          onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
          className={selectClass}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          aria-label="Month"
          value={value.month}
          onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
          className={selectClass}
        >
          {NEPALI_MONTHS.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label="Day"
          value={value.day}
          onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
          className={selectClass}
        >
          {Array.from({ length: 32 }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
