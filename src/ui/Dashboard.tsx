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
import { loadColecao, clearColecao, cacheAge } from '@/storage/cache';
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
  if (items.length === 0) return null;

  // Formata "DD/MM/AAAA" → "DD/MM"
  function shortDate(d: string): string {
    return d.slice(0, 5);
  }

  // Extrai o prefixo do tipo ("Nova Notícia", "Novo Tópico de Aula", etc.)
  // e o restante separadamente para poder estilizá-los
  function splitTipo(tipo: string): [string, string] {
    const colonIdx = tipo.indexOf(':');
    if (colonIdx === -1) return [tipo, ''];
    return [tipo.slice(0, colonIdx).trim(), tipo.slice(colonIdx + 1).trim()];
  }

  return (
    <div class="sc-feed-card">
      <div class="sc-feed-header">
        <span class="sc-feed-title">Atualizações recentes</span>
        <span class="sc-feed-count">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
      </div>
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

  const handleClear = useCallback(async () => {
    await clearColecao();
    // Preserva os cards (turmas do DOM) — apaga só notas/frequência coletadas
    setData(prev => prev ? { ...prev, notas: {}, frequencia: {}, coletadoEm: 0 } : prev);
  }, []);

  const firstName = data?.nomeAluno?.split(' ')[0] ?? nomeAlunoInicial?.split(' ')[0] ?? '';

  return (
    <div class="sc-dashboard">
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
          {data && !loading && (
            Object.keys(data.notas).length > 0 || Object.keys(data.frequencia).length > 0
          ) && (
            <button
              class="sc-btn sc-btn-danger"
              type="button"
              onClick={handleClear}
              title="Remove todos os dados salvos localmente"
            >
              Apagar dados locais
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
  color: #212529;
  font-size: 14px;
  line-height: 1.5;
}

/* ── Cabeçalho ── */
.sc-dashboard-header {
  padding: 20px 0 16px;
  border-bottom: 1px solid #e9ecef;
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
  color: #212529;
}

.sc-cache-age {
  font-size: 12px;
  color: #868e96;
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
  outline: 2px solid #1971c2;
  outline-offset: 2px;
}

.sc-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sc-btn-primary {
  background: #1971c2;
  border-color: #1971c2;
  color: #fff;
}

.sc-btn-primary:hover:not(:disabled) {
  background: #1864ab;
  border-color: #1864ab;
}

.sc-btn-cancel {
  background: #f1f3f5;
  border-color: #dee2e6;
  color: #495057;
}

.sc-btn-cancel:hover {
  background: #e9ecef;
}

.sc-btn-danger {
  background: transparent;
  border-color: #c92a2a;
  color: #c92a2a;
  font-size: 12px;
  padding: 6px 12px;
}

.sc-btn-danger:hover {
  background: #fff5f5;
}

.sc-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

/* ── Progresso ── */
.sc-progress-container {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.sc-progress-track {
  height: 6px;
  background: #dee2e6;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.sc-progress-fill {
  height: 100%;
  background: #1971c2;
  border-radius: 3px;
  transition: width 300ms ease;
}

.sc-progress-text {
  margin: 0;
  font-size: 12px;
  color: #495057;
}

.sc-progress-count {
  color: #868e96;
}

/* ── Erros ── */
.sc-errors {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff5f5;
  border: 1px solid #ffa8a8;
  border-radius: 8px;
}

.sc-error-item {
  margin: 0 0 4px;
  font-size: 13px;
  color: #c92a2a;
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
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 200ms ease, transform 200ms ease;
  display: flex;
  flex-direction: column;
}

.sc-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
  color: #212529;
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
  color: #1971c2;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sc-card-title-link:focus-visible {
  outline: 2px solid #1971c2;
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
  background: #f1f3f5;
  color: #495057;
  font-family: ui-monospace, 'Cascadia Code', monospace;
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
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 11px;
}

.sc-bimestre-label {
  color: #868e96;
  font-weight: 500;
}

.sc-bimestre-nota {
  color: #212529;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.sc-resultado {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid #e9ecef;
}

.sc-resultado-label {
  font-size: 11px;
  color: #868e96;
}

.sc-resultado-valor {
  font-size: 14px;
  font-weight: 700;
  color: #212529;
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
  background: #d3f9d8;
  color: #2b8a3e;
}

.sc-situacao-risk {
  background: #ffe3e3;
  color: #c92a2a;
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
  background: #ebfbee;
  color: #2b8a3e;
}

.sc-presenca-warn {
  background: #fff9db;
  color: #e67700;
}

.sc-presenca-risk {
  background: #fff5f5;
  color: #c92a2a;
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
  background: #ebfbee;
  color: #2b8a3e;
}

.sc-freq-limite-warn {
  background: #fff9db;
  color: #e67700;
}

.sc-freq-limite-danger {
  background: #fff5f5;
  color: #c92a2a;
  font-weight: 600;
}

.sc-card-no-data {
  margin: 0;
  font-size: 11px;
  color: #adb5bd;
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
  color: #868e96;
  cursor: pointer;
  align-self: flex-start;
  line-height: 1;
}

.sc-expand-btn:hover {
  color: #495057;
}

.sc-expand-btn:focus-visible {
  outline: 2px solid #1971c2;
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
  border-top: 1px solid #e9ecef;
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
  color: #adb5bd;
  margin-bottom: 2px;
}

.sc-aval-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
}

.sc-aval-nome {
  color: #495057;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-aval-nota {
  font-weight: 600;
  color: #212529;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sc-aval-max {
  color: #adb5bd;
  font-size: 11px;
  white-space: nowrap;
}

/* ── Feed de atualizações ── */
.sc-feed-card {
  background: #fff;
  border: 1px solid #e9ecef;
  border-left: 4px solid #f08c00;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 20px;
}

.sc-feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid #f1f3f5;
}

.sc-feed-title {
  font-size: 13px;
  font-weight: 700;
  color: #212529;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sc-feed-count {
  font-size: 11px;
  color: #adb5bd;
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
  border-bottom: 1px solid #f8f9fa;
  transition: background 150ms ease;
}

.sc-feed-item:last-child {
  border-bottom: none;
}

.sc-feed-item:hover {
  background: #fffbf5;
}

.sc-feed-date {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #f08c00;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, 'Cascadia Code', monospace;
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
  color: #212529;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.sc-feed-turma:hover {
  color: #1971c2;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sc-feed-turma:focus-visible {
  outline: 2px solid #1971c2;
  outline-offset: 2px;
  border-radius: 3px;
}

.sc-feed-tipo {
  font-size: 11px;
  color: #868e96;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-feed-tipo-label {
  font-weight: 600;
  color: #495057;
}

.sc-feed-tipo-desc {
  color: #868e96;
}

/* ── Estado vazio ── */
.sc-empty-state {
  padding: 40px 24px;
  text-align: center;
  color: #495057;
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
  color: #868e96;
}

/* ── Rodapé ── */
.sc-disclaimer {
  margin: 20px 0 0;
  font-size: 11px;
  color: #adb5bd;
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
  dashboardHost.style.cssText = 'all: initial; display: block;';

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
