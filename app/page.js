"use client";
import { useState } from "react";

const INSTRUMENTS = [
  { symbol: "SPY",  name: "S&P 500 ETF",       type: "ETF",    price: 578.20, change: 0.62,  risk: "Low",      vol: 14 },
  { symbol: "QQQ",  name: "Nasdaq 100 ETF",     type: "ETF",    price: 484.50, change: 0.91,  risk: "Medium",   vol: 19 },
  { symbol: "GLD",  name: "Gold ETF",           type: "ETF",    price: 278.40, change: 1.14,  risk: "Low",      vol: 12 },
  { symbol: "USO",  name: "Oil ETF",            type: "ETF",    price: 71.30,  change: -0.78, risk: "High",     vol: 28 },
  { symbol: "SLV",  name: "Silver ETF",         type: "ETF",    price: 30.15,  change: 1.89,  risk: "Medium",   vol: 22 },
  { symbol: "IWM",  name: "Russell 2000 ETF",   type: "ETF",    price: 215.80, change: -0.31, risk: "Medium",   vol: 20 },
  { symbol: "TLT",  name: "20-Year Bond ETF",   type: "ETF",    price: 89.60,  change: -0.21, risk: "Low",      vol: 16 },
  { symbol: "NVDA", name: "Nvidia",             type: "Stock",  price: 118.40, change: 2.31,  risk: "High",     vol: 48 },
  { symbol: "AAPL", name: "Apple",              type: "Stock",  price: 227.50, change: 0.44,  risk: "Medium",   vol: 22 },
  { symbol: "XOM",  name: "ExxonMobil",         type: "Stock",  price: 112.30, change: -0.55, risk: "Medium",   vol: 24 },
  { symbol: "GS",   name: "Goldman Sachs",      type: "Stock",  price: 578.90, change: 1.12,  risk: "Medium",   vol: 26 },
  { symbol: "META", name: "Meta Platforms",     type: "Stock",  price: 612.40, change: 1.74,  risk: "High",     vol: 38 },
  { symbol: "BTC",  name: "Bitcoin",            type: "Crypto", price: 83240,  change: 3.21,  risk: "Very High",vol: 72 },
  { symbol: "ETH",  name: "Ethereum",           type: "Crypto", price: 2108,   change: 4.12,  risk: "Very High",vol: 85 },
  { symbol: "SOL",  name: "Solana",             type: "Crypto", price: 141.20, change: 5.44,  risk: "Very High",vol: 94 },
];

function generateHistory(base, vol) {
  let p = base * 0.91;
  const arr = [];
  for (let i = 0; i < 60; i++) {
    p = p * (1 + (Math.random() - 0.47) * (vol / 100) * 0.4);
    arr.push({ i, price: p });
  }
  arr.push({ i: 60, price: base });
  return arr;
}

