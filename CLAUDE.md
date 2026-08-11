# CLAUDE.md — betterUI

Extensão de navegador **não-oficial** que reorganiza a interface do SIGAA do CEFET-MG.
Este arquivo é a fonte de verdade do projeto. Leia por inteiro antes de escrever código.

---

## 1. Contexto

O SIGAA é um sistema Java/JSF (RichFaces) + Hibernate + JBoss + PostgreSQL, desenvolvido pela UFRN e implantado em instância própria no CEFET-MG. É *server-side rendering com estado de sessão*: cada interação é um postback de formulário carregando um token `javax.faces.ViewState`. **Não existe API pública para o aluno.**

Esta extensão roda **inteiramente no navegador do aluno**, dentro da sessão que ele já autenticou. Não há servidor. Não há backend. Não há coleta.

- **Público-alvo:** alunos do CEFET-MG, majoritariamente do ensino técnico integrado — **muitos são menores de idade**. Isso eleva o padrão de cuidado com dados, não reduz.
- **Natureza:** projeto pessoal, não-oficial, código aberto desde o primeiro commit.
- **Autor:** aluno da instituição. O código público é a principal defesa do projeto: qualquer pessoa da TI do CEFET deve conseguir auditar em 10 minutos e concluir que não há exfiltração.

---

## 2. Princípios invioláveis

Estes não são preferências. Se uma tarefa pedida exigir violar qualquer um deles, **pare e diga por quê** em vez de implementar.

1. **Fail-open.** Se qualquer seletor, parser ou fetch falhar, a extensão se desliga silenciosamente e devolve a página original **intacta e funcional**. A extensão nunca pode impedir alguém de fazer matrícula, enviar trabalho ou ler um aviso. Este é o princípio nº 1 porque é o único cujo descumprimento causa dano real e irreversível ao usuário.
2. **Somente leitura.** Nenhuma requisição que altere estado no servidor. Nenhum POST forjado de matrícula, trancamento, envio de tarefa, avaliação ou requerimento. Ações de escrita são sempre delegadas ao SIGAA via navegação.
3. **Nenhuma requisição sai do domínio do SIGAA.** Sem CDN, sem fonte externa, sem analytics, sem Sentry, sem ping de "está vivo". Fontes e ícones são embarcados no pacote.
4. **Nenhuma credencial é lida, guardada ou transmitida.** A extensão nunca toca em campo de senha, nunca preenche login, nunca lê `document.cookie` para persistir sessão. Ela apenas se aproveita da sessão que o navegador já mantém.
5. **Nenhuma requisição automática em segundo plano.** Todo `fetch` é disparado por ação explícita do usuário (clique em "Atualizar"). Sem polling, sem alarms, sem sync periódico. Polling derruba a sessão do próprio aluno e faz o tráfego parecer anômalo para o WAF da instituição.
6. **Dados acadêmicos só em `chrome.storage.local`**, com limpeza automática ao detectar logout. (Decisão 2026-08-10: o botão manual "Apagar dados locais" foi removido da UI por confundir o usuário — ver `docs/DECISOES.md`. A limpeza automática no logout permanece obrigatória.)
7. **Sem marca institucional.** Não usar logo, brasão ou nome do CEFET-MG e do SIGAA como se fosse produto oficial. A palavra "não-oficial" aparece no nome da extensão, na descrição da loja e dentro da UI.
8. **Sem HTML real com dado pessoal no repositório.** Fixtures de teste são obrigatoriamente anonimizadas antes do commit.

---

## 3. Escopo: dentro e fora

### Dentro
- Reestilização e reorganização das páginas existentes (CSS + reordenação de DOM).
- Agregação **de leitura** de dados dispersos em várias telas numa visão única.
- Cache local do que já foi lido, para consulta rápida e offline.
- **Atalhos de acesso**: levar o usuário em 1 clique ao ponto exato do SIGAA onde a ação real acontece.
- Exportação local (`.ics` do horário, `.csv` de notas) gerada no cliente.

### Fora — permanentemente
- Qualquer operação de escrita (matrícula, trancamento, requerimento, upload, avaliação institucional).
- Login automático ou gerenciamento de credenciais.
- Servidor, banco de dados, conta de usuário, sincronização entre dispositivos.
- Telemetria de qualquer natureza.
- Suporte a instâncias SIGAA de outras instituições na v1 (cada uma é um fork em versão diferente; generalizar cedo é como o projeto morre).

### Como cobrir "a maioria das funcionalidades" sem violar o escopo

O objetivo não é reimplementar o SIGAA. É que **tudo que o aluno faz no SIGAA seja alcançável em um clique a partir de uma interface decente**. Modelo de duas camadas:

| Camada | O que a extensão faz | Exemplo |
|---|---|---|
| **Leitura** | Agrega, formata e cacheia | Notas de todas as turmas numa tabela só |
| **Escrita** | Só navega até o formulário real | Botão "Matrícula" abre a tela nativa do SIGAA já no passo certo |

