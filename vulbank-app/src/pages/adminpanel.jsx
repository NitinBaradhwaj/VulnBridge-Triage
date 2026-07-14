import { useState } from "react";

// VULN-013: Broken Access Control — role check is client-side only
export default function AdminPanel({ user }) {
  const [sqlInput, setSqlInput] = useState("");
  const [userId, setUserId]     = useState("");
  const [result, setResult]     = useState("");

  const isAdmin = localStorage.getItem("user_role") === "admin";

  const users = [
    { id: 1, username: "admin", email: "admin@vulnbank.com", balance: 50000, ssn: "123-45-6789" },
    { id: 2, username: "alice", email: "alice@example.com",  balance: 12400, ssn: "987-65-4321" },
    { id: 3, username: "bob",   email: "bob@example.com",    balance: 3200,  ssn: "456-78-9012" },
  ];

  return (
    <div>
      <h1 className="page-title">Admin panel</h1>

      {!isAdmin && (
        <div className="alert alert-warning">
          ⚠️ You are not an admin — but this panel is fully accessible. VULN-013: Broken Access Control.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* VULN-015: SQL Injection */}
        <div className="panel panel-flagged">
          <h2 className="panel-title">
            User lookup
            <span className="badge">VULN-015: SQLi</span>
          </h2>
          <input
            className="field-input"
            value={sqlInput}
            onChange={e => setSqlInput(e.target.value)}
            placeholder="alice' OR '1'='1"
            style={{ marginBottom: "8px" }}
          />
          <button
            onClick={() => setResult(`SELECT * FROM users WHERE username = '${sqlInput}'`)}
            className="btn btn-secondary"
          >
            Run query
          </button>
        </div>

        {/* VULN-014: IDOR */}
        <div className="panel panel-flagged">
          <h2 className="panel-title">
            User by ID
            <span className="badge">VULN-014: IDOR</span>
          </h2>
          <input
            className="field-input"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            type="number"
            placeholder="1, 2, or 3"
            style={{ marginBottom: "8px" }}
          />
          <button
            onClick={() => {
              const found = users.find(u => u.id === parseInt(userId));
              setResult(found ? JSON.stringify(found, null, 2) : "User not found");
            }}
            className="btn btn-secondary"
          >
            Fetch user
          </button>
        </div>
      </div>

      {result && (
        <div className="panel">
          <h2 className="panel-title">Result</h2>
          <pre className="result-box">{result}</pre>
        </div>
      )}

      {/* VULN-016: PII exposed */}
      <div className="panel panel-flagged">
        <h2 className="panel-title">
          All users
          <span className="badge">VULN-016: PII exposed</span>
        </h2>
        {users.map(u => (
          <div key={u.id} className="user-row">
            <span style={{ color: "var(--text-muted)" }}>#{u.id}</span>
            <span>{u.username}</span>
            <span>{u.email}</span>
            <span style={{ color: "var(--danger)" }}>SSN: {u.ssn}</span>
            <span>${u.balance.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
