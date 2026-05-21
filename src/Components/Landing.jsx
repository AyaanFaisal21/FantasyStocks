import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StockWave from './StockWave';
import { supabase } from '../supabaseClient';

// ─── Inline SVG chart components ─────────────────────────────────────────────

function CandlestickChart() {
  const candles = [
    { o: 62, h: 72, l: 55, c: 68 },
    { o: 68, h: 80, l: 65, c: 75 },
    { o: 75, h: 82, l: 70, c: 72 },
    { o: 72, h: 76, l: 58, c: 60 },
    { o: 60, h: 64, l: 45, c: 48 },
    { o: 48, h: 56, l: 44, c: 54 },
    { o: 54, h: 65, l: 51, c: 63 },
    { o: 63, h: 74, l: 60, c: 71 },
    { o: 71, h: 78, l: 65, c: 66 },
    { o: 66, h: 70, l: 55, c: 58 },
    { o: 58, h: 67, l: 54, c: 64 },
    { o: 64, h: 75, l: 62, c: 73 },
  ];
  const W = 220, H = 90, pad = 8;
  const cw = (W - pad * 2) / candles.length;
  const scale = (v) => H - pad - (v / 85) * (H - pad * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* Grid lines */}
      {[25, 50, 75].map(v => (
        <line key={v} x1={pad} x2={W - pad} y1={scale(v)} y2={scale(v)}
          stroke="#1f2937" strokeWidth="0.5" />
      ))}
      {candles.map((c, i) => {
        const x = pad + i * cw + cw * 0.15;
        const bw = cw * 0.7;
        const isUp = c.c >= c.o;
        const color = isUp ? '#10b981' : '#ef4444';
        const top = scale(Math.max(c.o, c.c));
        const bot = scale(Math.min(c.o, c.c));
        const bodyH = Math.max(1, bot - top);
        const mid = x + bw / 2;
        return (
          <g key={i}>
            <line x1={mid} y1={scale(c.h)} x2={mid} y2={scale(c.l)}
              stroke={color} strokeWidth="0.8" />
            <rect x={x} y={top} width={bw} height={bodyH}
              fill={color} opacity={isUp ? 0.85 : 0.9} />
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ colors = ['#10b981', '#f59e0b', '#ef4444'], noisy = false }) {
  const points = (seed, amp, freq, base) =>
    Array.from({ length: 30 }, (_, i) => {
      const noise = noisy ? (Math.sin(i * seed * 2.3) * 8 + Math.cos(i * 0.9) * 5) : 0;
      return base + Math.sin(i * freq + seed) * amp + noise;
    });

  const W = 220, H = 80;
  const toPath = (pts) => {
    const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
    const min = Math.min(...pts), max = Math.max(...pts);
    const ys = pts.map(p => H - 4 - ((p - min) / (max - min + 0.01)) * (H - 8));
    return xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  };

  const series = [
    points(1.2, 18, 0.35, 50),
    points(2.4, 12, 0.22, 40),
    points(0.8, 20, 0.45, 55),
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={0} x2={W} y1={H / 4 * i} y2={H / 4 * i}
          stroke="#111827" strokeWidth="0.5" />
      ))}
      {series.slice(0, colors.length).map((pts, i) => (
        <path key={i} d={toPath(pts)} fill="none" stroke={colors[i]}
          strokeWidth={i === 0 ? 1.5 : 1} opacity={i === 0 ? 1 : 0.6} />
      ))}
    </svg>
  );
}

function VolumeChart() {
  const bars = [22, 35, 18, 42, 55, 30, 25, 48, 38, 60, 45, 28, 52, 40, 33];
  const W = 220, H = 55;
  const bw = W / bars.length;
  const max = Math.max(...bars);
  const colors = [0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {bars.map((b, i) => (
        <rect key={i}
          x={i * bw + 1} y={H - (b / max) * H}
          width={bw - 2} height={(b / max) * H}
          fill={colors[i] ? '#f59e0b' : '#92400e'} opacity="0.8"
        />
      ))}
    </svg>
  );
}

