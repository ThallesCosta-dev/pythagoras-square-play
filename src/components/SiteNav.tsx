import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

const items = [
  { to: "/", label: "Pitágoras" },
  { to: "/trigonometria", label: "Seno & Cosseno" },
  { to: "/similaridade", label: "Transformers" },
  { to: "/produtos-vetoriais", label: "Produtos de vetores" },
] as const;

function ThemeToggle() {
  // Só sabemos o tema no cliente (o script inline em __root o define antes da pintura),
  // então o botão fica neutro até montar para não divergir do HTML do servidor.
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const next: Theme = theme === "light" ? "dark" : "light";
  const label = theme === "light" ? "Ativar modo escuro" : "Ativar modo claro";

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-fg/10 bg-fg/[0.03] text-fg/70 transition hover:bg-fg/10 hover:text-fg"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" aria-hidden />
      ) : (
        <Sun className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

export function SiteNav() {
  return (
    <header className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
      <Link
        to="/"
        className="flex items-center gap-3"
        aria-label="Mosaico de Pitágoras, página inicial"
      >
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand to-cyan-accent font-display text-lg font-bold text-white">
          π
        </div>
        <div className="leading-tight">
          <p className="font-display text-base font-bold tracking-tight">Mosaico de Pitágoras</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-fg/50">
            Do triângulo aos transformers
          </p>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <nav
          aria-label="Telas do app"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-fg/10 bg-fg/[0.03] p-1"
        >
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="rounded-md px-3 py-1.5 text-sm text-fg/60 transition hover:bg-fg/5 hover:text-fg"
              activeProps={{ className: "bg-brand/25 text-fg", "aria-current": "page" }}
              activeOptions={{ exact: it.to === "/" }}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
