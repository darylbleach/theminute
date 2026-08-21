import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ["", "/buy", "/queue", "/archive", "/longest", "/terms"].map(
    (path) => ({
      url: `${base}${path}`,
      changeFrequency: path === "" ? "always" : "hourly",
      priority: path === "" ? 1 : 0.6,
    }),
  );
}
