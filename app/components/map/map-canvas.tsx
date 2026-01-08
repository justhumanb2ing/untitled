import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import {
  ArrowCircleUpRightIcon,
  CrosshairSimpleIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "../../../constants/map";
import { cn } from "@/lib/utils";

type Props = {
  center?: [number, number];
  zoom?: number;
  onControlsChange?: (controls: MapCanvasControls | null) => void;
  controlsPanelOpen?: boolean;
  showCenterIndicator?: boolean;
  showLocationLabel?: boolean;
  showGeolocateControl?: boolean;
  locationLabel?: string | null;
  href: string;
};

export type MapCanvasControls = {
  canMove: boolean;
  toggleMove: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  geolocate: () => void;
};

export function MapCanvas({
  center,
  zoom,
  onControlsChange,
  controlsPanelOpen = false,
  showCenterIndicator = true,
  showLocationLabel = true,
  showGeolocateControl = true,
  locationLabel = null,
  href,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const [canMove, setCanMove] = useState(false);

  function enableMapInteraction(map: mapboxgl.Map) {
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.boxZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
  }

  function disableMapInteraction(map: mapboxgl.Map) {
    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.dragPan.disable();
    map.keyboard.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
  }

  const toggleMove = useCallback(() => {
    if (!mapRef.current) return;

    setCanMove((prevCanMove) => {
      const nextCanMove = !prevCanMove;

      if (nextCanMove) {
        enableMapInteraction(mapRef.current!);
      } else {
        disableMapInteraction(mapRef.current!);
      }

      return nextCanMove;
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/justhumanb2ing/cmk406try001601pr180409zf",
      center: center ?? MAP_DEFAULT_CENTER,
      zoom: zoom ?? MAP_DEFAULT_ZOOM,
      maxZoom: 15,
      minZoom: 7,
      accessToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN,
      attributionControl: false,
      logoPosition: "bottom-right",
    });

    disableMapInteraction(map);
    mapRef.current = map;

    map.on("moveend", () => {
      const c = map.getCenter();
      // 현재 중심 좌표: c.lng, c.lat
    });

    map.on("load", () => {
      if (!showGeolocateControl) {
        return;
      }

      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: false,
      });

      geolocateRef.current = geolocate;

      // ❗ 반드시 map에 추가해야 함
      map.addControl(geolocate);

      geolocate.on("geolocate", (e) => {
        const lngLat: [number, number] = [
          e.coords.longitude,
          e.coords.latitude,
        ];

        map.flyTo({
          center: lngLat,
          zoom: MAP_DEFAULT_ZOOM,
          essential: true,
        });
      });
    });
  }, []);

  /** 외부 center 변경용 마커 */
  useEffect(() => {
    if (!mapRef.current || !center) return;

    mapRef.current.flyTo({
      center,
      zoom: zoom ?? MAP_DEFAULT_ZOOM,
      essential: true,
    });
  }, [center, zoom]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !containerRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!canMove) return;
    mapRef.current?.zoomIn();
  }, [canMove]);

  const handleZoomOut = useCallback(() => {
    if (!canMove) return;
    mapRef.current?.zoomOut();
  }, [canMove]);

  const handleGeolocate = useCallback(() => {
    if (!canMove) return;
    geolocateRef.current?.trigger();
  }, [canMove]);

  const controlsPayload = useMemo(
    () => ({
      canMove,
      toggleMove,
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      geolocate: handleGeolocate,
    }),
    [canMove, toggleMove, handleZoomIn, handleZoomOut, handleGeolocate]
  );

  useEffect(() => {
    onControlsChange?.(controlsPayload);
  }, [onControlsChange, controlsPayload]);

  useEffect(() => {
    return () => {
      onControlsChange?.(null);
    };
  }, [onControlsChange]);

  const controlsReady = Boolean(mapRef.current);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="map-wrapper w-full h-full rounded-xl overflow-hidden"
      />
      {/* 중앙 고정 마커 (UI Overlay) */}
      {showCenterIndicator && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="size-7 flex items-center justify-center bg-white rounded-full p-1 shadow-[1px_2px_13px_4px_rgba(0,0,0,0.25)]">
            <div className="size-full bg-blue-500 rounded-full" />
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-0 px-3 flex items-center justify-between w-full">
        {showLocationLabel && (
          <div
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Location"
            data-empty={!locationLabel}
            className={cn(
              "relative editable-paragraph cursor-text",
              "min-w-24 bg-background border rounded-lg p-2 py-2 w-fit focus:outline-none text-base",
              "data-[empty=true]:before:content-[attr(data-placeholder)] data-[empty=true]:before:absolute data-[empty=true]:before:left-3 data-[empty=true]:before:right-3 data-[empty=true]:before:top-1/2 data-[empty=true]:before:-translate-y-1/2 data-[empty=true]:before:flex data-[empty=true]:before:items-center data-[empty=true]:before:text-muted-foreground"
            )}
          >
            {locationLabel}
          </div>
        )}
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="bg-white rounded-full right-3 size-8 hover:bg-muted-foreground/20 shadow-[1px_2px_13px_4px_rgba(0,0,0,0.25)]"
          >
            <ArrowCircleUpRightIcon
              weight="fill"
              className="size-full text-black"
            />
          </a>
        )}
      </div>

      {controlsPanelOpen && (
        <div className="absolute top-4 right-4">
          <ButtonGroup
            orientation={"vertical"}
            aria-label="Map controls"
            className="-space-y-0.5"
          >
            <Button
              size="icon-lg"
              className="transition-none focus-visible:z-10 bg-black text-white hover:bg-black/80"
              disabled={!mapRef.current}
              onClick={() => handleZoomIn()}
            >
              <motion.p whileTap={{ scale: 0.8 }}>
                <PlusIcon weight="bold" />
              </motion.p>
            </Button>
            <Button
              size="icon-lg"
              className="transition-none focus-visible:z-10 bg-black text-white hover:bg-black/80"
              disabled={!mapRef.current}
              onClick={() => handleZoomOut()}
            >
              <motion.p whileTap={{ scale: 0.8 }}>
                <MinusIcon weight="bold" />
              </motion.p>
            </Button>
            <Button
              size="icon-lg"
              className="transition-none focus-visible:z-10 bg-black text-white hover:bg-black/80"
              disabled={!mapRef.current}
              onClick={() => handleGeolocate()}
            >
              <motion.p whileTap={{ scale: 0.8 }}>
                <CrosshairSimpleIcon weight="bold" />
              </motion.p>
            </Button>
          </ButtonGroup>
        </div>
      )}
    </div>
  );
}
