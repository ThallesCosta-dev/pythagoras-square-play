import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { PageShell, GradientText, PageLinks } from "@/components/PageShell";
import { useWindowDrag, clientToSvg } from "@/hooks/use-window-drag";
import { fmt } from "@/lib/format";
import { C, soft, fg } from "@/lib/theme";

export const Route = createFileRoute("/similaridade")({
  head: () => ({
    meta: [
      { title: "Similaridade de cosseno em transformers — vetores 2D" },
      {
        name: "description",
        content:
          "Arraste o vetor de consulta e as palavras, e veja como a similaridade de cosseno entre vetores decide a atenção de um modelo de linguagem.",
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
type KeyId = "gato" | "cachorro" | "felino" | "carro" | "motor" | "banco";
type KeyInfo = { id: KeyId; word: string; color: string };
type Positions = Record<KeyId, Vec2>;
type DragTarget = "q" | KeyId | null;

const KEYS: KeyInfo[] = [
  { id: "gato", word: "gato", color: C.catet1 },
  { id: "cachorro", word: "cachorro", color: C.amber },
  { id: "felino", word: "felino", color: C.orange },
  { id: "carro", word: "carro", color: C.catet2 },
  { id: "motor", word: "motor", color: C.emerald },
  { id: "banco", word: "banco", color: C.cyan },
];

const DEFAULT_QUERY: Vec2 = { x: 3.2, y: 2.0 };
const DEFAULT_POSITIONS: Positions = {
  gato: { x: 3.2, y: 2.5 },
  cachorro: { x: 2.3, y: 3.3 },
  felino: { x: 4.1, y: 1.6 },
  carro: { x: -2.6, y: 2.9 },
  motor: { x: -3.2, y: 2.1 },
  banco: { x: 1.0, y: -3.4 },
};

const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const norm = (a: Vec2) => Math.hypot(a.x, a.y);
const cosSim = (a: Vec2, b: Vec2) => {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
};
const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const coords = (v: Vec2) => `(${fmt(v.x, 1)}, ${fmt(v.y, 1)})`;

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

type CoordInputsProps = {
  vec: Vec2;
  onChange: (axis: "x" | "y", value: string) => void;
  idPrefix: string;
  step?: number;
};

function CoordInputs({ vec, onChange, idPrefix, step = 0.1 }: CoordInputsProps) {
  return (
    <>
      {(["x", "y"] as const).map((axis) => (
        <label key={axis} htmlFor={`${idPrefix}-${axis}`} className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-fg/50">{axis}</span>
          <input
            id={`${idPrefix}-${axis}`}
            type="number"
            step={step}
            min={-LIMIT}
            max={LIMIT}
            value={round1(vec[axis])}
            onChange={(e) => onChange(axis, e.target.value)}
            className="w-16 rounded-md border border-fg/15 bg-fg/5 px-2 py-1 text-sm text-fg tabular-nums focus:border-brand focus:outline-none"
          />
        </label>
      ))}
    </>
  );
}

function Similaridade() {
  const [q, setQ] = useState<Vec2>(DEFAULT_QUERY);
  const [positions, setPositions] = useState<Positions>(DEFAULT_POSITIONS);
  const [temp, setTemp] = useState(4);
  const [dragging, setDragging] = useState<DragTarget>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const setVector = (target: Exclude<DragTarget, null>, next: Vec2) => {
    const v = { x: clamp(next.x), y: clamp(next.y) };
    if (target === "q") setQ(v);
    else setPositions((prev) => ({ ...prev, [target]: v }));
  };

  const setFromPointer = (target: Exclude<DragTarget, null>, clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = clientToSvg(svg, clientX, clientY, S, S);
    setVector(target, { x: (x - CX) / U, y: (CY - y) / U });
  };

  useWindowDrag(dragging !== null, {
    onMove: (e) => dragging && setFromPointer(dragging, e.clientX, e.clientY),
    onUp: () => setDragging(null),
    onCancel: () => setDragging(null),
  });

  const startDrag = (target: Exclude<DragTarget, null>) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(target);
    setFromPointer(target, e.clientX, e.clientY);
  };

  const setCoord = (target: Exclude<DragTarget, null>, axis: "x" | "y", value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const current = target === "q" ? q : positions[target];
    setVector(target, { ...current, [axis]: n });
  };

  const reset = () => {
    setQ(DEFAULT_QUERY);
    setPositions(DEFAULT_POSITIONS);
  };

  const rows = useMemo(() => {
    const sims = KEYS.map((k) => {
      const pos = positions[k.id];
      const sim = cosSim(q, pos);
      return {
        k,
        pos,
        sim,
        ang: (Math.acos(Math.max(-1, Math.min(1, sim))) * 180) / Math.PI,
        exp: Math.exp(sim * temp),
      };
    });
    const sum = sims.reduce((a, s) => a + s.exp, 0) || 1;
    return sims.map((s) => ({ ...s, w: s.exp / sum }));
  }, [q, positions, temp]);

  type Row = (typeof rows)[number];
  const best = rows.reduce<Row | null>((a, b) => (a && a.w > b.w ? a : b), null);
  const qLen = norm(q);
  const showWedge = best !== null && qLen > 0.05 && norm(best.pos) > 0.05;

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
          <span className="text-fg">cosseno do ângulo</span> entre elas: mesmo sentido → cosseno
          perto de 1. Arraste a seta roxa da consulta ou qualquer palavra, ou edite as coordenadas.
        </>
      }
    >
      <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="rounded-3xl border border-fg/10 bg-fg/[0.03] p-5 sm:p-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-fg/50">
                Espaço de embeddings (2 dimensões)
              </p>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 rounded-full border border-fg/15 px-3 py-1.5 text-xs text-fg/80 transition hover:bg-fg/5"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Restaurar
              </button>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${S} ${S}`}
              className="mx-auto w-full max-w-[560px] touch-none select-none"
              role="group"
              aria-label="Vetores de palavras num plano cartesiano; a consulta e cada palavra podem ser arrastadas, ou editadas nos campos abaixo"
              onPointerDown={startDrag("q")}
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
                    <line x1={sx(v)} y1={sy(-5.5)} x2={sx(v)} y2={sy(5.5)} stroke={fg(5)} />
                    <line x1={sx(-5.5)} y1={sy(v)} x2={sx(5.5)} y2={sy(v)} stroke={fg(5)} />
                  </g>
                );
              })}
              <line x1={sx(-5.6)} y1={CY} x2={sx(5.6)} y2={CY} stroke={fg(20)} />
              <line x1={CX} y1={sy(-5.6)} x2={CX} y2={sy(5.6)} stroke={fg(20)} />

              {/* setor entre q e a palavra mais parecida */}
              {showWedge && (
                <path
                  d={`M ${CX} ${CY} L ${sx((q.x / qLen) * 1.6)} ${sy((q.y / qLen) * 1.6)} A ${
                    1.6 * U
                  } ${1.6 * U} 0 0 ${q.x * best.pos.y - q.y * best.pos.x > 0 ? 1 : 0} ${sx(
                    (best.pos.x / norm(best.pos)) * 1.6,
                  )} ${sy((best.pos.y / norm(best.pos)) * 1.6)} Z`}
                  fill={soft(C.brand, 18)}
                />
              )}

              {rows.map(({ k, pos, w }) => {
                const right = pos.x >= 0;
                const tipX = sx(pos.x);
                const tipY = sy(pos.y);
                return (
                  <g key={k.id}>
                    <line
                      x1={CX}
                      y1={CY}
                      x2={tipX}
                      y2={tipY}
                      stroke={k.color}
                      strokeWidth={2 + w * 8}
                      opacity={0.35 + w * 0.65}
                      markerEnd={`url(#ah-${k.id})`}
                      pointerEvents="none"
                    />
                    <text
                      x={tipX + (right ? 10 : -10)}
                      y={tipY - 10}
                      textAnchor={right ? "start" : "end"}
                      fill={k.color}
                      fontSize={14}
                      fontWeight={700}
                      pointerEvents="none"
                    >
                      {k.word}
                    </text>
                    <text
                      x={tipX + (right ? 10 : -10)}
                      y={tipY + 4}
                      textAnchor={right ? "start" : "end"}
                      fill={k.color}
                      fillOpacity={0.8}
                      fontSize={11}
                      pointerEvents="none"
                    >
                      {coords(pos)}
                    </text>
                    {/* alça de arraste da palavra */}
                    <circle
                      cx={tipX}
                      cy={tipY}
                      r={18}
                      fill={k.color}
                      fillOpacity={dragging === k.id ? 0.35 : 0.14}
                      stroke={k.color}
                      strokeOpacity={0.5}
                      className={dragging === k.id ? "cursor-grabbing" : "cursor-grab"}
                      onPointerDown={startDrag(k.id)}
                    >
                      <title>{`Arraste para mover "${k.word}"`}</title>
                    </circle>
                  </g>
                );
              })}

              {/* vetor de consulta */}
              <line
                x1={CX}
                y1={CY}
                x2={sx(q.x)}
                y2={sy(q.y)}
                stroke={C.brandLight}
                strokeWidth={5}
                markerEnd="url(#ah-q)"
                pointerEvents="none"
              />
              <circle cx={sx(q.x)} cy={sy(q.y)} r={12} fill={C.brand} pointerEvents="none" />
              <circle
                cx={sx(q.x)}
                cy={sy(q.y)}
                r={22}
                fill={soft(C.brand, 20)}
                className={dragging === "q" ? "cursor-grabbing" : "cursor-grab"}
                onPointerDown={startDrag("q")}
              >
                <title>Arraste para mover a consulta</title>
              </circle>
              <text
                x={Math.min(sx(q.x) + 16, S - 12)}
                y={sy(q.y) + 26}
                textAnchor={sx(q.x) + 16 > S - 130 ? "end" : "start"}
                fill={C.brandText}
                fontSize={14}
                fontWeight={700}
                pointerEvents="none"
              >
                {`consulta ${coords(q)}`}
              </text>
            </svg>

            <p className="mt-3 text-sm text-fg/60">
              Repare: aqui só o <em>ângulo</em> importa. Alongue uma seta sem girá-la e o cosseno
              não muda — o cosseno mede sentido, não tamanho.
            </p>

            {/* edição manual */}
            <div className="mt-5 rounded-2xl border border-fg/10 bg-fg/[0.02] p-4">
              <p className="font-display text-sm font-semibold">Editar coordenadas</p>
              <p className="mt-1 text-xs text-fg/50">
                Os mesmos vetores do desenho. Valores entre −5,3 e 5,3.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 sm:col-span-2">
                  <span className="mr-auto text-sm font-semibold text-brand-text">consulta</span>
                  <CoordInputs
                    vec={q}
                    idPrefix="vec-q"
                    onChange={(axis, value) => setCoord("q", axis, value)}
                  />
                </div>
                {KEYS.map((k) => (
                  <div
                    key={k.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-fg/10 px-3 py-2"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: k.color }}
                      aria-hidden
                    />
                    <span className="mr-auto text-sm font-medium" style={{ color: k.color }}>
                      {k.word}
                    </span>
                    <CoordInputs
                      vec={positions[k.id]}
                      idPrefix={`vec-${k.id}`}
                      onChange={(axis, value) => setCoord(k.id, axis, value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-fg/10 bg-fg/[0.03] p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-display font-semibold">Atenção do modelo</p>
              <p className="text-xs text-fg/50">softmax(cos · escala)</p>
            </div>
            <div className="mt-4 space-y-3" aria-live="polite">
              {[...rows]
                .sort((a, b) => b.w - a.w)
                .map(({ k, pos, sim, ang, w }) => (
                  <div key={k.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium" style={{ color: k.color }}>
                        {k.word}{" "}
                        <span className="text-xs font-normal text-fg/50">{coords(pos)}</span>
                      </span>
                      <span className="tabular-nums text-fg/60">
                        cos {fmt(sim)} · {fmt(ang, 0)}° ·{" "}
                        <span className="text-fg">{fmt(w * 100, 0)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-fg/10">
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
              className="mt-5 block text-xs uppercase tracking-[0.18em] text-fg/50"
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
            <p className="text-[11px] uppercase tracking-[0.2em] text-fg/50">Leitura</p>
            <p className="mt-2 text-sm text-fg/70">
              A consulta aponta mais para <strong className="text-fg">{best?.k.word}</strong>{" "}
              (ângulo de {fmt(best?.ang ?? 0, 0)}°), então o modelo puxa{" "}
              {fmt(best ? best.w * 100 : 0, 0)}% da informação dessa palavra ao formar a próxima
              representação.
            </p>
          </div>

          <div className="rounded-2xl border border-fg/10 bg-fg/[0.03] p-5 text-sm text-fg/60">
            <p className="font-display font-semibold text-fg">Por que isso é o mesmo cosseno</p>
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
            <p className="mt-3 text-fg/50">
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
