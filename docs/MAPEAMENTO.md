# MAPEAMENTO DO SIGAA — CEFET-MG

Versão homologada: **v4.17.0cefet178**
Domínio: `sig.cefetmg.br`

Atualizado sessão a sessão. Cada tela tem: rota de acesso, estrutura JSF, seletores CSS, payload de postback e crítica de interface.

---

## Tela 1 — Portal do Aluno

**Para que serve:** página inicial após login. Agrega dados institucionais do aluno, lista de turmas do semestre com horários, últimas atualizações de turmas, atividades, fórum do curso.

**Como chegar:** é a landing page após autenticação. URL direta (GET idempotente):
```
https://sig.cefetmg.br/sigaa/portais/discente/discente.jsf
```
Também acessível por `https://sig.cefetmg.br/sigaa/verPortalDiscente.do` (redireciona).

**Tipo:** leitura (com links de escrita listados abaixo)

**Frequência de uso:** diária

---

### Estrutura HTML principal

Container do conteúdo: `#conteudo`

IDs semânticos estáveis relevantes:

| ID | O que é |
|---|---|
| `#conteudo` | container geral de tudo abaixo do menu |
| `#painel-usuario` | bloco lateral com nome e dados do aluno |
| `#perfil-docente` | bloco do perfil (reaproveitado do portal docente) |
| `#noticias-portal` | área de notícias institucionais |
| `#turmas-portal` | seção com tabela de turmas do semestre + atualizações |
| `#atualizacoes-turma` | carrossel de últimas atualizações (AJAX) |
| `#formAtualizacoesTurmas` | form que envolve o carrossel |
| `#agenda-docente` | sidebar com dados do perfil (reusado para discente) |
| `#main-docente` | coluna principal (reusado para discente) |
| `#forum-portal` | seção do fórum do curso |
| `#rodape` | rodapé com versão do sistema |

---

### Dados institucionais do aluno

Localização: tabela sem id dentro de `#perfil-docente` ou `#painel-usuario`, 7 linhas.

Seletor de âncora estável: primeira tabela dentro de `#agenda-docente` que contenha a string "Matrícula:" em seu texto.

| Dado | Seletor candidato | ID gerado? | Âncora alternativa |
|---|---|---|---|
| Nome | `#painel-usuario` (StaticText do span) | Não | `#info-usuario` |
| Matrícula | célula `td` seguinte a `td:contains("Matrícula:")` | N/A | posição relativa à âncora de texto |
| Curso | célula `td` seguinte a `td:contains("Curso:")` | N/A | posição relativa |
| Nível | célula `td` seguinte a `td:contains("Nível:")` | N/A | posição relativa |
| Status | célula `td` seguinte a `td:contains("Status:")` | N/A | posição relativa |
| E-Mail | célula `td` seguinte a `td:contains("E-Mail:")` | N/A | posição relativa |

---

### Tabela de turmas do semestre

Seletor: `#turmas-portal table` (pegar a que tem `rows.length > 5`)

Estrutura da tabela (3 colunas reais + 1 de ação):

| col 0 | col 1 | col 2 | col 3 |
|---|---|---|---|
| Componente Curricular | Local | Horário | (botão de acesso) |

Cada linha de turma:
- `tr` com id `linha_XXXXXX` onde `XXXXXX` é o ID numérico da turma no banco
- Dentro: um `<form id="form_acessarTurmaVirtual[j_id_N]">` com um link `<a onclick="jsfcljs(...)">` que dispara o postback

---

### Postback: acessar turma virtual

Este é o mecanismo central da Fase 1. Cada turma da lista tem um form dedicado.

**Form ID:** `form_acessarTurmaVirtual` (primeira turma) / `form_acessarTurmaVirtualj_id_N` (demais, N de 1 a 16+)

**Action:** `https://sig.cefetmg.br/sigaa/portais/discente/discente.jsf`

**Method:** POST

**Payload (campos):**

```
form_acessarTurmaVirtual          = form_acessarTurmaVirtual
form_acessarTurmaVirtual:j_id_jsp_161879646_442 = form_acessarTurmaVirtual:j_id_jsp_161879646_442
frontEndIdTurma                   = <hash hex 40 chars — ex: 4A67A513ADC89DF84E858F81A4FD3963532E9AD2>
javax.faces.ViewState             = <valor atual da sessão>
```

**Observacoes criticas:**

- O campo `form_acessarTurmaVirtual:j_id_jsp_161879646_442` contém `j_id_jsp_` — **ID GERADO**. Não confiar como seletor estável entre versões.
- O campo `frontEndIdTurma` é um hash hex de 40 chars que identifica a turma. Parece ser SHA-1 de algum identificador interno. **Mais estável** que o j_id — é o que devemos usar para referenciar turmas entre sessões.
- O `javax.faces.ViewState` muda a cada request — deve ser lido do DOM da página atual antes de cada postback.

