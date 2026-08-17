/**
 * Estado do tema claro/escuro — betterUI
 *
 * Independente do cache acadêmico (storage/cache.ts): a preferência de tema
 * não é "dado acadêmico" e não deve ser apagada no logout.
 */

import { log } from '@/lib/log';

const STORAGE_KEY = 'betterui_theme';
const DARK_CLASS = 'sc-theme-dark';

type ThemeValue = 'light' | 'dark';

function applyTheme(dark: boolean): void {
  document.body.classList.toggle(DARK_CLASS, dark);
}

/**
 * Lê a preferência salva; se não houver nenhuma ainda, usa a preferência
 * do sistema operacional (prefers-color-scheme) como ponto de partida.
 * Aplica a classe no <body> e retorna o estado resultante.
 */
export async function initTheme(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY] as ThemeValue | undefined;

    const dark = value
      ? value === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

    applyTheme(dark);
    return dark;
  } catch {
    // Fail-open: sem tema escuro se algo falhar, página continua legível.
    return false;
  }
}

/**
 * Alterna o tema, aplica imediatamente e persiste a escolha.
 * Retorna o novo estado (true = escuro).
 */
export async function toggleTheme(): Promise<boolean> {
  const dark = !document.body.classList.contains(DARK_CLASS);
  applyTheme(dark);
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: dark ? 'dark' : 'light' satisfies ThemeValue });
  } catch {
    log.debugSync('theme: falha ao salvar preferência (não crítico)');
  }
  return dark;
}
