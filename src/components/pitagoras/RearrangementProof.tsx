import { useState } from "react";
import { fmt } from "@/lib/format";
import { C, fg, soft } from "@/lib/theme";

/*
 * Prova por rearranjo. Um quadrado de lado s = a + b contém 4 cópias do triângulo retângulo de
 * catetos a e b. Na arrumação 1 elas formam dois retângulos a × b e sobram os quadrados a² e b²;
 * na arrumação 2 ficam nos cantos e sobra um quadrado inclinado de lado c. Cada triângulo tem a
 * mesma rotação nas duas arrumações: só a posição muda, então a animação é um deslizamento.
 *
 * Triângulo base: ângulo reto na origem, cateto a sobre +x e cateto b sobre +y, girado de φ.
 */
type Placement = {
  phi: number;
  one: (a: number, s: number) => Pt;
  two: (a: number, s: number) => Pt;
};
type Pt = [number, number];

const TRIANGLES: Placement[] = [
  { phi: 0, one: (a) => [0, a], two: () => [0, 0] },
  { phi: 90, one: (_a, s) => [s, 0], two: (_a, s) => [s, 0] },
  { phi: 180, one: (a, s) => [a, s], two: (_a, s) => [s, s] },
  { phi: 270, one: (a) => [a, a], two: (_a, s) => [0, s] },
];

const VIEW = 320;
const PAD = 12;
const BOX = VIEW - 2 * PAD;

function rotate([x, y]: Pt, phi: number): Pt {
  const r = (phi * Math.PI) / 180;
  const c = Math.round(Math.cos(r));
  const s = Math.round(Math.sin(r));
  return [x * c - y * s, x * s + y * c];
}