**Como extrair o frontEndIdTurma de cada turma:**

```js
// Para cada turma na tabela:
const forms = document.querySelectorAll('form[id^="form_acessarTurmaVirtual"]');
const turmas = [...forms].map(form => {
  const link = form.querySelector('a[onclick]');
  const match = link?.getAttribute('onclick')?.match(/'frontEndIdTurma':'([a-f0-9]+)'/i);
  const nome = form.closest('tr')?.querySelector('td:first-child a')?.innerText?.trim();
  const rowId = form.closest('tr[id]')?.id; // ex: "linha_174793"
  return { nome, frontEndIdTurma: match?.[1], rowId };
});
```

---

### Atualizações de turmas (AJAX)

Seção `#atualizacoes-turma` dentro de `#formAtualizacoesTurmas`. Carrega via AJAX após o load da página. Os botões `<<`, `Parar` e `>>` navegam um carrossel client-side (JavaScript puro, não postback).

Cada item de atualização tem: data, nome da turma (link), tipo de atualização (tópico de aula, material, etc.).

---

### Fórum do curso

Seção `#forum-portal`. Tabela com classe `listagem`, 7 linhas (cabeçalho + 5 tópicos + paginação).

**Acao de escrita presente:** "Cadastrar novo tópico para este fórum" — link dentro de `#forum-portal` que dispara postback de criação. **Não clicar.**

---

### Crítica de interface

- **Hierarquia quebrada:** o nome do aluno e os dados institucionais ficam na sidebar, mas o conteúdo realmente importante (turmas) fica no meio da página depois de uma seção de notícias vazia ("Não há notícias cadastradas"). O aluno que quer ver horário ou acessar uma turma rola muito antes de chegar.
- **Carrossel de atualizações é ruído:** o carrossel de "Últimas Atualizações" com `<<` / `Parar` / `>>` é inutilizável — passa rápido demais, não tem pausa automática e não agrega informação estruturada.
- **Tabela de turmas sem ação visível:** o link de acesso à turma virtual não está sinalizado como link — parece texto. Sem nenhum indicador visual de que é clicável na maioria dos temas.
- **Cliques do portal até a info principal:** login (1) → portal (2) → clicar turma (3) → dentro da turma virtual, clicar em "Notas" (4). 4 cliques para chegar na nota mais simples. A extensão vai reduzir para 0 (a nota já aparece no painel).
- **Ruído puro que pode sumir:** seção de notícias vazia, fórum do curso (poucos usam e fica bem abaixo), seção "Comunidade Virtual", seção "Minhas Atividades" (vazia), botão "Enviar" fantasma (uid=1_45 — um botão sem rótulo dentro de um form de imagem).
- **390px:** a tabela de turmas transborda horizontalmente. O menu `ThemeOfficeMenu` colapsa mas os submenus surgem como blocos flutuantes que cobrem o conteúdo. O carrossel de atualizações fica ilegível. Essencialmente inutilizável em mobile sem a extensão.
- **AJAX:** somente o carrossel `#atualizacoes-turma` carrega via AJAX pós-load. O restante da página é SSR síncrono.

---

### Acoes de escrita presentes (NAO clicar — lista para atalhos futuros)

| Rotulo | O que faz |
|---|---|
| SAIR | logout — invalida a sessão |
| Alterar senha | redireciona para `iu.cefetmg.br` (externo) — alteração de senha |
| Atualizar Foto e Perfil | abre `portais/discente/perfil.jsf` — edição de perfil |
| Meus Dados Pessoais | dropdown com subitens de edição de dados cadastrais |
| Mensagens | abre caixa postal — leitura e envio de mensagens internas |
| Abrir Chamado | redireciona para `cs.sgi.cefetmg.br` (externo) — helpdesk |
| Cadastrar novo tópico para este fórum | postback de criação de tópico no fórum do curso |

---

---

## Tela 2 — Lista de Turmas do Semestre

**Para que serve:** lista todas as turmas nas quais o aluno está matriculado no semestre, com nome da disciplina, sala e horário. É o ponto de entrada para acessar a turma virtual de cada disciplina.

**Descoberta:** não existe página dedicada de "Lista de Turmas". A lista **é a própria seção `#turmas-portal` dentro do portal do aluno** (`discente.jsf`). Não há URL separada nem postback para chegar nela — ela carrega junto com o portal.

**URL:** `https://sig.cefetmg.br/sigaa/portais/discente/discente.jsf` (GET)

**Tipo:** leitura pura

**Frequência de uso:** diária

**Fixture:** `tests/fixtures/T-02-lista-turmas.json`

**Screenshots:** `docs/screenshots/02-lista-turmas/desktop.png` e `mobile-390x844.png`

---

### Estrutura HTML

Container da seção: `#turmas-portal`

