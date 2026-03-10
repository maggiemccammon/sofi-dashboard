"use client";
import { useState, useEffect } from "react";

const API_KEY = process.env.NEXT_PUBLIC_POLYGON_KEY;

const SYMBOL_MAP = {
  SPY:  { ticker: "SPY",       type: "stock"  },
  QQQ:  { ticker: "QQQ",       type: "stock"  },
  GLD:  { ticker: "GLD",       type: "stock"  },
  USO:  { ticker: "USO",       type: "stock"  },
  SLV:  { ticker: "SLV",       type: "stock"  },
  IWM:  { ticker: "IWM",       type: "stock"  },
  TLT:  { ticker: "TLT",       type: "stock"  },
  NVDA: { ticker: "NVDA",      type: "stock"  },
  AAPL: { ticker: "AAPL",      type: "stock"  },
  XOM:  { ticker: "XOM",       type: "stock"  },
  GS:   { ticker: "GS",        type: "stock"  },
  META: { ticker: "META",      type: "stock"  },
  BTC:  { ticker: "X:BTCUSD",  type: "crypto" },
  ETH:  { ticker: "X:ETHUSD",  type: "crypto" },
  SOL:  { ticker: "X:SOLUSD",  type: "crypto" },
};

async function fetchQuote(symbol) {
  try {
    const { ticker } = SYMBOL_MAP[symbol];
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=desc&limit=2&apiKey=${API_KEY}`
    );
    const data = await res.json();
    const results = data?.results;
    if (!results || results.length < 1) return { symbol, price: null, change: null };
    const latest = results[0];
    const prev = results[1];
    const change = prev
      ? parseFloat((((latest.c - prev.c) / prev.c) * 100).toFixed(2))
      : parseFloat((((latest.c - latest.o) / latest.o) * 100).toFixed(2));
    return { symbol, price: latest.c, change };
  } catch {
    return { symbol, price: null, change: null };
  }
}

async function fetchHistory(symbol) {
  try {
    const { ticker } = SYMBOL_MAP[symbol];
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=60&apiKey=${API_KEY}`
    );
    const data = await res.json();
    return (data?.results ?? []).map((bar) => ({
      i: bar.t,
      price: bar.c,
    }));
  } catch {
    return [];
  }
}

export function useLiveData() {
  const [quotes, setQuotes]   = useState({});
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        const symbols = Object.keys(SYMBOL_MAP);

        const quoteResults = await Promise.all(symbols.map(fetchQuote));
        const quoteMap = {};
        quoteResults.forEach((q) => { quoteMap[q.symbol] = q; });
        setQuotes(quoteMap);

        const histResults = await Promise.all(
          symbols.map(async (sym) => ({ sym, hist: await fetchHistory(sym) }))
        );
        const histMap = {};
        histResults.forEach(({ sym, hist }) => { histMap[sym] = hist; });
        setHistory(histMap);

        setError(null);
      } catch (err) {
        setError("Could not load live market data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, []);

  return { quotes, history, loading, error };
}
