"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useLiveData } from "../hooks/useLiveData";

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

const RISK_PROFILES = {
  conservative: { label: "Conservative", ETF: 70, Stock: 20, Crypto: 10, color: "#22c55e", desc: "Capital preservation — heavy ETFs, minimal crypto" },
  moderate:     { label: "Moderate",     ETF: 50, Stock: 30, Crypto: 20, color: "#f59e0b", desc: "Balanced growth — mix of ETFs, stocks and crypto" },
  aggressive:   { label: "Aggressive",   ETF: 25, Stock: 40, Crypto: 35, color: "#ef4444", desc: "Maximum growth — heavy stocks and crypto exposure" },
};

// Projected annual returns by type (rough historical averages)
const TYPE_RETURN = { ETF: 0.10, Stock: 0.15, Crypto: 0.45 };
const TYPE_DRAWDOWN = { ETF: 0.12, Stock: 0.25, Crypto: 0.65 };

function generateHistory(base, vol) {
  var p = base * 0.91, arr = [];
  for (var i = 0; i < 60; i++) {
    p = p * (1 + (Math.random() - 0.47) * (vol / 100) * 0.4);
    arr.push({ i: i, price: p });
  }
  arr.push({ i: 60, price: base });
  return arr;
}

function calcRSI(prices, period) {
  if (!period) period = 14;
  var g = 0, l = 0;
  for (var i = 1; i <= period; i++) { var d = prices[i]-prices[i-1]; if(d>=0) g+=d; else l-=d; }
  var ag = g/period, al = l/period;
  for (var j = period+1; j < prices.length; j++) {
    var d2 = prices[j]-prices[j-1];
    ag = (ag*(period-1)+Math.max(d2,0))/period;
    al = (al*(period-1)+Math.max(-d2,0))/period;
  }
  return al===0 ? 100 : parseFloat((100-100/(1+ag/al)).toFixed(1));
}

function calcEMA(data, p) {
  var k = 2/(p+1), e = data[0];
  return data.map(function(v,i){ if(i===0) return e; e=v*k+e*(1-k); return e; });
}

function scoreInst(inst) {
  var hist = inst.hist && inst.hist.length > 20 ? inst.hist : generateHistory(inst.price, inst.vol);
  var prices = hist.map(function(h){ return h.price; });
  var rsi = calcRSI(prices);
  var e20 = calcEMA(prices,20), e50 = calcEMA(prices,50);
  var trend = e20[e20.length-1] > e50[e50.length-1];
  var e12 = calcEMA(prices,12), e26 = calcEMA(prices,26);
  var macdH = e12[e12.length-1]-e26[e26.length-1];
  var rsiScore = rsi>50&&rsi<72?1:rsi>=72?-0.5:rsi<32?0.8:0;
  var raw = (trend?30:-30)+(Math.min(Math.max(inst.change/2,-1),1)*25)+(rsiScore*25)+(macdH>0?20:-20);
  return { rsi, trend: trend?"Bullish":"Bearish", macdBull: macdH>0, score: Math.min(100,Math.max(0,50+raw)) };
}

// Stable number input — only commits on blur or Enter, no jitter while typing
function DraftInput({ value, onCommit, style }) {
  var [draft, setDraft] = useState(String(parseFloat(value).toFixed(2)));
  var [focused, setFocused] = useState(false);

  // Keep draft in sync when value changes externally (e.g. slider or reset)
  if (!focused && parseFloat(draft) !== parseFloat(value)) {
    setDraft(String(parseFloat(value).toFixed(2)));
  }

  function commit() {
    var val = Math.max(0, parseFloat(draft) || 0);
    setDraft(val.toFixed(2));
    onCommit(val);
    setFocused(false);
  }

  return (
    <input
      type="number"
      value={draft}
      min={0}
      step={0.01}
      onFocus={function(){ setFocused(true); }}
      onChange={function(e){ setDraft(e.target.value); }}
      onBlur={commit}
      onKeyDown={function(e){ if(e.key==="Enter") commit(); }}
      style={style}
    />
  );
}

var TYPES = ["All","ETF","Stock","Crypto"];
var riskColor = { Low:"#22c55e", Medium:"#f59e0b", High:"#f97316", "Very High":"#ef4444" };
var typeColor  = { ETF:"#38bdf8", Stock:"#818cf8", Crypto:"#fb923c" };
var PIE_COLORS = ["#38bdf8","#818cf8","#fb923c","#22c55e","#f59e0b","#e879f9","#f97316","#34d399","#60a5fa","#a78bfa"];

