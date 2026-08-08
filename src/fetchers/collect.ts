/**
 * Orquestrador de coleta — betterUI Fase 1
 *
 * Coleta notas e frequência de todas as turmas em uma única passagem,
 * visitando cada turma virtual uma vez por coleta.
 *
 * Budget de 90 req cobre 17 turmas em uma execução:
 *   1 req: GET portal inicial
 *   Por turma (máx 5 req):
 *     1 req: POST entrar na turma virtual
 *     1-2 req: POST + opcional GET para notas
 *     1-2 req: POST + opcional GET para frequência
 *     1 req: GET portal (retorno)
 *
 * Turmas já cacheadas são puladas. Na próxima execução, somente as
 * pendentes são coletadas.
 */

import {
  SessionQueue,
  SessionExpiredError,
  BudgetExceededError,
  CircuitBreakerError,
  extractMenuComponent,
  extractViewStateFromHtml,
} from '@/fetchers/session';
import { parseTurmas } from '@/parsers/turmas';
import { parseNotas } from '@/parsers/notas';
import { parseFrequencia } from '@/parsers/frequencia';
import { parsePortalAluno } from '@/parsers/portal';
import { saveColecao, loadColecao } from '@/storage/cache';
import { log } from '@/lib/log';
import type {
  ColecaoCompleta,
  NotasTurma,
  FrequenciaTurma,
  TurmaInfo,
  CollectOptions,
} from '@/types';

const SIGAA_BASE = 'https://sig.cefetmg.br/sigaa';
const DISCENTE_URL = `${SIGAA_BASE}/portais/discente/discente.jsf`;
const SCHEMA_VERSION = 1;

export async function collectAll(options: CollectOptions): Promise<ColecaoCompleta> {
  const { onProgress, onError, signal, matricula } = options;
  const maxRequests = options.maxRequests ?? 90;

  const queue = new SessionQueue({ signal, maxRequests });

  // ── Passo 1: GET portal para ler turmas + ViewState ──────────────────────
  onProgress({ completed: 0, total: 1, currentCourseName: 'Carregando portal...', phase: 'navegando' });

  const portalHtml = await queue.fetchPage(DISCENTE_URL);
  const turmas = parseTurmas(portalHtml);
  const portalInfo = parsePortalAluno(portalHtml);
  let viewState = extractViewStateFromHtml(portalHtml) ?? '';

  if (!viewState) throw new Error('ViewState não encontrado no portal');
  if (turmas.length === 0) throw new Error('Nenhuma turma encontrada no portal');

  log.debugSync('collect: turmas encontradas:', turmas.length);

  // ── Carregar cache parcial existente ─────────────────────────────────────
  const existing = await loadColecao();
  const notas: Record<string, NotasTurma> = { ...(existing?.notas ?? {}) };
  const frequencia: Record<string, FrequenciaTurma> = { ...(existing?.frequencia ?? {}) };

  const totalCourses = turmas.length;
  let completed = 0;

  // ── Passo 2: Visitar cada turma uma vez, coletando notas e frequência ────
  for (const turma of turmas) {
    if (signal.aborted) break;

    completed++;

    const hasNotas = !!turma.idTurma && !!notas[turma.idTurma];
    const hasFreq = !!turma.idTurma && !!frequencia[turma.idTurma];

    if (hasNotas && hasFreq) {
      log.debugSync('collect: turma completamente cacheada, pulando:', turma.nome);
      continue;
    }

    if (!turma.frontEndIdTurma || !turma.componentId || !turma.idTurma) {
      log.debugSync('collect: turma sem dados de navegação, pulando:', turma.nome);
      onError('Dados de navegação incompletos', turma.nome);
      continue;
    }

    onProgress({ completed, total: totalCourses, currentCourseName: turma.nome, phase: 'navegando' });

    try {
      viewState = await collectTurma(
        queue, turma, viewState, matricula, notas, frequencia,
        onProgress, completed, totalCourses, hasNotas, hasFreq,
      );
    } catch (err) {
      if (isFatal(err)) {
        await savePartial();
        throw err;
      }
      onError((err as Error).message, turma.nome);
      try {
        const portalReturn = await queue.fetchPage(DISCENTE_URL);
        viewState = extractViewStateFromHtml(portalReturn) ?? viewState;
      } catch (recoverErr) {
        if (isFatal(recoverErr)) {
          await savePartial();
          throw recoverErr;
        }
        await savePartial();
        break;
      }
    }

    await savePartial();
    options.onPartialData?.({ ...notas }, { ...frequencia });
  }

  const result = buildResult();
  await saveColecao(result);
  return result;

  // ── Funções auxiliares ────────────────────────────────────────────────────

  function buildResult(): ColecaoCompleta {
    return {
      coletadoEm: Date.now(),
      matricula,
      nomeAluno: portalInfo?.nome ?? '',
      turmas,
      notas,
      frequencia,
      versaoSchema: SCHEMA_VERSION,
    };
  }

  async function savePartial(): Promise<void> {
    try {
      await saveColecao(buildResult());
    } catch {
      // Silencioso — falha de storage não interrompe a coleta
    }
  }
}

