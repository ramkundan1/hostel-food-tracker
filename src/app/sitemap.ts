import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the public landing page is meant to appear in search results; every
// other page is behind a login.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
