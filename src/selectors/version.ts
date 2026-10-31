/**
 * Compatibilidade com a página do SIGAA — checagem ESTRUTURAL, não de versão.
 *
 * Histórico: até 2026-10-31 a extensão comparava a versão do rodapé com uma
 * string fixa (`detected === HOMOLOGATED_VERSION`). O CEFET atualiza o SIGAA
 * quase todo mês (cefet179, 180, 181, 182, 4.19.12cefet183…) e em TODAS as
 * vezes o DOM continuou igual — só o número mudou —, mas a comparação exata
 * derrubava a extensão para o "modo degradado" a cada atualização.
 *
 * Agora a pergunta é "os elementos de que esta tela depende ainda existem?",
 * e não "a versão é exatamente X?". A versão vira só informação de log.
 * Se a estrutura falhar, a extensão fica TOTALMENTE desligada naquela tela
 * (página original intacta) em vez de meio aplicada — princípio nº 1.
 */

import { resolve, SEL, type SeletorSpec } from '@/selectors/map';
import { log } from '@/lib/log';
import type { SigaaRoute } from '@/content/router';

export type VersionStatus = 'ok' | 'degraded';

export interface CompatResult {
  status: VersionStatus;
  /** Versão lida do rodapé (ex: "v4.19.12cefet183"); null em telas sem rodapé */
  version: string | null;
  /** ids dos seletores obrigatórios que não resolveram */
  missing: string[];
}

/**
 * Última versão em que a extensão foi testada ao vivo. Só informativa:
 * uma versão diferente NÃO desliga nada — vale a checagem estrutural.
 */
export const LAST_TESTED_VERSION = 'v4.19.12cefet183';

/**
 * Âncoras estruturais por tela: o mínimo sem o qual o reskin daquela tela
 * faria mais mal do que bem. Cada recurso continua resolvendo seus próprios
 * seletores e se desligando sozinho se faltar algo (fail-open por recurso);
 * esta lista decide só entre "aplicar o reskin" e "deixar a página nativa".
 *
 * Telas da turma virtual e relatórios (Boletim, Notas) ficam sem âncoras:
 * lá o reskin é CSS + passos JS independentes, todos já protegidos.
 */
const REQUIRED: Record<SigaaRoute, SeletorSpec[]> = {
  login: [SEL.login_card, SEL.login_links_table],
  portal: [SEL.menu_dropdown, SEL.main_docente, SEL.turmas_portal],
  'turma-notas': [],
  'turma-frequencia': [],
  'turma-materiais': [],
  'turma-avisos': [],
  'turma-virtual': [],
  unknown: [],
};

/** Lê a versão no rodapé. NUNCA lança. */
export function readVersion(): string | null {
  try {
    const text = resolve(SEL.rodape)?.textContent ?? '';
    return text.match(/v\d+\.\d+\.\d+[a-z]*\d*/i)?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Verifica se a tela atual tem a estrutura que o reskin espera.
 * NUNCA lança — em qualquer erro inesperado devolve 'degraded'.
 */
export function checkCompatibility(route: SigaaRoute): CompatResult {
  const version = readVersion();
  try {
    const missing = REQUIRED[route]
      .filter(spec => resolve(spec) === null)
      .map(spec => spec.id);

    if (version && version !== LAST_TESTED_VERSION) {
      log.debugSync('compat: versão nova do SIGAA', version, '(testada:', LAST_TESTED_VERSION + ')');
    }

    if (missing.length > 0) {
      log.debugSync('compat: estrutura mudou em', route, '— faltando:', missing.join(', '));
      return { status: 'degraded', version, missing };
    }
    return { status: 'ok', version, missing };
  } catch {
    return { status: 'degraded', version, missing: ['erro inesperado'] };
  }
}
