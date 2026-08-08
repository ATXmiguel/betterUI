/**
 * Parser de avisos/notícias — função pura.
 *
 * Entrada: HTML string do widget de notícias ou da página NoticiaTurma/listar.jsf
 * Saída:   Array de AvisoTurma
 *
 * Estrutura do widget lateral:
 *   data/hora \n título \n (Visualizar)
 */

import type { AvisoTurma } from '@/types';

const DATE_PATTERN = /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/;

export function parseAvisos(html: string): AvisoTurma[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const avisos: AvisoTurma[] = [];

  // Cada aviso tem um link "(Visualizar)" — usamos como âncora
  const vizLinks = [...doc.querySelectorAll('a')].filter(
    a => a.textContent?.trim() === '(Visualizar)',
  );

  for (const link of vizLinks) {
    const container =
      link.closest('td') ??
      link.closest('div') ??
      link.parentElement;

    if (!container) continue;

    const containerText = container.textContent ?? '';
    const dateMatch = containerText.match(DATE_PATTERN);
    if (!dateMatch) continue;

    const afterDate = containerText
      .substring(containerText.indexOf(dateMatch[1]) + dateMatch[1].length)
      .replace('(Visualizar)', '')
      .replace(/[\n\r]+/g, ' ')
      .trim()
      .replace(/^[\s—–\-]+/, '');

    if (afterDate) {
      avisos.push({ data: dateMatch[1], titulo: afterDate });
    }
  }

  // Fallback: tenta extrair por padrão de data sem links "(Visualizar)"
  if (avisos.length === 0) {
    const bodyText = doc.body?.innerHTML ?? '';
    const dateRegex = /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    const texts: string[] = [];

    while ((match = dateRegex.exec(bodyText)) !== null) {
      texts.push(match[1]);
      lastIndex = match.index + match[1].length;
    }

    if (texts.length === 0) return [];
  }

  return avisos;
}
