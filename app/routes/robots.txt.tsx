import { metadataConfig } from "@/config/metadata";

export function loader() {
  const sitemapUrl = new URL("/sitemap.xml", metadataConfig.url).toString();
  const body = [`User-agent: *`, `Allow: /`, `Sitemap: ${sitemapUrl}`].join(
    "\n"
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
