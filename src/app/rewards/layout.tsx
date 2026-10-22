import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Rewards",
  robots: { index: false, follow: false },
};

export default function RewardsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
