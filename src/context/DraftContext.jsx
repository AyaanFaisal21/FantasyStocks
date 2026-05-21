import {createContext, useContext, useCallback, useState, useEffect, useRef, useMemo} from "react";
import { DraftState } from "../constants/draftState";

export const DraftContext = createContext(null);

export function useDraftContext() { 
    const c = useContext(DraftContext);
    if (!c) throw new Error("useDraftContext must be used within <DraftContextProvider />");
    return c; 
}

export function DraftContextProvider({leagueId, userId, members, children}) {
    
    const [allUsers, setAllUsers] = useState([]);
    const [activeMap, setActiveMap] = useState(() => new Map());
    const [currentTurnUser, setCurrentTurnUser] = useState(null);
    const [draftState, setDraftState] = useState(null);
    const [roundNum, setRoundNum] = useState(1);
    const [deadline, setDeadline] = useState(null);
    const wsRef = useRef(null);

    const pendingRef = useRef([]);

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/draft/ws/${leagueId}/${userId}`)
        wsRef.current = ws; 
        
        const onMessage = (event) => { 
            try { 
                let data = JSON.parse(event.data);

                console.log(data);

                switch (data.type) { 
                    case "state": { 
                        const set = new Set(data.activeUsers ?? []);
                        const map = new Map();
                        (data.allUsers ?? []).forEach(u => map.set(u, set.has(u)));
                        setAllUsers(data.allUsers ?? []); // This is kinda silly but I didn't know we had members until it was too late...
                        setActiveMap(map);
                        break;
                    }

                    case "presence.leave": { 
                        setActiveMap(prev => { 
                            const newMap = new Map(prev);
                            newMap.set(data.userId, false);
                            return newMap; 
                        });
                        break;
                    }
                    
                    case "presence.join": { 
                        setActiveMap(prev => { 
                            const newMap = new Map(prev);
                            newMap.set(data.userId, true);
                            return newMap; 
                        });
                        break;
                    }

                    case "draft.stateChange": { 
                        setDraftState(data.draftState);
                        break;
                    }

                    case "draft.info" : 
                    case "draft.turnStart" : { 
                        setRoundNum(data.roundNum);
                        setCurrentTurnUser(data.currentUserId);
                        setDeadline(data.deadline);
                        setDraftState(data.draftState);
                        break;
                    }

                    case "draft.turnEnd" : { 
                        console.log("TURN END")
                    }

                }
            } catch (error) {
                alert("Error Occured: " + error);
                alert("Data: " + event.data);
                return;
            }
        };

        ws.addEventListener("message", onMessage);

        ws.onclose = () => console.log("ws closed");

        return () => {
            ws.removeEventListener("message", onMessage);
            try {
                ws.close();
            } catch (error) {
                console.warn("Failed to close draft websocket", error);
            }
            wsRef.current = null;
        };

    }, [leagueId, userId]);

    useEffect(() => { 
        const ws = wsRef.current; 
        if (!ws) return; 

        const flush = () => { 
            while (ws.readyState === WebSocket.OPEN && pendingRef.current.length) { 
                ws.send(pendingRef.current.shift());
            }
        };
        
        ws.addEventListener("open", flush);
        return () => ws.removeEventListener("open", flush);

    }, [leagueId, userId]);

    const notifyDraftPick = useCallback(() => { 
        const ws = wsRef.current; 
        let text = JSON.stringify({"type" : "draft.picked"});
        if (ws && ws.readyState === WebSocket.OPEN) { 
            ws.send(text);
        } else { 
            pendingRef.current.push(text);
        }
    }, []);

    const draftContextValue = useMemo(() => 
        ({userId, allUsers, activeMap, members, currentTurnUser, draftState, roundNum, deadline, notifyDraftPick}), 
        [userId, allUsers, activeMap, members, currentTurnUser, draftState, roundNum, deadline, notifyDraftPick]
    );

    return (
        <DraftContext.Provider value = {draftContextValue}>
            {children}
        </DraftContext.Provider>
    );
}
