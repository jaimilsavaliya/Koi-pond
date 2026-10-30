"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * A self-contained, canvas-based koi pond for React.
 * Place content inside the component and give its container an explicit height.
 */
export type PondTheme = "dark" | "light";
/** Pick one or combine several; fish cycle through the supplied list. */
export type FishType = "kohaku" | "sanke" | "tancho" | "showa" | "goldfish" | "betta";
/** `koi` is the total fish count, retained for backwards compatibility. */
export type PondStats = { koi: number; pellets: number };
export type KoiPondHandle = {
  /** Drop a handful of food at a point in local CSS pixels (defaults to the center). */
  feed: (x?: number, y?: number) => void;
  /** Start a new arrangement of koi. */
  reset: () => void;
};
export type KoiPondProps = {
  fishCount?: number;
  /** One or more fish styles. Defaults to a mix of the four koi varieties. */
  fishTypes?: readonly FishType[];
  /** Number of lotus-and-lily-pad clusters; set to 0 to hide them. */
  lotusCount?: number;
  /** Size multiplier for the lotus and pads (0.5–1.8). */
  lotusScale?: number;
  speed?: number;
  theme?: PondTheme;
  interactive?: boolean;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onStatsChange?: (stats: PondStats) => void;
};

type Point = { x: number; y: number };
type Box = { left: number; right: number; top: number; bottom: number };
type Pellet = Point & { age: number; driftX: number; driftY: number };
type Ripple = Point & { age: number; strength: number };
type Fish = {
  id: number;
  points: Point[];
  heading: number;
  length: number;
  pace: number;
  phase: number;
  opacity: number;
  type: FishType;
  fright: number;
  fleeX: number;
  fleeY: number;
};
type Options = { count: number; fishTypes: readonly FishType[]; lotusCount: number; lotusScale: number; speed: number; theme: PondTheme; interactive: boolean; paused: boolean };

const FISH_TYPES: readonly FishType[] = ["kohaku", "sanke", "tancho", "showa", "goldfish", "betta"];
const DEFAULT_FISH_TYPES: readonly FishType[] = FISH_TYPES.slice(0, 4);
function normalizeFishTypes(types?: readonly FishType[]): FishType[] {
  if (!Array.isArray(types)) return [...DEFAULT_FISH_TYPES];
  const valid = types.filter((type): type is FishType => FISH_TYPES.includes(type));
  return valid.length ? valid : [...DEFAULT_FISH_TYPES];
}

const TAU = Math.PI * 2;
const JOINTS = 15;
const MAX_FISH = 12;
const MAX_LOTUS = 8;
// Normalized positions keep the plants usable in both a full-screen pond and a small section.
const LOTUS_ANCHORS = [
  [0.16, 0.18, 1], [0.59, 0.18, 0.92], [0.70, 0.80, 0.96], [0.39, 0.13, 0.78],
  [0.24, 0.80, 0.82], [0.85, 0.40, 0.85], [0.50, 0.52, 0.78], [0.91, 0.91, 0.76],
] as const;
const LOTUS_MOBILE_ANCHORS = [
  [0.23, 0.14, 1], [0.76, 0.58, 0.95], [0.25, 0.76, 0.92], [0.80, 0.14, 0.78],
  [0.12, 0.49, 0.8], [0.55, 0.84, 0.82], [0.47, 0.40, 0.75], [0.88, 0.88, 0.76],
] as const;
const LILY_ANCHORS = [
  [0.34, 0.16, 0.64], [0.64, 0.45, 0.62], [0.58, 0.84, 0.65], [0.81, 0.18, 0.60],
  [0.31, 0.54, 0.60], [0.11, 0.43, 0.62], [0.81, 0.90, 0.64], [0.52, 0.64, 0.56],
] as const;
const LILY_MOBILE_ANCHORS = [
  [0.70, 0.14, 0.70], [0.12, 0.55, 0.66], [0.72, 0.76, 0.70], [0.45, 0.15, 0.56],
  [0.86, 0.41, 0.60], [0.16, 0.86, 0.58], [0.51, 0.64, 0.62], [0.88, 0.89, 0.58],
] as const;
const IGNORE = "a, button, input, select, textarea, label, [role='button'], [data-pond-ignore]";
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const ease = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fraction = (n: number) => n - Math.floor(n);
const noise = (a: number, b: number, seed: number) => fraction(Math.sin(a * 127.1 + b * 311.7 + seed * 71.73) * 43758.5453);
const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

