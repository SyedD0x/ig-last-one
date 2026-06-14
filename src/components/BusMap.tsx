"use client";

import { useEffect, useRef } from "react";

interface LiveLocation {
  bus_id: string;
  bus_name: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

interface BusMapProps {
  liveLocations: LiveLocation[];
  selectedBusId: string;
  studentLocation: { lat: number; lng: number } | null;
  routePoints?: Array<[number, number]>;
  loadingRoute?: boolean;
}

// Default center – New York City (will be overridden when data arrives)
const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];
const DEFAULT_ZOOM = 13;

export default function BusMap({
  liveLocations,
  selectedBusId,
  studentLocation,
  routePoints,
  loadingRoute,
}: BusMapProps) {
  const mapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const busMarkersRef = useRef<Record<string, ReturnType<typeof import("leaflet")["marker"]>>>({});
  const studentMarkerRef = useRef<ReturnType<typeof import("leaflet")["marker"]> | null>(null);
  const routeLineRef = useRef<ReturnType<typeof import("leaflet")["polyline"]> | null>(null);
  const initializedRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (initializedRef.current || !mapDivRef.current) return;
    initializedRef.current = true;

    // Dynamic import of leaflet (client-only)
    import("leaflet").then((L) => {
      if (!mapDivRef.current || mapRef.current) return;

      const map = L.map(mapDivRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      // CartoDB light tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
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

  // Update bus markers
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      const activeIds = new Set(liveLocations.map((l) => l.bus_id));

      // Remove stale markers
      for (const busId of Object.keys(busMarkersRef.current)) {
        if (!activeIds.has(busId)) {
          busMarkersRef.current[busId].remove();
          delete busMarkersRef.current[busId];
        }
      }

      // Add/update markers
      for (const loc of liveLocations) {
        const isSelected = loc.bus_id === selectedBusId;
        const color = isSelected ? "#2563eb" : "#64748b";
        const size = isSelected ? 42 : 34;

        const icon = L.divIcon({
          html: `
            <div style="
              width:${size}px;height:${size}px;
              background:${color};
              border:3px solid white;
              border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              font-size:${isSelected ? 22 : 18}px;
              box-shadow:0 4px 12px ${color}80;
              ${isSelected ? "animation:none;" : ""}
              transition:all 0.3s;
            ">🚌</div>
          `,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        if (busMarkersRef.current[loc.bus_id]) {
          busMarkersRef.current[loc.bus_id]
            .setLatLng([loc.latitude, loc.longitude])
            .setIcon(icon);
        } else {
          const marker = L.marker([loc.latitude, loc.longitude], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:Inter,sans-serif;min-width:160px">
                <div style="font-weight:700;font-size:14px;margin-bottom:4px">🚌 ${loc.bus_name}</div>
                <div style="font-size:12px;color:#666">Speed: ${Math.round(loc.speed)} km/h</div>
                <div style="font-size:11px;color:#999;margin-top:4px">Last update: ${new Date(loc.timestamp).toLocaleTimeString()}</div>
              </div>
            `);
          busMarkersRef.current[loc.bus_id] = marker;
        }
      }

      // Pan to selected bus
      if (selectedBusId) {
        const selLoc = liveLocations.find((l) => l.bus_id === selectedBusId);
        if (selLoc && !studentLocation) {
          map.panTo([selLoc.latitude, selLoc.longitude]);
        }
      }
    });
  }, [liveLocations, selectedBusId, studentLocation]);

  // Student marker
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      if (studentLocation) {
        const icon = L.divIcon({
          html: `
            <div style="
              width:36px;height:36px;
              background:#22c55e;
              border:3px solid white;
              border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              font-size:18px;
              box-shadow:0 4px 12px rgba(34,197,94,0.5);
            ">📍</div>
          `,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        if (studentMarkerRef.current) {
          studentMarkerRef.current.setLatLng([studentLocation.lat, studentLocation.lng]);
        } else {
          studentMarkerRef.current = L.marker(
            [studentLocation.lat, studentLocation.lng],
            { icon }
          )
            .addTo(map)
            .bindPopup("<b>📍 Your Location</b>");
        }

        map.setView([studentLocation.lat, studentLocation.lng], 14);
      } else if (studentMarkerRef.current) {
        studentMarkerRef.current.remove();
        studentMarkerRef.current = null;
      }
    });
  }, [studentLocation]);

  // Route line
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Remove old line
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }

      if (routePoints && routePoints.length >= 2) {
        // GraphHopper returns [lng, lat], Leaflet needs [lat, lng]
        const latLngs = routePoints.map((p): [number, number] => [p[1], p[0]]);

        routeLineRef.current = L.polyline(latLngs, {
          color: "#2563eb",
          weight: 4,
          opacity: 0.8,
          dashArray: loadingRoute ? "8, 8" : undefined,
        }).addTo(map);

        // Fit bounds to show route
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [60, 60] });
      }
    });
  }, [routePoints, loadingRoute]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={mapDivRef}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Loading overlay */}
      {loadingRoute && (
        <div style={{
          position: "absolute", bottom: 80, right: 20, zIndex: 500,
          background: "rgba(15,23,42,0.9)", borderRadius: 8,
          padding: "8px 14px", fontSize: 12, color: "white",
          display: "flex", alignItems: "center", gap: 6,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <span className="spinner" style={{ width: 14, height: 14 }} />
          Calculating route...
        </div>
      )}

      {/* No buses message */}
      {liveLocations.length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(15,23,42,0.85)", borderRadius: 12,
          padding: "20px 28px", textAlign: "center", zIndex: 500,
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚌</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No buses active</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Start demo simulation or wait for driver to connect
          </div>
        </div>
      )}
    </div>
  );
}
