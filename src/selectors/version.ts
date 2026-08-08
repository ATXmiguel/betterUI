/**
 * Detecção de versão do SIGAA.
 *
 * Lê a string de versão no rodapé (#rodape) e compara com a versão homologada.
 * Se a versão for diferente ou não encontrada, a extensão entra em modo degradado:
 * aplica apenas melhorias de tipografia (CSS puro), sem reordenação de DOM.
 */

import { resolve, SEL } from '@/selectors/map';
import { log } from '@/lib/log';

export type VersionStatus = 'ok' | 'mismatch' | 'unknown';

export const HOMOLOGATED_VERSION = 'v4.17.0cefet178';

/**
 * Lê a versão do SIGAA no rodapé e retorna o status.
 * NUNCA lança — retorna 'unknown' em qualquer falha.
 */
export function checkVersion(): VersionStatus {
  try {
    const rodape = resolve(SEL.rodape);
    if (!rodape) {
      log.debugSync('version check: #rodape não encontrado');
      return 'unknown';
    }

    const text = rodape.textContent ?? '';
    // Formato esperado: v4.17.0cefet178
    const match = text.match(/v\d+\.\d+\.\d+[a-z]*\d*/i);
    if (!match) {
      log.debugSync('version check: string de versão não encontrada no rodapé');
      return 'unknown';
    }

    const detected = match[0];
    log.debugSync('version check: versão detectada =', detected);

    return detected === HOMOLOGATED_VERSION ? 'ok' : 'mismatch';
  } catch {
    return 'unknown';
  }
}