Tabela principal: `#turmas-portal table` com `rows.length > 5` (36 linhas no semestre 2026.1, com 17 turmas).

Colunas:

| col | cabeçalho | conteúdo |
|---|---|---|
| 0 | Componente Curricular | nome da disciplina (link que dispara postback de acesso) |
| 1 | Local | código da sala (ex: `S 204`) |
| 2 | Horário | código de horário (ex: `6M12`) |
| 3 | (implícito) | coluna do ano/semestre (`2026`) |

---

### Turmas do semestre 2026.1 (anonimizado — IDs reais)

Cada linha de turma tem um `id="linha_XXXXXX"` onde `XXXXXX` é o **ID numérico da turma no banco de dados do SIGAA** — dado estável enquanto a turma existir.

| idx | linhaId | Disciplina | Local | Horário |
|---|---|---|---|---|
| 0 | linha_174793 | ALGORITMOS E LÓGICA DE PROGRAMAÇÃO | S 204 | 6M12 |
| 1 | linha_174792 | APLICAÇÕES PARA WEB I | S 204 | 5T12 |
| 2 | linha_175991 | ARTES | S 413 | 4M12 |
| 3 | linha_174782 | BIOLOGIA - 1ª SÉRIE | S 204 | 2T3 5T34 |
| 4 | linha_174791 | EDUCAÇÃO FÍSICA - 1ª SÉRIE | S 313-CP | 5M34 |
| 5 | linha_174781 | FILOSOFIA - 1ª SÉRIE | S 204 | 2T12 |
| 6 | linha_174783 | FÍSICA - 1ª SÉRIE | S 204 | 35M12 |
| 7 | linha_174780 | GEOGRAFIA - 1ª SÉRIE | S 204 | 2M56 |
| 8 | linha_174785 | HISTÓRIA - 1ª SÉRIE | S 204 | 3M56 |
| 9 | linha_175994 | LABORATÓRIO DE ALGORITMOS E LÓGICA DE PROGRAMAÇÃO | S 104 | 6M56 |
| 10 | linha_175993 | LABORATÓRIO DE APLICAÇÕES PARA WEB I | S 106 | 4M5 |
| 11 | linha_175992 | LABORATÓRIO DE FUNDAMENTOS DE INFORMÁTICA | S 104 | 4M6 |
| 12 | linha_174790 | LÍNGUA ESTRANGEIRA: INGLÊS - 1ª SÉRIE | S 204 | 4T34 |
| 13 | linha_174784 | LÍNGUA PORTUGUESA - 1ª SÉRIE | S 204 | 3M34 |
| 14 | linha_174778 | MATEMÁTICA - 1ª SÉRIE | S 204 | 2M12 4T12 |
| 15 | linha_174779 | QUÍMICA - 1ª SÉRIE | S 204 | 2M34 |
| 16 | linha_175989 | REDAÇÃO - 1ª SÉRIE | S 204 | 4M34 |

> O número em `linhaId` (ex: `174793`) é o `idTurma` interno do SIGAA. O `frontEndIdTurma` (SHA-1 desse ID) é o hash de 40 chars no onclick de cada link — ver seção "Postback: acessar turma virtual" na Tela 1.

---

### Forms por turma

Cada turma tem um `<form>` dedicado:

- Turma 0: `form_acessarTurmaVirtual` (sem sufixo)
- Turma 1–16: `form_acessarTurmaVirtualj_id_1` a `form_acessarTurmaVirtualj_id_16`

O sufixo `j_id_N` é **gerado** (instável entre versões). O seletor estável é:

```js
document.querySelectorAll('form[id^="form_acessarTurmaVirtual"]')
```

---

### Extração completa de todas as turmas (parser)

```js
// Retorna array com dados de todas as turmas da tabela
const turmas = [...document.querySelectorAll('form[id^="form_acessarTurmaVirtual"]')]
  .map((form, idx) => {
    const link = form.querySelector('a[onclick]');
    const onclick = link?.getAttribute('onclick') ?? '';
    const feMatch = onclick.match(/'frontEndIdTurma':'([0-9A-Fa-f]{40})'/);
    const row = form.closest('tr');
    const tds = row ? [...row.querySelectorAll('td')].map(td => td.innerText.trim()) : [];
    const allLinhas = [...document.querySelectorAll('[id^="linha_"]')];
    return {
      nome: link?.innerText?.trim(),
      local: tds[1] ?? null,
      horario: tds[2] ?? null,
      frontEndIdTurma: feMatch?.[1] ?? null,
      linhaId: allLinhas[idx]?.id ?? null,   // ex: "linha_174793"
      idTurma: allLinhas[idx]?.id?.replace('linha_', '') ?? null,  // ex: "174793"
      formId: form.id
    };
  });
```

---

### Seletores

