/**
 * Parser do carrossel de atualizações — função pura.
 *
 * Entrada: outerHTML do elemento #atualizacoes-turma (carregado via AJAX)
 * Saída:   Array de AtualizacaoItem, sem duplicatas, ordem cronológica reversa
 *
 * Estrutura DOM confirmada via DevTools (v4.17.0cefet178):
 *
 *   <div id="atualizacoes-turma">
 *     <div class="rotator">
 *       <table style="...">          ← um item por table
 *         <tr><td>DD/MM/AAAA - <a onclick="jsfcljs(...,'idTurma':'NNNN',...)">NOME (ANO)</a></td></tr>
 *         <tr><td>Tipo da atualização: descrição</td></tr>
 *       </table>
 *       ...
 *     </div>
 *   </div>
 */

import type { AtualizacaoItem } from '@/types';

export function parseAtualizacoes(html: string): AtualizacaoItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('.rotator table');
  const seen = new Set<string>();
  const items: AtualizacaoItem[] = [];

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;

    const firstTd = rows[0]?.querySelector('td');
    const secondTd = rows[1]?.querySelector('td');
    if (!firstTd || !secondTd) continue;

    const dateMatch = (firstTd.textContent ?? '').match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue;

    const link = firstTd.querySelector('a');
    const nomeTurmaRaw = link?.textContent?.trim() ?? '';
    // Remove sufixo " (AAAA)" adicionado pelo SIGAA
    const nomeTurma = nomeTurmaRaw.replace(/\s*\(\d{4}\)\s*$/, '').trim();

    const onclick = link?.getAttribute('onclick') ?? '';
    const idMatch = onclick.match(/'idTurma':'(\d+)'/);
    const idTurma = idMatch?.[1] ?? null;

    const tipo = secondTd.textContent?.trim() ?? '';

    if (!nomeTurma || !tipo) continue;

    // Desduplicar: mesma data + turma + tipo = mesmo evento
    const key = `${dateMatch[1]}|${nomeTurma}|${tipo}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ data: dateMatch[1], nomeTurma, tipo, idTurma });
  }

  return items;
}
