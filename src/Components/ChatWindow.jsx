import { useState, useEffect, useRef } from "react";
import { useChatContext } from "../context/ChatContext";
import { UserDisplayWrapper } from "./ActiveUsers";

export default function ChatWindow() {
  const { messages, sendChat } = useChatContext();
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="p-6">
      <UserDisplayWrapper contextCallback={useChatContext}>
        <div className="space-y-3">
          <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">// League Chat</p>
          <div className="bg-black border border-zinc-800 rounded h-72 overflow-y-auto p-4 space-y-2 font-mono text-sm">
            {messages.length === 0 ? (
              <p className="text-zinc-700 text-xs">NO_MESSAGES — be the first to transmit.</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="text-slate-300 border-b border-zinc-900 pb-1.5">
                  <span className="text-emerald-500 text-xs mr-2">&gt;</span>
                  {m}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
              value={text}
              type="text"
              placeholder="Type a message..."
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendChat(text);
                  setText("");
                }
              }}
            />
            <button
              onClick={() => { sendChat(text); setText(""); }}
              className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs px-4 py-2 rounded tracking-widest uppercase transition-all duration-200"
            >
              SEND
            </button>
          </div>
        </div>
      </UserDisplayWrapper>
    </div>
  );
}
