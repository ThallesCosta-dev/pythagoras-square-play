import { useState } from "react";
import { fmt } from "@/lib/format";
import { dot, matVec, softmax, weightedSum, type Mat, type Vec } from "@/lib/vectors";

export type HeadWord = { id: string; word: string; color: string; x: Vec };

// Num modelo real estas matrizes são aprendidas no treino e têm centenas de linhas e colunas.
// Aqui são exemplos 2 × 2 com números redondos, para que tudo possa ser conferido à mão. São
// pequenos de propósito: com notas q · k grandes o softmax satura e uma palavra leva quase 100%.
const W_Q: Mat = [
  [0.3, 0.1],
  [-0.1, 0.3],
];
const W_K: Mat = [
  [0.4, 0],
  [0.1, 0.4],
];
const W_V: Mat = [
  [0.5, -0.5],
  [0.5, 0.5],
];
const D = 2;

const vec = (v: Vec, digits = 2) => `(${v.map((c) => fmt(c, digits)).join("; ")})`;

function Matrix({ name, m, sub }: { name: string; m: Mat; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-fg/70">
        W<sub>{sub}</sub> =
      </span>
      <div className="relative grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border-x-2 border-fg/40 px-2 py-1 text-center font-mono text-sm tabular-nums">
        {m.flat().map((c, i) => (
          <span key={i}>{fmt(c, 1)}</span>
        ))}
      </div>
      <span className="sr-only">{name}</span>
    </div>
  );
}

export function AttentionHead({ words }: { words: HeadWord[] }) {
  const [queryId, setQueryId] = useState(words[0]?.id ?? "");
  const query = words.find((w) => w.id === queryId) ?? words[0];
  if (!query) return null;

  const q = matVec(W_Q, query.x);
  const rows = words.map((w) => {
    const k = matVec(W_K, w.x);
    const v = matVec(W_V, w.x);
    const qk = dot(q, k);
    return { w, k, v, qk, score: qk / Math.sqrt(D) };
  });
  const weights = softmax(rows.map((r) => r.score));
  const out = weightedSum(
    weights,
    rows.map((r) => r.v),
  );
  const best = weights.reduce((a, w, i) => (w > (weights[a] ?? 0) ? i : a), 0);

  return (
    <section className="mt-12 rounded-3xl border border-fg/10 bg-fg/[0.03] p-5 sm:p-7">
      <p className="text-[11px] uppercase tracking-[0.2em] text-fg/50">Sem simplificar</p>
      <h2 className="mt-2 font-display text-2xl font-bold">Por dentro de uma cabeça de atenção</h2>
      <p className="mt-3 max-w-3xl text-sm text-fg/60">
        Lá em cima, cada seta fazia dois papéis ao mesmo tempo e a consulta era uma seta solta. No
        transformer, a consulta também sai de uma palavra, e cada palavra gera{" "}
        <strong className="text-fg">três vetores diferentes</strong> a partir do seu vetor x (as
        setas do plano, com as coordenadas atuais): a consulta q = W<sub>Q</sub> x (o que ela
        procura), a chave k = W<sub>K</sub> x (como ela se anuncia) e o valor v = W<sub>V</sub> x (o
        que ela entrega). As matrizes W são aprendidas no treino; aqui usamos exemplos pequenos.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Matrix name="matriz da consulta" m={W_Q} sub="Q" />
        <Matrix name="matriz da chave" m={W_K} sub="K" />
        <Matrix name="matriz do valor" m={W_V} sub="V" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-fg/60">Palavra que está prestando atenção:</span>
        {words.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setQueryId(w.id)}
            aria-pressed={w.id === query.id}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              w.id === query.id ? "border-fg/40 bg-fg/10" : "border-fg/15 hover:bg-fg/5"
            }`}
            style={{ color: w.color }}
          >
            {w.word}
          </button>
        ))}
      </div>

      <ol className="mt-5 space-y-2 text-sm text-fg/70">
        <li>
          <span className="font-semibold text-fg">1. Consulta de “{query.word}”:</span> q = W
          <sub>Q</sub> · {vec(query.x, 1)} = <span className="font-mono">{vec(q)}</span>
        </li>
        <li>
          <span className="font-semibold text-fg">2. Nota de cada palavra:</span> q · k ÷ √d, com d
          = {D} dimensões. A própria “{query.word}” também entra na conta.
        </li>
        <li>
          <span className="font-semibold text-fg">3. Pesos:</span> softmax das notas (positivos,
          somando 100%).
        </li>
        <li>
          <span className="font-semibold text-fg">4. Saída:</span> soma dos valores v, cada um
          multiplicado pelo seu peso. Essa é a nova representação de “{query.word}”.
        </li>
      </ol>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
          <thead className="text-xs text-fg/50">
            <tr className="border-b border-fg/10">
              <th className="py-2 pr-3 font-medium">palavra</th>
              <th className="py-2 pr-3 font-medium">x</th>
              <th className="py-2 pr-3 font-medium">
                chave k = W<sub>K</sub> x
              </th>
              <th className="py-2 pr-3 font-medium">
                valor v = W<sub>V</sub> x
              </th>
              <th className="py-2 pr-3 font-medium">q · k</th>
              <th className="py-2 pr-3 font-medium">÷ √{D}</th>
              <th className="py-2 font-medium">peso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.w.id}
                className={`border-b border-fg/5 ${i === best ? "bg-fg/[0.05]" : ""}`}
              >
                <td className="py-2 pr-3 font-medium" style={{ color: r.w.color }}>
                  {r.w.word}
                </td>
                <td className="py-2 pr-3 font-mono text-fg/60">{vec(r.w.x, 1)}</td>
                <td className="py-2 pr-3 font-mono">{vec(r.k)}</td>
                <td className="py-2 pr-3 font-mono">{vec(r.v)}</td>
                <td className="py-2 pr-3 font-mono">{fmt(r.qk)}</td>
                <td className="py-2 pr-3 font-mono">{fmt(r.score)}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-fg/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((weights[i] ?? 0) * 100).toFixed(2)}%`,
                          backgroundColor: r.w.color,
                        }}
                      />
                    </div>
                    <span className="font-mono">{fmt((weights[i] ?? 0) * 100, 0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
        Saída de “{query.word}” = Σ peso × v = <strong className="font-mono">{vec(out)}</strong>
      </p>
      <p className="mt-3 text-xs text-fg/50">
        Diferenças para o cosseno lá de cima: aqui os comprimentos contam (não dividimos por |q| ·
        |k|) e as matrizes giram e esticam os vetores, então a palavra mais parecida no plano nem
        sempre é a que recebe mais atenção. Um modelo real repete isso em várias cabeças e camadas,
        com vetores de centenas de dimensões. As contas são estas mesmas.
      </p>
    </section>
  );
}