const PALETTES = {
  dark: {
    background: "#171715",
    white: ["#777571", "#918d87", "#a9a49d", "#c0bab0"],
    red: ["#894022", "#a54c25", "#bd5c2b", "#d27738"],
    black: ["#36343a", "#424047", "#4c4a50", "#55515a"],
    gold: ["#94511c", "#b96521", "#d88429", "#e8ad4e"],
    goldHighlight: ["#a7672a", "#c78a3c", "#e0a454", "#efc377"],
    blue: ["#294d61", "#376d86", "#528da6", "#7bb2bd"],
    violet: ["#49435e", "#615872", "#80738c", "#a493a4"],
    fin: "#79756f",
    goldFin: "#d08a3e",
    blueFin: "#618da7",
    leaf: ["#35543b", "#4f7344", "#709151", "#8ca86a"],
    leafInk: "#1c3927",
    petal: ["#a95276", "#c96f91", "#de8fad", "#efb3c7"],
    petalInk: "#74314e",
    lotusCenter: ["#c88c31", "#e7af43", "#f4ce68"],
    centerInk: "#825625",
    ink: "#181715",
    eye: "#e4dfd4",
    water: "#b3ada3",
    food: "#e8a16b",
  },
  light: {
    background: "#f4f2ed",
    white: ["#92908c", "#aaa69f", "#bbb6ae", "#ccc7be"],
    red: ["#a43a24", "#bd4727", "#d05b30", "#df7844"],
    black: ["#4d494c", "#5a5557", "#696363", "#746e6c"],
    gold: ["#a65720", "#c17024", "#d88a32", "#e4a750"],
    goldHighlight: ["#b17430", "#ca9149", "#dca95f", "#e8bd7c"],
    blue: ["#34566b", "#47758b", "#6290a3", "#80a9b4"],
    violet: ["#564a60", "#6b5d73", "#867687", "#a4939e"],
    fin: "#817c75",
    goldFin: "#bc7737",
    blueFin: "#63879b",
    leaf: ["#396332", "#56833e", "#79a355", "#9fbd72"],
    leafInk: "#26472b",
    petal: ["#d16a93", "#e387a8", "#efa5bd", "#f7bfd1"],
    petalInk: "#9b3c62",
    lotusCenter: ["#d99b28", "#efbd43", "#f8d565"],
    centerInk: "#865823",
    ink: "#35302f",
    eye: "#ede9e1",
    water: "#77716b",
    food: "#ae542e",
  },
} as const;

// This engine deliberately has no dependency on the demo, global CSS, images,
// or a particular canvas size. All coordinates are local to its own container.
class PondEngine {
  private ctx: CanvasRenderingContext2D | null;
  private options: Options;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private cellW = 11;
  private cellH = 13;
  private fish: Fish[] = [];
  private pellets: Pellet[] = [];
  private ripples: Ripple[] = [];
  private boxes: Box[] = [];
  private pointer = { x: 0, y: 0, lastX: 0, lastY: 0, time: 0, active: false, velocity: 0 };
  private clock = 0;
  private lastFrame = 0;
  private frame = 0;
  private generation = 0;
  private raf = 0;
  private disposed = false;
  private inView = true;
  private resizeObserver?: ResizeObserver;
  private viewObserver?: IntersectionObserver;
  private reducedMotion?: MediaQueryList;
  private reported = "";

