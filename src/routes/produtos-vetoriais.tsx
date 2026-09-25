import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageShell, PageLinks } from "@/components/PageShell";
import { useWindowDrag, clientToSvg } from "@/hooks/use-window-drag";
import { deg, fmt } from "@/lib/format";
import { C, fg } from "@/lib/theme";

export const Route = createFileRoute("/produtos-vetoriais")({
  head: () => ({
    meta: [
      { title: "Produto escalar e vetorial — vetores 2D" },
      {
        name: "description",
        content:
          "Mova dois vetores no plano e acompanhe o produto escalar, o produto vetorial 2D e a soma A + B.",
      },
      { property: "og:title", content: "Produto escalar e vetorial — vetores 2D" },
      {
        property: "og:description",
        content:
          "Uma visualização interativa para explorar alinhamento, área orientada e a soma de dois vetores.",
      },
    ],
  }),
  component: ProdutosVetoriais,
});

type Vector = { x: number; y: number };
type VectorId = "a" | "b";
type Vectors = Record<VectorId, Vector>;

const SIZE = 560;
const CENTER = SIZE / 2;
const UNIT = 48;
const LIMIT = 5;
const sx = (x: number) => CENTER + x * UNIT;
const sy = (y: number) => CENTER - y * UNIT;
const clampLabel = (value: number) => Math.max(32, Math.min(SIZE - 32, value));

/** Limites de uma coordenada: ela fica em [-5, 5] e a soma com o outro vetor também. */
const bounds = (other: number) => ({
  min: Math.max(-LIMIT, -LIMIT - other),
  max: Math.min(LIMIT, LIMIT - other),
});
const clampWithSum = (value: number, other: number) => {
  const { min, max } = bounds(other);
  return Math.max(min, Math.min(max, value));
};
const otherId = (id: VectorId): VectorId => (id === "a" ? "b" : "a");

const isZero = (v: Vector) => v.x === 0 && v.y === 0;

const STYLE: Record<VectorId, { color: string; label: string; textClass: string }> = {
  a: { color: C.catet1, label: "A", textClass: "text-catet1" },
  b: { color: C.catet2, label: "B", textClass: "text-catet2" },
};

