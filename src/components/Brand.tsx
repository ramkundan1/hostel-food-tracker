import Link from "next/link";

// The "e-tracker" label at the top of every page. It doubles as a link home,
// except while someone is still completing mandatory profile setup.
export default function Brand({ linked = true }: { linked?: boolean }) {
  const style =
    "text-sm font-medium uppercase tracking-[0.2em] text-slate-400";

  if (!linked) return <p className={style}>e-tracker</p>;

  return (
    <Link
      href="/"
      className={`${style} transition-colors hover:text-slate-600`}
    >
      e-tracker
    </Link>
  );
}
