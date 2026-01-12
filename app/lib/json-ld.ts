import { defaultLocale as intlayerDefaultLocale } from "intlayer";

import { metadataConfig } from "@/config/metadata";

export type JsonLdNode = Record<string, unknown> & {
  "@type"?: string;
  "@id"?: string;
};

export type JsonLdHandleArgs = {
  data: unknown;
  params: Record<string, string | undefined>;
  pathname: string;
};

export type JsonLdHandle = {
  jsonLd?:
    | JsonLdNode
    | JsonLdNode[]
    | ((args: JsonLdHandleArgs) => JsonLdNode | JsonLdNode[] | null | undefined);
};

type JsonLdInput = {
  name?: string | null;
  description?: string | null;
  url?: string | null;
  path?: string | null;
  image?: string | null;
  locale?: string | null;
  author?: {
    name?: string | null;
    url?: string | null;
  };
};

function normalizeText(value?: string | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveUrl(baseUrl: string, urlOrPath: string) {
  return new URL(urlOrPath, baseUrl).toString();
}

/**
 * Builds base JSON-LD nodes from metadata defaults with optional overrides.
 * Returns nodes without an @context so they can be safely composed.
 */
export function buildJsonLd({
  name,
  description,
  url,
  path,
  image,
  locale,
  author,
}: JsonLdInput = {}): JsonLdNode[] {
  const baseUrl = metadataConfig.url;
  const resolvedName =
    normalizeText(name) ??
    normalizeText(metadataConfig.title) ??
    normalizeText(metadataConfig.handle);
  const resolvedDescription =
    normalizeText(description) ?? normalizeText(metadataConfig.description);
  const resolvedLocale =
    normalizeText(locale) ??
    normalizeText(metadataConfig.locale) ??
    normalizeText(intlayerDefaultLocale);
  const resolvedAuthorName =
    normalizeText(author?.name) ?? normalizeText(metadataConfig.author?.name);
  const resolvedAuthorUrl =
    normalizeText(author?.url) ?? normalizeText(metadataConfig.author?.url);
  const resolvedImage =
    normalizeText(image) ?? normalizeText(metadataConfig.defaultImage);
  const resolvedPageUrl = normalizeText(url) ?? normalizeText(path);
  const canonicalUrl = resolvedPageUrl
    ? resolveUrl(baseUrl, resolvedPageUrl)
    : baseUrl;
  const shouldIncludePage = Boolean(resolvedPageUrl);
  const imageUrl = resolvedImage ? resolveUrl(baseUrl, resolvedImage) : undefined;

  const nodes: JsonLdNode[] = [];

  if (resolvedAuthorName) {
    const authorNode: JsonLdNode = {
      "@type": "Person",
      "@id": `${baseUrl}#author`,
      name: resolvedAuthorName,
    };

    if (resolvedAuthorUrl) {
      authorNode.url = resolvedAuthorUrl;
    }

    nodes.push(authorNode);
  }

  if (resolvedName) {
    const siteNode: JsonLdNode = {
      "@type": "WebSite",
      "@id": `${baseUrl}#website`,
      url: baseUrl,
      name: resolvedName,
    };

    if (resolvedDescription) {
      siteNode.description = resolvedDescription;
    }

    if (resolvedLocale) {
      siteNode.inLanguage = resolvedLocale;
    }

    if (imageUrl) {
      siteNode.image = imageUrl;
    }

    if (resolvedAuthorName) {
      siteNode.publisher = { "@id": `${baseUrl}#author` };
    }

    nodes.push(siteNode);
  }

  if (resolvedName && shouldIncludePage) {
    const pageNode: JsonLdNode = {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: resolvedName,
      isPartOf: { "@id": `${baseUrl}#website` },
    };

    if (resolvedDescription) {
      pageNode.description = resolvedDescription;
    }

    if (resolvedLocale) {
      pageNode.inLanguage = resolvedLocale;
    }

    if (resolvedAuthorName) {
      pageNode.author = { "@id": `${baseUrl}#author` };
    }

    if (imageUrl) {
      const imageId = `${canonicalUrl}#primaryimage`;
      pageNode.primaryImageOfPage = { "@id": imageId };
      nodes.push({
        "@type": "ImageObject",
        "@id": imageId,
        url: imageUrl,
      });
    }

    nodes.push(pageNode);
  }

  return nodes;
}
