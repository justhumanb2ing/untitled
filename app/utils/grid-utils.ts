import { BREAKPOINTS, DEFAULT_ROW_HEIGHT, type GridBreakpoint } from "@/config/grid-rule";
import type { LayoutItem } from "react-grid-layout";
import type { LayoutConstraint } from "react-grid-layout/core";

export const getBreakpoint = (width: number): GridBreakpoint =>
  width >= BREAKPOINTS.desktop ? "desktop" : "mobile";

export const getColumnWidth = (
  width: number,
  cols: number,
  marginX: number,
  paddingX: number
) => {
  if (cols <= 0) return 0;
  return (width - marginX * (cols - 1) - paddingX * 2) / cols;
};

export const getRowHeightForSquare = (
  columnWidth: number,
  rowSpan: number,
  marginY: number
) => {
  if (!Number.isFinite(columnWidth) || columnWidth <= 0 || rowSpan <= 0) {
    return DEFAULT_ROW_HEIGHT;
  }
  const height = (columnWidth - marginY * (rowSpan - 1)) / rowSpan;
  return height > 0 ? height : DEFAULT_ROW_HEIGHT;
};

export const getRowSpanForHeight = (
  height: number,
  rowHeight: number,
  minRows = 1
) => {
  if (!Number.isFinite(height) || !Number.isFinite(rowHeight) || rowHeight <= 0) {
    return minRows;
  }

  return Math.max(minRows, Math.ceil(height / rowHeight));
};

export const getColumnHeights = (
  layout: ReadonlyArray<LayoutItem>,
  cols: number
): number[] => {
  const heights = Array.from({ length: cols }, () => 0);

  for (const item of layout) {
    const bottom = item.y + item.h;
    const start = Math.max(0, item.x);
    const end = Math.min(cols, item.x + item.w);

    for (let col = start; col < end; col += 1) {
      heights[col] = Math.max(heights[col], bottom);
    }
  }

  return heights;
};

export const findColumnStackPosition = (
  layout: ReadonlyArray<LayoutItem>,
  cols: number,
  w: number
) => {
  const heights = getColumnHeights(layout, cols);
  const maxX = Math.max(0, cols - w);
  let bestX = 0;
  let bestY = 0;
  let bestHeight = Number.POSITIVE_INFINITY;

  for (let x = 0; x <= maxX; x += 1) {
    let columnHeight = 0;

    for (let offset = 0; offset < w; offset += 1) {
      columnHeight = Math.max(columnHeight, heights[x + offset] ?? 0);
    }

    if (columnHeight < bestHeight) {
      bestHeight = columnHeight;
      bestX = x;
      bestY = columnHeight;
    }
  }

  return { x: bestX, y: bestY };
};

export const resizeRatioConstraintHandler: NonNullable<
  LayoutConstraint["constrainSize"]
> = (item, w, h, _handle, context) => {
  if (item.static || item.isResizable === false) {
    return { w, h };
  }

  const minW = item.minW ?? 1;
  const maxW = Math.min(item.maxW ?? 2, context.cols);
  const minH = item.minH ?? 2;
  const maxH = item.maxH ?? 4;
  const target = {
    w: Math.min(Math.max(w, minW), maxW),
    h: Math.min(Math.max(h, minH), maxH),
  };
  const candidates: Array<{ w: number; h: number }> = [];
  const allowedHeights = minH <= 1 ? [1, 2, 4] : [2, 4];

  for (let candidateW = 1; candidateW <= 2; candidateW += 1) {
    for (const candidateH of allowedHeights) {
      if (candidateW < minW || candidateW > maxW) continue;
      if (candidateH < minH || candidateH > maxH) continue;
      if (candidateW > context.cols) continue;
      candidates.push({ w: candidateW, h: candidateH });
    }
  }

  if (candidates.length === 0) {
    return target;
  }

  let best = candidates[0];
  let bestScore = Infinity;

  for (const candidate of candidates) {
    const score =
      Math.abs(candidate.w - target.w) + Math.abs(candidate.h - target.h);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
};
