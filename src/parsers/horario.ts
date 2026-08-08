/**
 * Parser de código de horário — função pura.
 *
 * Converte o código de horário do SIGAA (ex: "6M12", "35M12", "2T3 5T34")
 * em uma estrutura decodificada legível.
 *
 * Formato: [dias][turno][aulas]
 *   dias:  2=Seg 3=Ter 4=Qua 5=Qui 6=Sex 7=Sáb
 *   turno: M=Manhã T=Tarde N=Noite
 *   aulas: 1-6 (posição dentro do turno)
 */

import type { HorarioDecodificado, BlocoHorario } from '@/types';

const DIA_NOMES: Record<number, string> = {
  2: 'Seg',
  3: 'Ter',
  4: 'Qua',
  5: 'Qui',
  6: 'Sex',
  7: 'Sáb',
};

const TURNO_NOMES: Record<string, string> = {
  M: 'Manhã',
  T: 'Tarde',
  N: 'Noite',
};

export function decodeHorario(codigo: string): HorarioDecodificado {
  const codigoOriginal = codigo.trim();
  if (!codigoOriginal) {
    return { codigoOriginal, blocos: [], resumo: '' };
  }

  // Divide por espaço para lidar com "2M12 4T12" (múltiplos blocos)
  const partes = codigoOriginal.split(/\s+/);
  const blocos: BlocoHorario[] = [];

  for (const parte of partes) {
    // Padrão: um ou mais dígitos de dia, depois M/T/N, depois dígitos de aulas
    const match = parte.match(/^(\d+)([MTN])(\d+)$/i);
    if (!match) continue;

    const [, diasStr, turnoChar, aulasStr] = match;
    const turno = turnoChar.toUpperCase() as 'M' | 'T' | 'N';
    const aulas = [...aulasStr].map(Number);

    // Cada dígito em diasStr é um dia separado (ex: "35" = Ter + Qui)
    for (const diaChar of diasStr) {
      const dia = parseInt(diaChar, 10);
      if (dia < 2 || dia > 7) continue;

      blocos.push({
        dia,
        diaNome: DIA_NOMES[dia] ?? `Dia${dia}`,
        turno,
        turnoNome: TURNO_NOMES[turno] ?? turno,
        aulas,
      });
    }
  }

  // Ordena por dia, depois pelo primeiro slot
  blocos.sort((a, b) => a.dia - b.dia || (a.aulas[0] ?? 0) - (b.aulas[0] ?? 0));

  const resumo = blocos
    .map(b => `${b.diaNome} ${b.turnoNome} ${b.aulas.join('-')}`)
    .join(' | ');

  return { codigoOriginal, blocos, resumo };
}
