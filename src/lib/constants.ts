/**
 * Constantes compartilhadas entre arquivos.
 * Cada valor mora em UM lugar: se mudar aqui, muda em todo o projeto.
 */

/** Raiz do SIGAA do CEFET-MG. Único domínio com que a extensão fala (princípio nº 3). */
export const SIGAA_BASE = 'https://sig.cefetmg.br/sigaa';

/** Portal do aluno (o SIGAA reaproveita esta URL para a turma virtual). */
export const DISCENTE_URL = `${SIGAA_BASE}/portais/discente/discente.jsf`;

/** Versão do formato dos dados guardados no cache. Aumente ao mudar ColecaoCompleta ou CacheEntry. */
export const CACHE_SCHEMA_VERSION = 1;
