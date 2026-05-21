import { useEffect, useState } from 'react';
import { UserAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LeagueCreation } from './LeagueCreation';
import JoinLeague from './JoinLeague.jsx';
import DisplayLeagues from './DisplayLeagues.jsx';
import Card from './Card.jsx';
import AppShell from './AppShell.jsx';
import MarketStatus from './MarketStatus.jsx';

const Dashboard = () => {
  const { session, signOut } = UserAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((prev) => (prev + 1) % 2);

  useEffect(() => {
    const fetchDisplayName = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', session.user.id)
          .single();
        if (error) {
          setError('Failed to load display name.');
        } else {
          setDisplayName(data.display_name);
        }
        setLoading(false);
      }
    };
    fetchDisplayName();
  }, [session]);

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell
      headerRight={
        <>
          <span className="text-xs font-mono text-zinc-500 hidden sm:block">
            {session?.user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-red-400 font-mono text-xs px-4 py-1.5 rounded tracking-widest transition-all duration-200"
          >
            SIGN_OUT
          </button>
        </>
      }
    >

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Welcome header */}
        <div className="mb-8">
          <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase mb-1">
            // DASHBOARD
          </p>
          {loading ? (
            <h2 className="text-2xl font-mono text-zinc-500 cursor-blink">LOADING</h2>
          ) : error ? (
            <p className="text-red-400 text-sm font-mono">ERR: {error}</p>
          ) : (
            <h2 className="text-2xl font-mono font-bold text-white">
              WELCOME,{' '}
              <span className="text-emerald-400">{displayName?.toUpperCase() || 'TRADER'}</span>
            </h2>
          )}
          <p className="text-zinc-600 text-xs font-mono mt-1">
            Manage leagues · Track positions · Dominate the market.
          </p>
        </div>

        {/* Status bar */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <MarketStatus />
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-4 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-xs font-mono text-zinc-400">SESSION ACTIVE</span>
          </div>
        </div>

        {/* Main panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="My Leagues">
            <DisplayLeagues userId={session?.user?.id} refreshKey={refreshKey} />
          </Card>

          <Card title="League Management">
            <LeagueCreation userId={session?.user?.id} onEdit={refresh} />
            <div className="my-5 border-t border-zinc-800" />
            <JoinLeague userId={session?.user?.id} onEdit={refresh} />
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
