import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private pages are kept out of search results with a noindex tag on each one
// (crawlers have to be able to read that tag), so only the API and the admin
// area are blocked outright.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
