import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Hand, Sparkles, Undo2, MoveUpRight } from "lucide-react";
import { PageShell, GradientText, PageLinks } from "@/components/PageShell";
import { RearrangementProof } from "@/components/pitagoras/RearrangementProof";
import { useWindowDrag, clientToSvg } from "@/hooks/use-window-drag";
import { C, soft, fg } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mosaico de Pitágoras — Teorema interativo" },
      {
        name: "description",
        content:
          "Encha os quadrados dos catetos com quadradinhos, leve-os para o quadrado da hipotenusa e veja que cabem exatamente: a² + b² = c².",
      },
      { property: "og:title", content: "Mosaico de Pitágoras — Teorema interativo" },
      {
        property: "og:description",
        content:
          "Verificação visual e interativa do Teorema de Pitágoras: os quadradinhos dos catetos enchem o quadrado da hipotenusa.",
      },
    ],
  }),
  component: Index,
});

type Side = "a" | "b" | "c";
type Leg = "a" | "b";

const ORDER: readonly Side[] = ["a", "b", "c"];
const LEGS: readonly Leg[] = ["a", "b"];
const SIDES: Record<Side, { label: string; desc: string; n: number; color: string; soft: string }> =
  {
    a: { label: "a²", desc: "cateto a", n: 3, color: C.catet1, soft: soft(C.catet1, 14) },
    b: { label: "b²", desc: "cateto b", n: 4, color: C.catet2, soft: soft(C.catet2, 14) },
    c: { label: "c²", desc: "hipotenusa c", n: 5, color: C.brand, soft: soft(C.brand, 16) },
  };
const total = (s: Side) => SIDES[s].n ** 2;

// Geometria: ângulo reto em O=(0,0); a sobre +x, b sobre +y; hipotenusa de P=(3,0) a Q=(0,4).
const U = 46;
const VIEW_W = 12 * U;
const VIEW_H = 11 * U;
const OX = 4.6 * U;
const OY = 7.6 * U;
const sx = (x: number) => OX + x * U;
const sy = (y: number) => OY - y * U;
const pt = (x: number, y: number) => `${sx(x)},${sy(y)}`;

// Eixos ortonormais de cada quadrado, apontando para fora do triângulo (coordenadas matemáticas).
const GRIDS: Record<Side, { origin: [number, number]; e: [number, number]; v: [number, number] }> =
  {
    a: { origin: [0, 0], e: [1, 0], v: [0, -1] },
    b: { origin: [0, 0], e: [0, 1], v: [-1, 0] },
    c: { origin: [3, 0], e: [-3 / 5, 4 / 5], v: [4 / 5, 3 / 5] },
  };

function gridPoint(side: Side, s: number, t: number): [number, number] {
  const { origin, e, v } = GRIDS[side];
  return [origin[0] + e[0] * s + v[0] * t, origin[1] + e[1] * s + v[1] * t];
}

function quad(side: Side, s0: number, t0: number, s1: number, t1: number) {
  return [
    gridPoint(side, s0, t0),
    gridPoint(side, s1, t0),
    gridPoint(side, s1, t1),
    gridPoint(side, s0, t1),
  ]
    .map(([x, y]) => pt(x, y))
    .join(" ");
}

const OUTLINES: Record<Side, string> = {
  a: quad("a", 0, 0, 3, 3),
  b: quad("b", 0, 0, 4, 4),
  c: quad("c", 0, 0, 5, 5),
};

const CELLS: Record<Side, { k: number; points: string }[]> = { a: [], b: [], c: [] };
for (const side of ORDER) {
  const n = SIDES[side].n;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++)
      CELLS[side].push({ k: j * n + i, points: quad(side, i, j, i + 1, j + 1) });
}

/** Qual quadrado contém o ponto (coordenadas matemáticas), com folga de 0.35 unidade. */
const HIT_PAD = 0.35;
function sideAt(mx: number, my: number): Side | null {
  for (const side of ORDER) {
    const { origin, e, v } = GRIDS[side];
    const n = SIDES[side].n;
    const dx = mx - origin[0];
    const dy = my - origin[1];
    const s = dx * e[0] + dy * e[1];
    const t = dx * v[0] + dy * v[1];
    if (s >= -HIT_PAD && s <= n + HIT_PAD && t >= -HIT_PAD && t <= n + HIT_PAD) return side;
  }
  return null;
}

