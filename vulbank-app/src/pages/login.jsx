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
    <div className="login-shell">
      <div className="login-brand-panel">
        <span className="brand-mark" style={{ width: 44, height: 44, fontSize: 22 }}>🏦</span>
        <h2>Banking built for people who move fast.</h2>
        <p>
          VulnBank gives you real-time transfers, account insights, and admin
          tooling — all in one place.
        </p>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <h1>Welcome back</h1>
          <p className="login-sub">Sign in to your account</p>

          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="alice"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button onClick={handleLogin} className="btn btn-primary">
            Sign in
          </button>

          <p className="demo-hint">
            Demo: alice / password &nbsp;|&nbsp; admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
