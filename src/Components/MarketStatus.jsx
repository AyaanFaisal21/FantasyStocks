import { useEffect, useState } from "react";

function getEasternMarketStatus() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = values.weekday;
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  const minutes = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const isOpen = isWeekday && minutes >= 9 * 60 + 30 && minutes < 16 * 60;

  return {
    isOpen,
    label: isOpen ? "MARKETS OPEN" : "MARKETS CLOSED",
    detail: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ET`,
  };
}

export default function MarketStatus() {
  const [status, setStatus] = useState(getEasternMarketStatus);

  useEffect(() => {
    const id = window.setInterval(() => setStatus(getEasternMarketStatus()), 60000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded px-4 py-2">
      <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? "bg-emerald-400 pulse-green" : "bg-red-500"}`} />
      <span className="text-xs font-mono text-zinc-400">{status.label}</span>
      <span className="text-xs font-mono text-zinc-700">{status.detail}</span>
    </div>
  );
}
