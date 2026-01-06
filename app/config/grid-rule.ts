export type GridBreakpoint = "mobile" | "desktop";
export type GridPosition = { x: number; y: number };
export type GridSize = { w: number; h: number };
export type GridResponsive<T> = { mobile: T; desktop: T };

export type BrickResponsive<T> = {
  mobile: T;
  desktop: T;
};

export const GRID_GAP = 16;
export const GRID_MARGIN: readonly [number, number] = [GRID_GAP, GRID_GAP];
export const CONTAINER_PADDING: readonly [number, number] = [0, 0];
export const DEFAULT_ROW_HEIGHT = 60;
export const DESKTOP_WIDTH = 880;
export const BREAKPOINTS: Record<GridBreakpoint, number> = {
  desktop: 1280,
  mobile: 0,
};
