import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const RANK_CONFIG = [
  { bg: "bg-yellow-500/10", border: "border-yellow-500/30", badge: "text-yellow-400", label: "#1" },
  { bg: "bg-slate-500/10",  border: "border-slate-500/30",  badge: "text-slate-300",  label: "#2" },
  { bg: "bg-amber-700/10",  border: "border-amber-700/30",  badge: "text-amber-600",  label: "#3" },
];

function WinRateBar({ rate }) {
  const color = rate === 0 ? "bg-red-500/60" : rate >= 66 ? "bg-emerald-500/70" : "bg-emerald-500/40";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2.5 bg-zinc-900 rounded-sm overflow-hidden">
        <div className={`h-full rounded-sm ${color} transition-all duration-700`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`font-mono text-xs font-bold w-12 text-right shrink-0 ${rate === 0 ? "text-red-400" : "text-emerald-400"}`}>
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

const LeaderboardPage = ({ leagueId }) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      const { data: members, error: memberError } = await supabase
        .from("league_members")
        .select("league_member_id, display_name")
        .eq("league_id", leagueId);
      if (memberError || !members?.length) { setLoading(false); return; }

      const idToName = Object.fromEntries(
        members.map((m) => [m.league_member_id, m.display_name || `User ${m.league_member_id.slice(0, 6)}`])
      );
      const leagueMemberIds = members.map((m) => m.league_member_id);

      const { data: matchups, error: matchupError } = await supabase
        .from("matchups").select("user1_id, user2_id, winner_id").eq("league_id", leagueId);
      if (matchupError || !matchups?.length) { setLoading(false); return; }

      // Also fetch portfolio values for current balance column
      const { data: portfolios } = await supabase
        .from("portfolios")
        .select("league_member_id, current_balance, start_of_week_total")
        .in("league_member_id", leagueMemberIds);
      const portMap = Object.fromEntries((portfolios || []).map((p) => [p.league_member_id, p]));

      const playerStats = {};
      for (const m of matchups) {
        for (const pid of [m.user1_id, m.user2_id]) {
          if (!leagueMemberIds.includes(pid)) continue;
          if (!playerStats[pid]) playerStats[pid] = { wins: 0, total: 0 };
          playerStats[pid].total++;
        }
        if (m.winner_id && leagueMemberIds.includes(m.winner_id)) {
          if (!playerStats[m.winner_id]) playerStats[m.winner_id] = { wins: 0, total: 0 };
          playerStats[m.winner_id].wins++;
        }
      }

      const leaderboardData = Object.entries(playerStats)
        .map(([id, { wins, total }]) => {
          const port = portMap[id];
          const balance = port?.current_balance ?? null;
          const weekStart = port?.start_of_week_total ?? null;
          const ret = balance != null && weekStart > 0
            ? ((balance - weekStart) / weekStart) * 100 : null;
          return {
            id, name: idToName[id] ?? id, wins, total,
            winRate: total > 0 ? (wins / total) * 100 : 0,
            balance, ret,
          };
        })
        .sort((a, b) => b.winRate - a.winRate || (b.ret ?? -999) - (a.ret ?? -999));

      setStats(leaderboardData);
      setLoading(false);
    };
    fetchLeaderboard();
  }, [leagueId]);

  if (loading) return (
    <div className="p-6"><p className="text-zinc-600 font-mono text-xs">LOADING LEADERBOARD...</p></div>
  );

  if (stats.length === 0) return (
    <div className="p-6 text-center">
      <p className="text-zinc-600 font-mono text-xs py-8">
        NO_MATCHUP_DATA — generate matchups to populate the leaderboard.
      </p>
    </div>
  );

  const top3 = stats.slice(0, 3);

  return (
    <div className="p-6 space-y-5">
      <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">// Leaderboard</p>

      {/* ── Top 3 podium cards (matches landing leaderboard panel) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top3.map((s, i) => {
          const cfg = RANK_CONFIG[i];
          return (
            <div key={s.id} className={`relative border rounded-lg p-4 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`font-mono text-2xl font-black ${cfg.badge}`}>{cfg.label}</span>
                <span className={`font-mono text-xs font-bold ${s.winRate === 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {s.winRate.toFixed(0)}% WIN
                </span>
              </div>
              <p className="font-mono text-sm text-slate-200 font-bold truncate">{s.name}</p>
              <p className="font-mono text-xs text-zinc-600 mt-0.5">{s.wins}W – {s.total - s.wins}L</p>
              {s.ret != null && (
                <p className={`font-mono text-xs mt-2 font-bold ${s.ret >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {s.ret >= 0 ? "▲" : "▼"} {Math.abs(s.ret).toFixed(2)}% this week
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Full standings table (matches landing leaderboard table panel) ── */}
      <div className="border border-zinc-800 rounded overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-900 bg-zinc-950">
          <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">Full Standings</p>
          <p className="text-xs font-mono text-zinc-700">{stats.length} players</p>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-zinc-950/50 border-b border-zinc-900 text-xs font-mono text-zinc-600 tracking-widest uppercase">
          <span className="col-span-1">RK</span>
          <span className="col-span-3">Player</span>
          <span className="col-span-1 text-center">W</span>
          <span className="col-span-1 text-center">L</span>
          <span className="col-span-4">Win Rate</span>
          <span className="col-span-2 text-right">Wk Ret</span>
        </div>

        {stats.map((s, i) => {
          const cfg = i < 3 ? RANK_CONFIG[i] : null;
          return (
            <div
              key={s.id}
              className={`grid grid-cols-12 gap-2 items-center px-4 py-3 border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors ${i < 3 ? "bg-zinc-950/30" : ""}`}
            >
              <span className={`col-span-1 font-mono text-xs ${cfg ? cfg.badge : "text-zinc-600"}`}>
                #{i + 1}
              </span>
              <span className="col-span-3 font-mono text-sm text-slate-200 truncate font-medium">{s.name}</span>
              <span className="col-span-1 font-mono text-xs text-emerald-400 text-center">{s.wins}</span>
              <span className="col-span-1 font-mono text-xs text-red-400 text-center">{s.total - s.wins}</span>
              <div className="col-span-4"><WinRateBar rate={s.winRate} /></div>
              <span className={`col-span-2 font-mono text-xs text-right font-bold ${s.ret == null ? "text-zinc-600" : s.ret >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {s.ret != null ? `${s.ret >= 0 ? "+" : ""}${s.ret.toFixed(2)}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeaderboardPage;