function ProdutosVetoriais() {
  const [vec, setVec] = useState<Vectors>({ a: { x: 4, y: 2 }, b: { x: 1, y: 3 } });
  const [dragging, setDragging] = useState<VectorId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { a, b } = vec;
  const dotX = a.x * b.x;
  const dotY = a.y * b.y;
  const dot = dotX + dotY;
  const crossFirst = a.x * b.y;
  const crossSecond = a.y * b.x;
  const cross = crossFirst - crossSecond;
  const c = { x: a.x + b.x, y: a.y + b.y };
  const lenA = Math.hypot(a.x, a.y);
  const lenB = Math.hypot(b.x, b.y);
  const anyZero = isZero(a) || isZero(b);
  const angle = anyZero ? null : Math.acos(Math.max(-1, Math.min(1, dot / (lenA * lenB))));

  // Atualiza um vetor a partir do estado mais recente, para que o limite da soma use o valor
  // atual do outro vetor (e não o valor capturado quando o arraste começou).
  const updateVector = (id: VectorId, next: Vector) =>
    setVec((prev) => {
      const other = prev[otherId(id)];
      const clamped = { x: clampWithSum(next.x, other.x), y: clampWithSum(next.y, other.y) };
      const current = prev[id];
      return clamped.x === current.x && clamped.y === current.y ? prev : { ...prev, [id]: clamped };
    });

  const setFromPointer = (id: VectorId, clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = clientToSvg(svg, clientX, clientY, SIZE, SIZE);
    updateVector(id, {
      x: Math.round((x - CENTER) / UNIT),
      y: Math.round((CENTER - y) / UNIT),
    });
  };

  useWindowDrag(dragging !== null, {
    onMove: (e) => dragging && setFromPointer(dragging, e.clientX, e.clientY),
    onUp: () => setDragging(null),
    onCancel: () => setDragging(null),
  });

  const startDrag = (id: VectorId) => (event: React.PointerEvent) => {
    event.preventDefault();
    setDragging(id);
    setFromPointer(id, event.clientX, event.clientY);
  };

  const setCoord = (id: VectorId, axis: "x" | "y", value: string) => {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n)) return;
    const wanted = Math.round(n);
    const other = vec[otherId(id)][axis];
    const got = clampWithSum(wanted, other);
    setNotice(
      got === wanted
        ? null
        : `${STYLE[id].label}.${axis} ficou em ${got}: com ${STYLE[otherId(id)].label}.${axis} = ${other}, um valor ${wanted} levaria a soma C para fora do plano (de −${LIMIT} a ${LIMIT}).`,
    );
    updateVector(id, { ...vec[id], [axis]: got });
  };

  return (
    <PageShell
      eyebrow="Vetores no plano · duas operações"
      title={
        <>
          Produto <span className="text-catet1">escalar</span> e produto{" "}
          <span className="text-catet2">vetorial</span>
        </>
      }
      intro="Arraste as setas A e B pela ponta ou pelo corpo, ou digite as coordenadas. O produto escalar combina o alinhamento com os comprimentos (A · B = |A| · |B| · cos θ); o produto vetorial mede a área orientada do paralelogramo formado por A e B e aponta para fora do plano."
    >
      <div className="mt-9 grid items-start gap-7 lg:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]">
        <section className="rounded-3xl border border-fg/10 bg-fg/[0.03] p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-fg/50">Plano cartesiano</p>
            <div className="flex flex-wrap items-center gap-4 text-sm" aria-live="polite">
              <span className="text-catet1">
                A = ({a.x}, {a.y})
              </span>
              <span className="text-catet2">
                B = ({b.x}, {b.y})
              </span>
              <span className="font-semibold text-vec-sum">
                C = ({c.x}, {c.y})
              </span>
            </div>
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="mx-auto aspect-square w-full max-w-[560px] touch-none select-none"
            role="group"
            aria-label="Plano cartesiano com dois vetores arrastáveis, o paralelogramo que eles formam e a soma A + B"
          >
            <defs>
              {(["a", "b"] as const).map((id) => (
                <marker
                  key={id}
                  id={`arrow-${id}`}
                  markerWidth="12"
                  markerHeight="12"
                  refX="11"
                  refY="6"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0 0.5 L12 6 L0 11.5 Z" fill={STYLE[id].color} />
                </marker>
              ))}
              <marker
                id="arrow-c"
                markerWidth="13"
                markerHeight="13"
                refX="12"
                refY="6.5"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0 0.5 L13 6.5 L0 12.5 Z" fill={C.vecSum} />
              </marker>
            </defs>
            {Array.from({ length: 11 }, (_, index) => index - 5).map((value) => (
              <g key={value}>
                <line x1={sx(value)} y1={20} x2={sx(value)} y2={SIZE - 20} stroke={fg(6)} />
                <line x1={20} y1={sy(value)} x2={SIZE - 20} y2={sy(value)} stroke={fg(6)} />
                {value !== 0 && (
                  <>
                    <text
                      x={sx(value)}
                      y={CENTER + 20}
                      textAnchor="middle"
                      fill={fg(45)}
                      fontSize="11"
                    >
                      {value}
                    </text>
                    <text
                      x={CENTER - 13}
                      y={sy(value) + 4}
                      textAnchor="end"
                      fill={fg(45)}
                      fontSize="11"
                    >
                      {value}
                    </text>
                  </>
                )}
              </g>
            ))}
            <line x1={20} y1={CENTER} x2={SIZE - 20} y2={CENTER} stroke={fg(25)} />
            <line x1={CENTER} y1={20} x2={CENTER} y2={SIZE - 20} stroke={fg(25)} />

            <polygon
              points={`${CENTER},${CENTER} ${sx(a.x)},${sy(a.y)} ${sx(c.x)},${sy(c.y)} ${sx(b.x)},${sy(b.y)}`}
              fill={C.brand}
              fillOpacity="0.5"
              stroke={C.brand}
              strokeOpacity="0.9"
              strokeDasharray="7 6"
              className="transition-all duration-300"
            />

            {/* soma A + B */}
            {!isZero(c) && (
              <line
                x1={CENTER}
                y1={CENTER}
                x2={sx(c.x)}
                y2={sy(c.y)}
                stroke={C.vecSum}
                strokeWidth="5"
                strokeLinecap="round"
                markerEnd="url(#arrow-c)"
                pointerEvents="none"
              />
            )}
            <text
              x={clampLabel(sx(c.x) + (c.x >= 4 ? -14 : 14))}
              y={clampLabel(sy(c.y) + (c.y >= 4 ? 24 : -14))}
              textAnchor={c.x >= 4 ? "end" : "start"}
              fill={C.vecSum}
              fontSize="16"
              fontWeight="700"
              pointerEvents="none"
            >
              C = ({c.x}, {c.y})
            </text>

            {/* vetores A e B: seta visível + zona de pega larga ao longo do corpo e na ponta */}
            {(["a", "b"] as const).map((id) => {
              const v = vec[id];
              const { color, label } = STYLE[id];
              const zero = isZero(v);
              return (
                <g key={id}>
                  {!zero && (
                    <line
                      x1={CENTER}
                      y1={CENTER}
                      x2={sx(v.x)}
                      y2={sy(v.y)}
                      stroke={color}
                      strokeWidth="5"
                      markerEnd={`url(#arrow-${id})`}
                      pointerEvents="none"
                    />
                  )}
                  <line
                    x1={CENTER}
                    y1={CENTER}
                    x2={sx(v.x)}
                    y2={sy(v.y)}
                    stroke="transparent"
                    strokeWidth="28"
                    pointerEvents="stroke"
                    className="cursor-grab"
                    onPointerDown={startDrag(id)}
                  />
                  <circle
                    cx={sx(v.x)}
                    cy={sy(v.y)}
                    r="28"
                    fill={color}
                    fillOpacity="0.14"
                    className={dragging === id ? "cursor-grabbing" : "cursor-grab"}
                    onPointerDown={startDrag(id)}
                  >
                    <title>{`Arraste para mover o vetor ${label}`}</title>
                  </circle>
                  <text
                    x={clampLabel(sx(v.x) + 12)}
                    y={clampLabel(sy(v.y) - 15)}
                    fill={color}
                    fontSize="17"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            <circle cx={CENTER} cy={CENTER} r="5" fill={C.vecSum} />
          </svg>
          <p className="mt-3 text-center text-xs text-fg/50">
            O vetor rosa <span className="text-vec-sum">C = A + B</span> é a diagonal e termina
            exatamente no vértice oposto do paralelogramo.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["a", "b"] as const).map((id) => (
              <fieldset
                key={id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-fg/10 px-3 py-2 text-sm"
              >
                <legend className={`px-1 font-semibold ${STYLE[id].textClass}`}>
                  Vetor {STYLE[id].label} pelo teclado
                </legend>
                {(["x", "y"] as const).map((axis) => {
                  const { min, max } = bounds(vec[otherId(id)][axis]);
                  return (
                    <label key={axis} className="flex items-center gap-2 text-fg/60">
                      <span className="font-mono">{axis}</span>
                      <input
                        type="number"
                        step={1}
                        min={min}
                        max={max}
                        title={`De ${min} a ${max}, para a soma C caber no plano`}
                        value={vec[id][axis]}
                        onChange={(e) => setCoord(id, axis, e.target.value)}
                        className="w-16 rounded-md border border-fg/15 bg-fg/5 px-2 py-1 text-fg tabular-nums focus:border-brand focus:outline-none"
                      />
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
          <p className="mt-2 text-xs text-fg/50">
            Cada coordenada vai de −{LIMIT} a {LIMIT}, e a soma C também precisa caber no plano. Por
            isso o limite de A depende de B, e vice-versa.
          </p>
          <p role="status" aria-live="polite" className="mt-1 min-h-4 text-xs text-catet1">
            {notice}
          </p>
        </section>

        <aside className="space-y-4">
          <section
            className="rounded-2xl border border-catet1/60 bg-catet1/10 p-5"
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-catet1">Produto escalar</p>
              <span className="text-2xl font-bold text-catet1">{dot}</span>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 font-mono text-base sm:text-lg">
              <span className="rounded bg-catet1/15 px-2 py-1 text-catet1">
                {a.x} × {b.x}
              </span>
              <span className="text-fg/50">+</span>
              <span className="rounded bg-cyan-accent/15 px-2 py-1 text-cyan-accent">
                {a.y} × {b.y}
              </span>
            </div>
            <p className="mt-3 text-center text-sm text-fg/60">
              <span className="text-catet1">{dotX}</span> +{" "}
              <span className="text-cyan-accent">{dotY}</span> ={" "}
              <strong className="text-fg">{dot}</strong>
            </p>
            {angle === null ? (
              <p className="mt-3 text-xs text-fg/50">
                Ângulo entre A e B: indefinido, porque um dos vetores é nulo.
              </p>
            ) : (
              <>
                <p className="mt-3 text-center text-sm text-fg/60">
                  |A| · |B| · cos θ = {fmt(lenA)} × {fmt(lenB)} × cos {deg(angle)} ={" "}
                  <strong className="text-fg">{fmt(lenA * lenB * Math.cos(angle))}</strong>
                </p>
                <p className="mt-3 text-xs text-fg/50">
                  Aqui θ é o menor ângulo entre A e B (de 0° a 180°). O resultado depende do ângulo
                  e também dos comprimentos: com |A| e |B| fixos, quanto mais alinhados, maior;
                  vetores mais longos também aumentam o valor. Dividindo por |A| · |B| sobra só o
                  cos θ, a similaridade da página anterior.
                </p>
              </>
            )}
          </section>

          <section
            className="rounded-2xl border border-catet2/60 bg-catet2/10 p-5"
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-catet2">Produto vetorial 2D</p>
              <span className="text-2xl font-bold text-catet2">{cross}</span>
            </div>
            {/* determinante 2×2, com colunas e linhas bem separadas */}
            <div className="mt-6 flex items-center justify-center gap-4 font-mono text-lg">
              <span className="h-16 w-px bg-fg/30" aria-hidden />
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-center tabular-nums">
                <span className="text-catet1">{a.x}</span>
                <span className="text-cyan-accent">{a.y}</span>
                <span className="text-catet2">{b.x}</span>
                <span className="text-brand">{b.y}</span>
              </div>
              <span className="h-16 w-px bg-fg/30" aria-hidden />
            </div>
            <p className="mt-6 text-center text-base leading-loose text-fg/60">
              <span className="text-catet1">{a.x}</span> × <span className="text-brand">{b.y}</span>{" "}
              − <span className="text-cyan-accent">{a.y}</span> ×{" "}
              <span className="text-catet2">{b.x}</span>
              <br />
              <span className="text-catet2">
                {crossFirst} − {crossSecond}
              </span>{" "}
              = <strong className="text-catet2">{cross}</strong>
            </p>
            <p className="mt-6 rounded-lg bg-vec-sum/15 px-4 py-3 text-center text-sm font-semibold text-vec-sum">
              Vetor perpendicular ao plano: A × B = (0, 0, {cross}) = {cross}k̂
            </p>
            <p className="mt-5 text-xs leading-relaxed text-fg/50">
              O produto vetorial é definido no espaço. Pensando A e B como vetores com z = 0, o
              resultado só tem a componente z, que é o determinante acima. O módulo,{" "}
              {Math.abs(cross)}, é a área do paralelogramo. O sinal diz o sentido da rotação de A
              para B pelo menor ângulo: positivo se for anti-horária, negativo se for horária, zero
              se A e B forem paralelos.
            </p>
          </section>
        </aside>
      </div>

      <PageLinks
        links={[
          {
            to: "/similaridade",
            eyebrow: "Passo anterior",
            title: "Cosseno nos transformers",
            desc: "O produto escalar dividido pelos comprimentos: o cosseno.",
            accent: "brand",
          },
          {
            to: "/trigonometria",
            eyebrow: "Fundamentos",
            title: "Seno, cosseno e tangente",
            desc: "O ângulo entre vetores nasce aqui.",
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
