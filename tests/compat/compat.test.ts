import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/log', () => ({ log: { debugSync: () => {}, debug: async () => {} } }));

import { checkCompatibility, LAST_TESTED_VERSION, readVersion } from '@/selectors/version';

/** Fixtures guardam o innerHTML de #conteudo como string JSON. */
function loadFixture(name: string): string {
  const raw = readFileSync(resolvePath(__dirname, '../fixtures', name), 'utf-8');
  // Sem <script>/<link>: o happy-dom tentaria baixá-los (rede no teste)
  return (JSON.parse(raw) as string)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]*>/gi, '');
}

function mountPortal(rodapeVersion: string): void {
  document.body.innerHTML =
    `<div id="conteudo">${loadFixture('T-01-portal-aluno.json')}</div>` +
    `<div id="rodape">SIGAA | DTI | Copyright © 2006-2026 - UFRN - ${rodapeVersion}</div>`;
}

const LOGIN_HTML = `
  <div id="conteudo">
    <div class="logon"><form name="loginForm"><input name="user.login"></form></div>
    <table width="500"><tr><td><a href="#">Cadastre-se</a></td></tr></table>
  </div>`;

describe('checkCompatibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('portal: versão nova com a mesma estrutura continua ok (regressão cefet179…183)', () => {
    mountPortal('v4.99.0cefet999');
    const r = checkCompatibility('portal');
    expect(r.status).toBe('ok');
    expect(r.version).toBe('v4.99.0cefet999');
    expect(r.version).not.toBe(LAST_TESTED_VERSION);
  });

  it('portal: versão testada continua ok', () => {
    mountPortal(LAST_TESTED_VERSION);
    expect(checkCompatibility('portal').status).toBe('ok');
  });

  it('portal: estrutura mudou (sem #turmas-portal) → degraded e diz o que falta', () => {
    mountPortal('v4.99.0cefet999');
    document.getElementById('turmas-portal')?.remove();
    const r = checkCompatibility('portal');
    expect(r.status).toBe('degraded');
    expect(r.missing).toContain('turmas_portal');
  });

  it('login: estrutura presente → ok mesmo sem rodapé legível', () => {
    document.body.innerHTML = LOGIN_HTML;
    const r = checkCompatibility('login');
    expect(r.status).toBe('ok');
    expect(r.version).toBeNull();
  });

  it('login: card de login sumiu → degraded', () => {
    document.body.innerHTML = LOGIN_HTML;
    document.querySelector('.logon')?.remove();
    expect(checkCompatibility('login').status).toBe('degraded');
  });

  it('telas de relatório/turma (sem rodapé nem âncoras) → ok', () => {
    document.body.innerHTML = '<div id="relatorio-paisagem-container"></div>';
    expect(checkCompatibility('turma-notas').status).toBe('ok');
  });
});

describe('readVersion', () => {
  it.each([
    ['v4.17.0cefet182', 'v4.17.0cefet182'],
    ['v4.19.12cefet183', 'v4.19.12cefet183'],
    ['v5.0.0', 'v5.0.0'],
  ])('lê %s do rodapé', (raw, expected) => {
    document.body.innerHTML = `<div id="rodape">UFRN - vm-sig-app-08.infrati.cefetmg.br.inst08 - ${raw}</div>`;
    expect(readVersion()).toBe(expected);
  });

  it('sem rodapé → null', () => {
    document.body.innerHTML = '<div></div>';
    expect(readVersion()).toBeNull();
  });
});
