# Progresso — Mapeamento do SIGAA (RUNBOOK-mapeamento-sigaa.md)

Arquivo de continuidade. Se a sessão do Claude Code foi reiniciada, leia isto
antes de qualquer coisa — ele registra exatamente onde a execução parou.

---

## Estado atual — MAPEAMENTO COMPLETO

- [x] Pré-requisitos verificados: Node v22.22.0, Chrome instalado.
- [x] `chrome-devtools-mcp` instalado e configurado.
- [x] **Ferramentas do MCP chrome-devtools carregadas com sucesso** na 4a sessao
      (aparecem como `available-deferred-tools` no topo da janela — basta fazer
      ToolSearch para carrega-las). Nas sessoes anteriores nao apareciam;
      o fix foi simplesmente fechar e reabrir o Claude Code completamente.
- [x] Tela 1 — Portal do Aluno: **MAPEADA** (`docs/MAPEAMENTO.md` secao 1).
      - Fixture salva: `tests/fixtures/T-01-portal-aluno.json`
        (extensao .json gerada pelo MCP mesmo com filePath .html — conteudo e HTML dentro de JSON)
      - Screenshots: `docs/screenshots/01-portal-aluno/desktop.png` e `mobile-390x844.png`
      - Versao confirmada: v4.17.0cefet178
      - Descoberta importante: `frontEndIdTurma` (hash hex 40 chars no onclick de cada turma)
        e o identificador estavel para acessar turma virtual — mais confiavel que j_id gerado.
- [x] Tela 2 — Lista de turmas: **MAPEADA** (`docs/MAPEAMENTO.md` secao 2).
      - Nao e pagina separada — e a secao `#turmas-portal` do portal (discente.jsf).
      - Fixture: `tests/fixtures/T-02-lista-turmas.json`
      - Screenshots: `docs/screenshots/02-lista-turmas/desktop.png` e `mobile-390x844.png`
      - Dado novo: `linhaId` (`linha_XXXXXX`) = ID numerico da turma no banco do SIGAA.
      - Extrator completo de todas as turmas documentado em MAPEAMENTO.md secao 2.
      - 17 turmas mapeadas no semestre 2026.1.
- [x] Tela 3 — Turma virtual: Notas: **MAPEADA** (`docs/MAPEAMENTO.md` secao 3).
      - Fixture: `tests/fixtures/T-03-turma-notas.json`
      - Screenshots: `docs/screenshots/03-turma-notas/desktop.png` e `mobile-390x844.png`
      - URL: `ava/index.jsf` (diferente do portal — SSR estatico, sem form)
      - Fluxo: POST discente.jsf (abrir turma) → POST discente.jsf (Ver Notas) → GET ava/index.jsf
      - Tabela: `.tabelaRelatorio` — filtravel por matricula na col[0]
      - Nomes das avals nos tooltips `#tooltip2..N` — regex para extrair nome e max
      - IDs das avals: `aval_XXXXXX` (gerado, mas estavel por turma)
      - Numero de colunas varia por disciplina — parser deve ser dinamico
- [x] Tela 4 — Turma virtual: Frequencia: **MAPEADA** (`docs/MAPEAMENTO.md` secao 4).
      - URL: `ava/FrequenciaAluno/mapa.jsf`
      - Tabela: `table.listing` — 2 colunas (Data, Situacao)
      - Status possiveis: Presente / Falta / Nao Registrada
      - Total de faltas: regex `/Total de Faltas:\s*(\d+)/`
      - Nota UX: sem % de frequencia calculada, sem destaque visual de faltas
- [x] Tela 5 — Horario / grade: **MAPEADA** (sem pagina dedicada).
      - Dado vem da coluna "Horario" da tabela do portal (notacao "6M12")
      - Decoder documentado em MAPEAMENTO.md secao 5
- [x] Tela 6 — Avisos / Noticias: **MAPEADA** (`docs/MAPEAMENTO.md` secao 6).
      - URL: `ava/NoticiaTurma/listar.jsf`
      - Widget lateral com 5 itens (data, titulo, link Visualizar)
      - Fixture: `tests/fixtures/T-06-avisos-noticias.json`
      - Screenshots: dados visiveis no screenshot de materiais (07-materiais/)
- [x] Tela 7 — Materiais / Arquivos: **MAPEADA** (`docs/MAPEAMENTO.md` secao 7).
      - URL: `ava/ArquivoTurma/listar_discente.jsf`
      - Arquivos embutidos nos topicos via `formAva`. Tarefas misturadas com arquivos.
      - Fixture: `tests/fixtures/T-07-materiais-arquivos.json`
      - Screenshots: `docs/screenshots/07-materiais/desktop.png` e `mobile-390x844.png`

---

## Proxima etapa: Fase 1 — Implementacao

O mapeamento esta completo. `docs/MAPEAMENTO.md` tem tudo o que a Fase 1 precisa.

**O que fazer agora:**
1. Criar a estrutura de pastas do projeto (src/, tests/, etc. — ver CLAUDE.md secao 5)
2. Implementar `src/selectors/map.ts` com os seletores das 6 telas
3. Implementar os parsers (funcoes puras) em `src/parsers/`
4. Escrever testes Vitest usando as fixtures em `tests/fixtures/`
5. Implementar `src/fetchers/session.ts` (fila JSF sequencial)

---

## Lista de tarefas

1. [x] Verificar pre-requisitos
2. [x] Instalar chrome-devtools MCP
3. [x] Preparacao manual (login, intersticios, portal limpo)
4. [x] Mapear tela 1: Portal do aluno
5. [x] Mapear tela 2: Lista de turmas
6. [x] Mapear tela 3: Turma virtual — Notas
7. [x] Checkpoint: revisar telas 1 e 3 (feito — ok)
8. [x] Mapear tela 4: Turma virtual — Frequencia
9. [x] Mapear tela 5: Horario / grade
10. [x] Mapear tela 6: Avisos
11. [x] Mapear tela 7: Materiais da turma
12. [x] Revisao final de docs/MAPEAMENTO.md

---

## Convencao de screenshots

```
docs/screenshots/
  01-portal-aluno/
    desktop.png          <- capturado
    mobile-390x844.png   <- capturado
  02-lista-turmas/
    desktop.png          <- capturado
    mobile-390x844.png   <- capturado
  03-turma-notas/
    desktop.png          <- capturado
    mobile-390x844.png   <- capturado
  04-turma-frequencia/
    desktop.png          <- capturado
    mobile-390x844.png   <- capturado
  07-materiais/
    desktop.png          <- capturado
    mobile-390x844.png   <- capturado
```

## Nota sobre fixture

O MCP `evaluate_script` com `filePath` salva como JSON (array com `{type, text}`),
mesmo que a extensao do filePath seja `.html`. Para extrair o HTML:

```bash
node -e "const f=require('./tests/fixtures/T-01-portal-aluno.json'); console.log(f[0].text)" > T-01-portal-aluno.html
```
