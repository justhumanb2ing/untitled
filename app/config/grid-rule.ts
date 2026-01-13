export type GridBreakpoint = "mobile" | "desktop";
export type GridPosition = { x: number; y: number };
export type GridSize = { w: number; h: number };
export type GridResponsive<T> = { mobile: T; desktop: T };

export type BrickResponsive<T> = {
  mobile: T;
  desktop: T;
};

export const GRID_GAP = 32;
export const GRID_MARGIN: Partial<
  Record<"mobile" | "desktop", readonly [number, number]>
> = {
  desktop: [GRID_GAP, GRID_GAP],
};
export const CONTAINER_PADDING: Partial<
  Record<"mobile" | "desktop", readonly [number, number]>
> = { desktop: [16, 16], mobile: [6,6] };
export const DEFAULT_ROW_HEIGHT = 40;
export const DESKTOP_WIDTH = 880;
export const BREAKPOINTS: Record<GridBreakpoint, number> = {
  desktop: 1280,
  mobile: 0,
};
