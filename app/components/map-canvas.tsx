import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

type Props = {
  center?: [number, number];
  zoom?: number;
};

export function MapCanvas({ center, zoom }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const geoMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [canMove, setCanMove] = useState(false);

  function enableMapInteraction(map: mapboxgl.Map) {
    map.dragPan.enable();
    map.scrollZoom.enable();
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

  function toggleMove() {
    if (!mapRef.current) return;

    if (canMove) {
      disableMapInteraction(mapRef.current);
    } else {
      enableMapInteraction(mapRef.current);
    }

    setCanMove(!canMove);
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/justhumanb2ing/cmk406try001601pr180409zf",
      center: center ?? [126.9970831, 37.550263],
      zoom: zoom ?? 13,
      accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
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
          zoom: 13,
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
      zoom: zoom ?? 14,
      essential: true,
    });
  }, [center, zoom]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 16,
          overflow: "hidden",
        }}
        className="map-wrapper"
      />
      {/* 중앙 고정 마커 (UI Overlay) */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
            borderRadius: "9999px",
            padding: 4,
            boxShadow: "1px 2px 13px 4px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#3B82F6",
              borderRadius: "9999px",
            }}
          />
        </div>
      </div>

      {/* 완전 커스텀 컨트롤 */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button onClick={() => mapRef.current?.zoomIn()}>＋</button>
        <button onClick={() => mapRef.current?.zoomOut()}>－</button>
        {/* TODO: 내 위치 찾지 못하는 오류 발생 -> 원인 파악 못함 */}
        <button
          onClick={() => {
            geolocateRef.current?.trigger();
          }}
          disabled
        >
          내 위치
        </button>
        <button
          onClick={toggleMove}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium",
            canMove ? "bg-blue-600 text-white" : "bg-white text-gray-900 border"
          )}
        >
          {canMove ? "Done" : "Move"}
        </button>
      </div>
    </div>
  );
}
