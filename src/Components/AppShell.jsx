import AppHeader from "./AppHeader";
import MarketTickerFooter from "./MarketTickerFooter";
import PassiveMarketBackground from "./PassiveMarketBackground";

export default function AppShell({ headerRight, children, className = "" }) {
  return (
    <div className={`scanlines min-h-screen bg-black text-slate-300 pb-12 relative overflow-hidden ${className}`}>
      <PassiveMarketBackground />
      <AppHeader rightContent={headerRight} />
      <main className="relative z-10">{children}</main>
      <MarketTickerFooter />
    </div>
  );
}
