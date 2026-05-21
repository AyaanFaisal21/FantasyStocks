export default function DeploymentConfigError({ missingKeys }) {
  return (
    <div className="min-h-screen bg-black text-slate-300 flex items-center justify-center px-4">
      <div className="max-w-lg border border-red-900 bg-zinc-950 rounded-lg p-6 font-mono">
        <p className="text-red-400 text-xs tracking-widest uppercase mb-3">Deployment configuration error</p>
        <h1 className="text-white text-xl font-bold mb-3">Fantasy Stocks cannot start.</h1>
        <p className="text-zinc-500 text-sm mb-4">
          The frontend is missing required Vercel environment variables.
        </p>
        <pre className="bg-black border border-zinc-800 rounded p-3 text-red-300 text-xs overflow-x-auto">
          {missingKeys.join('\n')}
        </pre>
      </div>
    </div>
  );
}
