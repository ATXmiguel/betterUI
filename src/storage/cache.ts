/**
 * Cache local — chrome.storage.local com TTL e versionamento.
 *
 * Princípio 6 do CLAUDE.md: dados acadêmicos só em chrome.storage.local,
 * com botão visível de "Apagar dados locais" e limpeza ao detectar logout.
 */

import { log } from '@/lib/log';
import type { ColecaoCompleta, CacheEntry } from '@/types';

const STORAGE_KEY = 'betterui_cache_v1';
const SCHEMA_VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export async function saveColecao(data: ColecaoCompleta): Promise<void> {
  const entry: CacheEntry<ColecaoCompleta> = {
    data,
    cachedAt: Date.now(),
    ttl: TTL_MS,
    schemaVersion: SCHEMA_VERSION,
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: entry });
  log.debugSync('cache: colecao salva — turmas:', data.turmas.length);
}

export async function loadColecao(): Promise<ColecaoCompleta | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const entry = result[STORAGE_KEY] as CacheEntry<ColecaoCompleta> | undefined;

    if (!entry) return null;

    // Invalidar por mudança de schema
    if (entry.schemaVersion !== SCHEMA_VERSION) {
      log.debugSync('cache: schema version mudou, invalidando');
      await clearColecao();
      return null;
    }

    // Invalidar por TTL expirado
    const age = Date.now() - entry.cachedAt;
    if (age > entry.ttl) {
      log.debugSync('cache: TTL expirado, invalidando');
      await clearColecao();
      return null;
    }

    log.debugSync('cache: colecao carregada — turmas:', entry.data.turmas.length);
    return entry.data;
  } catch {
    return null;
  }
}

export async function clearColecao(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
  log.debugSync('cache: colecao apagada');
}

/**
 * Detecta logout e limpa o cache se necessário.
 * Chamado no bootstrap de cada página.
 */
export async function clearOnLogout(): Promise<void> {
  try {
    const isLogin =
      document.querySelector('form[action*="logar.do"]') !== null ||
      document.querySelector('form[action*="login.jsf"]') !== null ||
      document.title.toLowerCase().includes('login');

    if (isLogin) {
      await clearColecao();
      log.debugSync('cache: apagado por logout detectado');
    }
  } catch {
    // Silencioso
  }
}

/**
 * Retorna há quanto tempo o cache foi atualizado, em texto legível.
 * Ex: "agora mesmo", "há 2 min", "há 3h"
 */
export function cacheAge(cachedAt: number): string {
  const diff = Date.now() - cachedAt;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return 'há mais de 24h';
}
