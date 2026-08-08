/**
 * Aplicação e remoção do reskin no DOM do SIGAA.
 *
 * Regras:
 * - Apenas classes prefixadas com "sc-" são adicionadas ao DOM existente.
 * - Reordenação de DOM via insertBefore (o portal usa float, não flexbox,
 *   então CSS order não funciona).
 * - Toda operação é fail-open: se um elemento não existir, pula silenciosamente.
 * - removeReskin() reverte exatamente o que applyReskin() fez.
 */

import { resolve, resolveAll, SEL } from '@/selectors/map';
import { log } from '@/lib/log';
import type { VersionStatus } from '@/selectors/version';
import type { SigaaRoute } from '@/content/router';

// Registro de todas as mudanças para reversão limpa
const classesAdded: Array<{ el: Element; cls: string }> = [];
const domMoves: Array<{ node: Node; parent: Node; nextSibling: Node | null }> = [];
let creditHost: HTMLDivElement | null = null;

function addClass(el: Element | null, cls: string): void {
  if (!el) return;
  el.classList.add(cls);
  classesAdded.push({ el, cls });
}

function moveNodeBefore(node: Node, parent: Node, referenceNode: Node | null): void {
  const originalParent = node.parentNode;
  const originalNextSibling = node.nextSibling;
  if (!originalParent) return;

  // Salva posição original para reversão
  domMoves.push({ node, parent: originalParent, nextSibling: originalNextSibling });
  parent.insertBefore(node, referenceNode);
}

// Registro de overrides de estilo inline para reversão
const styleOverrides: Array<{
  el: HTMLElement;
  prop: string;
  before: string;
}> = [];

// Registro de elementos cujo innerHTML foi substituído por JS
const htmlRestores: HTMLElement[] = [];

// Registro de MutationObservers da sidebar esquerda (accordion watch)
const leftSidebarObservers: MutationObserver[] = [];

// Registro de event listeners adicionados ao DOM (para remoção em removeReskin)
const domListeners: Array<{ el: EventTarget; type: string; fn: EventListener }> = [];

// Corpos de widgets da barra direita ocultados via JS (sem !important — toggle nativo pode desfazer)
const hiddenWidgetBodies: HTMLElement[] = [];

function forceStyle(el: HTMLElement | null, prop: string, value: string): void {
  if (!el) return;
  styleOverrides.push({ el, prop, before: el.style.getPropertyValue(prop) });
  el.style.setProperty(prop, value, 'important');
}

/**
 * Percorre os ancestors de #conteudo até <body> e remove quaisquer
 * restrições de largura fixas (largura em px ou %) que impedem o
 * layout de ocupar 100% da viewport.
 */
function fixFullWidth(): void {
  try {
    const conteudo = document.getElementById('conteudo');
    if (!conteudo) return;

    let el: HTMLElement | null = conteudo;
    while (el && el !== document.body) {
      forceStyle(el, 'width', '100%');
      forceStyle(el, 'max-width', '100%');
      forceStyle(el, 'margin-left', '0');
      forceStyle(el, 'margin-right', '0');
      // Remove width/max-width attributes (tables com width="90%" etc.)
      if (el.hasAttribute('width')) {
        el.setAttribute('data-sc-orig-width', el.getAttribute('width') ?? '');
        el.removeAttribute('width');
      }
      el = el.parentElement;
    }
    // Body também pode ter margem automática
    forceStyle(document.body, 'margin-left', '0');
    forceStyle(document.body, 'margin-right', '0');
    forceStyle(document.body, 'max-width', '100%');
    log.debugSync('fixFullWidth: largura expandida para 100%');
  } catch {
    // Falha silenciosa
  }
}

// ── Submenu flutuante da barra de navegação (JSCookMenu) ──────────────────
//
// O nome de classe real usado pelo tema do CEFET-MG não está confirmado em
// docs/MAPEAMENTO.md (tela não mapeada). Em vez de adivinhar seletor CSS,
// observamos o DOM e identificamos o popup pelo estilo computado
// (position: absolute/fixed) — funciona independente do nome de classe.
// Sem isso, o popup pode ficar sem fundo opaco (texto ilegível, conteúdo
// da página vazando por cima) — quebra a navegação, o que viola o
// princípio nº1 (fail-open): o aluno tem que sempre conseguir clicar.

