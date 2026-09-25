import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageShell, GradientText, PageLinks } from "@/components/PageShell";
import { useWindowDrag, clientToSvg } from "@/hooks/use-window-drag";
import { fmt, deg } from "@/lib/format";
import { C, soft, fg } from "@/lib/theme";

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

// Raio escolhido para que tangentes até ≈ 1,93 (inclusive tg 60° ≈ 1,73) caibam inteiras.
const W = 560;
const H = 600;
const CX = W / 2;
const CY = H / 2;
const R = 140;
const MARGIN = 30;
const ARC_R = 40;
/** Largura aproximada do rótulo de duas linhas do seno ("sen θ" / "-0,87"). */
const SEN_LABEL_W = 60;

/** Contorno na cor do fundo para os rótulos continuarem legíveis sobre as linhas. */
const HALO = {
  stroke: "var(--ink)",
  strokeWidth: 4,
  strokeLinejoin: "round",
  paintOrder: "stroke",
} as const;
const TO_RAD = Math.PI / 180;
/**
 * Arraste e controle deslizante andam em passos de 0,1°: assim o ângulo mostrado com uma casa
 * decimal é exatamente o ângulo usado nas contas (e 90° é mesmo 90°, onde a tangente não existe).
 */
const snapDeg = (degrees: number) => {
  const d = Math.round(degrees * 10) / 10;
  return ((d % 360) + 360) % 360;
};
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
  // Em 90° e 270° a reta do ângulo é paralela a x = 1: a tangente não existe (não é "∞").
  const tanDefined = Math.abs(cos) > 1e-9;

  const px = CX + cos * R;
  const py = CY - sin * R;

  // O segmento da tangente fica sempre sobre a reta x = 1, de (1, 0) até (1, tg θ). Quando
  // passa da borda, cortamos só a altura (o x continua em 1) e marcamos com uma seta.
  // A reta tracejada que sai da origem é cortada na mesma altura.
  const tanPx = tan * R;
  const tanLimit = CY - MARGIN;
  const tanClipped = Math.abs(tanPx) > tanLimit;
  const tanEndY = CY - Math.max(-tanLimit, Math.min(tanLimit, tanPx));
  const rayScale = tanClipped ? tanLimit / Math.abs(tanPx) : 1;
  const rayEnd = { x: CX + R * rayScale, y: tanEndY };

  // Rótulo do seno: do lado de fora do segmento vertical quando há espaço; com cos > 0 e o
  // ponto perto de x = 1, vai para o lado de dentro para não cruzar o segmento da tangente.
  // Com o ponto perto do eixo horizontal (|sen θ| < 0,32) o triângulo quase some: o rótulo vai
  // para junto do ponto, do lado de fora (acima se sen ≥ 0, abaixo se sen < 0) e voltado para o
  // centro, onde o círculo está vazio.
  const senSmall = Math.abs(sin) * R < 45;
  const up = sin >= 0 ? 1 : -1;
  const senRight = senSmall ? cos < 0 : cos >= 0 && CX + R - px >= SEN_LABEL_W + 20;
  const senX = senSmall ? px + (cos < 0 ? 8 : -8) : senRight ? px + 10 : px - 10;
  const senMidY = senSmall ? py - up * 36 : CY - up * Math.max((Math.abs(sin) * R) / 2, 26);
  // Rótulo da tangente: à direita da reta x = 1, na altura do meio do segmento.
  const tanLabelY = Math.min(Math.max((CY + tanEndY) / 2, MARGIN + 14), H - MARGIN - 30);

  const fromEvent = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = clientToSvg(svg, clientX, clientY, W, H);
    setAngle(snapDeg(Math.atan2(CY - y, x - CX) / TO_RAD) * TO_RAD);
  };

  useWindowDrag(dragging, {
    onMove: (e) => fromEvent(e.clientX, e.clientY),
    onUp: () => setDragging(false),
    onCancel: () => setDragging(false),
  });

  const stats: { l: string; v: string; c: string; note?: string | undefined }[] = [
    { l: "sen θ", v: fmt(sin), c: C.catet2 },
    { l: "cos θ", v: fmt(cos), c: C.catet1 },
    {
      l: "tg θ",
      v: tanDefined ? fmt(tan, Math.abs(tan) >= 100 ? 0 : 2) : "—",
      note: tanDefined ? undefined : "não existe",
      c: C.vecSum,
    },
  ];

  return (
    <PageShell
      eyebrow="Do triângulo ao círculo · raio 1"
      title={<GradientText>Seno, cosseno e tangente</GradientText>}
      intro={
        <>
          Arraste o ponto sobre o círculo. O cosseno é a sombra horizontal, o seno é a altura
          vertical — e, como o raio vale 1, Pitágoras vira{" "}
          <span className="text-fg">sen²θ + cos²θ = 1</span>.
        </>
      }
    >
      <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="rounded-3xl border border-fg/10 bg-fg/[0.03] p-5 sm:p-7">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="mx-auto w-full max-w-[540px] touch-none select-none"
              role="img"
              aria-label="Círculo trigonométrico com ângulo ajustável; use o controle deslizante abaixo para mudar o ângulo pelo teclado"
              onPointerDown={(e) => {
                setDragging(true);
                fromEvent(e.clientX, e.clientY);
              }}
            >
              <defs>
                <marker
                  id="ah-tan"
                  markerUnits="userSpaceOnUse"
                  markerWidth="14"
                  markerHeight="14"
                  refX="11"
                  refY="7"
                  orient="auto"
                >
                  <path d="M0,1 L13,7 L0,13 z" fill={C.vecSum} />
                </marker>
              </defs>

              {/* eixos e círculo */}
              <line x1={20} y1={CY} x2={W - 20} y2={CY} stroke={fg(16)} />
              <line x1={CX} y1={20} x2={CX} y2={H - 20} stroke={fg(16)} />
              <circle cx={CX} cy={CY} r={R} fill="none" stroke={fg(22)} strokeWidth={1.5} />

              {/* reta tangente em x = 1 */}
              <line
                x1={CX + R}
                y1={MARGIN}
                x2={CX + R}
                y2={H - MARGIN}
                stroke={soft(C.brand, 35)}
                strokeDasharray="5 6"
              />
              <text
                x={CX + R + 6}
                y={H - MARGIN - 6}
                fill={fg(45)}
                fontSize={11}
                pointerEvents="none"
              >
                x = 1
              </text>

              {/* arco do ângulo */}
              <path
                d={`M ${CX + ARC_R} ${CY} A ${ARC_R} ${ARC_R} 0 ${angle > Math.PI ? 1 : 0} 0 ${
                  CX + Math.cos(angle) * ARC_R
                } ${CY - Math.sin(angle) * ARC_R}`}
                fill={soft(C.cyan, 14)}
                stroke={C.cyan}
                strokeWidth={2}
              />

              {/* triângulo: cos (base) + sen (altura) */}
              <polygon points={`${CX},${CY} ${px},${CY} ${px},${py}`} fill={fg(5)} />
              <line x1={CX} y1={CY} x2={px} y2={CY} stroke={C.catet1} strokeWidth={4} />
              <line x1={px} y1={CY} x2={px} y2={py} stroke={C.catet2} strokeWidth={4} />
              <line x1={CX} y1={CY} x2={px} y2={py} stroke={C.brandLight} strokeWidth={3} />

              {/* construção da tangente: prolongamento da hipotenusa até a reta x = 1 */}
              {tanDefined && (
                <>
                  <line
                    x1={cos > 0 ? px : CX}
                    y1={cos > 0 ? py : CY}
                    x2={rayEnd.x}
                    y2={rayEnd.y}
                    stroke={soft(C.vecSum, 45)}
                    strokeWidth={1.5}
                    strokeDasharray="4 5"
                  />
                  <line
                    x1={CX + R}
                    y1={CY}
                    x2={CX + R}
                    y2={tanEndY}
                    stroke={C.vecSum}
                    strokeWidth={4}
                    strokeLinecap="round"
                    markerEnd={tanClipped ? "url(#ah-tan)" : undefined}
                  />
                </>
              )}

              {/* alça */}
              <circle cx={px} cy={py} r={11} fill={C.cyan} />
              <circle cx={px} cy={py} r={20} fill={soft(C.cyan, 18)} />

              {/* rótulos (por cima de tudo, com contorno na cor do fundo) */}
              <g pointerEvents="none" fontWeight={700} {...HALO}>
                <text
                  x={CX + Math.cos(angle / 2) * (ARC_R + 16)}
                  y={CY - Math.sin(angle / 2) * (ARC_R + 16)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={C.cyan}
                  fontSize={15}
                >
                  θ
                </text>
                <text
                  x={CX + (cos * R) / 2}
                  y={sin >= 0 ? CY + 21 : CY - 11}
                  textAnchor="middle"
                  fill={C.catet1}
                  fontSize={15}
                >
                  cos θ = {fmt(cos)}
                </text>
                <text
                  x={senX}
                  y={senMidY - 4}
                  textAnchor={senRight ? "start" : "end"}
                  fill={C.catet2}
                  fontSize={15}
                >
                  sen θ
                  <tspan x={senX} dy={18}>
                    {fmt(sin)}
                  </tspan>
                </text>
                {tanDefined ? (
                  <text x={CX + R + 10} y={tanLabelY - 4} fill={C.vecSum} fontSize={15}>
                    tg θ
                    <tspan x={CX + R + 10} dy={18}>
                      {fmt(tan)}
                    </tspan>
                    {tanClipped && (
                      <tspan x={CX + R + 10} dy={16} fontSize={11} fontWeight={500}>
                        {tanPx > 0 ? "continua ↑" : "continua ↓"}
                      </tspan>
                    )}
                  </text>
                ) : (
                  <text x={CX} y={H - 8} textAnchor="middle" fill={C.vecSum} fontSize={13}>
                    tg θ não existe: a reta do ângulo é paralela a x = 1
                  </text>
                )}
              </g>
            </svg>

            <p className="mt-4 text-center text-sm text-fg/60" aria-hidden>
              <span className="font-semibold text-cyan-accent">θ = {deg(angle)}</span> ={" "}
              {fmt(angle)} rad
            </p>
            <input
              type="range"
              min={0}
              max={359.9}
              step={0.1}
              value={snapDeg(angle / TO_RAD)}
              onChange={(e) => setAngle(Number(e.target.value) * TO_RAD)}
              className="mt-2 w-full accent-cyan-accent"
              aria-label="Ângulo em graus"
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
                        ? "border-cyan-accent/60 bg-cyan-accent/15 text-fg"
                        : "border-fg/15 text-fg/70 hover:bg-fg/5"
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
                className="rounded-2xl border border-fg/10 bg-fg/[0.03] p-4 text-center"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-fg/50">{m.l}</p>
                <p
                  className="mt-1 font-display text-2xl font-bold break-all tabular-nums"
                  style={{ color: m.c }}
                >
                  {m.v}
                </p>
                {m.note && <p className="text-xs text-fg/50">{m.note}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-brand/50 bg-brand/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-fg/50">
              Pitágoras continua aqui
            </p>
            <p className="mt-3 text-center font-display text-2xl font-bold">
              <span className="text-catet2">{fmt(sin * sin)}</span>{" "}
              <span className="text-fg/50">+</span>{" "}
              <span className="text-catet1">{fmt(cos * cos)}</span>{" "}
              <span className="text-fg/50">=</span>{" "}
              <span className="text-brand">{fmt(sin * sin + cos * cos)}</span>
            </p>
            <p className="mt-3 text-sm text-fg/60">
              O triângulo dentro do círculo tem hipotenusa 1 e catetos de comprimento |sen θ| e |cos
              θ|. Os quadrados dos catetos somam o quadrado da hipotenusa, então sen²θ + cos²θ = 1
              para qualquer ângulo (o sinal some ao elevar ao quadrado).
            </p>
          </div>

          <div className="rounded-2xl border border-fg/10 bg-fg/[0.03] p-5 text-sm text-fg/60">
            <p className="font-display font-semibold text-fg">O que cada um significa</p>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-catet1">cosseno</span>: num triângulo retângulo (θ entre 0° e
                90°), é cateto adjacente ÷ hipotenusa. No círculo de raio 1, isso é a coordenada x
                do ponto, e essa é a definição que vale para qualquer ângulo: o cosseno fica
                negativo quando o ponto está à esquerda do eixo vertical.
              </li>
              <li>
                <span className="text-catet2">seno</span>: cateto oposto ÷ hipotenusa no triângulo;
                no círculo, a coordenada y do ponto. Fica negativo quando o ponto está abaixo do
                eixo horizontal.
              </li>
              <li>
                <span className="text-vec-sum">tangente</span> = seno ÷ cosseno, a inclinação da
                reta que sai da origem e passa pelo ponto. No desenho, é a altura em que essa reta
                (prolongada, se preciso para trás) cruza a linha vertical x = 1. Em 90° e 270° o
                cosseno é 0, a reta fica paralela a x = 1 e nunca a cruza: a tangente não existe.
                Perto desses ângulos ela cresce sem limite (para +∞ de um lado, para −∞ do outro).
              </li>
            </ul>
            <p className="mt-4 text-fg/50">
              Guarde o cosseno: na próxima página ele mede o quanto dois vetores de palavras apontam
              para o mesmo lado, uma ideia muito próxima da conta que a atenção de um transformer
              faz.
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
            desc: "O mesmo cosseno comparando vetores de palavras.",
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
