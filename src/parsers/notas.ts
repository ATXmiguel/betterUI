/**
 * Parser de notas — função pura.
 *
 * Entrada: HTML string de ava/index.jsf + matrícula do aluno
 * Saída:   NotasTurma para o aluno, ou null se não encontrado
 *
 * Estrutura da tabela (confirmada na fixture T-03):
 *
 * <table class="tabelaRelatorio">
 *   <thead>
 *     <tr>                                          ← Header 0: bimestres com colspan
 *       <th>Matrícula</th>
 *       <th>Nome</th>
 *       <th colspan="3">1o. Bimestre</th>          ← 2 avaliações + Nota
 *       <th colspan="3">2o. Bimestre</th>
 *       <th colspan="1">3o. Bimestre</th>          ← só Nota (sem avaliações ainda)
 *       ...
 *       <th>Resultado</th><th>Faltas</th><th>Sit.</th>
 *     </tr>
 *     <tr id="trAval" bgcolor="#C4D2EB">           ← Header 1: avaliações individuais
 *       <th></th><th></th>
 *       <th id="aval_58338960">PB</th>
 *       <input type="hidden" id="denAval_58338960" value="Prova Bimestral">
 *       <input type="hidden" id="notaAval_58338960" value="10.0">
 *       <input type="hidden" id="pesoAval_58338960" value="1">
 *       <th id="aval_58624767">EX</th>
 *       ...
 *       <th id="unid">Nota</th>                   ← bimester total (id="unid" = repeated)
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr class="linhaPar|linhaImpar">
 *       <td>00000000 </td>                        ← matrícula (com espaços!)
 *       <td>NOME DO ALUNO</td>
 *       <td>7,0</td>                              ← notas com vírgula BR
 *       ...
 *       <td>--</td>                               ← não lançada
 *       <td>15,0</td>                             ← bimester total
 *     </tr>
 *   </tbody>
 * </table>
 */

import type { NotasTurma, BimestreInfo, AvaliacaoInfo } from '@/types';

