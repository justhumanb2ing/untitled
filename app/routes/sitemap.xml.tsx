import { defaultLocale, getMultilingualUrls, locales } from "intlayer";

import { metadataConfig } from "@/config/metadata";

type SitemapRoute = {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
};

const routes: SitemapRoute[] = [
  { path: "/", changefreq: "weekly", priority: 1 },
  { path: "/sign-in", changefreq: "monthly", priority: 0.6 },
  { path: "/changelog", changefreq: "monthly", priority: 0.5 },
  { path: "/issue", changefreq: "yearly", priority: 0.3 },
];

function resolveAbsoluteUrl(path: string) {
  return new URL(path, metadataConfig.url).toString();
}

function buildUrlEntry(route: SitemapRoute, lastmod: string) {
  const localizedUrls = getMultilingualUrls(route.path, {
    locales,
    defaultLocale,
  });
  const canonicalPath =
    localizedUrls?.[defaultLocale as keyof typeof localizedUrls] ??
    route.path;
  const canonicalUrl = resolveAbsoluteUrl(canonicalPath);
  const alternates = Object.entries(localizedUrls)
    .map(
      ([locale, url]) =>
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${resolveAbsoluteUrl(
          url
        )}" />`
    )
    .join("\n");
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />`;
  const changefreq = route.changefreq
    ? `    <changefreq>${route.changefreq}</changefreq>`
    : "";
  const priority =
    typeof route.priority === "number"
      ? `    <priority>${route.priority.toFixed(1)}</priority>`
      : "";

  return [
    "  <url>",
    `    <loc>${canonicalUrl}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    alternates,
    xDefault,
    changefreq,
    priority,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function loader() {
  const lastmod = new Date().toISOString();
  const urlset = routes.map((route) => buildUrlEntry(route, lastmod)).join("\n");
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urlset,
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
