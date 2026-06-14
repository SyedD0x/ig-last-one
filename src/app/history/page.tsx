"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const HistoryMap = dynamic(() => import("@/components/HistoryMap"), { ssr: false });

interface Bus {
  id: number;
  busId: string;
  busName: string;
}

interface LocationPoint {
  id: number;
  busId: string;
  busName: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

interface User {
  studentId: string;
  name: string;
  role: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [history, setHistory] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) { router.replace("/login"); return; }
        setUser(data.user);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    fetch("/api/buses")
      .then((r) => r.json())
      .then((data) => {
        setBuses(data.buses || []);
        if (data.buses?.length > 0) setSelectedBusId(data.buses[0].busId);
      });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (playbackIndex >= history.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setPlaybackIndex((i) => i + 1);
    }, 200);
    return () => clearTimeout(timer);
  }, [isPlaying, playbackIndex, history.length]);

  const fetchHistory = async () => {
    if (!selectedBusId || !selectedDate) return;
    setLoading(true);
    setError("");
    setHistory([]);
    setPlaybackIndex(0);
    setIsPlaying(false);

    try {
      const res = await fetch(`/api/location/history?busId=${selectedBusId}&date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setHistory(data.history);
      if (data.history.length === 0) setError("No trip data found for this date.");
    } catch {
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const totalDistance = history.reduce((acc, point, i) => {
    if (i === 0) return 0;
    const prev = history[i - 1];
    const R = 6371000;
    const lat1 = prev.latitude * Math.PI / 180;
    const lat2 = point.latitude * Math.PI / 180;
    const dLat = (point.latitude - prev.latitude) * Math.PI / 180;
    const dLon = (point.longitude - prev.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, 0);

  const avgSpeed = history.length > 0
    ? history.reduce((sum, p) => sum + p.speed, 0) / history.length
    : 0;

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner" style={{ width: 40, height: 40 }} /></div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0f172a" }}>
      {/* Sidebar */}
      <div className="sidebar" style={{ width: 300, minWidth: 300, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 20 }}
            >←</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Trip History</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Past routes & analytics</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
              Select Bus
            </label>
            <select className="form-select" value={selectedBusId} onChange={(e) => setSelectedBusId(e.target.value)}>
              {buses.map((b) => <option key={b.busId} value={b.busId}>{b.busName}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
              Date
            </label>
            <input
              className="form-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              style={{ colorScheme: "dark" }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={fetchHistory}
            disabled={loading || !selectedBusId}
            style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}
          >
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Loading...</> : "🔍 Load Trip"}
          </button>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: 10, fontSize: 12, color: "#fca5a5", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Stats */}
          {history.length > 0 && (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 8 }}>Trip Stats</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div className="stat-card">
                    <div style={{ fontSize: 18, marginBottom: 2 }}>📍</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{history.length}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Points</div>
                  </div>
                  <div className="stat-card">
                    <div style={{ fontSize: 18, marginBottom: 2 }}>📏</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{(totalDistance / 1000).toFixed(1)}km</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Distance</div>
                  </div>
                  <div className="stat-card">
                    <div style={{ fontSize: 18, marginBottom: 2 }}>💨</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{Math.round(avgSpeed)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Avg km/h</div>
                  </div>
                  <div className="stat-card">
                    <div style={{ fontSize: 18, marginBottom: 2 }}>🕐</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {new Date(history[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Start</div>
                  </div>
                </div>
              </div>

              {/* Playback controls */}
              <div className="glass-card" style={{ padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>
                  🎬 Playback
                </div>
                <input
                  type="range"
                  min={0}
                  max={history.length - 1}
                  value={playbackIndex}
                  onChange={(e) => { setIsPlaying(false); setPlaybackIndex(parseInt(e.target.value)); }}
                  style={{ width: "100%", marginBottom: 8, accentColor: "#2563eb" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                  <span>{playbackIndex + 1} / {history.length}</span>
                  <span>{history[playbackIndex] ? new Date(history[playbackIndex].timestamp).toLocaleTimeString() : ""}</span>
                </div>
                <button
                  className={isPlaying ? "btn-danger" : "btn-success"}
                  onClick={() => {
                    if (playbackIndex >= history.length - 1) setPlaybackIndex(0);
                    setIsPlaying(!isPlaying);
                  }}
                  style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
                >
                  {isPlaying ? "⏸ Pause" : "▶ Play Animation"}
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button className="btn-danger" onClick={handleLogout} style={{ width: "100%", justifyContent: "center" }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(15,23,42,0.5)", zIndex: 100,
          }}>
            <div style={{ textAlign: "center" }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: "0 auto 12px" }} />
              <div>Loading trip data...</div>
            </div>
          </div>
        )}
        <HistoryMap
          history={history}
          playbackIndex={playbackIndex}
        />
      </div>
    </div>
  );
}