| Dado | Seletor | ID gerado? | Âncora alternativa |
|---|---|---|---|
| Container da lista | `#turmas-portal` | Não | — |
| Tabela de turmas | `#turmas-portal table` com `rows > 5` | Não | — |
| Nome da disciplina | `form[id^="form_acessarTurmaVirtual"] a` | Não (id do form é gerado, mas o padrão do prefixo é estável) | — |
| Sala | `tr td:nth-child(2)` dentro de `#turmas-portal` | N/A | posição relativa |
| Horário | `tr td:nth-child(3)` dentro de `#turmas-portal` | N/A | posição relativa |
| frontEndIdTurma | regex no onclick do link | N/A | `/'frontEndIdTurma':'([0-9A-Fa-f]{40})'/` |
| ID da turma (banco) | `tr[id^="linha_"]` → extrair número | Não (estável por turma) | — |

---

### Crítica de interface

- **Lista não tem ação de "ir para a turma" clara:** o link é o nome da disciplina — não há botão, ícone ou seta. Em mobile, a área de toque do texto é pequena demais.
- **Sem informação de professor:** o aluno não sabe quem é o professor da disciplina sem entrar na turma.
- **Sem informação de situação:** não aparece se o aluno está aprovado, com risco de reprovação ou com muitas faltas diretamente nesta lista.
- **Horário em código bruto:** `6M12`, `35M12` — o aluno iniciante não sabe decodificar. Nenhum tooltip ou legenda.
- **Ordenação:** as turmas aparecem em ordem alfabética do nome da disciplina — não por dia/horário. Impossível montar mentalmente uma grade olhando esta lista.
- **390px:** a tabela transborda horizontalmente. O nome longo da disciplina e as colunas Local+Horário não cabem. É a segunda tela mais quebrada em mobile depois de Notas.
- **AJAX:** nenhum. A tabela carrega com o SSR do portal.

---

### Ações de escrita presentes

Nenhuma nesta seção. Os links de turma são postbacks de navegação (acessar turma virtual), não ações de escrita.

---

---

## Tela 3 — Turma Virtual: Notas (Ver Notas / Boletim)

**Para que serve:** mostra as notas de todos os alunos da turma em todas as avaliações do semestre, organizado por bimestres.

**Como chegar:**
1. Portal do aluno → clicar no nome da turma (postback `form_acessarTurmaVirtual`)
2. Dentro da turma virtual → menu "Alunos" → "Ver Notas" (postback `formMenu` com componente `Ver Notas`)
3. Servidor redireciona para `ava/index.jsf`

**URL final:** `https://sig.cefetmg.br/sigaa/ava/index.jsf`

**Tipo:** leitura pura

**Frequência:** semanal / por bimestre

---

### Fluxo de navegação JSF (Fase 1 — fetcher)

```
Step 1: GET discente.jsf
        → lê ViewState + lista de turmas com frontEndIdTurma

Step 2: POST discente.jsf
        form_acessarTurmaVirtual        = form_acessarTurmaVirtual
        <componente_turma>              = <componente_turma>   (extrair do onclick)
        frontEndIdTurma                 = <hash 40 chars>
        javax.faces.ViewState           = <valor atual>
        → resposta ainda em discente.jsf (turma virtual aberta na sessão)
        → lê novo ViewState da resposta

Step 3: POST discente.jsf
        formMenu                        = formMenu
        <componente_ver_notas>          = <componente_ver_notas>  (extrair do onclick do link "Ver Notas")
        javax.faces.ViewState           = <valor do step 2>
        → servidor redireciona para ava/index.jsf

Step 4: GET ava/index.jsf
        → HTML estático com a tabelaRelatorio de notas
        → parsear
```

**Como extrair o componente "Ver Notas" dinamicamente (sem depender do j_id gerado):**

```js
// Na página da turma virtual (discente.jsf após step 2):
const linkVerNotas = [...document.querySelectorAll('#formMenu a')]
  .find(a => a.innerText.trim() === 'Ver Notas');
const onclick = linkVerNotas?.getAttribute('onclick') ?? '';
// Extrair o par chave:valor do jsfcljs — é o componente a submeter
const match = onclick.match(/'(formMenu:[^']+)':'(formMenu:[^']+)'/);
// match[1] e match[2] são iguais — esse é o campo extra a incluir no POST do step 3
```

---

### Estrutura da página `ava/index.jsf`

**Sem formulários** — página SSR estática, sem `<form>`. É um relatório puro.

Container principal: `#relatorio-paisagem-container` > `#relatorio`

Tabela de notas: `.tabelaRelatorio`
- `rows[0]`: cabeçalho de bimestres (com `colspan` por bimestre)
- `rows[1]`: subcabeçalho (abreviações das avaliações: PB, EX, Nota, etc.)
- `rows[2..N]`: uma linha por aluno matriculado

**Estrutura de colunas (ALGORITMOS E LÓGICA DE PROGRAMAÇÃO — 2026):**

