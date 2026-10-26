"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import nepaliDateConverter from "nepali-date-converter";
import Brand from "@/components/Brand";
import PageNav from "@/components/PageNav";
import NepaliDatePicker, {
  NEPALI_MONTHS,
  nepaliDateError,
  nepaliToAdString,
  todayNepali,
  type NepaliDateValue,
} from "@/components/NepaliDatePicker";
import { formatMoney, currencySymbol, DEFAULT_CURRENCY } from "@/lib/currency";

type Item = {
  id: number;
  description: string;
  amount: number;
  nepaliDate: number;
  date: string;
};

type MonthData = {
  items: Item[];
  additionalTotal: number;
  foodTotal: number;
  currency: string;
  calendarPreference: string;
};

const PREFERENCE_KEY = "e-tracker:include-food";

function englishDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function todayEnglishString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => {
    const t = todayNepali();
    return { year: t.year, month: t.month };
  });
  const [data, setData] = useState<MonthData | null>(null);
  const [includeFood, setIncludeFood] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<NepaliDateValue>(() => todayNepali());
  const [englishDate, setEnglishDate] = useState(() => todayEnglishString());
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const current = todayNepali();
  const isCurrentMonth =
    view.year === current.year && view.month === current.month;

  async function load(year: number, month: number) {
    const res = await fetch(`/api/expenses?year=${year}&month=${month}`);

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // Remember which of the two totals the person last looked at.
    try {
      setIncludeFood(localStorage.getItem(PREFERENCE_KEY) === "1");
    } catch {
      // storage can be blocked; the default is fine
    }

    load(view.year, view.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseMode(next: boolean) {
    setIncludeFood(next);

    try {
      localStorage.setItem(PREFERENCE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function chooseView(year: number, month: number) {
    // Never let the view move past the current month.
    const safeMonth = year === current.year && month > current.month ? current.month : month;

    setView({ year, month: safeMonth });
    load(year, safeMonth);
  }

  async function addItem(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (description.trim().length < 2) {
      setError("Describe what you bought.");
      return;
    }

    const price = Number(amount);

    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price.");
      return;
    }

    const useEnglish = data?.calendarPreference === "english";

    if (!useEnglish) {
      const dateProblem = nepaliDateError(date);

      if (dateProblem) {
        setError(dateProblem);
        return;
      }
    } else if (!englishDate) {
      setError("Pick a date.");
      return;
    }

    const dateToSend = useEnglish ? englishDate : nepaliToAdString(date);

    setAdding(true);

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        amount: price,
        date: dateToSend,
      }),
    });

    const json = await res.json();
    setAdding(false);

    if (!res.ok) {
      setError(json.error ?? "Couldn't add that. Try again.");
      return;
    }

    setDescription("");
    setAmount("");

    // The month navigator stays in the Nepali calendar either way, so jump
    // there using whichever date was actually entered.
    const target = useEnglish
      ? (() => {
          const bs = new nepaliDateConverter(new Date(dateToSend + "T00:00:00"));
          return { year: bs.getYear(), month: bs.getMonth() };
        })()
      : { year: date.year, month: date.month };

    setView(target);
    await load(target.year, target.month);
  }

  async function removeItem(item: Item) {
    const confirmed = window.confirm(
      `Remove "${item.description}" (${formatMoney(item.amount, data?.currency ?? DEFAULT_CURRENCY)})?`
    );

    if (!confirmed) return;

    setDeletingId(item.id);

    const res = await fetch(`/api/expenses?id=${item.id}`, { method: "DELETE" });

    setDeletingId(null);

    if (!res.ok) {
      setError("Couldn't remove that item. Try again.");
      return;
    }

    await load(view.year, view.month);
  }

  if (loading || !data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-slate-900">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  const currency = data.currency || DEFAULT_CURRENCY;
  const isNpr = currency === "NPR";
  // Mixing a non-NPR currency with NPR-denominated food costs would produce
  // a meaningless number, so the combined view only exists for NPR.
  const effectiveIncludeFood = isNpr && includeFood;
  const total = data.additionalTotal + (effectiveIncludeFood ? data.foodTotal : 0);

  return (
    <main className="min-h-dvh bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Brand />
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
              Expenses
            </h1>
          </div>
          <PageNav />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <select
            aria-label="Month"
            value={view.month}
            onChange={(e) => chooseView(view.year, Number(e.target.value))}
            className="w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-base font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {NEPALI_MONTHS.map((name, index) => (
              <option
                key={name}
                value={index}
                disabled={view.year === current.year && index > current.month}
              >
                {name}
              </option>
            ))}
          </select>

          <select
            aria-label="Year"
            value={view.year}
            onChange={(e) => chooseView(Number(e.target.value), view.month)}
            className="w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-base font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {Array.from({ length: 11 }, (_, i) => current.year - i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          {isNpr ? (
            <div
              role="group"
              aria-label="What to include in the total"
              className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1"
            >
              <button
                onClick={() => chooseMode(false)}
                aria-pressed={!includeFood}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  !includeFood
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Additional only
              </button>
              <button
                onClick={() => chooseMode(true)}
                aria-pressed={includeFood}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  includeFood
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Additional + food
              </button>
            </div>
          ) : (
            <p className="rounded-xl bg-white p-3 text-xs text-slate-500">
              Showing your additional purchases in {currencySymbol(currency)}.
              Food costs are tracked in NPR for everyone, so they aren&apos;t
              combined here — change this in Settings if you&apos;d like NPR
              instead.
            </p>
          )}

          <p className="mt-5 text-sm text-slate-500">
            Total for {NEPALI_MONTHS[view.month]}
          </p>
          <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatMoney(total, currency)}
          </p>

          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Additional purchases ({data.items.length})
              </dt>
              <dd className="font-medium">{formatMoney(data.additionalTotal, currency)}</dd>
            </div>
            {isNpr && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Food — lunch &amp; dinner
                  {!includeFood && (
                    <span className="ml-2 text-xs text-slate-400">
                      (not included)
                    </span>
                  )}
                </dt>
                <dd className={includeFood ? "font-medium" : "text-slate-400"}>
                  {formatMoney(data.foodTotal, "NPR")}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold">Add a purchase</h2>
          <p className="mt-1 text-sm text-slate-500">
            Clothes, equipment, anything you bought besides your daily meals.
          </p>

          <form onSubmit={addItem} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                What did you buy?
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Jeans, notebook, phone cover"
                maxLength={100}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Price ({currencySymbol(currency)})
              </label>
              <input
                id="amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">
                Date bought
              </p>
              {data.calendarPreference === "english" ? (
                <input
                  type="date"
                  value={englishDate}
                  max={todayEnglishString()}
                  onChange={(e) => setEnglishDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <NepaliDatePicker value={date} onChange={setDate} />
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={adding}
              className="w-full rounded-full bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
            >
              {adding ? "Adding..." : "Add purchase"}
            </button>
          </form>
        </section>

        <section className="mt-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {NEPALI_MONTHS[view.month]} purchases
          </h2>

          <div className="mt-3 space-y-2">
            {data.items.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No additional purchases this month.
              </p>
            )}

            {data.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.description}</p>
                  <p className="text-xs text-slate-400">
                    {data.calendarPreference === "english"
                      ? englishDateLabel(item.date)
                      : `${NEPALI_MONTHS[view.month]} ${item.nepaliDate}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <p className="font-semibold">{formatMoney(item.amount, currency)}</p>
                  <button
                    onClick={() => removeItem(item)}
                    disabled={deletingId === item.id}
                    className="text-sm text-red-600 underline disabled:opacity-50"
                  >
                    {deletingId === item.id ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
