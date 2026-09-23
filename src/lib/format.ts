const formatters = new Map<number, Intl.NumberFormat>();

/**
 * Formata um número no padrão pt-BR (vírgula decimal) com casas fixas.
 * Normaliza -0 para evitar "-0,00".
 */
export function fmt(n: number, digits = 2): string {
  let formatter = formatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(digits, formatter);
  }
  const rounded = Number(n.toFixed(digits));
  return formatter.format(rounded === 0 ? 0 : rounded);
}

/** Graus com uma casa decimal e símbolo, ex.: "53,1°". */
export const deg = (radians: number) => `${fmt((radians * 180) / Math.PI, 1)}°`;