| col | cabeçalho nível 1 | cabeçalho nível 2 | observação |
|---|---|---|---|
| 0 | Matrícula | — | |
| 1 | Nome | — | |
| 2 | 1o. Bimestre | PB | Prova Bimestral, max 10.0 |
| 3 | 1o. Bimestre | EX | Exercícios, max 10.0 |
| 4 | 1o. Bimestre | Nota | soma das anteriores |
| 5 | 2o. Bimestre | PB | 2ª Prova Bimestral, max 15.0 |
| 6 | 2o. Bimestre | EXS | Exercícios, max 15.0 |
| 7 | 2o. Bimestre | Nota | soma das anteriores |
| 8 | 3o. Bimestre | Nota | (ainda sem avaliações em 2026.1) |
| 9 | 4o. Bimestre | Nota | (ainda sem avaliações em 2026.1) |
| 10 | R1 | — | Recuperação 1 |
| 11 | R2 | — | Recuperação 2 |
| 12 | Resultado | — | nota final calculada |
| 13 | Faltas | — | total de faltas |
| 14 | Sit. | — | situação (APROVADO/REPROVADO/etc.) |

> **Atenção:** o número de colunas por bimestre varia por disciplina — depende de quantas avaliações o professor cadastrou. O parser precisa ser dinâmico, não fixar posições de coluna.

---

### IDs das avaliações

Cada avaliação cadastrada pelo professor tem IDs semânticos na página:

```
aval_<ID>         — elemento com innerText = abreviação (PB, EX, EXS...)
abrevAval_<ID>    — abreviação (vazio no HTML, está no innerText de aval_<ID>)
denAval_<ID>      — denominação completa (vazio inline, está nos tooltips)
notaAval_<ID>     — nota do aluno nessa avaliação
pesoAval_<ID>     — peso da avaliação
```

`<ID>` é o ID do banco de dados da avaliação (estável por turma, mas gerado).

**Tooltips com nome completo e nota máxima:** `#tooltip2`, `#tooltip3`, etc. (sequencial, começa em 2). Estrutura interna:
```html
<b>Avaliação:</b> Prova Bimestral<br>
<b>Nota Máxima:</b> 10.0<br>
```

**Como mapear tooltip → coluna:**
Os tooltips aparecem na mesma ordem das colunas de avaliação (excluindo Matrícula, Nome, Nota acumulada, R1, R2, Resultado, Faltas, Sit.). O tooltip N corresponde à N-ésima avaliação individual (não às colunas de Nota/soma).

---

### Seletores para o parser

| Dado | Seletor | Observação |
|---|---|---|
| Tabela de notas | `.tabelaRelatorio` | única na página |
| Cabeçalho bimestres | `.tabelaRelatorio tr:nth-child(1) th` | com colspan por bimestre |
| Subcabeçalho avaliações | `.tabelaRelatorio tr:nth-child(2) th` | PB, EX, Nota... |
| Linha do aluno | `.tabelaRelatorio tr` onde `td:first-child` = matrícula | filtrar por matrícula |
| Abreviação da avaliação | `[id^="aval_"]` → `innerText` | PB, EX, EXS |
| Nome completo da avaliação | `[id^="tooltip"]` → regex em `innerHTML` | "Prova Bimestral", "Exercícios" |
| Nota máxima | `[id^="tooltip"]` → regex em `innerHTML` | número após "Nota Máxima:" |
| Disciplina | `h3` da página | "DELCOMCON.002 - ALGORITMOS E LÓGICA DE PROGRAMAÇÃO (80h) - Turma: INF1 (2026)" |

**Regex para extrair nome e nota máxima do tooltip:**
```js
const nome = el.innerHTML.match(/Avalia[çc][ãa]o:<\/b>\s*([^<]+)/)?.[1]?.trim();
const max  = el.innerHTML.match(/Nota M[áa]xima:<\/b>\s*([\d.]+)/)?.[1];
```

---

### Crítica de interface

- **Visão de turma inteira, não do aluno:** a tabela mostra todos os alunos. O aluno logado precisa achar a própria linha manualmente. Não há destaque, não há filtro.
- **Nomes dos colegas visíveis:** dado de privacidade — outros alunos da turma podem ver as notas uns dos outros. A extensão vai exibir só a linha do aluno logado.
- **Nome da funcionalidade ("Ver Notas"):** escondido em submenu "Alunos" → "Ver Notas". Dois cliques a partir da turma virtual, que já exigiu um clique. Total: 3 cliques desde o portal para ver uma nota. A extensão elimina todos.
- **"Ver Notas" ≠ "Emitir Boletim":** existe também "Emitir Boletim" no SIGAA (em outro caminho), que gera um PDF formal — diferente desta view. Os alunos confundem os dois. A extensão deve chamar claramente de "Notas" sem verbo de emissão.
- **Estrutura de colunas não é autodescritiva:** "PB", "EX", "EXS" são abreviações sem legenda visível (estão nos tooltips de hover — inacessíveis em mobile). A extensão exibirá o nome completo sempre.
- **Bimestres sem avaliação mostram coluna vazia:** ocupa espaço e confunde. A extensão pode ocultar bimestres futuros.
- **390px:** tabela de 15 colunas transborda completamente — ilegível. Nenhuma responsividade. É provavelmente a tela mais inutilizável em mobile de todo o SIGAA.
- **AJAX:** nenhum. Página carrega completa de uma vez.

