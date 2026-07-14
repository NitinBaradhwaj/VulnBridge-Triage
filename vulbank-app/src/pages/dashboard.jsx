import { useState } from "react";

export default function Dashboard({ user }) {
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");

  const transactions = [
    { id: 1, desc: "Coffee Shop",     amount: -4.50,  date: "Jun 14" },
    { id: 2, desc: "Salary Deposit",  amount: 3200,   date: "Jun 13" },
    { id: 3, desc: "Electric Bill",   amount: -120,   date: "Jun 12" },
    { id: 4, desc: "Online Transfer", amount: -500,   date: "Jun 11" },
  ];

  return (
    <div>
      <h1 className="page-title">Overview</h1>

      <div className="metric-grid">
        {[
          ["Balance",      `$${user?.balance?.toLocaleString()}`],
          ["Transactions", transactions.length],
          ["Account",      "#5821044"],
        ].map(([label, value]) => (
          <div key={label} className="metric-card">
            <p className="metric-label">{label}</p>
            <p className="metric-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2 className="panel-title">Recent transactions</h2>
        {transactions.map(tx => (
          <div key={tx.id} className="tx-row">
            <div>
              <p className="tx-desc">{tx.desc}</p>
              <p className="tx-date">{tx.date}</p>
            </div>
            <span className={`tx-amount ${tx.amount > 0 ? "positive" : ""}`}>
              {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* VULN-006: XSS via dangerouslySetInnerHTML */}
      <div className="panel panel-flagged">
        <h2 className="panel-title">
          Personal note
          <span className="badge">VULN-006: XSS</span>
        </h2>
        <textarea
          className="field-input"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder='Try: <img src=x onerror=alert("XSS")>'
          style={{ minHeight: "70px", marginBottom: "8px" }}
        />
        <button
          onClick={() => setSavedNote(note)}
          className="btn btn-secondary"
          style={{ marginBottom: "10px" }}
        >
          Save note
        </button>
        {savedNote && (
          <div
            className="result-box"
            dangerouslySetInnerHTML={{ __html: savedNote }}
          />
        )}
      </div>
    </div>
  );
}
