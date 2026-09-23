# Mosaico de Pitágoras

App educacional interativo que parte do Teorema de Pitágoras e chega ao cosseno usado pelos
transformers, em quatro telas:

| Rota                  | Tela                       | O que se faz                                                                                                                           |
| --------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | Teorema de Pitágoras       | Arraste quadradinhos unitários para dentro dos quadrados construídos sobre os lados de um triângulo 3-4-5 e veja 9 + 16 = 25 aparecer. |
| `/trigonometria`      | Seno, cosseno e tangente   | Gire um ponto no círculo de raio 1 e acompanhe seno, cosseno e tangente como lados de um triângulo retângulo.                          |
| `/similaridade`       | Cosseno nos transformers   | Mova um vetor de consulta entre vetores de palavras e veja a similaridade de cosseno virar pesos de atenção.                           |
| `/produtos-vetoriais` | Produto escalar e vetorial | Arraste dois vetores inteiros e acompanhe produto escalar, produto vetorial 2D e a soma A + B.                                         |

**App publicado:** https://pythagoras-square-play.lovable.app

## Stack

- [TanStack Start](https://tanstack.com/start) + React 19, com roteamento por arquivos em `src/routes/`
- Tailwind CSS 4 (tokens em `src/styles.css`, referenciados no TSX via `src/lib/theme.ts`)
- SVG puro para os desenhos interativos, com eventos de ponteiro (`src/hooks/use-window-drag.ts`)
- Build com Vite e Nitro (preset Cloudflare)

## Desenvolvimento local

O projeto usa [Bun](https://bun.sh) e o lockfile `bun.lock`.

```sh
git clone <url-deste-repositório>
cd pythagoras-square-play
bun install
bun run dev
```

Sem o Bun, `npm install` também funciona, mas gera um `package-lock.json` (ignorado pelo git)
e não atualiza o `bun.lock`.

Outros comandos:

```sh
bun run build     # build de produção em .output/
bun run preview   # serve o build
bun run lint      # ESLint (inclui Prettier)
bun run format    # Prettier --write
npx tsc --noEmit  # checagem de tipos
```

Os fins de linha são normalizados para LF via `.gitattributes`, então o lint funciona igual no
Windows, macOS e Linux.

## Lovable

Este projeto está conectado ao [Lovable](https://lovable.dev): commits enviados para `main`
aparecem no [editor](https://lovable.dev/projects/41e8af08-b111-4c8f-81f1-e90446f05ab1), e
alterações feitas lá voltam para este repositório. Evite reescrever histórico já publicado
(force push, rebase ou amend de commits enviados).
