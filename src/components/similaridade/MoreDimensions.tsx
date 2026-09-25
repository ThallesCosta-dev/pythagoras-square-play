import { useState } from "react";
import { Shuffle } from "lucide-react";
import { fmt } from "@/lib/format";
import { angleDeg, cosSim, dot, norm } from "@/lib/vectors";

const MAX_DIMS = 8;
const DEFAULT_A = [2, 1, 0, 3, -1, 2, 1, 0];
const DEFAULT_B = [1, 2, 1, 2, 0, 1, -1, 2];

/** Número inteiro entre parênteses quando negativo, para a conta ficar legível: 2 · (−1). */
const term = (n: number) => (n < 0 ? `(${n})` : `${n}`);
const randomVec = () => Array.from({ length: MAX_DIMS }, () => Math.floor(Math.random() * 11) - 5);

export function MoreDimensions() {
  const [dims, setDims] = useState(5);
  const [a, setA] = useState(DEFAULT_A);
  const [b, setB] = useState(DEFAULT_B);

  const va = a.slice(0, dims);
  const vb = b.slice(0, dims);
  const d = dot(va, vb);
  const na = norm(va);
  const nb = norm(vb);
  const cs = cosSim(va, vb);

  const setCoord = (which: "a" | "b", i: number, value: string) => {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n)) return;
    const set = which === "a" ? setA : setB;
    set((prev) => prev.map((c, j) => (j === i ? Math.max(-9, Math.min(9, Math.round(n))) : c)));
  };

  return (
    <section className="mt-6 rounded-3xl border border-fg/10 bg-fg/[0.03] p-5 sm:p-7">
      <p className="text-[11px] uppercase tracking-[0.2em] text-fg/50">Além do plano</p>
      <h2 className="mt-2 font-display text-2xl font-bold">E com mais dimensões?</h2>
      <p className="mt-3 max-w-3xl text-sm text-fg/60">
        Um modelo real usa vetores com centenas de coordenadas. Não dá para desenhar, mas a conta é
        a mesma: o produto escalar soma um produto por coordenada, e o comprimento é Pitágoras
        repetido. Em 3D, a diagonal de uma caixa é √(x² + y² + z²); em n dimensões, √(x₁² + … +
        xₙ²). E o ângulo entre dois vetores continua existindo: os dois sempre cabem num mesmo plano
        que passa pela origem, e nesse plano vale tudo o que vimos.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label htmlFor="dims" className="text-sm text-fg/60">
          Dimensões
        </label>
        <input
          id="dims"
          type="range"
          min={2}
          max={MAX_DIMS}
          step={1}
          value={dims}
          onChange={(e) => setDims(Number(e.target.value))}
          className="w-40 accent-brand"
        />
        <span className="font-mono text-sm">{dims}</span>
        <button
          type="button"
          onClick={() => {
            setA(randomVec());
            setB(randomVec());
          }}
          className="ml-auto flex items-center gap-2 rounded-full border border-fg/15 px-3 py-1.5 text-xs text-fg/80 transition hover:bg-fg/5"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden />
          Sortear vetores
        </button>
      </div>

      <div className="mt-4 space-y-2 overflow-x-auto">
        {(["a", "b"] as const).map((which) => (
          <div key={which} className="flex items-center gap-2">
            <span
              className={`w-6 font-mono font-semibold ${which === "a" ? "text-catet1" : "text-catet2"}`}
            >
              {which}
            </span>
            {(which === "a" ? a : b).slice(0, dims).map((c, i) => (
              <input
                key={i}
                type="number"
                step={1}
                min={-9}
                max={9}
                value={c}
                aria-label={`${which}, coordenada ${i + 1}`}
                onChange={(e) => setCoord(which, i, e.target.value)}
                className="w-14 shrink-0 rounded-md border border-fg/15 bg-fg/5 px-2 py-1 text-center text-sm tabular-nums focus:border-brand focus:outline-none"
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2 overflow-x-auto font-mono text-sm text-fg/70">
        <p className="whitespace-nowrap">
          <span className="text-fg">a · b</span> ={" "}
          {va.map((x, i) => `${term(x)}·${term(vb[i] ?? 0)}`).join(" + ")} ={" "}
          <strong className="text-fg">{d}</strong>
        </p>
        <p className="whitespace-nowrap">
          <span className="text-catet1">|a|</span> = √({va.map((x) => `${term(x)}²`).join(" + ")}) =
          √{dot(va, va)} = <strong className="text-fg">{fmt(na)}</strong>
        </p>
        <p className="whitespace-nowrap">
          <span className="text-catet2">|b|</span> = √({vb.map((x) => `${term(x)}²`).join(" + ")}) =
          √{dot(vb, vb)} = <strong className="text-fg">{fmt(nb)}</strong>
        </p>
        <p className="whitespace-nowrap rounded-lg bg-brand/10 px-3 py-2 text-fg">
          cos θ = a · b ÷ (|a| · |b|) ={" "}
          {cs === null ? (
            "indefinido (um dos vetores é nulo)"
          ) : (
            <>
              {d} ÷ ({fmt(na)} · {fmt(nb)}) = <strong>{fmt(cs)}</strong>, θ ≈ {fmt(angleDeg(cs), 1)}
              °
            </>
          )}
        </p>
      </div>
    </section>
  );
}