const navPopupObservers: MutationObserver[] = [];
const navPopupCleanups: Array<() => void> = [];

function relativeLuminance(rgbColor: string): number | null {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgbColor);
  if (!match) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Corrige texto claro demais na barra sempre-visível (fundo claro #C4D2EB).
 * A regra CSS `#menu-dropdown a { color: ... }` só alcança o próprio <a> —
 * se o texto estiver num <span>/<font> filho com cor própria (comum em
 * temas JSCookMenu), o CSS não chega lá. Aqui checamos a cor computada de
 * cada elemento e só forçamos onde o contraste está ruim (texto muito claro
 * sobre fundo claro = ilegível).
 */
function fixNavBarText(menuBar: Element): void {
  menuBar.querySelectorAll<HTMLElement>('*').forEach(el => {
    if (el.id.startsWith('betterui-')) return;
    const style = getComputedStyle(el);
    // Não mexer em texto dentro de um popup flutuante — isso é tratado à
    // parte por fixFloatingPopup (tem seu próprio fundo branco).
    if (style.position === 'absolute' || style.position === 'fixed') return;
    const luminance = relativeLuminance(style.color);
    // Navbar agora é clara (#C4D2EB): texto claro demais (luminance > 180,
    // próximo do branco) precisa ser forçado para azul escuro legível.
    if (luminance !== null && luminance > 180) {
      el.style.setProperty('color', '#004C84', 'important');
    }
  });
}

function fixFloatingPopup(el: HTMLElement): void {
  if (el.id.startsWith('betterui-')) return; // nunca tocar na nossa própria UI

  const pos = getComputedStyle(el).position;
  if (pos !== 'absolute' && pos !== 'fixed') return;

  // Sem trava de "já corrigido": o JSCookMenu reaproveita o mesmo elemento
  // de popup a cada abertura e reseta o style inline dele pra reposicionar
  // (top/left) — isso apaga o fundo/z-index que a gente aplicou da vez
  // anterior. Reaplicar sempre é barato (poucos elementos) e idempotente.
  el.style.setProperty('z-index', '2147483000', 'important');
  el.style.setProperty('background-color', '#ffffff', 'important');
  el.style.setProperty('box-shadow', '0 4px 20px rgba(0,0,0,0.15)', 'important');

  el.querySelectorAll<HTMLElement>('*').forEach(child => {
    if (child.id.startsWith('betterui-')) return;
    child.style.setProperty('background-color', 'transparent', 'important');

    // Só força a cor do texto se o valor atual for claro demais para o fundo
    // branco que acabamos de fixar (texto "invisível" é o sintoma real
    // reportado). Preserva cores semânticas (ex: contador vermelho) que já
    // têm contraste suficiente.
    const currentColor = getComputedStyle(child).color;
    const luminance = relativeLuminance(currentColor);
    if (luminance === null || luminance > 200) {
      child.style.setProperty('color', '#212529', 'important');
    }
  });

  // Indicação de hover por linha. Precisa ser JS: o fundo de cada célula
  // já é forçado por estilo inline !important acima, o que impede qualquer
  // regra :hover do CSS de vencer (inline !important sempre tem prioridade
  // maior que regra de folha de estilo, mesmo também !important).
  // Trava por linha (não pelo popup inteiro) só pra não duplicar listener
  // quando o mesmo elemento é reaproveitado entre aberturas.
  const rows = el.querySelectorAll<HTMLElement>('tr');
  const hoverTargets = rows.length > 0 ? rows : el.querySelectorAll<HTMLElement>('td, a');
  hoverTargets.forEach(row => {
    if (row.dataset['scHoverBound'] === 'true') return;
    row.dataset['scHoverBound'] = 'true';
    row.addEventListener('mouseenter', () => {
      row.style.setProperty('background-color', '#f1f3f5', 'important');
    });
    row.addEventListener('mouseleave', () => {
      row.style.setProperty('background-color', 'transparent', 'important');
    });
  });
}

function watchNavDropdown(): void {
  try {
    // JSCookMenu (ThemeOffice) usa visibility:hidden/visible para esconder e
    // mostrar os submenus — os divs.ThemeOfficeSubMenu estão no DOM desde o
    // carregamento da página, nunca são inseridos depois. Por isso um
    // MutationObserver de childList nunca dispararia.
    //
    // Estratégia correta:
    // 1. Aplicar fixFloatingPopup imediatamente em todos os popups existentes
    //    (define background e configura listeners de hover nas linhas).
    // 2. Reagir a mouseover/click na barra para reaplicar caso JSCookMenu
    //    reposicione o popup e resete o style inline (top/left).

    // 1. Fix inicial — cobre todos os submenus já no DOM
    document.querySelectorAll<HTMLElement>('.ThemeOfficeSubMenu').forEach(fixFloatingPopup);

    const menuBar = resolve(SEL.menu_dropdown);
    if (menuBar) {
      fixNavBarText(menuBar);

      // 2. Reaplicar após cada interação com a barra (debounce por frame).
      //    JSCookMenu escreve top/left no style do popup no mesmo evento
      //    mouseover. Nosso rAF roda depois, garantindo que não sobrescrevemos
      //    o posicionamento e que o background é aplicado após o reposicionamento.
      let rescanScheduled = false;
      const rescan = (): void => {
        if (rescanScheduled) return;
        rescanScheduled = true;
        requestAnimationFrame(() => {
          rescanScheduled = false;
          document.querySelectorAll<HTMLElement>('.ThemeOfficeSubMenu').forEach(fixFloatingPopup);
        });
      };
      menuBar.addEventListener('mouseover', rescan);
      menuBar.addEventListener('click', rescan);
      navPopupCleanups.push(() => {
        menuBar.removeEventListener('mouseover', rescan);
        menuBar.removeEventListener('click', rescan);
      });
    }

    log.debugSync('watchNavDropdown: scan inicial de popups concluído');
  } catch {
    // Falha silenciosa — menu continua funcional, só sem o retoque visual
  }
}

function unwatchNavDropdown(): void {
  navPopupObservers.length = 0;
  for (const cleanup of navPopupCleanups) cleanup();
  navPopupCleanups.length = 0;
}

// Registro de renomeações de texto de itens de menu (para reversão)
const menuTextRenames: Array<{ el: Element; before: string }> = [];

/**
 * Renomeia itens do menu de navegação por correspondência exata de texto.
 * Não altera o link/onclick — só o rótulo visível. Ex: "Emitir Boletim" →
 * "Visualizar Boletim" (o boletim é só leitura, nunca "emitido" pelo aluno).
 */
function renameMenuItem(from: string, to: string): void {
  try {
    const items = resolveAll(SEL.menu_item_texto);
    for (const el of items) {
      if (el.textContent?.trim() === from) {
        menuTextRenames.push({ el, before: el.textContent });
        el.textContent = to;
        log.debugSync('menu item renomeado:', from, '→', to);
      }
    }
  } catch {
    // Silencioso
  }
}

const DISCENTE_URL = 'https://sig.cefetmg.br/sigaa/portais/discente/discente.jsf';

/**
 * Torna o h1 "CEFET-MG - SIGAA" clicável em qualquer página do SIGAA,
 * navegando para o portal do discente. Substitui a função do botão "casinha"
 * que é ocultado junto com os demais botões de ação da turma virtual.
 */
function makeLogoClickable(): void {
  try {
    const h1 = resolve(SEL.logo_sigaa);
    if (!h1) return;

    const handler: EventListener = () => {
      window.location.href = DISCENTE_URL;
    };

    addClass(h1, 'sc-logo-link');
    h1.addEventListener('click', handler);
    domListeners.push({ el: h1, type: 'click', fn: handler });

    log.debugSync('makeLogoClickable: h1 configurado');
  } catch {
    // Silencioso
  }
}

/**
 * Crédito discreto da extensão, logo abaixo do rodapé original do SIGAA.
 * Vive em Shadow DOM (closed) — é conteúdo novo, não restilização do
 * existente, então a exceção da seção 4 do CLAUDE.md não se aplica aqui.
 */
function mountCredit(): void {
  try {
    const rodape = resolve(SEL.rodape);
    if (!rodape) return;

    creditHost = document.createElement('div');
    creditHost.id = 'betterui-credit-host';
    creditHost.style.cssText = 'all: initial; display: block;';
    rodape.insertAdjacentElement('afterend', creditHost);

    const shadow = creditHost.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      p {
        margin: 0;
        padding: 4px 16px 12px;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        font-size: 11px;
        color: #adb5bd;
        text-align: center;
      }
    `;
    shadow.appendChild(style);

    const p = document.createElement('p');
    p.textContent = 'Interface aprimorada por Miguel Barbosa Godinho — extensão betterUI (não-oficial)';
    shadow.appendChild(p);

    log.debugSync('crédito betterUI montado');
  } catch {
    // Silencioso
  }
}

function unmountCredit(): void {
  creditHost?.remove();
  creditHost = null;
}

export function applyReskin(route: SigaaRoute, version: VersionStatus): void {
  // Gate: ativa o CSS via classe no body
  document.body.classList.add('sc-reskin-active');
  classesAdded.push({ el: document.body, cls: 'sc-reskin-active' });

  log.debugSync('reskin aplicado — rota:', route, '— versão:', version);

  watchNavDropdown();
  makeLogoClickable();
  renameMenuItem('Emitir Boletim', 'Visualizar Boletim');
  mountCredit();

  // Esconder o link "Turma Virtual" / "Portal do Discente" acima do rodapé —
  // redundante: a navegação equivalente já existe no h1 clicável e no menu.
  const linkRodape = resolve(SEL.link_navegacao_rodape);
  if (linkRodape) {
    addClass(linkRodape, 'sc-hidden');
    log.debugSync('link_navegacao_rodape ocultado');
  }

  // fixFullWidth só no portal — as turmas virtuais usam YUI Layout Manager
  // com posicionamento em px calculado uma vez no carregamento.
  if (route === 'portal') {
    fixFullWidth();
  }

  if (version !== 'ok') {
    log.debugSync('modo degradado — reordenação de DOM desativada');
    return;
  }

  if (route === 'portal') {
    applyPortalReskin();
  } else if (
    route === 'turma-virtual' ||
    route === 'turma-notas' ||
    route === 'turma-frequencia' ||
    route === 'turma-materiais' ||
    route === 'turma-avisos'
  ) {
    applyTurmaVirtualReskin();
  }
}

function applyPortalReskin(): void {
  // 1. Esconder seção de notícias quando vazia
  //    (geralmente exibe "Não há notícias cadastradas")
  const noticias = resolve(SEL.noticias_portal);
  if (noticias) {
    const text = noticias.textContent ?? '';
    if (
      text.includes('Não há notícias cadastradas') ||
      text.trim().length === 0
    ) {
      addClass(noticias, 'sc-hidden');
      log.debugSync('noticias-portal escondido (vazio)');
    }
  }

  // 2. Ocultar #turmas-portal — substituído pelo dashboard de cards
  const turmas = resolve(SEL.turmas_portal);
  if (turmas) {
    addClass(turmas, 'sc-hidden');
    log.debugSync('turmas-portal ocultado (substituído pelo dashboard)');
  }

  // 3. Ocultar carrossel "Últimas Atualizações" — substituído pelo card de feed no dashboard
  //    O form continua no DOM (display:none via CSS) para que os links internos
  //    possam ser ativados por .click() ao navegar do card de atualizações.
  const formAtualizacoes = resolve(SEL.form_atualizacoes);
  if (formAtualizacoes) {
    addClass(formAtualizacoes, 'sc-hidden');
    log.debugSync('formAtualizacoesTurmas ocultado (substituído pelo feed)');
  }

  // 3. Esconder seções vazias sem ID estável (busca por texto do cabeçalho)
  hideEmptySectionByHeading('Comunidades Virtuais');
  hideEmptySectionByHeading('Minhas atividades');

  // 4. Estilizar código de horário nas células da tabela
  styleHorarioCodes();
}

/**
 * Encontra uma seção pela texto do cabeçalho e a esconde se estiver vazia
 * ou se não houver conteúdo relevante abaixo do título.
 */
function hideEmptySectionByHeading(headingText: string): void {
  try {
    const headers = document.querySelectorAll(
      '#conteudo h3, #conteudo h4, #conteudo td.tituloTabelaDiscente, #conteudo .tituloSecao'
    );
    for (const header of headers) {
      const text = header.textContent?.trim() ?? '';
      if (text.toLowerCase().includes(headingText.toLowerCase())) {
        const section =
          header.closest('fieldset') ??
          header.closest('.portlet') ??
          header.closest('div') ??
          header.parentElement;

        if (section && section.id !== 'conteudo') {
          addClass(section, 'sc-hidden');
          log.debugSync('seção escondida:', headingText);
        }
        break;
      }
    }
  } catch {
    // Falha silenciosa
  }
}

/**
 * Envolve os códigos de horário (ex: "6M12", "35M12") em um span
 * com a classe sc-horario-codigo para formatação monospace.
 */
function styleHorarioCodes(): void {
  try {
    // Coluna de horário = 3ª coluna (índice 2) nas linhas de turma
    const turmasTable = resolve(SEL.turmas_tabela);
    if (!turmasTable) return;

    const rows = (turmasTable as HTMLTableElement).rows;
    // row[0] é cabeçalho
    for (let i = 1; i < rows.length; i++) {
      const cell = rows[i]?.cells[2];
      if (!cell) continue;

      const horario = cell.textContent?.trim();
      if (horario && /^[\d]+[MTN][\d]+/.test(horario)) {
        // Preserva o texto mas envolve em span estilizado
        const span = document.createElement('span');
        span.className = 'sc-horario-codigo';
        span.textContent = horario;
        cell.textContent = '';
        cell.appendChild(span);
      }
    }
  } catch {
    // Falha silenciosa
  }
}

/**
 * Oculta o bloco de info do usuário no cabeçalho da turma virtual.
 *
 * #painelDadosUsuario (esquerda de #cabecalho) mostra nome, matrícula e
 * coordenação — informação redundante que ocupa espaço no cabeçalho.
 * Ocultamos via classe CSS (não innerHTML) para que recarregamentos
 * parciais JSF não restaurem o elemento silenciosamente.
 *
 * #nomeTurma (centro de #cabecalho) já exibe o código + nome da disciplina
 * no conteúdo original do SIGAA — mantemos intacto.
 */
function simplifyTurmaHeader(): void {
  // SIGAA has a !important rule on #painelDadosUsuario display; use forceStyle
  // (inline style with !important) instead of CSS class to guarantee the hide.
  forceStyle(document.getElementById('painelDadosUsuario') as HTMLElement, 'display', 'none');
}

/**
 * Calcula a altura disponível na sidebar esquerda e distribui entre
 * os cabeçalhos de seção (acordeão) e o conteúdo ativo.
 *
 * Chamado na inicialização e sempre que o acordeão alterna seção.
 * Usa forceStyle para registrar o override e permitir reversão limpa.
 */
function layoutLeftSidebar(): void {
  try {
    const sidebar = document.querySelector<HTMLElement>('#barraEsquerda');
    if (!sidebar) return;

    // Outer panelbar: classe rich-panelbar SEM rich-panelbar-interior.
    // As seções também têm a classe rich-panelbar — devemos ignorá-las aqui.
    const outerPanelbar = sidebar.querySelector<HTMLElement>(
      '.rich-panelbar:not(.rich-panelbar-interior)'
    );
    if (!outerPanelbar) return;

    // Conteúdo ativo: o único content-exterior com display != none
    const contentExterior = [...outerPanelbar.querySelectorAll<HTMLElement>(
      '.rich-panelbar-content-exterior'
    )].find(el => el.style.display !== 'none');
    if (!contentExterior) return;

    const sidebarHeight = sidebar.clientHeight;
    if (sidebarHeight === 0) return;

    // Altura de todos os cabeçalhos visíveis (uma por seção — ativos ou inativos)
    // rich-panelbar-header: header da seção inativa (display visível)
    // rich-panelbar-header-act: header da seção ativa (display visível)
    // Cada seção mostra exatamente UM dos dois — o outro está display:none
    const visibleHeaders = [...outerPanelbar.querySelectorAll<HTMLElement>(
      '.rich-panelbar-header, .rich-panelbar-header-act'
    )].filter(h => getComputedStyle(h).display !== 'none');

    let headersHeight = 0;
    visibleHeaders.forEach(h => { headersHeight += h.offsetHeight; });

    // Título "Menu Turma Virtual" no topo
    const titleCell = sidebar.querySelector<HTMLElement>('td[style*="painel_bg"]');
    const titleHeight = titleCell ? titleCell.offsetHeight : 0;

    // Também setar a altura do outer panelbar para o clientHeight da sidebar
    forceStyle(outerPanelbar, 'height', `${sidebarHeight}px`);

    const available = sidebarHeight - headersHeight - titleHeight - 8;
    const maxH = Math.max(80, available);

    // max-height em vez de height fixo: o conteúdo encolhe ao conteúdo real
    // (sem espaço em branco) e só aparece scroll se ultrapassar o limite.
    forceStyle(contentExterior, 'height', 'auto');
    forceStyle(contentExterior, 'max-height', `${maxH}px`);
    log.debugSync('layoutLeftSidebar: max-height =', String(maxH));

    // Liberar restrições de altura no interior da tabela RichFaces.
    // O layout manager do SIGAA fixa inline height em table/tr/td/a,
    // impedindo que itens com texto longo expandam para 2 linhas.
    // forceStyle usa setProperty(..., 'important') que bate qualquer inline style.
    contentExterior.querySelectorAll<HTMLElement>(
      'table, tbody, tr, td, a'
    ).forEach(el => {
      forceStyle(el, 'height', 'auto');
      forceStyle(el, 'overflow', 'visible');
    });
  } catch {
    // Silencioso
  }
}

/**
 * Observa mudanças de estilo nos content-exterior do acordeão.
 * Quando o SIGAA alterna a seção (display:none ↔ display:block),
 * recalcula a distribuição de altura.
 */
function watchLeftSidebarAccordion(): void {
  try {
    const sidebar = document.querySelector<HTMLElement>('#barraEsquerda');
    if (!sidebar) return;

    layoutLeftSidebar();

    const observer = new MutationObserver(() => {
      requestAnimationFrame(layoutLeftSidebar);
    });

    sidebar.querySelectorAll('.rich-panelbar-content-exterior').forEach(el => {
      observer.observe(el, { attributes: true, attributeFilter: ['style'] });
    });

    leftSidebarObservers.push(observer);
  } catch {
    // Silencioso
  }
}

/**
 * Inverte a ordem dos tópicos de aula na área central.
 * O SIGAA exibe do mais antigo ao mais recente — invertemos para
 * mostrar o conteúdo mais recente no topo.
 *
 * Estrutura real do DOM (confirmada via DevTools):
 *   SPAN#formAva:panelTopicosNaoSelecionados   ← grandparent (46 filhos)
 *     SPAN#formAva:j_id_...:N:aulas            ← wrapper de cada tópico (23 wrappers)
 *       div.topico-aula                        ← o tópico em si
 *     + 23 outros filhos não-tópico intercalados
 *
 * Portanto, não podemos usar :scope > .topico-aula no parentElement direto
 * (cada wrapper tem apenas 1 filho .topico-aula). Precisamos operar no
 * grandparent, reordenando os WRAPPERS que contêm tópicos.
 */
function reverseTopics(): void {
  try {
    const firstTopic = document.querySelector<HTMLElement>('.topico-aula');
    if (!firstTopic) return;

    // Subir dois níveis: .topico-aula → wrapper SPAN → grandparent
    const topicWrapper = firstTopic.parentElement;
    const grandparent = topicWrapper?.parentElement;
    if (!topicWrapper || !grandparent) return;

    // Filtrar apenas os filhos do grandparent que contêm um .topico-aula
    const topicWrappers = [...grandparent.children].filter(
      c => c.querySelector('.topico-aula')
    ) as HTMLElement[];

    if (topicWrappers.length < 2) return;

    // Salvar posições originais para reversão em removeReskin()
    topicWrappers.forEach(w => {
      domMoves.push({ node: w, parent: grandparent, nextSibling: w.nextSibling });
    });

    // Reinserção em ordem reversa:
    // - i=N-1: insere último wrapper antes do primeiro  → [..., N-1, 0, 1, ..., N-2]
    // - i=N-2: insere penúltimo antes do primeiro       → [..., N-2, N-1, 0, ..., N-3]
    // - i=0  : insertBefore(node, node) = no-op por spec
    // Resultado: [N-1, N-2, ..., 1, 0] = ordem invertida
    const firstWrapper = topicWrappers[0]!;
    for (let i = topicWrappers.length - 1; i >= 0; i--) {
      grandparent.insertBefore(topicWrappers[i]!, firstWrapper);
    }

    log.debugSync('reverseTopics: invertidos', String(topicWrappers.length), 'tópicos');
  } catch {
    // Silencioso — tópicos permanecem na ordem original
  }
}

/**
 * Melhoras de DOM específicas da turma virtual (ava/*.jsf).
 *
 * Regras:
 * - NÃO alterar height/padding em #cabecalho ou .ui-layout-pane —
 *   o YUI Layout Manager posiciona tudo com px calculados uma única vez.
 * - Apenas colapsar widgets vazios e limpar ruído visual.
 */
function applyTurmaVirtualReskin(): void {
  // Previne scroll do body neste layout YUI (todo scroll acontece dentro dos painéis).
  // Scoped para turma virtual — o portal precisa de scroll normal do body.
  addClass(document.body, 'sc-layout-yui');
  simplifyTurmaHeader();

  // Esconder os 5 botões de ação (Menu Discente, Imprimir, Paginados, Trocar Turma, Opções).
  // A função do "Menu Discente" (casinha) é transferida para o clique no h1 "CEFET-MG - SIGAA".
  const acoesTurma = resolve(SEL.acoes_turma);
  if (acoesTurma) {
    addClass(acoesTurma, 'sc-hidden');
    log.debugSync('formAcoesTurma ocultado');
  }

  watchLeftSidebarAccordion();
  reverseTopics();
  collapseEmptyRightWidgets();
  log.debugSync('applyTurmaVirtualReskin: concluído');
}

/**
 * Colapsa automaticamente os widgets da barra direita que só exibem
 * mensagens vazias ("Recurso não disponível", "Não há X cadastradas" etc.).
 *
 * O usuário pode re-expandir clicando no header (toggle nativo do SIGAA).
 * Aplica também a classe sc-widget-empty para estilo visual do header.
 */
function collapseEmptyRightWidgets(): void {
  try {
    // Padrões de mensagens de "widget vazio" do SIGAA — específicos o suficiente
    // para não colapsar widgets com conteúdo real.
    // REMOVIDO: 'nenhum' (muito amplo — colapsava widgets com conteúdo relevante)
    const EMPTY_PATTERNS = [
      'recurso não disponível',
      'não há notícias cadastradas',
      'nenhuma enquete disponível',
      'nenhuma enquete encontrada',
      'nenhuma avaliação disponível',
      'nenhuma avaliação cadastrada',
      'não há mensagens',
      'não há mensagens cadastradas',
      'não há atividades cadastradas',
    ];

    document.querySelectorAll<HTMLElement>('#barraDireita .rich-stglpanel, #barraDireita .blocoDireita').forEach(widget => {
      const body = widget.querySelector<HTMLElement>('.rich-stglpanel-body');
      if (!body) return;

      const text = (body.textContent ?? '').trim().toLowerCase();

      // Não colapsar se: texto vazio (pode ser conteúdo carregado por AJAX),
      // tem links/tabelas (conteúdo real), ou não corresponde a padrão de vazio
      if (text.length === 0) return;
      if (body.querySelector('table, ul, ol, a, img')) return;
      if (!EMPTY_PATTERNS.some(p => text.includes(p))) return;

      // Ocultar diretamente sem !important — o toggle nativo do SIGAA (onclick do header)
      // usa inline style para mostrar/ocultar, então pode sobrescrever nossa atribuição.
      // Não chamamos header.click() para evitar side-effects imprevisíveis do
      // SimpleTogglePanelManager (potencial recálculo de layout YUI).
      body.style.display = 'none';
      hiddenWidgetBodies.push(body);

      // Marca visualmente como vazio (CSS acinzenta o header)
      addClass(widget as Element, 'sc-widget-empty');
      log.debugSync('widget colapsado:', widget.querySelector('.rich-stglpanel-header, .headerBloco')?.textContent?.trim());
    });
  } catch {
    // Silencioso — widgets permanecem expandidos
  }
}

export function removeReskin(): void {
  unwatchNavDropdown();
  unmountCredit();

  // Remover event listeners adicionados ao DOM
  for (const { el, type, fn } of domListeners) {
    try { el.removeEventListener(type, fn); } catch { /* silencioso */ }
  }
  domListeners.length = 0;

  // Reverter renomeações de texto de itens de menu
  for (const { el, before } of menuTextRenames) {
    try { el.textContent = before; } catch { /* silencioso */ }
  }
  menuTextRenames.length = 0;

  // Desconectar observers da sidebar esquerda
  for (const obs of leftSidebarObservers) obs.disconnect();
  leftSidebarObservers.length = 0;

  // Restaurar corpos de widgets ocultos pela extensão
  for (const body of hiddenWidgetBodies) {
    try { body.style.display = ''; } catch { /* silencioso */ }
  }
  hiddenWidgetBodies.length = 0;

  // Restaurar innerHTML substituído por JS (cabeçalho simplificado, etc.)
  for (const el of htmlRestores) {
    try {
      const orig = el.getAttribute('data-sc-orig-html');
      if (orig !== null) {
        el.innerHTML = orig;
        el.removeAttribute('data-sc-orig-html');
      }
    } catch {
      // Silencioso
    }
  }
  htmlRestores.length = 0;

  // Reverter reordenações de DOM (em ordem reversa)
  for (const { node, parent, nextSibling } of [...domMoves].reverse()) {
    try {
      parent.insertBefore(node, nextSibling);
    } catch {
      // Elemento pode ter sido removido do DOM
    }
  }
  domMoves.length = 0;

  // Reverter overrides de estilo inline
  for (const { el, prop, before } of styleOverrides) {
    try {
      if (before) {
        el.style.setProperty(prop, before);
      } else {
        el.style.removeProperty(prop);
      }
    } catch {
      // Silencioso
    }
  }
  styleOverrides.length = 0;

  // Restaurar atributos width removidos
  try {
    document.querySelectorAll('[data-sc-orig-width]').forEach(el => {
      const orig = el.getAttribute('data-sc-orig-width');
      if (orig) el.setAttribute('width', orig);
      el.removeAttribute('data-sc-orig-width');
    });
  } catch {
    // Silencioso
  }

  // Remover classes sc- adicionadas
  for (const { el, cls } of classesAdded) {
    try {
      el.classList.remove(cls);
    } catch {
      // Elemento pode ter sido removido do DOM
    }
  }
  classesAdded.length = 0;

  log.debugSync('reskin removido');
}