const TAP_THRESHOLD_PX = 6;
const GHOST_SIZE = 40;

/**
 * Os quadradinhos saem da bandeja, vão para a² ou b² e depois são levados para c².
 * `inSquare` conta os que estão em a² e b²; `c` guarda, célula a célula, de qual cateto veio
 * cada quadradinho que está em c². Como 9 + 16 = 25, c² nunca transborda.
 */
type Board = {
  inSquare: Record<Leg, number>;
  c: Leg[];
  last: { side: Side; k: number } | null;
};
const EMPTY_BOARD: Board = { inSquare: { a: 0, b: 0 }, c: [], last: null };

const inC = (b: Board, leg: Leg) => b.c.filter((s) => s === leg).length;
/** Quadradinhos do cateto que já saíram da bandeja (estão em a²/b² ou em c²). */
const used = (b: Board, leg: Leg) => b.inSquare[leg] + inC(b, leg);

/** Um arraste sai da bandeja (vai para o próprio quadrado) ou de a²/b² (vai para c²). */
type Drag = { leg: Leg; from: "tray" | "square" };
const dropTarget = (d: Drag): Side => (d.from === "tray" ? d.leg : "c");

type Hover = { side: Side; ok: boolean } | null;

/** Contorno na cor do fundo para os contadores continuarem legíveis sobre os quadradinhos. */
const HALO = {
  stroke: "var(--ink)",
  strokeWidth: 4,
  strokeLinejoin: "round",
  paintOrder: "stroke",
} as const;

const ICON_BTN =
  "rounded-md border border-fg/10 p-1.5 text-fg/60 transition hover:bg-fg/10 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent";

