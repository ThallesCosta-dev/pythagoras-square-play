import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { PageShell, GradientText, PageLinks } from "@/components/PageShell";
import { useWindowDrag, clientToSvg } from "@/hooks/use-window-drag";
import { fmt } from "@/lib/format";
import { C, soft, white } from "@/lib/theme";

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
    ],
  }),
  component: Similaridade,
});

const S = 540;
const CX = S / 2;
const CY = S / 2;
const U = 46; // px por unidade
const LIMIT = 5.3;

const sx = (x: number) => CX + x * U;
const sy = (y: number) => CY - y * U;

type Vec2 = { x: number; y: number };
type Key = Vec2 & { id: string; word: string; color: string };

const KEYS: Key[] = [
  { id: "gato", word: "gato", x: 3.4, y: 2.2, color: C.catet1 },
  { id: "cachorro", word: "cachorro", x: 3.0, y: 2.7, color: C.amber },
  { id: "felino", word: "felino", x: 3.6, y: 1.9, color: C.orange },
  { id: "carro", word: "carro", x: -2.6, y: 2.9, color: C.catet2 },
  { id: "motor", word: "motor", x: -3.2, y: 2.1, color: C.emerald },
  { id: "banco", word: "banco", x: 1.0, y: -3.4, color: C.cyan },
];

const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const norm = (a: Vec2) => Math.hypot(a.x, a.y);
const cosSim = (a: Vec2, b: Vec2) => {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
};
const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, v));

function Arrowhead({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      markerUnits="userSpaceOnUse"
      markerWidth="14"
      markerHeight="14"
      refX="11"
      refY="7"
      orient="auto"
    >
      <path d="M0,1 L13,7 L0,13 z" fill={color} />
    </marker>
  );
}

