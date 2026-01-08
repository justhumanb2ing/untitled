import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";

import type {
  GridBreakpoint,
  GridResponsive,
  GridSize,
  BrickResponsive,
  GridPosition,
} from "@/config/grid-rule";
import { findColumnStackPosition } from "@/utils/grid-utils";
import type {
  BrickRow,
  BrickRowMap,
  BrickStyle,
  BrickType,
} from "types/brick";
import type { Json } from "../../types/database.types";

export type PageGridBrickType = Exclude<BrickType, "section">;
export type PageGridMediaType = Extract<PageGridBrickType, "image" | "video">;
export type PageGridBrickStatus =
  | "ready"
  | "uploading"
  | "error"
  | "draft"
  | "editing";

export type PageGridBrick<T extends PageGridBrickType = PageGridBrickType> =
  BrickRow<T> & {
    status: PageGridBrickStatus;
  };

export type PageLayoutSnapshot = {
  bricks: BrickRow<PageGridBrickType>[];
};

export const GRID_COLS: Record<GridBreakpoint, number> = {
  desktop: 4,
  mobile: 2,
};

export const MAX_MEDIA_BYTES = 2_000_000;

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "ogg", "ogv", "m4v"]);
const PAGE_GRID_TYPES: readonly PageGridBrickType[] = [
  "text",
  "link",
  "map",
  "image",
  "video",
];
const PAGE_GRID_TYPE_SET = new Set<PageGridBrickType>(PAGE_GRID_TYPES);

type BrickFactoryPayload = {
  url?: string;
  text?: string;
  lat?: number | null;
  lng?: number | null;
  zoom?: number | null;
  href?: string;
  caption?: string | null;
};

type BrickDataFactoryMap = {
  [K in PageGridBrickType]: (payload: BrickFactoryPayload) => BrickRowMap[K];
};

const BRICK_DATA_FACTORIES: BrickDataFactoryMap = {
  text: (payload) => ({ text: payload.text ?? "" }),
  link: (payload) => ({
    url: payload.url ?? "",
    title: null,
    description: null,
    site_name: null,
    icon_url: null,
    image_url: null,
  }),
  map: (payload) => ({
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    zoom: payload.zoom ?? null,
    href: payload.href ?? "",
    caption: payload.caption ?? null,
  }),
  image: (payload) => ({
    image_url: payload.url ?? "",
    link_url: null,
  }),
  video: (payload) => ({
    video_url: payload.url ?? "",
    link_url: null,
  }),
};

type GridRule = {
  resolveGrid: (cols: number) => GridSize;
  resolveConstraints: (
    cols: number,
    grid: GridSize
  ) => Pick<LayoutItem, "minW" | "maxW" | "minH" | "maxH" | "isResizable">;
};

const MEDIA_RULE: GridRule = {
  resolveGrid: () => ({ w: 1, h: 2 }),
  resolveConstraints: (cols) => ({
    minW: 1,
    maxW: Math.min(2, cols),
    minH: 2,
    maxH: 4,
    isResizable: true,
  }),
};

const FULL_WIDTH_RULE: GridRule = {
  resolveGrid: (cols) => ({ w: cols, h: 1 }),
  resolveConstraints: (_cols, grid) => ({
    minW: grid.w,
    maxW: grid.w,
    minH: grid.h,
    maxH: grid.h,
    isResizable: false,
  }),
};

const GRID_RULES: Record<PageGridBrickType, GridRule> = {
  text: FULL_WIDTH_RULE,
  link: MEDIA_RULE,
  map: MEDIA_RULE,
  image: MEDIA_RULE,
  video: MEDIA_RULE,
};

/**
 * Generates a stable ID for new grid bricks.
 */
