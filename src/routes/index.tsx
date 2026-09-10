import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Hand, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mosaico de Pitágoras — Teorema interativo" },
      {
        name: "description",
        content:
          "Encha os quadrados dos catetos e da hipotenusa com quadradinhos e descubra, como Pitágoras, que a² + b² = c².",
      },
      { property: "og:title", content: "Mosaico de Pitágoras — Teorema interativo" },
      {
        property: "og:description",
        content:
          "Demonstração visual e interativa do Teorema de Pitágoras: arraste os quadradinhos e veja a igualdade aparecer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const A = 3;
const B = 4;
const C = 5;
const U = 46;

type Side = "a" | "b" | "c";

const SIDES: Record<
  Side,
  { label: string; desc: string; n: number; color: string; soft: string }
> = {
  a: { label: "a²", desc: "cateto a", n: A, color: "#fbbf24", soft: "rgba(251,191,36,0.14)" },
  b: { label: "b²", desc: "cateto b", n: B, color: "#34d399", soft: "rgba(52,211,153,0.14)" },
  c: { label: "c²", desc: "hipotenusa c", n: C, color: "#6366f1", soft: "rgba(99,102,241,0.16)" },
};

// Math coords: right angle at O=(0,0); a along +x, b along +y, hypotenuse from P=(3,0) to Q=(0,4).
const OX = 4.6 * U;
const OY = 7.6 * U;
const sx = (x: number) => OX + x * U;
const sy = (y: number) => OY - y * U;
const pt = (x: number, y: number) => `${sx(x)},${sy(y)}`;

// Per-cell outward axes (unit vectors in math coords)
const GRIDS: Record<Side, { origin: [number, number]; e: [number, number]; v: [number, number] }> = {
  a: { origin: [0, 0], e: [1, 0], v: [0, -1] },
  b: { origin: [0, 0], e: [0, 1], v: [-1, 0] },
  c: { origin: [3, 0], e: [-3 / 5, 4 / 5], v: [4 / 5, 3 / 5] },
};

function cellPolygon(side: Side, i: number, j: number) {
  const { origin, e, v } = GRIDS[side];
  const corner = (di: number, dj: number): [number, number] => [
    origin[0] + e[0] * (i + di) + v[0] * (j + dj),
    origin[1] + e[1] * (i + di) + v[1] * (j + dj),
  ];
  const [x1, y1] = corner(0, 0);
  const [x2, y2] = corner(1, 0);
  const [x3, y3] = corner(1, 1);
  const [x4, y4] = corner(0, 1);
  return `${pt(x1, y1)} ${pt(x2, y2)} ${pt(x3, y3)} ${pt(x4, y4)}`;
}

function Index() {
  const [filled, setFilled] = useState<Record<Side, number>>({ a: 0, b: 0, c: 0 });
  const [drag, setDrag] = useState<{ side: Side; x: number; y: number } | null>(null);
  const [hoverSide, setHoverSide] = useState<Side | null>(null);
  const [lastPlaced, setLastPlaced] = useState<{ side: Side; k: number; t: number } | null>(null);
  const zoneRefs = useRef<Record<Side, SVGGElement | null>>({ a: null, b: null, c: null });
  const dragMoved = useRef(false);

  const total = (s: Side) => SIDES[s].n * SIDES[s].n;
  const complete = filled.a === 9 && filled.b === 16 && filled.c === 25;

  const place = useCallback((side: Side) => {
    setFilled((f) => {
      if (f[side] >= total(side)) return f;
      const k = f[side];
      setLastPlaced({ side, k, t: Date.now() });
      return { ...f, [side]: f[side] + 1 };
    });
  }, []);

  const removeLast = useCallback((side: Side) => {
    setFilled((f) => (f[side] > 0 ? { ...f, [side]: f[side] - 1 } : f));
  }, []);

  const reset = () => {
    setFilled({ a: 0, b: 0, c: 0 });
    setLastPlaced(null);
  };

  const hitTest = (x: number, y: number): Side | null => {
    for (const s of ["a", "b", "c"] as Side[]) {
      const el = zoneRefs.current[s];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const pad = 18;
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad)
        return s;
    }
    return null;
  };

  const onTilePointerDown = (side: Side, e: React.PointerEvent) => {
    if (filled[side] >= total(side)) return;
    e.preventDefault();
    dragMoved.current = false;
    setDrag({ side, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      dragMoved.current = true;
      setDrag({ side: drag.side, x: e.clientX, y: e.clientY });
      setHoverSide(hitTest(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const target = hitTest(e.clientX, e.clientY);
      if (target) place(target);
      else if (!dragMoved.current) place(drag.side); // simple tap also places
      setDrag(null);
      setHoverSide(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.side, place]);

  const cells = useMemo(() => {
    const out: Record<Side, { i: number; j: number; k: number; points: string }[]> = {
      a: [],
      b: [],
      c: [],
    };
    (Object.keys(SIDES) as Side[]).forEach((s) => {
      const n = SIDES[s].n;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++)
          out[s].push({ i, j, k: j * n + i, points: cellPolygon(s, i, j) });
    });
    return out;
  }, []);

  const outline = (s: Side) => {
    const { origin, e, v } = GRIDS[s];
    const n = SIDES[s].n;
    const c = (di: number, dj: number): [number, number] => [
      origin[0] + e[0] * di * n + v[0] * dj * n,
      origin[1] + e[1] * di * n + v[1] * dj * n,
    ];
    const [x1, y1] = c(0, 0);
    const [x2, y2] = c(1, 0);
    const [x3, y3] = c(1, 1);
    const [x4, y4] = c(0, 1);
    return `${pt(x1, y1)} ${pt(x2, y2)} ${pt(x3, y3)} ${pt(x4, y4)}`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink font-body text-foreground antialiased">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-brand/25 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[560px] w-[560px] rounded-full bg-cyan-accent/15 blur-[130px]" />

      {/* Header */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand to-cyan-accent font-display text-lg font-bold text-white">
            π
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-bold tracking-tight">Mosaico de Pitágoras</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">
              Teorema interativo
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
        >
          <RotateCcw className="h-4 w-4" />
          Reiniciar
        </button>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pt-2 pb-16">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-accent">
          Demonstração visual · c² = a² + b²
        </p>
        <h1 className="font-display text-[clamp(2.2rem,6vw,4.5rem)] font-bold leading-[0.95] tracking-tight">
          <span className="bg-gradient-to-r from-white via-brand to-cyan-accent bg-clip-text text-transparent">
            O teorema
          </span>{" "}
          <span className="bg-gradient-to-r from-cyan-accent via-brand to-catet1 bg-clip-text text-transparent">
            de Pitágoras
          </span>
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-white/60">
          Arraste os quadradinhos para dentro de cada quadrado e descubra, com as próprias mãos,
          por que a área da hipotenusa é igual à soma das áreas dos catetos.
        </p>

        <div className="mt-12 grid grid-cols-1 items-start gap-10 lg:grid-cols-5">
          {/* Canvas */}
          <section className="lg:col-span-3">
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-white/40">
                Triângulo retângulo · 3-4-5
              </p>
              <svg
                viewBox={`0 0 ${12 * U} ${11 * U}`}
                className="mx-auto w-full max-w-[560px] touch-none select-none"
                role="img"
                aria-label="Triângulo retângulo com quadrados construídos sobre os três lados"
              >
                {/* Square drop zones */}
                {(["a", "b", "c"] as Side[]).map((s) => (
                  <g
                    key={s}
                    ref={(el) => {
                      zoneRefs.current[s] = el;
                    }}
                  >
                    <polygon
                      points={outline(s)}
                      fill={hoverSide === s ? SIDES[s].soft : "transparent"}
                      stroke={hoverSide === s ? SIDES[s].color : "rgba(255,255,255,0.18)"}
                      strokeWidth={hoverSide === s ? 3 : 2}
                      className="transition-all"
                    />
                    {cells[s].map(({ k, points }) => {
                      const isFilled = k < filled[s];
                      const isLast = lastPlaced?.side === s && lastPlaced.k === k;
                      return (
                        <polygon
                          key={k}
                          points={points}
                          fill={isFilled ? SIDES[s].color : "rgba(255,255,255,0.04)"}
                          fillOpacity={isFilled ? 0.9 : 1}
                          stroke={isFilled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.10)"}
                          strokeWidth={1}
                          className={`${isFilled && isLast ? "tile-pop" : ""} ${isFilled ? "cursor-pointer" : ""}`}
                          onClick={() => {
                            if (isFilled && k === filled[s] - 1) removeLast(s);
                          }}
                        >
                          <title>
                            {isFilled ? "Clique para devolver o quadradinho" : "Espaço vazio"}
                          </title>
                        </polygon>
                      );
                    })}
                  </g>
                ))}

                {/* Triangle */}
                <polygon
                  points={`${pt(0, 0)} ${pt(A, 0)} ${pt(0, B)}`}
                  fill="rgba(34,211,238,0.12)"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
                {/* Right angle marker */}
                <polyline
                  points={`${pt(0.45, 0)} ${pt(0.45, 0.45)} ${pt(0, 0.45)}`}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={2}
                />

                {/* Labels */}
                <text x={sx(1.5)} y={sy(0.55)} textAnchor="middle" fill="#fbbf24" fontSize={15} fontWeight={600}>
                  a = 3
                </text>
                <text x={sx(-0.55)} y={sy(2)} textAnchor="middle" fill="#34d399" fontSize={15} fontWeight={600}>
                  b = 4
                </text>
                <text x={sx(2.15)} y={sy(2.35)} textAnchor="middle" fill="#818cf8" fontSize={15} fontWeight={600}>
                  c = 5
                </text>
                <text x={sx(1.5)} y={sy(-1.5)} textAnchor="middle" fill="#fbbf24" fontSize={17} fontWeight={700}>
                  {filled.a}/9
                </text>
                <text x={sx(-2)} y={sy(2.1)} textAnchor="middle" fill="#34d399" fontSize={17} fontWeight={700}>
                  {filled.b}/16
                </text>
                <text
                  x={sx(3.5)}
                  y={sy(3.5)}
                  textAnchor="middle"
                  fill="#a5b4fc"
                  fontSize={17}
                  fontWeight={700}
                >
                  {filled.c}/25
                </text>
              </svg>
              <p className="mt-4 flex items-center gap-2 text-sm text-white/50">
                <Hand className="h-4 w-4 text-cyan-accent" />
                Arraste os quadradinhos da bandeja para dentro dos quadrados — ou toque neles.
              </p>
            </div>
          </section>

          {/* Side column */}
          <aside className="space-y-4 lg:col-span-2">
            {/* Tray */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="font-display font-semibold">Bandeja de quadradinhos</p>
              <p className="mt-1 text-sm text-white/50">
                Cada quadradinho vale 1 unidade de área. Arraste para encaixar.
              </p>
              <div className="mt-4 space-y-3">
                {(["a", "b", "c"] as Side[]).map((s) => {
                  const remaining = total(s) - filled[s];
                  return (
                    <div
                      key={s}
                      onPointerDown={(e) => onTilePointerDown(s, e)}
                      className={`flex cursor-grab touch-none items-center gap-3 rounded-xl border p-3 transition active:cursor-grabbing ${
                        remaining === 0
                          ? "border-white/5 opacity-40"
                          : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <div
                        className="grid h-10 w-10 shrink-0 grid-cols-2 gap-0.5 rounded-md p-1"
                        style={{ backgroundColor: SIDES[s].soft, border: `1px solid ${SIDES[s].color}55` }}
                      >
                        {Array.from({ length: 4 }).map((_, i) => (
                          <span key={i} className="rounded-[2px]" style={{ backgroundColor: SIDES[s].color }} />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-semibold" style={{ color: SIDES[s].color }}>
                          Quadrados de {SIDES[s].label}{" "}
                          <span className="font-normal text-white/40">({SIDES[s].desc})</span>
                        </p>
                        <p className="text-xs text-white/50">
                          {remaining === 0 ? "Quadrado completo!" : `${remaining} restantes`}
                        </p>
                      </div>
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(filled[s] / total(s)) * 100}%`,
                            backgroundColor: SIDES[s].color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formula / result */}
            <div
              className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${
                complete ? "border-brand/60 bg-brand/10" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {complete && (
                <div className="animate-glow-pulse pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/20 via-cyan-accent/20 to-brand/20" />
              )}
              <p className="relative text-[11px] uppercase tracking-[0.2em] text-white/40">
                {complete ? "O momento pitagórico" : "A fórmula"}
              </p>
              <div className="relative mt-3 flex items-end justify-center gap-3 font-display text-4xl font-bold">
                <span className="text-catet1">{filled.a}</span>
                <span className="pb-0.5 text-2xl text-white/40">+</span>
                <span className="text-catet2">{filled.b}</span>
                <span className="pb-0.5 text-2xl text-white/40">
                  {complete ? "=" : "?"}
                </span>
                <span className="text-brand">{complete ? filled.c : "?"}</span>
              </div>
              <p className="relative mt-3 text-center text-sm text-white/60">
                {complete ? (
                  <span className="inline-flex items-center gap-2 font-medium text-white">
                    <Sparkles className="h-4 w-4 text-cyan-accent" />
                    9 + 16 = 25 — os catetos enchem a hipotenusa. a² + b² = c²!
                  </span>
                ) : (
                  "Complete os três quadrados para revelar a igualdade."
                )}
              </p>
            </div>

            {/* Steps */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="font-display font-semibold">Como Pitágoras pensou</p>
              <ol className="mt-3 space-y-3 text-sm text-white/60">
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-catet1/20 font-display text-xs font-bold text-catet1">
                    1
                  </span>
                  Construa um quadrado sobre cada lado do triângulo retângulo.
                </li>
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-catet2/20 font-display text-xs font-bold text-catet2">
                    2
                  </span>
                  Encha cada quadrado com quadradinhos unitários e conte quantos cabem.
                </li>
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/20 font-display text-xs font-bold text-brand">
                    3
                  </span>
                  Compare: os quadradinhos dos dois catetos sempre somam os da hipotenusa.
                </li>
              </ol>
            </div>
          </aside>
        </div>
      </main>

      {/* Drag ghost */}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 h-10 w-10 rounded-md shadow-lg"
          style={{
            left: drag.x - 20,
            top: drag.y - 20,
            backgroundColor: SIDES[drag.side].color,
            boxShadow: `0 8px 24px ${SIDES[drag.side].color}66`,
          }}
        />
      )}
    </div>
  );
}
