import { supabase } from "../supabaseClient";
import { useState } from 'react';

const JoinLeague = ({ userId, onEdit }) => {
  const [leagueCode, setLeagueCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const HandleJoinLeague = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data: leagueId, error: leagueError } = await supabase
        .from('leagues')
        .select('league_id')
        .eq('league_code', leagueCode);

      const { count, error: countError } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('league_id', leagueId[0].league_id);
      if (countError) throw countError;
      if (count > 0) throw new Error("You are already a member of this league.");

      const { count: memberCount } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId[0].league_id);
      if (memberCount >= 10) throw new Error("League is full.");

      if (leagueError) throw leagueError;
      if (!leagueId || leagueId.length === 0) throw new Error("League not found.");

      const { error } = await supabase
        .from('league_members')
        .insert([{ user_id: userId, league_id: leagueId[0].league_id }]);
      if (error) throw error;

      setSuccess("Joined league successfully.");
      setLeagueCode("");
    } catch (err) {
      setError(err.message || "An error occurred while joining the league.");
    } finally {
      onEdit();
      setLoading(false);
    }
  };

  return (
    <form onSubmit={HandleJoinLeague} className="space-y-3">
      <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase">Join Existing League</p>
      <input
        type="text"
        placeholder="Enter league code..."
        value={leagueCode}
        onChange={(e) => setLeagueCode(e.target.value)}
        className="w-full bg-black border border-zinc-800 focus:border-cyan-500 text-cyan-400 font-mono px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black font-mono text-xs py-2 rounded tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
      >
        {loading ? 'JOINING...' : 'JOIN LEAGUE'}
      </button>
      {error && <p className="text-red-400 text-xs font-mono">ERR: {error}</p>}
      {success && <p className="text-emerald-400 text-xs font-mono">✓ {success}</p>}
    </form>
  );
};

export default JoinLeague;