function DataTable({ rows }) {
  return (
    <table className="w-full text-xs font-mono">
      <tbody>
        {rows.map(([sym, price, chg], i) => (
          <tr key={i} className="border-b border-zinc-900">
            <td className="py-0.5 pr-2 text-zinc-400">{sym}</td>
            <td className="py-0.5 pr-2 text-right text-slate-300">{price}</td>
            <td className={`py-0.5 text-right font-bold ${chg.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{chg}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Scrolling ticker strip ───────────────────────────────────────────────────

const TICKER_DATA = [
  { sym: 'AAPL', val: '187.32', chg: '+1.24%' },
  { sym: 'TSLA', val: '248.90', chg: '+3.87%' },
  { sym: 'GOOGL', val: '2814.45', chg: '-0.43%' },
  { sym: 'NVDA', val: '491.20', chg: '+5.12%' },
  { sym: 'MSFT', val: '338.11', chg: '+0.78%' },
  { sym: 'AMZN', val: '3411.00', chg: '-1.02%' },
  { sym: 'META', val: '482.55', chg: '+2.31%' },
  { sym: 'NFLX', val: '624.80', chg: '+0.95%' },
  { sym: 'AMD', val: '168.44', chg: '+4.20%' },
  { sym: 'BABA', val: '73.22', chg: '-2.18%' },
  { sym: 'SPY', val: '521.40', chg: '+0.42%' },
  { sym: 'QQQ', val: '449.33', chg: '-0.18%' },
];

function TickerTape() {
  return (
    <div className="bg-zinc-950 border-y border-zinc-800 overflow-hidden py-2 relative">
      <div className="flex animate-ticker whitespace-nowrap" style={{ animation: 'ticker 30s linear infinite' }}>
        {[...TICKER_DATA, ...TICKER_DATA].map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 mx-6 font-mono text-xs">
            <span className="text-zinc-500">{t.sym}</span>
            <span className="text-slate-300">{t.val}</span>
            <span className={t.chg.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>{t.chg}</span>
            <span className="text-zinc-800 ml-4">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Fake Bloomberg terminal panel ───────────────────────────────────────────

function TerminalPanel({ title, children, accentColor = '#10b981' }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
      {/* title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-black/40">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600" />
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <span className="text-zinc-600 font-mono text-xs">{title}</span>
        <span style={{ color: accentColor }} className="font-mono text-xs">● LIVE</span>
      </div>
      <div className="flex-1 p-3">{children}</div>
    </div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSignUpError('');
    setSignUpLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setSignUpLoading(false);
    if (error) {
      setSignUpError(error.message || 'An unexpected error occurred.');
    } else {
      setSignUpDone(true);
      setTimeout(() => navigate('/create-profile'), 1200);
    }
  };

  return (
    <div className="bg-black text-slate-300 min-h-screen">
      {/* ── FIXED NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="font-mono font-black text-lg tracking-tight">
            <span className="text-white">FAN</span><span className="text-emerald-400">TOK</span>
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => scrollTo('preview')}
              className="text-zinc-500 hover:text-zinc-200 font-mono text-xs px-3 py-1.5 rounded tracking-wider transition-colors uppercase"
            >
              Preview
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="text-zinc-500 hover:text-zinc-200 font-mono text-xs px-3 py-1.5 rounded tracking-wider transition-colors uppercase"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollTo('signup')}
              className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs px-4 py-1.5 rounded tracking-widest uppercase transition-all duration-200"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* wave canvas fills the entire hero */}
        <div className="absolute inset-0 z-0">
          <StockWave className="w-full h-full" />
        </div>

        {/* dark vignette overlay so text is legible */}
        <div className="absolute inset-0 z-10"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.85) 100%)' }} />

        {/* hero content */}
        <div className="relative z-20 text-center px-4 space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-black/60 border border-zinc-700 rounded-full px-4 py-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-green" />
            <span className="text-xs font-mono text-zinc-400 tracking-widest">MARKETS OPEN — LIVE DATA</span>
          </div>

          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter font-mono leading-none"
            style={{ textShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
            <span className="text-red-400">FAN</span><span className="text-emerald-400">TASY</span>
            <br />
            <span className="text-emerald-400">S</span><span className="text-red-400">TOCK</span><span className="text-emerald-400">S</span>
          </h1>

          <p className="text-zinc-400 font-mono text-sm sm:text-base tracking-wide max-w-lg mx-auto">
            Draft portfolios. Trade in real time. Dominate your league on a professional-grade trading platform.
          </p>

          {/* live metrics strip */}
          <div className="flex justify-center gap-4 flex-wrap font-mono text-xs">
            {[
              { label: 'S&P 500', val: '+0.42%', up: true },
              { label: 'NASDAQ', val: '-0.18%', up: false },
              { label: 'DJIA', val: '+0.31%', up: true },
              { label: 'VIX', val: '14.82', up: false },
            ].map(({ label, val, up }) => (
              <span key={label} className="flex items-center gap-1.5 bg-black/50 border border-zinc-800 rounded px-3 py-1">
                <span className="text-zinc-600">{label}</span>
                <span className={up ? 'text-emerald-400' : 'text-red-400'}>{val}</span>
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/signup')}
              className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs px-8 py-3 rounded tracking-widest uppercase transition-all duration-200"
              style={{ boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}
            >
              ENTER TERMINAL →
            </button>
            <button
              onClick={() => navigate('/signin')}
              className="border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 font-mono text-xs px-8 py-3 rounded tracking-widest uppercase transition-all duration-200"
            >
              SIGN IN
            </button>
          </div>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 z-20 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs font-mono text-zinc-500 tracking-widest">SCROLL</span>
          <div className="w-px h-8 bg-gradient-to-b from-zinc-500 to-transparent" />
        </div>
      </section>

      {/* ── TICKER TAPE ── */}
      <TickerTape />

      {/* ── TERMINAL PANELS ── */}
      <section id="preview" className="py-20 px-4 max-w-7xl mx-auto">
        <div className="mb-10 text-center">
          <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase mb-2">// MARKET_INTELLIGENCE</p>
          <h2 className="text-2xl font-mono font-bold text-white">
            A <span className="text-emerald-400">full trading terminal</span> for your league
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Panel 1 — Candlestick */}
          <TerminalPanel title="EQUITY / GP:US">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline font-mono">
                <span className="text-xs text-zinc-500">LAST</span>
                <span className="text-emerald-400 text-lg font-bold">187.32</span>
                <span className="text-emerald-400 text-xs">+1.24%</span>
              </div>
              <div className="h-20"><CandlestickChart /></div>
              <div className="h-12"><VolumeChart /></div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[['OPEN', '185.10'], ['HIGH', '188.90'], ['LOW', '184.42']].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-zinc-600 font-mono text-xs">{k}</p>
                    <p className="text-slate-300 font-mono text-xs">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </TerminalPanel>

          {/* Panel 2 — Multi-line */}
          <TerminalPanel title="PORTFOLIO / PERFORMANCE" accentColor="#f59e0b">
            <div className="space-y-2">
              <div className="flex gap-4 font-mono text-xs mb-1">
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-400 inline-block" /> Portfolio</span>
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-400 inline-block" /> Benchmark</span>
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-400 inline-block" /> Rival</span>
              </div>
              <div className="h-20"><LineChart colors={['#10b981', '#f59e0b', '#ef4444']} /></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['Week Return', '+4.82%', true],
                  ['vs Benchmark', '+1.20%', true],
                  ['Sharpe Ratio', '1.44', true],
                  ['Max Drawdown', '-3.1%', false],
                ].map(([k, v, up]) => (
                  <div key={k} className="bg-black/40 rounded p-2">
                    <p className="text-zinc-600 font-mono text-xs">{k}</p>
                    <p className={`font-mono text-xs font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </TerminalPanel>

          {/* Panel 3 — Data table */}
          <TerminalPanel title="LEAGUE / LEADERBOARD" accentColor="#f59e0b">
            <div className="space-y-3">
              <DataTable rows={[
                ['WallStWolf', '10,482', '+4.82%'],
                ['StockGoblin', '10,312', '+3.12%'],
                ['BullRunner', '10,218', '+2.18%'],
                ['PaperHands', '9,902', '-0.98%'],
                ['BearMode', '9,741', '-2.59%'],
                ['YOLO_Ape', '9,620', '-3.80%'],
              ]} />
              <div className="border-t border-zinc-800 pt-2">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-zinc-600">YOUR RANK</span>
                  <span className="text-emerald-400 font-bold">#1 ↑</span>
                </div>
              </div>
            </div>
          </TerminalPanel>

          {/* Panel 4 — Spread / matchup */}
          <TerminalPanel title="MATCHUP / WEEK 7" accentColor="#22d3ee">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-zinc-500">YOU</p>
                  <p className="text-emerald-400 font-mono text-2xl font-bold">+4.82%</p>
                </div>
                <div className="text-zinc-700 font-mono text-sm">VS</div>
                <div className="text-right">
                  <p className="text-xs font-mono text-zinc-500">RIVAL</p>
                  <p className="text-red-400 font-mono text-2xl font-bold">+2.11%</p>
                </div>
              </div>
              <div className="h-16 relative">
                <LineChart colors={['#10b981', '#ef4444']} noisy />
              </div>
              <div className="bg-emerald-950/30 border border-emerald-900/40 rounded px-3 py-2">
                <p className="text-emerald-400 font-mono text-xs text-center font-bold">▲ LEADING BY +2.71%</p>
              </div>
            </div>
          </TerminalPanel>

          {/* Panel 5 — Order book style */}
          <TerminalPanel title="MARKET / DEPTH" accentColor="#22d3ee">
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between text-zinc-600 mb-1.5 text-xs">
                <span>PRICE</span><span>QTY</span><span>TOTAL</span>
              </div>
              {[
                ['188.90', '142', '26,823'],
                ['188.60', '88', '16,597'],
                ['188.32', '215', '40,489'],
                ['187.98', '64', '12,031'],
              ].map(([p, q, t]) => (
                <div key={p} className="flex justify-between text-red-400/80">
                  <span>{p}</span><span className="text-zinc-500">{q}</span><span className="text-zinc-600">{t}</span>
                </div>
              ))}
              <div className="border-y border-zinc-800 py-1 my-1 flex justify-between">
                <span className="text-emerald-400 font-bold">187.32</span>
                <span className="text-zinc-600">LAST</span>
              </div>
              {[
                ['187.10', '310', '57,981'],
                ['186.84', '198', '37,006'],
                ['186.50', '412', '76,838'],
                ['186.20', '95', '17,689'],
              ].map(([p, q, t]) => (
                <div key={p} className="flex justify-between text-emerald-400/80">
                  <span>{p}</span><span className="text-zinc-500">{q}</span><span className="text-zinc-600">{t}</span>
                </div>
              ))}
            </div>
          </TerminalPanel>

          {/* Panel 6 — Holdings heatmap */}
          <TerminalPanel title="PORTFOLIO / HOLDINGS">
            <div className="space-y-1.5">
              {[
                { sym: 'NVDA', alloc: 28, chg: '+5.12%', up: true },
                { sym: 'AAPL', alloc: 22, chg: '+1.24%', up: true },
                { sym: 'TSLA', alloc: 18, chg: '+3.87%', up: true },
                { sym: 'GOOGL', alloc: 15, chg: '-0.43%', up: false },
                { sym: 'AMZN', alloc: 10, chg: '-1.02%', up: false },
                { sym: 'META', alloc: 7, chg: '+2.31%', up: true },
              ].map(({ sym, alloc, chg, up }) => (
                <div key={sym} className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-xs w-12">{sym}</span>
                  <div className="flex-1 h-4 bg-zinc-900 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${up ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                      style={{ width: `${alloc * 3.2}%` }}
                    />
                  </div>
                  <span className={`font-mono text-xs w-14 text-right ${up ? 'text-emerald-400' : 'text-red-400'}`}>{chg}</span>
                </div>
              ))}
            </div>
          </TerminalPanel>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-16 px-4 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase mb-2">// PROTOCOL</p>
            <h2 className="text-2xl font-mono font-bold text-white">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'DRAFT YOUR PORTFOLIO',
                desc: 'Join a league and draft a roster of real stocks in a live snake draft with your competitors.',
                icon: '◈',
                color: 'emerald',
              },
              {
                step: '02',
                title: 'TRADE IN REAL TIME',
                desc: 'Buy, sell, and add/drop stocks from your portfolio throughout the week using live market prices.',
                icon: '⟳',
                color: 'cyan',
              },
              {
                step: '03',
                title: 'WIN YOUR MATCHUP',
                desc: 'Your portfolio return percentage is scored against your opponent each week. Highest return wins.',
                icon: '▲',
                color: 'amber',
              },
              {
                step: '04',
                title: 'WIN THE LEAGUE',
                desc: 'Earn 1 point for every weekly matchup win. At season end, the best overall portfolio from league start to finish earns a bonus equal to each user’s total matchup count divided by 3.',
                icon: '◆',
                color: 'emerald',
              },
            ].map(({ step, title, desc, icon, color }) => (
              <div key={step} className="relative bg-zinc-950 border border-zinc-800 rounded-lg p-6 accent-top">
                <div className="flex items-start gap-4">
                  <span className={`text-${color}-400 font-mono text-2xl`}>{icon}</span>
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-zinc-700 font-mono text-xs">{step}</span>
                      <h3 className={`text-${color}-400 font-mono text-xs tracking-widest`}>{title}</h3>
                    </div>
                    <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-4 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'ACTIVE LEAGUES', val: '1,247', color: 'text-emerald-400' },
            { label: 'TRADES EXECUTED', val: '48,392', color: 'text-cyan-400' },
            { label: 'STOCKS TRACKED', val: '2,100+', color: 'text-amber-400' },
            { label: 'DATA POINTS / DAY', val: '2.1M', color: 'text-emerald-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <p className={`font-mono text-3xl font-black ${color}`}>{val}</p>
              <p className="text-zinc-600 font-mono text-xs tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA + INLINE SIGNUP ── */}
      <section id="signup" className="py-24 px-4 border-t border-zinc-900">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase mb-4">// NEW_USER_REGISTRATION</p>
          <h2 className="text-3xl font-mono font-bold text-white mb-2">
            The market doesn't wait.<br />
            <span className="text-emerald-400">Neither should you.</span>
          </h2>
          <p className="text-zinc-600 font-mono text-sm mb-10">Create your account. Draft your stocks. Dominate your league.</p>

          {signUpDone ? (
            <div className="bg-emerald-950/30 border border-emerald-700 rounded-lg px-6 py-8">
              <p className="text-emerald-400 font-mono text-sm font-bold">✓ ACCOUNT CREATED</p>
              <p className="text-zinc-500 font-mono text-xs mt-1">Redirecting to profile setup...</p>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="relative bg-zinc-950 border border-zinc-800 rounded-lg p-8 glow-border accent-top text-left space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-500 tracking-wider mb-1 uppercase">Email Address</label>
                <input
                  type="email"
                  placeholder="trader@example.com"
                  className="w-full bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2.5 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-500 tracking-wider mb-1 uppercase">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2.5 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={signUpLoading}
                className="w-full border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs py-3 rounded tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
                style={{ boxShadow: '0 0 20px rgba(16,185,129,0.1)' }}
              >
                {signUpLoading ? 'INITIALIZING...' : 'INITIALIZE ACCOUNT →'}
              </button>
              {signUpError && (
                <p className="text-red-400 text-xs font-mono border border-red-900 bg-red-950/30 rounded px-3 py-2">
                  ERR: {signUpError}
                </p>
              )}
              <p className="text-center text-zinc-600 text-xs font-mono pt-1">
                Already have an account?{' '}
                <button type="button" onClick={() => navigate('/signin')} className="text-emerald-400 hover:text-emerald-300 tracking-wider">
                  SIGN_IN →
                </button>
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-zinc-900 py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <span className="font-mono font-black text-white text-sm">
            FAN<span className="text-emerald-400">TOK</span>
          </span>
          <span className="text-zinc-700 font-mono text-xs">
            For entertainment purposes only. Not financial advice.
          </span>
          <span className="text-zinc-700 font-mono text-xs">● SYSTEM ONLINE v2.0.0</span>
        </div>
      </footer>
    </div>
  );
}
