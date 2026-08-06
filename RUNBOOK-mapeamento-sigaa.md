# RUNBOOK — Mapeamento do SIGAA com Chrome DevTools MCP

Documento operacional. Siga na ordem. As seções 2 e 3 não são opcionais.

**Antes de tudo, preencha:**

```
DOMÍNIO DO SIGAA: ______________________   (ex.: sig.cefetmg.br)
```

Esse valor aparece em vários pontos do prompt. Se estiver errado, o cerco de segurança não funciona.

---

## 0. Pré-requisitos

- **Node.js recente** (LTS 22 resolve). Verifique com `node -v`.
- **Google Chrome estável instalado.** O suporte oficial do `chrome-devtools-mcp` é a Chrome e Chrome for Testing. Brave, Dolphin e afins não são suportados.
- **Claude Code** instalado e funcionando.

---

## 1. Instalação

Via linha de comando:

```bash
claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

Ou pelo plugin oficial em `claude.com/plugins/chrome-devtools-mcp` (mesmo servidor, instalação em um clique).

Confira as flags disponíveis na versão que você instalou:

```bash
npx chrome-devtools-mcp@latest --help
```

**Sobre o perfil do navegador:** por padrão o servidor sobe uma instância de Chrome com diretório de perfil próprio, separado do seu navegador do dia a dia. **É exatamente isso que queremos — não mude.**

Existe uma flag de isolamento total que apaga o perfil a cada execução. Não use: ela obrigaria você a relogar no SIGAA toda vez, e o isolamento que importa (não tocar no seu perfil pessoal) já vem por padrão.

**Nunca** aponte o servidor para o seu Chrome principal via porta de depuração remota. Isso daria a ele leitura de todos os cookies do seu navegador — e-mail, banco, tudo.

### Configuração do Claude Code

- **Mantenha os prompts de permissão ligados.** Não rode em modo de aceite automático nesta tarefa. Cada `click` e cada `navigate_page` deve passar por você.
- Rode em um diretório de projeto separado, com as pastas `docs/` e `tests/fixtures/` já criadas.

---

## 2. Preparação manual — você, não o agente

Faça isto **antes** de qualquer execução do agente. É a proteção mais importante do runbook, porque remove os perigos em vez de tentar desviar deles.

1. Abra o Chrome que o MCP subiu e **faça login no SIGAA você mesmo, digitando a senha**. O agente nunca toca em campo de senha.
2. **Limpe todos os interstícios pendentes.** O SIGAA costuma bloquear o portal com telas obrigatórias no primeiro acesso do período: avaliação institucional, atualização de dados cadastrais, aceite de termos, questionários. Responda ou dispense **todos** manualmente, até chegar ao portal limpo.
   Motivo: essas telas têm ações irreversíveis e ficam no caminho de tudo. Se sobrar uma, o agente vai esbarrar nela.
3. **Navegue você mesmo até o portal do aluno** e deixe o navegador parado nessa tela.
4. Confirme que **não há nenhuma outra aba aberta** e que **não há extensão instalada** nesse perfil.
5. Anote a **versão do SIGAA** no rodapé.

---

## 3. Bloco de segurança

Cole este bloco **no início de toda execução**, sem editar.

```
=============== PROTOCOLO DE SEGURANÇA — SIGAA ===============

Você está operando um sistema acadêmico real, com a conta pessoal do usuário.
Ações neste sistema geram registros IRREVERSÍVEIS no histórico escolar dele.
Você está em MODO SOMENTE LEITURA.

CERCO DE NAVEGAÇÃO
- Você só pode navegar dentro do domínio: <DOMÍNIO DO SIGAA>
- Se qualquer ação levar para fora desse domínio, PARE imediatamente e avise.
- Não abra abas novas. Não use janelas adicionais. A sessão do SIGAA é única e
  quebra com acesso concorrente.

FERRAMENTAS PROIBIDAS NESTE DOMÍNIO
- Nenhuma ferramenta de preenchimento de formulário (fill, fill_form)
- Nenhuma ferramenta de digitação em campo (type)
- Nenhuma ferramenta de upload de arquivo
- Nenhum evaluate_script que altere o DOM, dispare evento, submeta formulário
  ou chame função da página. evaluate_script é permitido APENAS para LER e
  retornar dados.