Um atalho de escrita é considerado pronto quando leva o usuário ao ponto certo **sem** submeter nada por ele.

---

## 4. Stack

- **Manifest V3**
- **TypeScript**, `strict: true`
- **Vite** + `@crxjs/vite-plugin` para build e HMR
- **Preact** (~4kb) — usado **apenas** dentro dos componentes injetados. Nada de framework tentando gerenciar o DOM do SIGAA.
- **CSS puro** com custom properties, isolado em **Shadow DOM**
- **Vitest** para os parsers
- Alvos: Chrome/Edge, Firefox Desktop, **Firefox Android** (é o único caminho real de mobile hoje — Chrome Android não suporta extensões)

### Por que Shadow DOM é obrigatório para UI injetada
O CSS do RichFaces é antigo, global e agressivo. Sem Shadow DOM, dois problemas garantidos: nosso estilo vaza e quebra a página do SIGAA (violaria o princípio 1), e o estilo deles quebra o nosso. Todo componente que a extensão renderiza vive dentro de um shadow root. A única exceção é o reskin da Fase 0, que por natureza precisa atuar no DOM existente — e aí a regra é: **apenas classes prefixadas com `sc-`, nunca sobrescrever seletor de elemento nu**.

---

## 5. Estrutura de pastas

```
src/
  manifest.config.ts
  content/
    index.ts          # bootstrap: detecta rota, monta o que couber, tudo dentro de safe()
    router.ts         # identifica em qual página do SIGAA estamos
  selectors/
    map.ts            # ÚNICO arquivo com seletores do DOM do SIGAA
    version.ts        # lê a versão do SIGAA no rodapé e registra incompatibilidade
  parsers/            # HTML (string) -> objeto tipado. FUNÇÕES PURAS. Sem DOM global, sem fetch.
    turmas.ts
    notas.ts
    frequencia.ts
    horario.ts
    avisos.ts
  fetchers/
    session.ts        # navegação JSF: ViewState, postbacks, fila sequencial
    collect.ts        # orquestra a coleta com progresso e cancelamento
  ui/
    Dashboard.tsx
    Panel.tsx
    tokens.css        # design tokens (preenchido depois, via Claude Design)
    styles.css
  storage/
    cache.ts          # chrome.storage.local, versionado, com TTL e purge
  lib/
    safe.ts           # wrapper de fail-open
    log.ts            # log só com flag de debug ligada
tests/
  fixtures/           # HTML real ANONIMIZADO
  parsers/
docs/
  MAPEAMENTO.md       # preenchido manualmente — ver seção 10
  DECISOES.md         # registro de decisões e datas
```

---

## 6. Contrato da camada de seletores

**Regra dura: nenhum arquivo fora de `src/selectors/` pode conter uma string de seletor CSS ou XPath.** Justificativa: o SIGAA publica versões quase mensalmente e o HTML muda. Quando quebrar, o conserto tem que ser em um arquivo, não espalhado pelo projeto.

Formato de cada entrada:

```ts
export const SEL = {
  notas_tabela: {
    id: 'notas_tabela',
    descricao: 'Tabela de notas dentro da turma virtual',
    primario: '#formNotas\\:tabelaNotas',
    fallbacks: ['table.tabelaRelatorio', 'div#conteudo table'],
    valida: (el: Element) => el.querySelectorAll('tr').length > 1,
  },
} satisfies Record<string, SeletorSpec>;
```

Resolução: tenta `primario`, depois cada `fallback` em ordem, e só aceita o resultado se `valida()` passar. Se nada passar, retorna `null` — **nunca lança**. Quem chamou trata o `null` desligando aquele recurso e mantendo a página original.

`version.ts` lê a versão exibida no rodapé do SIGAA. Se ela for diferente da última versão homologada, a extensão entra em **modo degradado**: aplica só o reskin da Fase 0 (que é resiliente) e mostra um aviso discreto de que a agregação foi desativada até o mapa ser atualizado.

---

## 7. Navegação JSF (`fetchers/session.ts`)

O SIGAA não tem URLs idempotentes para conteúdo interno. Para chegar a uma tela é preciso reproduzir a sequência de postbacks.

Mecânica: cada página contém um `<input name="javax.faces.ViewState">`. Um postback é um `POST` para a URL da view atual, com `Content-Type: application/x-www-form-urlencoded`, contendo o `id` do formulário, o `ViewState` corrente, o identificador do componente acionado e os campos do form. A resposta traz um **novo** ViewState, que é o que vale para o passo seguinte.

Regras de implementação, todas obrigatórias:

