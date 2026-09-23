// Fonte única da paleta: as variáveis vivem em src/styles.css. Aqui só
// referenciamos as variáveis para que o TSX (atributos SVG, estilos inline)
// nunca repita códigos hexadecimais.
export const C = {
  brand: "var(--brand)",
  brandLight: "var(--brand-light)",
  brandText: "var(--brand-text)",
  cyan: "var(--cyan-accent)",
  catet1: "var(--catet1)",
  catet2: "var(--catet2)",
  vecSum: "var(--vec-sum)",
  amber: "var(--amber)",
  orange: "var(--orange)",
  emerald: "var(--emerald)",
} as const;

export type ThemeColor = (typeof C)[keyof typeof C];

/** Versão translúcida de uma cor do tema, ex.: soft(C.catet1, 14). */
export const soft = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export const white = (percent: number) => `rgb(255 255 255 / ${percent / 100})`;
