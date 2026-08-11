# Política de Privacidade — betterUI para SIGAA (não-oficial)

Última atualização: 08/08/2026

## Resumo

Esta extensão **não coleta, não armazena em servidor e não transmite nenhum dado
para fora do seu navegador**. Não existe backend, banco de dados ou serviço de
terceiros associado a ela. Tudo o que a extensão faz acontece localmente, dentro
da sessão do SIGAA que você já tem aberta no seu navegador.

## O que a extensão faz

- Reestiliza e reorganiza visualmente páginas do SIGAA (CEFET-MG) que você já
  está vendo, usando apenas CSS e reordenação de elementos na tela.
- Quando você clica em "Atualizar", ela lê páginas do próprio SIGAA (notas,
  frequência, turmas) usando a sessão em que você já está autenticado, para
  montar um painel único com essas informações.
- Guarda esses dados **somente no armazenamento local do seu navegador**
  (`chrome.storage.local`) para exibição rápida e uso offline.

## O que a extensão nunca faz

- Nunca envia dados para nenhum servidor, API ou serviço externo — nem da
  extensão, nem de terceiros. Não há telemetria, analytics, nem qualquer
  chamada de rede fora do domínio `sig.cefetmg.br`.
- Nunca lê, guarda ou transmite sua senha ou qualquer credencial de login.
  Não preenche formulários de autenticação.
- Nunca faz login automático, nem mantém sua sessão viva além do que o
  próprio navegador já faz.
- Nunca realiza nenhuma ação que altere dados no SIGAA (matrícula,
  trancamento, envio de trabalho, avaliação institucional etc.) — a extensão
  é somente leitura.
- Nunca faz requisições em segundo plano. Toda coleta de dados só acontece
  quando você clica explicitamente em "Atualizar".

## Onde seus dados ficam

Exclusivamente no armazenamento local do seu navegador
(`chrome.storage.local`), associado ao seu próprio perfil. Esses dados:

- Não saem do seu computador.
- Não são sincronizados com nenhuma conta, nuvem ou outro dispositivo.
- Podem ser apagados a qualquer momento desinstalando a extensão.
- São apagados automaticamente quando a extensão detecta que você saiu do
  SIGAA (logout).

## Permissões solicitadas

A extensão solicita apenas a permissão `storage`, usada unicamente para
guardar localmente os dados acadêmicos já lidos das suas próprias páginas do
SIGAA, como descrito acima.

## Código aberto

O código-fonte completo desta extensão está disponível publicamente para
auditoria. Qualquer pessoa pode conferir que as afirmações acima são verdade
lendo o código.

## Contato

Dúvidas sobre esta política podem ser enviadas via issues no repositório do
projeto.
