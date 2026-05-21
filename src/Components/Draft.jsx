import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { DraftState } from "../constants/draftState";
import { useDraftContext } from "../context/DraftContext";
import { UserDisplayWrapper } from "./ActiveUsers";

import MakeAddDropAction from "./MakeAddDropAction";

const ActionWrapper = ({ leagueId, leagueMemberId, callBack = null }) => {
  return (
    <div className="border border-emerald-500/30 rounded-lg p-4 mt-4">
      <MakeAddDropAction leagueId={leagueId} leagueMemberId={leagueMemberId} callBack={callBack} />
    </div>
  );
};

const Timer = ({ deadline }) => {
  const [remaining, setRemaining] = useState(() => deadline - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(deadline - Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, [deadline]);

  if (remaining <= 0) return <span>00:00</span>;

  const minutes = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  return <span>{minutes}:{seconds}</span>;
};


export default function Draft({leagueId, leagueMemberId, setDraftState}) { 

    const {userId, roundNum, deadline, activeMap, currentTurnUser, notifyDraftPick, draftState} = useDraftContext();

    useEffect(() => {
        if (draftState !== null && draftState !== undefined) {  
            setDraftState(draftState);
        }
    }, [draftState])

    const getUserColor = (user_id) => {
      if (currentTurnUser && user_id === currentTurnUser && activeMap.get(String(user_id)))
        return "text-cyan-400";
      if (activeMap.get(String(user_id))) return "text-emerald-400";
      return "text-zinc-700";
    };

    return (
      <UserDisplayWrapper contextCallback={useDraftContext} getUserColor={getUserColor}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-green" />
            <p className="text-cyan-400 font-mono text-sm font-bold tracking-widest uppercase">DRAFT IN PROGRESS</p>
          </div>

          {roundNum && deadline && (
            <div className="flex items-center gap-4 font-mono text-sm">
              <span className="text-zinc-500">ROUND</span>
              <span className="text-white font-bold">{roundNum}</span>
              <span className="text-zinc-500 ml-4">TIME</span>
              <span className="text-red-400 font-bold tabular-nums">
                <Timer deadline={Date.parse(deadline)} />
              </span>
            </div>
          )}

          {userId !== currentTurnUser ? (
            <p className="text-zinc-500 font-mono text-xs">Waiting for current player to pick...</p>
          ) : (
            <>
              <p className="text-emerald-400 font-mono text-sm font-bold">YOUR TURN — make your pick!</p>
              <ActionWrapper leagueId={leagueId} leagueMemberId={leagueMemberId} callBack={notifyDraftPick} />
            </>
          )}
        </div>
      </UserDisplayWrapper>
    );
}