export default function AppHeader({ rightContent }) {
  return (
    <header className="relative z-20 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        <span className="font-mono font-black text-white tracking-tight text-lg">
          FANTASY<span className="text-emerald-400">STOCKS</span>
        </span>
        {rightContent && <div className="flex items-center gap-4 min-w-0">{rightContent}</div>}
      </div>
    </header>
  );
}
