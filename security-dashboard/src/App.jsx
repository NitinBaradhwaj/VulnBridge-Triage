import { useEffect, useMemo, useState } from "react";
import { ISSUES_URL, REPO_OWNER, REPO_NAME } from "./config";
import { parseIssue } from "./parseIssue";
import VulnCard from "./VulnCard";

export default function App() {
  const [findings, setFindings] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setStatus("loading");
    try {
      const res = await fetch(ISSUES_URL, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "GitHub API rate limit hit (60 req/hour unauthenticated). Wait a bit and refresh."
            : `GitHub API returned ${res.status}`
        );
      }

      const issues = await res.json();
      const parsed = issues
        .filter((i) => !i.pull_request) // issues endpoint also returns PRs
        .map(parseIssue)
        .sort((a, b) => b.score - a.score);

      setFindings(parsed);
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  const visible = useMemo(() => {
    if (priorityFilter === "all") return findings;
    return findings.filter((f) => String(f.priorityRank) === priorityFilter);
  }, [findings, priorityFilter]);

  const counts = useMemo(() => {
    const c = { 0: 0, 1: 0, 2: 0, 3: 0 };
    findings.forEach((f) => (c[f.priorityRank] = (c[f.priorityRank] ?? 0) + 1));
    return c;
  }, [findings]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🛡️ Security Dashboard</h1>
          <p className="subtitle">
            Live from{" "}
            <a
              href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`}
              target="_blank"
              rel="noreferrer"
            >
              {REPO_OWNER}/{REPO_NAME}
            </a>{" "}
            — scored by CVSS + EPSS, triaged by an agent, fixes suggested by Gemma 3.
          </p>
        </div>
        <button className="refresh-btn" onClick={load} disabled={status === "loading"}>
          {status === "loading" ? "Refreshing…" : "↻ Refresh"}
        </button>
      </header>

      <div className="filters">
        <FilterPill label="All" value="all" active={priorityFilter} onClick={setPriorityFilter} count={findings.length} />
        <FilterPill label="P0 Critical" value="0" active={priorityFilter} onClick={setPriorityFilter} count={counts[0]} color="#ef4444" />
        <FilterPill label="P1 High" value="1" active={priorityFilter} onClick={setPriorityFilter} count={counts[1]} color="#f97316" />
        <FilterPill label="P2 Medium" value="2" active={priorityFilter} onClick={setPriorityFilter} count={counts[2]} color="#3b82f6" />
        <FilterPill label="P3 Low" value="3" active={priorityFilter} onClick={setPriorityFilter} count={counts[3]} color="#9ca3af" />
      </div>

      {status === "loading" && <div className="state-msg">Loading findings…</div>}

      {status === "error" && (
        <div className="state-msg error">
          Couldn't load issues: {error}
        </div>
      )}

      {status === "ready" && visible.length === 0 && (
        <div className="state-msg">
          No open findings{priorityFilter !== "all" ? " at this priority" : ""}. Either
          the pipeline hasn't run yet, or everything's fixed. 🎉
        </div>
      )}

      {status === "ready" && visible.length > 0 && (
        <div className="grid">
          {visible.map((f) => (
            <VulnCard key={f.id} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, value, active, onClick, count, color }) {
  const isActive = active === value;
  return (
    <button
      className={`pill ${isActive ? "pill-active" : ""}`}
      style={isActive && color ? { borderColor: color, color } : undefined}
      onClick={() => onClick(value)}
    >
      {label} <span className="pill-count">{count}</span>
    </button>
  );
}
