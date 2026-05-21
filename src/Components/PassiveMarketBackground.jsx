import { useEffect, useRef } from "react";

const CANDLE_WIDTH = 8;
const GAP = 18;
const TARGET_FPS = 12;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export default function PassiveMarketBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;
    let lastFrame = 0;
    let offset = 0;
    let candles = [];

    const seedCandles = () => {
      const count = Math.ceil(canvas.width / GAP) + 16;
      candles = [];
      let price = canvas.height * 0.55;

      for (let i = 0; i < count; i++) {
        const open = price;
        const close = Math.max(canvas.height * 0.15, Math.min(canvas.height * 0.85, open + randomBetween(-36, 36)));
        candles.push({
          open,
          close,
          high: Math.min(open, close) - randomBetween(8, 34),
          low: Math.max(open, close) + randomBetween(8, 34),
        });
        price = close + randomBetween(-14, 14);
      }
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1);
      canvas.width = Math.max(1, Math.round(canvas.offsetWidth * pixelRatio));
      canvas.height = Math.max(1, Math.round(canvas.offsetHeight * pixelRatio));
      seedCandles();
    };

    const pushCandle = () => {
      const last = candles[candles.length - 1];
      const open = last?.close ?? canvas.height * 0.5;
      const close = Math.max(canvas.height * 0.15, Math.min(canvas.height * 0.85, open + randomBetween(-34, 34)));
      candles.push({
        open,
        close,
        high: Math.min(open, close) - randomBetween(8, 30),
        low: Math.max(open, close) + randomBetween(8, 30),
      });
      candles.shift();
    };

    const draw = (timestamp) => {
      if (timestamp - lastFrame >= FRAME_INTERVAL) {
        lastFrame = timestamp;
        offset += 1.4;
        if (offset >= GAP) {
          offset -= GAP;
          pushCandle();
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        candles.forEach((candle, index) => {
          const x = index * GAP - offset;
          if (x < -GAP || x > canvas.width + GAP) return;

          const up = candle.close <= candle.open;
          const color = up ? "16,185,129" : "239,68,68";
          const bodyTop = Math.min(candle.open, candle.close);
          const bodyHeight = Math.max(3, Math.abs(candle.close - candle.open));
          const midX = x + CANDLE_WIDTH / 2;

          ctx.strokeStyle = `rgba(${color},0.13)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(midX, candle.high);
          ctx.lineTo(midX, candle.low);
          ctx.stroke();

          ctx.fillStyle = `rgba(${color},0.09)`;
          ctx.fillRect(x, bodyTop, CANDLE_WIDTH, bodyHeight);
        });
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 h-full w-full pointer-events-none opacity-80"
      aria-hidden="true"
    />
  );
}
