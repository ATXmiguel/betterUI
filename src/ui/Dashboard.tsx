/**
 * Dashboard — painel agregado da betterUI.
 *
 * Renderizado dentro de Shadow DOM (closed) para isolamento total
 * do CSS agressivo do RichFaces.
 *
 * Inspiração de layout: cards de disciplina estilo Moodle CEFET-MG.
 * Cada card tem uma barra de cor determinística por nome da disciplina.
 */

import { h, render } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { collectAll } from '@/fetchers/collect';
import { loadColecao, cacheAge } from '@/storage/cache';
import { parseAtualizacoes } from '@/parsers/atualizacoes';
import { resolveAll, SEL } from '@/selectors/map';
import type { ColecaoCompleta, NotasTurma, FrequenciaTurma, TurmaInfo, ProgressInfo, AtualizacaoItem } from '@/types';

// ── Utilitários ───────────────────────────────────────────────────────────────

const CARD_ACCENT_COLORS = ['#014D84', '#1971C2'];

function courseColor(index: number): string {
  return CARD_ACCENT_COLORS[index % CARD_ACCENT_COLORS.length];
}

function formatNota(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(1).replace('.', ',');
}

function presencaClass(pct: number): string {
  if (pct >= 85) return 'sc-presenca-ok';
  if (pct >= 75) return 'sc-presenca-warn';
  return 'sc-presenca-risk';
}

function FreqLimite({ frequencia }: { frequencia: FrequenciaTurma }) {
  if (frequencia.totalAulas === 0) return null;
  // Regra padrão: máx 25% de faltas (mín 75% de presença)
  const faltasPermitidas = Math.floor(frequencia.totalAulas * 0.25);
  const faltasRestantes = faltasPermitidas - frequencia.totalFaltas;

  if (faltasRestantes < 0) {
    return (
      <div class="sc-freq-limite sc-freq-limite-danger" title={`Limite: ${faltasPermitidas} faltas no total`}>
        Reprovado por falta — {Math.abs(faltasRestantes)} acima do limite
      </div>
    );
  }

  const cls = faltasRestantes <= 2 ? 'sc-freq-limite-warn' : 'sc-freq-limite-ok';
  return (
    <div class={`sc-freq-limite ${cls}`} title={`Limite: ${faltasPermitidas} faltas de ${frequencia.totalAulas} aulas`}>
      Pode faltar mais {faltasRestantes} vez{faltasRestantes !== 1 ? 'es' : ''}
    </div>
  );
}

// ── Navegação via carrossel de atualizações ───────────────────────────────────

/**
 * Clica no link JSF do carrossel correspondente ao idTurma, navegando para
 * a turma virtual com foco na atualização. O form permanece no DOM (só ocultado
 * por CSS), então jsfcljs consegue encontrá-lo e submeter normalmente.
 */
function navigateToAtualizacao(idTurma: string | null): void {
  if (!idTurma) return;
  for (const link of resolveAll(SEL.atualizacoes_links)) {
    if (link.getAttribute('onclick')?.includes(`'idTurma':'${idTurma}'`)) {
      (link as HTMLElement).click();
      return;
    }
  }
}

// ── Card de novidades das turmas ──────────────────────────────────────────────

const NOVIDADES_VISIVEIS = 4;

