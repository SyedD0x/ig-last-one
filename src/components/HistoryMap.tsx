"use client";

import { useEffect, useRef } from "react";

interface LocationPoint {
  id: number;
  busId: string;
  busName: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

interface HistoryMapProps {
  history: LocationPoint[];
  playbackIndex: number;
}

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];

export default function HistoryMap({ history, playbackIndex }: HistoryMapProps) {
  const mapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const routeLineRef = useRef<ReturnType<typeof import("leaflet")["polyline"]> | null>(null);
  const playheadMarkerRef = useRef<ReturnType<typeof import("leaflet")["marker"]> | null>(null);
  const startMarkerRef = useRef<ReturnType<typeof import("leaflet")["marker"]> | null>(null);
  const endMarkerRef = useRef<ReturnType<typeof import("leaflet")["marker"]> | null>(null);
  const initializedRef = useRef(false);

  // Init map
  useEffect(() => {
    if (initializedRef.current || !mapDivRef.current) return;
    initializedRef.current = true;

    import("leaflet").then((L) => {
      if (!mapDivRef.current || mapRef.current) return;

      const map = L.map(mapDivRef.current, {
        center: DEFAULT_CENTER,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []);

  // Draw full route when history changes
  useEffect(() => {
    if (!mapRef.current || history.length === 0) return;

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Clean up old layers
      if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }
      if (startMarkerRef.current) { startMarkerRef.current.remove(); startMarkerRef.current = null; }
      if (endMarkerRef.current) { endMarkerRef.current.remove(); endMarkerRef.current = null; }

      const latLngs = history.map((p): [number, number] => [p.latitude, p.longitude]);

      // Full route polyline
      routeLineRef.current = L.polyline(latLngs, {
        color: "#2563eb",
        weight: 4,
        opacity: 0.7,
      }).addTo(map);

      // Start marker (green)
      const startIcon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;background:#22c55e;border:3px solid white;
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:16px;box-shadow:0 3px 10px rgba(34,197,94,0.5);
        ">🟢</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      startMarkerRef.current = L.marker(latLngs[0], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<b>Start</b><br>${new Date(history[0].timestamp).toLocaleString()}`);

      // End marker (red)
      const endIcon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;background:#ef4444;border:3px solid white;
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:16px;box-shadow:0 3px 10px rgba(239,68,68,0.5);
        ">🔴</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      endMarkerRef.current = L.marker(latLngs[latLngs.length - 1], { icon: endIcon })
        .addTo(map)
        .bindPopup(`<b>End</b><br>${new Date(history[history.length - 1].timestamp).toLocaleString()}`);

      // Fit bounds
      map.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60] });
    });
  }, [history]);

  // Playback marker
  useEffect(() => {
    if (!mapRef.current || history.length === 0) return;

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      const point = history[playbackIndex];
      if (!point) return;

      const icon = L.divIcon({
        html: `<div style="
          width:40px;height:40px;background:#f59e0b;border:3px solid white;
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:20px;box-shadow:0 4px 14px rgba(245,158,11,0.6);
          animation:none;
        ">🚌</div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (playheadMarkerRef.current) {
        playheadMarkerRef.current.setLatLng([point.latitude, point.longitude]).setIcon(icon);
      } else {
        playheadMarkerRef.current = L.marker([point.latitude, point.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <b>🚌 ${point.busName}</b><br>
            Speed: ${Math.round(point.speed)} km/h<br>
            Time: ${new Date(point.timestamp).toLocaleTimeString()}
          `);
      }
    });
  }, [history, playbackIndex]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />

      {history.length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(15,23,42,0.85)", borderRadius: 12,
          padding: "24px 32px", textAlign: "center", zIndex: 500,
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No trip data loaded</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Select a bus and date, then click &quot;Load Trip&quot;
          </div>
        </div>
      )}
    </div>
  );
}
