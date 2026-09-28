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

---

## 2026-08-24 — Bump da versão homologada para v4.17.0cefet180

Mesmo padrão do bump anterior (2026-08-18): CEFET atualizou o patch do SIGAA
(v4.17.0cefet179 → v4.17.0cefet180), ativando modo degradado de novo —
reportado pelo usuário via print da tela de login com contraste quebrado no
tema escuro (caixa "ATENÇÃO!" e grade de sistemas com fundo claro nativo
intocado, texto no token do tema escuro por cima). Causa raiz: com
`version !== 'ok'`, `applyReskin()` retorna cedo e nunca chama
`applyLoginReskin()`/`applyPortalReskin()`/`applyTurmaVirtualReskin()` — só o
CSS base (sempre ativo) roda, deixando classes `sc-login-*` nunca aplicadas
e o layout nativo (com fundos claros hardcoded) por baixo do tema escuro.

Confirmado ao vivo via DevTools (login pública, sem sessão, e portal
logado) que todos os seletores relevantes (`div.logon`,
`#conteudo div[align="center"]:has(td.painel)`, `#conteudo table[width="500"]`,
`#painel-usuario`, `#turmas-portal`, `#main-docente`, `#conteudo`) resolvem
sem alteração na v180 — mudança de patch não alterou o DOM. Fix: apenas
atualizar `HOMOLOGATED_VERSION` em `src/selectors/version.ts` e o comentário
em `src/selectors/map.ts`. Nenhum seletor foi alterado.

Nota para o futuro: esse é o segundo bump de patch em uma semana que ativa
modo degradado silenciosamente — vale considerar deixar o aviso de "modo
degradado" mais visível na UI (hoje é discreto), já que o usuário só percebe
pelo sintoma (cards/reskin sumidos), não por uma mensagem clara.

---

## 2026-09-10 — Bump da versão homologada para v4.17.0cefet181

Terceira ocorrência do mesmo padrão (2026-08-18, 2026-08-24): CEFET
atualizou o patch do SIGAA (v4.17.0cefet180 → v4.17.0cefet181), ativando
modo degradado de novo. Reportado pelo usuário como bug recorrente antes
mesmo do diagnóstico.

Confirmado ao vivo via DevTools (portal logado) que os seletores-chave
(`#rodape`, `#info-sistema`, `#painel-usuario`, `#container`, `#conteudo`)
resolvem sem alteração na v181 — mudança de patch não alterou o DOM. Fix:
apenas atualizar `HOMOLOGATED_VERSION` em `src/selectors/version.ts` e o
comentário em `src/selectors/map.ts`. Nenhum seletor foi alterado.

---

## 2026-09-28 — Mais fundos "fantasma" no tema escuro (v0.1.7)

Continuação do padrão documentado desde 2026-08-17: CSS nativo do SIGAA
carrega depois do nosso e crava `background`/`color` sem `!important` em
elementos ainda não catalogados, deixando texto claro do tema escuro
ilegível sobre fundo branco nativo. Casos novos cobertos:

- `.tabelaRelatorio` (tabela de notas): th/td tinham fundo branco nativo
  sem `!important`; texto herdava a cor clara do tema por cima.
- `.intro-aval` / `.intro-aval .textos` (caixa "Turma Virtual!" de
  boas-vindas): mesmo padrão.
- `.sc-login-hint table/tbody/tr/th/td` (caixa "ATENÇÃO!" do login, às
  vezes embrulhada em `<table>` legada).
- `.sc-login-nav-systems` / `tbody`: fundo sólido na tag nativa por baixo
  das células já transparentes.
- **Regra genérica nova**: `#conteudo table` zera fundo de qualquer tabela
  nativa dentro do conteúdo (não só as catalogadas manualmente), e
  `tr.odd`/`tr.even` passou de específico a `table.listing` para genérico
  em `#conteudo` — cobre telas futuras sem precisar catalogar tabela por
  tabela cada vez que uma nova aparece.

Também corrigido em `src/content/index.ts`: `watchForAjaxRerender()` usava
debounce puro, então uma rajada contínua de mutações (ex: cards de turma
populando via AJAX) adiava `reconcile()` por segundos — nesse intervalo o
DOM reescrito ficava sem `sc-reskin-active`/`sc-theme-dark` reaplicado,
causando flash visível de fundo claro. Trocado para throttle (300ms, com
trailing call), garantindo reconcile periódico mesmo durante a rajada.

Build + typecheck OK. Teste ao vivo não pôde ser feito nesta sessão (sem
acesso à extensão "Claude for Chrome" pareada — ver runbook de memória);
fica pendente de confirmação visual do usuário na próxima sessão.
