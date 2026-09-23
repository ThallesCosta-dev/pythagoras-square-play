import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageShell, GradientText, PageLinks } from "@/components/PageShell";
import { useWindowDrag, clientToSvg } from "@/hooks/use-window-drag";
import { fmt, deg } from "@/lib/format";
import { C, soft, white } from "@/lib/theme";

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
    ],
  }),
  component: Trig,
});

const S = 520;
const CX = S / 2;
const CY = S / 2;
const R = 190;
const MARGIN = 30;
const TWO_PI = 2 * Math.PI;
const ANGLE_345 = Math.atan2(4, 3); // ≈ 53,13°, o ângulo do triângulo 3-4-5

const PRESETS = [
  { label: "30°", v: Math.PI / 6 },
  { label: "45°", v: Math.PI / 4 },
  { label: "53,13° (3-4-5)", v: ANGLE_345 },
  { label: "60°", v: Math.PI / 3 },
  { label: "90°", v: Math.PI / 2 },
];

function Trig() {
  const [angle, setAngle] = useState(ANGLE_345);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tan = Math.tan(angle);
  const tanFinite = Math.abs(cos) > 0.02;

  const px = CX + cos * R;
  const py = CY - sin * R;

  // Ponto da reta tangente (x = 1) alcançado pela reta que passa pela origem e pelo ponto do
  // círculo. Quando fica fora do canvas, encurtamos ao longo da mesma reta.
  const tanRaw = tan * R;
  const tanScale = Math.abs(tanRaw) > CY - MARGIN ? (CY - MARGIN) / Math.abs(tanRaw) : 1;
  const tanPoint = { x: CX + R * tanScale, y: CY - tanRaw * tanScale };
  const tanClipped = tanScale < 1;

  const fromEvent = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = clientToSvg(svg, clientX, clientY, S, S);
    let a = Math.atan2(CY - y, x - CX);
    if (a < 0) a += TWO_PI;
    setAngle(a);
  };

  useWindowDrag(dragging, {
    onMove: (e) => fromEvent(e.clientX, e.clientY),
    onUp: () => setDragging(false),
    onCancel: () => setDragging(false),
  });

  const stats = [
    { l: "sen θ", v: fmt(sin), c: C.catet2 },
    { l: "cos θ", v: fmt(cos), c: C.catet1 },
    { l: "tg θ", v: tanFinite ? fmt(tan) : "∞", c: C.vecSum },
  ];

  return (
    <PageShell
      eyebrow="Do triângulo ao círculo · raio 1"
      title={<GradientText>Seno, cosseno e tangente</GradientText>}
      intro={
        <>
          Arraste o ponto sobre o círculo. O cosseno é a sombra horizontal, o seno é a altura
          vertical — e, como o raio vale 1, Pitágoras vira{" "}
          <span className="text-white">sen²θ + cos²θ = 1</span>.
        </>
      }
    >
      <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${S} ${S}`}
              className="mx-auto w-full max-w-[540px] touch-none select-none"
              role="img"
              aria-label="Círculo trigonométrico com ângulo ajustável; use o controle deslizante abaixo para mudar o ângulo pelo teclado"
              onPointerDown={(e) => {
                setDragging(true);
                fromEvent(e.clientX, e.clientY);
              }}
            >
              {/* eixos e círculo */}
              <line x1={20} y1={CY} x2={S - 20} y2={CY} stroke={white(16)} />
              <line x1={CX} y1={20} x2={CX} y2={S - 20} stroke={white(16)} />
              <circle cx={CX} cy={CY} r={R} fill="none" stroke={white(22)} strokeWidth={1.5} />

              {/* reta tangente em x = 1 */}
              <line
                x1={CX + R}
                y1={MARGIN}
                x2={CX + R}
                y2={S - MARGIN}
                stroke={soft(C.brand, 35)}
                strokeDasharray="5 6"
              />

              {/* arco do ângulo */}
              <path
                d={`M ${CX + 46} ${CY} A 46 46 0 ${angle > Math.PI ? 1 : 0} 0 ${
                  CX + Math.cos(angle) * 46
                } ${CY - Math.sin(angle) * 46}`}
                fill={soft(C.cyan, 14)}
                stroke={C.cyan}
                strokeWidth={2}
              />

              {/* triângulo: cos (base) + sen (altura) */}
              <polygon points={`${CX},${CY} ${px},${CY} ${px},${py}`} fill={white(5)} />
              <line x1={CX} y1={CY} x2={px} y2={CY} stroke={C.catet1} strokeWidth={4} />
              <line x1={px} y1={CY} x2={px} y2={py} stroke={C.catet2} strokeWidth={4} />
              <line x1={CX} y1={CY} x2={px} y2={py} stroke={C.brandLight} strokeWidth={3} />

              {/* construção da tangente: prolongamento da hipotenusa até a reta x = 1 */}
              {tanFinite && (
                <>
                  <line
                    x1={cos > 0 ? px : CX}
                    y1={cos > 0 ? py : CY}
                    x2={tanPoint.x}
                    y2={tanPoint.y}
                    stroke={soft(C.vecSum, 45)}
                    strokeWidth={1.5}
                    strokeDasharray="4 5"
                  />
                  <line
                    x1={CX + R}
                    y1={CY}
                    x2={tanPoint.x}
                    y2={tanPoint.y}
                    stroke={C.vecSum}
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                  <text
                    x={CX + R - 10}
                    y={Math.min(Math.max((CY + tanPoint.y) / 2, MARGIN + 10), S - MARGIN)}
                    textAnchor="end"
                    fill={C.vecSum}
                    fontSize={14}
                    fontWeight={700}
                  >
                    tg θ = {fmt(tan)}
                    {tanClipped ? " ↕" : ""}
                  </text>
                </>
              )}

              {/* alça */}
              <circle cx={px} cy={py} r={11} fill={C.cyan} />
              <circle cx={px} cy={py} r={20} fill={soft(C.cyan, 18)} />

              <text
                x={(CX + px) / 2}
                y={sin >= 0 ? CY + 22 : CY - 12}
                textAnchor="middle"
                fill={C.catet1}
                fontSize={15}
                fontWeight={700}
              >
                cos θ = {fmt(cos)}
              </text>
              <text
                x={px + (cos >= 0 ? 14 : -14)}
                y={(CY + py) / 2}
                textAnchor={cos >= 0 ? "start" : "end"}
                fill={C.catet2}
                fontSize={15}
                fontWeight={700}
              >
                sen θ = {fmt(sin)}
              </text>
              <text x={CX + 56} y={CY - 14} fill={C.cyan} fontSize={15} fontWeight={700}>
                θ = {deg(angle)}
              </text>
            </svg>

            <input
              type="range"
              min={0}
              max={TWO_PI}
              step={0.001}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="mt-5 w-full accent-cyan-accent"
              aria-label="Ângulo em radianos"
              aria-valuetext={deg(angle)}
            />
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Ângulos prontos">
              {PRESETS.map((p) => {
                const active = Math.abs(angle - p.v) < 1e-3;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setAngle(p.v)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-cyan-accent/60 bg-cyan-accent/15 text-white"
                        : "border-white/15 text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3" aria-live="polite">
            {stats.map((m) => (
              <div
                key={m.l}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">{m.l}</p>
                <p className="mt-1 font-display text-2xl font-bold" style={{ color: m.c }}>
                  {m.v}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-brand/50 bg-brand/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
              Pitágoras continua aqui
            </p>
            <p className="mt-3 text-center font-display text-2xl font-bold">
              <span className="text-catet2">{fmt(sin * sin)}</span>{" "}
              <span className="text-white/50">+</span>{" "}
              <span className="text-catet1">{fmt(cos * cos)}</span>{" "}
              <span className="text-white/50">=</span>{" "}
              <span className="text-brand">{fmt(sin * sin + cos * cos)}</span>
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
                <span className="text-catet2">seno</span> = cateto oposto ÷ hipotenusa (o quanto o
                ponto sobe).
              </li>
              <li>
                <span className="text-vec-sum">tangente</span> = seno ÷ cosseno (a inclinação da
                reta). No desenho, é a altura em que a reta do ângulo cruza a linha vertical x = 1,
                mesmo quando o ponto está do lado esquerdo.
              </li>
            </ul>
            <p className="mt-4 text-white/50">
              Guarde o cosseno: na próxima página ele vira a medida de <em>similaridade</em> entre
              palavras dentro de um transformer.
            </p>
          </div>
        </aside>
      </div>

      <PageLinks
        links={[
          {
            to: "/similaridade",
            eyebrow: "Próximo passo",
            title: "Cosseno nos transformers",
            desc: "O mesmo cosseno medindo parecença entre palavras.",
            accent: "brand",
          },
          {
            to: "/produtos-vetoriais",
            eyebrow: "Vetores",
            title: "Produto escalar e vetorial",
            desc: "Duas operações entre vetores, no plano.",
          },
          {
            to: "/",
            eyebrow: "Começo",
            title: "Teorema de Pitágoras",
            desc: "Volte ao mosaico de quadradinhos.",
          },
        ]}
      />
    </PageShell>
  );
}
