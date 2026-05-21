import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const DisplayLeagues = ({ userId, refreshKey }) => {
  const [error, setError] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data, error: countError } = await supabase
          .from('league_members')
          .select('league_id, leagues(name)', { count: 'exact' })
          .eq('user_id', userId);
        setError(countError);
        setLeagues(data || []);
      } catch (err) {
        setError(err);
      }
    };
    fetchCount();
  }, [userId, refreshKey]);

  if (leagues.length === 0 && !error) {
    return (
      <div className="text-center py-6">
        <p className="text-zinc-600 font-mono text-xs">NO_LEAGUES_FOUND</p>
        <p className="text-zinc-700 font-mono text-xs mt-1">Create or join one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-red-400 text-xs font-mono">ERR: {error.message}</p>
      )}

      {leagues.length > 0 && (
        <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
          {leagues.map((league, index) => (
            <button
              key={league.league_id}
              onClick={() => navigate(`/league/${league.league_id}`)}
              className="w-full bg-black border border-zinc-800 rounded p-4 hover:border-emerald-500/40 hover:bg-emerald-950/10 transition-colors text-left"
            >
              <p className="text-xs font-mono text-zinc-600 mb-1">LEAGUE {String(index + 1).padStart(2, "0")}</p>
              <span className="text-emerald-400 font-mono text-sm">
                {league.leagues?.name?.toUpperCase() || 'UNNAMED_LEAGUE'} →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DisplayLeagues;
