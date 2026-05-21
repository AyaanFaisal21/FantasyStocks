import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { API_BASE_URL } from "../apiConfig";

const MakeAddDropAction = ({leagueId, leagueMemberId, callBack = null}) => { 
  const [ticker, setTicker] = useState("");
  const [userStocks, setUserStocks] = useState([]);
  const [loading, setLoading] = useState(false);

  const work = callBack ?? (() => {});

  const fetchUserStocks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_stocks")
      .select("Ticker")
      .eq("league_member_id", leagueMemberId);

    if (error) {
      console.error("Error fetching user stocks:", error);
    } else {
      setUserStocks(data.map((stock) => stock.Ticker));
    }

    setLoading(false);
  };

  useEffect(() => {
    if (leagueMemberId) {
      fetchUserStocks();
    }
  }, [leagueMemberId]);

  const handleAddStock = async (ticker) => {


    setLoading(true);
    setUserStocks([]);

    try {
      const res = await fetch(`${API_BASE_URL}/add-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_member_id: leagueMemberId,
          league_id: leagueId, // from URL params
          ticker: ticker
        })
      });

      const data = await res.json();
      console.log(data);
    } catch (err) {
      console.error(err);
    } finally { 
      work();
      fetchUserStocks();
    }
  };

  async function removeStock(stock) {

    setLoading(true);
    setUserStocks([]);

    try {
      const res = await fetch(`${API_BASE_URL}/remove-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_member_id: leagueMemberId,
          league_id: leagueId, // from URL params
          ticker: stock
        })
      });

      const data = await res.json();
      console.log(data);
    } catch (err) {
      console.error(err);
    } finally { 
      fetchUserStocks();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">Tradable Stocks</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="AAPL"
          className="flex-1 bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
        />
        <button
          onClick={() => handleAddStock(ticker)}
          className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs px-4 py-2 rounded tracking-widest uppercase transition-all duration-200"
        >
          ADD
        </button>
      </div>

      {loading && <p className="text-zinc-600 font-mono text-xs">LOADING...</p>}

      {userStocks.length === 0 && !loading ? (
        <p className="text-zinc-700 font-mono text-xs">NO_STOCKS — add tickers above.</p>
      ) : (
        <div className="space-y-1.5">
          {userStocks.map((stock) => (
            <div key={stock} className="flex items-center justify-between bg-black border border-zinc-800 rounded px-4 py-2.5">
              <span className="font-mono text-emerald-400 text-sm font-bold">{stock}</span>
              <button
                onClick={() => removeStock(stock)}
                disabled={loading}
                className="border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400 font-mono text-xs px-3 py-1 rounded tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
              >
                REMOVE
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MakeAddDropAction;
