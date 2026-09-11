import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/similaridade")({
  head: () => ({
    meta: [
      { title: "Similaridade de cosseno em transformers — vetores 2D" },
      {
        name: "description",
        content:
          "Arraste o vetor de consulta e veja como a similaridade de cosseno entre vetores decide a atenção de um modelo de linguagem.",
      },
      { property: "og:title", content: "Similaridade de cosseno em transformers" },
      {
        property: "og:description",
        content:
          "Do cosseno do triângulo à atenção do transformer: vetores de palavras no plano e pesos de atenção calculados ao vivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Similaridade,
});

const S = 540;
const CX = S / 2;
const CY = S / 2;
const U = 46; // px per unit

const sx = (x: number) => CX + x * U;
const sy = (y: number) => CY - y * U;

type Vec = { id: string; word: string; x: number; y: number; color: string };

const KEYS: Vec[] = [
  { id: "gato", word: "gato", x: 3.4, y: 2.2, color: "#fbbf24" },
  { id: "cachorro", word: "cachorro", x: 3.0, y: 2.7, color: "#f59e0b" },
  { id: "felino", word: "felino", x: 3.6, y: 1.9, color: "#fb923c" },
  { id: "carro", word: "carro", x: -2.6, y: 2.9, color: "#34d399" },
  { id: "motor", word: "motor", x: -3.2, y: 2.1, color: "#10b981" },
  { id: "banco", word: "banco", x: 1.0, y: -3.4, color: "#22d3ee" },
];

const dot = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x * b.x + a.y * b.y;
const norm = (a: { x: number; y: number }) => Math.hypot(a.x, a.y);
const cosSim = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
};

function Similaridade() {
  const [q, setQ] = useState({ x: 3.2, y: 2.0 });
  const [temp, setTemp] = useState(4);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);

  const setFromPointer = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = (((clientX - r.left) / r.width) * S - CX) / U;
    const y = (CY - ((clientY - r.top) / r.height) * S) / U;
    const clamp = (v: number) => Math.max(-5.3, Math.min(5.3, v));
    setQ({ x: clamp(x), y: clamp(y) });
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragging.current) setFromPointer(e.clientX, e.clientY);
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const rows = useMemo(() => {
    const sims = KEYS.map((k) => {
      const sim = cosSim(q, k);
      return {
        k,
        sim,
        ang: (Math.acos(Math.max(-1, Math.min(1, sim))) * 180) / Math.PI,
        exp: Math.exp(sim * temp),
      };
    });
    const sum = sims.reduce((a, s) => a + s.exp, 0) || 1;
    return sims.map((s) => ({ ...s, w: s.exp / sum }));
  }, [q, temp]);

  type Row = (typeof rows)[number];
  const best = rows.reduce<Row | null>((a, b) => (a && a.w > b.w ? a : b), null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink font-body text-foreground antialiased">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-brand/25 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[560px] w-[560px] rounded-full bg-cyan-accent/15 blur-[130px]" />

      <SiteNav />

      <main className="relative mx-auto max-w-6xl px-6 pb-16">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-accent">
          Do cosseno à atenção · vetores no plano
        </p>
        <h1 className="font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1] tracking-tight">
          <span className="bg-gradient-to-r from-white via-brand to-cyan-accent bg-clip-text text-transparent">
            Similaridade de cosseno
          </span>{" "}
          <span className="bg-gradient-to-r from-cyan-accent via-brand to-catet1 bg-clip-text text-transparent">
            nos transformers
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">
          Num modelo de linguagem, cada palavra vira um vetor. Para decidir em quais palavras
          prestar atenção, o modelo mede o <span className="text-white">cosseno do ângulo</span>{" "}
          entre a consulta e cada palavra: mesmo sentido → cosseno perto de 1. Arraste a seta roxa.
        </p>

        <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/40">
                Espaço de embeddings (2 dimensões)
              </p>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${S} ${S}`}
                className="mx-auto w-full max-w-[560px] touch-none select-none"
                role="img"
                aria-label="Vetores de palavras num plano cartesiano com o vetor de consulta arrastável"
                onPointerDown={(e) => {
                  dragging.current = true;
                  setFromPointer(e.clientX, e.clientY);
                }}
              >
                <defs>
                  <marker
                    id="ah"
                    markerUnits="userSpaceOnUse"
                    markerWidth="14"
                    markerHeight="14"
                    refX="11"
                    refY="7"
                    orient="auto"
                  >
                    <path d="M0,1 L13,7 L0,13 z" fill="context-stroke" />
                  </marker>
                </defs>

                {Array.from({ length: 11 }).map((_, i) => {
                  const v = i - 5;
                  return (
                    <g key={v}>
                      <line
                        x1={sx(v)}
                        y1={sy(-5.5)}
                        x2={sx(v)}
                        y2={sy(5.5)}
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <line
                        x1={sx(-5.5)}
                        y1={sy(v)}
                        x2={sx(5.5)}
                        y2={sy(v)}
                        stroke="rgba(255,255,255,0.05)"
                      />
                    </g>
                  );
                })}
                <line x1={sx(-5.6)} y1={CY} x2={sx(5.6)} y2={CY} stroke="rgba(255,255,255,0.2)" />
                <line x1={CX} y1={sy(-5.6)} x2={CX} y2={sy(5.6)} stroke="rgba(255,255,255,0.2)" />

                {/* angle wedge between q and best match */}
                {best && (
                  <path
                    d={`M ${CX} ${CY} L ${sx((q.x / norm(q)) * 1.6)} ${sy((q.y / norm(q)) * 1.6)} A ${
                      1.6 * U
                    } ${1.6 * U} 0 0 ${
                      q.x * best.k.y - q.y * best.k.x > 0 ? 1 : 0
                    } ${sx((best.k.x / norm(best.k)) * 1.6)} ${sy((best.k.y / norm(best.k)) * 1.6)} Z`}
                    fill="rgba(99,102,241,0.18)"
                  />
                )}

                {rows.map(({ k, w }) => (
                  <g key={k.id}>
                    <line
                      x1={CX}
                      y1={CY}
                      x2={sx(k.x)}
                      y2={sy(k.y)}
                      stroke={k.color}
                      strokeWidth={2 + w * 8}
                      opacity={0.35 + w * 0.65}
                      markerEnd="url(#ah)"
                    />
                    <text
                      x={sx(k.x) + (k.x >= 0 ? 10 : -10)}
                      y={sy(k.y) - 8}
                      textAnchor={k.x >= 0 ? "start" : "end"}
                      fill={k.color}
                      fontSize={14}
                      fontWeight={700}
                    >
                      {k.word}
                    </text>
                  </g>
                ))}

                {/* query vector */}
                <line
                  x1={CX}
                  y1={CY}
                  x2={sx(q.x)}
                  y2={sy(q.y)}
                  stroke="#a5b4fc"
                  strokeWidth={5}
                  markerEnd="url(#ah)"
                />
                <circle cx={sx(q.x)} cy={sy(q.y)} r={12} fill="#6366f1" />
                <circle cx={sx(q.x)} cy={sy(q.y)} r={22} fill="rgba(99,102,241,0.2)" />
                <text
                  x={Math.min(sx(q.x) + 16, S - 12)}
                  y={sy(q.y) + 26}
                  textAnchor={sx(q.x) + 16 > S - 130 ? "end" : "start"}
                  fill="#c7d2fe"
                  fontSize={14}
                  fontWeight={700}
                >
                  consulta ({q.x.toFixed(1)}, {q.y.toFixed(1)})
                </text>
              </svg>
              <p className="mt-3 text-sm text-white/50">
                Repare: só o <em>ângulo</em> importa. Alongue a seta sem girá-la e o cosseno não
                muda — por isso o cosseno mede sentido, não tamanho.
              </p>
            </div>
          </section>

          <aside className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-display font-semibold">Atenção do modelo</p>
                <p className="text-xs text-white/40">softmax(cos · escala)</p>
              </div>
              <div className="mt-4 space-y-3">
                {[...rows]
                  .sort((a, b) => b.w - a.w)
                  .map(({ k, sim, ang, w }) => (
                    <div key={k.id}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium" style={{ color: k.color }}>
                          {k.word}
                        </span>
                        <span className="tabular-nums text-white/50">
                          cos {sim.toFixed(2)} · {ang.toFixed(0)}° ·{" "}
                          <span className="text-white">{(w * 100).toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-200"
                          style={{ width: `${w * 100}%`, backgroundColor: k.color }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
              <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">
                Nitidez da atenção ({temp.toFixed(1)})
              </label>
              <input
                type="range"
                min={0.5}
                max={12}
                step={0.1}
                value={temp}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="mt-2 w-full accent-[#6366f1]"
              />
            </div>

            <div className="rounded-2xl border border-brand/50 bg-brand/10 p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Leitura</p>
              <p className="mt-2 text-sm text-white/70">
                A consulta aponta mais para <strong className="text-white">{best?.k.word}</strong>{" "}
                (ângulo de {best?.ang.toFixed(0)}°), então o modelo puxa{" "}
                {(best ? best.w * 100 : 0).toFixed(0)}% da informação dessa palavra ao formar a
                próxima representação.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
              <p className="font-display font-semibold text-white">Por que isso é o mesmo cosseno</p>
              <p className="mt-2">
                cos θ = (q · k) ÷ (|q| · |k|). O produto escalar no numerador e as normas — que
                vêm direto de Pitágoras, |v| = √(x² + y²) — no denominador.
              </p>
              <p className="mt-3">
                No transformer, a atenção usa q · k dividido por √d e passa por softmax. Normalizar
                pelos comprimentos dá exatamente a similaridade de cosseno: um número entre −1
                (sentidos opostos) e 1 (mesma direção).
              </p>
              <p className="mt-3 text-white/45">
                Aqui usamos 2 dimensões para caber na tela; um modelo real usa centenas ou milhares
                — a conta é idêntica.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
