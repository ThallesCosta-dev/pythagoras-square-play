import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/produtos-vetoriais")({
  head: () => ({
    meta: [
      { title: "Produto escalar e vetorial — vetores 2D" },
      {
        name: "description",
        content:
          "Mova dois vetores e acompanhe o produto escalar e o produto vetorial em duas dimensões.",
      },
      { property: "og:title", content: "Produto escalar e vetorial — vetores 2D" },
      {
        property: "og:description",
        content:
          "Uma visualização interativa para explorar alinhamento, área e a resultante do produto vetorial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProdutosVetoriais,
});

type Vector = { x: number; y: number };

const SIZE = 560;
const CENTER = SIZE / 2;
const UNIT = 48;
const sx = (x: number) => CENTER + x * UNIT;
const sy = (y: number) => CENTER - y * UNIT;
const clamp = (value: number) => Math.max(-5.1, Math.min(5.1, value));

function ProdutosVetoriais() {
  const [a, setA] = useState<Vector>({ x: 4, y: 2 });
  const [b, setB] = useState<Vector>({ x: 1, y: 4 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<"a" | "b" | null>(null);

  const dotX = a.x * b.x;
  const dotY = a.y * b.y;
  const dot = dotX + dotY;
  const crossFirst = a.x * b.y;
  const crossSecond = a.y * b.x;
  const cross = crossFirst - crossSecond;
  const angle = Math.acos(
    Math.max(
      -1,
      Math.min(1, dot / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y) || 1)),
    ),
  );

  const setFromPointer = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const target = dragging.current;
    if (!svg || !target) return;
    const bounds = svg.getBoundingClientRect();
    const vector = {
      x: Math.round(clamp((((clientX - bounds.left) / bounds.width) * SIZE - CENTER) / UNIT)),
      y: Math.round(clamp((CENTER - ((clientY - bounds.top) / bounds.height) * SIZE) / UNIT)),
    };
    if (target === "a") setA(vector);
    else setB(vector);
  };

  useEffect(() => {
    const move = (event: PointerEvent) => setFromPointer(event.clientX, event.clientY);
    const up = () => {
      dragging.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div className="min-h-screen bg-ink font-body text-foreground antialiased">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-accent">
          Vetores no plano · duas operações
        </p>
        <h1 className="max-w-4xl font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-none">
          Produto <span className="text-catet1">escalar</span> e produto{" "}
          <span className="text-catet2">vetorial</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">
          Arraste as pontas dos vetores. O produto escalar mede o alinhamento; o produto vetorial
          mede a área orientada entre eles e aponta para fora do plano.
        </p>

        <div className="mt-9 grid items-start gap-7 lg:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Plano cartesiano</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-catet1">A = ({a.x}, {a.y})</span>
                <span className="text-catet2">B = ({b.x}, {b.y})</span>
                <span className="text-cross-result">A × B = (0, 0, {cross})</span>
              </div>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="mx-auto aspect-square w-full max-w-[560px] touch-none select-none"
              role="img"
              aria-label="Dois vetores arrastáveis e a resultante do produto vetorial em um plano cartesiano"
            >
              <defs>
                <marker id="arrow-a" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                  <path d="M0 1 L11 6 L0 11 Z" fill="var(--catet1)" />
                </marker>
                <marker id="arrow-b" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                  <path d="M0 1 L11 6 L0 11 Z" fill="var(--catet2)" />
                </marker>
              </defs>
              {Array.from({ length: 11 }, (_, index) => index - 5).map((value) => (
                <g key={value}>
                  <line x1={sx(value)} y1={20} x2={sx(value)} y2={SIZE - 20} stroke="rgb(255 255 255 / 0.06)" />
                  <line x1={20} y1={sy(value)} x2={SIZE - 20} y2={sy(value)} stroke="rgb(255 255 255 / 0.06)" />
                  {value !== 0 && (
                    <>
                      <text x={sx(value)} y={CENTER + 20} textAnchor="middle" fill="rgb(255 255 255 / 0.35)" fontSize="11">{value}</text>
                      <text x={CENTER - 13} y={sy(value) + 4} textAnchor="end" fill="rgb(255 255 255 / 0.35)" fontSize="11">{value}</text>
                    </>
                  )}
                </g>
              ))}
              <line x1={20} y1={CENTER} x2={SIZE - 20} y2={CENTER} stroke="rgb(255 255 255 / 0.25)" />
              <line x1={CENTER} y1={20} x2={CENTER} y2={SIZE - 20} stroke="rgb(255 255 255 / 0.25)" />

              <polygon
                points={`${CENTER},${CENTER} ${sx(a.x)},${sy(a.y)} ${sx(a.x + b.x)},${sy(a.y + b.y)} ${sx(b.x)},${sy(b.y)}`}
                fill="var(--brand)"
                fillOpacity="0.5"
                stroke="var(--brand)"
                strokeOpacity="0.9"
                strokeDasharray="7 6"
                className="transition-all duration-300"
              />
              <line x1={CENTER} y1={CENTER} x2={sx(a.x)} y2={sy(a.y)} stroke="var(--catet1)" strokeWidth="5" markerEnd="url(#arrow-a)" />
              <line x1={CENTER} y1={CENTER} x2={sx(b.x)} y2={sy(b.y)} stroke="var(--catet2)" strokeWidth="5" markerEnd="url(#arrow-b)" />

              <circle
                cx={sx(a.x)} cy={sy(a.y)} r="18" fill="var(--catet1)" fillOpacity="0.24"
                onPointerDown={(event) => { dragging.current = "a"; setFromPointer(event.clientX, event.clientY); }}
                className="cursor-grab"
              />
              <circle
                cx={sx(b.x)} cy={sy(b.y)} r="18" fill="var(--catet2)" fillOpacity="0.24"
                onPointerDown={(event) => { dragging.current = "b"; setFromPointer(event.clientX, event.clientY); }}
                className="cursor-grab"
              />
              <text x={sx(a.x) + 12} y={sy(a.y) - 15} fill="var(--catet1)" fontSize="17" fontWeight="700">A</text>
              <text x={sx(b.x) + 12} y={sy(b.y) - 15} fill="var(--catet2)" fontSize="17" fontWeight="700">B</text>

              <g className="transition-opacity duration-300">
                <circle cx={CENTER} cy={CENTER} r="15" fill="var(--cross-result)" fillOpacity="0.18" stroke="var(--cross-result)" strokeWidth="3" />
                {cross > 0 && <circle cx={CENTER} cy={CENTER} r="4.5" fill="var(--cross-result)" />}
                {cross < 0 && (
                  <g stroke="var(--cross-result)" strokeWidth="3" strokeLinecap="round">
                    <line x1={CENTER - 5} y1={CENTER - 5} x2={CENTER + 5} y2={CENTER + 5} />
                    <line x1={CENTER + 5} y1={CENTER - 5} x2={CENTER - 5} y2={CENTER + 5} />
                  </g>
                )}
                {cross === 0 && <circle cx={CENTER} cy={CENTER} r="2.5" fill="var(--cross-result)" fillOpacity="0.5" />}
                <text x={CENTER + 22} y={CENTER - 14} fill="var(--cross-result)" fontSize="15" fontWeight="700">A × B</text>
              </g>
            </svg>
            <p className="mt-3 text-center text-xs text-white/45">
              O símbolo <span className="text-cross-result">⊙</span> indica a resultante saindo do
              plano (para você) e <span className="text-cross-result">⊗</span> entrando no plano.
            </p>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-catet1/60 bg-catet1/10 p-5">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-catet1">Produto escalar</p>
                <span className="text-2xl font-bold text-catet1">{dot}</span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 font-mono text-base sm:text-lg">
                <span className="rounded bg-catet1/15 px-2 py-1 text-catet1">{a.x} × {b.x}</span>
                <span className="text-white/35">+</span>
                <span className="rounded bg-cyan-accent/15 px-2 py-1 text-cyan-accent">{a.y} × {b.y}</span>
              </div>
              <p className="mt-3 text-center text-sm text-white/55">
                <span className="text-catet1">{dotX}</span> + <span className="text-cyan-accent">{dotY}</span> = <strong className="text-white">{dot}</strong>
              </p>
              <p className="mt-3 text-xs text-white/45">Ângulo entre A e B: {(angle * 180 / Math.PI).toFixed(1)}°. Quanto maior o alinhamento, maior o resultado.</p>
            </section>

            <section className="rounded-lg border border-catet2/60 bg-catet2/10 p-5">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-catet2">Produto vetorial 2D</p>
                <span className="text-2xl font-bold text-catet2">{cross}</span>
              </div>
              <div className="mt-4 grid grid-cols-[auto_1fr] items-center justify-center gap-x-3 gap-y-1 font-mono text-base">
                <span className="row-span-2 text-3xl text-white/30">|</span>
                <div className="flex gap-3"><span className="text-catet1">{a.x}</span><span className="text-cyan-accent">{a.y}</span></div>
                <div className="flex gap-3"><span className="text-catet2">{b.x}</span><span className="text-brand">{b.y}</span></div>
              </div>
              <p className="mt-3 text-center text-sm text-white/55">
                <span className="text-catet1">{a.x}</span> × <span className="text-brand">{b.y}</span> − <span className="text-cyan-accent">{a.y}</span> × <span className="text-catet2">{b.x}</span> = <strong className="text-catet2">{crossFirst} − {crossSecond} = {cross}</strong>
              </p>
              <p className="mt-3 rounded bg-cross-result/15 px-3 py-2 text-center text-sm font-semibold text-cross-result">
                Vetor resultante: A × B = (0, 0, {cross})
              </p>
              <p className="mt-3 text-xs text-white/45">O módulo, {Math.abs(cross)}, é a área do paralelogramo. O sinal indica o sentido da rotação de A para B.</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
