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

  const badge = (text) => (
    <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}>
      {text}
    </span>
  );

  return (
    <div>
      {!isAdmin && (
        <div style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fcd34d", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", marginBottom: "1.5rem" }}>
          ⚠️ You are not an admin — but this panel is fully accessible. VULN-013: Broken Access Control.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* VULN-015: SQL Injection */}
        <div style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>User lookup</h2>
            {badge("VULN-015: SQLi")}
          </div>
          <input value={sqlInput} onChange={e => setSqlInput(e.target.value)}
            placeholder="alice' OR '1'='1"
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", marginBottom: "8px", fontSize: "13px" }} />
          <button
            onClick={() => setResult(`SELECT * FROM users WHERE username = '${sqlInput}'`)}
            style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
            Run query
          </button>
        </div>

        {/* VULN-014: IDOR */}
        <div style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>User by ID</h2>
            {badge("VULN-014: IDOR")}
          </div>
          <input value={userId} onChange={e => setUserId(e.target.value)} type="number"
            placeholder="1, 2, or 3"
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", marginBottom: "8px", fontSize: "13px" }} />
          <button
            onClick={() => {
              const found = users.find(u => u.id === parseInt(userId));
              setResult(found ? JSON.stringify(found, null, 2) : "User not found");
            }}
            style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
            Fetch user
          </button>
        </div>
      </div>

      {result && (
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Result</h2>
          <pre style={{ background: "#f9fafb", borderRadius: "8px", padding: "10px", fontSize: "12px", overflowX: "auto", margin: 0 }}>{result}</pre>
        </div>
      )}

      {/* VULN-016: PII exposed */}
      <div style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: "12px", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>All users</h2>
          {badge("VULN-016: PII exposed")}
        </div>
        {users.map(u => (
          <div key={u.id} style={{ display: "flex", gap: "12px", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: "12px" }}>
            <span style={{ color: "#999" }}>#{u.id}</span>
            <span>{u.username}</span>
            <span>{u.email}</span>
            <span style={{ color: "#dc2626" }}>SSN: {u.ssn}</span>
            <span>${u.balance.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}