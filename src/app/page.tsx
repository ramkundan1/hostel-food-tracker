import type { Metadata } from "next";
import { getCurrentUserId } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";
import WelcomeContent from "@/components/WelcomeContent";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

// The same address shows the dashboard to people who are logged in, and the
// full landing page (rendered on the server, so search engines can read it) to
// everyone else.
export default async function HomePage() {
  const userId = await getCurrentUserId();

  return userId ? <Dashboard /> : <WelcomeContent />;
}
