import type { MetaDescriptor } from "react-router";
import {
  defaultLocale as intlayerDefaultLocale,
  getMultilingualUrls,
  locales as intlayerLocales,
} from "intlayer";

import { metadataConfig } from "@/config/metadata";

type MetaInput = {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  imageAlt?: string;
  url?: string;
  path?: string;
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
  twitterCard?: "summary" | "summary_large_image";
  siteName?: string;
  locale?: string;
  alternateLocales?: string[];
  keywords?: string[] | string | null;
  applicationName?: string;
  generator?: string;
  author?: string;
  twitterSite?: string;
  twitterCreator?: string;
  verification?: {
    google?: string;
    naver?: string;
    googleAdsense?: string;
  };
  extra?: MetaDescriptor[];
};

type TitleTemplateInput = {
  title?: string;
  siteName?: string;
  template?: string;
};

type AlternateLink = {
  rel: "canonical" | "alternate";
  href: string;
  hrefLang?: string;
};

type AlternateLinksInput = {
  path: string;
  baseUrl?: string;
  locales?: string[];
  defaultLocale?: string;
  includeXDefault?: boolean;
};

function normalizeText(value?: string | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTextList(value?: string[] | null) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((item) => normalizeText(item))
    .filter((item): item is string => Boolean(item));

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeKeywords(value?: string[] | string | null) {
  if (typeof value === "string") {
    return normalizeText(value);
  }

  const normalized = normalizeTextList(value);
  return normalized ? normalized.join(", ") : undefined;
}

function resolveUrl(baseUrl: string, urlOrPath?: string) {
  if (!urlOrPath) {
    return baseUrl;
  }

  return new URL(urlOrPath, baseUrl).toString();
}

function resolveLocales(
  localeList?: string[] | null,
  fallback?: string[]
): string[] | undefined {
  const resolved = normalizeTextList(localeList) ?? normalizeTextList(fallback);
  return resolved && resolved.length > 0 ? resolved : undefined;
}

function applyTitleTemplate({ title, siteName, template }: TitleTemplateInput) {
  if (!title && !siteName) {
    return undefined;
  }

  const baseTitle = title ?? siteName;
  if (!baseTitle) {
    return undefined;
  }

  if (!title || !siteName || title === siteName) {
    return baseTitle;
  }

  if (template && template.includes("%s")) {
    return template.replace("%s", title);
  }

  return `${title} | ${siteName}`;
}

export function buildMeta({
  title,
  description,
  image,
  imageAlt,
  url,
  path,
  noIndex = false,
  type,
  twitterCard,
  siteName,
  locale,
  alternateLocales,
  keywords,
  applicationName,
  generator,
  author,
  twitterSite,
  twitterCreator,
  verification,
  extra = [],
}: MetaInput): MetaDescriptor[] {
  const normalizedTitle = normalizeText(title);
  const resolvedSiteName =
    normalizeText(siteName) ??
    normalizeText(metadataConfig.title) ??
    normalizeText(metadataConfig.handle);
  const resolvedTitle = applyTitleTemplate({
    title: normalizedTitle,
    siteName: resolvedSiteName,
    template: normalizeText(metadataConfig.titleTemplate),
  });
  const resolvedDescription =
    normalizeText(description) ?? normalizeText(metadataConfig.description);
  const resolvedKeywords =
    normalizeKeywords(keywords) ??
    normalizeKeywords(metadataConfig.keywords);
  const resolvedApplicationName =
    normalizeText(applicationName) ??
    normalizeText(metadataConfig.applicationName);
  const resolvedGenerator =
    normalizeText(generator) ?? normalizeText(metadataConfig.generator);
  const resolvedAuthor =
    normalizeText(author) ?? normalizeText(metadataConfig.author?.name);
  const resolvedLocale =
    normalizeText(locale) ??
    normalizeText(metadataConfig.locale) ??
    normalizeText(intlayerDefaultLocale);
  const resolvedAlternateLocales = resolveLocales(
    alternateLocales,
    resolveLocales(metadataConfig.locales, intlayerLocales)
  )?.filter((value) => value !== resolvedLocale);
  const baseUrl = metadataConfig.url;
  const resolvedUrl = normalizeText(url) ?? normalizeText(path);
  const canonicalUrl = resolveUrl(baseUrl, resolvedUrl);
  const resolvedImage =
    normalizeText(image) ?? normalizeText(metadataConfig.defaultImage);
  const imageUrl = resolvedImage ? resolveUrl(baseUrl, resolvedImage) : undefined;
  const resolvedImageAlt =
    normalizeText(imageAlt) ?? normalizeText(metadataConfig.defaultImageAlt);
  const resolvedType = type ?? metadataConfig.ogType ?? "website";
  const resolvedTwitterCard =
    twitterCard ?? metadataConfig.twitterCard ?? "summary_large_image";
  const resolvedTwitterSite =
    normalizeText(twitterSite) ?? normalizeText(metadataConfig.twitterSite);
  const resolvedTwitterCreator =
    normalizeText(twitterCreator) ??
    normalizeText(metadataConfig.twitterCreator);
  const resolvedVerification = {
    google:
      normalizeText(verification?.google) ??
      normalizeText(metadataConfig.verification?.google),
    naver:
      normalizeText(verification?.naver) ??
      normalizeText(metadataConfig.verification?.naver),
    googleAdsense:
      normalizeText(verification?.googleAdsense) ??
      normalizeText(metadataConfig.verification?.googleAdsense),
  };

  const meta: MetaDescriptor[] = [];

  if (resolvedTitle) {
    meta.push({ title: resolvedTitle });
  }

  if (resolvedDescription) {
    meta.push({ name: "description", content: resolvedDescription });
  }

  if (resolvedKeywords) {
    meta.push({ name: "keywords", content: resolvedKeywords });
  }

  if (resolvedApplicationName) {
    meta.push({ name: "application-name", content: resolvedApplicationName });
  }

  if (resolvedGenerator) {
    meta.push({ name: "generator", content: resolvedGenerator });
  }

  if (resolvedAuthor) {
    meta.push({ name: "author", content: resolvedAuthor });
  }

  if (noIndex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  if (resolvedType) {
    meta.push({ property: "og:type", content: resolvedType });
  }

  if (resolvedLocale) {
    meta.push({ property: "og:locale", content: resolvedLocale });
  }

  if (resolvedAlternateLocales) {
    resolvedAlternateLocales.forEach((alternateLocale) => {
      meta.push({
        property: "og:locale:alternate",
        content: alternateLocale,
      });
    });
  }

  if (canonicalUrl) {
    meta.push({ property: "og:url", content: canonicalUrl });
  }

  if (resolvedTitle) {
    meta.push({ property: "og:title", content: resolvedTitle });
  }

  if (resolvedDescription) {
    meta.push({ property: "og:description", content: resolvedDescription });
  }

  if (resolvedSiteName) {
    meta.push({ property: "og:site_name", content: resolvedSiteName });
  }

  if (imageUrl) {
    meta.push({ property: "og:image", content: imageUrl });
  }

  if (imageUrl && resolvedImageAlt) {
    meta.push({ property: "og:image:alt", content: resolvedImageAlt });
  }

  if (resolvedTwitterCard) {
    meta.push({ name: "twitter:card", content: resolvedTwitterCard });
  }

  if (resolvedTwitterSite) {
    meta.push({ name: "twitter:site", content: resolvedTwitterSite });
  }

  if (resolvedTwitterCreator) {
    meta.push({ name: "twitter:creator", content: resolvedTwitterCreator });
  }

  if (resolvedTitle) {
    meta.push({ name: "twitter:title", content: resolvedTitle });
  }

  if (resolvedDescription) {
    meta.push({ name: "twitter:description", content: resolvedDescription });
  }

  if (imageUrl) {
    meta.push({ name: "twitter:image", content: imageUrl });
  }

  if (imageUrl && resolvedImageAlt) {
    meta.push({ name: "twitter:image:alt", content: resolvedImageAlt });
  }

  if (resolvedVerification.google) {
    meta.push({
      name: "google-site-verification",
      content: resolvedVerification.google,
    });
  }

  if (resolvedVerification.naver) {
    meta.push({
      name: "naver-site-verification",
      content: resolvedVerification.naver,
    });
  }

  if (resolvedVerification.googleAdsense) {
    meta.push({
      name: "google-adsense-account",
      content: resolvedVerification.googleAdsense,
    });
  }

  return extra.length > 0 ? meta.concat(extra) : meta;
}

export function buildAlternateLinks({
  path,
  baseUrl = metadataConfig.url,
  locales = intlayerLocales,
  defaultLocale = intlayerDefaultLocale,
  includeXDefault = true,
}: AlternateLinksInput): AlternateLink[] {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const localizedUrls = getMultilingualUrls(normalizedPath, {
    locales,
    defaultLocale,
  });
  const resolvedDefaultPath =
    localizedUrls?.[defaultLocale as keyof typeof localizedUrls] ??
    normalizedPath;
  const canonicalUrl = resolveUrl(baseUrl, resolvedDefaultPath);
  const links: AlternateLink[] = [
    { rel: "canonical", href: canonicalUrl },
  ];

  Object.entries(localizedUrls).forEach(([locale, url]) => {
    links.push({
      rel: "alternate",
      hrefLang: locale,
      href: resolveUrl(baseUrl, url),
    });
  });

  if (includeXDefault) {
    links.push({
      rel: "alternate",
      hrefLang: "x-default",
      href: canonicalUrl,
    });
  }

  return links;
}