---

### Ações de escrita presentes

Nenhuma. A página `ava/index.jsf` é somente leitura. Só tem "Voltar" e "Imprimir".

---

---

## Tela 4 — Turma Virtual: Frequência (Mapa de Frequências)

**Para que serve:** lista todas as aulas registradas pelo professor com a situação do aluno em cada uma (Presente / Falta / Não Registrada) e o total de faltas.

**Como chegar:**
1. Portal → turma (postback `form_acessarTurmaVirtual`)
2. Turma virtual → menu "Alunos" → "Frequência" (postback `formMenu`)
3. Servidor carrega `ava/FrequenciaAluno/mapa.jsf`

**URL final:** `https://sig.cefetmg.br/sigaa/ava/FrequenciaAluno/mapa.jsf`
(diferente de notas — URL muda para este endpoint específico)

**Tipo:** leitura pura

**Frequência de uso:** semanal

---

### Fluxo JSF (Fase 1 — fetcher)

Igual ao de notas até o step 2. No step 3, o componente a enviar é o de "Frequência":

```js
// Extrair dinamicamente o componente Frequência:
const linkFreq = [...document.querySelectorAll('#formMenu a')]
  .find(a => a.innerText.trim() === 'Frequência');
// Extrair chave do onclick igual ao padrão de "Ver Notas"
```

A resposta do server para o POST de "Frequência" redireciona para `ava/FrequenciaAluno/mapa.jsf`.

---

### Estrutura da página

**Formulários presentes:** todos com `action="ava/FrequenciaAluno/mapa.jsf"`
- `parecerpdf` — painel NEE (Necessidades Educativas Especiais) — ignorar
- `form_nee` — envio de mensagem para CAENE — ignorar
- `formMenu` — menu da turma virtual (mesmo padrão do resto)
- `formAcoesTurma` — barra de ações (imprimir, trocar turma, visualizar paginado)
- `formTurma` — dropdown de trocar turma (mesmo padrão do portal)

**Tabela de frequência:** `table.listing`

Estrutura (2 colunas fixas, sempre):

| col | conteúdo |
|---|---|
| 0 | Data (dd/mm/aaaa) |
| 1 | Situação (Presente / Falta / Não Registrada) |

Última linha (fora da tabela, abaixo dela): "Total de Faltas: N"

**Seletores:**

| Dado | Seletor | Observação |
|---|---|---|
| Tabela de frequência | `table.listing` | única com essa classe na página |
| Linhas de dados | `table.listing tr` | row[0] = cabeçalho; row[1..N] = datas |
| Data da aula | `tr td:nth-child(1)` | formato dd/mm/aaaa |
| Situação | `tr td:nth-child(2)` | "Presente", "Falta", "Não Registrada" |
| Total de faltas | regex no `body.innerText`: `/Total de Faltas:\s*(\d+)/` | ou elemento próximo à tabela |

**Valores possíveis de Situação:** `Presente`, `Falta`, `Não Registrada` (aula cadastrada mas chamada não lançada).

---

### Crítica de interface

- **Simples e legível:** a tabela de 2 colunas é a mais simples do SIGAA. Funciona razoavelmente bem.
- **"Não Registrada" é ambígua:** o aluno não sabe se errou aula ou se o professor não lançou. A extensão pode deixar isso mais claro com um ícone e tooltip explicando.
- **Nenhum destaque visual** para as faltas — "Falta" e "Presente" têm o mesmo peso visual. A extensão vai colorir.
- **Total de faltas** está em texto corrido fora da tabela, fácil de ignorar. É a informação mais importante dessa tela.
- **Sem % de frequência calculada:** o aluno precisa calcular manualmente quantas faltas pode ter (geralmente limite de 25%). A extensão vai calcular e mostrar.
- **390px:** tabela de 2 colunas funciona bem em mobile — é a tela menos quebrada do projeto. Só a barra de ações transborda.
- **AJAX:** `formAcoesTurma` usa `PrimeFaces.ajax.AjaxRequest` para "Imprimir" e "Trocar de Turma" — são ações internas, não afetam o parse.

---

### Ações de escrita presentes

Nenhuma de escrita acadêmica. `formAcoesTurma` tem:
- "Imprimir" — gera PDF de frequência (leitura)
- "Trocar de Turma" — muda o contexto de turma (navegação)
- Botões de visualização paginada — layout alternativo (leitura)

