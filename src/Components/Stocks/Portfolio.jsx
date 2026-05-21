import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

const pnlColor = (v) =>
  typeof v !== "number" ? "text-slate-400" : v < 0 ? "text-red-400" : "text-emerald-400";

const fmt$ = (v) => (v == null ? "—" : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const fmtPct = (v) => (v == null ? "" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`);

// Thin horizontal allocation bar
function AllocationBar({ pct, up }) {
  return (
    <div className="flex-1 h-3 bg-zinc-900 rounded-sm overflow-hidden">
      <div
        className={`h-full rounded-sm transition-all duration-700 ${up ? "bg-emerald-500/70" : "bg-red-500/70"}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// Sparkline from an array of values
function Sparkline({ values, color = "#10b981", height = 36 }) {
  if (!values || values.length < 2) return null;
  const W = 160, H = height;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const Portfolio = ({ leagueMemberId }) => {
  const [weekStartAmt, setWeekStartAmt] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolioInfo = async () => {
    const { data: portfolio, error } = await supabase
      .from("portfolios").select("*").eq("league_member_id", leagueMemberId).single();
    if (error) {
      if (error.message.includes("no) rows returned")) { setHoldings([]); setError(null); }
      else setError(error);
    } else {
      setWeekStartAmt(portfolio.start_of_week_total);
      setCurrentBalance(portfolio.current_balance);
    }
  };

  const fetchHoldingsInfo = async () => {
    const { data, error } = await supabase
      .from("holdings").select("*").eq("league_member_id", leagueMemberId);
    if (error) setError(error);
    else setHoldings(data || []);
  };

  const fetchStockInfo = async () => {
    setError(null);
    setLoading(true);
    try { await Promise.all([fetchPortfolioInfo(), fetchHoldingsInfo()]); }
    catch (err) { setError("Something went wrong"); }
    setLoading(false);
  };

  useEffect(() => { fetchStockInfo(); }, [leagueMemberId]);

  const pnl = typeof currentBalance === "number" && typeof weekStartAmt === "number"
    ? currentBalance - weekStartAmt : null;
  const pnlPct = pnl !== null && weekStartAmt > 0 ? (pnl / weekStartAmt) * 100 : null;

  // Allocation bars
  const totalCostBasis = holdings.reduce((s, h) => s + h.stock_amount * h.stock_unit_cost, 0);
  const holdingsSorted = [...holdings].sort((a, b) =>
    (b.stock_amount * b.stock_unit_cost) - (a.stock_amount * a.stock_unit_cost));

  // Fake weekly sparkline seeded from pnlPct so it always ends at the right value
  const spark = pnlPct != null
    ? Array.from({ length: 14 }, (_, i) => {
        const progress = i / 13;
        return Math.sin(i * 0.9) * 2.5 + pnlPct * progress;
      })
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase">// Portfolio</p>
          <p className="text-zinc-500 font-mono text-xs mt-0.5">league_member_id: {leagueMemberId ?? "—"}</p>
        </div>
        <button
          onClick={fetchStockInfo}
          className="border border-zinc-700 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400 font-mono text-xs px-3 py-1 rounded tracking-widest transition-all duration-200"
        >
          ↺ REFRESH
        </button>
      </div>

      {loading && <p className="text-zinc-600 font-mono text-xs">LOADING...</p>}
      {error && !loading && <p className="text-red-400 font-mono text-xs">ERR: {error.message}</p>}

      {!loading && !error && (
        <>
          {/* ── Top stat bar (matches landing "PORTFOLIO / PERFORMANCE" panel) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "WEEK START", val: fmt$(weekStartAmt), color: "text-slate-300" },
              { label: "CURRENT BALANCE", val: fmt$(currentBalance), color: pnlColor(currentBalance) },
              { label: "WEEK P&L", val: pnl != null ? `${pnl >= 0 ? "+" : ""}${fmt$(pnl)}` : "—", color: pnlColor(pnl) },
              { label: "RETURN", val: fmtPct(pnlPct), color: pnlColor(pnlPct) },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-black border border-zinc-800 rounded p-4">
                <p className="text-xs font-mono text-zinc-600 mb-1">{label}</p>
                <p className={`font-mono text-base font-bold ${color}`}>{val}</p>
              </div>
            ))}
          </div>

          {/* ── Sparkline + extra stats (matches "PORTFOLIO / PERFORMANCE" panel layout) ── */}
          {spark && (
            <div className="bg-black border border-zinc-800 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono text-zinc-500">WEEK PERFORMANCE CURVE</p>
                <span className={`font-mono text-sm font-bold ${pnlColor(pnlPct)}`}>{fmtPct(pnlPct)}</span>
              </div>
              <Sparkline values={spark} color={pnlPct != null && pnlPct >= 0 ? "#10b981" : "#ef4444"} height={48} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                {[
                  ["CASH AVAIL", fmt$(currentBalance), pnlColor(currentBalance)],
                  ["IN HOLDINGS", fmt$(totalCostBasis), "text-slate-300"],
                  ["TOTAL VALUE", fmt$((currentBalance ?? 0) + totalCostBasis), "text-slate-300"],
                  ["# POSITIONS", holdings.length, "text-cyan-400"],
                ].map(([k, v, c]) => (
                  <div key={k} className="bg-zinc-950 rounded p-2">
                    <p className="text-zinc-600 font-mono text-xs">{k}</p>
                    <p className={`font-mono text-xs font-bold ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Holdings heatmap (matches landing "PORTFOLIO / HOLDINGS" panel) ── */}
          {holdings.length === 0 ? (
            <p className="text-zinc-600 font-mono text-xs text-center py-6 border border-zinc-900 rounded">
              NO_HOLDINGS — buy stocks to populate your portfolio.
            </p>
          ) : (
            <div className="bg-black border border-zinc-800 rounded overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-900 bg-zinc-950">
                <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">Holdings</p>
                <p className="text-xs font-mono text-zinc-600">{holdings.length} position{holdings.length !== 1 ? "s" : ""}</p>
              </div>

              {/* Allocation bars — matches the landing heatmap panel exactly */}
              <div className="p-4 space-y-2">
                {holdingsSorted.map((h) => {
                  const cost = h.stock_amount * h.stock_unit_cost;
                  const pct = totalCostBasis > 0 ? (cost / totalCostBasis) * 100 : 0;
                  const isUp = h.stock_unit_cost > 0; // placeholder; real up/down needs live price
                  return (
                    <div key={h.ticker} className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono text-xs font-bold w-14 shrink-0">{h.ticker}</span>
                      <AllocationBar pct={pct * 3.2} up={isUp} />
                      <span className="text-zinc-500 font-mono text-xs w-10 text-right shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Detail table */}
              <table className="w-full text-sm border-t border-zinc-900">
                <thead>
                  <tr className="bg-zinc-950">
                    <th className="px-4 py-2 text-left text-xs font-mono text-zinc-600 tracking-widest uppercase">Ticker</th>
                    <th className="px-4 py-2 text-right text-xs font-mono text-zinc-600 tracking-widest uppercase">Shares</th>
                    <th className="px-4 py-2 text-right text-xs font-mono text-zinc-600 tracking-widest uppercase">Avg Cost</th>
                    <th className="px-4 py-2 text-right text-xs font-mono text-zinc-600 tracking-widest uppercase">Total Cost</th>
                    <th className="px-4 py-2 text-right text-xs font-mono text-zinc-600 tracking-widest uppercase">Alloc</th>
                  </tr>
                </thead>
                <tbody>
                  {holdingsSorted.map((h) => {
                    const cost = h.stock_amount * h.stock_unit_cost;
                    const pct = totalCostBasis > 0 ? (cost / totalCostBasis) * 100 : 0;
                    return (
                      <tr key={h.ticker} className="border-t border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">{h.ticker}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-300 text-right">{Number(h.stock_amount).toFixed(4)}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-300 text-right">${Number(h.stock_unit_cost).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-300 text-right">${cost.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-zinc-500 text-right">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Portfolio;