- **Fila estritamente sequencial.** Uma requisição por vez. Paralelismo corrompe o estado da sessão e derruba o aluno.
- **Intervalo mínimo de 500ms** entre requisições.
- **Máximo de requisições por coleta**: configurável, padrão baixo. Estourou, aborta e mostra o que já tem.
- **Circuit breaker**: 2 falhas consecutivas encerram a coleta inteira.
- **Cancelável**: `AbortController` ligado a um botão visível de cancelar.
- **Detecção de expiração**: se a resposta contiver a tela de sessão expirada, abortar imediatamente, limpar o cache volátil e instruir o usuário a recarregar. Nunca tentar relogar.
- **Sempre com progresso visível.** O usuário precisa entender que a lentidão é do SIGAA, não da extensão.

---

## 8. Fases

Trabalhe em fases. **Não comece a Fase 1 antes da Fase 0 estar publicada.**

### Fase 0 — Reskin (meta: 3 a 5 dias)
Somente CSS e reordenação de DOM. **Zero `fetch`. Zero interação com a sessão.** Risco técnico nulo.
- Tipografia legível, escala de tamanhos consistente, respiro
- Esconder ruído (banners repetidos, menus mortos, tabelas de layout vazias)
- Subir o que importa acima da dobra
- Responsivo até 360px de largura
- Toggle global de liga/desliga

Critério de pronto: instalável, publicada em loja, e a página do SIGAA continua 100% funcional com a extensão ativa.

### Fase 1 — Painel agregado (meta: 2 a 4 semanas)
A tela que o SIGAA não tem: **notas, frequência e horário de todas as turmas num lugar só**, coletados sequencialmente sob comando do usuário e cacheados localmente. É a feature que transforma 15 cliques em zero, e provavelmente vale mais que todo o resto somado.

### Fase 2 — Atalhos e busca
Paleta de comandos (`Ctrl+K`) que navega para qualquer função do SIGAA, incluindo as de escrita — **navegando, nunca executando**. É aqui que a "cobertura da maioria das funcionalidades" se realiza.

### Fase 3 — Exportação
`.ics` do horário para o calendário do celular; `.csv` de notas. Gerados no cliente, sem upload.

---

## 9. Testes

Os **parsers são funções puras** — recebem string HTML, devolvem objeto tipado. Isso os torna testáveis sem navegador, sem conta e sem rede, e portáveis caso o projeto migre de transporte no futuro.

- Fixtures em `tests/fixtures/*.html`, salvas do SIGAA real e **anonimizadas antes do commit**: substituir nome, matrícula, CPF, e-mail e notas por valores fictícios.
- Cada parser tem no mínimo: um teste de caminho feliz, um de tabela vazia, um de HTML de versão antiga.
- Nunca escrever teste que dependa de estar logado.

---

## 10. Mapeamento — pendente, bloqueia a Fase 1

A Fase 1 **não pode começar** sem `docs/MAPEAMENTO.md` preenchido. Se ele estiver vazio ou incompleto, **não invente seletores nem estruture parsers no chute** — pare e peça o mapeamento.

Para cada tela relevante, o mapeamento precisa conter:

1. Nome da tela e para que serve
2. Como se chega até ela (sequência exata de cliques a partir do portal do aluno)
3. URL final visível na barra de endereço
4. Trecho de HTML da região de interesse (via inspecionar elemento), **anonimizado**
5. `id` do formulário e do componente acionado no passo anterior
6. Se é leitura ou escrita
7. Frequência com que o aluno usa: diária / semanal / por semestre / raramente

Telas prioritárias para mapear primeiro: portal do aluno, lista de turmas, turma virtual (notas), turma virtual (frequência), horário/grade, avisos e materiais.

---

## 11. Convenções

- Código, nomes de arquivo, variáveis e commits em **inglês**. Textos de UI em **português do Brasil**.
- Todo ponto de entrada de content script embrulhado em `safe()`.
- Nada de `console.log` solto — usar `log.debug()`, silenciado por padrão.
- Commits convencionais (`feat:`, `fix:`, `chore:`).
- Toda decisão arquitetural relevante vira uma linha datada em `docs/DECISOES.md`.

### Regras de UI e copy
- Piso de qualidade sem exceção: navegação por teclado, foco visível, contraste AA, `prefers-reduced-motion` respeitado.
- Voz ativa e concreta. O botão diz o que acontece: "Atualizar notas", não "Enviar".
- Estado vazio é convite à ação, não desculpa. Erro diz o que houve e o que fazer.
- Identidade visual (paleta, tipografia, elemento de assinatura) **ainda não está definida** — virá depois, via Claude Design. Até lá, use tokens neutros em `ui/tokens.css` e não invente uma marca.

---

## 12. Como se comportar neste repositório

- Se uma tarefa pedir violar a seção 2, **não implemente** — explique qual princípio ela quebra e proponha a alternativa read-only.
- Se o mapeamento necessário não existir, **peça** em vez de adivinhar.
- Ao mexer em seletor, altere **apenas** `src/selectors/map.ts` e adicione a fixture correspondente.
- Prefira desligar um recurso a arriscar quebrar a página original. Sempre.
