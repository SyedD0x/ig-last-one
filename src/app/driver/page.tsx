"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Bus {
  id: number;
  busId: string;
  busName: string;
  driverName?: string;
}

export default function DriverPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [customBusId, setCustomBusId] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number; speed: number; heading: number } | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    fetch("/api/buses")
      .then((r) => r.json())
      .then((data) => {
        setBuses(data.buses || []);
        if (data.buses?.length > 0) setSelectedBusId(data.buses[0].busId);
      });
  }, []);

  const sendLocation = useCallback(async (position: GeolocationPosition) => {
    const busId = useCustom ? customBusId : selectedBusId;
    if (!busId) return;

    const { latitude, longitude, speed, heading } = position.coords;

    // Calculate speed manually if not provided
    let calculatedSpeed = speed ? speed * 3.6 : 0; // m/s to km/h
    if (!speed && lastPosRef.current) {
      const prevCoords = lastPosRef.current.coords;
      const R = 6371000;
      const lat1 = prevCoords.latitude * Math.PI / 180;
      const lat2 = latitude * Math.PI / 180;
      const dLat = (latitude - prevCoords.latitude) * Math.PI / 180;
      const dLon = (longitude - prevCoords.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const timeDiff = (position.timestamp - lastPosRef.current.timestamp) / 1000;
      calculatedSpeed = timeDiff > 0 ? (dist / timeDiff) * 3.6 : 0;
    }
    lastPosRef.current = position;

    try {
      const res = await fetch("/api/location/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId,
          latitude,
          longitude,
          speed: Math.round(calculatedSpeed),
          heading: heading || 0,
        }),
      });

      if (res.ok) {
        setCurrentPos({ lat: latitude, lng: longitude, speed: calculatedSpeed, heading: heading || 0 });
        setSendCount((c) => c + 1);
        setStatus(`✓ Location sent at ${new Date().toLocaleTimeString()}`);
        setStatusType("success");
      } else {
        setStatus("⚠ Failed to send location");
        setStatusType("error");
      }
    } catch {
      setStatus("⚠ Network error");
      setStatusType("error");
    }
  }, [useCustom, customBusId, selectedBusId]);

  const startSharing = () => {
    if (!navigator.geolocation) {
      setStatus("⚠ Geolocation not supported");
      setStatusType("error");
      return;
    }

    const busId = useCustom ? customBusId : selectedBusId;
    if (!busId) {
      setStatus("⚠ Please select or enter a Bus ID");
      setStatusType("error");
      return;
    }

    setIsSharing(true);
    setStatus("📡 Starting GPS tracking...");
    setStatusType("info");

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocation(pos);
      },
      (err) => {
        setStatus(`⚠ GPS Error: ${err.message}`);
        setStatusType("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Also poll every 3 seconds as fallback
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, console.error, {
        enableHighAccuracy: true, timeout: 5000, maximumAge: 3000,
      });
    }, 3000);
  };

  const stopSharing = () => {
    setIsSharing(false);
    setStatus("⏹ Location sharing stopped");
    setStatusType("info");

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const activeBusId = useCustom ? customBusId : selectedBusId;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            borderRadius: "20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40, margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
          }}>🚌</div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Driver Portal</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Share your bus location in real-time</p>
        </div>

        {/* Main card */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 16 }}>
          {/* Bus selection */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button
                onClick={() => setUseCustom(false)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                  background: !useCustom ? "rgba(37,99,235,0.3)" : "rgba(255,255,255,0.05)",
                  color: !useCustom ? "#93c5fd" : "rgba(255,255,255,0.5)",
                  fontSize: 13, fontWeight: 600,
                  borderBottom: !useCustom ? "2px solid #2563eb" : "2px solid transparent",
                }}
              >
                Select Bus
              </button>
              <button
                onClick={() => setUseCustom(true)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                  background: useCustom ? "rgba(37,99,235,0.3)" : "rgba(255,255,255,0.05)",
                  color: useCustom ? "#93c5fd" : "rgba(255,255,255,0.5)",
                  fontSize: 13, fontWeight: 600,
                  borderBottom: useCustom ? "2px solid #2563eb" : "2px solid transparent",
                }}
              >
                Custom ID
              </button>
            </div>

            {!useCustom ? (
              <select
                className="form-select"
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                disabled={isSharing}
              >
                {buses.length === 0 && <option value="">Loading buses...</option>}
                {buses.map((b) => (
                  <option key={b.busId} value={b.busId}>{b.busName}</option>
                ))}
              </select>
            ) : (
              <input
                className="form-input"
                type="text"
                placeholder="e.g. bus1, bus2, school_a"
                value={customBusId}
                onChange={(e) => setCustomBusId(e.target.value)}
                disabled={isSharing}
              />
            )}
          </div>

          {/* Active bus indicator */}
          {activeBusId && (
            <div style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: 8, padding: "10px 14px",
              marginBottom: 20, fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>🚌</span>
              <span style={{ color: "rgba(255,255,255,0.7)" }}>
                Sharing as: <strong style={{ color: "white" }}>{activeBusId}</strong>
              </span>
            </div>
          )}

          {/* Main button */}
          {!isSharing ? (
            <button
              className="btn-success"
              onClick={startSharing}
              style={{ width: "100%", justifyContent: "center", padding: 16, fontSize: 16 }}
            >
              📡 Start Sharing Location
            </button>
          ) : (
            <button
              className="btn-danger"
              onClick={stopSharing}
              style={{ width: "100%", justifyContent: "center", padding: 16, fontSize: 16 }}
            >
              ⏹ Stop Sharing
            </button>
          )}

          {/* Status */}
          {status && (
            <div style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 8,
              background: statusType === "success" ? "rgba(34,197,94,0.1)" : statusType === "error" ? "rgba(239,68,68,0.1)" : "rgba(37,99,235,0.1)",
              border: `1px solid ${statusType === "success" ? "rgba(34,197,94,0.2)" : statusType === "error" ? "rgba(239,68,68,0.2)" : "rgba(37,99,235,0.2)"}`,
              color: statusType === "success" ? "#86efac" : statusType === "error" ? "#fca5a5" : "#93c5fd",
              fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {isSharing && statusType === "success" && (
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
                  animation: "pulse 1.5s ease-in-out infinite",
                  flexShrink: 0,
                }} />
              )}
              {status}
            </div>
          )}
        </div>

        {/* Stats card (when sharing) */}
        {isSharing && currentPos && (
          <div className="glass-card fade-in" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 14 }}>
              Live Status
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              <div className="stat-card">
                <div style={{ fontSize: 20, marginBottom: 4 }}>📍</div>
                <div style={{ fontSize: 12, fontWeight: 600, wordBreak: "break-all" }}>
                  {currentPos.lat.toFixed(5)}<br />{currentPos.lng.toFixed(5)}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Coordinates</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 20, marginBottom: 4 }}>💨</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(currentPos.speed)}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>km/h</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 20, marginBottom: 4 }}>📤</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{sendCount}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Updates sent</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 20, marginBottom: 4 }}>🧭</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(currentPos.heading)}°</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Heading</div>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          <p>Location is sent every 3 seconds while sharing is active.</p>
          <p style={{ marginTop: 4 }}>Keep this page open to continue tracking.</p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