export function RearrangementProof() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3.5);
  const [layout, setLayout] = useState<1 | 2>(1);

  const s = a + b;
  const k = BOX / s;
  // coordenadas matemáticas (y para cima) → SVG (y para baixo)
  const X = (x: number) => PAD + x * k;
  const Y = (y: number) => PAD + BOX - y * k;
  const poly = (pts: Pt[]) => pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");

  const one = layout === 1;
  const c = Math.hypot(a, b);

  return (
    <section className="mt-12 rounded-3xl border border-fg/10 bg-fg/[0.03] p-5 sm:p-7">
      <p className="text-[11px] uppercase tracking-[0.2em] text-fg/50">Para qualquer triângulo</p>
      <h2 className="mt-2 font-display text-2xl font-bold">A prova por rearranjo</h2>
      <p className="mt-3 max-w-3xl text-sm text-fg/60">
        Contar quadradinhos só funciona com lados inteiros. Esta prova vale para qualquer triângulo
        retângulo, com quaisquer catetos a e b: mude os valores e troque a arrumação.
      </p>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
        <div>
          <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            className="mx-auto w-full max-w-[380px]"
            role="img"
            aria-label={
              one
                ? "Quadrado de lado a + b com quatro triângulos formando dois retângulos; sobram os quadrados a² e b²"
                : "Quadrado de lado a + b com quatro triângulos nos cantos; sobra um quadrado inclinado c²"
            }
          >
            <rect
              x={PAD}
              y={PAD}
              width={BOX}
              height={BOX}
              fill={fg(4)}
              stroke={fg(40)}
              strokeWidth={2}
            />

            {/* o que sobra em cada arrumação */}
            <g
              className="transition-opacity duration-700 motion-reduce:transition-none"
              opacity={one ? 1 : 0}
            >
              <polygon
                points={poly([
                  [0, 0],
                  [a, 0],
                  [a, a],
                  [0, a],
                ])}
                fill={soft(C.catet1, 55)}
              />
              <polygon
                points={poly([
                  [a, a],
                  [s, a],
                  [s, s],
                  [a, s],
                ])}
                fill={soft(C.catet2, 55)}
              />
              <text
                x={X(a / 2)}
                y={Y(a / 2)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={C.catet1}
                fontWeight={700}
                fontSize={18}
              >
                a²
              </text>
              <text
                x={X(a + b / 2)}
                y={Y(a + b / 2)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={C.catet2}
                fontWeight={700}
                fontSize={18}
              >
                b²
              </text>
            </g>
            <g
              className="transition-opacity duration-700 motion-reduce:transition-none"
              opacity={one ? 0 : 1}
            >
              <polygon
                points={poly([
                  [a, 0],
                  [s, a],
                  [b, s],
                  [0, b],
                ])}
                fill={soft(C.brand, 45)}
              />
              <text
                x={X(s / 2)}
                y={Y(s / 2)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={C.brandText}
                fontWeight={700}
                fontSize={18}
              >
                c²
              </text>
            </g>

            {/* os mesmos 4 triângulos, só deslizando */}
            {TRIANGLES.map((t) => {
              const [tx, ty] = (one ? t.one : t.two)(a, s);
              const pts = (
                [
                  [0, 0],
                  [a, 0],
                  [0, b],
                ] as Pt[]
              ).map((p) => rotate(p, t.phi));
              return (
                <g
                  key={t.phi}
                  className="transition-transform duration-700 ease-in-out motion-reduce:transition-none"
                  style={{ transform: `translate(${tx * k}px, ${-ty * k}px)` }}
                >
                  <polygon
                    points={pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}
                    fill={soft(C.cyan, 30)}
                    stroke={C.cyan}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* a + b no lado de baixo, igual nas duas arrumações */}
            <g fontSize={13} fontWeight={600} textAnchor="middle">
              <text x={X(a / 2)} y={VIEW - 1} fill={C.catet1}>
                a
              </text>
              <text x={X(a + b / 2)} y={VIEW - 1} fill={C.catet2}>
                b
              </text>
            </g>
          </svg>

          <div
            className="mt-4 flex justify-center gap-2"
            role="group"
            aria-label="Arrumação dos triângulos"
          >
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLayout(n)}
                aria-pressed={layout === n}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  layout === n
                    ? "border-brand/60 bg-brand/15 text-fg"
                    : "border-fg/15 text-fg/70 hover:bg-fg/5"
                }`}
              >
                Arrumação {n}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {(
              [
                ["a", a, setA, "accent-catet1", "text-catet1"],
                ["b", b, setB, "accent-catet2", "text-catet2"],
              ] as const
            ).map(([name, value, set, accent, text]) => (
              <label key={name} className="block text-sm">
                <span className={`font-semibold ${text}`}>
                  cateto {name} = {fmt(value, 1)}
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className={`mt-1 w-full ${accent}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4 text-sm text-fg/70">
          <ol className="space-y-3">
            <li>
              <strong className="text-fg">1.</strong> Nas duas arrumações o quadrado grande é o
              mesmo: lado a + b.
            </li>
            <li>
              <strong className="text-fg">2.</strong> Dentro dele estão os mesmos 4 triângulos
              retângulos, de catetos a e b e hipotenusa c. Eles só mudam de lugar.
            </li>
            <li>
              <strong className="text-fg">3.</strong> Então a área que sobra é a mesma nas duas. Na
              arrumação 1 sobram <span className="text-catet1">a²</span> e{" "}
              <span className="text-catet2">b²</span>. Na arrumação 2 sobra um quadrilátero com os
              quatro lados iguais a c.
            </li>
            <li>
              <strong className="text-fg">4.</strong> Esse quadrilátero é um quadrado: em cada
              vértice dele, os dois ângulos agudos do triângulo somam 90° (os três ângulos do
              triângulo somam 180° e um deles é reto), e junto com o ângulo do quadrilátero formam
              um ângulo raso, de 180°. Sobra 90° para o quadrilátero. A área dele é{" "}
              <span className="text-brand-text">c²</span>.
            </li>
            <li>
              <strong className="text-fg">Logo, a² + b² = c²</strong>, para quaisquer catetos a e b.
            </li>
          </ol>

          <div className="rounded-2xl border border-brand/40 bg-brand/10 p-4 font-mono text-sm">
            <p className="font-body text-xs uppercase tracking-[0.18em] text-fg/50">
              A mesma conta, com os números
            </p>
            <p className="mt-2">
              quadrado grande: (a + b)² = {fmt(s, 1)}² = {fmt(s * s)}
            </p>
            <p>4 triângulos: 4 · (a · b ÷ 2) = {fmt(2 * a * b)}</p>
            <p className="mt-1 text-fg">
              sobra: {fmt(s * s)} − {fmt(2 * a * b)} = {fmt(s * s - 2 * a * b)}
            </p>
            <p className="mt-1">
              <span className="text-catet1">a²</span> + <span className="text-catet2">b²</span> ={" "}
              {fmt(a * a)} + {fmt(b * b)} ={" "}
              <strong className="text-fg">{fmt(a * a + b * b)}</strong>
            </p>
            <p className="mt-1 text-fg/60">
              c = √{fmt(a * a + b * b)} ≈ {fmt(c)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
