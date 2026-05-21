import { useState } from "react";
import { supabase } from "../../supabaseClient";

const handleSell = async ({ leagueMemberId, symbol, stockAmt, vwap, isShares, setError }) => {
  const shares = isShares ? stockAmt : stockAmt / vwap;
  const totalValue = shares * vwap;

  const { data: holding, error: holdingErr } = await supabase
    .from("holdings").select("*").eq("league_member_id", leagueMemberId).eq("ticker", symbol).single();
  if (holdingErr || !holding) { setError("No shares available to sell"); return; }

  const { data: portfolio, error: portfolioErr } = await supabase
    .from("portfolios").select("*").eq("league_member_id", leagueMemberId).single();
  if (portfolioErr || !portfolio) { setError("Portfolio not found"); return; }

  const { error: updatePortfolioErr } = await supabase
    .from("portfolios")
    .update({ current_balance: portfolio.current_balance + totalValue })
    .eq("league_member_id", leagueMemberId);
  if (updatePortfolioErr) { setError("Failed to update portfolio balance"); return; }

  const remainingShares = holding.stock_amount - shares;
  const EPSILON = 0.001;
  if (remainingShares < EPSILON) {
    await supabase.from("holdings").delete().eq("league_member_id", leagueMemberId).eq("ticker", symbol);
  } else {
    await supabase.from("holdings").update({ stock_amount: remainingShares })
      .eq("league_member_id", leagueMemberId).eq("ticker", symbol);
  }
};

export { handleSell };

const ToggleButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2 font-mono text-xs tracking-widest uppercase transition-all duration-200 rounded ${
      active
        ? label === 'BUY' || label === 'SHARES'
          ? 'bg-emerald-500 text-black border border-emerald-500'
          : 'bg-red-500 text-white border border-red-500'
        : 'border border-zinc-700 text-zinc-500 hover:border-zinc-500'
    }`}
  >
    {label}
  </button>
);

const BuySellStock = ({ leagueMemberId }) => {
  const [symbol, setSymbol] = useState("");
  const [stockAmt, setStockAmt] = useState("");
  const [isShares, setIsShares] = useState(true);
  const [isBuy, setIsBuy] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [stockError, setStockError] = useState('');
  const [loading, setLoading] = useState(false);
  const [txSuccess, setTxSuccess] = useState('');

  const fetchStockInfo = async (e) => {
    e.preventDefault();
    setStockError(null);
    setResult(null);
    setLoading(true);
    if (!symbol) { setStockError("Enter a stock ticker to fetch price!"); setLoading(false); return { error: true }; }
    try {
      const res = await fetch(`http://localhost:8000/price?ticker=${symbol}`);
      const data = await res.json();
      if (!res.ok) { setStockError(data.detail || "Stock data not found."); return { error: true }; }
      else { setResult(data); return { result: data }; }
    } catch (err) {
      setStockError("Failed to fetch stock price — is the backend running?");
      return { error: true };
    } finally {
      setLoading(false);
    }
  };

  const getOrCreatePortfolio = async (leagueMemberId) => {
    let { data: portfolio, error } = await supabase
      .from("portfolios").select("*").eq("league_member_id", leagueMemberId).single();
    if (error && error.code !== "PGRST116") { setError("Error fetching portfolio"); return null; }
    if (!portfolio) {
      const { data: inserted, error: insertErr } = await supabase
        .from("portfolios")
        .insert({ league_member_id: leagueMemberId, current_balance: 10000, start_of_week_total: 10000 })
        .select().single();
      if (insertErr) { setError("Error creating new portfolio"); return null; }
      return inserted;
    }
    return portfolio;
  };

  const checkHasTicker = async ({ leagueMemberId, symbol }) => {
    try {
      const res = await fetch(`http://localhost:8000/hasTicker?leagueMemberId=${leagueMemberId}&ticker=${symbol}`);
      const data = await res.json();
      return data.has_ticker;
    } catch (err) { return false; }
  };

  const handleBuy = async ({ leagueMemberId, symbol, stockAmt, vwap, isShares }) => {
    const hasTicker = await checkHasTicker({ leagueMemberId, symbol });
    if (!hasTicker) { setError("You cannot trade this stock"); throw new Error("You cannot trade this stock"); }

    const portfolio = await getOrCreatePortfolio(leagueMemberId);
    if (!portfolio) return;
    const shares = isShares ? stockAmt : stockAmt / vwap;
    const totalCost = shares * vwap;
    if (portfolio.current_balance < totalCost) { setError("Insufficient balance"); return; }

    const { data: holding, error: holdingErr } = await supabase
      .from("holdings").select("*").eq("league_member_id", leagueMemberId).eq("ticker", symbol).single();

    if (holding && !holdingErr) {
      const newAmount = holding.stock_amount + shares;
      const newUnitCost = (holding.stock_amount * holding.stock_unit_cost + shares * vwap) / newAmount;
      await supabase.from("holdings")
        .update({ stock_amount: newAmount, stock_unit_cost: newUnitCost })
        .eq("league_member_id", leagueMemberId).eq("ticker", symbol);
    } else {
      await supabase.from("holdings").insert({
        league_member_id: leagueMemberId, ticker: symbol, stock_amount: shares, stock_unit_cost: vwap,
      });
    }
    await supabase.from("portfolios")
      .update({ current_balance: portfolio.current_balance - totalCost })
      .eq("league_member_id", leagueMemberId);
  };

  const handleSubmit = async (e) => {
    setError(null);
    setTxSuccess('');
    e.preventDefault();
    if (!stockAmt) { setError("Must enter a non-zero stock amount!"); return; }
    const { result, error } = await fetchStockInfo(e);
    if (error) { setError("Transaction cancelled — fix stock error first."); return; }
    const vwap = result.price_data.vwap;
    const key = { leagueMemberId, symbol, stockAmt, vwap, isShares, setError };
    if (isBuy) await handleBuy(key);
    else await handleSell(key);
    if (!error) setTxSuccess(`${isBuy ? 'BUY' : 'SELL'} order executed for ${symbol}.`);
  };

  return (
    <div className="p-6 space-y-5">
      <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">// Trade Execution</p>

      {/* Ticker row */}
      <div className="bg-black border border-zinc-800 rounded p-4 space-y-3">
        <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Instrument</p>
        <div className="flex gap-3 items-start flex-wrap">
          <input
            type="text"
            placeholder="AAPL"
            className="bg-transparent border border-zinc-700 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-zinc-700 w-32 uppercase"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") fetchStockInfo(e); }}
          />
          <button
            onClick={fetchStockInfo}
            className="border border-zinc-600 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 font-mono text-xs px-4 py-2 rounded tracking-widest uppercase transition-all duration-200"
          >
            QUOTE
          </button>

          {loading && <span className="text-zinc-600 font-mono text-xs self-center">FETCHING...</span>}
          {stockError && !loading && (
            <span className="text-red-400 font-mono text-xs self-center">ERR: {stockError}</span>
          )}
          {result?.price_data && !loading && (
            <div className="flex gap-4 font-mono text-sm self-center">
              <span className="text-emerald-400 font-bold">${result.price_data.vwap}</span>
              <span className="text-zinc-600 text-xs self-center">
                {new Date(result.price_data.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Order config */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-black border border-zinc-800 rounded p-4 space-y-2">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Direction</p>
          <div className="flex gap-2">
            <ToggleButton label="BUY" active={isBuy} onClick={(e) => { e.preventDefault(); setIsBuy(true); }} />
            <ToggleButton label="SELL" active={!isBuy} onClick={(e) => { e.preventDefault(); setIsBuy(false); }} />
          </div>
        </div>

        <div className="bg-black border border-zinc-800 rounded p-4 space-y-2">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Units</p>
          <div className="flex gap-2">
            <ToggleButton label="SHARES" active={isShares} onClick={(e) => { e.preventDefault(); setIsShares(true); }} />
            <ToggleButton label="DOLLARS" active={!isShares} onClick={(e) => { e.preventDefault(); setIsShares(false); }} />
          </div>
        </div>

        <div className="bg-black border border-zinc-800 rounded p-4 space-y-2">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
            Amount ({isShares ? 'shares' : 'USD'})
          </p>
          <input
            type="number"
            placeholder={isShares ? "0.00" : "$0.00"}
            className="w-full bg-transparent border border-zinc-700 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
            value={stockAmt}
            onChange={(e) => { let v = Number(e.target.value); setStockAmt(v === 0 ? "" : v); }}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 items-center">
        <button
          onClick={handleSubmit}
          className={`border font-mono text-xs px-8 py-2.5 rounded tracking-widest uppercase transition-all duration-200 ${
            isBuy
              ? 'border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black'
              : 'border-red-500 text-red-400 hover:bg-red-500 hover:text-white'
          }`}
        >
          {isBuy ? 'EXECUTE BUY' : 'EXECUTE SELL'}
        </button>
        {txSuccess && <span className="text-emerald-400 font-mono text-xs">✓ {txSuccess}</span>}
        {error && <span className="text-red-400 font-mono text-xs">ERR: {error}</span>}
      </div>
    </div>
  );
};

export default BuySellStock;
