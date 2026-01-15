import type { GridSize } from "@/config/grid-rule";
import type { BrickLinkRow } from "types/brick";

export type LinkBrickVariant =
  | "compact"
  | "standard"
  | "wide"
  | "tall"
  | "rich";

type LinkBrickViewLayout = "inline" | "stacked";

type LinkBrickDisplayPolicy = {
  layout: LinkBrickViewLayout;
  showIcon: boolean;
  showSiteLabel: boolean;
  showDescription: boolean;
  showImage: boolean;
  titleLines: number;
  descriptionLines: number;
};

export type LinkBrickViewModel = {
  variant: LinkBrickVariant;
  layout: LinkBrickViewLayout;
  title: string;
  description: string | null;
  siteLabel: string | null;
  imageUrl: string | null;
  iconUrl: string | null;
  showIcon: boolean;
  showSiteLabel: boolean;
  showDescription: boolean;
  showImage: boolean;
  titleLines: number;
  descriptionLines: number;
};

const LINK_DISPLAY_POLICIES: Record<LinkBrickVariant, LinkBrickDisplayPolicy> =
  {
    compact: {
      layout: "inline",
      showIcon: true,
      showSiteLabel: false,
      showDescription: false,
      showImage: false,
      titleLines: 1,
      descriptionLines: 0,
    },
    standard: {
      layout: "stacked",
      showIcon: true,
      showSiteLabel: false,
      showDescription: false,
      showImage: false,
      titleLines: 3,
      descriptionLines: 0,
    },
    wide: {
      layout: "stacked",
      showIcon: true,
      showSiteLabel: true,
      showDescription: false,
      showImage: true,
      titleLines: 3,
      descriptionLines: 1,
    },
    tall: {
      layout: "stacked",
      showIcon: true,
      showSiteLabel: false,
      showDescription: false,
      showImage: true,
      titleLines: 5,
      descriptionLines: 2,
    },
    rich: {
      layout: "stacked",
      showIcon: true,
      showSiteLabel: true,
      showDescription: true,
      showImage: true,
      titleLines: 5,
      descriptionLines: 2,
    },
  };

export function resolveLinkBrickVariant(grid: GridSize): LinkBrickVariant {
  if (grid.w >= 2 && grid.h >= 4) {
    return "rich";
  }

  if (grid.h >= 4) {
    return "tall";
  }

  if (grid.w >= 2 && grid.h >= 2) {
    return "wide";
  }

  if (grid.h >= 2) {
    return "standard";
  }

  return "compact";
}

export function buildLinkBrickViewModel(
  data: BrickLinkRow,
  grid: GridSize
): LinkBrickViewModel {
  const variant = resolveLinkBrickVariant(grid);
  const policy = LINK_DISPLAY_POLICIES[variant];
  const title = resolveTitle(data);
  const description = normalizeText(data.description);
  const siteLabel = resolveSiteLabel(data);
  const imageUrl = normalizeText(data.image_url);
  const iconUrl = normalizeText(data.icon_url);

  return {
    variant,
    layout: policy.layout,
    title,
    description,
    siteLabel,
    imageUrl,
    iconUrl,
    titleLines: policy.titleLines,
    descriptionLines: policy.descriptionLines,
    showDescription: policy.showDescription && !!description,
    showSiteLabel: policy.showSiteLabel && !!siteLabel,
    showImage: policy.showImage && !!imageUrl,
    showIcon: policy.showIcon && !!iconUrl,
  };
}

function resolveTitle(data: BrickLinkRow) {
  return (
    normalizeText(data.title) ?? normalizeText(data.url) ?? "Untitled link"
  );
}

function resolveSiteLabel(data: BrickLinkRow) {
  return normalizeText(data.site_name) ?? resolveLinkHost(data.url);
}

function resolveLinkHost(value: string) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return null;
  }

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
