import { useEffect, useMemo, useState } from "react";
import type { Layout } from "react-grid-layout";
import type { LayoutConstraint } from "react-grid-layout/core";
import { Responsive, useContainerWidth } from "react-grid-layout";
import {
  BREAKPOINTS,
  CONTAINER_PADDING,
  GRID_MARGIN,
  DESKTOP_WIDTH,
  type GridBreakpoint,
} from "@/config/grid-rule";
import {
  getBreakpoint,
  getColumnWidth,
  getRowHeightForSquare,
  resizeRatioConstraintHandler,
} from "@/utils/grid-utils";
import { usePageGridActions, usePageGridState } from "@/components/page/page-grid-context";
import PageGridBrickItem from "@/components/page/page-grid-brick-item";
import {
  GRID_COLS,
  buildLayoutsFromBricks,
} from "../../service/pages/page-grid";

const resizeRatioConstraint: LayoutConstraint = {
  name: "resizeRatioConstraint",
  constrainSize: resizeRatioConstraintHandler,
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
  const { bricks } = usePageGridState();
  const { updateLayout, isEditable } = usePageGridActions();
  const layouts = useMemo(() => {
    const baseLayouts = buildLayoutsFromBricks(bricks);
    if (isEditable) {
      return baseLayouts;
    }

    return {
      desktop: baseLayouts.desktop.map((item) => ({
        ...item,
        isDraggable: false,
        isResizable: false,
      })),
      mobile: baseLayouts.mobile.map((item) => ({
        ...item,
        isDraggable: false,
        isResizable: false,
      })),
    };
  }, [bricks, isEditable]);

  const isDesktop = breakpoint === "desktop";
  const gridWidth = isDesktop ? DESKTOP_WIDTH : containerWidth;
  const cols = GRID_COLS[breakpoint];
  const columnWidth = getColumnWidth(
    gridWidth,
    cols,
    GRID_MARGIN[0],
    CONTAINER_PADDING[0]
  );
  const rowHeight = getRowHeightForSquare(columnWidth, 2, GRID_MARGIN[1]);
  const canRenderGrid = isDesktop || mounted;

  const handleLayoutCommit = (layout: Layout) => {
    if (!isEditable) {
      return;
    }

    updateLayout(layout, breakpoint);
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
            cols={GRID_COLS}
            layouts={layouts}
            rowHeight={rowHeight}
            margin={GRID_MARGIN}
            containerPadding={CONTAINER_PADDING}
            resizeConfig={{
              enabled: isEditable,
            }}
            dragConfig={{
              enabled: isEditable,
            }}
            constraints={[resizeRatioConstraint]}
            onDragStop={handleLayoutCommit}
            onResizeStop={handleLayoutCommit}
          >
            {bricks.map((brick) => (
              <div
                key={brick.id}
                className="grid h-full w-full place-items-center"
              >
                <PageGridBrickItem
                  brick={brick}
                  rowHeight={rowHeight}
                  breakpoint={breakpoint}
                />
              </div>
            ))}
          </Responsive>
        )}
      </div>
    </div>
  );
}