function calcRSI(prices, period) {
  if (!period) period = 14;
  var g = 0, l = 0;
  for (var i = 1; i <= period; i++) {
    var d = prices[i] - prices[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  var ag = g / period, al = l / period;
  for (var j = period + 1; j < prices.length; j++) {
    var d2 = prices[j] - prices[j - 1];
    ag = (ag * (period - 1) + Math.max(d2, 0)) / period;
    al = (al * (period - 1) + Math.max(-d2, 0)) / period;
  }
  return al === 0 ? 100 : parseFloat((100 - 100 / (1 + ag / al)).toFixed(1));
}

function calcEMA(data, p) {
  var k = 2 / (p + 1);
  var e = data[0];
  return data.map(function(v, i) {
    if (i === 0) return e;
    e = v * k + e * (1 - k);
    return e;
  });
}

function scoreInst(inst) {
  var hist = generateHistory(inst.price, inst.vol);
  var prices = hist.map(function(h) { return h.price; });
  var rsi = calcRSI(prices);
  var e20 = calcEMA(prices, 20);
  var e50 = calcEMA(prices, 50);
  var trend = e20[e20.length - 1] > e50[e50.length - 1];
  var e12 = calcEMA(prices, 12);
  var e26 = calcEMA(prices, 26);
  var macdH = e12[e12.length - 1] - e26[e26.length - 1];
  var rsiScore = rsi > 50 && rsi < 72 ? 1 : rsi >= 72 ? -0.5 : rsi < 32 ? 0.8 : 0;
  var raw = (trend ? 30 : -30) + (Math.min(Math.max(inst.change / 2, -1), 1) * 25) + (rsiScore * 25) + (macdH > 0 ? 20 : -20);
  return {
    rsi: rsi,
    trend: trend ? "Bullish" : "Bearish",
    macdBull: macdH > 0,
    score: Math.min(100, Math.max(0, 50 + raw)),
    hist: hist
  };
}

var SCORED = INSTRUMENTS.map(function(i) {
  return Object.assign({}, i, scoreInst(i));
}).sort(function(a, b) { return b.score - a.score; });

var TYPES = ["All", "ETF", "Stock", "Crypto"];
var riskColor = { Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", "Very High": "#ef4444" };
var typeColor = { ETF: "#38bdf8", Stock: "#818cf8", Crypto: "#fb923c" };

function sigLabel(s) {
  return s >= 68 ? "STRONG BUY" : s >= 55 ? "BUY" : s >= 45 ? "HOLD" : s >= 32 ? "SELL" : "AVOID";
}
function sigColor(s) {
  return s >= 68 ? "#22c55e" : s >= 55 ? "#86efac" : s >= 45 ? "#f59e0b" : s >= 32 ? "#f87171" : "#ef4444";
}
function fmtPrice(p) {
  return p >= 1000
    ? p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : p.toFixed(2);
}

function Sparkline({ hist, up }) {
  var prices = hist.map(function(h) { return h.price; });
  var mn = Math.min.apply(null, prices);
  var mx = Math.max.apply(null, prices);
  var rng = mx - mn || 1;
  var W = 80, H = 28;
  var pts = prices.map(function(p, i) {
    return (i / (prices.length - 1)) * W + "," + (H - ((p - mn) / rng) * H);
  }).join(" ");
  var color = up ? "#22c55e" : "#ef4444";
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: W, height: H }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreRing({ score }) {
  var r = 22, circ = 2 * Math.PI * r;
  var fill = (score / 100) * circ;
  var color = score >= 68 ? "#22c55e" : score >= 52 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="#e2e8f0" strokeWidth={4} />
      <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={fill + " " + circ} strokeLinecap="round"
        transform="rotate(-90 28 28)" />
      <text x={28} y={33} textAnchor="middle" fill={color} fontSize={13} fontWeight={700} fontFamily="monospace">
        {score.toFixed(0)}
      </text>
    </svg>
  );
}

function allocate(instruments, budget) {
  var top = instruments.filter(function(i) { return i.score >= 52; }).slice(0, 8);
  if (!top.length) return [];
  var total = top.reduce(function(s, i) { return s + i.score; }, 0);
  return top.map(function(i) {
    var alloc = parseFloat(((i.score / total) * budget).toFixed(2));
    var shares = parseFloat((alloc / i.price).toFixed(4));
    return Object.assign({}, i, { alloc: alloc, shares: shares });
  });
}

function AllocationBar({ items }) {
  var colors = ["#38bdf8", "#818cf8", "#fb923c", "#22c55e", "#f59e0b", "#e879f9", "#f97316", "#34d399"];
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 1 }}>
      {items.map(function(item, i) {
        return (
          <div key={item.symbol} style={{ flex: item.alloc, background: colors[i % colors.length] }} />
        );
      })}
    </div>
  );
}

