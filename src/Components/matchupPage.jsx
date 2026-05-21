import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

function useQueryParamWeek() {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  return useMemo(() => {
    try {
      const u = new URLSearchParams(search);
      const w = u.get('week');
      return w ? parseInt(w, 10) : null;
    } catch { return null; }
  }, [search]);
}

export default function MatchupPage({ leagueId = null }) {
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [matchups, setMatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [error, setError] = useState(null);
  const urlWeek = useQueryParamWeek();

  useEffect(() => {
    let isMounted = true;
    const fetchWeeksAndChooseCurrent = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase.from('matchups')
          .select('id, week, league_id, user1_id, user2_id, u1_score, u2_score')
          .order('id', { ascending: true });
        if (leagueId) query = query.eq('league_id', leagueId);
        const { data: allRows, error: weeksErr } = await query;
        if (weeksErr) throw weeksErr;
        const distinctWeeks = [...new Set((allRows || []).map(r => r.week))].filter(Number.isInteger);
        if (isMounted) setWeeks(distinctWeeks);
        let chosenWeek = null;
        if (urlWeek && distinctWeeks.includes(urlWeek)) chosenWeek = urlWeek;
        else {
          const weekWithNull = distinctWeeks.find(w => allRows.some(r => r.week === w && (r.u1_score === null || r.u2_score === null)));
          chosenWeek = weekWithNull ?? (distinctWeeks.length > 0 ? Math.max(...distinctWeeks) : null);
        }
        if (isMounted) setCurrentWeek(chosenWeek ?? null);
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load weeks');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchWeeksAndChooseCurrent();
    return () => { isMounted = false; };
  }, [leagueId, urlWeek]);

  useEffect(() => {
    if (currentWeek == null) return;
    let isMounted = true;
    const fetchMatchupsAndPortfolioValues = async () => {
      setWeekLoading(true);
      setError(null);
      try {
        let q = supabase.from('matchups')
          .select('id, league_id, week, user1_id, user2_id')
          .eq('week', currentWeek).order('id', { ascending: true });
        if (leagueId) q = q.eq('league_id', leagueId);
        const { data: matchData, error: matchErr } = await q;
        if (matchErr) throw matchErr;

        const allUserIds = Array.from(new Set(matchData.flatMap(m => [m.user1_id, m.user2_id])));

        // Fetch display names alongside portfolio + holdings data
        const [
          { data: portfolioData, error: portErr },
          { data: holdingsData, error: holdErr },
          { data: memberData },
        ] = await Promise.all([
          supabase.from('portfolios').select('league_member_id, start_of_week_total, current_balance').in('league_member_id', allUserIds),
          supabase.from('holdings').select('league_member_id, ticker, stock_amount').in('league_member_id', allUserIds),
          supabase.from('league_members').select('league_member_id, display_name').in('league_member_id', allUserIds),
        ]);
        if (portErr) throw portErr;
        if (holdErr) throw holdErr;

        const nameById = Object.fromEntries(
          (memberData || []).map(m => [m.league_member_id, m.display_name || `User ${m.league_member_id.slice(0,6)}`])
        );

        const uniqueTickers = [...new Set((holdingsData || []).map(h => h.ticker))];
        const { data: pricesData, error: priceErr } = uniqueTickers.length > 0
          ? await supabase.from('stock_prices').select('symbol, close, timestamp').in('symbol', uniqueTickers).order('timestamp', { ascending: false })
          : { data: [] };
        if (priceErr) throw priceErr;

        const latestPrices = {};
        for (const row of pricesData || []) {
          if (!(row.symbol in latestPrices)) latestPrices[row.symbol] = row.close;
        }

        const portfoliosById = Object.fromEntries((portfolioData || []).map(p => [p.league_member_id, p]));
        const userEffectiveBalances = {};
        for (const userId of allUserIds) {
          const port = portfoliosById[userId];
          if (!port) continue;
          const holdings = (holdingsData || []).filter(h => h.league_member_id === userId);
          const holdingValue = holdings.reduce((sum, h) => sum + h.stock_amount * (latestPrices[h.ticker] ?? 0), 0);
          userEffectiveBalances[userId] = {
            percent: port.start_of_week_total > 0
              ? ((port.current_balance + holdingValue - port.start_of_week_total) / port.start_of_week_total) * 100
              : 0,
          };
        }

        const enrichedMatchups = matchData.map(m => ({
          ...m,
          u1_name: nameById[m.user1_id] ?? '—',
          u2_name: nameById[m.user2_id] ?? '—',
          u1_score: userEffectiveBalances[m.user1_id]?.percent.toFixed(2) ?? '',
          u2_score: userEffectiveBalances[m.user2_id]?.percent.toFixed(2) ?? '',
        }));
        if (isMounted) setMatchups(enrichedMatchups);
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load matchups');
      } finally {
        if (isMounted) setWeekLoading(false);
      }
    };
    fetchMatchupsAndPortfolioValues();
    return () => { isMounted = false; };
  }, [currentWeek, leagueId]);

  const scoreColor = (s) => parseFloat(s) < 0 ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">// Matchups</p>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-zinc-600">WEEK:</span>
          <select
            value={currentWeek ?? ''}
            onChange={(e) => setCurrentWeek(parseInt(e.target.value, 10))}
            className="bg-black border border-zinc-700 text-emerald-400 px-2 py-1 rounded outline-none font-mono text-xs"
          >
            <option value="" disabled>SELECT</option>
            {weeks.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          {currentWeek && (
            <span className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
              WK {currentWeek}
            </span>
          )}
        </div>
      </div>

      {loading && <p className="text-zinc-600 font-mono text-xs">LOADING WEEKS...</p>}
      {error && <p className="text-red-400 font-mono text-xs">ERR: {error}</p>}
      {!loading && currentWeek == null && (
        <p className="text-zinc-600 font-mono text-xs text-center py-8">NO_MATCHUPS — generate matchups first.</p>
      )}
      {weekLoading && <p className="text-zinc-600 font-mono text-xs">LOADING MATCHUPS...</p>}

      {!loading && !weekLoading && matchups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchups.map((m) => {
            const s1 = parseFloat(m.u1_score);
            const s2 = parseFloat(m.u2_score);
            const u1Wins = s1 > s2;
            const u2Wins = s2 > s1;
            const tied = s1 === s2;
            const diff = Math.abs(s1 - s2).toFixed(2);
            const hasScores = m.u1_score !== '' && m.u2_score !== '';

            return (
              <div key={m.id} className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-zinc-950">
                  <span className="text-zinc-600 font-mono text-xs">MATCHUP</span>
                  <span className="text-zinc-700 font-mono text-xs">WK {currentWeek}</span>
                </div>

                {/* Scorecard */}
                <div className="flex items-stretch">
                  {/* Player 1 */}
                  <div className={`flex-1 p-5 text-left border-r border-zinc-900 ${u1Wins ? 'bg-emerald-950/10' : ''}`}>
                    <p className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-widest truncate">{m.u1_name}</p>
                    <p className={`font-mono text-3xl font-black ${m.u1_score !== '' ? scoreColor(m.u1_score) : 'text-zinc-700'} ${!u1Wins && hasScores ? 'opacity-40' : ''}`}>
                      {m.u1_score !== '' ? `${s1 >= 0 ? '+' : ''}${m.u1_score}%` : '—'}
                    </p>
                    {u1Wins && hasScores && (
                      <p className="text-emerald-500 font-mono text-xs mt-1 font-bold">▲ LEADING</p>
                    )}
                  </div>

                  {/* VS divider */}
                  <div className="flex flex-col items-center justify-center px-4 shrink-0">
                    <span className="text-zinc-700 font-mono text-xs font-bold">VS</span>
                  </div>

                  {/* Player 2 */}
                  <div className={`flex-1 p-5 text-right border-l border-zinc-900 ${u2Wins ? 'bg-emerald-950/10' : ''}`}>
                    <p className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-widest truncate">{m.u2_name}</p>
                    <p className={`font-mono text-3xl font-black ${m.u2_score !== '' ? scoreColor(m.u2_score) : 'text-zinc-700'} ${!u2Wins && hasScores ? 'opacity-40' : ''}`}>
                      {m.u2_score !== '' ? `${s2 >= 0 ? '+' : ''}${m.u2_score}%` : '—'}
                    </p>
                    {u2Wins && hasScores && (
                      <p className="text-emerald-500 font-mono text-xs mt-1 font-bold">▲ LEADING</p>
                    )}
                  </div>
                </div>

                {/* Bottom spread bar */}
                {hasScores && (
                  <div className={`px-4 py-2.5 border-t border-zinc-900 ${tied ? 'bg-zinc-900/30' : u1Wins ? 'bg-emerald-950/20' : 'bg-red-950/10'}`}>
                    <p className={`font-mono text-xs text-center font-bold ${tied ? 'text-zinc-500' : u1Wins ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tied ? 'TIED' : `${u1Wins ? m.u1_name : m.u2_name} leads by +${diff}%`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !weekLoading && currentWeek != null && matchups.length === 0 && (
        <p className="text-zinc-600 font-mono text-xs text-center py-6">No matchups for week {currentWeek}.</p>
      )}
    </div>
  );
}
