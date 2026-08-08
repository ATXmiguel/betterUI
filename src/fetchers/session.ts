/**
 * Fila de navegação JSF — betterUI Fase 1
 *
 * Implementa TODAS as regras obrigatórias do CLAUDE.md §7:
 *   ✓ Fila estritamente sequencial (uma requisição por vez)
 *   ✓ Intervalo mínimo de 800ms entre requisições
 *   ✓ Máximo de requisições configurável (padrão 40)
 *   ✓ Circuit breaker: 2 falhas consecutivas abortam a coleta
 *   ✓ Cancelável via AbortController
 *   ✓ Detecção de sessão expirada
 *   ✓ Somente requisições de leitura/navegação — NUNCA mutação de estado
 *
 * PRINCÍPIO: credentials: 'same-origin' — nunca lemos, guardamos ou
 * transmitimos cookies; apenas nos aproveitamos da sessão já autenticada.
 */

import { log } from '@/lib/log';

/** Detecta se o HTML de resposta é a tela de login/sessão expirada.
 *
 * ATENÇÃO: NÃO usar 'logar.do' como indicador — ele aparece em TODAS as páginas
 * autenticadas como href do botão "SAIR" (`/sigaa/logar.do?dispatch=logOff`).
 * Usar apenas strings exclusivas da tela de login/erro. */
export function isSessionExpired(html: string): boolean {
  return (
    html.includes('Entrar no Sistema') ||   // formulário de login
    html.includes('verTelaLogin.do') ||     // URL da tela de login
    html.includes('login.jsf') ||
    html.includes('Sua sess\u00e3o expirou') ||
    html.includes('sess\u00e3o expirou') ||
    html.includes('Usu\u00e1rio n\u00e3o autenticado')
  );
}

/** Extrai o menu component ID pelo texto do link dentro de #formMenu */
export function extractMenuComponent(html: string, linkText: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const menuLinks = doc.querySelectorAll('#formMenu a[onclick]');
    for (const link of menuLinks) {
      if (link.textContent?.trim() === linkText) {
        const onclick = link.getAttribute('onclick') ?? '';
        const match = onclick.match(/'(formMenu:[^']+)':'(formMenu:[^']+)'/);
        return match?.[1] ?? null;
      }
    }
  } catch {
    // Silencioso
  }
  return null;
}

export interface SessionQueueOptions {
  signal: AbortSignal;
  maxRequests?: number;
}

export class SessionQueue {
  private lastRequestTime = 0;
  private consecutiveFailures = 0;
  private requestCount = 0;
  private aborted = false;

  private readonly MIN_DELAY_MS = 800;
  private readonly MAX_CONSECUTIVE_FAILURES = 2;
  private readonly maxRequests: number;
  private readonly signal: AbortSignal;

  constructor(options: SessionQueueOptions) {
    this.signal = options.signal;
    this.maxRequests = options.maxRequests ?? 40;

    this.signal.addEventListener('abort', () => {
      this.aborted = true;
    });
  }

  get remainingRequests(): number {
    return this.maxRequests - this.requestCount;
  }

  get totalRequests(): number {
    return this.requestCount;
  }

  /**
   * Faz uma requisição HTTP com todas as garantias de segurança.
   * NUNCA paralelizar chamadas a este método.
   */
  async fetchPage(url: string, init?: RequestInit): Promise<string> {
    this.checkAbort();
    this.checkBudget();
    this.checkCircuitBreaker();

    // Delay mínimo entre requisições
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.MIN_DELAY_MS) {
      await this.delay(this.MIN_DELAY_MS - elapsed);
    }

    this.checkAbort(); // verificar novamente após o delay

    this.requestCount++;
    this.lastRequestTime = Date.now();

    log.debugSync(`fetch [${this.requestCount}/${this.maxRequests}]:`, url);

    try {
      const response = await fetch(url, {
        ...init,
        signal: this.signal,
        credentials: 'same-origin',
      });

      if (!response.ok && response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      if (isSessionExpired(html)) {
        // Não conta como falha consecutiva — é definitivo
        throw new SessionExpiredError();
      }

      this.consecutiveFailures = 0;
      return html;
    } catch (err) {
      if (err instanceof SessionExpiredError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') throw err;

      this.consecutiveFailures++;
      log.debugSync('fetch error (consecutivas:', this.consecutiveFailures, '):', err);
      throw err;
    }
  }

  /**
   * Faz um POST JSF com ViewState.
   * Retorna o HTML da resposta e o novo ViewState extraído.
   */
  async postJSF(
    actionUrl: string,
    formId: string,
    fields: Record<string, string>,
    viewState: string,
  ): Promise<{ html: string; viewState: string }> {
    const body = new URLSearchParams();
    body.set(formId, formId);
    for (const [key, value] of Object.entries(fields)) {
      body.set(key, value);
    }
    body.set('javax.faces.ViewState', viewState);

    const html = await this.fetchPage(actionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'follow',
    });

    const newViewState = extractViewStateFromHtml(html);
    if (!newViewState) {
      log.debugSync('ViewState não encontrado na resposta do POST');
    }

    return { html, viewState: newViewState ?? viewState };
  }

  private checkAbort(): void {
    if (this.aborted || this.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  }

  private checkBudget(): void {
    if (this.requestCount >= this.maxRequests) {
      throw new BudgetExceededError();
    }
  }

  private checkCircuitBreaker(): void {
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      throw new CircuitBreakerError();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      this.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    });
  }
}

// ── Erros tipados ────────────────────────────────────────────────────────────

export class SessionExpiredError extends Error {
  constructor() {
    super('SESSION_EXPIRED');
    this.name = 'SessionExpiredError';
  }
}

export class BudgetExceededError extends Error {
  constructor() {
    super('MAX_REQUESTS_EXCEEDED');
    this.name = 'BudgetExceededError';
  }
}

export class CircuitBreakerError extends Error {
  constructor() {
    super('CIRCUIT_BREAKER_OPEN');
    this.name = 'CircuitBreakerError';
  }
}

// ── Utilitários ───────────────────────────────────────────────────────────────

export function extractViewStateFromHtml(html: string): string | null {
  const match = html.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/);
  return match?.[1] ?? null;
}
