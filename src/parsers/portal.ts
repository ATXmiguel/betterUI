/**
 * Parser do portal do aluno — função pura.
 *
 * Extrai nome e matrícula do aluno da página discente.jsf.
 *
 * Estruturas mapeadas:
 *   Nome:       span.nome > small > b > "NOME DO ALUNO"
 *   Matrícula:  table > tr > td "Matrícula:" > td irmão com o valor
 */

export interface PortalAluno {
  nome: string;
  matricula: string;
}

export function parsePortalAluno(html: string): PortalAluno | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Matrícula: procura td com texto "Matrícula:" e pega o td seguinte
  let matricula = '';
  const allTds = doc.querySelectorAll('td');
  for (let i = 0; i < allTds.length; i++) {
    const text = allTds[i]?.textContent?.trim() ?? '';
    if (text === 'Matrícula:') {
      matricula = allTds[i + 1]?.textContent?.trim() ?? '';
      break;
    }
  }

  if (!matricula) return null;

  // Nome: <span class="nome"> <small><b>NOME</b></small> </span>
  const nomeEl = doc.querySelector('span.nome b') ??
                 doc.querySelector('span.nome small') ??
                 doc.querySelector('#info-usuario');
  const nome = nomeEl?.textContent?.trim() ?? '';

  return { nome, matricula };
}

/**
 * Extrai o ViewState do HTML de qualquer página JSF.
 * Pura — não acessa DOM global.
 */
export function extractViewState(html: string): string | null {
  const match = html.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/);
  return match?.[1] ?? null;
}
