// ─────────────────────────────────────────────────────────
// CHANGE 1 — Add this import at the top of app/page.js
// (right after "use client"; and your existing imports)
// ─────────────────────────────────────────────────────────

import { useLiveData } from "@/hooks/useLiveData";


// ─────────────────────────────────────────────────────────
// CHANGE 2 — Add this line inside your SoFiDashboard()
// function, right after the existing useState lines
// ─────────────────────────────────────────────────────────

const { quotes, history, loading, error } = useLiveData();


// ─────────────────────────────────────────────────────────
// CHANGE 3 — Replace the line that says:
//   const filtered = SCORED.filter(...)
// with these lines instead:
// ─────────────────────────────────────────────────────────

// Merge live prices into your instrument list
const INSTRUMENTS_LIVE = INSTRUMENTS.map(inst => ({
  ...inst,
  price:  quotes[inst.symbol]?.price  ?? inst.price,   // live price, fallback to static
  change: quotes[inst.symbol]?.change ?? inst.change,  // live change, fallback to static
  hist:   history[inst.symbol]        ?? inst.hist,    // live history, fallback to static
}));

// Re-score with live prices (replaces the existing SCORED constant at the top)
const SCORED_LIVE = INSTRUMENTS_LIVE.map(i => ({ ...i, ...score(i) })).sort((a,b) => b.score - a.score);

// Now use SCORED_LIVE everywhere you previously used SCORED
const filtered = SCORED_LIVE.filter(i => filter === "All" || i.type === filter);
const allocation = allocate(SCORED_LIVE, budget);


// ─────────────────────────────────────────────────────────
// CHANGE 4 — Add a loading/error screen
// Add this block right before your main return() statement
// ─────────────────────────────────────────────────────────

if (loading) return (
  <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "'DM Sans', sans-serif" }}>
    <div style={{ width: 36, height: 36, border: "3px solid #e2e0db", borderTopColor: "#1a1a2e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading live market data...</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

if (error) return (
  <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
    <div style={{ background: "white", border: "1.5px solid #fed7aa", borderRadius: 16, padding: 28, maxWidth: 400, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
      <div style={{ fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Couldn't load market data</div>
      <div style={{ color: "#94a3b8", fontSize: 13 }}>{error}</div>
      <div style={{ marginTop: 12, color: "#64748b", fontSize: 12 }}>Check your NEXT_PUBLIC_POLYGON_KEY in .env.local</div>
    </div>
  </div>
);
