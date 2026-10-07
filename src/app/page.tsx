"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import nepaliDateConverter from "nepali-date-converter";
import { Utensils, Egg, Milk, Drumstick, Trophy, Soup, Moon } from "lucide-react";

type Prices = {
  meal: number | null;
  egg: number | null;
  curd: number | null;
  chicken: number | null;
};

type FoodSelection = {
  meal: boolean;
  egg: boolean;
  curd: boolean;
  chicken: boolean;
};

type AdditionalPerson = FoodSelection;

type Entry = {
  id: number;
  nepaliYear: number;
  nepaliMonth: number;
  nepaliDate: number;
  mealType: "lunch" | "dinner";
  meal: boolean;
  egg: boolean;
  curd: boolean;
  chicken: boolean;
  totalCost: number;
  additionalPeople: AdditionalPerson[];
};

type Summary = {
  nepaliYear: number;
  nepaliMonth: number;
  totalExpense: number;
  mealCount: number;
  eggCount: number;
  curdCount: number;
  chickenCount: number;
  entryCount: number;
  entries: Entry[];
};

const emptySelection: FoodSelection = {
  meal: false,
  egg: false,
  curd: false,
  chicken: false,
};

// Nepali (Bikram Sambat) month names, 0-indexed to match the
// nepali-date-converter library's getMonth().
const NEPALI_MONTHS = [
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

function formatNepaliMonth(year: number, monthIndex: number) {
  return `${NEPALI_MONTHS[monthIndex] ?? "?"} ${year}`;
}

function formatNepaliDate(year: number, monthIndex: number, day: number) {
  return `${NEPALI_MONTHS[monthIndex] ?? "?"} ${day}, ${year}`;
}

// English (AD) equivalent, shown as secondary reference next to the
// primary Nepali date picker.
function formatAdDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toDateOnlyString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Home() {
const router = useRouter();
  const [prices, setPrices] = useState<Prices>({
    meal: null,
    egg: null,
    curd: null,
    chicken: null,
  });

  const [inputPrices, setInputPrices] = useState<Prices>({
    meal: null,
    egg: null,
    curd: null,
    chicken: null,
  });

  const [lunch, setLunch] = useState<FoodSelection>(emptySelection);
  const [dinner, setDinner] = useState<FoodSelection>(emptySelection);

  const [lunchPeople, setLunchPeople] = useState<AdditionalPerson[]>([]);
  const [dinnerPeople, setDinnerPeople] = useState<AdditionalPerson[]>([]);

  const [lunchExtraOpen, setLunchExtraOpen] = useState(false);
  const [dinnerExtraOpen, setDinnerExtraOpen] = useState(false);

  const [lunchAdditionalOpen, setLunchAdditionalOpen] = useState(false);
  const [dinnerAdditionalOpen, setDinnerAdditionalOpen] = useState(false);

  const [summary, setSummary] = useState<Summary>({
    nepaliYear: 0,
    nepaliMonth: 0,
    totalExpense: 0,
    mealCount: 0,
    eggCount: 0,
    curdCount: 0,
    chickenCount: 0,
    entryCount: 0,
    entries: [],
  });

  const [loading, setLoading] = useState(true);
  const [savingPrices, setSavingPrices] = useState(false);
  const [savingLunch, setSavingLunch] = useState(false);
  const [savingDinner, setSavingDinner] = useState(false);

  const [showPriceSetup, setShowPriceSetup] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);

  const [months, setMonths] = useState<
    { nepaliYear: number; nepaliMonth: number }[]
  >([]);


  const [selectedMonth, setSelectedMonth] = useState<{
    nepaliYear: number;
    nepaliMonth: number;
  } | null>(null);

  const [selectedSummary, setSelectedSummary] =
    useState<Summary | null>(null);

  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingMealType, setEditingMealType] = useState<
    "lunch" | "dinner" | null
  >(null);

  const [lunchError, setLunchError] = useState<string | null>(null);
  const [dinnerError, setDinnerError] = useState<string | null>(null);
  const [lunchSuccess, setLunchSuccess] = useState<string | null>(null);
  const [dinnerSuccess, setDinnerSuccess] = useState<string | null>(null);

  // The Nepali (BS) date is the primary way to pick which day an entry is
  // for. Defaults to today's Nepali date.
  const todayNepali = useMemo(() => new nepaliDateConverter(), []);

  const [nepaliYear, setNepaliYear] = useState(todayNepali.getYear());
  const [nepaliMonthIndex, setNepaliMonthIndex] = useState(
    todayNepali.getMonth()
  );
  const [nepaliDay, setNepaliDay] = useState(todayNepali.getDate());

  // Convert the selected Nepali date back to an AD date so it can be sent
  // to the API (which stores/derives everything from an AD timestamp) and
  // shown as a secondary reference next to the Nepali picker.
  const selectedDateInfo = useMemo(() => {
    const candidate = new nepaliDateConverter(
      nepaliYear,
      nepaliMonthIndex,
      nepaliDay
    );

    // If the chosen day doesn't exist in that month, the library rolls the
    // date forward into the next month instead of erroring — detect that
    // by checking the round-trip stayed in the month we asked for.
    const validDay = candidate.getMonth() === nepaliMonthIndex;

    const isFuture =
      nepaliYear > todayNepali.getYear() ||
      (nepaliYear === todayNepali.getYear() &&
        (nepaliMonthIndex > todayNepali.getMonth() ||
          (nepaliMonthIndex === todayNepali.getMonth() &&
            nepaliDay > todayNepali.getDate())));

    return {
      adDate: candidate.toJsDate(),
      valid: validDay && !isFuture,
      invalidReason: !validDay
        ? "That day doesn't exist in the selected month."
        : isFuture
          ? "You can't log a meal for a future date."
          : null,
    };
  }, [nepaliYear, nepaliMonthIndex, nepaliDay, todayNepali]);

  useEffect(() => {
    async function loadData() {
      // Ask for everything at once. Waiting for each answer before asking
      // for the next one meant five round trips to the server in a row.
      const [profileRes, priceRes, summaryRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/food-price"),
        fetch("/api/food-summary"),
      ]);

      if (
        profileRes.status === 401 ||
        priceRes.status === 401 ||
        summaryRes.status === 401
      ) {
        router.push("/login");
        return;
      }

      const profileData = await profileRes.json();

      if (!profileData.hasProfile) {
        router.push("/profile-setup");
        return;
      }

      const priceData = await priceRes.json();

      const loadedPrices = {
        meal: priceData.meal,
        egg: priceData.egg,
        curd: priceData.curd,
        chicken: priceData.chicken,
      };

      setPrices(loadedPrices);

      if (
        loadedPrices.meal === null ||
        loadedPrices.egg === null ||
        loadedPrices.curd === null ||
        loadedPrices.chicken === null
      ) {
        setShowPriceSetup(true);
      }

      setSummary(await summaryRes.json());

      setLoading(false);

      // The month list is only needed for Monthly Report, so it loads in the
      // background once the dashboard is already showing.
      fetch("/api/food-months")
        .then((res) => res.json())
        .then((data) => setMonths(data))
        .catch(() => {});
    }

    loadData();
  }, []);

  async function refreshSummary() {
    const summaryRes = await fetch("/api/food-summary");
    const summaryData = await summaryRes.json();
    setSummary(summaryData);
  }

  async function openMonth(nepaliYear: number, nepaliMonth: number) {
    const res = await fetch(
      "/api/food-summary?year=" +
        nepaliYear +
        "&month=" +
        nepaliMonth
    );

    const data = await res.json();

    setSelectedMonth({ nepaliYear, nepaliMonth });
    setSelectedSummary(data);
  }

  function updatePrice(field: keyof Prices, value: string) {
    setInputPrices((current) => ({
      ...current,
      [field]: value === "" ? null : Number(value),
    }));
  }

  async function savePrices() {
    if (
      inputPrices.meal === null ||
      inputPrices.egg === null ||
      inputPrices.curd === null ||
      inputPrices.chicken === null ||
      inputPrices.meal < 0 ||
      inputPrices.egg < 0 ||
      inputPrices.curd < 0 ||
      inputPrices.chicken < 0
    ) {
      alert("Please enter valid prices for all items.");
      return;
    }

    setSavingPrices(true);

    const res = await fetch("/api/food-price", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputPrices),
    });

    const data = await res.json();

    setPrices({
      meal: data.meal,
      egg: data.egg,
      curd: data.curd,
      chicken: data.chicken,
    });

    setInputPrices({
      meal: null,
      egg: null,
      curd: null,
      chicken: null,
    });

    setShowPriceSetup(false);
    setSavingPrices(false);
  }

  function toggleFood(
    mealType: "lunch" | "dinner",
    food: keyof FoodSelection
  ) {
    if (mealType === "lunch") {
      setLunch((current) => ({
        ...current,
        [food]: !current[food],
      }));
    } else {
      setDinner((current) => ({
        ...current,
        [food]: !current[food],
      }));
    }
  }

  function togglePersonFood(
    mealType: "lunch" | "dinner",
    personIndex: number,
    food: keyof FoodSelection
  ) {
    const setter =
      mealType === "lunch" ? setLunchPeople : setDinnerPeople;

    setter((current) =>
      current.map((person, index) =>
        index === personIndex
          ? {
              ...person,
              [food]: !person[food],
            }
          : person
      )
    );
  }

  function updatePeopleCount(
    mealType: "lunch" | "dinner",
    count: number
  ) {
    const safeCount = Math.max(0, Math.min(10, count));

    const setter =
      mealType === "lunch" ? setLunchPeople : setDinnerPeople;

    setter((current) => {
      if (safeCount > current.length) {
        return [
          ...current,
          ...Array.from(
            { length: safeCount - current.length },
            () => ({ ...emptySelection })
          ),
        ];
      }

      return current.slice(0, safeCount);
    });
  }

  function calculateCost(
    selection: FoodSelection,
    people: AdditionalPerson[]
  ) {
    const owner =
      (selection.meal && prices.meal ? prices.meal : 0) +
      (selection.egg && prices.egg ? prices.egg : 0) +
      (selection.curd && prices.curd ? prices.curd : 0) +
      (selection.chicken && prices.chicken ? prices.chicken : 0);

    const guests = people.reduce((total, person) => {
      return (
        total +
        (person.meal && prices.meal ? prices.meal : 0) +
        (person.egg && prices.egg ? prices.egg : 0) +
        (person.curd && prices.curd ? prices.curd : 0) +
        (person.chicken && prices.chicken ? prices.chicken : 0)
      );
    }, 0);

    return owner + guests;
  }

  async function saveMeal(
    mealType: "lunch" | "dinner",
    selection: FoodSelection,
    people: AdditionalPerson[]
  ) {
    const setError = mealType === "lunch" ? setLunchError : setDinnerError;
    const clearSuccess =
      mealType === "lunch" ? setLunchSuccess : setDinnerSuccess;

    setError(null);
    clearSuccess(null);

    if (
      !selection.meal &&
      !selection.egg &&
      !selection.curd &&
      !selection.chicken &&
      people.length === 0
    ) {
      setError("Select at least one food item.");
      return;
    }

    if (editingEntryId === null && !selectedDateInfo.valid) {
      setError(selectedDateInfo.invalidReason ?? "Invalid date.");
      return;
    }

    const setSaving = mealType === "lunch" ? setSavingLunch : setSavingDinner;
    setSaving(true);

    const body = {
      mealType,
      meal: selection.meal,
      egg: selection.egg,
      curd: selection.curd,
      chicken: selection.chicken,
      additionalPeople: people,
      // Only new entries take the picked date — edits keep the
      // date the entry already has.
      ...(editingEntryId === null
        ? { date: toDateOnlyString(selectedDateInfo.adDate) }
        : {}),
    };

    const url = "/api/food-entry";

    const method = editingEntryId !== null ? "PUT" : "POST";

    const finalBody =
      editingEntryId !== null
        ? { id: editingEntryId, ...body }
        : body;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finalBody),
    });

    const data = await res.json();

    if (!res.ok) {
      // Keep the user's selections intact so they can fix the
      // problem (e.g. pick a different date) and retry, instead
      // of silently wiping out what they entered.
      setError(data.error ?? "Failed to save meal.");
      setSaving(false);
      return;
    }

    // Refresh the totals in the background so the form clears right away.
    refreshSummary().catch(() => {});

    const wasEditing = editingEntryId !== null;
    const setSuccess =
      mealType === "lunch" ? setLunchSuccess : setDinnerSuccess;

    if (mealType === "lunch") {
      setLunch({ ...emptySelection });
      setLunchPeople([]);
      setLunchExtraOpen(false);
      setLunchAdditionalOpen(false);
    } else {
      setDinner({ ...emptySelection });
      setDinnerPeople([]);
      setDinnerExtraOpen(false);
      setDinnerAdditionalOpen(false);
    }

    setEditingEntryId(null);
    setEditingMealType(null);
    setSaving(false);

    setSuccess(
      wasEditing
        ? "Entry updated."
        : mealType === "lunch"
          ? "Lunch logged."
          : "Dinner logged."
    );

    setTimeout(() => setSuccess(null), 3000);
  }

  function editEntry(entry: Entry) {
    setEditingEntryId(entry.id);
    setEditingMealType(entry.mealType);
    setLunchError(null);
    setDinnerError(null);

    if (entry.mealType === "lunch") {
      setLunch({
        meal: entry.meal,
        egg: entry.egg,
        curd: entry.curd,
        chicken: entry.chicken,
      });

      setLunchPeople(
        entry.additionalPeople.map((person) => ({
          meal: person.meal,
          egg: person.egg,
          curd: person.curd,
          chicken: person.chicken,
        }))
      );

      setShowMonthlyReport(false);
      setLunchExtraOpen(true);
      setLunchAdditionalOpen(entry.additionalPeople.length > 0);
    } else {
      setDinner({
        meal: entry.meal,
        egg: entry.egg,
        curd: entry.curd,
        chicken: entry.chicken,
      });

      setDinnerPeople(
        entry.additionalPeople.map((person) => ({
          meal: person.meal,
          egg: person.egg,
          curd: person.curd,
          chicken: person.chicken,
        }))
      );

      setShowMonthlyReport(false);
      setDinnerExtraOpen(true);
      setDinnerAdditionalOpen(entry.additionalPeople.length > 0);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(entry: Entry) {
    const confirmed = window.confirm(
      `Delete this ${entry.mealType} entry (${formatNepaliDate(
        entry.nepaliYear,
        entry.nepaliMonth,
        entry.nepaliDate
      )})? This can't be undone.`
    );

    if (!confirmed) return;

    const res = await fetch(`/api/food-entry?id=${entry.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to delete entry.");
      return;
    }

    if (editingEntryId === entry.id) {
      setEditingEntryId(null);
      setEditingMealType(null);
    }

    await refreshSummary();

    if (selectedMonth) {
      await openMonth(selectedMonth.nepaliYear, selectedMonth.nepaliMonth);
    }

    const monthsRes = await fetch("/api/food-months");
    const monthsData = await monthsRes.json();
    setMonths(monthsData);
  }

  function cancelEdit(mealType: "lunch" | "dinner") {
    setEditingEntryId(null);
    setEditingMealType(null);

    if (mealType === "lunch") {
      setLunch({ ...emptySelection });
      setLunchPeople([]);
      setLunchExtraOpen(false);
      setLunchAdditionalOpen(false);
      setLunchError(null);
      setLunchSuccess(null);
    } else {
      setDinner({ ...emptySelection });
      setDinnerPeople([]);
      setDinnerExtraOpen(false);
      setDinnerAdditionalOpen(false);
      setDinnerError(null);
      setDinnerSuccess(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-slate-900">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (showPriceSetup) {
    return (
      <main className="min-h-screen bg-white p-6 text-slate-900">
        <div className="mx-auto max-w-2xl pt-10">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              Eatracker
            </p>

            {prices.meal !== null && (
              <button
                onClick={() => {
                  setShowPriceSetup(false);
                  setInputPrices({
                    meal: null,
                    egg: null,
                    curd: null,
                    chicken: null,
                  });
                }}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Back
              </button>
            )}
          </div>

          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">
            Set your meal prices
          </h1>

          <p className="mt-2 text-slate-400">
            Set it once — prices stay saved until you decide to update them.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["meal", "Normal Meal"],
                ["egg", "Egg"],
                ["curd", "Curd"],
                ["chicken", "Chicken"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="font-semibold">{label}</p>

                <input
                  type="number"
                  value={inputPrices[key] ?? ""}
                  onChange={(e) =>
                    updatePrice(key, e.target.value)
                  }
                  placeholder="Enter price"
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <button
            onClick={savePrices}
            disabled={savingPrices}
            className="mt-6 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {savingPrices ? "Saving..." : "Save Prices"}
          </button>
        </div>
      </main>
    );
  }

  if (showMonthlyReport) {
    return (
      <MonthlyReport
        summary={summary}
        months={months}
        selectedMonth={selectedMonth}
        selectedSummary={selectedSummary}
        onBack={() => {
          setShowMonthlyReport(false);
          setSelectedMonth(null);
          setSelectedSummary(null);
        }}
        onOpenMonth={openMonth}
        onEdit={editEntry}
        onDelete={deleteEntry}
      />
    );
  }

  return (
    <main className="min-h-screen bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              Eatracker
            </p>

            <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">
              Track your meal.
            </h1>

            <p className="mt-2 text-slate-400">
              {formatNepaliMonth(summary.nepaliYear, summary.nepaliMonth)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowPriceSetup(true)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Update Prices
            </button>

            <button
              onClick={() => setShowMonthlyReport(true)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Monthly Report
            </button>

            <button
              onClick={() => router.push("/leaderboard")}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <Trophy className="h-4 w-4" />
              Leaderboard
            </button>

            <button
              onClick={async () => {
                await fetch("/api/auth/logout", {
                  method: "POST",
                });
                router.push("/login");
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-7">
          <p className="text-sm font-medium text-slate-400">
            Spent So Far
          </p>

          <p className="mt-2 text-5xl font-bold tracking-tight">
            Rs. {summary.totalExpense.toFixed(2)}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Current Nepali month
          </p>
        </section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Entry date (Nepali)</p>
              <p className="text-xs text-slate-500">
                {editingEntryId !== null
                  ? "Editing an existing entry keeps its original date."
                  : "Pick today or an earlier Nepali date to log a meal for."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <select
              value={nepaliYear}
              disabled={editingEntryId !== null}
              onChange={(e) => setNepaliYear(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              {Array.from({ length: 11 }, (_, i) => todayNepali.getYear() - 10 + i).map(
                (year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                )
              )}
            </select>

            <select
              value={nepaliMonthIndex}
              disabled={editingEntryId !== null}
              onChange={(e) => setNepaliMonthIndex(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              {NEPALI_MONTHS.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={nepaliDay}
              disabled={editingEntryId !== null}
              onChange={(e) => setNepaliDay(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              {Array.from({ length: 32 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {editingEntryId === null && selectedDateInfo.invalidReason ? (
              <span className="text-red-600">
                {selectedDateInfo.invalidReason}
              </span>
            ) : (
              <>≈ {formatAdDate(selectedDateInfo.adDate)} (AD)</>
            )}
          </p>
        </section>

        <div className="mt-7 grid gap-6 md:grid-cols-2">
          <MealCard
            title="Lunch"
            selection={lunch}
            people={lunchPeople}
            extraOpen={lunchExtraOpen}
            additionalOpen={lunchAdditionalOpen}
            onToggle={(food) => toggleFood("lunch", food)}
            onTogglePersonFood={(index, food) =>
              togglePersonFood("lunch", index, food)
            }
            onPeopleCountChange={(count) =>
              updatePeopleCount("lunch", count)
            }
            onExtraToggle={() =>
              setLunchExtraOpen((current) => !current)
            }
            onAdditionalToggle={() =>
              setLunchAdditionalOpen((current) => !current)
            }
            onSave={() =>
              saveMeal("lunch", lunch, lunchPeople)
            }
            onCancelEdit={() => cancelEdit("lunch")}
            saving={savingLunch}
            cost={calculateCost(lunch, lunchPeople)}
            editing={editingMealType === "lunch"}
            error={lunchError}
            success={lunchSuccess}
          />

          <MealCard
            title="Dinner"
            selection={dinner}
            people={dinnerPeople}
            extraOpen={dinnerExtraOpen}
            additionalOpen={dinnerAdditionalOpen}
            onToggle={(food) => toggleFood("dinner", food)}
            onTogglePersonFood={(index, food) =>
              togglePersonFood("dinner", index, food)
            }
            onPeopleCountChange={(count) =>
              updatePeopleCount("dinner", count)
            }
            onExtraToggle={() =>
              setDinnerExtraOpen((current) => !current)
            }
            onAdditionalToggle={() =>
              setDinnerAdditionalOpen((current) => !current)
            }
            onSave={() =>
              saveMeal("dinner", dinner, dinnerPeople)
            }
            onCancelEdit={() => cancelEdit("dinner")}
            saving={savingDinner}
            cost={calculateCost(dinner, dinnerPeople)}
            editing={editingMealType === "dinner"}
            error={dinnerError}
            success={dinnerSuccess}
          />
        </div>
      </div>
    </main>
  );
}

function MealCard({
  title,
  selection,
  people,
  extraOpen,
  additionalOpen,
  onToggle,
  onTogglePersonFood,
  onPeopleCountChange,
  onExtraToggle,
  onAdditionalToggle,
  onSave,
  onCancelEdit,
  saving,
  cost,
  editing,
  error,
  success,
}: {
  title: string;
  selection: FoodSelection;
  people: AdditionalPerson[];
  extraOpen: boolean;
  additionalOpen: boolean;
  onToggle: (food: keyof FoodSelection) => void;
  onTogglePersonFood: (
    index: number,
    food: keyof FoodSelection
  ) => void;
  onPeopleCountChange: (count: number) => void;
  onExtraToggle: () => void;
  onAdditionalToggle: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  saving: boolean;
  cost: number;
  editing: boolean;
  error: string | null;
  success: string | null;
}) {
  const isLunch = title.toLowerCase() === "lunch";
  const MealIcon = isLunch ? Soup : Moon;
  const accentBorder = isLunch ? "border-l-amber-400" : "border-l-indigo-400";

  return (
    <section
      className={`rounded-3xl border border-slate-200 border-l-4 ${accentBorder} bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Meal</p>
          <h2 className="font-display flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <MealIcon className="h-5 w-5 text-slate-400" />
            {title}
          </h2>
        </div>

        {cost > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Total</p>
            <p className="font-semibold text-emerald-600">
              Rs. {cost.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <span>Editing an existing entry.</span>
          <button
            type="button"
            onClick={onCancelEdit}
            className="font-semibold underline"
          >
            Cancel
          </button>
        </div>
      )}

      {success && (
        <div className="animate-pop-in mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}


      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={() => onToggle("meal")}
        className={
          "mt-6 flex w-full items-center justify-between rounded-2xl border p-4 transition " +
          (selection.meal
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-300 bg-white")
        }
      >
        <div>
          <p className="font-semibold">Normal Meal</p>
          <p className="text-xs text-slate-500">
            Your regular meal
          </p>
        </div>

        <span
          className={
            "flex h-6 w-6 items-center justify-center rounded-full border " +
            (selection.meal
              ? "border-emerald-400 bg-emerald-400 text-slate-950"
              : "border-slate-300")
          }
        >
          {selection.meal ? "✓" : ""}
        </span>
      </button>

      <button
        onClick={onExtraToggle}
        className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white p-4 text-left hover:border-slate-400"
      >
        <div>
          <p className="font-semibold">Extra</p>
          <p className="text-xs text-slate-500">
            Egg, curd, chicken or additional people
          </p>
        </div>

        <span className="text-slate-400">
          {extraOpen ? "⌃" : "⌄"}
        </span>
      </button>

      {extraOpen && (
        <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
          {(
            [
              ["egg", "Egg"],
              ["curd", "Curd"],
              ["chicken", "Chicken"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onToggle(key)}
              className={
                "flex w-full items-center justify-between rounded-xl border p-3 " +
                (selection[key]
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200")
              }
            >
              <span>{label}</span>
              <span
                className={
                  "flex h-5 w-5 items-center justify-center rounded-full border " +
                  (selection[key]
                    ? "border-emerald-400 bg-emerald-400 text-slate-950"
                    : "border-slate-300")
                }
              >
                {selection[key] ? "✓" : ""}
              </span>
            </button>
          ))}

          <button
            onClick={onAdditionalToggle}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3"
          >
            <div className="text-left">
              <p className="font-semibold">Additional</p>
              <p className="text-xs text-slate-500">
                Add food for other people
              </p>
            </div>

            <span>{additionalOpen ? "⌃" : "⌄"}</span>
          </button>

          {additionalOpen && (
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div>
                <label className="text-sm text-slate-400">
                  Number of additional people
                </label>

                <div className="mt-2 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      onPeopleCountChange(people.length - 1)
                    }
                    disabled={people.length === 0}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-xl font-bold disabled:opacity-30"
                  >
                    −
                  </button>

                  <span className="w-8 text-center text-xl font-bold">
                    {people.length}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      onPeopleCountChange(people.length + 1)
                    }
                    disabled={people.length === 10}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-xl font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>

              {people.map((person, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <p className="mb-3 text-sm font-semibold">
                    Person {index + 1}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["meal", "Normal Meal"],
                        ["egg", "Egg"],
                        ["curd", "Curd"],
                        ["chicken", "Chicken"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() =>
                          onTogglePersonFood(index, key)
                        }
                        className={
                          "rounded-lg border p-2 text-sm " +
                          (person[key]
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200")
                        }
                      >
                        {person[key] ? "✓ " : ""}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="mt-5 w-full rounded-full bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {saving
          ? "Saving..."
          : editing
            ? `Update ${title}`
            : `Log ${title}`}
      </button>
    </section>
  );
}

function MonthlyReport({
  summary,
  months,
  selectedMonth,
  selectedSummary,
  onBack,
  onOpenMonth,
  onEdit,
  onDelete,
}: {
  summary: Summary;
  months: { nepaliYear: number; nepaliMonth: number }[];
  selectedMonth: {
    nepaliYear: number;
    nepaliMonth: number;
  } | null;
  selectedSummary: Summary | null;
  onBack: () => void;
  onOpenMonth: (year: number, month: number) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) {
  const report = selectedSummary ?? summary;

  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Reset the expanded row whenever the viewed month changes, so an
  // expanded day from a previous month doesn't carry over.
  useEffect(() => {
    setExpandedDay(null);
  }, [report.nepaliYear, report.nepaliMonth]);

  const entriesByDay = useMemo(() => {
    const map = new Map<number, Entry[]>();

    for (const entry of report.entries) {
      const list = map.get(entry.nepaliDate) ?? [];
      list.push(entry);
      map.set(entry.nepaliDate, list);
    }

    return Array.from(map.entries())
      .map(([day, entries]) => ({
        day,
        entries,
        total: entries.reduce((sum, e) => sum + e.totalCost, 0),
      }))
      .sort((a, b) => b.day - a.day);
  }, [report.entries]);

  function exportCsv() {
    const header = [
      "Date",
      "Meal Type",
      "Normal Meal",
      "Egg",
      "Curd",
      "Chicken",
      "Additional People",
      "Total Cost (Rs.)",
    ];

    const rows = report.entries.map((entry) => [
      formatNepaliDate(entry.nepaliYear, entry.nepaliMonth, entry.nepaliDate),
      entry.mealType,
      entry.meal ? "Yes" : "No",
      entry.egg ? "Yes" : "No",
      entry.curd ? "Yes" : "No",
      entry.chicken ? "Yes" : "No",
      String(entry.additionalPeople.length),
      entry.totalCost.toFixed(2),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eatrack-${formatNepaliMonth(report.nepaliYear, report.nepaliMonth).replace(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              Eatracker
            </p>

            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
              Monthly History
            </h1>
          </div>

          <button
            onClick={onBack}
            className="no-print rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
        </div>

        <div className="no-print mt-7 grid gap-3">
          {months.map((month) => (
            <button
              key={month.nepaliYear + "-" + month.nepaliMonth}
              onClick={() =>
                onOpenMonth(month.nepaliYear, month.nepaliMonth)
              }
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-slate-400"
            >
              <span className="font-semibold">
                {formatNepaliMonth(month.nepaliYear, month.nepaliMonth)}
              </span>

              <span className="text-sm text-emerald-600">
                View →
              </span>
            </button>
          ))}
        </div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm text-slate-500">
            {selectedMonth
              ? "Selected month"
              : "Current month"}
          </p>

          <p className="mt-1 text-xl font-bold">
            {formatNepaliMonth(report.nepaliYear, report.nepaliMonth)}
          </p>

          <p className="mt-5 text-sm text-slate-500">
            Total Expense
          </p>

          <p className="text-4xl font-bold">
            Rs. {report.totalExpense.toFixed(2)}
          </p>
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReportCard
            title="Normal Meal"
            value={report.mealCount}
            icon={<Utensils className="h-4 w-4" />}
          />
          <ReportCard
            title="Egg"
            value={report.eggCount}
            icon={<Egg className="h-4 w-4" />}
          />
          <ReportCard
            title="Curd"
            value={report.curdCount}
            icon={<Milk className="h-4 w-4" />}
          />
          <ReportCard
            title="Chicken"
            value={report.chickenCount}
            icon={<Drumstick className="h-4 w-4" />}
          />
        </div>

        <section className="mt-7 no-print">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold tracking-tight">Meal Records</h2>

            <div className="flex gap-2">
              <button
                onClick={exportCsv}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
              >
                Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
              >
                Print / Save PDF
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {entriesByDay.map(({ day, entries, total }) => {
              const isExpanded = expandedDay === day;
              const mealTypesPresent = entries
                .map((e) => e.mealType)
                .sort();

              return (
                <div
                  key={day}
                  className="rounded-2xl border border-slate-200 bg-slate-50"
                >
                  <button
                    onClick={() =>
                      setExpandedDay(isExpanded ? null : day)
                    }
                    className="flex w-full items-center justify-between gap-3 p-5 text-left"
                  >
                    <div>
                      <p className="font-bold">
                        {formatNepaliDate(
                          report.nepaliYear,
                          report.nepaliMonth,
                          day
                        )}
                      </p>

                      <p className="text-sm text-slate-500 capitalize">
                        {mealTypesPresent.join(" + ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="font-bold text-emerald-600">
                        Rs. {total.toFixed(2)}
                      </p>

                      <span className="text-slate-400">
                        {isExpanded ? "⌃" : "⌄"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-slate-200 p-5 pt-4">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-bold capitalize">
                              {entry.mealType}
                            </p>

                            <div className="text-right">
                              <p className="font-bold text-emerald-600">
                                Rs. {entry.totalCost.toFixed(2)}
                              </p>

                              <div className="mt-1 flex justify-end gap-3">
                                <button
                                  onClick={() => onEdit(entry)}
                                  className="text-sm text-slate-400 underline"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => onDelete(entry)}
                                  className="text-sm text-red-600 underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>

                          <p className="mt-3 text-sm text-slate-600">
                            {[
                              entry.meal ? "Normal Meal" : "",
                              entry.egg ? "Egg" : "",
                              entry.curd ? "Curd" : "",
                              entry.chicken ? "Chicken" : "",
                            ]
                              .filter(Boolean)
                              .join(" + ") || "Additional people only"}
                          </p>

                          {entry.additionalPeople.length > 0 && (
                            <div className="mt-4 border-t border-slate-200 pt-4">
                              <p className="text-sm font-semibold text-slate-400">
                                Additional people:{" "}
                                {entry.additionalPeople.length}
                              </p>

                              <div className="mt-2 space-y-2">
                                {entry.additionalPeople.map(
                                  (person, index) => (
                                    <div
                                      key={index}
                                      className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"
                                    >
                                      <span className="font-semibold">
                                        Person {index + 1}:
                                      </span>{" "}
                                      {[
                                        person.meal
                                          ? "Normal Meal"
                                          : "",
                                        person.egg ? "Egg" : "",
                                        person.curd ? "Curd" : "",
                                        person.chicken
                                          ? "Chicken"
                                          : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" + ")}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {entriesByDay.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                No meal records yet this month.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ReportCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-sm">{title}</p>
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

