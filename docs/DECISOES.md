# Decisões — betterUI

Registro de decisões arquiteturais relevantes, datadas.

---

## 2026-08-10 — Remoção do botão manual "Apagar dados locais"

O CLAUDE.md original (princípio 6) exigia um botão visível de "Apagar dados
locais" na UI, além da limpeza automática no logout. Na prática, o botão
confundia o usuário (risco de clique acidental / dúvida sobre o que ele
apaga). Decisão do autor: remover o botão manual e depender apenas da
limpeza automática ao detectar logout, que já cobre o caso de uso real
(dados nunca persistem além da sessão) e da desinstalação da extensão como
forma manual de apagar tudo.

Alterado:
- `CLAUDE.md` (princípio 6) — removida a exigência do botão manual.
- `docs/PRIVACIDADE.md` — atualizado para não citar o botão.
- `src/ui/Dashboard.tsx` — removidos o botão e `handleClear`/`clearColecao` do fluxo de UI.

Mantido: limpeza automática do cache ao detectar logout (`src/storage/cache.ts`).

---

## 2026-08-18 — Bump da versão homologada para v4.17.0cefet179

O CEFET atualizou o patch do SIGAA (v4.17.0cefet178 → v4.17.0cefet179), o que
ativou o modo degradado da extensão (dashboard some, sobra só o CSS de
tipografia) — reportado pelo usuário como "sem os cards".

Confirmado ao vivo via DevTools que os seletores usados pela Fase 1
(`#main-docente`, `#painel-usuario`, `#conteudo`, lookup de matrícula) ainda
resolvem sem alteração na v179 — mudança de patch não alterou o DOM
relevante. Fix: apenas atualizar `HOMOLOGATED_VERSION` em
`src/selectors/version.ts` e o comentário em `src/selectors/map.ts`. Nenhum
seletor foi alterado.