function Index() {
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ startX: 0, startY: 0, x: 0, y: 0, moved: false });
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { inSquare } = board;
  const complete = board.c.length === total("c");
  const legsFull = LEGS.every((l) => used(board, l) === total(l));

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const notify = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  };

  /** Bandeja → a² ou b². */
  const place = useCallback((leg: Leg) => {
    setBoard((b) => {
      if (used(b, leg) >= total(leg)) return b;
      const k = b.inSquare[leg];
      return { ...b, inSquare: { ...b.inSquare, [leg]: k + 1 }, last: { side: leg, k } };
    });
  }, []);

  /** a² ou b² → bandeja. */
  const returnToTray = useCallback((leg: Leg) => {
    setBoard((b) =>
      b.inSquare[leg] > 0
        ? { ...b, inSquare: { ...b.inSquare, [leg]: b.inSquare[leg] - 1 }, last: null }
        : b,
    );
  }, []);

  /** a² ou b² → c². */
  const moveToC = useCallback((leg: Leg) => {
    setBoard((b) => {
      if (b.inSquare[leg] === 0 || b.c.length >= total("c")) return b;
      return {
        inSquare: { ...b.inSquare, [leg]: b.inSquare[leg] - 1 },
        c: [...b.c, leg],
        last: { side: "c", k: b.c.length },
      };
    });
  }, []);

  const moveAllToC = () => {
    setBoard((b) => ({
      inSquare: { a: 0, b: 0 },
      c: [
        ...b.c,
        ...Array.from({ length: b.inSquare.a }, (): Leg => "a"),
        ...Array.from({ length: b.inSquare.b }, (): Leg => "b"),
      ],
      last: null,
    }));
  };

  /** Último de c² → volta para o quadrado de onde veio. */
  const returnFromC = useCallback(() => {
    setBoard((b) => {
      const leg = b.c[b.c.length - 1];
      if (!leg) return b;
      const k = b.inSquare[leg];
      return {
        inSquare: { ...b.inSquare, [leg]: k + 1 },
        c: b.c.slice(0, -1),
        last: { side: leg, k },
      };
    });
  }, []);

  const commit = (d: Drag) => (d.from === "tray" ? place(d.leg) : moveToC(d.leg));

  const reset = () => {
    setBoard(EMPTY_BOARD);
    setNotice(null);
  };

  const hitTest = (clientX: number, clientY: number): Side | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const { x, y } = clientToSvg(svg, clientX, clientY, VIEW_W, VIEW_H);
    return sideAt((x - OX) / U, (OY - y) / U);
  };

  const moveGhost = (x: number, y: number) => {
    pointer.current.x = x;
    pointer.current.y = y;
    if (ghostRef.current)
      ghostRef.current.style.transform = `translate(${x - GHOST_SIZE / 2}px, ${y - GHOST_SIZE / 2}px)`;
  };

  const endDrag = () => {
    setDrag(null);
    setHover(null);
  };

  const startDrag = (d: Drag, e: React.PointerEvent) => {
    e.preventDefault();
    pointer.current = {
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    setDrag(d);
  };

  useWindowDrag(drag !== null, {
    onMove: (e) => {
      const p = pointer.current;
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > TAP_THRESHOLD_PX) p.moved = true;
      moveGhost(e.clientX, e.clientY);
      const side = hitTest(e.clientX, e.clientY);
      setHover((prev) => {
        const next: Hover = side && drag ? { side, ok: side === dropTarget(drag) } : null;
        return prev?.side === next?.side && prev?.ok === next?.ok ? prev : next;
      });
    },
    onUp: (e) => {
      if (!drag) return;
      const target = hitTest(e.clientX, e.clientY);
      const label = SIDES[drag.leg].label;
      // Toque simples também conta: da bandeja encaixa no quadrado, de a²/b² leva para c².
      if (!pointer.current.moved || target === dropTarget(drag)) commit(drag);
      else if (target && drag.from === "tray")
        notify(
          target === "c"
            ? `Primeiro coloque o quadradinho em ${label}; depois leve os de ${label} para c².`
            : `Esse quadradinho é de ${label}. Solte-o dentro do quadrado ${label}.`,
        );
      else if (target) notify(`Os quadradinhos de ${label} vão para dentro de c².`);
      endDrag();
    },
    onCancel: endDrag,
  });

  return (
    <PageShell
      eyebrow="Verificação visual · a² + b² = c²"
      title={
        <>
          <GradientText>O teorema</GradientText> <GradientText alt>de Pitágoras</GradientText>
        </>
      }
      intro="Encha os quadrados dos catetos com quadradinhos e depois leve-os para o quadrado da hipotenusa: eles cabem exatamente. É a igualdade a² + b² = c² vista como área."
    >
      <div className="mt-12 grid grid-cols-1 items-start gap-10 lg:grid-cols-5">
        {/* Canvas */}
        <section className="lg:col-span-3">
          <div className="relative rounded-3xl border border-fg/10 bg-fg/[0.03] p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-fg/50">
                Triângulo retângulo · {SIDES.a.n}-{SIDES.b.n}-{SIDES.c.n}
              </p>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 rounded-full border border-fg/15 px-3 py-1.5 text-xs text-fg/80 transition hover:bg-fg/5"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reiniciar
              </button>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="mx-auto w-full max-w-[560px] touch-none select-none"
              role="group"
              aria-label="Triângulo retângulo com quadrados construídos sobre os três lados"
            >
              {/* Zonas de soltar */}
              {ORDER.map((s) => {
                const isHover = hover?.side === s;
                const zoneColor = hover?.ok ? SIDES[s].color : "var(--destructive)";
                return (
                  <g key={s}>
                    <polygon
                      points={OUTLINES[s]}
                      fill={
                        isHover ? (hover.ok ? SIDES[s].soft : soft(zoneColor, 12)) : "transparent"
                      }
                      stroke={isHover ? zoneColor : fg(18)}
                      strokeWidth={isHover ? 3 : 2}
                      className="transition-all"
                    />
                    {CELLS[s].map(({ k, points }) => {
                      const isLast = board.last?.side === s && board.last.k === k;
                      if (s === "c") {
                        // Em c², cada quadradinho mantém a cor do cateto de onde veio.
                        const origin = board.c[k];
                        const removable = origin !== undefined && k === board.c.length - 1;
                        return (
                          <polygon
                            key={k}
                            points={points}
                            fill={origin ? SIDES[origin].color : fg(4)}
                            fillOpacity={origin ? 0.9 : 1}
                            stroke={origin ? fg(35) : fg(10)}
                            strokeWidth={1}
                            className={`${isLast ? "tile-pop" : ""} ${removable ? "cursor-pointer" : ""}`}
                            onClick={removable ? returnFromC : undefined}
                          >
                            {removable && (
                              <title>{`Clique para devolver o quadradinho a ${SIDES[origin].label}`}</title>
                            )}
                          </polygon>
                        );
                      }
                      const isFilled = k < inSquare[s];
                      return (
                        <polygon
                          key={k}
                          points={points}
                          fill={isFilled ? SIDES[s].color : fg(4)}
                          fillOpacity={isFilled ? 0.9 : 1}
                          stroke={isFilled ? fg(35) : fg(10)}
                          strokeWidth={1}
                          className={`${isLast ? "tile-pop" : ""} ${isFilled ? "cursor-grab" : ""}`}
                          onPointerDown={
                            isFilled ? (e) => startDrag({ leg: s, from: "square" }, e) : undefined
                          }
                        >
                          {isFilled && (
                            <title>{`Arraste (ou toque) para levar um quadradinho de ${SIDES[s].label} para c²`}</title>
                          )}
                        </polygon>
                      );
                    })}
                  </g>
                );
              })}

              {/* Triângulo */}
              <polygon
                points={`${pt(0, 0)} ${pt(SIDES.a.n, 0)} ${pt(0, SIDES.b.n)}`}
                fill={soft(C.cyan, 12)}
                stroke={C.cyan}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              <polyline
                points={`${pt(0.45, 0)} ${pt(0.45, 0.45)} ${pt(0, 0.45)}`}
                fill="none"
                stroke={C.cyan}
                strokeWidth={2}
              />

              {/* Rótulos dos lados, todos dentro do triângulo */}
              <text
                x={sx(1.5)}
                y={sy(0.3)}
                textAnchor="middle"
                fill={C.catet1}
                fontSize={15}
                fontWeight={600}
              >
                a = {SIDES.a.n}
              </text>
              <text
                x={sx(0.4)}
                y={sy(2)}
                textAnchor="middle"
                transform={`rotate(-90, ${sx(0.4)}, ${sy(2)})`}
                fill={C.catet2}
                fontSize={15}
                fontWeight={600}
              >
                b = {SIDES.b.n}
              </text>
              <text
                x={sx(1.14)}
                y={sy(1.73)}
                textAnchor="middle"
                transform={`rotate(53.13, ${sx(1.14)}, ${sy(1.73)})`}
                fill={C.brandLight}
                fontSize={15}
                fontWeight={600}
              >
                c = {SIDES.c.n}
              </text>

              {/* Contadores no centro de cada quadrado */}
              <text
                x={sx(1.5)}
                y={sy(-1.5)}
                textAnchor="middle"
                fill={C.catet1}
                fontSize={17}
                fontWeight={700}
                pointerEvents="none"
                {...HALO}
              >
                {inSquare.a}/{total("a")}
              </text>
              <text
                x={sx(-2)}
                y={sy(2.1)}
                textAnchor="middle"
                fill={C.catet2}
                fontSize={17}
                fontWeight={700}
                pointerEvents="none"
                {...HALO}
              >
                {inSquare.b}/{total("b")}
              </text>
              <text
                x={sx(3.5)}
                y={sy(3.5)}
                textAnchor="middle"
                fill={C.brandText}
                fontSize={17}
                fontWeight={700}
                pointerEvents="none"
                {...HALO}
              >
                {board.c.length}/{total("c")}
              </text>
              {board.c.length > 0 && (
                <text
                  x={sx(3.5)}
                  y={sy(3.5) + 20}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill={fg(60)}
                  pointerEvents="none"
                  {...HALO}
                >
                  <tspan fill={C.catet1}>{inC(board, "a")} de a²</tspan> +{" "}
                  <tspan fill={C.catet2}>{inC(board, "b")} de b²</tspan>
                </text>
              )}
            </svg>
            <p className="mt-4 flex items-center gap-2 text-sm text-fg/60">
              <Hand className="h-4 w-4 text-cyan-accent" aria-hidden />
              {legsFull || board.c.length > 0
                ? "Agora arraste os quadradinhos de a² e b² para dentro de c², ou toque neles."
                : "Arraste os quadradinhos da bandeja para o quadrado da mesma cor, ou toque neles."}
            </p>
            <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-catet1">
              {notice}
            </p>
          </div>
        </section>

        {/* Coluna lateral */}
        <aside className="space-y-4 lg:col-span-2">
          {/* Bandeja */}
          <div className="rounded-2xl border border-fg/10 bg-fg/[0.03] p-5">
            <p className="font-display font-semibold">Bandeja de quadradinhos</p>
            <p className="mt-1 text-sm text-fg/60">
              Cada quadradinho vale 1 unidade de área. Primeiro encha a² e b²; depois leve tudo para
              c². Arraste, toque ou pressione Enter.
            </p>
            <div className="mt-4 space-y-3">
              {LEGS.map((s) => {
                const remaining = total(s) - used(board, s);
                const done = remaining === 0;
                const moved = inC(board, s);
                return (
                  <div
                    key={s}
                    className="flex items-center gap-3 rounded-xl border border-fg/10 p-3 transition hover:bg-fg/5"
                  >
                    <button
                      type="button"
                      disabled={done}
                      aria-label={`Colocar um quadradinho em ${SIDES[s].label} (${remaining} na bandeja)`}
                      onPointerDown={(e) => {
                        if (!done) startDrag({ leg: s, from: "tray" }, e);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          place(s);
                        }
                      }}
                      className="grid h-10 w-10 shrink-0 cursor-grab touch-none grid-cols-2 gap-0.5 rounded-md p-1 active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                      style={{
                        backgroundColor: SIDES[s].soft,
                        border: `1px solid ${soft(SIDES[s].color, 35)}`,
                      }}
                    >
                      {Array.from({ length: 4 }).map((_, i) => (
                        <span
                          key={i}
                          className="rounded-[2px]"
                          style={{ backgroundColor: SIDES[s].color }}
                        />
                      ))}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-display text-sm font-semibold"
                        style={{ color: SIDES[s].color }}
                      >
                        Quadrados de {SIDES[s].label}{" "}
                        <span className="font-normal text-fg/50">({SIDES[s].desc})</span>
                      </p>
                      <p className="text-xs text-fg/60">
                        {done ? "Bandeja vazia" : `${remaining} na bandeja`}
                        {moved > 0 && ` · ${moved} já em c²`}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-fg/10">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(used(board, s) / total(s)) * 100}%`,
                            backgroundColor: SIDES[s].color,
                          }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={inSquare[s] === 0}
                      onClick={() => returnToTray(s)}
                      aria-label={`Devolver à bandeja o último quadradinho de ${SIDES[s].label}`}
                      title="Devolver à bandeja"
                      className={ICON_BTN}
                    >
                      <Undo2 className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={inSquare[s] === 0}
                      onClick={() => moveToC(s)}
                      aria-label={`Levar um quadradinho de ${SIDES[s].label} para c²`}
                      title="Levar um para c²"
                      className={ICON_BTN}
                    >
                      <MoveUpRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                );
              })}

              <div className="flex items-center gap-3 rounded-xl border border-brand/30 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-brand-text">
                    Quadrado c² <span className="font-normal text-fg/50">(hipotenusa)</span>
                  </p>
                  <p className="text-xs text-fg/60">
                    {board.c.length} de {total("c")} lugares ocupados
                  </p>
                </div>
                <button
                  type="button"
                  disabled={inSquare.a + inSquare.b === 0}
                  onClick={moveAllToC}
                  className="rounded-full border border-fg/15 px-3 py-1.5 text-xs text-fg/80 transition hover:bg-fg/5 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  Levar tudo para c²
                </button>
                <button
                  type="button"
                  disabled={board.c.length === 0}
                  onClick={returnFromC}
                  aria-label="Devolver o último quadradinho de c² ao seu cateto"
                  title="Devolver o último de c²"
                  className={ICON_BTN}
                >
                  <Undo2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {/* Fórmula / resultado */}
          <div
            className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${
              complete ? "border-brand/60 bg-brand/10" : "border-fg/10 bg-fg/[0.03]"
            }`}
            aria-live="polite"
          >
            {complete && (
              <div className="animate-glow-pulse pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/20 via-cyan-accent/20 to-brand/20" />
            )}
            <p className="relative text-[11px] uppercase tracking-[0.2em] text-fg/50">
              {complete ? "O momento pitagórico" : "A fórmula"}
            </p>
            <div className="relative mt-3 flex items-end justify-center gap-3 font-display text-4xl font-bold">
              <span className="text-catet1">{used(board, "a")}</span>
              <span className="pb-0.5 text-2xl text-fg/50">+</span>
              <span className="text-catet2">{used(board, "b")}</span>
              <span className="pb-0.5 text-2xl text-fg/50">{complete ? "=" : "?"}</span>
              <span className="text-brand">{board.c.length}</span>
            </div>
            <p className="relative mt-3 text-center text-sm text-fg/60">
              {complete ? (
                <span className="inline-flex items-center gap-2 font-medium text-fg">
                  <Sparkles className="h-4 w-4 shrink-0 text-cyan-accent" aria-hidden />
                  {total("a")} + {total("b")} = {total("c")}: os quadradinhos de a² e b² encheram
                  c², sem sobrar nem faltar. a² + b² = c²!
                </span>
              ) : legsFull ? (
                "Agora leve os quadradinhos de a² e b² para dentro de c²."
              ) : (
                "Encha a² e b² com os quadradinhos da bandeja."
              )}
            </p>
          </div>

          {/* Passos */}
          <div className="rounded-2xl border border-fg/10 bg-fg/[0.03] p-5">
            <p className="font-display font-semibold">A ideia do teorema</p>
            <ol className="mt-3 space-y-3 text-sm text-fg/60">
              {[
                {
                  n: 1,
                  cls: "bg-catet1/20 text-catet1",
                  text: "Construa um quadrado sobre cada lado do triângulo retângulo.",
                },
                {
                  n: 2,
                  cls: "bg-catet2/20 text-catet2",
                  text: "Encha os quadrados dos catetos com quadradinhos unitários: 9 em a² e 16 em b².",
                },
                {
                  n: 3,
                  cls: "bg-brand/20 text-brand",
                  text: "Leve esses mesmos quadradinhos para o quadrado da hipotenusa: eles enchem c² exatamente.",
                },
              ].map((step) => (
                <li key={step.n} className="flex gap-3">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md font-display text-xs font-bold ${step.cls}`}
                  >
                    {step.n}
                  </span>
                  {step.text}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-fg/50">
              Isto é uma verificação no triângulo 3-4-5, não uma prova: contar quadradinhos só
              funciona quando os lados são inteiros. Logo abaixo está uma prova que vale para
              qualquer triângulo retângulo.
            </p>
          </div>
        </aside>
      </div>

      <RearrangementProof />

      <PageLinks
        links={[
          {
            to: "/trigonometria",
            eyebrow: "Próximo passo",
            title: "Seno, cosseno e tangente",
            desc: "O mesmo triângulo dentro de um círculo de raio 1.",
          },
          {
            to: "/similaridade",
            eyebrow: "Aplicação moderna",
            title: "Cosseno nos transformers",
            desc: "O cosseno comparando vetores de palavras, e a ideia da atenção.",
            accent: "brand",
          },
          {
            to: "/produtos-vetoriais",
            eyebrow: "Vetores",
            title: "Produto escalar e vetorial",
            desc: "Duas operações entre vetores, no plano.",
          },
        ]}
      />

      {/* Fantasma do arraste: posicionado via ref, sem re-renderizar a página a cada pixel */}
      {drag && (
        <div
          ref={ghostRef}
          className="pointer-events-none fixed top-0 left-0 z-50 rounded-md"
          style={{
            width: GHOST_SIZE,
            height: GHOST_SIZE,
            transform: `translate(${pointer.current.x - GHOST_SIZE / 2}px, ${pointer.current.y - GHOST_SIZE / 2}px)`,
            backgroundColor: SIDES[drag.leg].color,
            boxShadow: `0 8px 24px ${soft(SIDES[drag.leg].color, 40)}`,
          }}
        />
      )}
    </PageShell>
  );
}
