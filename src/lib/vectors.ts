// Contas com vetores de qualquer dimensão, como listas de números.

export type Vec = readonly number[];
/** Matriz como lista de linhas. */
export type Mat = readonly (readonly number[])[];

export const dot = (a: Vec, b: Vec) => a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);

/** Comprimento: Pitágoras em n dimensões, √(x₁² + x₂² + … + xₙ²). */
export const norm = (a: Vec) => Math.sqrt(dot(a, a));

/** Cosseno do ângulo entre a e b; `null` se algum for o vetor nulo (sem direção, sem ângulo). */
export const cosSim = (a: Vec, b: Vec): number | null => {
  const d = norm(a) * norm(b);
  return d < 1e-9 ? null : dot(a, b) / d;
};

/** Ângulo em graus a partir do cosseno. */
export const angleDeg = (cos: number) =>
  (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;

/** Matriz × vetor: cada linha da matriz faz um produto escalar com o vetor. */
export const matVec = (m: Mat, v: Vec) => m.map((row) => dot(row, v));

/** Transforma notas em pesos positivos que somam 1. */
export const softmax = (scores: Vec) => {
  // subtrair o máximo não muda o resultado e evita estouro numérico
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
};

/** Soma dos vetores, cada um multiplicado pelo seu peso. */
export const weightedSum = (weights: Vec, vectors: readonly Vec[]) =>
  (vectors[0] ?? []).map((_, j) =>
    weights.reduce((sum, w, i) => sum + w * (vectors[i]?.[j] ?? 0), 0),
  );
