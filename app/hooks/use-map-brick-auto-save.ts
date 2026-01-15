import { useCallback, useEffect, useRef } from "react";
import type { MapCanvasViewport } from "@/components/map/map-canvas";
import type { PageGridBrick } from "../../service/pages/page-grid";
import { MAP_DEFAULT_ZOOM, buildGoogleMapsHref } from "../utils/map";

const isMapBrick = (
  brick: PageGridBrick
): brick is PageGridBrick<"map"> => brick.type === "map";

type MapBrickUpdate = {
  id: string;
  data: {
    lat?: number;
    lng?: number;
    zoom?: number;
    href?: string;
  };
};

type UseMapBrickAutoSaveOptions = {
  bricks: PageGridBrick[];
  updateMapBrick: (update: MapBrickUpdate) => void;
  debounceMs?: number;
};

type UseMapBrickAutoSaveReturn = {
  handleViewportChange: (brickId: string, viewport: MapCanvasViewport) => void;
  handleSearchSelection: (brickId: string, center: [number, number]) => void;
};

/**
 * 맵 브릭의 뷰포트 변경을 자동 저장하는 훅
 *
 * debouncing을 통해 빈번한 업데이트를 방지합니다.
 *
 * @param bricks - 브릭 목록
 * @param updateMapBrick - 맵 브릭 업데이트 콜백
 * @param debounceMs - debounce 지연 시간 (기본값: 650ms)
 */
export function useMapBrickAutoSave({
  bricks,
  updateMapBrick,
  debounceMs = 650,
}: UseMapBrickAutoSaveOptions): UseMapBrickAutoSaveReturn {
  const mapBrickZoomRef = useRef<Record<string, number | null>>({});
  const autoSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const pendingViewportsRef = useRef<Record<string, MapCanvasViewport>>({});

  // 브릭 목록이 변경될 때 zoom 값 동기화
  useEffect(() => {
    const nextZooms: Record<string, number | null> = {};
    for (const brick of bricks) {
      if (isMapBrick(brick)) {
        nextZooms[brick.id] = brick.data.zoom;
      }
    }
    mapBrickZoomRef.current = nextZooms;
  }, [bricks]);

  // cleanup
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const scheduleUpdate = useCallback(
    (brickId: string, viewport: MapCanvasViewport) => {
      pendingViewportsRef.current[brickId] = viewport;

      if (autoSaveTimersRef.current[brickId]) {
        clearTimeout(autoSaveTimersRef.current[brickId]);
      }

      autoSaveTimersRef.current[brickId] = setTimeout(() => {
        const nextViewport = pendingViewportsRef.current[brickId];
        if (!nextViewport) {
          delete autoSaveTimersRef.current[brickId];
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

        delete pendingViewportsRef.current[brickId];
        delete autoSaveTimersRef.current[brickId];
      }, debounceMs);
    },
    [debounceMs, updateMapBrick]
  );

  const handleViewportChange = useCallback(
    (brickId: string, viewport: MapCanvasViewport) => {
      scheduleUpdate(brickId, viewport);
    },
    [scheduleUpdate]
  );

  const handleSearchSelection = useCallback(
    (brickId: string, nextCenter: [number, number]) => {
      const recordedZoom = mapBrickZoomRef.current[brickId];
      const targetZoom = Number.isFinite(recordedZoom ?? NaN)
        ? recordedZoom!
        : MAP_DEFAULT_ZOOM;

      scheduleUpdate(brickId, {
        center: nextCenter,
        zoom: targetZoom,
      });
    },
    [scheduleUpdate]
  );

  return {
    handleViewportChange,
    handleSearchSelection,
  };
}
