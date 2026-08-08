/**
 * Botão de toggle da extensão — vive em Shadow DOM (closed).
 *
 * Shadow DOM obrigatório: o CSS do RichFaces é global e agressivo.
 * Sem Shadow DOM, o estilo do SIGAA vazaria para o botão (e vice-versa).
 *
 * Posição fixa no canto inferior direito — fora do fluxo do documento SIGAA.
 * Acessível: role="switch", aria-pressed, focus-visible, prefers-reduced-motion.
 */

import type { VersionStatus } from '@/selectors/version';
import { log } from '@/lib/log';

let shadowHost: HTMLDivElement | null = null;

export function mountToggle(
  initialEnabled: boolean,
  versionStatus: VersionStatus,
  onToggle: (enabled: boolean) => void,
): void {
  // Evitar duplicação (ex: SPA navigation)
  document.getElementById('betterui-toggle-host')?.remove();

  shadowHost = document.createElement('div');
  shadowHost.id = 'betterui-toggle-host';
  // Posição fixa — não interfere no layout do SIGAA
  shadowHost.style.cssText = [
    'position: fixed',
    'bottom: 16px',
    'right: 16px',
    'z-index: 2147483647',
    'all: initial',
    'display: block',
  ].join('; ');

  document.body.appendChild(shadowHost);

  const shadow = shadowHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: 1.5px solid #dee2e6;
      border-radius: 8px;
      background: #ffffff;
      color: #212529;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: box-shadow 150ms ease, border-color 150ms ease, background 150ms ease;
      user-select: none;
      white-space: nowrap;
    }

    .btn:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-color: #adb5bd;
    }

    .btn:focus-visible {
      outline: 2px solid #1971c2;
      outline-offset: 2px;
    }

    .btn[aria-pressed="true"] {
      background: #d0ebff;
      border-color: #74c0fc;
      color: #1864ab;
    }

    .btn[aria-pressed="false"] {
      background: #f8f9fa;
      border-color: #dee2e6;
      color: #868e96;
    }

    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      background: #fff3bf;
      color: #e67700;
      line-height: 1.4;
    }

    @media (prefers-reduced-motion: reduce) {
      .btn {
        transition: none;
      }
    }

    @media (max-width: 480px) {
      .btn {
        padding: 6px 10px;
        font-size: 12px;
      }
    }
  `;
  shadow.appendChild(style);

  let enabled = initialEnabled;
  const showBadge = versionStatus !== 'ok';
  const badgeTitle =
    versionStatus === 'mismatch'
      ? 'Versão do SIGAA diferente da homologada — modo reduzido ativo'
      : 'Versão do SIGAA não reconhecida — modo reduzido ativo';

  function render(): void {
    // Limpa conteúdo anterior
    const existing = shadow.querySelector('.btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-pressed', String(enabled));
    btn.setAttribute(
      'aria-label',
      enabled
        ? 'betterUI ativo — clique para desativar'
        : 'betterUI inativo — clique para ativar',
    );
    btn.setAttribute('title', enabled ? 'Desativar betterUI' : 'Ativar betterUI');

    const icon = enabled ? '✓' : '✕';
    btn.appendChild(document.createTextNode(`betterUI ${icon}`));

    if (showBadge) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.title = badgeTitle;
      badge.textContent = '!';
      badge.setAttribute('aria-label', badgeTitle);
      btn.appendChild(badge);
    }

    btn.addEventListener('click', () => {
      enabled = !enabled;
      onToggle(enabled);
      render();
      log.debugSync('toggle:', enabled ? 'ativado' : 'desativado');
    });

    shadow.appendChild(btn);
  }

  render();
  log.debugSync('toggle montado — enabled:', initialEnabled, '— versionStatus:', versionStatus);
}

export function unmountToggle(): void {
  shadowHost?.remove();
  shadowHost = null;
}
