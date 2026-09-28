/**
 * Bootstrap do content script — betterUI
 *
 * Ponto de entrada único. Tudo dentro de safe() para garantir fail-open.
 * Se qualquer coisa falhar aqui, a página do SIGAA continua 100% funcional.
 */

import '@/ui/styles.css';
import { safe } from '@/lib/safe';
import { initLog, log } from '@/lib/log';
import { detectRoute } from '@/content/router';
import { checkVersion } from '@/selectors/version';
import { resolve, SEL } from '@/selectors/map';
import { applyReskin, removeReskin } from '@/ui/reskin';
import { mountToggle } from '@/ui/toggle';
import { mountDashboard, unmountDashboard } from '@/ui/Dashboard';
import { initTheme } from '@/ui/theme';
import { clearOnLogout } from '@/storage/cache';
import { parseTurmas } from '@/parsers/turmas';
import type { TurmaInfo } from '@/types';
import type { SigaaRoute } from '@/content/router';

safe(async () => {
  await initLog();
  log.debug('betterUI bootstrap — url:', location.href);

  // Limpar cache se detectar logout
  await clearOnLogout();

  // Aplicar tema salvo (ou preferência do sistema) antes do resto, para
  // evitar flash de tema claro em quem já escolheu o escuro.
  await initTheme();

  let currentRoute = detectRoute();
  log.debug('rota detectada:', currentRoute);

  // Não fazer nada em páginas não mapeadas
  if (currentRoute === 'unknown') {
    log.debug('rota desconhecida — extensão inativa nesta página');
    return;
  }

  // Ler estado de ativação (padrão: true)
  const stored = await chrome.storage.local.get('betterui_enabled');
  let enabled = stored['betterui_enabled'] !== false;

  // Verificar versão do SIGAA
  const versionStatus = checkVersion();
  log.debug('versão do SIGAA:', versionStatus);

  let dashboardMounted = false;

  function tryMountDashboard(): void {
    if (currentRoute !== 'portal' || versionStatus !== 'ok') return;
    const matricula = readMatricula();
    if (!matricula) {
      log.debugSync('dashboard: matrícula não encontrada');
      return;
    }
    // Inserir dentro de #main-docente (abaixo da nav bar),
    // não antes de #portal-docente (que colocaria o dashboard acima da nav).
    const container =
      (document.getElementById('main-docente') as Element | null) ??
      resolve(SEL.conteudo);
    if (!container) {
      log.debugSync('dashboard: container não encontrado');
      return;
    }
    mountDashboard(container, matricula, readNomeAluno(), readTurmasDom());
    dashboardMounted = true;
    log.debugSync('dashboard: montado');
  }

  // Toggle: sempre montado, mesmo se a extensão estiver desativa,
  // para que o usuário possa reativar
  mountToggle(enabled, versionStatus, (newState: boolean) => {
    enabled = newState;
    if (newState) {
      applyReskin(currentRoute, versionStatus);
      if (!dashboardMounted) tryMountDashboard();
    } else {
      removeReskin();
      unmountDashboard();
      dashboardMounted = false;
    }
    chrome.storage.local.set({ betterui_enabled: newState }).catch(() => {});
  });

  if (enabled) {
    applyReskin(currentRoute, versionStatus);
    tryMountDashboard();
  }

  // O SIGAA (JSF/RichFaces) reescreve partes do DOM via postback AJAX sem
  // recarregar a página (ex: navegação portal <-> turma virtual, refresh do
  // carrossel de atualizações) — o content script não roda de novo nesses
  // casos, então o reskin e o dashboard somem silenciosamente do DOM
  // reescrito. Reconciliamos sob demanda em vez de reaplicar sempre, para
  // não perder estado (ex: coleta em andamento) a cada mutação irrelevante.
  watchForAjaxRerender();

  log.debug('bootstrap concluído');

  function reskinLooksIntact(r: SigaaRoute): boolean {
    if (!document.body.classList.contains('sc-reskin-active')) return false;
    if (r === 'portal') {
      const turmas = resolve(SEL.turmas_portal);
      return !turmas || turmas.classList.contains('sc-hidden');
    }
    if (r !== 'login') {
      const acoes = resolve(SEL.acoes_turma);
      return !acoes || acoes.classList.contains('sc-hidden');
    }
    return true;
  }

  function reconcile(): void {
    if (!enabled) return;
    const newRoute = detectRoute();
    if (newRoute === 'unknown') return;

    const routeChanged = newRoute !== currentRoute;
    const dashboardGone =
      newRoute === 'portal' &&
      dashboardMounted &&
      !document.getElementById('betterui-dashboard-host');
    const reskinReverted = !reskinLooksIntact(newRoute);

    if (!routeChanged && !dashboardGone && !reskinReverted) return;

    log.debugSync(
      'reconcile: DOM reescrito via AJAX pelo SIGAA — reaplicando',
      'rota:', currentRoute, '→', newRoute,
      'dashboardGone:', dashboardGone, 'reskinReverted:', reskinReverted,
    );

    if (routeChanged || dashboardGone) {
      unmountDashboard();
      dashboardMounted = false;
    }
    removeReskin();
    currentRoute = newRoute;
    applyReskin(currentRoute, versionStatus);
    if (currentRoute === 'portal' && !dashboardMounted) tryMountDashboard();
  }

  function watchForAjaxRerender(): void {
    // Throttle (não debounce puro): uma rajada de mutações do SIGAA (ex:
    // cards de turma populando um a um via AJAX) reinicia um debounce a
    // cada mutação — reconcile() só rodaria quando a rajada parasse, o que
    // podia levar segundos. Nesse intervalo o DOM reescrito fica sem as
    // classes sc-reskin-active/sc-theme-dark reaplicadas: fundo/cores
    // nativos claros aparecem por cima do tema escuro (flash visível,
    // "ilhas claras" na interface). Com throttle, reconcile roda no máximo
    // a cada RECONCILE_THROTTLE_MS mesmo durante uma rajada contínua.
    const RECONCILE_THROTTLE_MS = 300;
    let lastRun = 0;
    let trailingTimer: ReturnType<typeof setTimeout> | null = null;

    const runReconcile = (): void => {
      lastRun = Date.now();
      safe(() => reconcile());
    };

    const scheduleReconcile = (): void => {
      try {
        const elapsed = Date.now() - lastRun;
        if (elapsed >= RECONCILE_THROTTLE_MS) {
          runReconcile();
          return;
        }
        if (trailingTimer) return;
        trailingTimer = setTimeout(() => {
          trailingTimer = null;
          runReconcile();
        }, RECONCILE_THROTTLE_MS - elapsed);
      } catch {
        // Silencioso — fail-open
      }
    };

    try {
      const target = document.getElementById('conteudo') ?? document.body;
      const observer = new MutationObserver(scheduleReconcile);
      observer.observe(target, { childList: true, subtree: true });
    } catch {
      // Silencioso — sem observer, reskin pode ficar desatualizado após
      // AJAX, mas a página original continua 100% funcional (fail-open).
    }

    try {
      const jsfGlobal = (window as unknown as {
        jsf?: { ajax?: { addOnEvent?: (cb: (data: { status: string }) => void) => void } };
      }).jsf;
      if (jsfGlobal?.ajax?.addOnEvent) {
        jsfGlobal.ajax.addOnEvent(data => {
          if (data.status === 'success') scheduleReconcile();
        });
        log.debugSync('watchForAjaxRerender: hook jsf.ajax registrado');
      }
    } catch {
      // Silencioso — hook opcional, o MutationObserver já cobre o essencial
    }
  }
});