function DetailModal({ inst, budget, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,46,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 480, padding: 28, maxHeight: "90vh", overflowY: "auto" }}
        onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 900, fontSize: 24, color: "#1a1a2e" }}>{inst.symbol}</span>
              <span style={{ background: typeColor[inst.type] + "22", color: typeColor[inst.type], fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{inst.type}</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>{inst.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#64748b" }}>✕ Close</button>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
          <span style={{ fontWeight: 900, fontSize: 28, fontFamily: "monospace", color: "#1a1a2e" }}>${fmtPrice(inst.price)}</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: inst.change >= 0 ? "#16a34a" : "#dc2626" }}>
            {inst.change >= 0 ? "+" : ""}{inst.change}%
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            ["Signal", sigLabel(inst.score), sigColor(inst.score)],
            ["Score", inst.score.toFixed(0) + "/100", sigColor(inst.score)],
            ["RSI", inst.rsi, inst.rsi > 70 ? "#dc2626" : inst.rsi < 30 ? "#16a34a" : "#1a1a2e"],
            ["Trend", inst.trend, inst.trend === "Bullish" ? "#16a34a" : "#dc2626"],
            ["MACD", inst.macdBull ? "Bullish" : "Bearish", inst.macdBull ? "#16a34a" : "#dc2626"],
            ["Risk", inst.risk, riskColor[inst.risk]],
          ].map(function(row) {
            return (
              <div key={row[0]} style={{ background: "#f8f7f4", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 3, textTransform: "uppercase" }}>{row[0]}</div>
                <div style={{ color: row[2], fontSize: 13, fontWeight: 700 }}>{row[1]}</div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#166534", marginBottom: 10 }}>With Your ${budget} Budget</div>
          {[10, 25, 50, budget].map(function(amt) {
            return (
              <div key={amt} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #dcfce7" }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>Invest ${amt}</span>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#166534" }}>
                  {(amt / inst.price).toFixed(4)} shares
                </span>
              </div>
            );
          })}
          <div style={{ marginTop: 10, fontSize: 11, color: "#16a34a" }}>✓ Available on SoFi with fractional shares from $1</div>
        </div>
      </div>
    </div>
  );
}

export default function SoFiDashboard() {
  var [filter, setFilter] = useState("All");
  var [tab, setTab] = useState("screener");
  var [budget, setBudget] = useState(200);
  var [selected, setSelected] = useState(null);

  var filtered = SCORED.filter(function(i) { return filter === "All" || i.type === filter; });
  var allocation = allocate(SCORED, budget);
  var totalAllocated = allocation.reduce(function(s, i) { return s + i.alloc; }, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "system-ui, sans-serif", color: "#1a1a2e" }}>

      {/* HEADER */}
      <div style={{ background: "#1a1a2e", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "#4ade80", width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#1a1a2e", fontSize: 16 }}>S</div>
          <div>
            <div style={{ color: "#f8f7f4", fontWeight: 700, fontSize: 16 }}>SoFi Invest Advisor</div>
            <div style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace" }}>AI-POWERED · $200 BUDGET</div>
          </div>
        </div>
        <div style={{ background: "#4ade8022", border: "1px solid #4ade8044", borderRadius: 20, padding: "5px 14px", color: "#4ade80", fontSize: 12 }}>
          ● SoFi Available
        </div>
      </div>

      {/* BUDGET BAR */}
      <div style={{ background: "#1a1a2e", borderTop: "1px solid #ffffff0f", padding: "14px 28px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4, fontFamily: "monospace", letterSpacing: 1 }}>YOUR BUDGET</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#f8f7f4", fontSize: 20, fontFamily: "monospace" }}>$</span>
              <input type="number" value={budget} min={10} max={10000} step={10}
                onChange={function(e) { setBudget(Math.max(10, Number(e.target.value))); }}
                style={{ background: "transparent", border: "none", borderBottom: "1px solid #334155", color: "#4ade80", fontSize: 26, fontWeight: 700, width: 120, fontFamily: "monospace", outline: "none" }} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace" }}>ALLOCATION PREVIEW</span>
              <span style={{ color: "#4ade80", fontSize: 11, fontFamily: "monospace" }}>${totalAllocated.toFixed(2)} / ${budget}</span>
            </div>
            <AllocationBar items={allocation} />
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: "#f8f7f4", borderBottom: "2px solid #e2e0db", padding: "0 28px", display: "flex" }}>
        {[["screener", "Screener"], ["allocate", "My $" + budget + " Plan"], ["learn", "SoFi Guide"]].map(function(t) {
          return (
            <button key={t[0]} onClick={function() { setTab(t[0]); }}
              style={{ background: "none", border: "none", borderBottom: tab === t[0] ? "2px solid #1a1a2e" : "2px solid transparent", marginBottom: -2, padding: "14px 20px", cursor: "pointer", fontWeight: tab === t[0] ? 700 : 400, fontSize: 13, color: tab === t[0] ? "#1a1a2e" : "#94a3b8", fontFamily: "inherit" }}>
              {t[1]}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 900, margin: "0 auto" }}>

        {/* SCREENER */}
        {tab === "screener" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {TYPES.map(function(t) {
                return (
                  <button key={t} onClick={function() { setFilter(t); }}
                    style={{ background: filter === t ? "#1a1a2e" : "white", border: "1.5px solid " + (filter === t ? "#1a1a2e" : "#e2e0db"), color: filter === t ? "#f8f7f4" : "#64748b", borderRadius: 20, padding: "6px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                    {t}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {filtered.map(function(inst) {
                return (
                  <div key={inst.symbol} onClick={function() { setSelected(inst); }}
                    style={{ background: "white", border: "1.5px solid #e2e0db", borderRadius: 16, padding: 18, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e" }}>{inst.symbol}</span>
                          <span style={{ background: typeColor[inst.type] + "22", color: typeColor[inst.type], fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{inst.type}</span>
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{inst.name}</div>
                      </div>
                      <ScoreRing score={inst.score} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "monospace", color: "#1a1a2e" }}>${fmtPrice(inst.price)}</div>
                        <div style={{ fontSize: 12, fontFamily: "monospace", color: inst.change >= 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                          {inst.change >= 0 ? "▲" : "▼"} {Math.abs(inst.change)}%
                        </div>
                      </div>
                      <Sparkline hist={inst.hist} up={inst.change >= 0} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ background: sigColor(inst.score) + "18", color: sigColor(inst.score), fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                        {sigLabel(inst.score)}
                      </span>
                      <span style={{ background: riskColor[inst.risk] + "18", color: riskColor[inst.risk], fontSize: 9, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{inst.risk}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ALLOCATION PLAN */}
        {tab === "allocate" && (
          <div>
            <div style={{ background: "white", border: "1.5px solid #e2e0db", borderRadius: 16, padding: 22, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Your Personalized ${budget} SoFi Plan</div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>Algorithm-weighted across ETFs, stocks and crypto — sized for fractional shares on SoFi.</div>
              <AllocationBar items={allocation} />
            </div>
            {["ETF", "Stock", "Crypto"].map(function(type) {
              var items = allocation.filter(function(i) { return i.type === type; });
              if (!items.length) return null;
              var typeTotal = items.reduce(function(s, i) { return s + i.alloc; }, 0);
              return (
                <div key={type} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>{type}s</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>${typeTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {items.map(function(item) {
                      return (
                        <div key={item.symbol} style={{ background: "white", border: "1.5px solid #e2e0db", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ background: typeColor[item.type] + "18", borderRadius: 10, padding: "8px 12px", minWidth: 52, textAlign: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: typeColor[item.type] }}>{item.symbol}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{item.name}</div>
                            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{item.shares} shares @ ${fmtPrice(item.price)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>${item.alloc.toFixed(2)}</div>
                            <div style={{ fontSize: 10, color: sigColor(item.score), fontWeight: 600, marginTop: 2 }}>{sigLabel(item.score)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div style={{ background: "#fafaf8", border: "1.5px solid #e2e0db", borderRadius: 12, padding: "16px 18px", marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>
                <span>Total Allocated</span>
                <span style={{ fontFamily: "monospace", color: "#16a34a" }}>${totalAllocated.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                <span>Cash remaining</span>
                <span style={{ fontFamily: "monospace" }}>${(budget - totalAllocated).toFixed(2)}</span>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: "14px 18px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, color: "#92400e", fontSize: 12, lineHeight: 1.7 }}>
              <strong>Disclaimer:</strong> This is a simulated tool for educational purposes only. Not financial advice. All investments involve risk.
            </div>
          </div>
        )}

        {/* GUIDE */}
        {tab === "learn" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ background: "#1a1a2e", borderRadius: 16, padding: "22px 24px", color: "#f8f7f4" }}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Why SoFi for a $200 Budget?</div>
              <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.8 }}>SoFi Invest offers zero commissions, fractional shares from $1, and direct crypto — making it ideal for small budgets.</div>
            </div>
            {[
              ["ETFs — Futures-Like Exposure", "SPY, QQQ, GLD and USO give you exposure to the same markets futures traders target — without the leverage risk."],
              ["Stocks — Direct Sector Bets", "With fractional shares you can own $20 of Apple or $15 of Nvidia regardless of the share price."],
              ["Crypto — High Risk, High Reward", "SoFi supports BTC, ETH and SOL. Only allocate 10–20% of your budget here — crypto is highly volatile."],
              ["Suggested Split for $200", "50% ETFs ($100) for stability · 30% Stocks ($60) for growth · 20% Crypto ($40) for upside."],
              ["Dollar-Cost Averaging", "Consider investing $50/week over 4 weeks instead of all at once. This reduces timing risk significantly."],
              ["Risk Management", "Never put more than 30% in one position. Keep $20–30 in cash to buy dips."],
            ].map(function(row) {
              return (
                <div key={row[0]} style={{ background: "white", border: "1.5px solid #e2e0db", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e", marginBottom: 6 }}>{row[0]}</div>
                  <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.75 }}>{row[1]}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && <DetailModal inst={selected} budget={budget} onClose={function() { setSelected(null); }} />}
    </div>
  );
}
