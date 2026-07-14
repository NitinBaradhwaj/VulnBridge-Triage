import { useState } from "react";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Transfer from "./pages/transfer";
import AdminPanel from "./pages/adminpanel";

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");

  // VULN-001: Session token stored in localStorage instead of an httpOnly
  // cookie. localStorage is readable by any JS running on the page, so a
  // single XSS bug anywhere in the app (see VULN-006) is enough to steal
  // this token and hijack the session.
  const handleLogin = (userData) => {
    localStorage.setItem("auth_token", userData.token);
    localStorage.setItem("user_role", userData.role);
    setUser(userData);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setPage("login");
  };

  if (page === "login") return <Login onLogin={handleLogin} />;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f5f5f5" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <span style={{ fontWeight: 600, fontSize: "16px" }}>💳 VulnBank</span>
          {["dashboard", "transfer", "admin"].map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "4px 0", fontWeight: page === p ? 600 : 400, color: page === p ? "#2563eb" : "#666", borderBottom: page === p ? "2px solid #2563eb" : "2px solid transparent", borderRadius: 0, textTransform: "capitalize" }}>{p}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "#666" }}>{user?.username}</span>
          <button onClick={handleLogout} style={{ fontSize: "13px", padding: "4px 12px" }}>Logout</button>
        </div>
      </nav>
      <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
        {page === "dashboard" && <Dashboard user={user} />}
        {page === "transfer" && <Transfer user={user} />}
        {page === "admin" && <AdminPanel user={user} />}
      </main>
    </div>
  );
}