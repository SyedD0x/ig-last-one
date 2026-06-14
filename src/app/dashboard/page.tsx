"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const BusMap = dynamic(() => import("@/components/BusMap"), { ssr: false });

interface Bus {
  id: number;
  busId: string;
  busName: string;
  driverName?: string;
}

interface LiveLocation {
  bus_id: string;
  bus_name: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

interface RouteInfo {
  distance: number;
  duration: number;
  eta: number;
  points: Array<[number, number]>;
  fallback: boolean;
}

interface User {
  studentId: string;
  name: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [studentLocation, setStudentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) { router.replace("/login"); return; }
        if (data.user.role === "admin") { router.replace("/admin"); return; }
        setUser(data.user);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // Load buses
  useEffect(() => {
    fetch("/api/buses")
      .then((r) => r.json())
      .then((data) => {
        setBuses(data.buses || []);
        if (data.buses?.length > 0) setSelectedBusId(data.buses[0].busId);
      })
      .catch(console.error);
  }, []);

  // Poll live locations every 3s
  useEffect(() => {
    const fetchLocations = () => {
      fetch("/api/location/live")
        .then((r) => r.json())
        .then((data) => {
          if (data.locations) {
            setLiveLocations(data.locations);
            setLastUpdate(new Date());
          }
        })
        .catch(console.error);
    };

    fetchLocations();
    pollRef.current = setInterval(fetchLocations, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Update route when bus or student location changes
  useEffect(() => {
    if (!selectedBusId || !studentLocation) return;

    const busLoc = liveLocations.find((l) => l.bus_id === selectedBusId);
    if (!busLoc) return;

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const res = await fetch(
          `/api/route-info?fromLat=${studentLocation.lat}&fromLng=${studentLocation.lng}&toLat=${busLoc.latitude}&toLng=${busLoc.longitude}`
        );
        const data = await res.json();
        setRouteInfo(data);
      } catch (e) {
        console.error("Route fetch error:", e);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [selectedBusId, studentLocation, liveLocations]);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStudentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        alert("Unable to get your location: " + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const startSimulation = async () => {
    setSimulationRunning(true);
    const runSim = async () => {
      await fetch(`/api/simulate?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin_bus_tracker_2024"}`, { method: "POST" });
    };
    await runSim();
    simRef.current = setInterval(runSim, 4000);
  };

  const stopSimulation = () => {
    setSimulationRunning(false);
    if (simRef.current) clearInterval(simRef.current);
  };

  useEffect(() => {
    return () => {
      if (simRef.current) clearInterval(simRef.current);
    };
  }, []);

  const selectedBusLoc = liveLocations.find((l) => l.bus_id === selectedBusId);
  const selectedBus = buses.find((b) => b.busId === selectedBusId);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatEta = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    if (minutes === 1) return "1 min";
    return `${minutes} mins`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0f172a" }}>
      {/* Sidebar */}
      <div
        className="sidebar"
        style={{
          width: sidebarOpen ? 300 : 0,
          minWidth: sidebarOpen ? 300 : 0,
          transition: "all 0.3s ease",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px", flex: 1, overflowY: "auto", width: 300 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 40, height: 40,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>🚌</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>BusTracker</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Live Tracking</div>
            </div>
          </div>

          {/* User info */}
          <div style={{
            background: "rgba(37,99,235,0.15)",
            border: "1px solid rgba(37,99,235,0.3)",
            borderRadius: 12, padding: 14, marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36,
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}>🎓</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>ID: {user.studentId}</div>
              </div>
            </div>
          </div>

          {/* Bus selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Select Bus
            </label>
            <select
              className="form-select"
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
            >
              {buses.length === 0 && <option value="">No buses available</option>}
              {buses.map((bus) => (
                <option key={bus.busId} value={bus.busId}>
                  {bus.busName}
                </option>
              ))}
            </select>
          </div>

          {/* Bus status */}
          {selectedBus && (
            <div className="glass-card" style={{ padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 600 }}>
                BUS STATUS
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>🚌</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedBus.busName}</div>
                  {selectedBus.driverName && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                      👤 {selectedBus.driverName}
                    </div>
                  )}
                </div>
              </div>
              {selectedBusLoc ? (
                <span className="badge badge-success">● Live</span>
              ) : (
                <span className="badge badge-danger">● Offline</span>
              )}
            </div>
          )}

          {/* Stats */}
          {selectedBusLoc && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div className="stat-card">
                <div style={{ fontSize: 20, marginBottom: 4 }}>💨</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{Math.round(selectedBusLoc.speed)}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>km/h</div>
              </div>
              {routeInfo ? (
                <>
                  <div className="stat-card">
                    <div style={{ fontSize: 20, marginBottom: 4 }}>📏</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{formatDistance(routeInfo.distance)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Distance</div>
                  </div>
                  <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>⏱️</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{formatEta(routeInfo.eta)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                      ETA {routeInfo.fallback ? "(approx)" : "(road)"}
                    </div>
                  </div>
                </>
              ) : (
                <div className="stat-card">
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    Share location for ETA
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <button
              className="btn-primary"
              onClick={handleGetLocation}
              disabled={gpsLoading}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {gpsLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Getting location...</> : "📍 Share My Location"}
            </button>

            {studentLocation && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                ✓ Location shared — {studentLocation.lat.toFixed(4)}, {studentLocation.lng.toFixed(4)}
              </div>
            )}

            <button
              className="btn-secondary"
              onClick={() => router.push("/history")}
              style={{ width: "100%", justifyContent: "center" }}
            >
              📋 Trip History
            </button>
          </div>

          {/* Simulation section */}
          <div style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 10, padding: 12, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: "rgba(245,158,11,0.8)", fontWeight: 600, marginBottom: 8 }}>
              🧪 Demo Mode
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
              No real bus active? Start demo simulation.
            </p>
            {!simulationRunning ? (
              <button className="btn-secondary" onClick={startSimulation} style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
                ▶ Start Demo
              </button>
            ) : (
              <button className="btn-danger" onClick={stopSimulation} style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
                ⏹ Stop Demo
              </button>
            )}
          </div>

          {/* Last update */}
          {lastUpdate && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              Updated {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            className="btn-danger"
            onClick={handleLogout}
            style={{ width: "100%", justifyContent: "center" }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "absolute", top: 16, left: 16, zIndex: 500,
            background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, padding: "8px 12px", color: "white",
            fontSize: 16, cursor: "pointer", backdropFilter: "blur(10px)",
          }}
        >
          {sidebarOpen ? "☰" : "☰"}
        </button>

        {/* Map title */}
        <div style={{
          position: "absolute", top: 16, left: sidebarOpen ? 72 : 72, zIndex: 500,
          background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "8px 14px",
          backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
            🗺️ Live Map
          </span>
          {liveLocations.length > 0 && (
            <span className="badge badge-success" style={{ fontSize: 10 }}>
              {liveLocations.length} {liveLocations.length === 1 ? "bus" : "buses"} active
            </span>
          )}
        </div>

        <BusMap
          liveLocations={liveLocations}
          selectedBusId={selectedBusId}
          studentLocation={studentLocation}
          routePoints={routeInfo?.points}
          loadingRoute={loadingRoute}
        />
      </div>
    </div>
  );
}
