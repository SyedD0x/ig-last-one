"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if already logged in
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          if (data.user.role === "admin") router.replace("/admin");
          else router.replace("/dashboard");
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: "absolute", top: "-20%", left: "-10%",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute", bottom: "-10%", right: "-10%",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
      </div>

      <div className="w-full max-w-md fade-in" style={{ position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{
            width: 72, height: 72,
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            borderRadius: "20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(37,99,235,0.4)",
          }}>🚌</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "white", marginBottom: 4 }}>
            BusTracker
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
            Real-time school bus tracking
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24 }}>
            Sign in with your student credentials
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "rgba(255,255,255,0.7)" }}>
                Student ID
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. STU001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "rgba(255,255,255,0.7)" }}>
                Password
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#fca5a5",
                marginBottom: 16,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "14px" }}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : "Sign In →"}
            </button>
          </form>

          <div style={{
            marginTop: 24,
            padding: "14px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Demo credentials:</p>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
              <div>🎓 Student: <code style={{ color: "#93c5fd" }}>STU001</code> / <code style={{ color: "#93c5fd" }}>pass123</code></div>
              <div>🔑 Admin: <code style={{ color: "#fcd34d" }}>admin</code> / <code style={{ color: "#fcd34d" }}>admin_bus_tracker_2024</code></div>
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          Need help? Contact your school administrator.
        </p>
      </div>
    </div>
  );
}