function Similaridade() {
  const [q, setQ] = useState<Vec2>({ x: 3.2, y: 2.0 });
  const [temp, setTemp] = useState(4);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const setFromPointer = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = clientToSvg(svg, clientX, clientY, S, S);
    setQ({ x: clamp((x - CX) / U), y: clamp((CY - y) / U) });
  };

  useWindowDrag(dragging, {
    onMove: (e) => setFromPointer(e.clientX, e.clientY),
    onUp: () => setDragging(false),
    onCancel: () => setDragging(false),
  });

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
  const qLen = norm(q);
  const showWedge = best !== null && qLen > 0.05;

  const setCoord = (axis: "x" | "y", value: string) => {
    const n = Number(value);
    if (Number.isFinite(n)) setQ((prev) => ({ ...prev, [axis]: clamp(n) }));
  };

  return (
    <PageShell
      eyebrow="Do cosseno à atenção · vetores no plano"
      title={
        <>
          <GradientText>Similaridade de cosseno</GradientText>{" "}
          <GradientText alt>nos transformers</GradientText>
        </>
      }
      intro={
        <>
          Num modelo de linguagem, cada palavra vira um vetor. Para decidir em quais palavras
          prestar atenção, o modelo compara a consulta com cada palavra. Aqui usamos o{" "}
          <span className="text-white">cosseno do ângulo</span> entre elas: mesmo sentido → cosseno
          perto de 1. Arraste a seta roxa.
        </>
      }
    >
      <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/50">
              Espaço de embeddings (2 dimensões)
            </p>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${S} ${S}`}
              className="mx-auto w-full max-w-[560px] touch-none select-none"
              role="img"
              aria-label="Vetores de palavras num plano cartesiano com o vetor de consulta arrastável; use os campos numéricos abaixo para mover a consulta pelo teclado"
              onPointerDown={(e) => {
                setDragging(true);
                setFromPointer(e.clientX, e.clientY);
              }}
            >
              <defs>
                {KEYS.map((k) => (
                  <Arrowhead key={k.id} id={`ah-${k.id}`} color={k.color} />
                ))}
                <Arrowhead id="ah-q" color={C.brandLight} />
              </defs>

              {Array.from({ length: 11 }).map((_, i) => {
                const v = i - 5;
                return (
                  <g key={v}>
                    <line x1={sx(v)} y1={sy(-5.5)} x2={sx(v)} y2={sy(5.5)} stroke={white(5)} />
                    <line x1={sx(-5.5)} y1={sy(v)} x2={sx(5.5)} y2={sy(v)} stroke={white(5)} />
                  </g>
                );
              })}
              <line x1={sx(-5.6)} y1={CY} x2={sx(5.6)} y2={CY} stroke={white(20)} />
              <line x1={CX} y1={sy(-5.6)} x2={CX} y2={sy(5.6)} stroke={white(20)} />

              {/* setor entre q e a palavra mais parecida */}
              {showWedge && (
                <path
                  d={`M ${CX} ${CY} L ${sx((q.x / qLen) * 1.6)} ${sy((q.y / qLen) * 1.6)} A ${
                    1.6 * U
                  } ${1.6 * U} 0 0 ${q.x * best.k.y - q.y * best.k.x > 0 ? 1 : 0} ${sx(
                    (best.k.x / norm(best.k)) * 1.6,
                  )} ${sy((best.k.y / norm(best.k)) * 1.6)} Z`}
                  fill={soft(C.brand, 18)}
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
                    markerEnd={`url(#ah-${k.id})`}
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

              {/* vetor de consulta */}
              <line
                x1={CX}
                y1={CY}
                x2={sx(q.x)}
                y2={sy(q.y)}
                stroke={C.brandLight}
                strokeWidth={5}
                markerEnd="url(#ah-q)"
              />
              <circle cx={sx(q.x)} cy={sy(q.y)} r={12} fill={C.brand} />
              <circle cx={sx(q.x)} cy={sy(q.y)} r={22} fill={soft(C.brand, 20)} />
              <text
                x={Math.min(sx(q.x) + 16, S - 12)}
                y={sy(q.y) + 26}
                textAnchor={sx(q.x) + 16 > S - 130 ? "end" : "start"}
                fill={C.brandText}
                fontSize={14}
                fontWeight={700}
              >
                consulta ({fmt(q.x, 1)}, {fmt(q.y, 1)})
              </text>
            </svg>

            <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
              <span className="text-white/60">Consulta pelo teclado:</span>
              {(["x", "y"] as const).map((axis) => (
                <label key={axis} className="flex items-center gap-2 text-white/60">
                  <span className="font-mono text-brand-text">{axis}</span>
                  <input
                    type="number"
                    step={0.1}
                    min={-LIMIT}
                    max={LIMIT}
                    value={Number(q[axis].toFixed(1))}
                    onChange={(e) => setCoord(axis, e.target.value)}
                    className="w-20 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-white tabular-nums focus:border-brand focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm text-white/60">
              Repare: aqui só o <em>ângulo</em> importa. Alongue a seta sem girá-la e o cosseno não
              muda — o cosseno mede sentido, não tamanho.
            </p>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-display font-semibold">Atenção do modelo</p>
              <p className="text-xs text-white/50">softmax(cos · escala)</p>
            </div>
            <div className="mt-4 space-y-3" aria-live="polite">
              {[...rows]
                .sort((a, b) => b.w - a.w)
                .map(({ k, sim, ang, w }) => (
                  <div key={k.id}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium" style={{ color: k.color }}>
                        {k.word}
                      </span>
                      <span className="tabular-nums text-white/60">
                        cos {fmt(sim)} · {fmt(ang, 0)}° ·{" "}
                        <span className="text-white">{fmt(w * 100, 0)}%</span>
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
            <label
              htmlFor="atencao-escala"
              className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/50"
            >
              Nitidez da atenção ({fmt(temp, 1)})
            </label>
            <input
              id="atencao-escala"
              type="range"
              min={0.5}
              max={12}
              step={0.1}
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
              className="mt-2 w-full accent-brand"
            />
          </div>

          <div className="rounded-2xl border border-brand/50 bg-brand/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Leitura</p>
            <p className="mt-2 text-sm text-white/70">
              A consulta aponta mais para <strong className="text-white">{best?.k.word}</strong>{" "}
              (ângulo de {fmt(best?.ang ?? 0, 0)}°), então o modelo puxa{" "}
              {fmt(best ? best.w * 100 : 0, 0)}% da informação dessa palavra ao formar a próxima
              representação.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
            <p className="font-display font-semibold text-white">Por que isso é o mesmo cosseno</p>
            <p className="mt-2">
              cos θ = (q · k) ÷ (|q| · |k|). O produto escalar no numerador e as normas — que vêm
              direto de Pitágoras, |v| = √(x² + y²) — no denominador.
            </p>
            <p className="mt-3">
              No transformer real, a atenção usa q · k dividido por √d e passa por softmax, sem
              dividir pelos comprimentos: lá o tamanho dos vetores também pesa. Nesta demo
              normalizamos de propósito para isolar o ângulo, e o que sobra é exatamente a
              similaridade de cosseno: um número entre −1 (sentidos opostos) e 1 (mesma direção).
            </p>
            <p className="mt-3 text-white/50">
              Aqui usamos 2 dimensões para caber na tela; um modelo real usa centenas ou milhares —
              a conta é idêntica.
            </p>
          </div>
        </aside>
      </div>

      <PageLinks
        links={[
          {
            to: "/produtos-vetoriais",
            eyebrow: "Próximo passo",
            title: "Produto escalar e vetorial",
            desc: "O produto escalar de perto, e o seu irmão perpendicular.",
          },
          {
            to: "/trigonometria",
            eyebrow: "Passo anterior",
            title: "Seno, cosseno e tangente",
            desc: "De onde vem o cosseno que usamos aqui.",
          },
          {
            to: "/",
            eyebrow: "Começo",
            title: "Teorema de Pitágoras",
            desc: "Volte ao mosaico de quadradinhos.",
            accent: "brand",
          },
        ]}
      />
    </PageShell>
  );
}
