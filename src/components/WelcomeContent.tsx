import Link from "next/link";
import type { ComponentType } from "react";
import { Utensils, Wallet, Flame, Trophy } from "lucide-react";
import Reveal from "@/components/Reveal";
import Brand from "@/components/Brand";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

function CalendarIcon({ className }: { className?: string }) {
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
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

const features: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}[] = [
  {
    icon: Utensils,
    title: "Meals, logged fast",
    text: "Pick what you ate for lunch and dinner. Prices are set once, and every entry is costed for you.",
  },
  {
    icon: Wallet,
    title: "Every other purchase",
    text: "Clothes, equipment, anything else. Add the item and price, and keep it separate from food.",
  },
  {
    icon: CalendarIcon,
    title: "Nepali calendar built in",
    text: "Dates and monthly totals follow the Nepali (Bikram Sambat) months, with the English date shown beside them.",
  },
  {
    icon: Flame,
    title: "Streaks and rewards",
    text: "Log on the day to build a streak, earn badges, and turn points into automatic meal entries.",
  },
  {
    icon: Trophy,
    title: "A friendly leaderboard",
    text: "See how you compare. Only your first name and last initial are shown — never your money.",
  },
];

const steps = [
  { title: "Create your account", text: "Sign up with your email and verify it in a minute." },
  { title: "Set your meal prices", text: "Enter what a meal, egg, curd and chicken cost you, once." },
  { title: "Track your month", text: "Log meals and purchases, then see your total for the month." },
];

const faqs = [
  {
    question: "What is e-tracker?",
    answer:
      "e-tracker is a meal and expense tracker. You log lunch and dinner, add everything else you buy, and see your total spending for each month.",
  },
  {
    question: "Does it use the Nepali calendar?",
    answer:
      "Yes. Dates are in the Nepali (Bikram Sambat) calendar with the English date shown alongside, and your monthly totals follow the Nepali months.",
  },
  {
    question: "Can I track things other than food?",
    answer:
      "Yes. Add any purchase, such as clothes or equipment, with a description and a price. You can view your monthly total with or without your food costs.",
  },
  {
    question: "Who can see my information?",
    answer:
      "Other users only see your first name, last initial and points on the leaderboard. Your meals, spending and date of birth stay private. The site administrator can view account details in order to run the service.",
  },
  {
    question: "How do points and rewards work?",
    answer:
      "Logging a meal on the day earns points and builds a streak. Points and streaks can be turned into automatic meal entries. Meals logged for a past date don't earn points.",
  },
  {
    question: "Who can use e-tracker?",
    answer: "Anyone aged 16 or over can create an account.",
  },
];

// Structured data that lets search engines understand what the site is.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      inLanguage: "en",
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

export default function WelcomeContent() {
  return (
    <main className="min-h-dvh bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Brand />
        <Link
          href="/login"
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Log in
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-20 pt-12 text-center sm:px-8 sm:pb-28 sm:pt-20">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
            Meal &amp; expense tracker for students
          </p>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="font-display mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Track every meal. Know every cost.
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-500 sm:text-lg">
            Log lunch and dinner in seconds, add everything else you buy, and
            see your full monthly spending in the Nepali calendar. Built for
            students and hostel residents.
          </p>
        </Reveal>
        <Reveal delay={300}>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-full bg-blue-600 px-7 py-3 font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              Get started
            </Link>
            <a
              href="#features"
              className="w-full rounded-full border border-slate-300 px-7 py-3 font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </Reveal>
      </section>

      <section id="features" className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <Reveal>
            <h2 className="font-display text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything in one place
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 100}>
                <div className="h-full rounded-3xl border border-slate-200 bg-white p-6">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-slate-500">{feature.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <Reveal>
            <h2 className="font-display text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              How it works
            </h2>
          </Reveal>

          <ol className="mt-10 space-y-4">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 100}>
                <li className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-slate-500">{step.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <Reveal>
            <h2 className="font-display text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions
            </h2>
          </Reveal>

          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {faqs.map((faq) => (
              <details key={faq.question} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {faq.question}
                  <span
                    aria-hidden="true"
                    className="text-xl text-slate-400 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-slate-500">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <Reveal className="mx-auto max-w-2xl px-5 text-center sm:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to see where your money goes?
          </h2>
          <p className="mt-4 text-slate-500">
            It takes a minute to set up, and your month adds itself up from
            there.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Create your account
          </Link>
        </Reveal>
      </section>

      <footer className="px-5 py-8 text-center text-sm text-slate-400">
        © e-tracker
      </footer>
    </main>
  );
}
