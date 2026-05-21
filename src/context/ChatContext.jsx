import {createContext, useContext, useState, useEffect, useRef, useMemo} from "react";
import { WS_BASE_URL } from "../apiConfig";

export const ChatContext = createContext(null);

export function useChatContext() { 
    const c = useContext(ChatContext);
    if (!c) throw new Error("useChatContext must be used within <chatContextProvider />");
    return c; 
}

export function ChatContextProvider({leagueId, userId, members, children}) {
    
    const [allUsers, setAllUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeMap, setActiveMap] = useState(() => new Map());
    const wsRef = useRef(null);

    const pendingRef = useRef([]);

    const nameById = useMemo(
        () => new Map(members.map((member) => [String(member.user_id), member.display_name ?? String(member.user_id)])),
        [members]
    );

    useEffect(() => {
        const ws = new WebSocket(`${WS_BASE_URL}/chat/ws/${leagueId}/${userId}`)
        wsRef.current = ws; 

        const onMessage = (event) => { 
            try { 
                let data = JSON.parse(event.data);

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

                    case "chat.message": { 
                        const name = nameById.get(String(data.userId));
                        setMessages((prev) => [...prev, `${name}: ${data.text}`]);
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
                console.warn("Failed to close chat websocket", error);
            }
            wsRef.current = null;
        };

    }, [leagueId, userId, nameById]);

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

    const sendChat = (text) => { 
        const ws = wsRef.current; 
        if (ws && ws.readyState === WebSocket.OPEN) { 
            ws.send(text);
        } else { 
            pendingRef.current.push(text);
        }
    }

    const chatContextValue = useMemo(() => ({allUsers, activeMap, messages, members, sendChat}), [allUsers, activeMap, messages, members]);

    return (
        <ChatContext.Provider value = {chatContextValue}>
            {children}
        </ChatContext.Provider>
    );
}
