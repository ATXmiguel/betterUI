/**
 * ÚNICO arquivo com seletores CSS/XPath do DOM do SIGAA.
 *
 * Regra dura: nenhum outro arquivo pode conter uma string de seletor CSS.
 * Quando o SIGAA mudar, o conserto é aqui, em um só lugar.
 *
 * Seletores derivados de docs/MAPEAMENTO.md.
 * Versão homologada: v4.17.0cefet178
 */

export interface SeletorSpec {
  id: string;
  descricao: string;
  primario: string;
  fallbacks: string[];
  valida: (el: Element) => boolean;
}

export const SEL = {
  // ── Portal do aluno (discente.jsf) ───────────────────────────────────

  conteudo: {
    id: 'conteudo',
    descricao: 'Container geral do conteúdo abaixo do menu',
    primario: '#conteudo',
    fallbacks: ['div[id="conteudo"]'],
    valida: (el: Element) => el.children.length > 0,
  },

  noticias_portal: {
    id: 'noticias_portal',
    descricao: 'Seção de notícias institucionais (geralmente vazia)',
    primario: '#noticias-portal',
    fallbacks: ['div[id="noticias-portal"]'],
    valida: (_el: Element) => true,
  },

  turmas_portal: {
    id: 'turmas_portal',
    descricao: 'Seção com tabela de turmas do semestre',
    primario: '#turmas-portal',
    fallbacks: ['div[id="turmas-portal"]'],
    valida: (el: Element) => el.querySelector('table') !== null,
  },

  turmas_tabela: {
    id: 'turmas_tabela',
    descricao: 'Tabela de turmas dentro de #turmas-portal',
    primario: '#turmas-portal table',
    fallbacks: [],
    valida: (el: Element) => (el as HTMLTableElement).rows?.length > 5,
  },

  atualizacoes_turma: {
    id: 'atualizacoes_turma',
    descricao: 'Carrossel de últimas atualizações de turmas (AJAX, inutilizável)',
    primario: '#atualizacoes-turma',
    fallbacks: ['div[id="atualizacoes-turma"]'],
    valida: (_el: Element) => true,
  },

  form_atualizacoes: {
    id: 'form_atualizacoes',
    descricao: 'Form que envolve o carrossel de atualizações',
    primario: '#formAtualizacoesTurmas',
    fallbacks: ['form[id="formAtualizacoesTurmas"]'],
    valida: (_el: Element) => true,
  },

  forum_portal: {
    id: 'forum_portal',
    descricao: 'Seção do fórum do curso',
    primario: '#forum-portal',
    fallbacks: ['div[id="forum-portal"]'],
    valida: (_el: Element) => true,
  },

  painel_usuario: {
    id: 'painel_usuario',
    descricao: 'Bloco lateral com nome e dados do aluno',
    primario: '#painel-usuario',
    fallbacks: ['div[id="painel-usuario"]'],
    valida: (_el: Element) => true,
  },

  agenda_docente: {
    id: 'agenda_docente',
    descricao: 'Sidebar com dados do perfil (reusado do portal docente)',
    primario: '#agenda-docente',
    fallbacks: ['div[id="agenda-docente"]'],
    valida: (_el: Element) => true,
  },

  main_docente: {
    id: 'main_docente',
    descricao: 'Coluna principal do portal (reusada do portal docente)',
    primario: '#main-docente',
    fallbacks: ['div[id="main-docente"]'],
    valida: (_el: Element) => true,
  },

  rodape: {
    id: 'rodape',
    descricao: 'Rodapé com versão do sistema',
    primario: '#rodape',
    fallbacks: ['div[id="rodape"]', 'footer'],
    valida: (el: Element) => (el.textContent ?? '').length > 0,
  },

  menu_dropdown: {
    id: 'menu_dropdown',
    descricao: 'Barra de navegação principal (JSCookMenu) — Ensino, Pesquisa etc.',
    primario: '#menu-dropdown',
    fallbacks: ['div[id="menu-dropdown"]'],
    valida: (_el: Element) => true,
  },

  menu_item_texto: {
    id: 'menu_item_texto',
    descricao: 'Célula de texto de qualquer item do menu JSCookMenu (Ensino, Pesquisa etc.) — usar resolveAll + filtrar por textContent',
    primario: '.ThemeOfficeMenuItemText',
    fallbacks: [],
    valida: (_el: Element) => true,
  },

  acoes_turma: {
    id: 'acoes_turma',
    descricao: 'Form com os 5 botões de ação da turma virtual (Menu Discente, Imprimir, etc.)',
    primario: '#formAcoesTurma',
    fallbacks: ['form[id="formAcoesTurma"]'],
    valida: (_el: Element) => true,
  },

  logo_sigaa: {
    id: 'logo_sigaa',
    descricao: 'H1 "CEFET-MG - SIGAA" no cabeçalho — presente no portal e nas turmas virtuais',
    primario: '#info-sistema h1',
    fallbacks: ['#cabecalho h1', 'h1'],
    valida: (el: Element) => el.textContent?.includes('CEFET') ?? false,
  },

  // ── Turma virtual (genérico) ─────────────────────────────────────────

  form_menu_turma: {
    id: 'form_menu_turma',
    descricao: 'Menu de navegação da turma virtual',
    primario: '#formMenu',
    fallbacks: ['form[id="formMenu"]'],
    valida: (_el: Element) => true,
  },

  // ── Turma virtual: Notas (ava/index.jsf) ────────────────────────────

  tabela_notas: {
    id: 'tabela_notas',
    descricao: 'Tabela de notas — relatório com todos os alunos da turma',
    primario: '.tabelaRelatorio',
    fallbacks: ['table.tabelaRelatorio'],
    valida: (el: Element) => (el as HTMLTableElement).rows?.length > 1,
  },

  // ── Turma virtual: Frequência (ava/FrequenciaAluno/mapa.jsf) ────────

  tabela_frequencia: {
    id: 'tabela_frequencia',
    descricao: 'Tabela de frequência com datas e situação de cada aula',
    primario: 'table.listing',
    fallbacks: [],
    valida: (el: Element) => (el as HTMLTableElement).rows?.length > 1,
  },

  // ── Fase 1: navegação JSF e extração de dados ────────────────────────

  viewstate: {
    id: 'viewstate',
    descricao: 'Hidden input com javax.faces.ViewState (necessário para postbacks JSF)',
    primario: 'input[name="javax.faces.ViewState"]',
    fallbacks: ['#javax\\.faces\\.ViewState'],
    valida: (el: Element) => ((el as HTMLInputElement).value?.length ?? 0) > 0,
  },

  nome_aluno: {
    id: 'nome_aluno',
    descricao: 'Nome do aluno logado no portal',
    primario: 'span.nome b',
    fallbacks: ['span.nome small', '.info-docente .nome'],
    valida: (el: Element) => (el.textContent?.trim().length ?? 0) > 2,
  },

  link_navegacao_rodape: {
    id: 'link_navegacao_rodape',
    descricao: 'Div com link de alternância "Turma Virtual" / "Portal do Discente" logo acima do rodapé',
    primario: '#container > div:has(> a[href$="/ava/index.jsf"]), #container > div:has(> a[href*="verPortalDiscente"])',
    fallbacks: [],
    valida: (el: Element) => el.parentElement?.id === 'container' && el.nextElementSibling?.id === 'rodape',
  },

  matricula_label: {
    id: 'matricula_label',
    descricao: 'Célula "Matrícula:" na tabela do perfil lateral (próxima td contém o valor)',
    primario: '#agenda-docente td',
    fallbacks: ['#painel-usuario td', '#conteudo td'],
    valida: (_el: Element) => true,
  },
} satisfies Record<string, SeletorSpec>;

/**
 * Resolve um SeletorSpec: tenta primario, depois fallbacks em ordem.
 * Aceita o resultado somente se valida() passar.
 * Retorna null se nada passar — NUNCA lança.
 */
export function resolve(spec: SeletorSpec): Element | null {
  try {
    const candidates = [spec.primario, ...spec.fallbacks];
    for (const selector of candidates) {
      const el = document.querySelector(selector);
      if (el && spec.valida(el)) return el;
    }
  } catch {
    // Seletor inválido ou erro de DOM — falha silenciosa
  }
  return null;
}

/**
 * Resolve todos os elementos que correspondem a um SeletorSpec.
 * Retorna array vazio se nada passar — NUNCA lança.
 */
export function resolveAll(spec: SeletorSpec): Element[] {
  try {
    const candidates = [spec.primario, ...spec.fallbacks];
    for (const selector of candidates) {
      const els = [...document.querySelectorAll(selector)];
      const valid = els.filter(el => spec.valida(el));
      if (valid.length > 0) return valid;
    }
  } catch {
    // Silencioso
  }
  return [];
}
