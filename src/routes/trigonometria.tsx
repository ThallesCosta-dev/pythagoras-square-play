import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/trigonometria")({
  head: () => ({
    meta: [
      { title: "Seno, cosseno e tangente — círculo interativo" },
      {
        name: "description",
        content:
          "Arraste o ângulo no círculo trigonométrico e veja seno, cosseno e tangente aparecerem como lados de um triângulo retângulo.",
      },
      { property: "og:title", content: "Seno, cosseno e tangente — círculo interativo" },
      {
        property: "og:description",
        content:
          "Descubra visualmente como seno e cosseno nascem do triângulo retângulo dentro do círculo de raio 1.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Trig,
});

const S = 520;
const CX = S / 2;
const CY = S / 2;
const R = 190;

const fmt = (n: number) => (Math.abs(n) < 1e-9 ? "0.00" : n.toFixed(2));

function Trig() {
  const [angle, setAngle] = useState(0.9273); // ~53.13°, the 3-4-5 angle
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tan = Math.tan(angle);
  const deg = (angle * 180) / Math.PI;
  const tanFinite = Math.abs(cos) > 0.02;

  const px = CX + cos * R;
  const py = CY - sin * R;

  const fromEvent = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * S - CX;
    const y = CY - ((clientY - r.top) / r.height) * S;
    let a = Math.atan2(y, x);
    if (a < 0) a += 2 * Math.PI;
    setAngle(a);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      fromEvent(e.clientX, e.clientY);
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

  const presets = [
    { label: "30°", v: Math.PI / 6 },
    { label: "45°", v: Math.PI / 4 },
    { label: "53,13° (3-4-5)", v: 0.9272952 },
    { label: "60°", v: Math.PI / 3 },
    { label: "90°", v: Math.PI / 2 },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink font-body text-foreground antialiased">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-brand/25 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[560px] w-[560px] rounded-full bg-cyan-accent/15 blur-[130px]" />

      <SiteNav />

      <main className="relative mx-auto max-w-6xl px-6 pb-16">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-accent">
          Do triângulo ao círculo · raio 1
        </p>
        <h1 className="font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1] tracking-tight">
          <span className="bg-gradient-to-r from-white via-brand to-cyan-accent bg-clip-text text-transparent">
            Seno, cosseno e tangente
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/60">
          Arraste o ponto sobre o círculo. O cosseno é a sombra horizontal, o seno é a altura
          vertical — e, como o raio vale 1, Pitágoras vira{" "}
          <span className="text-white">sen²θ + cos²θ = 1</span>.
        </p>

        <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${S} ${S}`}
                className="mx-auto w-full max-w-[540px] touch-none select-none"
                role="img"
                aria-label="Círculo trigonométrico com ângulo ajustável"
                onPointerDown={(e) => {
                  dragging.current = true;
                  fromEvent(e.clientX, e.clientY);
                }}
              >
                {/* grid */}
                <line x1={20} y1={CY} x2={S - 20} y2={CY} stroke="rgba(255,255,255,0.16)" />
                <line x1={CX} y1={20} x2={CX} y2={S - 20} stroke="rgba(255,255,255,0.16)" />
                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={1.5}
                />

                {/* tangent line at x = 1 */}
                <line
                  x1={CX + R}
                  y1={30}
                  x2={CX + R}
                  y2={S - 30}
                  stroke="rgba(99,102,241,0.35)"
                  strokeDasharray="5 6"
                />

                {/* angle arc */}
                <path
                  d={`M ${CX + 46} ${CY} A 46 46 0 ${angle > Math.PI ? 1 : 0} 0 ${
                    CX + Math.cos(angle) * 46
                  } ${CY - Math.sin(angle) * 46}`}
                  fill="rgba(34,211,238,0.14)"
                  stroke="#22d3ee"
                  strokeWidth={2}
                />

                {/* triangle: cos (base) + sin (height) */}
                <polygon
                  points={`${CX},${CY} ${px},${CY} ${px},${py}`}
                  fill="rgba(255,255,255,0.05)"
                />
                <line x1={CX} y1={CY} x2={px} y2={CY} stroke="#fbbf24" strokeWidth={4} />
                <line x1={px} y1={CY} x2={px} y2={py} stroke="#34d399" strokeWidth={4} />
                <line x1={CX} y1={CY} x2={px} y2={py} stroke="#818cf8" strokeWidth={3} />

                {/* tangent segment */}
                {tanFinite && cos > 0 && (
                  <line
                    x1={CX + R}
                    y1={CY}
                    x2={CX + R}
                    y2={CY - tan * R}
                    stroke="#f472b6"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                )}

                {/* handle */}
                <circle cx={px} cy={py} r={11} fill="#22d3ee" />
                <circle cx={px} cy={py} r={20} fill="rgba(34,211,238,0.18)" />

                <text
                  x={(CX + px) / 2}
                  y={CY + 22}
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize={15}
                  fontWeight={700}
                >
                  cos θ = {fmt(cos)}
                </text>
                <text
                  x={px + (cos >= 0 ? 14 : -14)}
                  y={(CY + py) / 2}
                  textAnchor={cos >= 0 ? "start" : "end"}
                  fill="#34d399"
                  fontSize={15}
                  fontWeight={700}
                >
                  sen θ = {fmt(sin)}
                </text>
                <text x={CX + 56} y={CY - 14} fill="#22d3ee" fontSize={15} fontWeight={700}>
                  θ = {deg.toFixed(1)}°
                </text>
                {tanFinite && cos > 0 && (
                  <text
                    x={CX + R - 10}
                    y={CY - (tan * R) / 2}
                    textAnchor="end"
                    fill="#f472b6"
                    fontSize={14}
                    fontWeight={700}
                  >
                    tg θ = {fmt(tan)}
                  </text>
                )}
              </svg>

              <input
                type="range"
                min={0}
                max={6.2831}
                step={0.001}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="mt-5 w-full accent-[#22d3ee]"
                aria-label="Ângulo em radianos"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setAngle(p.v)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/5"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "sen θ", v: fmt(sin), c: "#34d399" },
                { l: "cos θ", v: fmt(cos), c: "#fbbf24" },
                { l: "tg θ", v: tanFinite ? fmt(tan) : "∞", c: "#f472b6" },
              ].map((m) => (
                <div
                  key={m.l}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{m.l}</p>
                  <p className="mt-1 font-display text-2xl font-bold" style={{ color: m.c }}>
                    {m.v}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-brand/50 bg-brand/10 p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                Pitágoras continua aqui
              </p>
              <p className="mt-3 text-center font-display text-2xl font-bold">
                <span className="text-catet2">{fmt(sin * sin)}</span>{" "}
                <span className="text-white/40">+</span>{" "}
                <span className="text-catet1">{fmt(cos * cos)}</span>{" "}
                <span className="text-white/40">=</span> <span className="text-brand">1,00</span>
              </p>
              <p className="mt-3 text-sm text-white/60">
                O triângulo dentro do círculo tem hipotenusa 1. Os quadrados dos catetos (seno e
                cosseno) sempre somam o quadrado da hipotenusa.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
              <p className="font-display font-semibold text-white">O que cada um significa</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <span className="text-catet1">cosseno</span> = cateto adjacente ÷ hipotenusa (o
                  quanto o ponto avança para a direita).
                </li>
                <li>
                  <span className="text-catet2">seno</span> = cateto oposto ÷ hipotenusa (o quanto
                  o ponto sobe).
                </li>
                <li>
                  <span style={{ color: "#f472b6" }}>tangente</span> = seno ÷ cosseno (a inclinação
                  da reta).
                </li>
              </ul>
              <p className="mt-4 text-white/50">
                Guarde o cosseno: na próxima página ele vira a medida de <em>parecença</em> entre
                palavras dentro de um transformer.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
