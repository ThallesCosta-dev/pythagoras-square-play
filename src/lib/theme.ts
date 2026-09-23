// Fonte única da paleta: as variáveis vivem em src/styles.css (com valores para os
// temas escuro e claro). Aqui só referenciamos as variáveis para que o TSX
// (atributos SVG, estilos inline) nunca repita códigos hexadecimais.
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

/** Cor de texto/traço do tema (branca no escuro, quase preta no claro) com opacidade em %. */
export const fg = (percent: number) => soft("var(--fg)", percent);

export type Theme = "dark" | "light";
export const THEME_STORAGE_KEY = "mosaico-theme";

/** Script inline executado antes da primeira pintura para evitar flash de tema errado. */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t;}catch(e){}})();`;

export function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset["theme"] === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset["theme"] = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // armazenamento indisponível (modo privado etc.): o tema vale só para esta visita
  }
}
