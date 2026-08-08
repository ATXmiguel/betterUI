/**
 * Parser de frequência — função pura.
 *
 * Entrada: HTML string da página ava/FrequenciaAluno/mapa.jsf
 * Saída:   FrequenciaTurma com todos os registros e estatísticas
 *
 * Estrutura da tabela:
 *   table.listing
 *     thead > tr > th[Data], th[Situação]
 *     tbody > tr > td.first (data), td (situação)
 *   Texto fora da tabela: "Total de Faltas: N"
 */

import type { FrequenciaTurma, RegistroFrequencia, SituacaoFrequencia } from '@/types';

export function parseFrequencia(html: string): FrequenciaTurma | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table.listing');
  if (!table) return null;

  const rows = table.querySelectorAll('tbody tr');
  const registros: RegistroFrequencia[] = [];

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) continue;

    const dataStr = cells[0]?.textContent?.trim() ?? '';
    const situacaoRaw = cells[1]?.textContent?.trim() ?? '';

    if (!dataStr) continue;

    let situacao: SituacaoFrequencia = 'Presente';
    if (situacaoRaw.includes('Falta')) {
      situacao = 'Falta';
    } else if (situacaoRaw.includes('Não Registrada') || situacaoRaw.includes('Nao Registrada')) {
      situacao = 'Não Registrada';
    }

    registros.push({ data: dataStr, situacao });
  }

  // Total de faltas — texto fora da tabela: "<b>Total de Faltas:</b> 0"
  const bodyText = doc.body?.textContent ?? '';
  const faltasMatch = bodyText.match(/Total de Faltas:\s*(\d+)/);
  const totalFaltas = faltasMatch ? parseInt(faltasMatch[1], 10) : 0;

  // Excluir "Não Registrada" do cálculo — são aulas pendentes/futuras,
  // não representam ausência confirmada do aluno.
  const totalAulas = registros.length;
  const presentes = registros.filter(r => r.situacao === 'Presente').length;
  const aulasConcluidas = registros.filter(r => r.situacao !== 'Não Registrada').length;
  const percentualPresenca = aulasConcluidas > 0 ? (presentes / aulasConcluidas) * 100 : 100;

  return { registros, totalFaltas, totalAulas, percentualPresenca };
}
