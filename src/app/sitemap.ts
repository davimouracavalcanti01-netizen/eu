import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [
    { url: `${site}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/termos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
