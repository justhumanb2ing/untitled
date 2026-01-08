import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Layout } from "react-grid-layout";
import { gridBounds, type LayoutConstraint } from "react-grid-layout/core";
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
import {
  usePageGridActions,
  usePageGridState,
} from "@/components/page/page-grid-context";
import BlockResizeController, {
  type ResizeOption,
} from "@/components/page/block-resize-controller";
import PageGridBrickItem from "@/components/page/page-grid-brick-item";
import {
  GRID_COLS,
  buildLayoutsFromBricks,
} from "../../../service/pages/page-grid";
import { MAP_DEFAULT_ZOOM, buildGoogleMapsHref } from "../../../constants/map";
import { motion } from "motion/react";
import { MapSearch } from "@/components/map/map-search";
import type {
  MapCanvasControls,
  MapCanvasViewport,
} from "@/components/map/map-canvas";
import { cn } from "@/lib/utils";
import { SlideshowIcon, StackMinusIcon } from "@phosphor-icons/react";
import { Button } from "../ui/button";

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

type ActiveMapPopover = "controls" | "search" | null;

type UseMapBrickInteractorOptions = {
  onSearchSelect?: (brickId: string, nextCenter: [number, number]) => void;
};

function useMapBrickInteractor({
  onSearchSelect,
}: UseMapBrickInteractorOptions = {}) {
  const mapControlsRef = useRef<Record<string, MapCanvasControls | null>>({});
  const mapControlHandlersRef = useRef<
    Record<string, (controls: MapCanvasControls | null) => void>
  >({});
  const [mapCenters, setMapCenters] = useState<
    Record<string, [number, number] | null>
  >({});
  const [activeMapPopover, setActiveMapPopover] = useState<
    Record<string, ActiveMapPopover>
  >({});
  const [controlsReady, setControlsReady] = useState<Record<string, boolean>>(
    {}
  );

  const handleControlsChange = useCallback(
    (brickId: string, controls: MapCanvasControls | null) => {
      const current = mapControlsRef.current[brickId];
      if (current === controls) {
        return;
      }

      mapControlsRef.current = {
        ...mapControlsRef.current,
        [brickId]: controls,
      };

      if (!controls) {
        setControlsReady((prev) => {
          if (!prev[brickId]) {
            return prev;
          }

          const next = { ...prev };
          delete next[brickId];
          return next;
        });
        return;
      }

      setControlsReady((prev) =>
        prev[brickId] ? prev : { ...prev, [brickId]: true }
      );
    },
    []
  );

  const getMapControlsHandler = useCallback(
    (brickId: string) => {
      if (!mapControlHandlersRef.current[brickId]) {
        mapControlHandlersRef.current[brickId] = (
          controls: MapCanvasControls | null
        ) => {
          handleControlsChange(brickId, controls);
        };
      }

      return mapControlHandlersRef.current[brickId];
    },
    [handleControlsChange]
  );

  const handleMapControlsToggle = useCallback((brickId: string) => {
    const controls = mapControlsRef.current[brickId];
    if (!controls) {
      return;
    }

    controls.toggleMove();
    setActiveMapPopover((prev) => ({
      ...prev,
      [brickId]: prev[brickId] === "controls" ? null : "controls",
    }));
  }, []);

  const handleMapSearchOpenChange = useCallback(
    (brickId: string, open: boolean) => {
      setActiveMapPopover((prev) => {
        const current = prev[brickId];
        if (open) {
          return { ...prev, [brickId]: "search" };
        }
        if (current === "search") {
          return { ...prev, [brickId]: null };
        }

        return prev;
      });
    },
    []
  );

  const handleMapSearchSelect = useCallback(
    (brickId: string, nextCenter: [number, number]) => {
      setMapCenters((prev) => ({
        ...prev,
        [brickId]: nextCenter,
      }));
      setActiveMapPopover((prev) => ({
        ...prev,
        [brickId]: null,
      }));
      onSearchSelect?.(brickId, nextCenter);
    },
    [onSearchSelect]
  );

  return {
    mapCenters,
    activeMapPopover,
    controlsReady,
    getMapControlsHandler,
    handleMapControlsToggle,
    handleMapSearchOpenChange,
    handleMapSearchSelect,
  };
}
export default function PageGridBrickSection({
  isMobilePreview = false,
}: GridTestProps) {
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
  const { updateLayout, removeBrick, isEditable, updateMapBrick } =
    usePageGridActions();
  const mapBrickZoomRef = useRef<Record<string, number | null>>({});
  useEffect(() => {
    const nextZooms: Record<string, number | null> = {};
    for (const brick of bricks) {
      if (brick.type === "map") {
        nextZooms[brick.id] = brick.data.zoom;
      }
    }
    mapBrickZoomRef.current = nextZooms;
  }, [bricks]);

  const mapAutoSaveTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const pendingMapViewportsRef = useRef<Record<string, MapCanvasViewport>>({});

  useEffect(() => {
    return () => {
      Object.values(mapAutoSaveTimersRef.current).forEach(clearTimeout);
    };
  }, []);
  const scheduleMapUpdate = useCallback(
    (brickId: string, viewport: MapCanvasViewport) => {
      pendingMapViewportsRef.current[brickId] = viewport;

      if (mapAutoSaveTimersRef.current[brickId]) {
        clearTimeout(mapAutoSaveTimersRef.current[brickId]);
      }

      mapAutoSaveTimersRef.current[brickId] = setTimeout(() => {
        const nextViewport = pendingMapViewportsRef.current[brickId];
        if (!nextViewport) {
          delete mapAutoSaveTimersRef.current[brickId];
          return;
        }

        const [lng, lat] = nextViewport.center;
        const normalizedZoom = Number.isFinite(nextViewport.zoom)
          ? Number(nextViewport.zoom.toFixed(2))
          : MAP_DEFAULT_ZOOM;

        updateMapBrick({
          id: brickId,
          data: {
            lat,
            lng,
            zoom: normalizedZoom,
            href: buildGoogleMapsHref(lat, lng, normalizedZoom),
          },
        });

        delete pendingMapViewportsRef.current[brickId];
        delete mapAutoSaveTimersRef.current[brickId];
      }, 650);
    },
    [updateMapBrick]
  );

  const handleMapSearchSelection = useCallback(
    (brickId: string, nextCenter: [number, number]) => {
      const recordedZoom = mapBrickZoomRef.current[brickId];
      const targetZoom = Number.isFinite(recordedZoom ?? NaN)
        ? recordedZoom!
        : MAP_DEFAULT_ZOOM;

      scheduleMapUpdate(brickId, {
        center: nextCenter,
        zoom: targetZoom,
      });
    },
    [scheduleMapUpdate]
  );

  const handleMapViewportChange = useCallback(
    (brickId: string, viewport: MapCanvasViewport) => {
      scheduleMapUpdate(brickId, viewport);
    },
    [scheduleMapUpdate]
  );
  const layouts = useMemo(() => {
    const baseLayouts = buildLayoutsFromBricks(bricks);
    if (isEditable) {
      return baseLayouts;
    }

    return {
      desktop:
        baseLayouts.desktop &&
        baseLayouts.desktop.map((item) => ({
          ...item,
          isDraggable: false,
          isResizable: false,
        })),
      mobile:
        baseLayouts.mobile &&
        baseLayouts.mobile.map((item) => ({
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

  const {
    mapCenters,
    activeMapPopover,
    controlsReady,
    getMapControlsHandler,
    handleMapControlsToggle,
    handleMapSearchOpenChange,
    handleMapSearchSelect,
  } = useMapBrickInteractor({
    onSearchSelect: handleMapSearchSelection,
  });

  const handleResizeOptionSelect = (brickId: string, size: ResizeOption) => {
    if (!isEditable) {
      return;
    }

    const layout = layouts?.[breakpoint];
    if (!layout) {
      return;
    }

    const targetItem = layout.find((item) => item.i === brickId);
    if (targetItem && targetItem.w === size.w && targetItem.h === size.h) {
      return;
    }

    updateLayout(
      layout.map((item) =>
        item.i === brickId ? { ...item, w: size.w, h: size.h } : item
      ),
      breakpoint
    );
  };

  const handleBlockRemove = (brickId: string) => {
    if (!isEditable) {
      return;
    }

    removeBrick(brickId);
  };

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
              enabled: false,
            }}
            dragConfig={{
              enabled: isEditable,
              cancel: ".editable-paragraph",
            }}
            constraints={[gridBounds, resizeRatioConstraint]}
            onDragStop={handleLayoutCommit}
            onResizeStop={handleLayoutCommit}
          >
            {bricks.map((brick) => {
              const isMapBrick = brick.type === "map";
              const baseCenter =
                isMapBrick && brick.data.lng !== null && brick.data.lat !== null
                  ? ([brick.data.lng, brick.data.lat] as [number, number])
                  : null;
              const centerOverride =
                mapCenters[brick.id] ?? baseCenter ?? undefined;
              const mapPopoverState = activeMapPopover[brick.id] ?? null;
              const mapOverrides = isMapBrick
                ? {
                    center: centerOverride,
                    controlsPanelOpen: mapPopoverState === "controls",
                    onControlsChange: getMapControlsHandler(brick.id),
                    onViewportChange: (viewport) =>
                      handleMapViewportChange(brick.id, viewport),
                  }
                : undefined;
              const controlsAvailable = !!controlsReady[brick.id];

              return (
                <div
                  key={brick.id}
                  className={cn(
                    "relative grid h-full w-full place-items-center",
                    isEditable && "cursor-grab group"
                  )}
                >
                  {isEditable && (
                    <aside className="z-9999 absolute -top-3 -right-3 opacity-0 pointer-events-none transition duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
                      <div
                        className={cn(
                          "pointer-events-auto bg-black/80 backdrop-blur-md p-1 rounded-xl flex shadow-xl border border-white/10 animate-in fade-in zoom-in duration-200 items-center"
                        )}
                      >
                        <Button
                          type="button"
                          size={"icon-lg"}
                          variant={"ghost"}
                          data-no-drag
                          className={cn(
                            "transition-all rounded-lg hover:bg-white/10"
                          )}
                          aria-label="블록 삭제"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleBlockRemove(brick.id);
                          }}
                        >
                          <StackMinusIcon
                            weight="bold"
                            className="size-4 text-white"
                          />
                        </Button>
                      </div>
                    </aside>
                  )}

                  {isEditable && brick.type !== "text" && (
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-9999 flex gap-1 opacity-0 pointer-events-none transition duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
                      <div
                        data-no-drag
                        className={cn(
                          "pointer-events-auto bg-black/80 backdrop-blur-md p-1 rounded-xl flex shadow-xl border border-white/10 animate-in fade-in zoom-in duration-200 items-center"
                        )}
                        onMouseDown={(event) => event.stopPropagation()}
                        onTouchStart={(event) => event.stopPropagation()}
                      >
                        <BlockResizeController
                          currentSize={brick.style[breakpoint].grid}
                          onSelect={(size) =>
                            handleResizeOptionSelect(brick.id, size)
                          }
                        />
                        {isMapBrick && (
                          <div className="flex items-center">
                            <Button
                              type="button"
                              size={"icon-lg"}
                              variant="ghost"
                              data-no-drag
                              disabled={!controlsAvailable}
                              className={cn(
                                "transition-colors rounded-lg focus-visible:z-10",
                                mapPopoverState === "controls"
                                  ? "bg-brand text-white hover:bg-brand"
                                  : "hover:bg-white/10"
                              )}
                              aria-pressed={mapPopoverState === "controls"}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleMapControlsToggle(brick.id);
                              }}
                            >
                              <motion.p whileTap={{ scale: 0.8 }}>
                                <SlideshowIcon
                                  weight="bold"
                                  className="size-4 text-white"
                                />
                              </motion.p>
                            </Button>
                            <div data-no-drag>
                              <MapSearch
                                onSelect={(nextCenter) =>
                                  handleMapSearchSelect(brick.id, nextCenter)
                                }
                                isOpen={mapPopoverState === "search"}
                                onOpenChange={(open) =>
                                  handleMapSearchOpenChange(brick.id, open)
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <PageGridBrickItem
                    brick={brick}
                    rowHeight={rowHeight}
                    breakpoint={breakpoint}
                    mapOverrides={mapOverrides}
                  />
                </div>
              );
            })}
          </Responsive>
        )}
      </div>
    </div>
  );
}