function sigLabel(s){ return s>=68?"STRONG BUY":s>=55?"BUY":s>=45?"HOLD":s>=32?"SELL":"AVOID"; }
function sigColor(s){ return s>=68?"#22c55e":s>=55?"#86efac":s>=45?"#f59e0b":s>=32?"#f87171":"#ef4444"; }
function fmtPrice(p){ if(!p) return "—"; return p>=1000?p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):p.toFixed(2); }
function fmtPct(n){ return (n>=0?"+":"")+n.toFixed(2)+"%" ; }

function Sparkline({ hist, up }) {
  if(!hist||hist.length<2) return null;
  var prices = hist.map(function(h){ return h.price; });
  var mn=Math.min.apply(null,prices), mx=Math.max.apply(null,prices), rng=mx-mn||1;
  var W=80,H=28;
  var pts = prices.map(function(p,i){ return (i/(prices.length-1))*W+","+(H-((p-mn)/rng)*H); }).join(" ");
  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{width:W,height:H}}>
      <polyline points={pts} fill="none" stroke={up?"#22c55e":"#ef4444"} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function ScoreRing({ score }) {
  var r=22, circ=2*Math.PI*r, fill=(score/100)*circ;
  var color = score>=68?"#22c55e":score>=52?"#f59e0b":"#ef4444";
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="#e2e8f0" strokeWidth={4}/>
      <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={fill+" "+circ} strokeLinecap="round" transform="rotate(-90 28 28)"/>
      <text x={28} y={33} textAnchor="middle" fill={color} fontSize={13} fontWeight={700} fontFamily="monospace">{score.toFixed(0)}</text>
    </svg>
  );
}