PROTOCOLO OBRIGATÓRIO ANTES DE CADA CLIQUE
Você nunca clica direto. Para cada clique, nesta ordem:
  1. take_snapshot
  2. Declare em texto: qual elemento vai clicar, o rótulo exato dele, e o que
     você espera que aconteça
  3. Verifique contra a LISTA VERMELHA abaixo
  4. Só então clique
Se você não consegue determinar com certeza o que um clique faz, NÃO CLIQUE.
Pergunte.

LISTA VERMELHA — nunca clicar em elemento cujo rótulo contenha ou sugira:
  Matricular · Confirmar · Enviar · Salvar · Gravar · Cadastrar · Alterar ·
  Atualizar dados · Trancar · Cancelar · Excluir · Remover · Finalizar ·
  Submeter · Avaliar · Responder · Solicitar · Assinar · Aceitar · Concordar ·
  Emitir · Gerar documento · Sair · Logout
Isso vale para botões, links, ícones e itens de menu.

ÁREAS PROIBIDAS — não entrar, mesmo que só para olhar:
  Matrícula on-line · Trancamento · Requerimentos · Avaliação Institucional ·
  Meus Dados Pessoais (edição) · Questionários · Solicitações · qualquer tela
  com formulário de envio

DIÁLOGOS
- Ao aparecer qualquer diálogo, alerta ou confirmação: sempre DISPENSAR /
  CANCELAR / FECHAR. Nunca aceitar, nunca confirmar.
- Depois de dispensar, informe ao usuário o que o diálogo dizia.

CREDENCIAIS
- Nunca preencha login ou senha. O usuário já está logado.
- Se cair na tela de login, PARE e avise. Não tente autenticar.
- Nunca inclua na sua resposta: valor de javax.faces.ViewState, JSESSIONID,
  qualquer cookie, ou qualquer token de sessão. Substitua por <REMOVIDO>.

RITMO E ORÇAMENTO
- Aguarde ~2 segundos entre ações.
- Máximo de 25 ações por execução. Ao atingir, pare e entregue o que tem.
- Duas falhas consecutivas de qualquer natureza: pare e reporte.

REGRA FINAL
Na dúvida entre continuar e parar, PARE. Um mapeamento incompleto é um
inconveniente. Um clique errado é um ato acadêmico registrado.

==============================================================
```

---

## 4. Prompt de execução — uma tela por vez

Cole o bloco de segurança acima, depois este. Substitua os campos entre `<>`.

```
TAREFA: mapear UMA tela do SIGAA para documentar sua estrutura e sua interface.

TELA ALVO: <nome da tela>
CAMINHO: <sequência exata de cliques a partir do portal do aluno>
PONTO DE PARTIDA: o navegador já está no portal do aluno, logado.

Execute nesta ordem.

--- PASSO 1: estado inicial ---
take_snapshot da tela atual.
Localize o link/botão que leva à tela alvo e transcreva o HTML dele por
inteiro, incluindo os atributos id, name, href e onclick, sem truncar.

--- PASSO 2: limpar o registro de rede ---
Rode list_network_requests para ver o estado atual. Vamos comparar depois.

--- PASSO 3: navegar ---
Aplique o protocolo de pré-clique. Declare o que vai clicar. Clique.
Aguarde a página carregar.

--- PASSO 4: capturar a requisição ---
list_network_requests. Identifique o POST (ou GET) que corresponde a este
clique — normalmente para uma URL .jsf.
get_network_request nesse item, e me entregue:
  - método e URL
  - corpo da requisição COMPLETO, campo por campo
  - substitua o valor de javax.faces.ViewState por <REMOVIDO>
  - substitua matrícula, CPF e nome por <MATRICULA>, <CPF>, <NOME>
Se houve mais de uma requisição relevante (AJAX subsequente), liste todas.

--- PASSO 5: estrutura da página ---
Rode evaluate_script com esta função de LEITURA (não altere nada nela):

() => ({
  url: location.href,
  titulo: document.title,
  rodape: document.body.innerText.match(/v\d+\.\d+[\d._r]*/)?.[0] ?? null,
  forms: [...document.forms].map(f => ({
    id: f.id, name: f.name, action: f.action, method: f.method
  })),
  hiddenNames: [...document.querySelectorAll('input[type=hidden]')]
    .map(i => i.name),
  tabelas: [...document.querySelectorAll('table')].map(t => ({
    id: t.id, classe: t.className, linhas: t.rows.length,
    cabecalho: t.rows[0]?.innerText.replace(/\s+/g,' ').slice(0,120)
  })),
  idsSemanticos: [...document.querySelectorAll('[id]')]
    .map(e => e.id).filter(id => !/^j_id/.test(id)).slice(0,120)
})

