import Link from "next/link";

// The e-tracker mark: a plate with a tick, for "a meal logged".
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#2563eb" />
      <circle
        cx="16"
        cy="16"
        r="8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      <path
        d="M12.5 16.5l2.5 2.5 4.5-5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Logo plus name at the top of every page. Clicking it goes home, except while
// someone is still completing mandatory profile setup. Pages that switch views
// without changing route (like the dashboard) pass onClick to close them.
export default function Brand({
  linked = true,
  onClick,
}: {
  linked?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <LogoMark />
      <span className="text-xl font-semibold tracking-tight text-slate-900">
        e-tracker
      </span>
    </>
  );

  if (!linked) {
    return <div className="inline-flex items-center gap-2.5">{content}</div>;
  }

  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="e-tracker home"
      className="inline-flex items-center gap-2.5 rounded-xl transition-opacity hover:opacity-80"
    >
      {content}
    </Link>
  );
}