export function createPageGridBrickId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `brick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Resolves image/video type from file extension or mime type.
 */
export function resolveMediaType(file: File): PageGridMediaType | null {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension) {
    if (IMAGE_EXTENSIONS.has(extension)) {
      return "image";
    }

    if (VIDEO_EXTENSIONS.has(extension)) {
      return "video";
    }
  }

  const mime = file.type.toLowerCase();

  if (mime.startsWith("image/")) {
    return "image";
  }

  if (mime.startsWith("video/")) {
    return "video";
  }

  return null;
}

export function resolveTextBrickStatus(text: string, isEditing: boolean) {
  if (text.trim().length === 0) {
    return "draft";
  }

  return isEditing ? "editing" : "ready";
}

/**
 * Returns a validation error message when the media file is invalid.
 */
export function getMediaValidationError(file: File): string | null {
  if (file.size > MAX_MEDIA_BYTES) {
    return "File size must be 2MB or less.";
  }

  if (!resolveMediaType(file)) {
    return "Only image or video files are supported.";
  }

  return null;
}

/**
 * Creates a new grid brick with layout based on existing bricks.
 */
export function createPageGridBrick(params: {
  id: string;
  type: PageGridBrickType;
  status: PageGridBrickStatus;
  bricks: PageGridBrick[];
  payload?: BrickFactoryPayload;
  timestamp?: string;
}): PageGridBrick {
  const layouts = buildLayoutsFromBricks(params.bricks);
  const desktopLayout = createLayoutItem(
    params.id,
    params.type,
    "desktop",
    layouts.desktop ?? []
  );
  const mobileLayout = createLayoutItem(
    params.id,
    params.type,
    "mobile",
    layouts.mobile ?? []
  );
  const timestamp = params.timestamp ?? new Date().toISOString();

  return {
    id: params.id,
    type: params.type,
    status: params.status,
    position: {
      mobile: { x: mobileLayout.x, y: mobileLayout.y },
      desktop: { x: desktopLayout.x, y: desktopLayout.y },
    },
    style: {
      mobile: { grid: { w: mobileLayout.w, h: mobileLayout.h } },
      desktop: { grid: { w: desktopLayout.w, h: desktopLayout.h } },
    },
    created_at: timestamp,
    updated_at: timestamp,
    data: BRICK_DATA_FACTORIES[params.type](params.payload ?? {}),
  };
}

/**
 * Updates a grid brick with new media data or status.
 */
export function updatePageGridBrick(
  brick: PageGridBrick,
  payload: {
    url?: string;
    text?: string;
    status?: PageGridBrickStatus;
    timestamp?: string;
    grid?: GridSize;
    breakpoint?: GridBreakpoint;
  }
): PageGridBrick {
  const nextStatus = payload.status ?? brick.status;
  const shouldUpdateData =
    payload.url !== undefined || payload.text !== undefined;
  const nextData = shouldUpdateData
    ? BRICK_DATA_FACTORIES[brick.type]({
        url: payload.url,
        text: payload.text,
      })
    : brick.data;

  const nextBrick: PageGridBrick = {
    ...brick,
    status: nextStatus,
    data: nextData,
    updated_at: payload.timestamp ?? new Date().toISOString(),
  };

  if (payload.grid && payload.breakpoint) {
    switch (brick.type) {
      case "text":
        return {
          ...nextBrick,
          style: {
            ...nextBrick.style,
            [payload.breakpoint]: {
              grid: payload.grid,
            },
          },
        };
      default:
        return nextBrick;
    }
  }

  return nextBrick;
}

/**
 * Applies partial map data updates without overriding unaffected fields.
 */
export function updateMapBrickData(
  brick: PageGridBrick<"map">,
  payload: Partial<BrickRowMap["map"]>
): PageGridBrick<"map"> {
  const nextData: BrickRowMap["map"] = {
    ...brick.data,
    ...payload,
  };

  const hasChanges =
    brick.data.lat !== nextData.lat ||
    brick.data.lng !== nextData.lng ||
    brick.data.zoom !== nextData.zoom ||
    brick.data.href !== nextData.href ||
    brick.data.caption !== nextData.caption;

  if (!hasChanges) {
    return brick;
  }

  return {
    ...brick,
    data: nextData,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Builds responsive layouts for the current bricks.
 */
export function buildLayoutsFromBricks(
  bricks: PageGridBrick[]
): ResponsiveLayouts<GridBreakpoint> {
  const desktop: LayoutItem[] = [];
  const mobile: LayoutItem[] = [];

  for (const brick of bricks) {
    desktop.push(buildLayoutItem(brick, "desktop"));
    mobile.push(buildLayoutItem(brick, "mobile"));
  }

  return { desktop, mobile };
}

/**
 * Applies a layout update to all bricks for the given breakpoint.
 */
export function applyLayoutToBricks(
  bricks: PageGridBrick[],
  layout: Layout,
  breakpoint: GridBreakpoint
): PageGridBrick[] {
  const layoutMap = new Map(layout.map((item) => [item.i, item]));
  const timestamp = new Date().toISOString();

  return bricks.map((brick) => {
    const nextLayout = layoutMap.get(brick.id);
    if (!nextLayout) {
      return brick;
    }

    return applyLayoutToBrick(brick, nextLayout, breakpoint, timestamp);
  });
}

/**
 * Serializes bricks for persistence in page_layouts.
 */
export function serializePageLayout(
  bricks: PageGridBrick[]
): PageLayoutSnapshot | null {
  const persistedBricks = bricks
    .filter(shouldPersistBrick)
    .map(({ status: _status, ...brick }) => brick);

  if (persistedBricks.length === 0) {
    return null;
  }

  return { bricks: persistedBricks };
}

/**
 * Parses a persisted page layout into grid bricks with ready status.
 * Supports layouts that come as JSON strings or have legacy responsive structures.
 */
export function parsePageLayoutSnapshot(layout: Json | null): PageGridBrick[] {
  const normalizedLayout = normalizeLayoutValue(layout);
  if (!normalizedLayout) {
    return [];
  }

  const bricksValue = extractBrickCandidates(normalizedLayout);
  if (!bricksValue) {
    return [];
  }

  const layoutAccumulator: LayoutAccumulator = {
    desktop: [],
    mobile: [],
  };

  const bricks: PageGridBrick[] = [];
  for (const candidate of bricksValue) {
    const brick = normalizeBrickCandidate(candidate, layoutAccumulator);
    if (brick) {
      bricks.push(brick);
    }
  }

  return bricks;
}

type LayoutAccumulator = Record<GridBreakpoint, LayoutItem[]>;

function normalizeLayoutValue(layout: Json | null): Record<string, unknown> | null {
  if (layout === null) {
    return null;
  }

  if (typeof layout === "string") {
    try {
      const parsed = JSON.parse(layout) as Json;
      return normalizeRecordLayout(parsed);
    } catch {
      return null;
    }
  }

  return normalizeRecordLayout(layout);
}

function normalizeRecordLayout(value: Json): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return { bricks: value };
  }

  if (isRecord(value)) {
    return value;
  }

  return null;
}

function extractBrickCandidates(
  layout: Record<string, unknown>
): unknown[] | null {
  const bricksValue = layout.bricks;
  if (Array.isArray(bricksValue)) {
    return bricksValue;
  }

  const itemsValue = layout.items;
  if (Array.isArray(itemsValue)) {
    return itemsValue;
  }

  return null;
}

function normalizeBrickCandidate(
  value: unknown,
  layoutAccumulator: LayoutAccumulator
): PageGridBrick | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = deriveBrickType(value);
  if (!type) {
    return null;
  }

  const layout = resolveBrickLayout(value, type, layoutAccumulator);
  if (!layout) {
    return null;
  }

  const id =
    typeof value.id === "string" && value.id.length > 0
      ? value.id
      : createPageGridBrickId();
  const data = mergeBrickData(value.data, type);
  const createdAt = ensureTimestamp(value.created_at ?? value.createdAt);
  const updatedAt = ensureTimestamp(value.updated_at ?? value.updatedAt);

  const brick: PageGridBrick = {
    id,
    type,
    status: "ready",
    position: layout.position,
    style: layout.style,
    data,
    created_at: createdAt,
    updated_at: updatedAt,
  };

  layoutAccumulator.desktop.push(buildLayoutItem(brick, "desktop"));
  layoutAccumulator.mobile.push(buildLayoutItem(brick, "mobile"));

  return brick;
}

function deriveBrickType(value: Record<string, unknown>): PageGridBrickType | null {
  const type = value.type;
  if (typeof type !== "string") {
    return null;
  }

  if (!PAGE_GRID_TYPE_SET.has(type as PageGridBrickType)) {
    return null;
  }

  return type as PageGridBrickType;
}

function mergeBrickData(
  raw: unknown,
  type: PageGridBrickType
): BrickRowMap[PageGridBrickType] {
  const defaults = BRICK_DATA_FACTORIES[type]({});
  if (!isRecord(raw)) {
    return defaults;
  }

  const normalized = { ...defaults } as BrickRowMap[PageGridBrickType];

  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      const value = raw[key];
      if (value !== undefined) {
        normalized[key] = value as BrickRowMap[PageGridBrickType][typeof key];
      }
    }
  }

  return normalized;
}

type BrickLayout = {
  position: GridResponsive<GridPosition>;
  style: BrickResponsive<BrickStyle>;
};

function resolveBrickLayout(
  value: Record<string, unknown>,
  type: PageGridBrickType,
  layoutAccumulator: LayoutAccumulator
): BrickLayout | null {
  const desktop = resolveBreakpointLayout(
    value,
    type,
    "desktop",
    layoutAccumulator.desktop
  );
  if (!desktop) {
    return null;
  }

  const mobile = resolveBreakpointLayout(
    value,
    type,
    "mobile",
    layoutAccumulator.mobile
  );
  if (!mobile) {
    return null;
  }

  return {
    position: {
      desktop: desktop.position,
      mobile: mobile.position,
    },
    style: {
      desktop: { grid: desktop.grid },
      mobile: { grid: mobile.grid },
    },
  };
}

function resolveBreakpointLayout(
  value: Record<string, unknown>,
  type: PageGridBrickType,
  breakpoint: GridBreakpoint,
  existingLayout: LayoutItem[]
): { position: GridPosition; grid: GridSize } | null {
  const cols = GRID_COLS[breakpoint];
  const rule = GRID_RULES[type];
  const fallbackGrid = rule.resolveGrid(cols);

  const styleValue = extractResponsiveValue(value.style, breakpoint);
  const grid =
    isRecord(styleValue) && isGridSize(styleValue.grid)
      ? styleValue.grid
      : fallbackGrid;

  const positionValue = extractResponsiveValue(value.position, breakpoint);
  const position = isGridPosition(positionValue)
    ? positionValue
    : findColumnStackPosition(existingLayout, cols, grid.w);

  return {
    position,
    grid,
  };
}

function extractResponsiveValue(
  value: unknown,
  breakpoint: GridBreakpoint
): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    return value;
  }

  if (Object.prototype.hasOwnProperty.call(value, breakpoint)) {
    return value[breakpoint];
  }

  if (Object.prototype.hasOwnProperty.call(value, "desktop")) {
    return value.desktop;
  }

  if (Object.prototype.hasOwnProperty.call(value, "mobile")) {
    return value.mobile;
  }

  return value;
}

function ensureTimestamp(value: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return new Date().toISOString();
}

function createLayoutItem(
  id: string,
  type: PageGridBrickType,
  breakpoint: GridBreakpoint,
  layout: ReadonlyArray<LayoutItem>
): LayoutItem {
  const cols = GRID_COLS[breakpoint];
  const rule = GRID_RULES[type];
  const grid = rule.resolveGrid(cols);
  const { x, y } = findColumnStackPosition(layout, cols, grid.w);

  return {
    i: id,
    x,
    y,
    w: grid.w,
    h: grid.h,
    ...rule.resolveConstraints(cols, grid),
  };
}

function buildLayoutItem(
  brick: PageGridBrick,
  breakpoint: GridBreakpoint
): LayoutItem {
  const cols = GRID_COLS[breakpoint];
  const rule = GRID_RULES[brick.type];
  const grid = brick.style[breakpoint].grid;
  const position = brick.position[breakpoint];

  return {
    i: brick.id,
    x: position.x,
    y: position.y,
    w: grid.w,
    h: grid.h,
    ...rule.resolveConstraints(cols, grid),
  };
}

function applyLayoutToBrick(
  brick: PageGridBrick,
  layout: LayoutItem,
  breakpoint: GridBreakpoint,
  timestamp: string
): PageGridBrick {
  return {
    ...brick,
    position: {
      ...brick.position,
      [breakpoint]: {
        x: layout.x,
        y: layout.y,
      },
    },
    style: {
      ...brick.style,
      [breakpoint]: {
        grid: { w: layout.w, h: layout.h },
      },
    },
    updated_at: timestamp,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isGridSize(value: unknown): value is GridSize {
  if (!isRecord(value)) {
    return false;
  }

  return isNumber(value.w) && isNumber(value.h);
}

function isGridPosition(value: unknown): value is { x: number; y: number } {
  if (!isRecord(value)) {
    return false;
  }

  return isNumber(value.x) && isNumber(value.y);
}

function shouldPersistBrick(brick: PageGridBrick) {
  if (brick.status !== "ready" && brick.status !== "editing") {
    return false;
  }

  if (isTextBrick(brick)) {
    return brick.data.text.trim().length > 0;
  }

  return true;
}

function isTextBrick(brick: PageGridBrick): brick is PageGridBrick<"text"> {
  return brick.type === "text";
}

export type { LayoutItem, ResponsiveLayouts };