// Simple SVG Pie Chart
function PieChart({ items }) {
  var total = items.reduce(function(s,i){ return s+i.alloc; },0);
  if(!total) return null;
  var cx=80, cy=80, r=70, startAngle=-Math.PI/2;
  var slices = items.map(function(item, idx){
    var pct = item.alloc/total;
    var angle = pct*2*Math.PI;
    var x1=cx+r*Math.cos(startAngle), y1=cy+r*Math.sin(startAngle);
    startAngle+=angle;
    var x2=cx+r*Math.cos(startAngle), y2=cy+r*Math.sin(startAngle);
    var large=angle>Math.PI?1:0;
    var d = "M "+cx+" "+cy+" L "+x1+" "+y1+" A "+r+" "+r+" 0 "+large+" 1 "+x2+" "+y2+" Z";
    return { d, color: PIE_COLORS[idx%PIE_COLORS.length], label: item.symbol, pct: (pct*100).toFixed(1) };
  });
  return (
    <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {slices.map(function(s,i){ return <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth={2}/>; })}
        <circle cx={80} cy={80} r={30} fill="white"/>
        <text x={80} y={84} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1a1a2e" fontFamily="monospace">{items.length}</text>
        <text x={80} y={96} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="monospace">positions</text>
      </svg>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
        {slices.map(function(s,i){
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
              <span style={{fontSize:11,color:"#1a1a2e",fontWeight:600}}>{s.label}</span>
              <span style={{fontSize:10,color:"#94a3b8",fontFamily:"monospace"}}>{s.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AllocationBar({ items }) {
  var colors = PIE_COLORS;
  return (
    <div style={{display:"flex",height:8,borderRadius:99,overflow:"hidden",gap:1}}>
      {items.map(function(item,i){ return <div key={item.symbol} style={{flex:item.alloc,background:colors[i%colors.length]}}/>; })}
    </div>
  );
}

// ── Live Dashboard ─────────────────────────────────────────
function LiveDashboard({ instruments, quotes, liveCount, total }) {
  // Simulate small price ticks every 2s on top of real prices
  var [ticks, setTicks] = useState({});
  var [flash, setFlash] = useState({});
  var prevTicks = useRef({});

  useEffect(function(){
    var interval = setInterval(function(){
      var newTicks = {};
      var newFlash = {};
      instruments.forEach(function(inst){
        var base = (quotes[inst.symbol]&&quotes[inst.symbol].price) ? quotes[inst.symbol].price : inst.price;
        var prev = prevTicks.current[inst.symbol] || base;
        var wobble = base * (1 + (Math.random()-0.495) * 0.0018);
        newTicks[inst.symbol] = parseFloat(wobble.toFixed(inst.price>1000?2:2));
        newFlash[inst.symbol] = wobble > prev ? "up" : wobble < prev ? "down" : "flat";
      });
      prevTicks.current = newTicks;
      setTicks(newTicks);
      setFlash(newFlash);
    }, 1800);
    return function(){ clearInterval(interval); };
  }, [instruments, quotes]);

  var [search, setSearch] = useState("");
  var [sortBy, setSortBy] = useState("type");

  var displayed = instruments.filter(function(i){
    return !search || i.symbol.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase());
  }).sort(function(a,b){
    if(sortBy==="change") return b.change - a.change;
    if(sortBy==="score")  return b.score  - a.score;
    if(sortBy==="price")  return b.price  - a.price;
    return a.type.localeCompare(b.type) || b.score - a.score;
  });

  var now = new Date();
  var timeStr = now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

  return (
    <div>
      {/* Status bar */}
      <div style={{background:"#1a1a2e",borderRadius:14,padding:"14px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px #22c55e",animation:"pulse 1.5s infinite"}}/>
          <span style={{color:"#f8f7f4",fontWeight:700,fontSize:14}}>Live Market Feed</span>
          <span style={{color:"#475569",fontSize:12}}>· {liveCount}/{total} instruments streaming</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{color:"#475569",fontSize:11,fontFamily:"monospace"}}>Refreshes every 1.8s</span>
          <span style={{color:"#4ade80",fontSize:12,fontFamily:"monospace"}}>{timeStr}</span>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input placeholder="Search symbol or name..."
          value={search} onChange={function(e){ setSearch(e.target.value); }}
          style={{flex:1,minWidth:180,background:"white",border:"1.5px solid #e2e0db",borderRadius:10,padding:"8px 14px",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
        <div style={{display:"flex",gap:4}}>
          {[["type","Type"],["change","% Change"],["score","Score"],["price","Price"]].map(function(s){
            return (
              <button key={s[0]} onClick={function(){ setSortBy(s[0]); }}
                style={{background:sortBy===s[0]?"#1a1a2e":"white",border:"1.5px solid "+(sortBy===s[0]?"#1a1a2e":"#e2e0db"),color:sortBy===s[0]?"white":"#64748b",borderRadius:8,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                {s[1]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticker cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
        {displayed.map(function(inst){
          var livePrice = ticks[inst.symbol] || inst.price;
          var direction = flash[inst.symbol] || "flat";
          var flashBg = direction==="up"?"#f0fdf4":direction==="down"?"#fef2f2":"white";
          var arrowColor = direction==="up"?"#16a34a":direction==="down"?"#dc2626":"#94a3b8";
          var arrow = direction==="up"?"▲":direction==="down"?"▼":"—";
          var dayChange = inst.change;
          var isLive = !!(quotes[inst.symbol]&&quotes[inst.symbol].price);

          return (
            <div key={inst.symbol}
              style={{background:flashBg,border:"1.5px solid #e2e0db",borderRadius:14,padding:"14px 16px",transition:"background 0.4s ease"}}>
              {/* Top row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontWeight:800,fontSize:16,color:"#1a1a2e"}}>{inst.symbol}</span>
                    <span style={{background:typeColor[inst.type]+"22",color:typeColor[inst.type],fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{inst.type}</span>
                    {isLive
                      ? <span style={{fontSize:8,color:"#22c55e",fontWeight:700}}>●LIVE</span>
                      : <span style={{fontSize:8,color:"#94a3b8",fontWeight:700}}>◌SIM</span>}
                  </div>
                  <div style={{color:"#94a3b8",fontSize:10,marginTop:1}}>{inst.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"monospace",fontWeight:800,fontSize:17,color:"#1a1a2e",letterSpacing:-0.5}}>
                    ${fmtPrice(livePrice)}
                  </div>
                  <div style={{fontSize:12,color:arrowColor,fontWeight:700,fontFamily:"monospace"}}>
                    {arrow} {Math.abs(dayChange).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                {[
                  ["RSI", inst.rsi, inst.rsi>70?"#dc2626":inst.rsi<30?"#16a34a":"#64748b"],
                  ["Score", inst.score.toFixed(0), sigColor(inst.score)],
                  ["Signal", sigLabel(inst.score), sigColor(inst.score)],
                ].map(function(row){
                  return (
                    <div key={row[0]} style={{background:"#f8f7f4",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                      <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.3}}>{row[0]}</div>
                      <div style={{fontSize:11,fontWeight:700,color:row[2],marginTop:1}}>{row[1]}</div>
                    </div>
                  );
                })}
              </div>

              {/* Trend bar */}
              <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1,height:3,background:"#e2e0db",borderRadius:99,overflow:"hidden"}}>
                  <div style={{width:inst.score+"%",height:"100%",background:sigColor(inst.score),borderRadius:99,transition:"width 0.5s ease"}}/>
                </div>
                <span style={{fontSize:10,color:inst.trend==="Bullish"?"#16a34a":"#dc2626",fontWeight:700}}>{inst.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Marquee ticker at bottom */}
      <div style={{marginTop:20,background:"#1a1a2e",borderRadius:12,padding:"10px 0",overflow:"hidden",position:"relative"}}>
        <div style={{display:"flex",gap:32,animation:"marquee 30s linear infinite",whiteSpace:"nowrap",paddingLeft:"100%"}}>
          {[...displayed,...displayed].map(function(inst,i){
            var livePrice = ticks[inst.symbol]||inst.price;
            var up = inst.change>=0;
            return (
              <span key={i} style={{fontSize:12,fontFamily:"monospace",color:"#f8f7f4",flexShrink:0}}>
                <span style={{color:typeColor[inst.type],fontWeight:700}}>{inst.symbol}</span>
                <span style={{color:"#94a3b8",margin:"0 4px"}}>$</span>
                <span>{fmtPrice(livePrice)}</span>
                <span style={{color:up?"#4ade80":"#f87171",marginLeft:6}}>{up?"▲":"▼"}{Math.abs(inst.change).toFixed(2)}%</span>
              </span>
            );
          })}
        </div>
        <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      </div>
    </div>
  );
}

export default function SoFiDashboard() {
  var [filter, setFilter]       = useState("All");
  var [tab, setTab]             = useState("screener");
  var [budget, setBudget]       = useState(200);
  var [selected, setSelected]   = useState(null);
  var [riskProfile, setRiskProfile] = useState("moderate");
  // sliderAllocs: { SYMBOL: dollarAmount }
  var [sliderAllocs, setSliderAllocs] = useState(null);
  var [sliderTotal, setSliderTotal]   = useState(200);

  var liveData = useLiveData();
  var quotes  = liveData.quotes;
  var history = liveData.history;
  var loading = liveData.loading;
  var error   = liveData.error;

  // Merge live data
  var INSTRUMENTS_LIVE = INSTRUMENTS.map(function(inst){
    var q=quotes[inst.symbol], h=history[inst.symbol];
    return Object.assign({},inst,{
      price:  q&&q.price  ? q.price  : inst.price,
      change: q&&q.change!==null ? q.change : inst.change,
      hist:   h&&h.length>10 ? h : null,
      isLive: !!(q&&q.price),
    });
  });

  var SCORED = INSTRUMENTS_LIVE.map(function(i){ return Object.assign({},i,scoreInst(i)); })
    .sort(function(a,b){ return b.score-a.score; });

  var filtered = SCORED.filter(function(i){ return filter==="All"||i.type===filter; });
  var liveCount = INSTRUMENTS_LIVE.filter(function(i){ return i.isLive; }).length;

  // Stable order ref — set once per profile/budget change, never re-sorted
  var [lockedOrder, setLockedOrder] = useState(null);

  // Base algo allocation (top 8 by score)
  var baseAlloc = useMemo(function(){
    var profile = RISK_PROFILES[riskProfile];
    var byType = { ETF:[], Stock:[], Crypto:[] };
    SCORED.forEach(function(i){ if(byType[i.type]) byType[i.type].push(i); });
    var result = [];
    ["ETF","Stock","Crypto"].forEach(function(type){
      var pct = profile[type]/100;
      var typeBudget = budget*pct;
      var items = byType[type].slice(0,type==="Crypto"?3:type==="Stock"?3:4);
      if(!items.length) return;
      var totalScore = items.reduce(function(s,i){ return s+i.score; },0);
      items.forEach(function(i){
        var alloc = parseFloat(((i.score/totalScore)*typeBudget).toFixed(2));
        result.push(Object.assign({},i,{ alloc, shares: parseFloat((alloc/i.price).toFixed(4)) }));
      });
    });
    return result;
  }, [SCORED, budget, riskProfile]);

  // Initialize slider allocs from base when tab opens or budget/profile changes
  var activeAlloc = useMemo(function(){
    var base = baseAlloc.map(function(item){
      var manual = sliderAllocs && sliderAllocs[item.symbol] !== undefined ? sliderAllocs[item.symbol] : item.alloc;
      return Object.assign({},item,{ alloc: manual, shares: parseFloat((manual/item.price).toFixed(4)) });
    });
    // Lock order on first render of this alloc set, never re-sort after
    if(!lockedOrder) {
      setTimeout(function(){ setLockedOrder(base.map(function(i){ return i.symbol; })); }, 0);
      return base;
    }
    return base.slice().sort(function(a,b){
      return lockedOrder.indexOf(a.symbol) - lockedOrder.indexOf(b.symbol);
    });
  }, [baseAlloc, sliderAllocs, lockedOrder]);

  var totalAllocated = activeAlloc.reduce(function(s,i){ return s+i.alloc; },0);
  var remaining = budget - totalAllocated;

  function resetSliders() { setSliderAllocs(null); setLockedOrder(null); }

  function handleSlider(symbol, newVal) {
    var current = sliderAllocs || {};
    var updated = Object.assign({}, current, { [symbol]: parseFloat(newVal) });
    setSliderAllocs(updated);
  }

  // Projected returns
  var projectedGain1yr = activeAlloc.reduce(function(s,item){
    return s + item.alloc * TYPE_RETURN[item.type];
  },0);
  var projectedLoss = activeAlloc.reduce(function(s,item){
    return s + item.alloc * TYPE_DRAWDOWN[item.type];
  },0);
  var projectedVal1yr = totalAllocated + projectedGain1yr;

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#f8f7f4",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,fontFamily:"system-ui,sans-serif"}}>
      <div style={{width:36,height:36,border:"3px solid #e2e0db",borderTopColor:"#1a1a2e",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <div style={{color:"#94a3b8",fontSize:13}}>Loading live market data...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f8f7f4",fontFamily:"system-ui,sans-serif",color:"#1a1a2e"}}>

      {/* HEADER */}
      <div style={{background:"#1a1a2e",padding:"18px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{background:"#4ade80",width:32,height:32,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:"#1a1a2e",fontSize:16}}>S</div>
          <div>
            <div style={{color:"#f8f7f4",fontWeight:700,fontSize:16}}>SoFi Invest Advisor</div>
            <div style={{color:"#64748b",fontSize:11,fontFamily:"monospace"}}>LIVE DATA · $200 BUDGET</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:20,padding:"5px 14px",color:"#dc2626",fontSize:11}}>⚠ Cached prices</div>}
          <div style={{background:"#4ade8022",border:"1px solid #4ade8044",borderRadius:20,padding:"5px 14px",color:"#4ade80",fontSize:12}}>● {liveCount}/{INSTRUMENTS.length} Live</div>
        </div>
      </div>

      {/* BUDGET + RISK BAR */}
      <div style={{background:"#1a1a2e",borderTop:"1px solid #ffffff0f",padding:"14px 28px 20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:28,flexWrap:"wrap"}}>
          <div>
            <div style={{color:"#64748b",fontSize:11,marginBottom:4,fontFamily:"monospace",letterSpacing:1}}>YOUR BUDGET</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:"#f8f7f4",fontSize:20,fontFamily:"monospace"}}>$</span>
              <input type="number" value={budget} min={10} max={10000} step={10}
                onChange={function(e){ setBudget(Math.max(10,Number(e.target.value))); setSliderAllocs(null); setLockedOrder(null); }}
                style={{background:"transparent",border:"none",borderBottom:"1px solid #334155",color:"#4ade80",fontSize:26,fontWeight:700,width:120,fontFamily:"monospace",outline:"none"}}/>
            </div>
          </div>
          <div>
            <div style={{color:"#64748b",fontSize:11,marginBottom:8,fontFamily:"monospace",letterSpacing:1}}>RISK TOLERANCE</div>
            <div style={{display:"flex",gap:6}}>
              {Object.entries(RISK_PROFILES).map(function([key,prof]){
                var active = riskProfile===key;
                return (
                  <button key={key} onClick={function(){ setRiskProfile(key); setSliderAllocs(null); setLockedOrder(null); }}
                    style={{background:active?prof.color:"transparent",border:"1.5px solid "+(active?prof.color:"#334155"),color:active?"#1a1a2e":"#64748b",borderRadius:20,padding:"5px 14px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700,transition:"all 0.2s"}}>
                    {prof.label}
                  </button>
                );
              })}
            </div>
            <div style={{color:"#475569",fontSize:10,marginTop:6}}>{RISK_PROFILES[riskProfile].desc}</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{background:"#f8f7f4",borderBottom:"2px solid #e2e0db",padding:"0 28px",display:"flex"}}>
        {[["screener","Screener"],["allocate","My $"+budget+" Plan"],["live","● Live"],["learn","SoFi Guide"]].map(function(t){
          return (
            <button key={t[0]} onClick={function(){ setTab(t[0]); }}
              style={{background:"none",border:"none",borderBottom:tab===t[0]?"2px solid "+(t[0]==="live"?"#16a34a":"#1a1a2e"):"2px solid transparent",marginBottom:-2,padding:"14px 20px",cursor:"pointer",fontWeight:tab===t[0]?700:400,fontSize:13,color:tab===t[0]?(t[0]==="live"?"#16a34a":"#1a1a2e"):"#94a3b8",fontFamily:"inherit"}}>
              {t[1]}
            </button>
          );
        })}
      </div>

      <div style={{padding:"24px 28px",maxWidth:900,margin:"0 auto"}}>

        {/* SCREENER */}
        {tab==="screener"&&(
          <div>
            <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
              {TYPES.map(function(t){
                return (
                  <button key={t} onClick={function(){ setFilter(t); }}
                    style={{background:filter===t?"#1a1a2e":"white",border:"1.5px solid "+(filter===t?"#1a1a2e":"#e2e0db"),color:filter===t?"#f8f7f4":"#64748b",borderRadius:20,padding:"6px 16px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                    {t}
                  </button>
                );
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
              {filtered.map(function(inst){
                return (
                  <div key={inst.symbol} onClick={function(){ setSelected(inst); }}
                    style={{background:"white",border:"1.5px solid #e2e0db",borderRadius:16,padding:18,cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontWeight:800,fontSize:18,color:"#1a1a2e"}}>{inst.symbol}</span>
                          <span style={{background:typeColor[inst.type]+"22",color:typeColor[inst.type],fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20}}>{inst.type}</span>
                          {inst.isLive&&<span style={{fontSize:8,color:"#22c55e",fontWeight:700}}>●LIVE</span>}
                        </div>
                        <div style={{color:"#94a3b8",fontSize:11,marginTop:2}}>{inst.name}</div>
                      </div>
                      <ScoreRing score={inst.score}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:16,fontFamily:"monospace",color:"#1a1a2e"}}>${fmtPrice(inst.price)}</div>
                        <div style={{fontSize:12,fontFamily:"monospace",color:inst.change>=0?"#16a34a":"#dc2626",fontWeight:600}}>
                          {inst.change>=0?"▲":"▼"} {Math.abs(inst.change)}%
                        </div>
                      </div>
                      <Sparkline hist={inst.hist||generateHistory(inst.price,inst.vol)} up={inst.change>=0}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{background:sigColor(inst.score)+"18",color:sigColor(inst.score),fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{sigLabel(inst.score)}</span>
                      <span style={{background:riskColor[inst.risk]+"18",color:riskColor[inst.risk],fontSize:9,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{inst.risk}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ALLOCATION PLAN */}
        {tab==="allocate"&&(
          <div>
            {/* Projected Returns Banner */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              {[
                ["Invested",  "$"+totalAllocated.toFixed(2), "#1a1a2e"],
                ["Projected 1yr", "$"+projectedVal1yr.toFixed(2)+" ("+fmtPct((projectedGain1yr/totalAllocated)*100)+")", "#16a34a"],
                ["Max Drawdown Risk", "-$"+projectedLoss.toFixed(2)+" (-"+((projectedLoss/totalAllocated)*100).toFixed(1)+"%)", "#dc2626"],
              ].map(function(row){
                return (
                  <div key={row[0]} style={{background:"white",border:"1.5px solid #e2e0db",borderRadius:14,padding:"14px 16px"}}>
                    <div style={{color:"#94a3b8",fontSize:10,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{row[0]}</div>
                    <div style={{fontWeight:700,fontSize:15,color:row[2],fontFamily:"monospace"}}>{row[1]}</div>
                  </div>
                );
              })}
            </div>

            {/* Pie Chart */}
            <div style={{background:"white",border:"1.5px solid #e2e0db",borderRadius:16,padding:22,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:"#1a1a2e"}}>Portfolio Allocation</div>
                  <div style={{color:"#94a3b8",fontSize:12,marginTop:2}}>{RISK_PROFILES[riskProfile].label} profile · drag sliders below to customize</div>
                </div>
                <button onClick={resetSliders}
                  style={{background:"#f1f5f9",border:"1.5px solid #e2e0db",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#64748b",fontFamily:"inherit",fontWeight:600}}>
                  ↺ Reset to Algo
                </button>
              </div>
              <PieChart items={activeAlloc}/>
            </div>

            {/* Sliders by type */}
            {["ETF","Stock","Crypto"].map(function(type){
              var items = activeAlloc.filter(function(i){ return i.type===type; });
              if(!items.length) return null;
              var typeTotal = items.reduce(function(s,i){ return s+i.alloc; },0);
              return (
                <div key={type} style={{background:"white",border:"1.5px solid #e2e0db",borderRadius:16,padding:"18px 22px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:3,background:typeColor[type]}}/>
                      <span style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>{type}s</span>
                    </div>
                    <span style={{fontFamily:"monospace",fontSize:13,color:"#64748b",fontWeight:600}}>${typeTotal.toFixed(2)}</span>
                  </div>
                  <div style={{display:"grid",gap:14}}>
                    {items.map(function(item){
                      var pct = budget>0 ? ((item.alloc/budget)*100).toFixed(1) : 0;
                      return (
                        <div key={item.symbol}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                              <span style={{fontWeight:700,fontSize:14,color:"#1a1a2e",minWidth:44}}>{item.symbol}</span>
                              <span style={{color:"#94a3b8",fontSize:12}}>{item.name}</span>
                              <span style={{background:sigColor(item.score)+"18",color:sigColor(item.score),fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{sigLabel(item.score)}</span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{color:"#94a3b8",fontSize:12,fontFamily:"monospace"}}>$</span>
                              <DraftInput
                                value={item.alloc}
                                onCommit={function(val){ handleSlider(item.symbol, val); }}
                                style={{width:72,fontFamily:"monospace",fontWeight:700,fontSize:14,color:"#1a1a2e",background:"#f8f7f4",border:"1.5px solid #e2e0db",borderRadius:8,padding:"4px 8px",outline:"none",textAlign:"right"}}
                              />
                              <span style={{color:"#94a3b8",fontSize:11,minWidth:32,textAlign:"right"}}>{pct}%</span>
                            </div>
                          </div>
                          <input type="range" min={0} max={Math.max(budget, item.alloc)} step={0.01} value={item.alloc}
                            onChange={function(e){ handleSlider(item.symbol, e.target.value); }}
                            style={{width:"100%",accentColor:typeColor[type],cursor:"pointer"}}/>
                          <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                            <span style={{fontSize:10,color:"#94a3b8"}}>{item.shares} shares @ ${fmtPrice(item.price)}</span>
                            <span style={{fontSize:10,color:item.change>=0?"#16a34a":"#dc2626",fontFamily:"monospace"}}>{item.change>=0?"+":""}{item.change}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Totals */}
            <div style={{background: remaining<0?"#fef2f2":"#fafaf8", border:"1.5px solid "+(remaining<0?"#fecaca":"#e2e0db"),borderRadius:12,padding:"16px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:15,color:"#1a1a2e"}}>
                <span>Total Allocated</span>
                <span style={{fontFamily:"monospace",color: remaining<0?"#dc2626":"#16a34a"}}>${totalAllocated.toFixed(2)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:4,color: remaining<0?"#dc2626":"#16a34a",fontWeight: remaining<0?700:400}}>
                <span>{remaining<0?"⚠ Over budget by":"✓ Cash remaining"}</span>
                <span style={{fontFamily:"monospace"}}>${Math.abs(remaining).toFixed(2)}</span>
              </div>
              {remaining<0&&(
                <div style={{marginTop:8,fontSize:11,color:"#dc2626",background:"#fef2f2",borderRadius:8,padding:"6px 10px"}}>
                  Your allocation exceeds your ${budget} budget by ${Math.abs(remaining).toFixed(2)}. You can increase your budget above or reduce some positions.
                </div>
              )}
            </div>

            <div style={{marginTop:14,padding:"14px 18px",background:"#fff7ed",border:"1.5px solid #fed7aa",borderRadius:12,color:"#92400e",fontSize:12,lineHeight:1.7}}>
              <strong>Disclaimer:</strong> Projected returns are rough historical averages — not guarantees. This tool is for educational purposes only and is not financial advice. All investments involve risk of loss.
            </div>
          </div>
        )}

        {/* LIVE DASHBOARD */}
        {tab==="live"&&(
          <LiveDashboard instruments={SCORED} quotes={quotes} liveCount={liveCount} total={INSTRUMENTS.length}/>
        )}

        {/* GUIDE */}
        {tab==="learn"&&(
          <div style={{display:"grid",gap:12}}>
            <div style={{background:"#1a1a2e",borderRadius:16,padding:"22px 24px",color:"#f8f7f4"}}>
              <div style={{fontWeight:800,fontSize:18,marginBottom:6}}>Why SoFi for a $200 Budget?</div>
              <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.8}}>SoFi Invest offers zero commissions, fractional shares from $1, and direct crypto — making it ideal for small budgets.</div>
            </div>
            {[
              ["ETFs — Futures-Like Exposure","SPY, QQQ, GLD and USO give you exposure to the same markets futures traders target — without the leverage risk."],
              ["Stocks — Direct Sector Bets","With fractional shares you can own $20 of Apple or $15 of Nvidia regardless of the share price."],
              ["Crypto — High Risk, High Reward","SoFi supports BTC, ETH and SOL. Only allocate 10–20% of your budget here — crypto is highly volatile."],
              ["Risk Tolerance Profiles","Conservative = heavy ETFs, minimal crypto. Moderate = balanced mix. Aggressive = heavy stocks and crypto for max upside."],
              ["Dollar-Cost Averaging","Consider investing $50/week over 4 weeks instead of all at once. This reduces timing risk significantly."],
              ["Risk Management","Never put more than 30% in one position. Keep $20–30 in cash to buy dips."],
            ].map(function(row){
              return (
                <div key={row[0]} style={{background:"white",border:"1.5px solid #e2e0db",borderRadius:14,padding:"18px 20px"}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e",marginBottom:6}}>{row[0]}</div>
                  <div style={{color:"#64748b",fontSize:13,lineHeight:1.75}}>{row[1]}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selected&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,26,46,0.6)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={function(){ setSelected(null); }}>
          <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:480,padding:28,maxHeight:"90vh",overflowY:"auto"}}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontWeight:900,fontSize:24,color:"#1a1a2e"}}>{selected.symbol}</span>
                  <span style={{background:typeColor[selected.type]+"22",color:typeColor[selected.type],fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{selected.type}</span>
                </div>
                <div style={{color:"#94a3b8",fontSize:13}}>{selected.name}</div>
              </div>
              <button onClick={function(){ setSelected(null); }} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13,color:"#64748b"}}>✕ Close</button>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:20}}>
              <span style={{fontWeight:900,fontSize:28,fontFamily:"monospace",color:"#1a1a2e"}}>${fmtPrice(selected.price)}</span>
              <span style={{fontWeight:700,fontSize:16,color:selected.change>=0?"#16a34a":"#dc2626"}}>{selected.change>=0?"+":""}{selected.change}%</span>
              {selected.isLive&&<span style={{fontSize:10,color:"#22c55e",background:"#f0fdf4",padding:"2px 8px",borderRadius:20,fontWeight:600}}>● LIVE</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
              {[["Signal",sigLabel(selected.score),sigColor(selected.score)],["Score",selected.score.toFixed(0)+"/100",sigColor(selected.score)],["RSI",selected.rsi,selected.rsi>70?"#dc2626":selected.rsi<30?"#16a34a":"#1a1a2e"],["Trend",selected.trend,selected.trend==="Bullish"?"#16a34a":"#dc2626"],["MACD",selected.macdBull?"Bullish":"Bearish",selected.macdBull?"#16a34a":"#dc2626"],["Risk",selected.risk,riskColor[selected.risk]]].map(function(row){
                return (
                  <div key={row[0]} style={{background:"#f8f7f4",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{color:"#94a3b8",fontSize:10,marginBottom:3,textTransform:"uppercase"}}>{row[0]}</div>
                    <div style={{color:row[2],fontSize:13,fontWeight:700}}>{row[1]}</div>
                  </div>
                );
              })}
            </div>
            <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",borderRadius:12,padding:"16px 18px"}}>
              <div style={{fontWeight:700,fontSize:13,color:"#166534",marginBottom:10}}>With Your ${budget} Budget</div>
              {[10,25,50,budget].map(function(amt){
                return (
                  <div key={amt} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #dcfce7"}}>
                    <span style={{color:"#64748b",fontSize:13}}>Invest ${amt}</span>
                    <span style={{fontFamily:"monospace",fontSize:13,fontWeight:600,color:"#166534"}}>{(amt/selected.price).toFixed(4)} shares</span>
                  </div>
                );
              })}
              <div style={{marginTop:10,fontSize:11,color:"#16a34a"}}>✓ Available on SoFi with fractional shares from $1</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
