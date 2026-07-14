import { useState } from "react";
import "./App.css";
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
    <div className="shell">
      <nav className="topnav">
        <div className="brand">
          <span className="brand-mark">🏦</span>
          VulnBank
        </div>
        <div className="nav-links">
          {["dashboard", "transfer", "admin"].map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`nav-link ${page === p ? "active" : ""}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <div className="user-chip">
            <span className="avatar">{user?.username?.[0]}</span>
            {user?.username}
          </div>
          <button onClick={handleLogout} className="logout-btn">Log out</button>
        </div>
      </nav>
      <main className="main">
        {page === "dashboard" && <Dashboard user={user} />}
        {page === "transfer" && <Transfer user={user} />}
        {page === "admin" && <AdminPanel user={user} />}
      </main>
    </div>
  );
}
