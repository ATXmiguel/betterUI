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
import { clearOnLogout } from '@/storage/cache';

safe(async () => {
  await initLog();
  log.debug('betterUI bootstrap — url:', location.href);

  // Limpar cache se detectar logout
  await clearOnLogout();

  const route = detectRoute();
  log.debug('rota detectada:', route);

  // Não fazer nada em páginas não mapeadas
  if (route === 'unknown') {
    log.debug('rota desconhecida — extensão inativa nesta página');
    return;
  }

  // Ler estado de ativação (padrão: true)
  const stored = await chrome.storage.local.get('betterui_enabled');
  const enabled = stored['betterui_enabled'] !== false;

  // Verificar versão do SIGAA
  const versionStatus = checkVersion();
  log.debug('versão do SIGAA:', versionStatus);

  let dashboardMounted = false;

  function tryMountDashboard(): void {
    if (route !== 'portal' || versionStatus !== 'ok') return;
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
    mountDashboard(container, matricula, readNomeAluno());
    dashboardMounted = true;
    log.debugSync('dashboard: montado');
  }

  // Toggle: sempre montado, mesmo se a extensão estiver desativa,
  // para que o usuário possa reativar
  mountToggle(enabled, versionStatus, (newState: boolean) => {
    if (newState) {
      applyReskin(route, versionStatus);
      if (!dashboardMounted) tryMountDashboard();
    } else {
      removeReskin();
      unmountDashboard();
      dashboardMounted = false;
    }
    chrome.storage.local.set({ betterui_enabled: newState }).catch(() => {});
  });

  if (enabled) {
    applyReskin(route, versionStatus);
    tryMountDashboard();
  }

  log.debug('bootstrap concluído');
});

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
