export function ActiveUsers({ contextCallback, getUserColor = null }) {
  const { members, activeMap } = contextCallback();

  const defaultGetUserColor = (user_id) =>
    activeMap.get(String(user_id)) ? 'text-emerald-400' : 'text-zinc-700';

  const colorFunc = getUserColor ?? defaultGetUserColor;

  return (
    <div className="space-y-1.5">
      {members.map((member) => (
        <div key={member.user_id} className={`flex items-center gap-2 font-mono text-xs ${colorFunc(member.user_id)}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            activeMap.get(String(member.user_id)) ? 'bg-emerald-400' : 'bg-zinc-700'
          }`} />
          {member.display_name || member.user_id}
        </div>
      ))}
    </div>
  );
}

export function UserDisplayWrapper({ contextCallback, getUserColor, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">{children}</div>
      <div className="w-36 flex-shrink-0 border-l border-zinc-800 pl-4">
        <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase mb-3">Members</p>
        <ActiveUsers contextCallback={contextCallback} getUserColor={getUserColor} />
      </div>
    </div>
  );
}
