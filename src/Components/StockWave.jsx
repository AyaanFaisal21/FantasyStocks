import { useEffect, useRef } from 'react';

const GAP = 7;   // grid spacing in px
const DOT = 2;   // dot size in px
const TARGET_FPS = 20;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const MAX_PIXEL_RATIO = 1.1;
const MOBILE_PIXEL_RATIO = 0.85;
const IDLE_ANIMATION_DELAY = 900;
const SEED = 424242;

// 4×4 Bayer ordered dither matrix, normalized to [0,1]
const BAYER = [
  [0 / 16, 8 / 16,  2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16,  1 / 16,  9 / 16],
  [15 / 16, 7 / 16, 13 / 16,  5 / 16],
];

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export default function StockWave({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    let animId;
    let idleId;
    let resizeId;
    let prices = [];
    let momentum = 0;
    let t = 0;
    let scrollOffset = 0;
    let lastFrameTime = 0;
    let isVisible = true;
    let animationStarted = false;
    let random = createSeededRandom(SEED);

    const resize = () => {
      const cssWidth = Math.max(1, canvas.offsetWidth);
      const cssHeight = Math.max(1, canvas.offsetHeight);
      const mobileScale = cssWidth < 768 ? MOBILE_PIXEL_RATIO : 1;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * mobileScale;

      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      random = createSeededRandom(SEED + Math.round(cssWidth) + Math.round(cssHeight));
      const cols = Math.ceil(canvas.width / GAP) + 4;
      prices = [];
      let p = canvas.height * 0.5;
      momentum = 0;
      t = 0;
      scrollOffset = 0;

      for (let i = 0; i < cols; i++) {
        const { price: np, momentum: nm } = stepPrice(p, momentum, i, canvas.height);
        p = np;
        momentum = nm;
        prices.push(p);
      }

      draw(false);
    };

    function stepPrice(prev, mom, tick, h) {
      const longWave = Math.sin(tick * 0.012) * h * 0.22;
      const medWave = Math.sin(tick * 0.055) * h * 0.07;
      const shortWave = Math.sin(tick * 0.22) * h * 0.03;
      const noise = (random() - 0.5) * 18;
      const newMom = mom * 0.82 + noise;
      const target = h * 0.42 + longWave + medWave + shortWave;
      const newPrice = prev + (target - prev) * 0.025 + newMom;
      return {
        price: Math.max(h * 0.08, Math.min(h * 0.88, newPrice)),
        momentum: newMom,
      };
    }

    const draw = (advance = true) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (advance) {
        t += 1;
        scrollOffset += 0.9;
        if (scrollOffset >= GAP) {
          scrollOffset -= GAP;
          const last = prices[prices.length - 1];
          const { price: np, momentum: nm } = stepPrice(last, momentum, t, H);
          momentum = nm;
          prices.push(np);
          prices.shift();
        }
      }

      const cols = prices.length;
      const rows = Math.ceil(H / GAP) + 1;

      for (let ci = 0; ci < cols; ci++) {
        const x = ci * GAP - scrollOffset;
        if (x < -GAP || x > W + GAP) continue;

        const priceY = prices[ci];
        const prevY = ci > 0 ? prices[ci - 1] : priceY;
        const goingUp = priceY <= prevY; // canvas y: up = smaller value

        const greenR = 16, greenG = 185, greenB = 129;
        const redR = 239, redG = 68, redB = 68;
        const [R, G, B] = goingUp ? [greenR, greenG, greenB] : [redR, redG, redB];

        for (let ri = rows; ri >= 0; ri--) {
          const y = H - ri * GAP + (scrollOffset * 0.1);
          if (y < 0) continue;

          const dy = y - priceY; // positive = below price line

          if (dy < -GAP * 2) {
            // well above price line — faint background grid dot
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(x, y, DOT, DOT);
            continue;
          }

          if (dy > 0) {
            // below price line — fill with color
            // alpha fades as we go further down
            const depthFade = Math.max(0.25, 1 - (H - y) / (H * 0.8));
            const alpha = 0.55 * depthFade;
            ctx.fillStyle = `rgba(${R},${G},${B},${alpha})`;
            ctx.fillRect(x, y, DOT, DOT);
          } else {
            // near the price line — apply dithering
            const col = Math.floor((x + scrollOffset) / GAP);
            const row = Math.floor(y / GAP);
            const bayerThreshold = BAYER[row & 3][col & 3];
            // dy is in [-GAP*2, 0], normalize to [0,1] (0 = at line, 1 = far above)
            const normalizedDist = Math.abs(dy) / (GAP * 2);
            if (normalizedDist < bayerThreshold) {
              // draw dithered particle near the line
              const alpha = 0.6 + (1 - normalizedDist) * 0.4;
              ctx.fillStyle = `rgba(${R},${G},${B},${alpha})`;
              ctx.fillRect(x, y, DOT, DOT);
            }
          }
        }

        // Bright dot exactly at price line
        ctx.fillStyle = `rgba(${R},${G},${B},1)`;
        ctx.fillRect(x, priceY, DOT + 1, DOT + 1);
      }
    };

    const animate = (timestamp) => {
      if (!animationStarted || reduceMotion) return;

      if (isVisible && timestamp - lastFrameTime >= FRAME_INTERVAL) {
        lastFrameTime = timestamp;
        draw(true);
      }

      animId = requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (animationStarted || reduceMotion) return;
      animationStarted = true;
      animId = requestAnimationFrame(animate);
    };

    const queueAnimationStart = () => {
      if (reduceMotion) return;

      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(startAnimation, { timeout: IDLE_ANIMATION_DELAY });
      } else {
        idleId = window.setTimeout(startAnimation, IDLE_ANIMATION_DELAY);
      }
    };

    const onResize = () => {
      window.clearTimeout(resizeId);
      resizeId = window.setTimeout(resize, 120);
    };

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          isVisible = entry.isIntersecting;
        }, { threshold: 0.01 })
      : null;

    resize();
    queueAnimationStart();
    observer?.observe(canvas);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.clearTimeout(resizeId);
      if (idleId) {
        if ('cancelIdleCallback' in window && typeof idleId === 'number') {
          window.cancelIdleCallback(idleId);
        } else {
          window.clearTimeout(idleId);
        }
      }
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
