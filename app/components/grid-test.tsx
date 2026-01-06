import { useEffect, useRef, useState } from "react";
import type {
  Layout,
  LayoutItem,
  ResponsiveLayouts,
} from "react-grid-layout";
import type { LayoutConstraint } from "react-grid-layout/core";
import { Responsive, useContainerWidth } from "react-grid-layout";
import { Item } from "./ui/item";

type ItemType = "text" | "link" | "image" | "video";
type BreakpointKey = "xl" | "base";

type GridItemData = {
  id: string;
  type: ItemType;
  label: string;
};

const GRID_GAP = 16;
const GRID_MARGIN: readonly [number, number] = [GRID_GAP, GRID_GAP];
const CONTAINER_PADDING: readonly [number, number] = [0, 0];
const DEFAULT_ROW_HEIGHT = 60;
const XL_WIDTH = 820;
const BREAKPOINTS: Record<BreakpointKey, number> = { xl: 1280, base: 0 };
const COLS: Record<BreakpointKey, number> = { xl: 4, base: 2 };
const ITEM_TYPES: ItemType[] = ["text", "link", "image", "video"];
const ITEM_LABELS: Record<ItemType, string> = {
  text: "Text",
  link: "Link",
  image: "Image",
  video: "Video",
};
const INITIAL_ITEMS: GridItemData[] = [
  { id: "item-1", type: "text", label: "Text Block" },
  { id: "item-2", type: "link", label: "Primary Link" },
  { id: "item-3", type: "image", label: "Image Card" },
  { id: "item-4", type: "video", label: "Video Tile" },
];

const getBreakpoint = (width: number): BreakpointKey =>
  width >= BREAKPOINTS.xl ? "xl" : "base";

const getColumnWidth = (
  width: number,
  cols: number,
  marginX: number,
  paddingX: number
) => {
  if (cols <= 0) return 0;
  return (width - marginX * (cols - 1) - paddingX * 2) / cols;
};

const getRowHeightForSquare = (
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

const getColumnHeights = (
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

const findColumnStackPosition = (
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

const resizeRatioConstraintHandler: NonNullable<
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
  const allowedHeights = [2, 4];

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

const resizeRatioConstraint: LayoutConstraint = {
  name: "resizeRatioConstraint",
  constrainSize: resizeRatioConstraintHandler,
};

/** Build a layout item with type-aware defaults and resize constraints. */
const createLayoutItem = (
  item: GridItemData,
  breakpoint: BreakpointKey,
  layout: ReadonlyArray<LayoutItem>
): LayoutItem => {
  const isText = item.type === "text";
  const cols = COLS[breakpoint];
  const w = isText ? cols : 1;
  const h = isText ? 1 : 2;
  const { x, y } = findColumnStackPosition(layout, cols, w);

  return {
    i: item.id,
    x,
    y,
    w,
    h,
    minW: isText ? w : 1,
    maxW: isText ? w : 2,
    minH: isText ? h : 2,
    maxH: isText ? h : 4,
    isResizable: !isText,
  };
};

const buildLayouts = (
  items: GridItemData[]
): ResponsiveLayouts<BreakpointKey> => {
  const xl: LayoutItem[] = [];
  const base: LayoutItem[] = [];

  for (const item of items) {
    xl.push(createLayoutItem(item, "xl", xl));
    base.push(createLayoutItem(item, "base", base));
  }

  return { xl, base };
};

const useWindowBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>(() => {
    if (typeof window === "undefined") return "base";
    return getBreakpoint(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint((prev) => {
        const next = getBreakpoint(window.innerWidth);
        return prev === next ? prev : next;
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return breakpoint;
};

type GridTestProps = {
  isMobilePreview?: boolean;
};

export default function GridTest({ isMobilePreview = false }: GridTestProps) {
  const viewportBreakpoint = useWindowBreakpoint();
  const breakpoint: BreakpointKey = isMobilePreview
    ? "base"
    : viewportBreakpoint;
  const {
    width: containerWidth,
    containerRef,
    mounted,
  } = useContainerWidth({
    measureBeforeMount: true,
  });
  const [items, setItems] = useState<GridItemData[]>(INITIAL_ITEMS);
  const [layouts, setLayouts] = useState<ResponsiveLayouts<BreakpointKey>>(() =>
    buildLayouts(INITIAL_ITEMS)
  );
  const nextIdRef = useRef(INITIAL_ITEMS.length + 1);

  const isXl = breakpoint === "xl";
  const gridWidth = isXl ? XL_WIDTH : containerWidth;
  const cols = COLS[breakpoint];
  const columnWidth = getColumnWidth(
    gridWidth,
    cols,
    GRID_MARGIN[0],
    CONTAINER_PADDING[0]
  );
  const rowHeight = getRowHeightForSquare(columnWidth, 2, GRID_MARGIN[1]);
  const canRenderGrid = isXl || mounted;

  const handleLayoutChange = (layout: Layout) => {
    setLayouts((prev) => ({ ...prev, [breakpoint]: layout }));
  };

  const handleAddItem = (type: ItemType) => {
    const id = `item-${nextIdRef.current}`;
    nextIdRef.current += 1;
    const label = `${ITEM_LABELS[type]} ${nextIdRef.current - 1}`;
    const nextItem: GridItemData = { id, type, label };

    setItems((prev) => [...prev, nextItem]);
    setLayouts((prev) => ({
      xl: [...(prev.xl ?? []), createLayoutItem(nextItem, "xl", prev.xl ?? [])],
      base: [
        ...(prev.base ?? []),
        createLayoutItem(nextItem, "base", prev.base ?? []),
      ],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ITEM_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleAddItem(type)}
            className="rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
          >
            Add {ITEM_LABELS[type]}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className={`${isXl ? "" : "w-full"}`}
        style={
          isXl
            ? {
                width: XL_WIDTH,
                minWidth: XL_WIDTH,
                maxWidth: XL_WIDTH,
              }
            : undefined
        }
      >
        {canRenderGrid && (
          <Responsive
            width={gridWidth}
            breakpoint={breakpoint}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            layouts={layouts}
            rowHeight={rowHeight}
            margin={GRID_MARGIN}
            containerPadding={CONTAINER_PADDING}
            resizeConfig={{
              enabled: true,
            }}
            constraints={[resizeRatioConstraint]}
            onLayoutChange={handleLayoutChange}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="grid h-full w-full place-items-center"
              >
                <Item
                  variant={"muted"}
                  render={
                    <>
                      <div
                        className="flex h-full w-full flex-col justify-between rounded-3xl border bg-muted p-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.type}
                        </div>
                        <div className="text-sm font-medium">{item.label}</div>
                      </div>
                    </>
                  }
                />
              </div>
            ))}
          </Responsive>
        )}
      </div>
    </div>
  );
}
