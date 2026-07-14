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
      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "1.5rem" }}>
        {[
          ["Balance",      `$${user?.balance?.toLocaleString()}`],
          ["Transactions", transactions.length],
          ["Account",      "#5821044"],
        ].map(([label, value]) => (
          <div key={label} style={{ background: "#f9fafb", borderRadius: "8px", padding: "1rem" }}>
            <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px" }}>{label}</p>
            <p style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "1rem" }}>Recent transactions</h2>
        {transactions.map(tx => (
          <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
            <div>
              <p style={{ margin: 0, fontSize: "14px" }}>{tx.desc}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>{tx.date}</p>
            </div>
            <span style={{ fontSize: "14px", fontWeight: 500, color: tx.amount > 0 ? "#16a34a" : "#111" }}>
              {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* VULN-006: XSS via dangerouslySetInnerHTML */}
      <div style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: "12px", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Personal note</h2>
          <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}>
            VULN-006: XSS
          </span>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder='Try: <img src=x onerror=alert("XSS")>'
          style={{ width: "100%", minHeight: "70px", padding: "8px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", marginBottom: "8px", fontSize: "13px" }}
        />
        <button
          onClick={() => setSavedNote(note)}
          style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", marginBottom: "10px" }}
        >
          Save note
        </button>
        {savedNote && (
          <div
            style={{ padding: "10px", background: "#f9fafb", borderRadius: "8px", fontSize: "13px" }}
            dangerouslySetInnerHTML={{ __html: savedNote }}
          />
        )}
      </div>
    </div>
  );
}