import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../apiConfig";
const TICKER_POOL = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPY", "QQQ", "AMD"];
const TICKER_COUNT = 7;

function formatPrice(value) {
  if (value == null || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function chooseTickers() {
  return [...TICKER_POOL]
    .sort(() => Math.random() - 0.5)
    .slice(0, TICKER_COUNT);
}

function TickerGroup({ items, status }) {
  const statusLabel = status === "live" ? "LIVE API" : status === "loading" ? "SYNCING" : "API OFFLINE";

  return (
    <div className="flex shrink-0 items-center whitespace-nowrap pr-10">
      {items.map((quote) => (
        <span key={quote.symbol} className="inline-flex items-center gap-2 mx-5 font-mono text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${status === "live" ? "bg-emerald-400 pulse-green" : "bg-zinc-700"}`} />
          <span className="text-zinc-500">{quote.symbol}</span>
          <span className={quote.price == null ? "text-zinc-700" : "text-emerald-400"}>
            {quote.price == null ? "--" : `$${formatPrice(quote.price)}`}
          </span>
          <span className="text-zinc-700">{statusLabel}</span>
          <span className="text-zinc-900 ml-2">|</span>
        </span>
      ))}
    </div>
  );
}

export default function MarketTickerFooter() {
  const [symbols] = useState(chooseTickers);
  const [quotes, setQuotes] = useState([]);
  const [status, setStatus] = useState("loading");

  const fetchQuotes = useCallback(async () => {
    setStatus("loading");

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const response = await fetch(`${API_BASE_URL}/price?ticker=${symbol}`);
          if (!response.ok) return null;
          const data = await response.json();
          return {
            symbol,
            price: data?.price_data?.vwap,
            timestamp: data?.price_data?.timestamp,
          };
        } catch {
          return null;
        }
      })
    );

    const validQuotes = results.filter(Boolean);
    setQuotes(validQuotes);
    setStatus(validQuotes.length > 0 ? "live" : "offline");
  }, [symbols]);

  useEffect(() => {
    fetchQuotes();
    const id = window.setInterval(fetchQuotes, 60000);
    return () => window.clearInterval(id);
  }, [fetchQuotes]);

  const tickerItems = useMemo(() => {
    if (quotes.length === 0) {
      return symbols.map((symbol) => ({ symbol, price: null, timestamp: null }));
    }
    return quotes;
  }, [quotes, symbols]);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-black border-t border-zinc-900 overflow-hidden py-2">
      <div className="flex w-max animate-ticker whitespace-nowrap" style={{ animation: "ticker 42s linear infinite" }}>
        <TickerGroup items={tickerItems} status={status} />
        <TickerGroup items={tickerItems} status={status} />
      </div>
    </footer>
  );
}
