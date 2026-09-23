import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";

type PageShellProps = {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
};

/** Moldura comum das quatro telas: fundo, brilhos, navegação, cabeçalho e conteúdo. */
export function PageShell({ eyebrow, title, intro, children }: PageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink font-body text-foreground antialiased">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-brand/25 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[560px] w-[560px] rounded-full bg-cyan-accent/15 blur-[130px]" />

      <SiteNav />

      <main className="relative mx-auto max-w-6xl px-6 pb-16">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-accent">
          {eyebrow}
        </p>
        <h1 className="font-display text-[clamp(2rem,5.5vw,4rem)] font-bold leading-[1] tracking-tight">
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">{intro}</p>}
        {children}
      </main>
    </div>
  );
}

export function GradientText({ children, alt = false }: { children: ReactNode; alt?: boolean }) {
  return (
    <span
      className={`bg-gradient-to-r bg-clip-text text-transparent ${
        alt ? "from-cyan-accent via-brand to-catet1" : "from-white via-brand to-cyan-accent"
      }`}
    >
      {children}
    </span>
  );
}

export type PageLink = {
  to: "/" | "/trigonometria" | "/similaridade" | "/produtos-vetoriais";
  eyebrow: string;
  title: string;
  desc: string;
  accent?: "brand" | "cyan";
};

/** Cards de navegação ao fim de cada tela. */
export function PageLinks({ links }: { links: PageLink[] }) {
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => {
        const cyan = link.accent !== "brand";
        return (
          <Link
            key={link.to}
            to={link.to}
            className={`group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06] ${
              cyan ? "hover:border-cyan-accent/50" : "hover:border-brand/50"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">{link.eyebrow}</p>
            <p className="mt-2 flex items-center gap-2 font-display text-lg font-semibold">
              {link.title}
              <ArrowRight
                className={`h-4 w-4 transition group-hover:translate-x-1 ${
                  cyan ? "text-cyan-accent" : "text-brand"
                }`}
              />
            </p>
            <p className="mt-1 text-sm text-white/50">{link.desc}</p>
          </Link>
        );
      })}
    </div>
  );
}
