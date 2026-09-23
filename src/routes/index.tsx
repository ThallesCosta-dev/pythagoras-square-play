import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Hand, Sparkles, Undo2 } from "lucide-react";
import { PageShell, GradientText, PageLinks } from "@/components/PageShell";
import { useWindowDrag, clientToSvg } from "@/hooks/use-window-drag";
import { C, soft, fg } from "@/lib/theme";

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
    ],
  }),
  component: Index,
});

type Side = "a" | "b" | "c";

const ORDER: readonly Side[] = ["a", "b", "c"];
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

type Board = { filled: Record<Side, number>; last: { side: Side; k: number } | null };
const EMPTY_BOARD: Board = { filled: { a: 0, b: 0, c: 0 }, last: null };

type Hover = { side: Side; ok: boolean } | null;

function Index() {
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [dragSide, setDragSide] = useState<Side | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ startX: 0, startY: 0, x: 0, y: 0, moved: false });
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { filled } = board;
  const complete = ORDER.every((s) => filled[s] === total(s));

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const notify = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2200);
  };

  const place = useCallback((side: Side) => {
    setBoard((b) => {
      const k = b.filled[side];
      if (k >= total(side)) return b;
      return { filled: { ...b.filled, [side]: k + 1 }, last: { side, k } };
    });
  }, []);

  const removeLast = useCallback((side: Side) => {
    setBoard((b) =>
      b.filled[side] > 0 ? { filled: { ...b.filled, [side]: b.filled[side] - 1 }, last: null } : b,
    );
  }, []);

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
    setDragSide(null);
    setHover(null);
  };

  const onTilePointerDown = (side: Side, e: React.PointerEvent) => {
    if (filled[side] >= total(side)) return;
    e.preventDefault();
    pointer.current = {
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    setDragSide(side);
  };

  useWindowDrag(dragSide !== null, {
    onMove: (e) => {
      const p = pointer.current;
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > TAP_THRESHOLD_PX) p.moved = true;
      moveGhost(e.clientX, e.clientY);
      const side = hitTest(e.clientX, e.clientY);
      setHover((prev) => {
        const next: Hover = side ? { side, ok: side === dragSide } : null;
        return prev?.side === next?.side && prev?.ok === next?.ok ? prev : next;
      });
    },
    onUp: (e) => {
      if (!dragSide) return;
      const target = hitTest(e.clientX, e.clientY);
      if (target === dragSide) place(dragSide);
      else if (target)
        notify(
          `Esse quadradinho é de ${SIDES[dragSide].label}. Solte-o dentro do quadrado ${SIDES[dragSide].label}.`,
        );
      else if (!pointer.current.moved) place(dragSide); // toque simples também posiciona
      endDrag();
    },
    onCancel: endDrag,
  });

  return (
    <PageShell
      eyebrow="Demonstração visual · c² = a² + b²"
      title={
        <>
          <GradientText>O teorema</GradientText> <GradientText alt>de Pitágoras</GradientText>
        </>
      }
      intro="Arraste os quadradinhos para dentro de cada quadrado e descubra, com as próprias mãos, por que a área da hipotenusa é igual à soma das áreas dos catetos."
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
                      const isFilled = k < filled[s];
                      const isLast = board.last?.side === s && board.last.k === k;
                      const removable = isFilled && k === filled[s] - 1;
                      return (
                        <polygon
                          key={k}
                          points={points}
                          fill={isFilled ? SIDES[s].color : fg(4)}
                          fillOpacity={isFilled ? 0.9 : 1}
                          stroke={isFilled ? fg(35) : fg(10)}
                          strokeWidth={1}
                          className={`${isLast ? "tile-pop" : ""} ${removable ? "cursor-pointer" : ""}`}
                          onClick={removable ? () => removeLast(s) : undefined}
                        >
                          {removable && <title>Clique para devolver o quadradinho</title>}
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
              >
                {filled.a}/{total("a")}
              </text>
              <text
                x={sx(-2)}
                y={sy(2.1)}
                textAnchor="middle"
                fill={C.catet2}
                fontSize={17}
                fontWeight={700}
              >
                {filled.b}/{total("b")}
              </text>
              <text
                x={sx(3.5)}
                y={sy(3.5)}
                textAnchor="middle"
                fill={C.brandText}
                fontSize={17}
                fontWeight={700}
              >
                {filled.c}/{total("c")}
              </text>
            </svg>
            <p className="mt-4 flex items-center gap-2 text-sm text-fg/60">
              <Hand className="h-4 w-4 text-cyan-accent" aria-hidden />
              Arraste os quadradinhos da bandeja para o quadrado da mesma cor, ou toque neles.
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
              Cada quadradinho vale 1 unidade de área. Arraste, toque ou pressione Enter para
              encaixar.
            </p>
            <div className="mt-4 space-y-3">
              {ORDER.map((s) => {
                const remaining = total(s) - filled[s];
                const done = remaining === 0;
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                      done ? "border-fg/5 opacity-40" : "border-fg/10 hover:bg-fg/5"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={done}
                      aria-label={`Colocar um quadradinho em ${SIDES[s].label} (${remaining} restantes)`}
                      onPointerDown={(e) => onTilePointerDown(s, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          place(s);
                        }
                      }}
                      className="grid h-10 w-10 shrink-0 cursor-grab touch-none grid-cols-2 gap-0.5 rounded-md p-1 active:cursor-grabbing disabled:cursor-default"
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
                        {done ? "Quadrado completo!" : `${remaining} restantes`}
                      </p>
                    </div>
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-fg/10">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(filled[s] / total(s)) * 100}%`,
                          backgroundColor: SIDES[s].color,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={filled[s] === 0}
                      onClick={() => removeLast(s)}
                      aria-label={`Devolver o último quadradinho de ${SIDES[s].label}`}
                      title="Devolver o último quadradinho"
                      className="rounded-md border border-fg/10 p-1.5 text-fg/60 transition hover:bg-fg/10 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Undo2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                );
              })}
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
              <span className="text-catet1">{filled.a}</span>
              <span className="pb-0.5 text-2xl text-fg/50">+</span>
              <span className="text-catet2">{filled.b}</span>
              <span className="pb-0.5 text-2xl text-fg/50">{complete ? "=" : "?"}</span>
              <span className="text-brand">{complete ? filled.c : "?"}</span>
            </div>
            <p className="relative mt-3 text-center text-sm text-fg/60">
              {complete ? (
                <span className="inline-flex items-center gap-2 font-medium text-fg">
                  <Sparkles className="h-4 w-4 text-cyan-accent" aria-hidden />
                  {total("a")} + {total("b")} = {total("c")} — os catetos enchem a hipotenusa. a² +
                  b² = c²!
                </span>
              ) : (
                "Complete os três quadrados para revelar a igualdade."
              )}
            </p>
          </div>

          {/* Passos */}
          <div className="rounded-2xl border border-fg/10 bg-fg/[0.03] p-5">
            <p className="font-display font-semibold">Como Pitágoras pensou</p>
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
                  text: "Encha cada quadrado com quadradinhos unitários e conte quantos cabem.",
                },
                {
                  n: 3,
                  cls: "bg-brand/20 text-brand",
                  text: "Compare: os quadradinhos dos dois catetos sempre somam os da hipotenusa.",
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
          </div>
        </aside>
      </div>

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
            desc: "Como modelos de linguagem medem parecença entre palavras.",
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
      {dragSide && (
        <div
          ref={ghostRef}
          className="pointer-events-none fixed top-0 left-0 z-50 rounded-md"
          style={{
            width: GHOST_SIZE,
            height: GHOST_SIZE,
            transform: `translate(${pointer.current.x - GHOST_SIZE / 2}px, ${pointer.current.y - GHOST_SIZE / 2}px)`,
            backgroundColor: SIDES[dragSide].color,
            boxShadow: `0 8px 24px ${soft(SIDES[dragSide].color, 40)}`,
          }}
        />
      )}
    </PageShell>
  );
}
