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
  const links = document.querySelectorAll<HTMLAnchorElement>(
    '#atualizacoes-turma a[onclick]',
  );
  for (const link of links) {
    if (link.getAttribute('onclick')?.includes(`'idTurma':'${idTurma}'`)) {
      link.click();
      return;
    }
  }
}

// ── Card de atualizações recentes ─────────────────────────────────────────────

function AtualizacoesCard({ items }: { items: AtualizacaoItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  function shortDate(d: string): string {
    return d.slice(0, 5);
  }

  function splitTipo(tipo: string): [string, string] {
    const colonIdx = tipo.indexOf(':');
    if (colonIdx === -1) return [tipo, ''];
    return [tipo.slice(0, colonIdx).trim(), tipo.slice(colonIdx + 1).trim()];
  }

  return (
    <div class="sc-feed-card">
      <button
        class="sc-feed-header"
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span class="sc-feed-title">Atualizações recentes</span>
        <span class="sc-feed-header-right">
          <span class="sc-feed-count">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
          <span class={`sc-feed-chevron${expanded ? ' sc-feed-chevron-open' : ''}`}>▼</span>
        </span>
      </button>

      {expanded && (
        <ul class="sc-feed-list">
          {items.map((item, i) => {
            const [tipoLabel, tipoDesc] = splitTipo(item.tipo);
            return (
              <li class="sc-feed-item" key={i}>
                <span class="sc-feed-date">{shortDate(item.data)}</span>
                <div class="sc-feed-content">
                  <button
                    class="sc-feed-turma"
                    type="button"
                    onClick={() => navigateToAtualizacao(item.idTurma)}
                    title={`Abrir turma virtual de ${item.nomeTurma}`}
                  >
                    {item.nomeTurma}
                  </button>
                  <span class="sc-feed-tipo">
                    {tipoLabel && <span class="sc-feed-tipo-label">{tipoLabel}</span>}
                    {tipoDesc && <span class="sc-feed-tipo-desc">{tipoDesc ? `: ${tipoDesc}` : ''}</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Navegação para turma virtual ──────────────────────────────────────────────

/**
 * Clica no link JSF do SIGAA correspondente à turma, navegando para a
 * turma virtual. Delega inteiramente ao mecanismo do SIGAA — sem POST forjado.
 */
function navigateToTurmaVirtual(turma: TurmaInfo): void {
  if (!turma.frontEndIdTurma) return;
  const forms = document.querySelectorAll('form[id^="form_acessarTurmaVirtual"]');
  for (const form of forms) {
    const link = form.querySelector('a[onclick]') as HTMLAnchorElement | null;
    if (link?.getAttribute('onclick')?.includes(turma.frontEndIdTurma)) {
      link.click();
      return;
    }
  }
}

// ── Componentes ───────────────────────────────────────────────────────────────

function CourseCard({
  turma,
  notas,
  frequencia,
  index,
}: {
  turma: TurmaInfo;
  notas: NotasTurma | undefined;
  frequencia: FrequenciaTurma | undefined;
  index: number;
}) {
  const color = courseColor(index);
  const schedule = turma.horarioDecodificado?.resumo ?? turma.horarioCodigo ?? '';
  const hasData = notas || frequencia;
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

        {!hasData && (
          <p class="sc-card-no-data">Dados não coletados ainda</p>
        )}
      </div>
    </div>
  );
}

// ── Toast de sugestão de atualização ──────────────────────────────────────────

/**
 * Notificação flutuante sugerindo a coleta quando não há dados ainda.
 * NÃO dispara fetch sozinha — só chama onUpdate() no clique explícito do
 * usuário (princípio 5 do CLAUDE.md: toda requisição precisa de ação
 * explícita). O "automático" aqui é só a sugestão aparecer, não a coleta.
 */
function UpdatePromptToast({
  onUpdate,
  onDismiss,
}: {
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  return (
    <div class="sc-update-toast" role="status" aria-live="polite">
      <div class="sc-update-toast-body">
        <p class="sc-update-toast-title">Nenhum dado coletado ainda</p>
        <p class="sc-update-toast-sub">
          Quer coletar notas e frequência de todas as turmas agora?
        </p>
      </div>
      <div class="sc-update-toast-actions">
        <button class="sc-btn sc-btn-primary sc-btn-sm" type="button" onClick={onUpdate}>
          Atualizar agora
        </button>
        <button class="sc-btn sc-btn-cancel sc-btn-sm" type="button" onClick={onDismiss}>
          Agora não
        </button>
      </div>
    </div>
  );
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
        // o clique em "Atualizar agora" continua sendo obrigatório.
        setShowUpdatePrompt(true);
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

  const firstName = data?.nomeAluno?.split(' ')[0] ?? nomeAlunoInicial?.split(' ')[0] ?? '';

  return (
    <div class="sc-dashboard">
      {showUpdatePrompt && !loading && (
        <UpdatePromptToast
          onUpdate={handlePromptUpdate}
          onDismiss={() => setShowUpdatePrompt(false)}
        />
      )}

      {/* Cabeçalho */}
      <div class="sc-dashboard-header">
        <div class="sc-greeting-row">
          <h2 class="sc-greeting">
            Olá{firstName ? `, ${firstName}` : ''}!
          </h2>
          {data && data.coletadoEm > 0 && (
            <span class="sc-cache-age" title="Última atualização dos dados">
              {cacheAge(data.coletadoEm)}
            </span>
          )}
        </div>

        <div class="sc-header-actions">
          <button
            class="sc-btn sc-btn-primary"
            type="button"
            onClick={handleCollect}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Coletando...' : 'Atualizar dados'}
          </button>
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

      {/* Feed de atualizações recentes */}
      <AtualizacoesCard items={atualizacoes} />

      {/* Grade de cards */}
      {data && data.turmas.length > 0 ? (
        <div class="sc-course-grid" role="list">
          {data.turmas.map((turma, i) => (
            <div role="listitem" key={turma.idTurma ?? turma.formId}>
              <CourseCard
                turma={turma}
                notas={turma.idTurma ? data.notas[turma.idTurma] : undefined}
                frequencia={turma.idTurma ? data.frequencia[turma.idTurma] : undefined}
                index={i}
              />
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div class="sc-empty-state">
          <p class="sc-empty-title">Nenhum dado coletado ainda.</p>
          <p class="sc-empty-sub">
            Clique em <strong>Atualizar dados</strong> para coletar notas e frequência de
            todas as turmas do semestre.
          </p>
          <p class="sc-empty-info">
            A coleta pode demorar alguns minutos — o SIGAA processa uma disciplina por vez.
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
  padding: 20px 0 16px;
  border-bottom: 1px solid var(--sc-color-border-subtle);
  margin-bottom: 20px;
}

.sc-greeting-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.sc-greeting {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--sc-color-text);
}

.sc-cache-age {
  font-size: 12px;
  color: var(--sc-color-text-muted);
}

.sc-header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.sc-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

/* ── Toast de sugestão de atualização ── */
@keyframes sc-toast-bounce-in {
  0% { transform: translateY(-28px) scale(0.92); opacity: 0; }
  60% { transform: translateY(4px) scale(1.02); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

.sc-update-toast {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2147483000;
  width: 300px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: var(--sc-color-bg);
  border: 1px solid var(--sc-color-border);
  border-left: 4px solid var(--sc-color-primary);
  border-radius: 10px;
  box-shadow: var(--sc-shadow-md);
  animation: sc-toast-bounce-in 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sc-update-toast-title {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--sc-color-text);
}

.sc-update-toast-sub {
  margin: 0;
  font-size: 12px;
  color: var(--sc-color-text-secondary);
}

.sc-update-toast-actions {
  display: flex;
  gap: 8px;
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

.sc-card-no-data {
  margin: 0;
  font-size: 11px;
  color: var(--sc-color-text-faint);
  font-style: italic;
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

/* ── Feed de atualizações ── */
.sc-feed-card {
  background: var(--sc-color-bg);
  border: 1px solid var(--sc-color-border-subtle);
  border-left: 4px solid var(--sc-color-accent-feed);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--sc-shadow-sm);
  margin-bottom: 20px;
}

.sc-feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid var(--sc-color-bg-muted);
  width: 100%;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 150ms ease;
}

.sc-feed-header:hover {
  background: var(--sc-color-accent-feed-bg);
}

.sc-feed-header:focus-visible {
  outline: 2px solid var(--sc-color-accent-feed);
  outline-offset: -2px;
  border-radius: 8px 8px 0 0;
}

.sc-feed-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--sc-color-text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sc-feed-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-feed-count {
  font-size: 11px;
  color: var(--sc-color-text-faint);
}

.sc-feed-chevron {
  font-size: 9px;
  color: var(--sc-color-text-faint);
  display: inline-block;
  transition: transform 200ms ease;
}

.sc-feed-chevron-open {
  transform: rotate(180deg);
}

.sc-feed-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sc-feed-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--sc-color-bg-subtle);
  transition: background 150ms ease;
}

.sc-feed-item:last-child {
  border-bottom: none;
}

.sc-feed-item:hover {
  background: var(--sc-color-accent-feed-bg);
}

.sc-feed-date {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--sc-color-accent-feed);
  font-variant-numeric: tabular-nums;
  font-family: inherit;
  padding-top: 1px;
  min-width: 36px;
}

.sc-feed-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sc-feed-turma {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--sc-color-text);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.sc-feed-turma:hover {
  color: var(--sc-color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sc-feed-turma:focus-visible {
  outline: 2px solid var(--sc-color-primary);
  outline-offset: 2px;
  border-radius: 3px;
}

.sc-feed-tipo {
  font-size: 11px;
  color: var(--sc-color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  .sc-course-grid {
    grid-template-columns: 1fr;
  }

  .sc-greeting {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sc-btn,
  .sc-card,
  .sc-progress-fill {
    transition: none;
  }

  .sc-card:hover {
    transform: none;
  }

  .sc-update-toast {
    animation: none;
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