Entregue o resultado. NUNCA inclua valores de campos hidden — apenas os nomes.

--- PASSO 6: seletores ---
Para cada dado relevante da tela (nota, falta, disciplina, horário, prazo,
professor), monte a tabela:

| dado | seletor CSS candidato | id gerado? | âncora alternativa | observação |

Considere GERADO todo id que comece com "j_id", contenha sequência numérica
longa, ou não tenha significado semântico. Para cada um marcado como gerado,
proponha uma âncora estável: classe, texto de cabeçalho fixo, ou posição
relativa a um elemento com id semântico.

--- PASSO 7: HTML da região principal ---
Extraia por evaluate_script (leitura pura) o outerHTML do contêiner do
conteúdo principal — a tabela, a grade, o painel. NÃO a página inteira.
Anonimize antes de me entregar:
  nome do aluno        -> ALUNO EXEMPLO
  matrícula            -> 00000000
  CPF                  -> 000.000.000-00
  e-mail               -> exemplo@exemplo.com
  telefone             -> (00) 00000-0000
  src de foto          -> foto.jpg
  professores          -> PROFESSOR A, PROFESSOR B
  colegas              -> COLEGA A, COLEGA B
  notas e faltas       -> valores fictícios plausíveis
  ViewState / tokens   -> <REMOVIDO>

--- PASSO 8: capturas visuais ---
take_screenshot da tela inteira.
resize_page para 390x844 e take_screenshot de novo.
Volte ao tamanho anterior.

--- PASSO 9: crítica de interface ---
Em tópicos curtos e concretos:
  - o que está visualmente ruim e por quê (hierarquia, densidade, contraste,
    alinhamento, tipografia)
  - quantos cliques o aluno gasta desde o portal até a informação principal
  - o que aqui é ruído puro e poderia sumir sem perda
  - o que deveria estar visível e está escondido atrás de outro clique
  - o que quebra ou fica inutilizável na largura de 390px
  - alguma região carrega por AJAX depois do load? qual?

--- PASSO 10: ações de escrita presentes ---
Liste (SEM CLICAR) todos os botões/links desta tela que executam ações de
escrita. Para cada um: rótulo, e o que você acredita que ele faz.
Isso vai virar a lista de atalhos da extensão.

--- FORMATO DA ENTREGA ---
Markdown, passos numerados na ordem acima. HTML e JSON em bloco de código.
Onde não conseguir capturar algo, escreva "LACUNA: <motivo>".
Nunca invente seletor, id ou payload.
```

---

## 5. Depois de cada execução

1. **Leia o HTML entregue com os próprios olhos** e confirme a anonimização. Não terceirize essa conferência — é a única barreira antes do repositório público.
2. Confirme que nenhum valor de `ViewState`, cookie ou token vazou para a saída.
3. Salve em `tests/fixtures/T-0X-<slug>.html`.
4. Transcreva os passos 4, 5, 6 e 10 para o bloco correspondente em `docs/MAPEAMENTO.md`.
5. Guarde os screenshots e o passo 9 numa pasta separada — são insumo de design, não de código.
6. **Feche o contexto e comece uma execução nova para a próxima tela.** Contexto acumulado degrada a obediência ao protocolo de segurança exatamente quando você já parou de prestar atenção.

---

## 6. Ordem das telas

| # | Tela | Nota |
|---|---|---|
| 1 | Portal do aluno | sem passo 1–4 (você já está nela) |
| 2 | Lista de turmas | |
| 3 | Turma virtual — Notas | a mais importante do projeto |
| 4 | Turma virtual — Frequência | |
| 5 | Horário / grade | |
| 6 | Avisos | |
| 7 | Materiais da turma | |

Rode a **1 e a 3** primeiro e revise a saída antes de seguir. Se o formato do passo 4 vier truncado ou o passo 7 vier mal anonimizado, ajuste o prompt antes de queimar as outras cinco repetindo o mesmo erro.

---

## 7. Parada de emergência

Interrompa a execução na hora se:

- o agente clicar em algo que não declarou antes
- aparecer qualquer tela de confirmação que você não esperava
- o navegador sair do domínio do SIGAA
- aparecer a tela de login no meio da execução
- o agente pedir para preencher qualquer campo

Nesses casos: pare o Claude Code, volte ao navegador manualmente, confirme no
SIGAA que nenhuma alteração foi registrada, e só então retome.
