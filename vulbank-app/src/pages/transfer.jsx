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
      <h1 className="page-title">Send money</h1>

      <div className="panel panel-flagged">
        <h2 className="panel-title">
          Transfer details
          <span style={{ display: "flex", gap: "6px" }}>
            <span className="badge">VULN-008: No CSRF</span>
            <span className="badge">VULN-010: API key</span>
          </span>
        </h2>

        <div className="field-group">
          <label className="field-label">Recipient</label>
          <input className="field-input" value={to} onChange={e => setTo(e.target.value)} placeholder="bob" />
        </div>

        <div className="field-group">
          <label className="field-label">Amount ($)</label>
          <input className="field-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" type="number" />
        </div>

        <div className="field-group">
          <label className="field-label">Memo</label>
          <input className="field-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="Rent" />
        </div>

        {status && (
          <div className={`alert ${status.type === "error" ? "alert-error" : "alert-success"}`}>
            {status.msg}
          </div>
        )}

        <button onClick={handleTransfer} className="btn btn-primary">
          Send transfer
        </button>
      </div>

      {history.length > 0 && (
        <div className="panel">
          <h2 className="panel-title">History</h2>
          {history.map((tx, i) => (
            <div key={i} className="tx-row">
              <span>→ {tx.to} <span className="tx-date">({tx.memo})</span></span>
              <span style={{ color: "var(--danger)", fontWeight: 600, fontSize: "13px" }}>${tx.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
