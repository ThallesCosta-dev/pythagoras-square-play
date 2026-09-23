import { Link } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Pitágoras" },
  { to: "/trigonometria", label: "Seno & Cosseno" },
  { to: "/similaridade", label: "Transformers" },
  { to: "/produtos-vetoriais", label: "Produtos de vetores" },
] as const;

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
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
            Do triângulo aos transformers
          </p>
        </div>
      </Link>
      <nav
        aria-label="Telas do app"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1"
      >
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="rounded-md px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
            activeProps={{ className: "bg-brand/25 text-white", "aria-current": "page" }}
            activeOptions={{ exact: it.to === "/" }}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
