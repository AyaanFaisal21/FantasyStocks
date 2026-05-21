import { supabase } from "../supabaseClient";
import { useState } from 'react';

const LeagueCreation = ({ userId, onEdit }) => {
  const [leagueName, setLeagueName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const createLeague = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data, error: leagueError } = await supabase
        .from('leagues')
        .insert([{ name: leagueName, created_by: userId }])
        .select();
      if (leagueError) throw leagueError;
      if (!data || data.length === 0) throw new Error("Failed to create league or no data returned.");

      const { error: memberError } = await supabase
        .from('league_members')
        .insert([{ user_id: userId, league_id: data[0].league_id }]);
      if (memberError) throw memberError;

      setSuccess(`League "${leagueName}" created.`);
      setLeagueName("");
    } catch (err) {
      setError("An error occurred while creating the league.");
      console.error("Error creating league:", err);
    } finally {
      setLoading(false);
      onEdit();
    }
  };

  return (
    <form onSubmit={createLeague} className="space-y-3">
      <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase">Create New League</p>
      <input
        type="text"
        placeholder="League name..."
        value={leagueName}
        onChange={(e) => setLeagueName(e.target.value)}
        className="w-full bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs py-2 rounded tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
      >
        {loading ? 'CREATING...' : 'CREATE LEAGUE'}
      </button>
      {error && <p className="text-red-400 text-xs font-mono">ERR: {error}</p>}
      {success && <p className="text-emerald-400 text-xs font-mono">✓ {success}</p>}
    </form>
  );
};

export default LeagueCreation;
export { LeagueCreation };
