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

## 2026-10-08 — Bump da versão homologada para v4.17.0cefet182

Quarta ocorrência do mesmo padrão (2026-08-18, 2026-08-24, 2026-09-10):
CEFET atualizou o patch do SIGAA (v4.17.0cefet181 → v4.17.0cefet182),
ativando modo degradado de novo. Reportado pelo usuário como "teve
atualização e quebrou", sem mais detalhes — diagnosticado via `#rodape`
antes de investigar seletor por seletor, confirmando o padrão já conhecido.

Confirmado ao vivo via DevTools (tela de login, sem sessão) que os
seletores de login (`div.logon`, `#conteudo div[align="center"]`,
`#conteudo div[align="center"]:has(td.painel)`, `#conteudo table[width="500"]`,
`#conteudo table:has(img[src*="firefox"])`, `#info-sistema`,
`#info-sistema h1`, `#rodape`) resolvem sem alteração na v182 — mudança de
patch não alterou o DOM. Fix: apenas atualizar `HOMOLOGATED_VERSION` em
`src/selectors/version.ts` e o comentário em `src/selectors/map.ts`. Nenhum
seletor foi alterado.

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

---

## 2026-10-30 — Tela inicial redesenhada + rodada de testes ponta a ponta

Testado ao vivo (perfil de teste do chrome-devtools-mcp, extensão unpacked
de `dist/`) em: portal, Boletim, turma virtual, Notas, Frequência,
Arquivos, tema claro/escuro, 375px e liga/desliga.

**Tela inicial (Dashboard).** Era um acordeão fechado de "atualizações" +
17 cards dizendo "Dados não coletados ainda" + um toast fixo que cobria
"Módulos/Alterar senha" e voltava a cada carregamento. Agora:
- "Aulas de hoje" (ou próximo dia com aula), derivado do código de horário
  já presente no DOM — zero fetch.
- "Novidades nas turmas" aberto por padrão (4 itens + "ver todas").
- Atalhos (Boletim, Comunicados, Calendário, Declaração de vínculo, Saldo
  do RU, Grade do curso) que acionam o item do JSCookMenu nativo via
  mousedown/mouseup — o SIGAA navega sozinho, nenhum POST forjado.
  Itens não encontrados no menu simplesmente não aparecem (fail-open).
- Cards com "Aula hoje", "N novidades" e "Abrir turma virtual →".
- Convite inline à coleta (não mais toast fixo); "Agora não" vale até
  fechar o navegador (`sessionStorage`, preferência de UI, não dado
  acadêmico). Coleta continua só por clique (princípio 5).

**Correções encontradas nos testes.**
- Toggle betterUI nunca ficou fixo: `all: initial` vinha depois de
  `position: fixed` no cssText e zerava a posição.
- Badge "!" só em `mismatch` — `unknown` é normal em telas de relatório
  (sem `#rodape`).
- Relatórios (Boletim/Notas): texto base preto nativo, título h3 invisível,
  largura fixa de 900px cortando colunas, faixa de título e rodapé brancos.
  `td.nota.red` neutralizado — o CEFET marca todas as notas como `.red`.
- Frequência: SIGAA pinta "Não Registrada" de vermelho e deixa a falta
  real ("2 Falta(s)") em texto puro. Agora falta = vermelho, não
  registrada = cinza itálico.
- `#painel-erros` (aviso de manutenção) virou callout no tema.
- Fórum do curso mostrava CPF de outros alunos; o nome já estava no
  `title` do `<acronym>` — exibimos o nome (revertido ao desligar).
- SIGAA não declara `<meta name="viewport">`: no celular a página era
  diagramada a 980px e nenhuma media query valia. O reskin injeta a meta
  (só se não houver uma) e remove ao desligar. Corrigidos os elementos
  que forçavam largura (cabeçalho, barra de menu, submenus, painel YUI
  oculto, coluna lateral flutuando sobre a saudação).
- Contraste AA: `text-on-primary` escuro no tema escuro (branco sobre
  #4dabf7 dava 2.5:1), `text-muted` claro #6c757d, `text-faint` escuro
  #7d858d.

Pendente: turma virtual no celular (layout YUI em px fixos) não foi
tratada; tela de login não foi revalidada ao vivo (exigiria deslogar).

---

## 2026-10-31 — Fim da trava por versão exata do SIGAA

**Problema recorrente (5ª vez).** Na madrugada de 31/10 o SIGAA foi de
`v4.17.0cefet182` para `v4.19.12cefet183` e a extensão "quebrou" de novo,
como em 18/08, 24/08, 10/09 e 08/10. Nas cinco vezes o DOM das telas era o
mesmo; só a string do rodapé mudou. Duas falhas de projeto somavam:

1. `checkVersion()` comparava `detected === HOMOLOGATED_VERSION`. Qualquer
   bump → `mismatch` → modo degradado.
2. O modo degradado não era seguro: `applyReskin()` adicionava
   `sc-reskin-active` (que liga TODO o CSS e o tema escuro) antes de checar a
   versão, e só pulava a reorganização de DOM. Resultado: tema escuro por
   cima do layout nativo, contraste quebrado — pior que a página original.

**Decisão.**
- `checkCompatibility(route)` substitui `checkVersion()`: cada rota tem uma
  lista de âncoras estruturais (`REQUIRED` em `version.ts`, seletores em
  `map.ts`). Login: card + links; portal: menu, `#main-docente`,
  `#turmas-portal`. Turma virtual e relatórios: nenhuma (cada passo já se
  protege sozinho). Todas resolvem → `ok`, qualquer que seja a versão.
- Falta âncora → `degraded` = **nada é aplicado** naquela tela (nem a
  classe). Página 100% nativa, "!" no botão explicando. Ao mudar de rota
  via AJAX a checagem é refeita para a nova tela.
- Versão do rodapé virou `LAST_TESTED_VERSION`, só para log.
- Testes em `tests/compat/compat.test.ts` travam o caso que vinha se
  repetindo (versão nova + mesma estrutura = `ok`) e o caso de estrutura
  realmente alterada (= página nativa).

Atualização futura do SIGAA não exige mais bump manual de versão. Se um dia
a estrutura mudar de verdade, a tela afetada volta a ser a nativa sozinha e
o conserto é no seletor/âncora, não numa string de versão.