  constructor(
    private canvas: HTMLCanvasElement,
    private host: HTMLDivElement,
    options: Options,
    private reportStats: (stats: PondStats) => void,
  ) {
    this.ctx = canvas.getContext("2d");
    this.options = options;
    this.reducedMotion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : undefined;
    this.reducedMotion?.addEventListener("change", this.schedule);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(host);
    } else {
      window.addEventListener("resize", this.resize);
    }
    if (typeof IntersectionObserver !== "undefined") {
      this.viewObserver = new IntersectionObserver(([entry]) => {
        this.inView = !!entry?.isIntersecting;
        this.schedule();
      });
      this.viewObserver.observe(host);
    }
    host.addEventListener("pointermove", this.onMove, { passive: true });
    host.addEventListener("pointerleave", this.onLeave);
    host.addEventListener("click", this.onClick);
    window.addEventListener("blur", this.onLeave);
    document.addEventListener("visibilitychange", this.schedule);
    this.resize();
    this.schedule();
  }

  configure(options: Options) {
    this.options = options;
    this.syncFish();
    this.measureBoxes();
    this.draw();
    this.schedule();
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.viewObserver?.disconnect();
    this.reducedMotion?.removeEventListener("change", this.schedule);
    window.removeEventListener("resize", this.resize);
    this.host.removeEventListener("pointermove", this.onMove);
    this.host.removeEventListener("pointerleave", this.onLeave);
    this.host.removeEventListener("click", this.onClick);
    window.removeEventListener("blur", this.onLeave);
    document.removeEventListener("visibilitychange", this.schedule);
  }

  reset() {
    this.generation += 1;
    this.fish = [];
    this.pellets = [];
    this.ripples = [];
    this.syncFish();
    this.report();
    this.draw();
  }

  feed(x = this.width / 2, y = this.height / 2) {
    if (!this.width || !this.height || this.reducedMotion?.matches) return;
    const px = clamp(x, 0, this.width);
    const py = clamp(y, 0, this.height);
    this.ripples.push({ x: px, y: py, age: 0, strength: 1 });
    const quantity = Math.min(5, 40 - this.pellets.length);
    for (let i = 0; i < quantity; i++) {
      const a = Math.random() * TAU;
      const r = 8 + Math.random() * 33;
      this.pellets.push({
        x: clamp(px + Math.cos(a) * r, 0, this.width),
        y: clamp(py + Math.sin(a) * r * 0.7, 0, this.height),
        age: 0,
        driftX: Math.cos(a) * (0.5 + Math.random()),
        driftY: Math.sin(a) * (0.5 + Math.random()),
      });
    }
    this.report();
    this.draw();
  }

  private report() {
    const key = `${this.fish.length}:${this.pellets.length}`;
    if (this.reported !== key) {
      this.reported = key;
      this.reportStats({ koi: this.fish.length, pellets: this.pellets.length });
    }
  }

  private resize = () => {
    if (this.disposed || !this.ctx) return;
    const rect = this.host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const oldW = this.width;
    const oldH = this.height;
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cellW = clamp(Math.round(this.width / 125), 8, 12);
    this.cellH = this.cellW + 2;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    if (oldW && oldH) {
      const sx = this.width / oldW;
      const sy = this.height / oldH;
      const scale = clamp(Math.min(this.width, this.height) / Math.min(oldW, oldH), 0.6, 1.6);
      for (const fish of this.fish) {
        fish.length *= scale;
        for (const point of fish.points) { point.x *= sx; point.y *= sy; }
      }
      for (const p of this.pellets) { p.x *= sx; p.y *= sy; }
    }
    this.syncFish();
    this.measureBoxes();
    this.draw();
  };

  private makeFish(id: number): Fish {
    // Anchors provide a nicely distributed first frame; later resets perturb them.
    const anchors = [
      [0.27, 0.31, 0.52], [0.72, 0.22, 2.55], [0.77, 0.48, -0.35],
      [0.53, 0.62, 1.46], [0.25, 0.77, -1.30], [0.87, 0.78, 1.95],
      [0.46, 0.18, 2.95], [0.65, 0.84, -2.35], [0.13, 0.51, 0.45],
      [0.89, 0.36, 2.5], [0.4, 0.48, -0.8], [0.59, 0.35, 1.9],
    ];
    const [ax, ay, initialAngle] = anchors[id % anchors.length];
    const variation = this.generation ? 0.16 : 0;
    const x = this.width * clamp(ax + (noise(id, this.generation, 2) - 0.5) * variation, 0.08, 0.92);
    const y = this.height * clamp(ay + (noise(id, this.generation, 7) - 0.5) * variation, 0.08, 0.92);
    const heading = initialAngle + (this.generation ? (noise(id, this.generation, 9) - 0.5) * 1.3 : 0);
    const base = clamp(Math.min(this.width, this.height) * 0.44, 155, 360);
    const proportions = [0.93, 0.77, 0.82, 0.94, 0.62, 0.68, 0.46, 0.7, 0.55, 0.8, 0.64, 0.74];
    const length = base * proportions[id % proportions.length];
    const spacing = length / (JOINTS - 1);
    const points = Array.from({ length: JOINTS }, (_, i) => ({
      x: x - Math.cos(heading) * spacing * i,
      y: y - Math.sin(heading) * spacing * i,
    }));
    return {
      id: id + this.generation * 29,
      points,
      heading,
      length,
      pace: 19 + noise(id, 3, 2) * 11,
      phase: noise(id, 4, 6) * TAU,
      opacity: 0.72 + noise(id, 5, 8) * 0.23,
      type: this.options.fishTypes[id % this.options.fishTypes.length],
      fright: 0,
      fleeX: 0,
      fleeY: 0,
    };
  }

  private syncFish() {
    if (!this.width || !this.height) return;
    while (this.fish.length < this.options.count) this.fish.push(this.makeFish(this.fish.length));
    if (this.fish.length > this.options.count) this.fish.length = this.options.count;
    // Restyle the existing fish in place so changing a selection doesn't restart the simulation.
    this.fish.forEach((fish, index) => { fish.type = this.options.fishTypes[index % this.options.fishTypes.length]; });
    this.report();
  }

  private measureBoxes() {
    const origin = this.host.getBoundingClientRect();
    this.boxes = Array.from(this.host.querySelectorAll("[data-pond-avoid]"), (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - origin.left, right: r.right - origin.left, top: r.top - origin.top, bottom: r.bottom - origin.top };
    }).filter((b) => b.right > b.left && b.bottom > b.top);
  }

  private ignored(event: Event) {
    return event.composedPath().some((target) => target instanceof Element && target.matches(IGNORE));
  }

  private onMove = (event: PointerEvent) => {
    if (!this.options.interactive || event.pointerType === "touch" || this.ignored(event)) {
      this.pointer.active = false;
      return;
    }
    const rect = this.host.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dt = Math.max(16, event.timeStamp - this.pointer.time) / 1000;
    const velocity = this.pointer.time ? Math.hypot(x - this.pointer.lastX, y - this.pointer.lastY) / dt : 0;
    this.pointer = { x, y, lastX: x, lastY: y, time: event.timeStamp, active: true, velocity };
    if (velocity > 850) {
      for (const fish of this.fish) {
        const dx = fish.points[0].x - x;
        const dy = fish.points[0].y - y;
        const d = Math.hypot(dx, dy);
        if (d < 135 && d > 0) {
          fish.fright = 1.4;
          fish.fleeX = dx / d;
          fish.fleeY = dy / d;
        }
      }
    }
  };

  private onLeave = () => { this.pointer.active = false; this.pointer.time = 0; };
  private onClick = (event: MouseEvent) => {
    if (!this.options.interactive || this.ignored(event) || window.getSelection()?.toString()) return;
    const rect = this.host.getBoundingClientRect();
    this.feed(event.clientX - rect.left, event.clientY - rect.top);
  };

  private schedule = () => {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.disposed || !this.ctx || !this.inView || document.hidden) return;
    if (this.options.paused || this.reducedMotion?.matches) {
      this.draw();
      return;
    }
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  };

  private tick = (now: number) => {
    if (this.disposed || this.options.paused || this.reducedMotion?.matches || !this.inView || document.hidden) return;
    const elapsed = now - this.lastFrame;
    if (elapsed >= 30) {
      const dt = Math.min(elapsed / 1000, 0.07) * this.options.speed;
      this.lastFrame = now;
      this.advance(dt);
      this.draw();
      if (++this.frame % 30 === 0) this.measureBoxes();
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private advance(dt: number) {
    this.clock += dt;
    this.pointer.velocity *= Math.pow(0.2, dt);
    for (const p of this.pellets) { p.age += dt; p.x += p.driftX * dt; p.y += p.driftY * dt; }
    this.pellets = this.pellets.filter((p) => p.age < 25);
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter((r) => r.age < 2.5);

    for (const fish of this.fish) {
      const head = fish.points[0];
      // A small amount of wandering is always present, so the paths never repeat exactly.
      const wander = fish.heading + Math.sin(this.clock * 0.38 + fish.phase) * 0.32;
      let dx = Math.cos(wander) * 0.8;
      let dy = Math.sin(wander) * 0.8;
      const margin = Math.min(100, this.width * 0.2, this.height * 0.2);
      dx += clamp((margin - head.x) / margin, 0, 2) * 2.5;
      dx -= clamp((head.x - (this.width - margin)) / margin, 0, 2) * 2.5;
      dy += clamp((margin - head.y) / margin, 0, 2) * 2.5;
      dy -= clamp((head.y - (this.height - margin)) / margin, 0, 2) * 2.5;

      let target: Pellet | undefined;
      let targetDistance = 460;
      for (const pellet of this.pellets) {
        const d = Math.hypot(pellet.x - head.x, pellet.y - head.y);
        if (d < targetDistance) { target = pellet; targetDistance = d; }
      }
      if (target) {
        dx += (target.x - head.x) / Math.max(1, targetDistance) * 2.7;
        dy += (target.y - head.y) / Math.max(1, targetDistance) * 2.7;
        if (targetDistance < 14) {
          this.pellets.splice(this.pellets.indexOf(target), 1);
          this.ripples.push({ x: target.x, y: target.y, age: 0, strength: 0.55 });
          target = undefined;
        }
      } else if (fish.fright > 0) {
        dx += fish.fleeX * 3;
        dy += fish.fleeY * 3;
      } else if (this.pointer.active && this.pointer.velocity < 700) {
        const px = this.pointer.x - head.x;
        const py = this.pointer.y - head.y;
        const distance = Math.hypot(px, py);
        if (distance > 45 && distance < 260) {
          const pull = 0.7 * (1 - distance / 260);
          dx += (px / distance) * pull;
          dy += (py / distance) * pull;
        }
      }
      fish.fright = Math.max(0, fish.fright - dt);

      // Gently turn away from content tagged data-pond-avoid.
      for (const b of this.boxes) {
        const closestX = clamp(head.x, b.left - 14, b.right + 14);
        const closestY = clamp(head.y, b.top - 14, b.bottom + 14);
        let bx = head.x - closestX;
        let by = head.y - closestY;
        let dist = Math.hypot(bx, by);
        if (dist < 75) {
          if (dist < 1) {
            const choices = [
              { n: Math.abs(head.x - b.left), x: -1, y: 0 },
              { n: Math.abs(b.right - head.x), x: 1, y: 0 },
              { n: Math.abs(head.y - b.top), x: 0, y: -1 },
              { n: Math.abs(b.bottom - head.y), x: 0, y: 1 },
            ].sort((a, c) => a.n - c.n);
            bx = choices[0].x; by = choices[0].y; dist = 1;
          }
          const push = 2.6 * (1 - Math.min(dist, 75) / 75);
          dx += (bx / dist) * push;
          dy += (by / dist) * push;
        }
      }
      for (const other of this.fish) {
        if (other === fish) continue;
        const ox = head.x - other.points[0].x;
        const oy = head.y - other.points[0].y;
        const distance = Math.hypot(ox, oy);
        if (distance > 0 && distance < 70) {
          dx += (ox / distance) * (1 - distance / 70) * 1.3;
          dy += (oy / distance) * (1 - distance / 70) * 1.3;
        }
      }
      const desired = Math.atan2(dy, dx);
      fish.heading += clamp(angleDelta(desired, fish.heading), -0.9 * dt, 0.9 * dt);
      const pace = fish.pace * (target ? 1.85 : fish.fright > 0 ? 1.55 : 1);
      head.x += Math.cos(fish.heading) * pace * dt;
      head.y += Math.sin(fish.heading) * pace * dt;
      const segment = fish.length / (JOINTS - 1);
      for (let i = 1; i < fish.points.length; i++) {
        const prev = fish.points[i - 1];
        const point = fish.points[i];
        const vx = point.x - prev.x;
        const vy = point.y - prev.y;
        const length = Math.hypot(vx, vy) || 1;
        point.x = prev.x + (vx / length) * segment;
        point.y = prev.y + (vy / length) * segment;
      }
    }
    this.report();
  }

  private fadeAt(x: number, y: number) {
    let fade = 1;
    for (const b of this.boxes) {
      const nx = clamp(x, b.left, b.right);
      const ny = clamp(y, b.top, b.bottom);
      const dist = Math.hypot(x - nx, y - ny);
      fade = Math.min(fade, 0.18 + 0.82 * clamp(dist / 60, 0, 1));
    }
    return fade;
  }

  private draw() {
    const ctx = this.ctx;
    if (!ctx || !this.width || !this.height) return;
    const palette = PALETTES[this.options.theme];
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(8, this.cellH - 3)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    this.drawRipples(ctx);
    for (const fish of this.fish) this.drawFish(ctx, fish);
    // Flowers and lily pads float on the surface, above the swimming fish.
    this.drawLotusGarden(ctx);
    for (const p of this.pellets) {
      ctx.globalAlpha = Math.min(0.9, (25 - p.age) / 4);
      ctx.fillStyle = palette.food;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.1, 0, TAU);
      ctx.fill();
      ctx.globalAlpha *= 0.55;
      ctx.fillText("·", p.x + 4, p.y - 3);
    }
    ctx.globalAlpha = 1;
  }

  private drawRipples(ctx: CanvasRenderingContext2D) {
    const palette = PALETTES[this.options.theme];
    ctx.fillStyle = palette.water;
    for (const r of this.ripples) {
      const radius = 7 + r.age * 28;
      const alpha = (1 - r.age / 2.5) * r.strength * 0.45;
      ctx.globalAlpha = Math.max(0, alpha);
      const steps = Math.max(10, Math.floor(radius / 3));
      for (let i = 0; i < steps; i++) {
        if (i % 4 === 1) continue;
        const a = (i / steps) * TAU;
        const glyph = Math.abs(Math.sin(a)) > 0.75 ? "-" : Math.abs(Math.cos(a)) > 0.75 ? "|" : (Math.sin(a) * Math.cos(a) > 0 ? "/" : "\\");
        ctx.fillText(glyph, r.x + Math.cos(a) * radius, r.y + Math.sin(a) * radius * 0.6);
      }
    }
  }

  /** Paint a few pixel-tiled lotus flowers and lily pads, inspired by the reference. */
  private drawLotusGarden(ctx: CanvasRenderingContext2D) {
    if (!this.options.lotusCount) return;
    const anchors = this.width < 650 ? LOTUS_MOBILE_ANCHORS : LOTUS_ANCHORS;
    const lilyAnchors = this.width < 650 ? LILY_MOBILE_ANCHORS : LILY_ANCHORS;
    const baseRadius = clamp(Math.min(this.width, this.height) * 0.105, 40, 95) * this.options.lotusScale;
    // A few freestanding pads balance the leaves nestled under the blooms.
    for (let i = 0; i < this.options.lotusCount; i++) {
      const [px, py, scale] = lilyAnchors[i];
      const phase = noise(i, this.generation, 48) * TAU;
      const x = this.width * px + Math.sin(this.clock * 0.22 + phase) * 2;
      const y = this.height * py + Math.cos(this.clock * 0.20 + phase) * 2;
      this.drawLilyPad(ctx, x, y, baseRadius * scale, i + 40, 1.3 + phase);
    }
    for (let i = 0; i < this.options.lotusCount; i++) {
      const [ax, ay, scale] = anchors[i];
      const phase = noise(i, this.generation, 31) * TAU;
      const shift = this.generation ? 0.05 : 0;
      const x = this.width * clamp(ax + (noise(i, this.generation, 19) - 0.5) * shift, 0.04, 0.96)
        + Math.sin(this.clock * 0.28 + phase) * 3;
      const y = this.height * clamp(ay + (noise(i, this.generation, 23) - 0.5) * shift, 0.04, 0.96)
        + Math.cos(this.clock * 0.24 + phase) * 2;
      const r = baseRadius * scale;
      const flip = i % 2 === 0 ? 1 : -1;
      // The pads are underneath each bloom; fish pass below the entire cluster.
      this.drawLilyPad(ctx, x - flip * r * 0.78, y + r * 0.46, r * 0.68, i * 2 + 1, -0.7 * flip);
      this.drawLilyPad(ctx, x + flip * r * 0.88, y - r * 0.28, r * 0.56, i * 2 + 2, 2.5 * flip);
      this.drawLotus(ctx, x, y, r, i, phase);
    }
  }

  private drawLilyPad(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, seed: number, notchAngle: number) {
    const palette = PALETTES[this.options.theme];
    const firstCol = Math.max(0, Math.floor((cx - radius * 1.1) / this.cellW));
    const lastCol = Math.min(Math.ceil(this.width / this.cellW), Math.ceil((cx + radius * 1.1) / this.cellW));
    const firstRow = Math.max(0, Math.floor((cy - radius * 1.1) / this.cellH));
    const lastRow = Math.min(Math.ceil(this.height / this.cellH), Math.ceil((cy + radius * 1.1) / this.cellH));
    const glyphs = ["S", "X", "%", "t", "8", "/", "-"];
    for (let row = firstRow; row < lastRow; row++) {
      for (let col = firstCol; col < lastCol; col++) {
        const x = (col + 0.5) * this.cellW;
        const y = (row + 0.5) * this.cellH;
        const u = (x - cx) / radius;
        const v = (y - cy) / (radius * 0.90);
        const d = Math.hypot(u, v);
        const angle = Math.atan2(v, u);
        const edge = 0.96 + 0.05 * Math.sin(angle * 5 + seed);
        // A narrow V-shaped notch distinguishes a lily pad from a plain circle.
        if (d > edge || (d > 0.28 && Math.abs(angleDelta(angle, notchAngle)) < 0.16)) continue;
        const h = noise(Math.floor((u + 1) * 9), Math.floor((v + 1) * 9), seed);
        const light = clamp(0.53 - u * 0.17 - v * 0.21 + (h - 0.5) * 0.42, 0, 0.999);
        const shade = Math.floor(light * palette.leaf.length);
        const fade = this.fadeAt(x, y);
        ctx.globalAlpha = fade * 0.88;
        ctx.fillStyle = palette.leaf[shade];
        ctx.fillRect(col * this.cellW + 1, row * this.cellH + 1, this.cellW - 1, this.cellH - 1);
        ctx.globalAlpha = fade * 0.58;
        ctx.fillStyle = palette.leafInk;
        ctx.fillText(glyphs[Math.floor(h * glyphs.length)], x, y + 1);
      }
    }
  }

  private drawLotus(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, seed: number, phase: number) {
    const palette = PALETTES[this.options.theme];
    const firstCol = Math.max(0, Math.floor((cx - radius * 1.1) / this.cellW));
    const lastCol = Math.min(Math.ceil(this.width / this.cellW), Math.ceil((cx + radius * 1.1) / this.cellW));
    const firstRow = Math.max(0, Math.floor((cy - radius * 1.1) / this.cellH));
    const lastRow = Math.min(Math.ceil(this.height / this.cellH), Math.ceil((cy + radius * 1.1) / this.cellH));
    const rotation = phase * 0.13 + Math.sin(this.clock * 0.15 + phase) * 0.025;
    const directions = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * TAU + rotation;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    });
    const petals = [":", "t", "%", "X", "/", "|", "-", "S"];
    const centerGlyphs = ["o", "*", "+", "·"];
    for (let row = firstRow; row < lastRow; row++) {
      for (let col = firstCol; col < lastCol; col++) {
        const x = (col + 0.5) * this.cellW;
        const y = (row + 0.5) * this.cellH;
        const u = (x - cx) / radius;
        const v = (y - cy) / radius;
        const d = Math.hypot(u, v);
        if (d > 1.04) continue;
        const center = d < 0.21;
        let inPetal = center;
        if (!center) {
          for (const direction of directions) {
            const along = u * direction.x + v * direction.y;
            const across = -u * direction.y + v * direction.x;
            if (((along - 0.49) / 0.53) ** 2 + (across / 0.22) ** 2 < 1) { inPetal = true; break; }
          }
        }
        if (!inPetal) continue;
        const h = noise(Math.floor((u + 1) * 12), Math.floor((v + 1) * 12), seed + 50);
        const fade = this.fadeAt(x, y);
        ctx.globalAlpha = fade * 0.96;
        if (center) {
          ctx.fillStyle = palette.lotusCenter[Math.floor(h * palette.lotusCenter.length)];
        } else {
          const shade = Math.floor(clamp(0.23 + d * 0.50 + (h - 0.5) * 0.33, 0, 0.999) * palette.petal.length);
          ctx.fillStyle = palette.petal[shade];
        }
        ctx.fillRect(col * this.cellW + 1, row * this.cellH + 1, this.cellW - 1, this.cellH - 1);
        ctx.globalAlpha = fade * (center ? 0.60 : 0.48);
        ctx.fillStyle = center ? palette.centerInk : palette.petalInk;
        ctx.fillText(center ? centerGlyphs[Math.floor(h * centerGlyphs.length)] : petals[Math.floor(h * petals.length)], x, y + 1);
      }
    }
  }

  private drawFish(ctx: CanvasRenderingContext2D, fish: Fish) {
    const palette = PALETTES[this.options.theme];
    const isGoldfish = fish.type === "goldfish";
    const isBetta = fish.type === "betta";
    // The following spine is a wake following the head. A traveling wave adds a
    // little more movement at the tail without making the head wobble.
    const spine = fish.points.map((p, i, points) => {
      const before = points[Math.max(0, i - 1)];
      const after = points[Math.min(points.length - 1, i + 1)];
      const tx = after.x - before.x;
      const ty = after.y - before.y;
      const d = Math.hypot(tx, ty) || 1;
      const u = i / (points.length - 1);
      const wave = Math.sin(this.clock * 2.7 - i * 0.58 + fish.phase) * fish.length * (isBetta ? 0.055 : 0.035) * u * u;
      return { x: p.x - ty / d * wave, y: p.y + tx / d * wave };
    });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of spine) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const pad = fish.length * (isBetta ? 0.29 : 0.24);
    const firstX = Math.max(0, Math.floor((minX - pad) / this.cellW));
    const lastX = Math.min(Math.ceil(this.width / this.cellW), Math.ceil((maxX + pad) / this.cellW));
    const firstY = Math.max(0, Math.floor((minY - pad) / this.cellH));
    const lastY = Math.min(Math.ceil(this.height / this.cellH), Math.ceil((maxY + pad) / this.cellH));
    const glyphs = ["S", "X", "%", "8", "@", "x"];

    for (let row = firstY; row < lastY; row++) {
      for (let col = firstX; col < lastX; col++) {
        const x = (col + 0.5) * this.cellW;
        const y = (row + 0.5) * this.cellH;
        let best = Infinity;
        let s = 0;
        let v = 0;
        let pastTail = 0;
        for (let i = 0; i < spine.length - 1; i++) {
          const a = spine[i];
          const b = spine[i + 1];
          const vx = b.x - a.x;
          const vy = b.y - a.y;
          const len2 = vx * vx + vy * vy || 1;
          const projection = ((x - a.x) * vx + (y - a.y) * vy) / len2;
          const t = clamp(projection, 0, 1);
          const ox = x - (a.x + t * vx);
          const oy = y - (a.y + t * vy);
          const d2 = ox * ox + oy * oy;
          if (d2 < best) {
            best = d2;
            s = (i + t) / (spine.length - 1);
            v = (vx * oy - vy * ox) / Math.sqrt(len2) / fish.length;
            pastTail = i === spine.length - 2 ? Math.max(0, projection - 1) * Math.sqrt(len2) / fish.length : 0;
          }
        }
        const av = Math.abs(v);
        // The same articulated spine carries several distinct silhouettes.
        // Goldfish have rounder bodies; bettas have slender bodies and flowing fins.
        let halfWidth: number;
        if (s < 0.11) halfWidth = 0.11 * Math.pow(Math.sin((s / 0.11) * Math.PI / 2), 0.6);
        else if (s < 0.3) halfWidth = 0.11 + 0.025 * ease(0.11, 0.3, s);
        else halfWidth = 0.032 + 0.103 * (1 - ease(0.3, 0.76, s));
        halfWidth *= isGoldfish ? 1.28 : isBetta ? 0.82 : 1;
        const body = s < 0.76 && av <= halfWidth && best < (fish.length * 0.21) ** 2;
        const ds = s - 0.20;
        const dv = av - (isGoldfish ? 0.12 : isBetta ? 0.08 : 0.10);
        const along = ds * 0.62 + dv * 0.78;
        const across = -ds * 0.78 + dv * 0.62;
        const sideFin = ((along - 0.065) / 0.10) ** 2 + (across / 0.045) ** 2 < 1;
        const tailStart = isBetta ? 0.60 : isGoldfish ? 0.66 : 0.70;
        const tailSpread = isBetta ? 0.22 : isGoldfish ? 0.18 : 0.15;
        const tailWidth = 0.03 + tailSpread * ease(tailStart, 1, s);
        const notch = isBetta ? 0.18 : isGoldfish ? 0.30 : 0.48;
        const tail = s > tailStart && pastTail < 0.018 && av < tailWidth && (s < 0.87 || av > (s - 0.87) * notch);
        const flowingFin = isBetta && s > 0.31 && s < 0.77 && av > halfWidth
          && av < halfWidth + 0.085 * Math.sin(((s - 0.31) / 0.46) * Math.PI);
        const fin = !body && (sideFin || tail || flowingFin) && best < (fish.length * (isBetta ? 0.27 : 0.23)) ** 2;
        if (!body && !fin) continue;
        const fade = this.fadeAt(x, y) * fish.opacity;
        const h = noise(Math.floor(s * 54), Math.floor(v * 90), fish.id);
        if (fin) {
          const coloredFin = isGoldfish || isBetta;
          ctx.globalAlpha = fade * (coloredFin ? 0.38 + h * 0.20 : 0.17 + h * 0.17);
          ctx.fillStyle = isGoldfish ? palette.goldFin : isBetta ? palette.blueFin : palette.fin;
          ctx.fillRect(col * this.cellW + 1, row * this.cellH + 1, this.cellW - 1, this.cellH - 1);
          ctx.globalAlpha = fade * 0.22;
          ctx.fillStyle = coloredFin ? palette.ink : palette.eye;
          ctx.fillText(h > 0.6 ? "." : h > 0.24 ? ":" : "·", x, y + 1);
          continue;
        }
        // Fixed markings live in body coordinates, so patches travel with each fish.
        const irregular = Math.sin(s * 46 + fish.id) * 0.10 + Math.sin(v * 65 + fish.id * 1.7) * 0.08;
        const oval = (cx: number, cy: number, rx: number, ry: number) => ((s - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 < 1 + irregular;
        let red = false;
        let black = false;
        if (fish.type === "tancho") {
          red = oval(0.10, 0, 0.055, 0.09);
        } else if (!isGoldfish && !isBetta) {
          red = oval(0.10, -0.01, 0.075, 0.11)
            || oval(0.32 + noise(fish.id, 2, 4) * 0.035, 0.01, 0.09, 0.145)
            || oval(0.54, -0.015, 0.085, 0.105);
          if (fish.type === "showa") red = red || oval(0.43, 0.055, 0.07, 0.08);
          if (fish.type === "sanke") {
            black = oval(0.25, -0.065, 0.035, 0.035) || oval(0.43, 0.07, 0.045, 0.045) || oval(0.61, -0.025, 0.03, 0.03);
          }
          if (fish.type === "showa") {
            const whitePatch = oval(0.27, 0.03, 0.09, 0.13) || oval(0.60, -0.025, 0.075, 0.09);
            black = !red && !whitePatch;
          }
        }
        const shade = clamp(Math.floor((1 - av / Math.max(halfWidth, 0.001)) * 2.3 + h * 1.8), 0, 3);
        const goldenHighlight = oval(0.33, 0.01, 0.14, 0.12) || oval(0.56, -0.02, 0.06, 0.08);
        const blueHighlight = Math.sin(s * 24 + v * 21 + fish.id * 0.7) > 0.35;
        ctx.globalAlpha = fade * 0.92;
        ctx.fillStyle = isGoldfish ? (goldenHighlight ? palette.goldHighlight[shade] : palette.gold[shade])
          : isBetta ? (blueHighlight ? palette.violet[shade] : palette.blue[shade])
          : black ? palette.black[shade] : red ? palette.red[shade] : palette.white[shade];
        ctx.fillRect(col * this.cellW + 1, row * this.cellH + 1, this.cellW - 1, this.cellH - 1);
        ctx.globalAlpha = fade * 0.38;
        ctx.fillStyle = palette.ink;
        ctx.fillText(glyphs[Math.floor(h * glyphs.length) % glyphs.length], x, y + 1);
      }
    }

    // Eyes and a pair of fine barbels make the heading easy to read at a glance.
    const a = spine[1];
    const b = spine[2];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const d = Math.hypot(vx, vy) || 1;
    const nx = -vy / d;
    const ny = vx / d;
    for (const side of [-1, 1]) {
      const ex = a.x + nx * fish.length * 0.065 * side;
      const ey = a.y + ny * fish.length * 0.065 * side;
      const col = Math.floor(ex / this.cellW);
      const row = Math.floor(ey / this.cellH);
      if (col < 0 || row < 0 || col * this.cellW > this.width || row * this.cellH > this.height) continue;
      ctx.globalAlpha = fish.opacity * this.fadeAt(ex, ey) * 0.92;
      ctx.fillStyle = palette.black[0];
      ctx.fillRect(col * this.cellW + 1, row * this.cellH + 1, this.cellW - 1, this.cellH - 1);
      ctx.fillStyle = palette.eye;
      ctx.fillText("o", (col + 0.5) * this.cellW, (row + 0.5) * this.cellH + 1);
      if (!isGoldfish && !isBetta) {
        ctx.globalAlpha *= 0.34;
        ctx.fillText(side < 0 ? "/" : "\\", spine[0].x - vx / d * 9 + nx * side * fish.length * 0.05, spine[0].y - vy / d * 9 + ny * side * fish.length * 0.05);
      }
    }
  }
}

