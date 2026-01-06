import { useEffect, useRef, useState } from "react";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import type { LayoutConstraint } from "react-grid-layout/core";
import { Responsive, useContainerWidth } from "react-grid-layout";
import { Item } from "./ui/item";
import {
  BREAKPOINTS,
  CONTAINER_PADDING,
  GRID_MARGIN,
  DESKTOP_WIDTH,
  type GridBreakpoint,
} from "@/config/grid-rule";
import {
  findColumnStackPosition,
  getBreakpoint,
  getColumnWidth,
  getRowHeightForSquare,
  resizeRatioConstraintHandler,
} from "@/utils/grid-utils";
import type { BrickRow, BrickType } from "types/brick";

type GridItemType = Exclude<BrickType, "map" | "section">;

type GridItemData = {
  id: string;
  type: GridItemType;
  label: string;
};

const COLS: Record<GridBreakpoint, number> = { desktop: 4, mobile: 2 };
const ITEM_LABELS: Record<GridItemType, string> = {
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

const resizeRatioConstraint: LayoutConstraint = {
  name: "resizeRatioConstraint",
  constrainSize: resizeRatioConstraintHandler,
};

/** Build a layout item with type-aware defaults and resize constraints. */
const createLayoutItem = (
  item: GridItemData,
  breakpoint: GridBreakpoint,
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
): ResponsiveLayouts<GridBreakpoint> => {
  const desktop: LayoutItem[] = [];
  const mobile: LayoutItem[] = [];

  for (const item of items) {
    desktop.push(createLayoutItem(item, "desktop", desktop));
    mobile.push(createLayoutItem(item, "mobile", mobile));
  }

  return { desktop, mobile };
};

const useWindowBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<GridBreakpoint>(() => {
    if (typeof window === "undefined") return "mobile";
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

function brickToLayoutItem(brick: BrickRow): LayoutItem {
  const { x, y } = brick.position.desktop;
  const { w, h } = brick.style.desktop.grid;

  return {
    i: brick.id,
    x,
    y,
    w,
    h,
    isResizable: true,
  };
}

function applyLayoutToBrick(
  brick: BrickRow,
  layout: LayoutItem,
  breakpoint: "mobile" | "desktop"
): BrickRow {
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
    updated_at: new Date().toISOString(),
  };
}

type GridTestProps = {
  isMobilePreview?: boolean;
};

export default function PageGridBrickSection({ isMobilePreview = false }: GridTestProps) {
  const viewportBreakpoint = useWindowBreakpoint();
  const breakpoint: GridBreakpoint = isMobilePreview
    ? "mobile"
    : viewportBreakpoint;
  const {
    width: containerWidth,
    containerRef,
    mounted,
  } = useContainerWidth({
    measureBeforeMount: true,
  });
  const [items, setItems] = useState<GridItemData[]>(INITIAL_ITEMS);
  const [layouts, setLayouts] = useState<ResponsiveLayouts<GridBreakpoint>>(
    () => buildLayouts(INITIAL_ITEMS)
  );
  const nextIdRef = useRef(INITIAL_ITEMS.length + 1);

  const isDesktop = breakpoint === "desktop";
  const gridWidth = isDesktop ? DESKTOP_WIDTH : containerWidth;
  const cols = COLS[breakpoint];
  const columnWidth = getColumnWidth(
    gridWidth,
    cols,
    GRID_MARGIN[0],
    CONTAINER_PADDING[0]
  );
  const rowHeight = getRowHeightForSquare(columnWidth, 2, GRID_MARGIN[1]);
  const canRenderGrid = isDesktop || mounted;

  const handleLayoutChange = (layout: Layout) => {
    setLayouts((prev) => ({ ...prev, [breakpoint]: layout }));
  };

  const handleAddItem = (type: GridItemType) => {
    const id = `item-${nextIdRef.current}`;
    nextIdRef.current += 1;
    const label = `${ITEM_LABELS[type]} ${nextIdRef.current - 1}`;
    const nextItem: GridItemData = { id, type, label };

    setItems((prev) => [...prev, nextItem]);
    setLayouts((prev) => ({
      desktop: [
        ...(prev.desktop ?? []),
        createLayoutItem(nextItem, "desktop", prev.desktop ?? []),
      ],
      mobile: [
        ...(prev.mobile ?? []),
        createLayoutItem(nextItem, "mobile", prev.mobile ?? []),
      ],
    }));
  };

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className={`${isDesktop ? "" : "w-full"}`}
        style={
          isDesktop
            ? {
                width: DESKTOP_WIDTH,
                minWidth: DESKTOP_WIDTH,
                maxWidth: DESKTOP_WIDTH,
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
                      <div className="flex h-full w-full flex-col justify-between rounded-3xl border bg-muted p-3">
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
