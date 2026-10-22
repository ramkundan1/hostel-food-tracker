import { permanentRedirect } from "next/navigation";

// The landing page now lives at the home address. This keeps old links working
// without creating a duplicate page for search engines.
export default function WelcomeRedirect() {
  permanentRedirect("/");
}
