/**
 * Route detection for SIGAA pages.
 *
 * All URL patterns derived from docs/MAPEAMENTO.md.
 * Order matters: specific patterns before the generic /ava/ catch-all.
 */

export type SigaaRoute =
  | 'login'
  | 'portal'
  | 'turma-notas'
  | 'turma-frequencia'
  | 'turma-materiais'
  | 'turma-avisos'
  | 'turma-virtual'
  | 'unknown';

const ROUTE_PATTERNS: Array<{ pattern: RegExp; route: SigaaRoute }> = [
  { pattern: /\/sigaa\/verTelaLogin\.do/,                 route: 'login' },
  { pattern: /\/sigaa\/portais\/discente\/discente\.jsf/, route: 'portal' },
  { pattern: /\/sigaa\/ava\/index\.jsf/,                  route: 'turma-notas' },
  { pattern: /\/sigaa\/ava\/FrequenciaAluno\/mapa\.jsf/,  route: 'turma-frequencia' },
  { pattern: /\/sigaa\/ava\/ArquivoTurma\/listar_discente\.jsf/, route: 'turma-materiais' },
  { pattern: /\/sigaa\/ava\/NoticiaTurma\/listar\.jsf/,   route: 'turma-avisos' },
  // Generic turma virtual: any /sigaa/ava/ page not matched above
  { pattern: /\/sigaa\/ava\//,                            route: 'turma-virtual' },
];

/**
 * DOM-based route refinement for when SIGAA serves turma virtual content
 * at the same discente.jsf URL as the portal (JSF postback — URL never changes).
 *
 * #barraEsquerda (YUI west pane) is present ONLY in turma virtual layouts.
 * Within turma virtual, we distinguish sub-pages by form/element IDs.
 *
 * Not pure — reads DOM. Only called when URL already matched 'portal'.
 */
function refineTurmaRoute(): SigaaRoute {
  // #barraEsquerda is exclusive to the 3-pane YUI layout of turma virtual
  if (!document.getElementById('barraEsquerda')) return 'portal';

  // Distinguish specific sub-pages by form IDs present in the DOM
  if (document.querySelector('[id*="formNotas"]'))          return 'turma-notas';
  if (document.querySelector('[id*="FrequenciaAluno"]'))    return 'turma-frequencia';
  if (document.querySelector('[id*="ArquivoTurma"]'))       return 'turma-materiais';
  if (document.querySelector('[id*="NoticiaTurma"]'))       return 'turma-avisos';
  return 'turma-virtual';
}

/** URL-based detection (pure, testable). Falls back to DOM for portal URL. */
export function detectRoute(url: string = location.href): SigaaRoute {
  for (const { pattern, route } of ROUTE_PATTERNS) {
    if (pattern.test(url)) {
      // Portal URL is reused by JSF for turma virtual — verify via DOM
      if (route === 'portal' && typeof document !== 'undefined') {
        return refineTurmaRoute();
      }
      return route;
    }
  }
  return 'unknown';
}
