"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Student {
  id: number;
  studentId: string;
  name: string;
  createdAt: string;
  isActive: boolean;
}

interface Bus {
  id: number;
  busId: string;
  busName: string;
  driverName?: string;
  createdAt: string;
  isActive: boolean;
}

interface User {
  studentId: string;
  name: string;
  role: string;
}

type Tab = "students" | "buses" | "history";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Student form
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPass, setNewStudentPass] = useState("");

  // Bus form
  const [newBusId, setNewBusId] = useState("");
  const [newBusName, setNewBusName] = useState("");
  const [newDriverName, setNewDriverName] = useState("");

  // Password reset
  const [resetStudentId, setResetStudentId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "admin") {
          router.replace("/login");
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const fetchStudents = useCallback(async () => {
    const res = await fetch("/api/admin/students");
    const data = await res.json();
    if (data.students) setStudents(data.students);
  }, []);

  const fetchBuses = useCallback(async () => {
    const res = await fetch("/api/buses");
    const data = await res.json();
    if (data.buses) setBuses(data.buses);
  }, []);

  useEffect(() => {
    if (user) { fetchStudents(); fetchBuses(); }
  }, [user, fetchStudents, fetchBuses]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: newStudentId, name: newStudentName, password: newStudentPass }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, "error"); return; }
      showToast(`Student "${newStudentName}" created!`);
      setNewStudentId(""); setNewStudentName(""); setNewStudentPass("");
      fetchStudents();
    } catch { showToast("Network error", "error"); }
    finally { setLoading(false); }
  };

  const handleDeleteStudent = async (id: number, name: string) => {
    if (!confirm(`Deactivate student "${name}"?`)) return;
    const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
    if (res.ok) { showToast(`Student deactivated`); fetchStudents(); }
    else showToast("Failed to deactivate", "error");
  };

  const handleReactivateStudent = async (id: number) => {
    const res = await fetch(`/api/admin/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) { showToast("Student reactivated"); fetchStudents(); }
    else showToast("Failed", "error");
  };

  const handleResetPassword = async (id: number) => {
    if (!resetPassword) return;
    const res = await fetch(`/api/admin/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) {
      showToast("Password reset successfully");
      setResetStudentId(null);
      setResetPassword("");
    } else showToast("Failed to reset password", "error");
  };

  const handleCreateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/buses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId: newBusId, busName: newBusName, driverName: newDriverName }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, "error"); return; }
      showToast(`Bus "${newBusName}" created!`);
      setNewBusId(""); setNewBusName(""); setNewDriverName("");
      fetchBuses();
    } catch { showToast("Network error", "error"); }
    finally { setLoading(false); }
  };

  const handleDeleteBus = async (busId: string) => {
    if (!confirm(`Remove bus "${busId}"?`)) return;
    const res = await fetch(`/api/buses/${busId}`, { method: "DELETE" });
    if (res.ok) { showToast("Bus removed"); fetchBuses(); }
    else showToast("Failed", "error");
  };

  const runSetup = async () => {
    const res = await fetch("/api/setup?secret=admin_bus_tracker_2024", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || "Setup complete!");
      fetchStudents(); fetchBuses();
    } else showToast(data.error || data.message, res.ok ? "success" : "error");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner" style={{ width: 40, height: 40 }} /></div>;
  }

  const tabStyle = (tab: Tab) => ({
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    background: activeTab === tab ? "rgba(37,99,235,0.3)" : "transparent",
    color: activeTab === tab ? "#93c5fd" : "rgba(255,255,255,0.5)",
    borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      {/* Top nav */}
      <div style={{
        background: "rgba(15,23,42,0.95)", borderBottom: "1px solid rgba(255,255,255,0.1)",
        padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>⚙️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Admin Panel</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>BusTracker Management</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-secondary" onClick={() => router.push("/dashboard")} style={{ fontSize: 12, padding: "7px 14px" }}>
            🗺️ Dashboard
          </button>
          <button className="btn-danger" onClick={handleLogout} style={{ fontSize: 12, padding: "7px 14px" }}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Quick Setup */}
        <div style={{
          background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)",
          borderRadius: 12, padding: 16, marginBottom: 24, display: "flex",
          alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>🚀 Quick Setup</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Create demo students and buses for testing</div>
          </div>
          <button className="btn-primary" onClick={runSetup} style={{ fontSize: 13 }}>
            Run Demo Setup
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}>
          <button style={tabStyle("students")} onClick={() => setActiveTab("students")}>
            🎓 Students ({students.length})
          </button>
          <button style={tabStyle("buses")} onClick={() => setActiveTab("buses")}>
            🚌 Buses ({buses.length})
          </button>
          <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>
            📊 Info
          </button>
        </div>

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="fade-in">
            {/* Create form */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>➕ Create Student Account</h3>
              <form onSubmit={handleCreateStudent} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Student ID</label>
                  <input className="form-input" placeholder="STU001" value={newStudentId} onChange={(e) => setNewStudentId(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Full Name</label>
                  <input className="form-input" placeholder="John Doe" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Password</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={newStudentPass} onChange={(e) => setNewStudentPass(e.target.value)} required minLength={6} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                    {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Create"}
                  </button>
                </div>
              </form>
            </div>

            {/* Students table */}
            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>All Students</h3>
                <button className="btn-secondary" onClick={fetchStudents} style={{ fontSize: 12, padding: "6px 12px" }}>↻ Refresh</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 24 }}>
                          No students yet. Create one above or run Demo Setup.
                        </td>
                      </tr>
                    )}
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <code style={{ background: "rgba(37,99,235,0.2)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                            {s.studentId}
                          </code>
                        </td>
                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                        <td>
                          <span className={`badge ${s.isActive ? "badge-success" : "badge-danger"}`}>
                            {s.isActive ? "● Active" : "● Inactive"}
                          </span>
                        </td>
                        <td style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {s.isActive ? (
                              <button className="btn-danger" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => handleDeleteStudent(s.id, s.name)}>
                                Deactivate
                              </button>
                            ) : (
                              <button className="btn-success" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => handleReactivateStudent(s.id)}>
                                Reactivate
                              </button>
                            )}
                            {resetStudentId === s.id ? (
                              <div style={{ display: "flex", gap: 4 }}>
                                <input
                                  className="form-input"
                                  type="password"
                                  placeholder="New password"
                                  value={resetPassword}
                                  onChange={(e) => setResetPassword(e.target.value)}
                                  style={{ width: 130, padding: "4px 8px", fontSize: 12 }}
                                />
                                <button className="btn-primary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => handleResetPassword(s.id)}>
                                  Set
                                </button>
                                <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setResetStudentId(null)}>
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setResetStudentId(s.id)}>
                                Reset Password
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Buses Tab */}
        {activeTab === "buses" && (
          <div className="fade-in">
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>➕ Add Bus</h3>
              <form onSubmit={handleCreateBus} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Bus ID</label>
                  <input className="form-input" placeholder="bus1" value={newBusId} onChange={(e) => setNewBusId(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Bus Name</label>
                  <input className="form-input" placeholder="Bus 1 – Route A" value={newBusName} onChange={(e) => setNewBusName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Driver Name</label>
                  <input className="form-input" placeholder="John Driver" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                    {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Add Bus"}
                  </button>
                </div>
              </form>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>All Buses</h3>
                <button className="btn-secondary" onClick={fetchBuses} style={{ fontSize: 12, padding: "6px 12px" }}>↻ Refresh</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bus ID</th>
                      <th>Name</th>
                      <th>Driver</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buses.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 24 }}>
                          No buses yet.
                        </td>
                      </tr>
                    )}
                    {buses.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <code style={{ background: "rgba(245,158,11,0.2)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                            {b.busId}
                          </code>
                        </td>
                        <td style={{ fontWeight: 500 }}>{b.busName}</td>
                        <td style={{ color: "rgba(255,255,255,0.6)" }}>{b.driverName || "—"}</td>
                        <td>
                          <span className={`badge ${b.isActive ? "badge-success" : "badge-danger"}`}>
                            {b.isActive ? "● Active" : "● Removed"}
                          </span>
                        </td>
                        <td>
                          <button className="btn-danger" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => handleDeleteBus(b.busId)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Info Tab */}
        {activeTab === "history" && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📱 Quick Links</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "🗺️ Student Dashboard", href: "/dashboard" },
                    { label: "🚌 Driver Portal", href: "/driver" },
                    { label: "📋 Trip History", href: "/history" },
                    { label: "🔑 Login Page", href: "/login" },
                  ].map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={{
                      display: "block", padding: "10px 14px",
                      background: "rgba(255,255,255,0.05)", borderRadius: 8,
                      color: "rgba(255,255,255,0.8)", textDecoration: "none",
                      fontSize: 13, border: "1px solid rgba(255,255,255,0.08)",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📊 System Info</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Total Students", value: students.length },
                    { label: "Active Students", value: students.filter(s => s.isActive).length },
                    { label: "Total Buses", value: buses.length },
                    { label: "Active Buses", value: buses.filter(b => b.isActive).length },
                  ].map((item) => (
                    <div key={item.label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{item.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🔧 Credentials</h3>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>ADMIN LOGIN</div>
                    <code style={{ fontSize: 12 }}>admin / admin_bus_tracker_2024</code>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>DEMO STUDENTS</div>
                    <code style={{ fontSize: 12 }}>STU001 / pass123</code><br />
                    <code style={{ fontSize: 12 }}>STU002 / pass456</code><br />
                    <code style={{ fontSize: 12 }}>STU003 / pass789</code>
                  </div>
                  <div style={{
                    marginTop: 12, padding: 10, background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8,
                    fontSize: 11, color: "rgba(245,158,11,0.8)",
                  }}>
                    ⚠️ Change these credentials in .env before production!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === "success" ? "✅" : "❌"} {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
