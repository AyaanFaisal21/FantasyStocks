import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { UserAuth } from "../context/AuthContext";
import { ChatContextProvider } from "../context/ChatContext.jsx";
import BuySellStock from "./Stocks/BuySellStock";
import Portfolio from "./Stocks/Portfolio";
import AddDropStock from "./AddDropStock";
import LeaderboardPage from "./LeaderboardPage";
import ChatWindow from "./ChatWindow";
import { generateMatchups } from "./matchups";
import MatchupPage from "./matchupPage";
import AppShell from "./AppShell.jsx";
import { API_BASE_URL } from "../apiConfig";

const tabs = ["Matchup", "Buy/Sell", "Portfolio", "Leaderboard", "Add/Drop", "Chat"];

const LeaguePage = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { session } = UserAuth();

  const [leagueName, setLeagueName] = useState("");
  const [leagueCode, setLeagueCode] = useState("");
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [newLeagueDisplayName, setNewLeagueDisplayName] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [matchupStatus, setMatchupStatus] = useState("");
  const [matchupLoading, setMatchupLoading] = useState(false);
  const [leagueMemberId, setLeagueMemberId] = useState(null);
  const [activeTab, setActiveTab] = useState(tabs[1]);

  const userId = session?.user?.id;
  const currentMember = members.find((member) => member.user_id === userId);
  const portfolioDisplayName = currentMember?.display_name || session?.user?.email || "Trader";

  useEffect(() => {
    const fetchLeagueData = async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("name, league_code")
        .eq("league_id", leagueId)
        .single();
      if (data) { setLeagueName(data.name); setLeagueCode(data.league_code); }
      if (error) console.error("Error fetching league data:", error);
    };

    const fetchLeagueMembers = async () => {
      const { data, error } = await supabase
        .from("league_members")
        .select("user_id, display_name")
        .eq("league_id", leagueId);
      if (error) { setError("Could not fetch members."); }
      else setMembers(data);
    };

    fetchLeagueData();
    fetchLeagueMembers();
  }, [leagueId]);

  useEffect(() => {
    const fetchLeagueMemberId = async () => {
      if (!userId || !leagueId) return;
      const { data, error } = await supabase
        .from("league_members")
        .select("league_member_id")
        .eq("user_id", userId)
        .eq("league_id", leagueId)
        .single();
      if (error) { setError("Could not fetch league member id."); return; }
      setLeagueMemberId(data.league_member_id);
    };
    fetchLeagueMemberId();
  }, [userId, leagueId]);

  const handleDisplayNameChange = async (e) => {
    e.preventDefault();
    setUpdateMessage("");
    const { error } = await supabase
      .from("league_members")
      .update({ display_name: newLeagueDisplayName })
      .eq("league_id", leagueId)
      .eq("user_id", userId);
    if (error) {
      setUpdateMessage("Failed to update display name.");
    } else {
      setUpdateMessage("Display name updated.");
      setNewLeagueDisplayName("");
      const { data } = await supabase
        .from("league_members").select("user_id, display_name").eq("league_id", leagueId);
      if (data) setMembers(data);
    }
  };

  const handleGenerateMatchups = () => {
    generateMatchups(leagueId, setMatchupStatus, setMatchupLoading);
  };

  const calculateMatchups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/run-matchups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error("Error calculating matchups:", error);
    }
  };

  return (
    <AppShell
      headerRight={
        <button
          onClick={() => navigate("/dashboard")}
          className="border border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 font-mono text-xs px-4 py-1.5 rounded tracking-widest transition-all duration-200"
        >
          ← DASHBOARD
        </button>
      }
    >

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* League header */}
        <div>
          <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase mb-1">// LEAGUE</p>
          <h1 className="text-2xl font-mono font-bold text-white uppercase">
            {leagueName || '...'}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-mono text-zinc-600">INVITE CODE:</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded px-2 py-0.5 tracking-widest">
              {leagueCode || '———'}
            </span>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs font-mono">ERR: {error}</p>}

        {/* Info row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Members */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 accent-top relative">
            <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-3">Roster</p>
            {members.length === 0 ? (
              <p className="text-zinc-700 font-mono text-xs">NO_MEMBERS</p>
            ) : (
              <ul className="space-y-1.5">
                {members.map((member, i) => (
                  <li key={member.user_id} className="flex items-center gap-2 font-mono text-sm">
                    <span className="text-zinc-700 text-xs">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-slate-300">{member.display_name || member.user_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Display name + matchup controls */}
          <div className="space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
              <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-3">League Display Name</p>
              <form onSubmit={handleDisplayNameChange} className="space-y-2">
                <input
                  type="text"
                  placeholder="New display name..."
                  value={newLeagueDisplayName}
                  onChange={(e) => setNewLeagueDisplayName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
                  required
                />
                <button
                  type="submit"
                  className="w-full border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs py-2 rounded tracking-widest uppercase transition-all duration-200"
                >
                  Update
                </button>
                {updateMessage && (
                  <p className={`text-xs font-mono ${updateMessage.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {updateMessage}
                  </p>
                )}
              </form>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
              <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-3">Matchup Controls</p>
              <button
                onClick={() => { handleGenerateMatchups(); calculateMatchups(); }}
                disabled={matchupLoading}
                className="w-full border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black font-mono text-xs py-2 rounded tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
              >
                {matchupLoading ? 'GENERATING...' : 'GENERATE MATCHUPS'}
              </button>
              {matchupStatus && (
                <p className="mt-2 text-xs font-mono text-zinc-500">{matchupStatus}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tab panel */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden accent-top relative">
          {/* Tab bar */}
          <div className="flex border-b border-zinc-800 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-5 py-3 text-xs font-mono tracking-widest uppercase transition-all duration-200 border-b-2 ${
                  activeTab === tab
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : 'border-transparent text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-0">
            {activeTab === tabs[0] && <MatchupPage leagueId={leagueId} />}
            {activeTab === tabs[1] && <BuySellStock leagueMemberId={leagueMemberId} />}
            {activeTab === tabs[2] && (
              <Portfolio
                leagueMemberId={leagueMemberId}
                leagueName={leagueName}
                displayName={portfolioDisplayName}
              />
            )}
            {activeTab === tabs[3] && <LeaderboardPage leagueId={leagueId} />}
            {activeTab === tabs[4] && (
              <AddDropStock leagueId={leagueId} userId={userId} leagueMemberId={leagueMemberId} members={members} />
            )}
            {activeTab === tabs[5] && (
              <ChatContextProvider leagueId={leagueId} userId={userId} members={members}>
                <ChatWindow />
              </ChatContextProvider>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default LeaguePage;