async function collectTurma(
  queue: SessionQueue,
  turma: TurmaInfo,
  viewState: string,
  matricula: string,
  notas: Record<string, NotasTurma>,
  frequencia: Record<string, FrequenciaTurma>,
  onProgress: CollectOptions['onProgress'],
  completed: number,
  total: number,
  skipNotas: boolean,
  skipFrequencia: boolean,
): Promise<string> {
  // 1. Entrar na turma virtual
  const enterResult = await queue.postJSF(
    DISCENTE_URL,
    turma.formId,
    {
      [turma.componentId!]: turma.componentId!,
      frontEndIdTurma: turma.frontEndIdTurma!,
    },
    viewState,
  );
  let vs = enterResult.viewState;

  // URL real do formMenu dentro da turma virtual (é ava/index.jsf, não discente.jsf)
  const avaUrl = extractFormAction(enterResult.html, 'formMenu')
    ?? `${SIGAA_BASE}/ava/index.jsf`;

  // Extrair ambos os componentes do menu enquanto temos o HTML de entrada
  const verNotasComp = !skipNotas
    ? extractMenuComponent(enterResult.html, 'Ver Notas')
    : null;
  const freqComp = !skipFrequencia
    ? extractMenuComponent(enterResult.html, 'Frequência')
    : null;

  // 2. Coletar notas
  if (verNotasComp) {
    onProgress({ completed, total, currentCourseName: turma.nome, phase: 'notas' });

    const notasResult = await queue.postJSF(
      avaUrl,
      'formMenu',
      { [verNotasComp]: verNotasComp },
      vs,
    );
    vs = notasResult.viewState;
    let notasHtml = notasResult.html;

    if (!notasHtml.includes('tabelaRelatorio')) {
      // A resposta não teve as notas diretamente — fazer GET da página
      notasHtml = await queue.fetchPage(avaUrl);
      vs = extractViewStateFromHtml(notasHtml) ?? vs;
    }

    const parsed = parseNotas(notasHtml, matricula);
    if (parsed && turma.idTurma) {
      notas[turma.idTurma] = parsed;
      log.debugSync('collect: notas salvas para', turma.nome);
    }
  } else if (!skipNotas) {
    log.debugSync('collect: "Ver Notas" não encontrado no menu de', turma.nome);
  }

  // 3. Coletar frequência (reutiliza o ViewState da resposta de notas —
  //    se recebemos o HTML de ava/index.jsf, o formMenu ainda está presente)
  if (freqComp) {
    onProgress({ completed, total, currentCourseName: turma.nome, phase: 'frequencia' });

    const freqResult = await queue.postJSF(
      avaUrl,
      'formMenu',
      { [freqComp]: freqComp },
      vs,
    );
    vs = freqResult.viewState;
    let freqHtml = freqResult.html;

    if (!freqHtml.includes('listing')) {
      freqHtml = await queue.fetchPage(`${SIGAA_BASE}/ava/FrequenciaAluno/mapa.jsf`);
      vs = extractViewStateFromHtml(freqHtml) ?? vs;
    }

    const parsed = parseFrequencia(freqHtml);
    if (parsed && turma.idTurma) {
      frequencia[turma.idTurma] = parsed;
      log.debugSync('collect: frequência salva para', turma.nome);
    }
  } else if (!skipFrequencia) {
    log.debugSync('collect: "Frequência" não encontrado no menu de', turma.nome);
  }

  // 4. Voltar ao portal para a próxima turma
  const back = await queue.fetchPage(DISCENTE_URL);
  return extractViewStateFromHtml(back) ?? vs;
}

function isFatal(err: unknown): boolean {
  if (err instanceof SessionExpiredError) return true;
  if (err instanceof BudgetExceededError) return true;
  if (err instanceof CircuitBreakerError) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  return false;
}

/** Extrai o atributo action de um formulário pelo id, a partir do HTML. */
function extractFormAction(html: string, formId: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const form = doc.getElementById(formId) as HTMLFormElement | null;
    return form?.action ?? null;
  } catch {
    return null;
  }
}
