// useLiveData.js
// Drop this file into your Next.js project at /hooks/useLiveData.js
// Replace YOUR_API_KEY with your key from polygon.io

import { useState, useEffect } from "react";

const API_KEY = "YOUR_API_KEY"; // 👈 paste your Polygon.io key here

// Maps your symbols to Polygon's format
// Crypto uses X: prefix on Polygon
const SYMBOL_MAP = {
  SPY:  { ticker: "SPY",      type: "stock"  },
  QQQ:  { ticker: "QQQ",      type: "stock"  },
  GLD:  { ticker: "GLD",      type: "stock"  },
  USO:  { ticker: "USO",      type: "stock"  },
  SLV:  { ticker: "SLV",      type: "stock"  },
  IWM:  { ticker: "IWM",      type: "stock"  },
  TLT:  { ticker: "TLT",      type: "stock"  },
  NVDA: { ticker: "NVDA",     type: "stock"  },
  AAPL: { ticker: "AAPL",     type: "stock"  },
  XOM:  { ticker: "XOM",      type: "stock"  },
  GS:   { ticker: "GS",       type: "stock"  },
  META: { ticker: "META",     type: "stock"  },
  BTC:  { ticker: "X:BTCUSD", type: "crypto" },
  ETH:  { ticker: "X:ETHUSD", type: "crypto" },
  SOL:  { ticker: "X:SOLUSD", type: "crypto" },
};

// Fetch latest price + % change for a single ticker
async function fetchQuote(symbol) {
  const { ticker, type } = SYMBOL_MAP[symbol];

  if (type === "crypto") {
    // Crypto: real-time on free tier
    const res = await fetch(
      `https://api.polygon.io/v2/last/trade/${ticker}?apiKey=${API_KEY}`
    );
    const data = await res.json();
    return {
      symbol,
      price: data?.results?.p ?? null,
      change: null, // compute from prev close if needed
    };
  } else {
    // Stocks/ETFs: previous close (free tier)
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${API_KEY}`
    );
    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return { symbol, price: null, change: null };
    const change = parseFloat((((result.c - result.o) / result.o) * 100).toFixed(2));
    return {
      symbol,
      price: result.c,   // closing price
      change,            // % change open → close
    };
  }
}

// Fetch 60-day price history for sparkline charts
async function fetchHistory(symbol) {
  const { ticker } = SYMBOL_MAP[symbol];

  // Get date range: today back 90 days
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const res = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=60&apiKey=${API_KEY}`
  );
  const data = await res.json();

  return (data?.results ?? []).map((bar) => ({
    date: new Date(bar.t).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: bar.c,
  }));
}

// Main hook — call this inside your dashboard component
export function useLiveData() {
  const [quotes, setQuotes]   = useState({});   // { SPY: { price, change }, ... }
  const [history, setHistory] = useState({});   // { SPY: [{date, price}], ... }
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);

        const symbols = Object.keys(SYMBOL_MAP);

        // Fetch all quotes in parallel
        const quoteResults = await Promise.all(symbols.map(fetchQuote));
        const quoteMap = {};
        quoteResults.forEach((q) => { quoteMap[q.symbol] = q; });
        setQuotes(quoteMap);

        // Fetch history for all symbols in parallel
        const histResults = await Promise.all(
          symbols.map(async (sym) => ({ sym, hist: await fetchHistory(sym) }))
        );
        const histMap = {};
        histResults.forEach(({ sym, hist }) => { histMap[sym] = hist; });
        setHistory(histMap);

      } catch (err) {
        setError("Failed to load market data. Check your API key.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAll();

    // Auto-refresh every 60 seconds
    const interval = setInterval(loadAll, 60_000);
    return () => clearInterval(interval);
  }, []);

  return { quotes, history, loading, error };
}


// ─────────────────────────────────────────────
// HOW TO USE IN YOUR DASHBOARD COMPONENT:
// ─────────────────────────────────────────────
//
// 1. Import the hook at the top of sofi_dashboard.jsx:
//    import { useLiveData } from "@/hooks/useLiveData";
//
// 2. Call it inside your component:
//    const { quotes, history, loading, error } = useLiveData();
//
// 3. Replace the static price/change/hist fields like this:
//
//    const INSTRUMENTS_LIVE = INSTRUMENTS.map(inst => ({
//      ...inst,
//      price:  quotes[inst.symbol]?.price  ?? inst.price,   // fallback to static
//      change: quotes[inst.symbol]?.change ?? inst.change,
//      hist:   history[inst.symbol]        ?? inst.hist,
//    }));
//
// 4. Then use INSTRUMENTS_LIVE instead of INSTRUMENTS everywhere.
//
// 5. Show a loading state:
//    if (loading) return <div>Loading live data...</div>;
//    if (error)   return <div style={{color:"red"}}>{error}</div>;