---

---

## Tela 5 — Horário / Grade de Aulas

**Descoberta:** não existe página dedicada de Horário no menu do discente técnico integrado. O menu "Ensino" não contém "Meu Horário de Aulas". A grade está embutida na tabela "Turmas do Semestre" do portal do aluno (Tela 1), já mapeada.

**Para que serve:** decodificação dos códigos de horário de cada disciplina.

**Onde fica o dado:** coluna "Horário" da tabela `#turmas-portal table` na `discente.jsf`. Seletor: `table` em `#turmas-portal`, col[2] de cada linha de turma.

**Formato do código de horário (notação SIGAA padrão):**

```
[dia][período][aulas]

dia:    2=Seg  3=Ter  4=Qua  5=Qui  6=Sex  7=Sáb
período: M=Manhã  T=Tarde  N=Noite
aulas:  1–6 (numeração dentro do período)

Exemplos:
  6M12   = Sexta, Manhã, aulas 1 e 2
  5T12   = Quinta, Tarde, aulas 1 e 2
  35M12  = Terça e Quinta, Manhã, aulas 1 e 2
  2M12 4T12 = Segunda Manhã 1-2 + Quarta Tarde 1-2  (dois blocos separados por espaço)
```

**Horários por slot:** dependem da instituição — cada campus pode ter horários distintos. Não hardcodear na extensão; ou deixar configurável ou omitir os horários por hora.

**Emitir Boletim (item do menu Ensino):**
Ação `portalDiscente.emitirBoletim` via `jscook_action` no form `menu:form_menu_discente`. Provavelmente gera PDF com notas de todas as disciplinas. **Não clicado** durante o mapeamento (rótulo "Emitir" está na lista vermelha do protocolo). Documentar para a Fase 2 — a extensão pode oferecer atalho para esta view.

**Dado adicional do menu Ensino (mapeado via script do menu):**
- `Comunicados Importantes (19)` → `comunicadoImportante.telaMeusComunicados`
- `Calendário Acadêmico` → `calendario.iniciarBusca`
- `Consultar Turma` → `buscaTurmaBean.popularBuscaGeral`

---

## Tela 6 — Avisos / Notícias da Turma Virtual

**Como chegar:**
1. Portal → turma (postback `form_acessarTurmaVirtual`)
2. Turma virtual → menu "Turma" → "Notícias"

**Componente no formMenu:** `formMenu:j_id_jsp_311393315_86` (gerado — extrair pelo texto "Notícias")

**URL:** ainda `ava/index.jsf` ou subpath — a confirmar (não mapeado ainda — foi pulado nesta sessão por limitação de contexto)

**URL:** `ava/NoticiaTurma/listar.jsf`

**Mapeado via:** widget de Notícias no `ArquivoTurma/listar_discente.jsf` de APLICAÇÕES PARA WEB I, que exibiu 5 avisos reais.

**Fixture:** `tests/fixtures/T-06-avisos-noticias.json`

**Screenshots:** `docs/screenshots/06-avisos/` — não capturado separadamente (dados visíveis no screenshot de materiais).

### Estrutura do widget de Notícias (painel lateral)

O widget aparece na coluna esquerda de qualquer página da turma virtual. Estrutura de cada item:

```
<data> <hora>
<título do aviso>
(Visualizar)   ← link para ver o aviso completo
```

Exemplo real (anonimizado):
- 25/06/2026 14:14 — "Nova data da avaliação"
- 11/06/2026 09:16 — "Ausência na aula de hoje (11/06), reposição 18/06"
- 11/05/2026 10:53 — "Estou de volta!"
- 06/05/2026 17:00 — "Não haverá aula de WEB-I amanhã (07/05)"
- 24/02/2026 15:05 — "Alteração no horário da aula"

### Página dedicada de Notícias (`NoticiaTurma/listar.jsf`)

Acessada via menu "Turma" → "Notícias" (componente `formMenu:j_id_jsp_311393315_86`).

Quando vazia: "Nenhum item foi encontrado."

Quando tem itens: lista paginada de avisos com data, título e texto completo ou link "(Visualizar)" para abrir o aviso individual.

### Seletores

| Dado | Seletor | Observação |
|---|---|---|
| Widget de notícias | `form` com innerText começando em "Notícias" e contendo "(Visualizar)" | no painel esquerdo da turma virtual |
| Data do aviso | `td` ou `div` antes do título, formato `dd/mm/aaaa hh:mm` | regex: `/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/` |
| Título | texto após a data no mesmo bloco | |
| Link visualizar | `a` com innerText "(Visualizar)" | dispara jsfcljs — leitura do aviso completo |

### Crítica de interface

