import { useState } from "react";

// VULN-002: Hardcoded credentials in source code
const USERS = {
  admin: { password: "admin123", role: "admin", token: "tok_admin_abc123secret", balance: 50000 },
  alice: { password: "password", role: "user",  token: "tok_alice_xyz789secret", balance: 12400 },
  bob:   { password: "123456",   role: "user",  token: "tok_bob_def456secret",  balance: 3200  },
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const found = USERS[username];
    if (found && found.password === password) {
      onLogin({ username, role: found.role, token: found.token, balance: found.balance });
    } else {
      // VULN-004: Verbose error reveals whether username exists
      setError(!found ? `User "${username}" does not exist.` : "Incorrect password.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "2.5rem", width: "360px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "0.25rem" }}>💳 VulnBank</h1>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "2rem" }}>Sign in to your account</p>

        <label style={{ fontSize: "13px", color: "#666", display: "block", marginBottom: "4px" }}>Username</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="alice"
          style={{ width: "100%", marginBottom: "1rem", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px" }}
        />

        <label style={{ fontSize: "13px", color: "#666", display: "block", marginBottom: "4px" }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ width: "100%", marginBottom: "1rem", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px" }}
        />

        {error && (
          <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          style={{ width: "100%", padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
        >
          Sign in
        </button>

        <p style={{ fontSize: "12px", color: "#999", marginTop: "1.5rem", textAlign: "center" }}>
          Demo: alice / password &nbsp;|&nbsp; admin / admin123
        </p>
      </div>
    </div>
  );
}