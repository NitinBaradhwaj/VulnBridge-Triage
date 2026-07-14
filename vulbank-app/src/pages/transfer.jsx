import { useState } from "react";

export default function Transfer({ user }) {
  const [to, setTo]         = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo]     = useState("");
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);

  // VULN-010: Hardcoded API key visible in frontend bundle
  const API_KEY = "sk-bank-prod-f8a2c1d9e3b74f6a8c2d1e9b3f6a8c2d";

  const handleTransfer = () => {
    if (!to || !amount) {
      setStatus({ type: "error", msg: "Fill in all fields." });
      return;
    }

    // VULN-008: CSRF — state-changing POST request with no anti-CSRF token.
    // A logged-in user's browser will happily attach their session cookie to
    // this request even if it was triggered from a malicious third-party
    // page, because nothing here proves the request came from our own UI.
    fetch("https://api.vulnbank.com/transfer", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, amount, memo }),
    }).catch(() => {});

    // VULN-009: Negative amounts not validated
    setHistory(prev => [...prev, { to, amount: parseFloat(amount), memo }]);
    setStatus({ type: "success", msg: `Transferred $${amount} to ${to}` });
    // VULN-012: Sensitive data logged to console
    console.log("Transfer:", { to, amount, api_key: API_KEY, token: localStorage.getItem("auth_token") });
    setTo(""); setAmount(""); setMemo("");
  };

  return (
    <div style={{ maxWidth: "440px" }}>
      <div style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Send money</h2>
          <div style={{ display: "flex", gap: "6px" }}>
            <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}>VULN-008: No CSRF</span>
            <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}>VULN-010: API key</span>
          </div>
        </div>

        <label style={{ fontSize: "13px", color: "#666", display: "block", marginBottom: "4px" }}>Recipient</label>
        <input value={to} onChange={e => setTo(e.target.value)} placeholder="bob"
          style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", marginBottom: "1rem" }} />

        <label style={{ fontSize: "13px", color: "#666", display: "block", marginBottom: "4px" }}>Amount ($)</label>
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" type="number"
          style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", marginBottom: "1rem" }} />

        <label style={{ fontSize: "13px", color: "#666", display: "block", marginBottom: "4px" }}>Memo</label>
        <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Rent"
          style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", marginBottom: "1rem" }} />

        {status && (
          <div style={{ background: status.type === "error" ? "#fef2f2" : "#f0fdf4", color: status.type === "error" ? "#dc2626" : "#16a34a", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", marginBottom: "1rem" }}>
            {status.msg}
          </div>
        )}

        <button onClick={handleTransfer}
          style={{ width: "100%", padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
          Send transfer
        </button>
      </div>

      {history.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "1rem" }}>History</h2>
          {history.map((tx, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: "13px" }}>
              <span>→ {tx.to} <span style={{ color: "#999" }}>({tx.memo})</span></span>
              <span style={{ color: "#dc2626" }}>${tx.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}