function parseBRFloat(text: string): number | null {
  const clean = text.trim().replace(',', '.');
  if (clean === '--' || clean === '' || clean === '-') return null;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

export function parseNotas(html: string, matricula: string): NotasTurma | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table.tabelaRelatorio');
  if (!table) return null;

  // Nome da disciplina: h3 na página
  const nomeDisciplina = doc.querySelector('h3')?.textContent?.trim() ?? '';

  // ── Passo 1: montar mapa de avaliações a partir do trAval ────────────────
  // Cada th[id^="aval_"] corresponde a uma avaliação individual
  // Cada th[id="unid"] corresponde ao total do bimestre
  // Os inputs hidden com metadados estão como irmãos dos th dentro do trAval

  // trAval pode ser null quando o professor não configurou avaliações individuais
  // (apenas notas por bimestre direto) — continuamos sem ele
  const trAval = doc.querySelector('#trAval');

  // Percorre os filhos diretos do trAval para manter a ordem das colunas
  interface ColDef {
    type: 'aval' | 'unid' | 'skip';
    aval?: AvaliacaoInfo;
  }

  const colDefs: ColDef[] = [];
  const children = trAval ? [...trAval.children] : [];

  let i = 0;
  // Primeiros 2 filhos são th vazios (Matrícula e Nome) — skip
  colDefs.push({ type: 'skip' }); // col 0: Matrícula
  colDefs.push({ type: 'skip' }); // col 1: Nome

  while (i < children.length) {
    const el = children[i];
    if (el.tagName === 'TH') {
      const id = el.id;
      if (id?.startsWith('aval_')) {
        const avalId = id.replace('aval_', '');
        // Metadados nos inputs seguintes (irmãos)
        const denEl = doc.getElementById(`denAval_${avalId}`) as HTMLInputElement | null;
        const maxEl = doc.getElementById(`notaAval_${avalId}`) as HTMLInputElement | null;
        const pesoEl = doc.getElementById(`pesoAval_${avalId}`) as HTMLInputElement | null;

        colDefs.push({
          type: 'aval',
          aval: {
            abreviacao: el.textContent?.trim() ?? '',
            denominacao: denEl?.value ?? null,
            notaMaxima: maxEl ? parseFloat(maxEl.value) || null : null,
            peso: pesoEl ? parseFloat(pesoEl.value) || null : null,
            nota: null, // preenchida da linha do aluno
            avalId,
          },
        });
      } else if (id === 'unid' || el.textContent?.trim() === 'Nota') {
        colDefs.push({ type: 'unid' });
      } else if (el.textContent?.trim() === '' && !id) {
        // th vazio inicial — já contabilizados acima, ignorar aqui
        // (os dois th vazios iniciais são os primeiros filhos)
        i++;
        continue;
      } else {
        // R1, R2, Resultado, Faltas, Sit.
        colDefs.push({ type: 'skip' });
      }
    }
    // Inputs hidden: ignorados no loop de col (já lidos via getElementById)
    i++;
  }

  // ── Passo 2: montar estrutura de bimestres a partir do header 0 ──────────
  const headerRow0 = table.querySelector('thead tr:first-child');
  const headerThs = headerRow0 ? [...headerRow0.querySelectorAll('th')] : [];

  // headerThs: [Matrícula, Nome, 1oBimestre(colspan=3), 2oBimestre(colspan=3),
  //             3oBimestre(colspan=1), 4oBimestre(colspan=1), R1, R2,
  //             Resultado, Faltas, Sit.]
  // Mapeamos cada índice de coluna de dado (a partir de col 2) para um bimestre

  interface BimestreSlot {
    nome: string;
    startCol: number; // índice de coluna de dado (0 = 1ª col após Nome)
    colCount: number;
  }

  const slots: BimestreSlot[] = [];
  let colCursor = 2; // pula Matrícula (col 0) e Nome (col 1)

  for (const th of headerThs) {
    const text = th.textContent?.trim() ?? '';
    if (text === 'Matrícula' || text === 'Nome') continue;
    if (text === 'Resultado' || text === 'Faltas' || text === 'Sit.') break;

    const colspan = parseInt(th.getAttribute('colspan') ?? '1', 10);
    slots.push({ nome: text, startCol: colCursor, colCount: colspan });
    colCursor += colspan;
  }

  // ── Passo 3: encontrar a linha do aluno pela matrícula ───────────────────
  const tbody = table.querySelector('tbody');
  if (!tbody) return null;

  const rows = tbody.querySelectorAll('tr');
  let studentRow: Element | null = null;
  for (const row of rows) {
    const firstTd = row.querySelector('td');
    if (firstTd?.textContent?.trim() === matricula.trim()) {
      studentRow = row;
      break;
    }
  }

  if (!studentRow) return null;

  // ── Passo 4: extrair notas da linha do aluno ─────────────────────────────
  // Todas as tds em ordem (inclui Matrícula e Nome no início,
  // Resultado, Faltas, Sit. no final)
  const dataCells = [...studentRow.querySelectorAll('td')];

  // Células de dados: a partir do índice 2 (pula Matrícula e Nome)
  // As últimas 3 são Resultado, Faltas, Sit.

  // Preencher notas nas avaliacoes dos colDefs
  // colDefs[0] = Matrícula (skip), colDefs[1] = Nome (skip)
  // colDefs[2..N] = avaliações e totais
  for (let ci = 2; ci < colDefs.length && ci < dataCells.length; ci++) {
    const def = colDefs[ci];
    const cellText = dataCells[ci]?.textContent?.trim() ?? '';
    if (def.type === 'aval' && def.aval) {
      def.aval.nota = parseBRFloat(cellText);
    }
  }

  // Resultado, Faltas, Sit. = últimas 3 células
  const lastCells = dataCells.slice(-3);
  const resultado = parseBRFloat(lastCells[0]?.textContent?.trim() ?? '');
  const faltas = parseInt(lastCells[1]?.textContent?.trim() ?? '', 10) || null;
  const situacao = lastCells[2]?.textContent?.trim() || null;

  // ── Passo 5: agrupar em bimestres ────────────────────────────────────────
  const bimestres: BimestreInfo[] = [];

  for (const slot of slots) {
    const slotCols = colDefs.slice(slot.startCol, slot.startCol + slot.colCount);

    // Avaliações individuais (type === 'aval')
    const avaliacoes: AvaliacaoInfo[] = slotCols
      .filter((c): c is { type: 'aval'; aval: AvaliacaoInfo } => c.type === 'aval' && !!c.aval)
      .map(c => ({ ...c.aval }));

    // Nota do bimestre: a última coluna do slot (type === 'unid')
    const notaCell = dataCells[slot.startCol + slot.colCount - 1];
    const nota = parseBRFloat(notaCell?.textContent?.trim() ?? '');

    bimestres.push({ nome: slot.nome, avaliacoes, nota });
  }

  return { nomeDisciplina, matricula: matricula.trim(), bimestres, resultado, faltas, situacao };
}
