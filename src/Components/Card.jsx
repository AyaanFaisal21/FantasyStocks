export default function Card({ children, title }) {
  return (
    <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden accent-top glow-border">
      {title && (
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-green" />
          <h2 className="text-xs font-mono text-zinc-400 tracking-widest uppercase">{title}</h2>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