/** "28/10/2026" → "hoje" / "ontem" / "28/10" */
function relativeDate(d: string): string {
  const [dd, mm, yyyy] = d.split('/').map(Number);
  if (!dd || !mm || !yyyy) return d.slice(0, 5);
  const target = new Date(yyyy, mm - 1, dd).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((today - target) / 86_400_000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return d.slice(0, 5);
}

function splitTipo(tipo: string): [string, string] {
  const colonIdx = tipo.indexOf(':');
  if (colonIdx === -1) return [tipo, ''];
  return [tipo.slice(0, colonIdx).trim(), tipo.slice(colonIdx + 1).trim()];
}

function NovidadesCard({ items }: { items: AtualizacaoItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, NOVIDADES_VISIVEIS);

  return (
    <section class="sc-panel" aria-labelledby="sc-novidades-title">
      <header class="sc-panel-header">
        <h3 class="sc-panel-title" id="sc-novidades-title">Novidades nas turmas</h3>
        {items.length > 0 && <span class="sc-panel-count">{items.length}</span>}
      </header>

      {items.length === 0 ? (
        <p class="sc-panel-empty">
          Nenhuma novidade publicada pelos professores nos últimos dias.
        </p>
      ) : (
        <ul class="sc-feed-list">
          {visible.map((item, i) => {
            const [tipoLabel, tipoDesc] = splitTipo(item.tipo);
            return (
              <li key={i}>
                <button
                  class="sc-feed-item"
                  type="button"
                  onClick={() => navigateToAtualizacao(item.idTurma)}
                  title={`Abrir turma virtual de ${item.nomeTurma}`}
                >
                  <span class="sc-feed-date">{relativeDate(item.data)}</span>
                  <span class="sc-feed-content">
                    <span class="sc-feed-turma">{item.nomeTurma}</span>
                    <span class="sc-feed-tipo">
                      {tipoLabel && <span class="sc-feed-tipo-label">{tipoLabel}</span>}
                      {tipoDesc && <span class="sc-feed-tipo-desc">{`: ${tipoDesc}`}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > NOVIDADES_VISIVEIS && (
        <button
          class="sc-link-btn"
          type="button"
          onClick={() => setShowAll(s => !s)}
          aria-expanded={showAll}
        >
          {showAll ? 'Mostrar menos' : `Ver todas as ${items.length} novidades`}
        </button>
      )}
    </section>
  );
}

// ── Aulas do dia (derivadas do código de horário — sem fetch) ─────────────────

const DIA_NOME_LONGO: Record<number, string> = {
  2: 'segunda-feira',
  3: 'terça-feira',
  4: 'quarta-feira',
  5: 'quinta-feira',
  6: 'sexta-feira',
  7: 'sábado',
};

const TURNO_ORDEM: Record<string, number> = { M: 0, T: 1, N: 2 };

interface AulaDoDia {
  turma: TurmaInfo;
  turno: 'M' | 'T' | 'N';
  turnoNome: string;
  aulas: number[];
}

/** Dia do SIGAA (2=Seg … 7=Sáb) a partir de Date.getDay() (0=Dom … 6=Sáb). */
function sigaaDia(date: Date): number {
  return date.getDay() + 1;
}

function aulasDoDia(turmas: TurmaInfo[], dia: number): AulaDoDia[] {
  const aulas: AulaDoDia[] = [];
  for (const turma of turmas) {
    for (const b of turma.horarioDecodificado?.blocos ?? []) {
      if (b.dia === dia) {
        aulas.push({ turma, turno: b.turno, turnoNome: b.turnoNome, aulas: b.aulas });
      }
    }
  }
  return aulas.sort(
    (a, b) =>
      TURNO_ORDEM[a.turno] - TURNO_ORDEM[b.turno] || (a.aulas[0] ?? 0) - (b.aulas[0] ?? 0),
  );
}

/**
 * Hoje, se houver aula; senão o próximo dia com aula (fim de semana,
 * feriado de horário vazio). Retorna null se nenhuma turma tem horário.
 */
function proximoDiaComAula(turmas: TurmaInfo[]): { dia: number; hoje: boolean; aulas: AulaDoDia[] } | null {
  const hoje = sigaaDia(new Date());
  for (let offset = 0; offset < 7; offset++) {
    const dia = ((hoje - 1 + offset) % 7) + 1;
    const aulas = aulasDoDia(turmas, dia);
    if (aulas.length > 0) return { dia, hoje: offset === 0, aulas };
  }
  return null;
}

function formatAulas(aulas: number[]): string {
  if (aulas.length === 0) return '';
  const label = aulas.length === 1 ? 'aula' : 'aulas';
  return `${label} ${aulas.length > 1 ? `${aulas[0]}–${aulas[aulas.length - 1]}` : aulas[0]}`;
}

function AulasCard({ turmas }: { turmas: TurmaInfo[] }) {
  const proximo = proximoDiaComAula(turmas);

  const title = !proximo
    ? 'Aulas'
    : proximo.hoje
      ? 'Aulas de hoje'
      : `Próximas aulas — ${DIA_NOME_LONGO[proximo.dia] ?? ''}`;

  return (
    <section class="sc-panel" aria-labelledby="sc-aulas-title">
      <header class="sc-panel-header">
        <h3 class="sc-panel-title" id="sc-aulas-title">{title}</h3>
      </header>

      {!proximo ? (
        <p class="sc-panel-empty">
          Seu horário ainda não foi publicado no SIGAA.
        </p>
      ) : (
        <ol class="sc-aulas-list">
          {proximo.aulas.map((a, i) => (
            <li key={i}>
              <button
                class="sc-aula"
                type="button"
                onClick={() => navigateToTurmaVirtual(a.turma)}
                disabled={!a.turma.frontEndIdTurma}
                title={`Abrir turma virtual de ${a.turma.nome}`}
              >
                <span class="sc-aula-slot">
                  <span class="sc-aula-turno">{a.turnoNome}</span>
                  <span class="sc-aula-num">{formatAulas(a.aulas)}</span>
                </span>
                <span class="sc-aula-nome">{a.turma.nome}</span>
                {a.turma.local && <span class="sc-aula-local">{a.turma.local}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ── Atalhos para telas do SIGAA (navegação delegada ao menu nativo) ───────────

interface AtalhoSpec {
  label: string;
  descricao: string;
  /** Textos possíveis do item no menu nativo (prefixo), em ordem de preferência */
  menu: string[];
}

const ATALHOS: AtalhoSpec[] = [
  { label: 'Boletim', descricao: 'Notas e faltas de todas as matérias', menu: ['Visualizar Boletim', 'Emitir Boletim'] },
  { label: 'Comunicados', descricao: 'Avisos importantes da escola', menu: ['Comunicados Importantes'] },
  { label: 'Calendário', descricao: 'Datas de provas, férias e feriados', menu: ['Calendário Acadêmico'] },
  { label: 'Declaração de vínculo', descricao: 'Comprovante de que você estuda aqui', menu: ['Emitir Declaração de Vínculo'] },
  { label: 'Saldo do RU', descricao: 'Créditos do cartão do restaurante', menu: ['Saldo do Cartão do Restaurante'] },
  { label: 'Grade do curso', descricao: 'Matérias de todas as séries', menu: ['Consultar Estrutura Curricular'] },
];

function findMenuItem(prefixes: string[]): Element | null {
  const rows = resolveAll(SEL.menu_item_linha);
  for (const prefix of prefixes) {
    const row = rows.find(r => (r.textContent ?? '').trim().startsWith(prefix));
    if (row) return row;
  }
  return null;
}

/**
 * Aciona o item do JSCookMenu como se o usuário tivesse clicado nele:
 * o próprio SIGAA navega (cmItemMouseUp). Nenhuma requisição é forjada.
 */
function openMenuItem(row: Element): void {
  row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  row.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

function AtalhosCard() {
  const atalhos = ATALHOS.map(spec => {
    const row = findMenuItem(spec.menu);
    // Contador entre parênteses no menu nativo, ex: "Comunicados Importantes (26)"
    const count = row?.textContent?.match(/\((\d+)\)\s*$/)?.[1] ?? null;
    return { spec, row, count };
  }).filter(a => a.row !== null);

  if (atalhos.length === 0) return null;

  return (
    <section class="sc-atalhos" aria-label="Atalhos do SIGAA">
      {atalhos.map(({ spec, row, count }) => (
        <button
          class="sc-atalho"
          type="button"
          key={spec.label}
          onClick={() => row && openMenuItem(row)}
        >
          <span class="sc-atalho-label">
            {spec.label}
            {count && <span class="sc-atalho-count">{count}</span>}
          </span>
          <span class="sc-atalho-desc">{spec.descricao}</span>
        </button>
      ))}
    </section>
  );
}

// ── Navegação para turma virtual ──────────────────────────────────────────────

/**
 * Clica no link JSF do SIGAA correspondente à turma, navegando para a
 * turma virtual. Delega inteiramente ao mecanismo do SIGAA — sem POST forjado.
 */
function navigateToTurmaVirtual(turma: TurmaInfo): void {
  if (!turma.frontEndIdTurma) return;
  for (const link of resolveAll(SEL.turma_virtual_links)) {
    if (link.getAttribute('onclick')?.includes(turma.frontEndIdTurma)) {
      (link as HTMLElement).click();
      return;
    }
  }
}

/** Normaliza nome de disciplina para casar turma ↔ atualização sem idTurma. */
function normNome(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

function countNovidades(turma: TurmaInfo, items: AtualizacaoItem[]): number {
  const nome = normNome(turma.nome);
  return items.filter(it =>
    (turma.idTurma && it.idTurma === turma.idTurma) || normNome(it.nomeTurma) === nome,
  ).length;
}

// ── Componentes ───────────────────────────────────────────────────────────────

function CourseCard({
  turma,
  notas,
  frequencia,
  index,
  temAulaHoje,
  novidades,
}: {
  turma: TurmaInfo;
  notas: NotasTurma | undefined;
  frequencia: FrequenciaTurma | undefined;
  index: number;
  temAulaHoje: boolean;
  novidades: number;
}) {
  const color = courseColor(index);
  const schedule = turma.horarioDecodificado?.resumo ?? turma.horarioCodigo ?? '';
  const [expanded, setExpanded] = useState(false);

  const hasBimestresDetail = notas && notas.bimestres.some(b => b.avaliacoes.length > 0);

  return (
    <div class="sc-card">
      <div class="sc-card-accent" style={{ background: color }} aria-hidden="true" />
      <div class="sc-card-body">
        <button
          class={`sc-card-title${turma.frontEndIdTurma ? ' sc-card-title-link' : ''}`}
          type="button"
          title={turma.frontEndIdTurma ? `Abrir turma virtual de ${turma.nome}` : turma.nome}
          onClick={() => navigateToTurmaVirtual(turma)}
        >
          {turma.nome}
        </button>

        <div class="sc-card-meta">
          {temAulaHoje && <span class="sc-badge sc-badge-hoje">Aula hoje</span>}
          {novidades > 0 && (
            <span class="sc-badge sc-badge-novidade">
              {novidades} {novidades === 1 ? 'novidade' : 'novidades'}
            </span>
          )}
          {schedule && (
            <span class="sc-card-schedule" title="Horário">
              {schedule}
            </span>
          )}
          {turma.local && (
            <span class="sc-card-room" title="Sala">
              {turma.local}
            </span>
          )}
        </div>

        {notas && (
          <div class="sc-card-notas">
            <div class="sc-notas-bimestres">
              {notas.bimestres
                .filter(b => b.nota !== null)
                .map(b => (
                  <span class="sc-bimestre" key={b.nome} title={b.nome}>
                    <span class="sc-bimestre-label">
                      {b.nome.replace(/(\d)o\. Bimestre/, '$1B')}
                    </span>
                    <span class="sc-bimestre-nota">{formatNota(b.nota)}</span>
                  </span>
                ))}
            </div>

            {notas.resultado !== null && (
              <div class="sc-resultado">
                <span class="sc-resultado-label">Resultado</span>
                <span class="sc-resultado-valor">{formatNota(notas.resultado)}</span>
                {notas.situacao && notas.situacao !== '--' && (
                  <span
                    class={`sc-situacao ${
                      notas.situacao === 'APROVADO' ? 'sc-situacao-ok' : 'sc-situacao-risk'
                    }`}
                  >
                    {notas.situacao}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {frequencia && (
          <>
            <div class={`sc-card-freq ${presencaClass(frequencia.percentualPresenca)}`}>
              <span class="sc-freq-pct">
                {frequencia.percentualPresenca.toFixed(0)}% presença
              </span>
              <span class="sc-freq-faltas">
                {frequencia.totalFaltas} falta{frequencia.totalFaltas !== 1 ? 's' : ''}
              </span>
            </div>
            <FreqLimite frequencia={frequencia} />
          </>
        )}

        {hasBimestresDetail && (
          <>
            <button
              class="sc-expand-btn"
              type="button"
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded}
            >
              <span class={`sc-expand-icon${expanded ? ' sc-expanded' : ''}`}>▼</span>
              {expanded ? 'Ocultar atividades' : 'Ver atividades'}
            </button>

            {expanded && (
              <div class="sc-avaliacoes">
                {notas!.bimestres.map(b => {
                  if (b.avaliacoes.length === 0) return null;
                  return (
                    <div class="sc-aval-bimestre" key={b.nome}>
                      <div class="sc-aval-bimestre-nome">{b.nome}</div>
                      {b.avaliacoes.map(av => (
                        <div class="sc-aval-row" key={av.avalId}>
                          <span class="sc-aval-nome" title={av.denominacao ?? av.abreviacao}>
                            {av.denominacao ?? av.abreviacao}
                          </span>
                          <span class="sc-aval-nota">{formatNota(av.nota)}</span>
                          {av.notaMaxima !== null && (
                            <span class="sc-aval-max">/{av.notaMaxima % 1 === 0 ? av.notaMaxima.toFixed(0) : av.notaMaxima.toFixed(1)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {turma.frontEndIdTurma && (
          <button
            class="sc-card-open"
            type="button"
            onClick={() => navigateToTurmaVirtual(turma)}
            aria-label={`Abrir turma virtual de ${turma.nome}`}
          >
            Abrir turma virtual <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Convite à primeira coleta ─────────────────────────────────────────────────

/**
 * Convite inline (não flutuante — o antigo toast fixo cobria os botões
 * "Módulos"/"Alterar senha" do cabeçalho) sugerindo a coleta quando não há
 * dados. NÃO dispara fetch sozinho — só chama onUpdate() no clique explícito
 * (princípio 5 do CLAUDE.md).
 */
function ColetaConvite({
  onUpdate,
  onDismiss,
}: {
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  return (
    <section class="sc-convite" aria-labelledby="sc-convite-title">
      <div class="sc-convite-body">
        <h3 class="sc-convite-title" id="sc-convite-title">
          Veja notas e faltas de todas as matérias aqui
        </h3>
        <p class="sc-convite-sub">
          A extensão abre cada turma por você e junta tudo nesta tela. Leva
          cerca de 1 minuto e os dados ficam só neste computador.
        </p>
      </div>
      <div class="sc-convite-actions">
        <button class="sc-btn sc-btn-primary" type="button" onClick={onUpdate}>
          Buscar notas e faltas
        </button>
        <button class="sc-btn sc-btn-ghost" type="button" onClick={onDismiss}>
          Agora não
        </button>
      </div>
    </section>
  );
}

/** "Agora não" vale até fechar o navegador — preferência de UI, não dado acadêmico. */
const CONVITE_DISMISS_KEY = 'betterui_convite_dispensado';

function conviteDispensado(): boolean {
  try {
    return sessionStorage.getItem(CONVITE_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function dispensarConvite(): void {
  try {
    sessionStorage.setItem(CONVITE_DISMISS_KEY, '1');
  } catch {
    // Sem sessionStorage: o convite só some até o próximo carregamento
  }
}

function dataPorExtenso(date: Date): string {
  try {
    const s = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return '';
  }
}

function ProgressBar({ info }: { info: ProgressInfo; onCancel: () => void }) {
  const pct = info.total > 0 ? (info.completed / info.total) * 100 : 0;
  const phaseLabel = {
    navegando: 'Navegando',
    notas: 'Coletando notas',
    frequencia: 'Coletando frequência',
  }[info.phase];

  return (
    <div class="sc-progress-container" role="progressbar" aria-valuenow={info.completed} aria-valuemax={info.total} aria-label="Progresso da coleta">
      <div class="sc-progress-track">
        <div class="sc-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p class="sc-progress-text">
        {phaseLabel}: {info.currentCourseName}{' '}
        <span class="sc-progress-count">({info.completed}/{info.total})</span>
      </p>
    </div>
  );
}

const SCHEMA_VERSION_UI = 1;

function Dashboard({
  matricula,
  nomeAlunoInicial,
  turmasIniciais,
}: {
  matricula: string;
  nomeAlunoInicial: string | null;
  turmasIniciais: TurmaInfo[];
}) {
  const [data, setData] = useState<ColecaoCompleta | null>(null);
  const [atualizacoes, setAtualizacoes] = useState<AtualizacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Observa #atualizacoes-turma para quando o AJAX do SIGAA preencher o conteúdo
  useEffect(() => {
    const tryParse = (): AtualizacaoItem[] => {
      const el = document.getElementById('atualizacoes-turma');
      if (!el) return [];
      try { return parseAtualizacoes(el.outerHTML); } catch { return []; }
    };

    const initial = tryParse();
    if (initial.length > 0) {
      setAtualizacoes(initial);
      return;
    }

    const target = document.getElementById('atualizacoes-turma') ?? document.getElementById('formAtualizacoesTurmas');
    if (!target) return;

    const obs = new MutationObserver(() => {
      const items = tryParse();
      if (items.length > 0) {
        setAtualizacoes(items);
        obs.disconnect();
      }
    });
    obs.observe(target, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    loadColecao().then(cached => {
      if (cached) {
        setData(cached);
      } else if (turmasIniciais.length > 0) {
        // Mostra os cards imediatamente com estrutura mas sem dados
        setData({
          coletadoEm: 0,
          matricula,
          nomeAluno: nomeAlunoInicial ?? '',
          turmas: turmasIniciais,
          notas: {},
          frequencia: {},
          versaoSchema: SCHEMA_VERSION_UI,
        });
        // Sem cache válido: sugere a coleta, mas não a dispara sozinha —
        // o clique no botão continua sendo obrigatório.
        setShowUpdatePrompt(!conviteDispensado());
      }
    });
  }, []);

  const handleCollect = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setErrors([]);

    try {
      const result = await collectAll({
        matricula,
        signal: controller.signal,
        onProgress: setProgress,
        onError: (msg, course) => {
          setErrors(prev => [...prev, `${course}: ${msg}`]);
        },
        onPartialData: (notas, frequencia) => {
          setData(prev => prev
            ? { ...prev, notas: { ...notas }, frequencia: { ...frequencia }, coletadoEm: Date.now() }
            : prev
          );
        },
      });
      setData(result);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      // Recarrega o que foi parcialmente coletado em qualquer caso
      const partial = await loadColecao();
      if (partial) setData(partial);

      if (msg === 'SESSION_EXPIRED') {
        setErrors(['Sessão expirada. Recarregue a página e faça login novamente.']);
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        // Cancelado pelo usuário — não exibe erro
      } else if (msg === 'MAX_REQUESTS_EXCEEDED') {
        // Coleta parcial por limite de requisições — é esperado, não é falha
        const notasCount = Object.keys(partial?.notas ?? {}).length;
        const totalCount = partial?.turmas.length ?? 0;
        if (notasCount < totalCount) {
          setErrors([
            `${notasCount} de ${totalCount} turmas coletadas. Clique em "Atualizar dados" novamente para continuar.`,
          ]);
        }
      } else if (msg === 'CIRCUIT_BREAKER_OPEN') {
        setErrors(['Muitas falhas seguidas. Verifique sua conexão e tente novamente.']);
      } else {
        setErrors([`Coleta interrompida: ${msg}`]);
      }
    } finally {
      setLoading(false);
      setProgress(null);
      abortRef.current = null;
    }
  }, [matricula]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handlePromptUpdate = useCallback(() => {
    setShowUpdatePrompt(false);
    handleCollect();
  }, [handleCollect]);

  const firstNameRaw = data?.nomeAluno?.split(' ')[0] ?? nomeAlunoInicial?.split(' ')[0] ?? '';
  // SIGAA exibe o nome em caixa alta ("MIGUEL") — saudação fica mais humana em "Miguel"
  const firstName = firstNameRaw
    ? firstNameRaw.charAt(0).toUpperCase() + firstNameRaw.slice(1).toLowerCase()
    : '';
  const turmas = data?.turmas ?? turmasIniciais;
  const hasCollected = !!data && data.coletadoEm > 0;
  const hoje = sigaaDia(new Date());

  return (
    <div class="sc-dashboard">
      {/* Cabeçalho */}
      <div class="sc-dashboard-header">
        <div class="sc-greeting-block">
          <h2 class="sc-greeting">
            Olá{firstName ? `, ${firstName}` : ''}!
          </h2>
          <p class="sc-today">{dataPorExtenso(new Date())}</p>
        </div>

        <div class="sc-header-actions">
          {hasCollected && !loading && (
            <span class="sc-cache-age" title="Última vez que as notas e faltas foram buscadas no SIGAA">
              Notas de {cacheAge(data!.coletadoEm)}
            </span>
          )}
          {(hasCollected || loading || !showUpdatePrompt) && (
            <button
              class={`sc-btn ${hasCollected ? 'sc-btn-secondary' : 'sc-btn-primary'}`}
              type="button"
              onClick={handleCollect}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Buscando…' : hasCollected ? 'Atualizar notas e faltas' : 'Buscar notas e faltas'}
            </button>
          )}
          {loading && (
            <button class="sc-btn sc-btn-cancel" type="button" onClick={handleCancel}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Progresso */}
      {loading && progress && (
        <ProgressBar info={progress} onCancel={handleCancel} />
      )}

      {/* Erros */}
      {errors.length > 0 && (
        <div class="sc-errors" role="alert">
          {errors.map((e, i) => (
            <p class="sc-error-item" key={i}>
              {e}
            </p>
          ))}
        </div>
      )}

      {showUpdatePrompt && !loading && !hasCollected && (
        <ColetaConvite
          onUpdate={handlePromptUpdate}
          onDismiss={() => {
            dispensarConvite();
            setShowUpdatePrompt(false);
          }}
        />
      )}

      {/* Hoje: aulas + novidades */}
      <div class="sc-overview">
        <AulasCard turmas={turmas} />
        <NovidadesCard items={atualizacoes} />
      </div>

      <AtalhosCard />

      {/* Grade de cards */}
      {turmas.length > 0 ? (
        <section aria-labelledby="sc-turmas-title">
          <h3 class="sc-section-title" id="sc-turmas-title">
            Minhas turmas <span class="sc-section-count">{turmas.length}</span>
          </h3>
          <div class="sc-course-grid" role="list">
            {turmas.map((turma, i) => (
              <div role="listitem" key={turma.idTurma ?? turma.formId}>
                <CourseCard
                  turma={turma}
                  notas={turma.idTurma ? data?.notas[turma.idTurma] : undefined}
                  frequencia={turma.idTurma ? data?.frequencia[turma.idTurma] : undefined}
                  index={i}
                  temAulaHoje={turma.horarioDecodificado?.blocos.some(b => b.dia === hoje) ?? false}
                  novidades={countNovidades(turma, atualizacoes)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : !loading ? (
        <div class="sc-empty-state">
          <p class="sc-empty-title">Nenhuma turma encontrada neste semestre.</p>
          <p class="sc-empty-sub">
            Se você acabou de se matricular, as turmas aparecem aqui assim que a
            secretaria confirmar.
          </p>
        </div>
      ) : null}

      {/* Rodapé */}
      <p class="sc-disclaimer">
        betterUI (não-oficial) — dados da sua sessão ativa no SIGAA, armazenados apenas neste
        dispositivo.
      </p>
    </div>
  );
}

// ── CSS do Dashboard (embutido no Shadow DOM) ─────────────────────────────────

const DASHBOARD_CSS = `
*,
*::before,
*::after {
  box-sizing: border-box;
}

:host {
  all: initial;
  display: block;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.sc-dashboard {
  padding: 0 0 24px;
  color: var(--sc-color-text);
  font-size: 14px;
  line-height: 1.5;
}

/* ── Cabeçalho ── */
.sc-dashboard-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 24px;
  flex-wrap: wrap;
  padding: 20px 0 20px;
}

.sc-greeting {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--sc-color-text);
}

.sc-today {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--sc-color-text-muted);
}

.sc-cache-age {
  font-size: 12px;
  color: var(--sc-color-text-muted);
}

.sc-header-actions {
  display: flex;
  align-items: center;
  gap: 8px 12px;
  flex-wrap: wrap;
}

/* ── Convite à primeira coleta ── */
.sc-convite {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: var(--sc-color-primary-bg);
  border: 1px solid var(--sc-color-primary);
  border-radius: 12px;
}

.sc-convite-body {
  flex: 1 1 320px;
  min-width: 0;
}

.sc-convite-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--sc-color-text);
}

.sc-convite-sub {
  margin: 0;
  font-size: 13px;
  color: var(--sc-color-text-secondary);
}

.sc-convite-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Visão geral: aulas + novidades ── */
.sc-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  align-items: start;
  gap: 16px;
  margin-bottom: 16px;
}

.sc-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--sc-color-bg);
  border: 1px solid var(--sc-color-border-subtle);
  border-radius: 12px;
  box-shadow: var(--sc-shadow-sm);
  overflow: hidden;
}

.sc-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 10px;
}

.sc-panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--sc-color-text);
}

.sc-panel-count,
.sc-section-count {
  display: inline-block;
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--sc-color-bg-muted);
  color: var(--sc-color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.sc-panel-empty {
  margin: 0;
  padding: 4px 16px 16px;
  font-size: 13px;
  color: var(--sc-color-text-muted);
}

.sc-aulas-list {
  list-style: none;
  margin: 0;
  padding: 0 8px 8px;
}

.sc-aula {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 8px;
  background: none;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  text-align: left;
  color: var(--sc-color-text);
  cursor: pointer;
}

.sc-aula:hover:not(:disabled) {
  background: var(--sc-color-bg-muted);
}

.sc-aula:disabled {
  cursor: default;
}

.sc-aula:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: -2px;
}

.sc-aula-slot {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.sc-aula-turno {
  font-size: 13px;
  font-weight: 600;
  color: var(--sc-color-primary);
}

.sc-aula-num {
  font-size: 12px;
  color: var(--sc-color-text-muted);
}

.sc-aula-nome {
  font-size: 13px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-aula-local {
  font-size: 12px;
  color: var(--sc-color-text-secondary);
  background: var(--sc-color-bg-muted);
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* ── Atalhos ── */
.sc-atalhos {
  display: grid;
  /* 6 atalhos = 2 linhas de 3; auto-fill deixava 5 + 1 órfão */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 28px;
}

.sc-atalho {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px 14px;
  background: var(--sc-color-bg);
  border: 1px solid var(--sc-color-border-subtle);
  border-radius: 10px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;
}

.sc-atalho:hover {
  border-color: var(--sc-color-primary);
  background: var(--sc-color-primary-bg);
}

.sc-atalho:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: 2px;
}

.sc-atalho-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sc-color-text);
}

.sc-atalho-count {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--sc-color-primary);
  color: var(--sc-color-text-on-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.6;
}

.sc-atalho-desc {
  font-size: 12px;
  color: var(--sc-color-text-muted);
  line-height: 1.35;
}

/* ── Seção "Minhas turmas" ── */
.sc-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 700;
  color: var(--sc-color-text);
}

/* ── Botões ── */
.sc-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1.5px solid transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
  line-height: 1;
  white-space: nowrap;
}

.sc-btn:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: 2px;
}

.sc-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sc-btn-primary {
  background: var(--sc-color-primary);
  border-color: var(--sc-color-primary);
  color: var(--sc-color-text-on-primary);
}

.sc-btn-primary:hover:not(:disabled) {
  background: var(--sc-color-primary-hover);
  border-color: var(--sc-color-primary-hover);
}

.sc-btn-cancel {
  background: var(--sc-color-bg-muted);
  border-color: var(--sc-color-border);
  color: var(--sc-color-text-secondary);
}

.sc-btn-cancel:hover {
  background: var(--sc-color-border-subtle);
}

.sc-btn-secondary {
  background: var(--sc-color-bg);
  border-color: var(--sc-color-border);
  color: var(--sc-color-text);
}

.sc-btn-secondary:hover:not(:disabled) {
  border-color: var(--sc-color-primary);
  color: var(--sc-color-primary);
}

.sc-btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--sc-color-text-secondary);
}

.sc-btn-ghost:hover {
  background: var(--sc-color-bg-muted);
}

.sc-link-btn {
  align-self: flex-start;
  margin: 0 16px 14px;
  padding: 2px 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--sc-color-primary);
  cursor: pointer;
}

.sc-link-btn:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sc-link-btn:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: 2px;
  border-radius: 3px;
}

/* ── Progresso ── */
.sc-progress-container {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--sc-color-bg-subtle);
  border-radius: 8px;
  border: 1px solid var(--sc-color-border-subtle);
}

.sc-progress-track {
  height: 6px;
  background: var(--sc-color-border);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.sc-progress-fill {
  height: 100%;
  background: var(--sc-color-primary);
  border-radius: 3px;
  transition: width 300ms ease;
}

.sc-progress-text {
  margin: 0;
  font-size: 12px;
  color: var(--sc-color-text-secondary);
}

.sc-progress-count {
  color: var(--sc-color-text-muted);
}

/* ── Erros ── */
.sc-errors {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--sc-color-danger-bg);
  border: 1px solid var(--sc-color-danger-border);
  border-radius: 8px;
}

.sc-error-item {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--sc-color-danger);
}

.sc-error-item:last-child {
  margin-bottom: 0;
}

/* ── Grade de cards ── */
.sc-course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* ── Card de disciplina ── */
.sc-card {
  background: var(--sc-color-bg);
  border: 1px solid var(--sc-color-border-subtle);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--sc-shadow-sm);
  transition: box-shadow 200ms ease, transform 200ms ease;
  display: flex;
  flex-direction: column;
}

.sc-card:hover {
  box-shadow: var(--sc-shadow-md);
  transform: translateY(-1px);
}

.sc-card-accent {
  height: 4px;
  width: 100%;
  flex-shrink: 0;
}

.sc-card-body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.sc-card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--sc-color-text);
  line-height: 1.3;
  /* Trunca nomes muito longos com elipsis */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* Reset de estilos de botão */
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  text-align: left;
  width: 100%;
}

.sc-card-title-link {
  cursor: pointer;
}

.sc-card-title-link:hover {
  color: var(--sc-color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sc-card-title-link:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: 2px;
  border-radius: 3px;
}

.sc-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sc-card-schedule,
.sc-card-room {
  display: inline-block;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--sc-color-bg-muted);
  color: var(--sc-color-text-secondary);
  font-family: inherit;
}

/* ── Notas ── */
.sc-card-notas {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-notas-bimestres {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sc-bimestre {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--sc-color-bg-subtle);
  border: 1px solid var(--sc-color-border-subtle);
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 11px;
}

.sc-bimestre-label {
  color: var(--sc-color-text-muted);
  font-weight: 500;
}

.sc-bimestre-nota {
  color: var(--sc-color-text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.sc-resultado {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--sc-color-border-subtle);
}

.sc-resultado-label {
  font-size: 11px;
  color: var(--sc-color-text-muted);
}

.sc-resultado-valor {
  font-size: 14px;
  font-weight: 700;
  color: var(--sc-color-text);
  font-variant-numeric: tabular-nums;
}

.sc-situacao {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sc-situacao-ok {
  background: var(--sc-color-success-bg);
  color: var(--sc-color-success);
}

.sc-situacao-risk {
  background: var(--sc-color-danger-bg);
  color: var(--sc-color-danger);
}

/* ── Frequência ── */
.sc-card-freq {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.sc-presenca-ok {
  background: var(--sc-color-success-bg);
  color: var(--sc-color-success);
}

.sc-presenca-warn {
  background: var(--sc-color-warning-bg);
  color: var(--sc-color-warning);
}

.sc-presenca-risk {
  background: var(--sc-color-danger-bg);
  color: var(--sc-color-danger);
}

.sc-freq-pct {
  font-weight: 600;
}

.sc-freq-faltas {
  opacity: 0.8;
}

/* ── Limite de faltas ── */
.sc-freq-limite {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
  align-self: flex-start;
}

.sc-freq-limite-ok {
  background: var(--sc-color-success-bg);
  color: var(--sc-color-success);
}

.sc-freq-limite-warn {
  background: var(--sc-color-warning-bg);
  color: var(--sc-color-warning);
}

.sc-freq-limite-danger {
  background: var(--sc-color-danger-bg);
  color: var(--sc-color-danger);
  font-weight: 600;
}

.sc-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}

.sc-badge-hoje {
  background: var(--sc-color-primary-bg);
  color: var(--sc-color-primary);
}

.sc-badge-novidade {
  background: var(--sc-color-accent-feed-bg);
  color: var(--sc-color-accent-feed);
}

.sc-card-open {
  margin-top: auto;
  align-self: flex-start;
  padding: 4px 0 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--sc-color-primary);
  cursor: pointer;
}

.sc-card-open:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sc-card-open:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: 2px;
  border-radius: 3px;
}

/* ── Expand button ── */
.sc-expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 2px 0;
  font-family: inherit;
  font-size: 11px;
  color: var(--sc-color-text-muted);
  cursor: pointer;
  align-self: flex-start;
  line-height: 1;
}

.sc-expand-btn:hover {
  color: var(--sc-color-text-secondary);
}

.sc-expand-btn:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: 2px;
  border-radius: 3px;
}

.sc-expand-icon {
  font-size: 9px;
  display: inline-block;
  transition: transform 200ms ease;
}

.sc-expand-icon.sc-expanded {
  transform: rotate(180deg);
}

/* ── Atividades expandidas ── */
.sc-avaliacoes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--sc-color-border-subtle);
}

.sc-aval-bimestre {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sc-aval-bimestre-nome {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sc-color-text-faint);
  margin-bottom: 2px;
}

.sc-aval-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
}

.sc-aval-nome {
  color: var(--sc-color-text-secondary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-aval-nota {
  font-weight: 600;
  color: var(--sc-color-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sc-aval-max {
  color: var(--sc-color-text-faint);
  font-size: 11px;
  white-space: nowrap;
}

/* ── Feed de novidades ── */
.sc-feed-list {
  list-style: none;
  margin: 0;
  padding: 0 8px 8px;
}

.sc-feed-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 9px 8px;
  background: none;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.sc-feed-item:hover {
  background: var(--sc-color-bg-muted);
}

.sc-feed-item:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: -2px;
}

.sc-feed-date {
  flex-shrink: 0;
  min-width: 40px;
  padding-top: 1px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sc-color-accent-feed);
  font-variant-numeric: tabular-nums;
}

.sc-feed-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sc-feed-turma {
  font-size: 13px;
  font-weight: 600;
  color: var(--sc-color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-feed-tipo {
  font-size: 12px;
  color: var(--sc-color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sc-feed-tipo-label {
  font-weight: 600;
  color: var(--sc-color-text-secondary);
}

.sc-feed-tipo-desc {
  color: var(--sc-color-text-muted);
}

/* ── Estado vazio ── */
.sc-empty-state {
  padding: 40px 24px;
  text-align: center;
  color: var(--sc-color-text-secondary);
}

.sc-empty-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
}

.sc-empty-sub {
  margin: 0 0 6px;
  font-size: 14px;
}

.sc-empty-info {
  margin: 0;
  font-size: 12px;
  color: var(--sc-color-text-muted);
}

/* ── Rodapé ── */
.sc-disclaimer {
  margin: 20px 0 0;
  font-size: 11px;
  color: var(--sc-color-text-faint);
  text-align: center;
}

/* ── Responsividade ── */
@media (max-width: 640px) {
  .sc-course-grid,
  .sc-overview {
    grid-template-columns: 1fr;
  }

  .sc-atalhos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sc-greeting {
    font-size: 20px;
  }

  .sc-aula {
    grid-template-columns: 80px 1fr;
  }

  .sc-aula-local {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sc-btn,
  .sc-card,
  .sc-atalho,
  .sc-progress-fill {
    transition: none;
  }

  .sc-card:hover {
    transform: none;
  }
}
`;

// ── Montagem no DOM ───────────────────────────────────────────────────────────

let dashboardHost: HTMLDivElement | null = null;
let dashboardCleanup: (() => void) | null = null;

export function mountDashboard(
  container: Element,
  matricula: string,
  nomeAlunoInicial: string | null = null,
  turmasIniciais: TurmaInfo[] = [],
): () => void {
  // Remover instância anterior se existir
  unmountDashboard();

  dashboardHost = document.createElement('div');
  dashboardHost.id = 'betterui-dashboard-host';
  dashboardHost.style.cssText =
    "all: initial; display: block; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;";

  // Inserir antes do primeiro filho do container
  container.insertBefore(dashboardHost, container.firstChild);

  const shadow = dashboardHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = DASHBOARD_CSS;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  render(h(Dashboard, { matricula, nomeAlunoInicial, turmasIniciais }), mountPoint);

  dashboardCleanup = () => {
    render(null, mountPoint);
  };

  return unmountDashboard;
}

export function unmountDashboard(): void {
  dashboardCleanup?.();
  dashboardCleanup = null;
  dashboardHost?.remove();
  dashboardHost = null;
}