- O título aparece sem formatação especial — textos longos ficam cortados no widget.
- O widget mostra no máximo 5 itens; para ver todos é preciso clicar em "Notícias" no menu.
- Avisos urgentes não têm destaque diferente dos informativos.
- Nenhum indicador de "não lido".
- **390px:** o widget fica legível, mas muito comprimido.

---

## Tela 7 — Materiais da Turma Virtual

**Como chegar:**
1. Portal → turma (postback `form_acessarTurmaVirtual`)
2. Turma virtual → menu "Materiais" → "Arquivos" (ou "Conteúdo/Página web")

**Itens do menu Materiais (mapeados via link scan):**
- Conteúdo/Página web → `formMenu:j_id_jsp_311393315_115`
- Referências → `formMenu:j_id_jsp_311393315_119`
- Vídeos → `formMenu:j_id_jsp_311393315_121`
- Arquivos → `formMenu:j_id_jsp_311393315_122`

**URL:** `ava/ArquivoTurma/listar_discente.jsf`

**Fixture:** `tests/fixtures/T-07-materiais-arquivos.json`

**Screenshots:** `docs/screenshots/07-materiais/desktop.png` e `mobile-390x844.png`

### Estrutura da página

A página `ArquivoTurma/listar_discente.jsf` mostra:
1. **Última Notícia** (topo da área principal) — o aviso mais recente do professor
2. **Andamento das Aulas** — todos os tópicos em ordem cronológica
3. **Arquivos e tarefas** — embutidos dentro dos tópicos onde foram publicados

**Não há uma tabela separada de arquivos** — cada arquivo aparece como link `<a onclick="jsfcljs(document.getElementById('formAva'), ...)">` dentro do tópico correspondente.

**`formAva`** — form dedicado para download de arquivos. Usado pelos links de arquivo (diferente do `formMenu` de navegação).

### Tipos de item que aparecem misturados

| Tipo | onclick | Exemplo |
|---|---|---|
| Arquivo | `jsfcljs(formAva, ...)` | "Slides da aula", "Tags mais usadas em HTML" |
| Tarefa | `prevenirDuploClique()` + `jsfcljs` | "2 Bimestre - Atividade teórica sobre CSS" |

O parser precisa distinguir os dois tipos pelo padrão do `onclick`.

### Seletores

| Dado | Seletor | Observação |
|---|---|---|
| Links de arquivo | `a[onclick*="formAva"]` | download via JSF |
| Links de tarefa | `a[onclick*="prevenirDuploClique"]` dentro do `formAva` | tarefa do aluno |
| Tópico pai do arquivo | `td` ou `div` ancestral com texto de data `(dd/mm/aaaa - dd/mm/aaaa)` | contexto do arquivo |
| Título do arquivo | `a.innerText` | nome dado pelo professor |

### Fluxo JSF para download de arquivo

Não mapeado via rede (não clicamos em nenhum arquivo). Pelo padrão do onclick, o download provavelmente é um POST para `ArquivoTurma/listar_discente.jsf` com `formAva` + ID do arquivo, e o servidor responde com `Content-Disposition: attachment`.

**Princípio 2 (somente leitura) permite:** baixar arquivos publicados pelo professor é leitura. A extensão pode exibir a lista de arquivos com links que abrem direto no SIGAA.

### Crítica de interface

- **Mistura de tipos sem separação:** arquivos e tarefas aparecem no mesmo fluxo sem label de tipo. O aluno não sabe se é um arquivo para baixar ou uma tarefa para entregar só lendo o título.
- **Contexto enterrado:** para saber de qual aula é o arquivo, o aluno precisa ler o tópico acima. Não há agrupamento visual claro.
- **Sem data de upload** visível nos links de arquivo (só a data do tópico).
- **"Baixar Todos os Arquivos":** mencionado na descrição da página mas não apareceu nesta turma — provavelmente só aparece quando há arquivos reais (não tarefas).
- **390px:** a lista de tópicos com textos longos transborda. Links de arquivo ficam apertados.

---

## Status final do mapeamento

| # | Tela | Status | URL | Fixture |
|---|---|---|---|---|
| 1 | Portal do Aluno | ✅ | `discente.jsf` | T-01 |
| 2 | Lista de Turmas | ✅ | `discente.jsf` (seção `#turmas-portal`) | T-02 |
| 3 | Turma Virtual: Notas | ✅ | `ava/index.jsf` | T-03 |
| 4 | Turma Virtual: Frequência | ✅ | `ava/FrequenciaAluno/mapa.jsf` | T-04 |
| 5 | Horário / Grade | ✅ | (embutido no portal — col `Horário` da tabela de turmas) | — |
| 6 | Avisos / Notícias | ✅ | `ava/NoticiaTurma/listar.jsf` | T-06 |
| 7 | Materiais / Arquivos | ✅ | `ava/ArquivoTurma/listar_discente.jsf` | T-07 |

**Mapeamento completo.** A Fase 1 pode começar.
