import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const DisplayLeagues = ({ userId, refreshKey }) => {
  const [count, setCount] = useState(null);
  const [error, setError] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data, count, error: countError } = await supabase
          .from('league_members')
          .select('league_id, leagues(name)', { count: 'exact' })
          .eq('user_id', userId);
        setCount(count);
        setError(countError);
        setLeagues(data || []);
        setIndex(0);
      } catch (err) {
        setError(err);
      }
    };
    fetchCount();
  }, [userId, refreshKey]);

  const nextInd = () => {
    if (leagues.length > 0) setIndex((index + 1) % count);
  };

  const goToLeague = () => {
    if (leagues.length > 0) navigate(`/league/${leagues[index]?.league_id}`);
  };

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
        <>
          <div className="bg-black border border-zinc-800 rounded p-4 hover:border-emerald-500/30 transition-colors">
            <p className="text-xs font-mono text-zinc-600 mb-1">ACTIVE LEAGUE</p>
            <button
              onClick={goToLeague}
              className="text-emerald-400 font-mono text-sm hover:text-emerald-300 transition-colors text-left w-full"
            >
              {leagues[index]?.leagues?.name?.toUpperCase() || 'UNNAMED_LEAGUE'} →
            </button>
            <p className="text-xs font-mono text-zinc-700 mt-1">
              {index + 1} / {count}
            </p>
          </div>

          {count > 1 && (
            <button
              onClick={nextInd}
              className="w-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 font-mono text-xs py-2 rounded tracking-widest transition-all duration-200"
            >
              NEXT LEAGUE ↓
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default DisplayLeagues;