export const KoiPond = forwardRef<KoiPondHandle, KoiPondProps>(function KoiPond(
  { fishCount = 6, fishTypes, lotusCount = 3, lotusScale = 1, speed = 1, theme = "dark", interactive = true, paused = false, className, style, children, onStatsChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PondEngine | null>(null);
  const statsRef = useRef(onStatsChange);
  statsRef.current = onStatsChange;
  const options: Options = {
    count: clamp(Number.isFinite(fishCount) ? Math.round(fishCount) : 6, 0, MAX_FISH),
    fishTypes: normalizeFishTypes(fishTypes),
    lotusCount: clamp(Number.isFinite(lotusCount) ? Math.round(lotusCount) : 3, 0, MAX_LOTUS),
    lotusScale: clamp(Number.isFinite(lotusScale) ? lotusScale : 1, 0.5, 1.8),
    speed: clamp(Number.isFinite(speed) ? speed : 1, 0.1, 3),
    theme: theme === "light" ? "light" : "dark",
    interactive,
    paused,
  };
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // Depend on the contents, not the array identity, so inline arrays do not restart the animation.
  const fishTypesKey = options.fishTypes.join("|");

  useImperativeHandle(ref, () => ({
    feed: (x, y) => engineRef.current?.feed(x, y),
    reset: () => engineRef.current?.reset(),
  }), []);

  useEffect(() => {
    if (!canvasRef.current || !hostRef.current) return;
    const engine = new PondEngine(canvasRef.current, hostRef.current, optionsRef.current, (stats) => statsRef.current?.(stats));
    engineRef.current = engine;
    return () => { engine.destroy(); engineRef.current = null; };
  }, []);

  useEffect(() => {
    engineRef.current?.configure(optionsRef.current);
  }, [fishCount, fishTypesKey, lotusCount, lotusScale, speed, theme, interactive, paused]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", isolation: "isolate", backgroundColor: PALETTES[options.theme].background, ...style }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
      />
      {children != null && <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>{children}</div>}
    </div>
  );
});

export default KoiPond;