/**
 * Extrai a lista de turmas do DOM do portal sem nenhum fetch,
 * para exibir os cards imediatamente ao carregar a página.
 */
function readTurmasDom(): TurmaInfo[] {
  try {
    return parseTurmas(document.documentElement.outerHTML);
  } catch {
    return [];
  }
}

/**
 * Lê o nome do aluno já visível no portal, para saudação instantânea
 * antes da primeira coleta (que só roda sob comando do usuário).
 */
function readNomeAluno(): string | null {
  try {
    const el = resolve(SEL.nome_aluno);
    const nome = el?.textContent?.trim();
    return nome && nome.length > 0 ? nome : null;
  } catch {
    return null;
  }
}

/**
 * Lê a matrícula do aluno a partir do DOM do portal.
 * Procura td com texto "Matrícula:" e retorna o conteúdo do td seguinte.
 */
function readMatricula(): string | null {
  try {
    // O seletor retorna todos os td do perfil lateral — iteramos para achar "Matrícula:"
    const candidates = [
      ...document.querySelectorAll('#agenda-docente td'),
      ...document.querySelectorAll('#painel-usuario td'),
      ...document.querySelectorAll('#conteudo td'),
    ];

    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i]?.textContent?.trim() === 'Matrícula:') {
        const value = candidates[i + 1]?.textContent?.trim();
        if (value && value.length > 0) return value;
      }
    }
  } catch {
    // Silencioso
  }
  return null;
}
