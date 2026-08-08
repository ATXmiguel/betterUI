/**
 * Parser de turmas — função pura.
 *
 * Entrada: HTML string do portal do aluno (discente.jsf)
 * Saída:   Array de TurmaInfo, uma por turma matriculada
 *
 * Estrutura DOM (confirmada nas fixtures T-01 e T-02):
 *
 *   <tr class="odd|''">
 *     <td class="descricao">
 *       <form id="form_acessarTurmaVirtual[j_id_N]" ...>
 *         <a onclick="...jsfcljs(...{'componentId':'componentId','frontEndIdTurma':'HASH'}...)">
 *           NOME DA DISCIPLINA
 *         </a>
 *       </form>
 *     </td>
 *     <td class="info" style="text-align:left">S 204</td>      ← Local
 *     <td class="info"><center>6M12</center></td>              ← Horário
 *     <td></td>
 *   </tr>
 *   <tr>
 *     <td colspan="5" id="linha_174793" style="display:none;"></td>   ← idTurma
 *   </tr>
 */

import type { TurmaInfo } from '@/types';
import { decodeHorario } from '@/parsers/horario';

export function parseTurmas(html: string): TurmaInfo[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const forms = doc.querySelectorAll('form[id^="form_acessarTurmaVirtual"]');

  return [...forms].map(form => {
    const link = form.querySelector('a[onclick]');
    const onclick = link?.getAttribute('onclick') ?? '';

    // frontEndIdTurma: hash SHA-1 de 40 chars hexadecimais
    const feMatch = onclick.match(/'frontEndIdTurma':'([0-9A-Fa-f]{40})'/);
    const frontEndIdTurma = feMatch?.[1] ?? null;

    // componentId: chave do componente JSF no payload do POST
    // Padrão: {'formId:j_id_xxx':'formId:j_id_xxx','frontEndIdTurma':'...'}
    const compMatch = onclick.match(/'([^']+)':'[^']*','frontEndIdTurma'/);
    const componentId = compMatch?.[1] ?? null;

    // Nome da disciplina = texto do link
    const nome = link?.textContent?.trim() ?? '';

    // Local e Horário: os dois td.info na mesma linha do form
    const row = form.closest('tr');
    const infoCells = row ? [...row.querySelectorAll('td.info')] : [];
    const local = infoCells[0]?.textContent?.trim() || null;
    const horarioCodigo = infoCells[1]?.textContent?.trim() || null;

    // idTurma: extraído do td[id^="linha_"] na TR irmã imediata
    const nextRow = row?.nextElementSibling;
    const linhaEl = nextRow?.querySelector('[id^="linha_"]');
    const idTurma = linhaEl?.id?.replace('linha_', '') ?? null;

    return {
      nome,
      local,
      horarioCodigo,
      horarioDecodificado: horarioCodigo ? decodeHorario(horarioCodigo) : null,
      frontEndIdTurma,
      idTurma,
      formId: form.id,
      componentId,
    };
  });
}
