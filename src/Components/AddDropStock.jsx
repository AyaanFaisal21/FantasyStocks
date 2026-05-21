import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { DraftContextProvider, useDraftContext } from "../context/DraftContext.jsx";
import { DraftState } from "../constants/draftState";
import Draft from "./Draft";
import { UserDisplayWrapper } from "./ActiveUsers.jsx";
import MakeAddDropAction from "./MakeAddDropAction.jsx";

const DefaultMessage = ({ leagueId, setDraftState }) => {
  const [error, setError] = useState("");
  const { activeMap, draftState } = useDraftContext();

  useEffect(() => {
    if (draftState !== null && draftState !== undefined) setDraftState(draftState);
  }, [draftState]);

  async function startDraft() {
    for (const present of activeMap.values()) {
      if (present === false) {
        alert("Everyone must be present before starting the draft!");
        return;
      }
    }
    const res = await fetch(`http://localhost:8000/draft/${leagueId}/start`, { method: "POST" });
    if (!res.ok) alert("Something went wrong");
    setDraftState(DraftState.IN_PROGRESS);
  }

  return (
    <UserDisplayWrapper contextCallback={useDraftContext}>
      <div className="space-y-4">
        <p className="text-zinc-400 font-mono text-sm">
          Draft has not started yet. All members must be present before you can begin.
        </p>
        <button
          onClick={startDraft}
          className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs px-6 py-2 rounded tracking-widest uppercase transition-all duration-200"
        >
          Start Draft
        </button>
        {error && <p className="text-red-400 font-mono text-xs">ERR: {error}</p>}
      </div>
    </UserDisplayWrapper>
  );
};

const AddDropStock = ({ leagueId, userId, leagueMemberId, members }) => {
  const [draftState, setDraftState] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDraftState = async () => {
      const { data, error } = await supabase
        .from("leagues").select("draft_state").eq("league_id", leagueId).single();
      if (error) setError(error);
      else setDraftState(data.draft_state);
    };
    fetchDraftState();
  }, [leagueId]);

  return (
    <div className="p-6 space-y-4">
      <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">// Add / Drop</p>

      {draftState && draftState !== DraftState.COMPLETED && (
        <DraftContextProvider leagueId={leagueId} userId={userId} leagueMemberId={leagueMemberId} members={members}>
          {draftState === DraftState.NOT_STARTED && (
            <DefaultMessage leagueId={leagueId} setDraftState={setDraftState} />
          )}
          {draftState === DraftState.IN_PROGRESS && (
            <Draft leagueId={leagueId} leagueMemberId={leagueMemberId} setDraftState={setDraftState} />
          )}
        </DraftContextProvider>
      )}

      {draftState === DraftState.COMPLETED && (
        <MakeAddDropAction leagueId={leagueId} leagueMemberId={leagueMemberId} />
      )}

      {/* Dev utility */}
      <div className="pt-4 border-t border-zinc-900">
        <button
          onClick={async () => {
            await supabase.from("leagues").update({ draft_state: DraftState.NOT_STARTED }).eq("league_id", leagueId);
            setDraftState(DraftState.NOT_STARTED);
          }}
          className="border border-zinc-700 text-zinc-600 hover:border-red-900 hover:text-red-600 font-mono text-xs px-4 py-1.5 rounded tracking-widest uppercase transition-all duration-200"
        >
          DEV: Reset Draft State
        </button>
      </div>
    </div>
  );
};

export default AddDropStock;
