/**
 * Tipos compartilhados — betterUI Fase 1
 *
 * Fonte de verdade para todas as interfaces de dados.
 * Parsers, fetchers, storage e UI importam daqui.
 */

/** Uma turma extraída da tabela do portal do aluno */
export interface TurmaInfo {
  /** Nome da disciplina, ex: "ALGORITMOS E LÓGICA DE PROGRAMAÇÃO" */
  nome: string;
  /** Código da sala, ex: "S 204" */
  local: string | null;
  /** Código de horário bruto, ex: "6M12" ou "2T3 5T34" */
  horarioCodigo: string | null;
  /** Horário decodificado para exibição */
  horarioDecodificado: HorarioDecodificado | null;
  /** Hash SHA-1 de 40 chars para navegação JSF (frontEndIdTurma) */
  frontEndIdTurma: string | null;
  /** ID numérico da turma no banco, extraído de tr[id="linha_XXXXXX"] */
  idTurma: string | null;
  /** ID do form JSF, ex: "form_acessarTurmaVirtual" */
  formId: string;
  /** ID do componente JSF extraído do onclick, necessário no POST */
  componentId: string | null;
}

/** Uma avaliação individual dentro de um bimestre */
export interface AvaliacaoInfo {
  /** Abreviação exibida no cabeçalho, ex: "PB", "EX" */
  abreviacao: string;
  /** Nome completo da avaliação, ex: "Prova Bimestral" */
  denominacao: string | null;
  /** Nota máxima, ex: 10.0 */
  notaMaxima: number | null;
  /** Peso da avaliação */
  peso: number | null;
  /** Nota do aluno; null se ainda não lançada ("--") */
  nota: number | null;
  /** ID da avaliação no banco (ex: "58338960") */
  avalId: string;
}

/** Um bimestre com suas avaliações */
export interface BimestreInfo {
  /** Nome do bimestre, ex: "1o. Bimestre", "R1" */
  nome: string;
  /** Avaliações individuais deste bimestre */
  avaliacoes: AvaliacaoInfo[];
  /** Nota do bimestre (coluna "Nota"); null se não lançada */
  nota: number | null;
}

/** Notas de uma turma para o aluno logado */
export interface NotasTurma {
  /** Nome da disciplina extraído do h3 da página */
  nomeDisciplina: string;
  /** Matrícula do aluno */
  matricula: string;
  /** Bimestres com suas avaliações */
  bimestres: BimestreInfo[];
  /** Nota do resultado final */
  resultado: number | null;
  /** Total de faltas (da coluna Faltas na tabela de notas) */
  faltas: number | null;
  /** Situação: "APROVADO", "REPROVADO", "--", etc. */
  situacao: string | null;
}

/** Situação de presença em uma aula */
export type SituacaoFrequencia = 'Presente' | 'Falta' | 'Não Registrada';

/** Registro de presença em uma aula */
export interface RegistroFrequencia {
  /** Data no formato dd/mm/aaaa */
  data: string;
  /** Situação de presença */
  situacao: SituacaoFrequencia;
}

/** Dados de frequência de uma turma */
export interface FrequenciaTurma {
  /** Todos os registros em ordem cronológica */
  registros: RegistroFrequencia[];
  /** Total de faltas (do texto "Total de Faltas: N") */
  totalFaltas: number;
  /** Total de aulas registradas */
  totalAulas: number;
  /** Percentual de presença calculado (0–100) */
  percentualPresenca: number;
}

/** Um bloco de horário decodificado */
export interface BlocoHorario {
  /** Número do dia (2=Seg … 7=Sáb) */
  dia: number;
  /** Nome abreviado do dia em pt-BR */
  diaNome: string;
  /** Turno: M=Manhã, T=Tarde, N=Noite */
  turno: 'M' | 'T' | 'N';
  /** Nome do turno em pt-BR */
  turnoNome: string;
  /** Números das aulas dentro do turno, ex: [1, 2] */
  aulas: number[];
}

/** Horário completamente decodificado */
export interface HorarioDecodificado {
  /** Código original, ex: "2T3 5T34" */
  codigoOriginal: string;
  /** Blocos de horário por dia/turno */
  blocos: BlocoHorario[];
  /** Resumo legível, ex: "Seg Tarde 3 | Qui Tarde 3-4" */
  resumo: string;
}

/** Um aviso/notícia de uma turma */
export interface AvisoTurma {
  /** Data e hora, ex: "25/06/2026 14:14" */
  data: string;
  /** Título do aviso */
  titulo: string;
}

/** Coleção completa de dados de todas as turmas */
export interface ColecaoCompleta {
  /** Timestamp de quando a coleta foi finalizada/atualizada */
  coletadoEm: number;
  /** Matrícula do aluno */
  matricula: string;
  /** Nome do aluno */
  nomeAluno: string;
  /** Todas as turmas do semestre */
  turmas: TurmaInfo[];
  /** Notas por turma, indexadas por idTurma */
  notas: Record<string, NotasTurma>;
  /** Frequência por turma, indexada por idTurma */
  frequencia: Record<string, FrequenciaTurma>;
  /** Versão do schema para invalidação de cache */
  versaoSchema: number;
}

/** Wrapper de cache com TTL */
export interface CacheEntry<T> {
  data: T;
  /** Timestamp de quando foi cacheado */
  cachedAt: number;
  /** TTL em milissegundos */
  ttl: number;
  /** Versão do schema */
  schemaVersion: number;
}

/** Informação de progresso da coleta */
export interface ProgressInfo {
  completed: number;
  total: number;
  currentCourseName: string;
  phase: 'notas' | 'frequencia' | 'navegando';
}

/** Opções para o orquestrador de coleta */
export interface CollectOptions {
  onProgress: (info: ProgressInfo) => void;
  onError: (error: string, courseName: string) => void;
  /**
   * Chamado após cada turma coletada com os dados acumulados até aquele ponto.
   * Permite atualizar o UI em tempo real sem esperar o fim da coleta.
   */
  onPartialData?: (
    notas: Record<string, NotasTurma>,
    frequencia: Record<string, FrequenciaTurma>,
  ) => void;
  signal: AbortSignal;
  /** Máximo de requisições HTTP. Padrão: 40 */
  maxRequests?: number;
  /** Matrícula do aluno (lida do portal) */
  matricula: string;
}
