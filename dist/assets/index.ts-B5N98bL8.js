(function(){function kt(e){try{const t=e();t instanceof Promise&&t.catch(o=>{Ie(o)})}catch(t){Ie(t)}}function Ie(e){try{globalThis.__BETTERUI_DEBUG__&&console.debug("[betterUI] safe() caught:",e)}catch{}}const de="[betterUI]";let z=null;async function he(){if(z!==null)return z;try{z=(await chrome.storage.local.get("betterui_debug")).betterui_debug===!0}catch{z=!1}return z}const b={debug:async(...e)=>{await he()&&console.debug(de,...e)},warn:async(...e)=>{await he()&&console.warn(de,...e)},debugSync:(...e)=>{z&&console.debug(de,...e)}};async function Ct(){await he(),globalThis.__BETTERUI_DEBUG__=z}const Et=[{pattern:/\/sigaa\/portais\/discente\/discente\.jsf/,route:"portal"},{pattern:/\/sigaa\/ava\/index\.jsf/,route:"turma-notas"},{pattern:/\/sigaa\/ava\/FrequenciaAluno\/mapa\.jsf/,route:"turma-frequencia"},{pattern:/\/sigaa\/ava\/ArquivoTurma\/listar_discente\.jsf/,route:"turma-materiais"},{pattern:/\/sigaa\/ava\/NoticiaTurma\/listar\.jsf/,route:"turma-avisos"},{pattern:/\/sigaa\/ava\//,route:"turma-virtual"}];function At(){return document.getElementById("barraEsquerda")?document.querySelector('[id*="formNotas"]')?"turma-notas":document.querySelector('[id*="FrequenciaAluno"]')?"turma-frequencia":document.querySelector('[id*="ArquivoTurma"]')?"turma-materiais":document.querySelector('[id*="NoticiaTurma"]')?"turma-avisos":"turma-virtual":"portal"}function qt(e=location.href){for(const{pattern:t,route:o}of Et)if(t.test(e))return o==="portal"&&typeof document<"u"?At():o;return"unknown"}const D={conteudo:{id:"conteudo",descricao:"Container geral do conteúdo abaixo do menu",primario:"#conteudo",fallbacks:['div[id="conteudo"]'],valida:e=>e.children.length>0},noticias_portal:{id:"noticias_portal",descricao:"Seção de notícias institucionais (geralmente vazia)",primario:"#noticias-portal",fallbacks:['div[id="noticias-portal"]'],valida:e=>!0},turmas_portal:{id:"turmas_portal",descricao:"Seção com tabela de turmas do semestre",primario:"#turmas-portal",fallbacks:['div[id="turmas-portal"]'],valida:e=>e.querySelector("table")!==null},turmas_tabela:{id:"turmas_tabela",descricao:"Tabela de turmas dentro de #turmas-portal",primario:"#turmas-portal table",fallbacks:[],valida:e=>e.rows?.length>5},atualizacoes_turma:{id:"atualizacoes_turma",descricao:"Carrossel de últimas atualizações de turmas (AJAX, inutilizável)",primario:"#atualizacoes-turma",fallbacks:['div[id="atualizacoes-turma"]'],valida:e=>!0},form_atualizacoes:{id:"form_atualizacoes",descricao:"Form que envolve o carrossel de atualizações",primario:"#formAtualizacoesTurmas",fallbacks:['form[id="formAtualizacoesTurmas"]'],valida:e=>!0},forum_portal:{id:"forum_portal",descricao:"Seção do fórum do curso",primario:"#forum-portal",fallbacks:['div[id="forum-portal"]'],valida:e=>!0},painel_usuario:{id:"painel_usuario",descricao:"Bloco lateral com nome e dados do aluno",primario:"#painel-usuario",fallbacks:['div[id="painel-usuario"]'],valida:e=>!0},agenda_docente:{id:"agenda_docente",descricao:"Sidebar com dados do perfil (reusado do portal docente)",primario:"#agenda-docente",fallbacks:['div[id="agenda-docente"]'],valida:e=>!0},main_docente:{id:"main_docente",descricao:"Coluna principal do portal (reusada do portal docente)",primario:"#main-docente",fallbacks:['div[id="main-docente"]'],valida:e=>!0},rodape:{id:"rodape",descricao:"Rodapé com versão do sistema",primario:"#rodape",fallbacks:['div[id="rodape"]',"footer"],valida:e=>(e.textContent??"").length>0},menu_dropdown:{id:"menu_dropdown",descricao:"Barra de navegação principal (JSCookMenu) — Ensino, Pesquisa etc.",primario:"#menu-dropdown",fallbacks:['div[id="menu-dropdown"]'],valida:e=>!0},form_menu_turma:{id:"form_menu_turma",descricao:"Menu de navegação da turma virtual",primario:"#formMenu",fallbacks:['form[id="formMenu"]'],valida:e=>!0},tabela_notas:{id:"tabela_notas",descricao:"Tabela de notas — relatório com todos os alunos da turma",primario:".tabelaRelatorio",fallbacks:["table.tabelaRelatorio"],valida:e=>e.rows?.length>1},tabela_frequencia:{id:"tabela_frequencia",descricao:"Tabela de frequência com datas e situação de cada aula",primario:"table.listing",fallbacks:[],valida:e=>e.rows?.length>1},viewstate:{id:"viewstate",descricao:"Hidden input com javax.faces.ViewState (necessário para postbacks JSF)",primario:'input[name="javax.faces.ViewState"]',fallbacks:["#javax\\.faces\\.ViewState"],valida:e=>(e.value?.length??0)>0},nome_aluno:{id:"nome_aluno",descricao:"Nome do aluno logado no portal",primario:"span.nome b",fallbacks:["span.nome small",".info-docente .nome"],valida:e=>(e.textContent?.trim().length??0)>2},matricula_label:{id:"matricula_label",descricao:'Célula "Matrícula:" na tabela do perfil lateral (próxima td contém o valor)',primario:"#agenda-docente td",fallbacks:["#painel-usuario td","#conteudo td"],valida:e=>!0}};function F(e){try{const t=[e.primario,...e.fallbacks];for(const o of t){const n=document.querySelector(o);if(n&&e.valida(n))return n}}catch{}return null}const Tt="v4.17.0cefet178";function Nt(){try{const e=F(D.rodape);if(!e)return b.debugSync("version check: #rodape não encontrado"),"unknown";const o=(e.textContent??"").match(/v\d+\.\d+\.\d+[a-z]*\d*/i);if(!o)return b.debugSync("version check: string de versão não encontrada no rodapé"),"unknown";const n=o[0];return b.debugSync("version check: versão detectada =",n),n===Tt?"ok":"mismatch"}catch{return"unknown"}}const Z=[],ee=[];function ie(e,t){e&&(e.classList.add(t),Z.push({el:e,cls:t}))}function De(e,t,o){const n=e.parentNode,a=e.nextSibling;n&&(ee.push({node:e,parent:n,nextSibling:a}),t.insertBefore(e,o))}const ge=[],Fe=[],be=[],ve=[];function M(e,t,o){e&&(ge.push({el:e,prop:t,before:e.style.getPropertyValue(t)}),e.style.setProperty(t,o,"important"))}function Rt(){try{const e=document.getElementById("conteudo");if(!e)return;let t=e;for(;t&&t!==document.body;)M(t,"width","100%"),M(t,"max-width","100%"),M(t,"margin-left","0"),M(t,"margin-right","0"),t.hasAttribute("width")&&(t.setAttribute("data-sc-orig-width",t.getAttribute("width")??""),t.removeAttribute("width")),t=t.parentElement;M(document.body,"margin-left","0"),M(document.body,"margin-right","0"),M(document.body,"max-width","100%"),b.debugSync("fixFullWidth: largura expandida para 100%")}catch{}}const ye=[];function at(e){const t=/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(e);if(!t)return null;const o=Number(t[1]),n=Number(t[2]),a=Number(t[3]);return .299*o+.587*n+.114*a}function Mt(e){e.querySelectorAll("*").forEach(t=>{if(t.id.startsWith("betterui-"))return;const o=getComputedStyle(t);if(o.position==="absolute"||o.position==="fixed")return;const n=at(o.color);n!==null&&n>180&&t.style.setProperty("color","#004C84","important")})}function $e(e){if(e.id.startsWith("betterui-"))return;const t=getComputedStyle(e).position;if(t!=="absolute"&&t!=="fixed")return;e.style.setProperty("z-index","2147483000","important"),e.style.setProperty("background-color","#ffffff","important"),e.style.setProperty("box-shadow","0 4px 20px rgba(0,0,0,0.15)","important"),e.querySelectorAll("*").forEach(a=>{if(a.id.startsWith("betterui-"))return;a.style.setProperty("background-color","transparent","important");const r=getComputedStyle(a).color,i=at(r);(i===null||i>200)&&a.style.setProperty("color","#212529","important")});const o=e.querySelectorAll("tr");(o.length>0?o:e.querySelectorAll("td, a")).forEach(a=>{a.dataset.scHoverBound!=="true"&&(a.dataset.scHoverBound="true",a.addEventListener("mouseenter",()=>{a.style.setProperty("background-color","#f1f3f5","important")}),a.addEventListener("mouseleave",()=>{a.style.setProperty("background-color","transparent","important")}))})}function Pt(){try{document.querySelectorAll(".ThemeOfficeSubMenu").forEach($e);const e=F(D.menu_dropdown);if(e){Mt(e);let t=!1;const o=()=>{t||(t=!0,requestAnimationFrame(()=>{t=!1,document.querySelectorAll(".ThemeOfficeSubMenu").forEach($e)}))};e.addEventListener("mouseover",o),e.addEventListener("click",o),ye.push(()=>{e.removeEventListener("mouseover",o),e.removeEventListener("click",o)})}b.debugSync("watchNavDropdown: scan inicial de popups concluído")}catch{}}function It(){for(const e of ye)e();ye.length=0}function ze(e,t){if(document.body.classList.add("sc-reskin-active"),Z.push({el:document.body,cls:"sc-reskin-active"}),b.debugSync("reskin aplicado — rota:",e,"— versão:",t),Pt(),e==="portal"&&Rt(),t!=="ok"){b.debugSync("modo degradado — reordenação de DOM desativada");return}e==="portal"?Dt():(e==="turma-virtual"||e==="turma-notas"||e==="turma-frequencia"||e==="turma-materiais"||e==="turma-avisos")&&Lt()}function Dt(){const e=F(D.noticias_portal);if(e){const n=e.textContent??"";(n.includes("Não há notícias cadastradas")||n.trim().length===0)&&(ie(e,"sc-hidden"),b.debugSync("noticias-portal escondido (vazio)"))}const t=F(D.turmas_portal),o=F(D.conteudo);if(t&&o&&t.parentNode===o){const n=o.firstChild;n&&n!==t&&(De(t,o,n),b.debugSync("turmas-portal movido para acima da dobra"))}else if(t&&o)try{const n=t.parentNode;if(n&&n!==o&&n.parentNode===o){const a=o.firstChild;a&&a!==n&&(De(n,o,a),b.debugSync("wrapper de turmas-portal movido para acima da dobra"))}}catch{}He("Comunidades Virtuais"),He("Minhas atividades"),Ft()}function He(e){try{const t=document.querySelectorAll("#conteudo h3, #conteudo h4, #conteudo td.tituloTabelaDiscente, #conteudo .tituloSecao");for(const o of t)if((o.textContent?.trim()??"").toLowerCase().includes(e.toLowerCase())){const a=o.closest("fieldset")??o.closest(".portlet")??o.closest("div")??o.parentElement;a&&a.id!=="conteudo"&&(ie(a,"sc-hidden"),b.debugSync("seção escondida:",e));break}}catch{}}function Ft(){try{const e=F(D.turmas_tabela);if(!e)return;const t=e.rows;for(let o=1;o<t.length;o++){const n=t[o]?.cells[2];if(!n)continue;const a=n.textContent?.trim();if(a&&/^[\d]+[MTN][\d]+/.test(a)){const r=document.createElement("span");r.className="sc-horario-codigo",r.textContent=a,n.textContent="",n.appendChild(r)}}}catch{}}function $t(){M(document.getElementById("painelDadosUsuario"),"display","none")}function Le(){try{const e=document.querySelector("#barraEsquerda");if(!e)return;const t=e.querySelector(".rich-panelbar:not(.rich-panelbar-interior)");if(!t)return;const o=[...t.querySelectorAll(".rich-panelbar-content-exterior")].find(l=>l.style.display!=="none");if(!o)return;const n=e.clientHeight;if(n===0)return;const a=[...t.querySelectorAll(".rich-panelbar-header, .rich-panelbar-header-act")].filter(l=>getComputedStyle(l).display!=="none");let r=0;a.forEach(l=>{r+=l.offsetHeight});const i=e.querySelector('td[style*="painel_bg"]'),d=i?i.offsetHeight:0;M(t,"height",`${n}px`);const u=n-r-d-8,c=Math.max(80,u);M(o,"height","auto"),M(o,"max-height",`${c}px`),b.debugSync("layoutLeftSidebar: max-height =",String(c)),o.querySelectorAll("table, tbody, tr, td, a").forEach(l=>{M(l,"height","auto"),M(l,"overflow","visible")})}catch{}}function zt(){try{const e=document.querySelector("#barraEsquerda");if(!e)return;Le();const t=new MutationObserver(()=>{requestAnimationFrame(Le)});e.querySelectorAll(".rich-panelbar-content-exterior").forEach(o=>{t.observe(o,{attributes:!0,attributeFilter:["style"]})}),be.push(t)}catch{}}function Ht(){try{const e=document.querySelector(".topico-aula");if(!e)return;const t=e.parentElement,o=t?.parentElement;if(!t||!o)return;const n=[...o.children].filter(r=>r.querySelector(".topico-aula"));if(n.length<2)return;n.forEach(r=>{ee.push({node:r,parent:o,nextSibling:r.nextSibling})});const a=n[0];for(let r=n.length-1;r>=0;r--)o.insertBefore(n[r],a);b.debugSync("reverseTopics: invertidos",String(n.length),"tópicos")}catch{}}function Lt(){ie(document.body,"sc-layout-yui"),$t(),zt(),Ht(),Bt(),b.debugSync("applyTurmaVirtualReskin: concluído")}function Bt(){try{const e=["recurso não disponível","não há notícias cadastradas","nenhuma enquete disponível","nenhuma enquete encontrada","nenhuma avaliação disponível","nenhuma avaliação cadastrada","não há mensagens","não há mensagens cadastradas","não há atividades cadastradas"];document.querySelectorAll("#barraDireita .rich-stglpanel, #barraDireita .blocoDireita").forEach(t=>{const o=t.querySelector(".rich-stglpanel-body");if(!o)return;const n=(o.textContent??"").trim().toLowerCase();n.length!==0&&(o.querySelector("table, ul, ol, a, img")||e.some(a=>n.includes(a))&&(o.style.display="none",ve.push(o),ie(t,"sc-widget-empty"),b.debugSync("widget colapsado:",t.querySelector(".rich-stglpanel-header, .headerBloco")?.textContent?.trim())))})}catch{}}function Ot(){It();for(const e of be)e.disconnect();be.length=0;for(const e of ve)try{e.style.display=""}catch{}ve.length=0;for(const e of Fe)try{const t=e.getAttribute("data-sc-orig-html");t!==null&&(e.innerHTML=t,e.removeAttribute("data-sc-orig-html"))}catch{}Fe.length=0;for(const{node:e,parent:t,nextSibling:o}of[...ee].reverse())try{t.insertBefore(e,o)}catch{}ee.length=0;for(const{el:e,prop:t,before:o}of ge)try{o?e.style.setProperty(t,o):e.style.removeProperty(t)}catch{}ge.length=0;try{document.querySelectorAll("[data-sc-orig-width]").forEach(e=>{const t=e.getAttribute("data-sc-orig-width");t&&e.setAttribute("width",t),e.removeAttribute("data-sc-orig-width")})}catch{}for(const{el:e,cls:t}of Z)try{e.classList.remove(t)}catch{}Z.length=0,b.debugSync("reskin removido")}let U=null;function Ut(e,t,o){document.getElementById("betterui-toggle-host")?.remove(),U=document.createElement("div"),U.id="betterui-toggle-host",U.style.cssText=["position: fixed","bottom: 16px","right: 16px","z-index: 2147483647","all: initial","display: block"].join("; "),document.body.appendChild(U);const n=U.attachShadow({mode:"closed"}),a=document.createElement("style");a.textContent=`
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: 1.5px solid #dee2e6;
      border-radius: 8px;
      background: #ffffff;
      color: #212529;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: box-shadow 150ms ease, border-color 150ms ease, background 150ms ease;
      user-select: none;
      white-space: nowrap;
    }

    .btn:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-color: #adb5bd;
    }

    .btn:focus-visible {
      outline: 2px solid #1971c2;
      outline-offset: 2px;
    }

    .btn[aria-pressed="true"] {
      background: #d0ebff;
      border-color: #74c0fc;
      color: #1864ab;
    }

    .btn[aria-pressed="false"] {
      background: #f8f9fa;
      border-color: #dee2e6;
      color: #868e96;
    }

    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      background: #fff3bf;
      color: #e67700;
      line-height: 1.4;
    }

    @media (prefers-reduced-motion: reduce) {
      .btn {
        transition: none;
      }
    }

    @media (max-width: 480px) {
      .btn {
        padding: 6px 10px;
        font-size: 12px;
      }
    }
  `,n.appendChild(a);let r=e;const i=t!=="ok",d=t==="mismatch"?"Versão do SIGAA diferente da homologada — modo reduzido ativo":"Versão do SIGAA não reconhecida — modo reduzido ativo";function u(){const c=n.querySelector(".btn");c&&c.remove();const l=document.createElement("button");l.className="btn",l.type="button",l.setAttribute("role","switch"),l.setAttribute("aria-pressed",String(r)),l.setAttribute("aria-label",r?"betterUI ativo — clique para desativar":"betterUI inativo — clique para ativar"),l.setAttribute("title",r?"Desativar betterUI":"Ativar betterUI");const m=r?"✓":"✕";if(l.appendChild(document.createTextNode(`betterUI ${m}`)),i){const s=document.createElement("span");s.className="badge",s.title=d,s.textContent="!",s.setAttribute("aria-label",d),l.appendChild(s)}l.addEventListener("click",()=>{r=!r,o(r),u(),b.debugSync("toggle:",r?"ativado":"desativado")}),n.appendChild(l)}u(),b.debugSync("toggle montado — enabled:",e,"— versionStatus:",t)}var ce,S,rt,I,Be,st,it,ue,J,j,ct,Te,xe,we,te={},oe=[],Vt=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,le=Array.isArray;function P(e,t){for(var o in t)e[o]=t[o];return e}function Ne(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function lt(e,t,o){var n,a,r,i={};for(r in t)r=="key"?n=t[r]:r=="ref"?a=t[r]:i[r]=t[r];if(arguments.length>2&&(i.children=arguments.length>3?ce.call(arguments,2):o),typeof e=="function"&&e.defaultProps!=null)for(r in e.defaultProps)i[r]===void 0&&(i[r]=e.defaultProps[r]);return Q(e,i,n,a,null)}function Q(e,t,o,n,a){var r={type:e,props:t,key:o,ref:n,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:a??++rt,__i:-1,__u:0};return a==null&&S.vnode!=null&&S.vnode(r),r}function O(e){return e.children}function Y(e,t){this.props=e,this.context=t}function L(e,t){if(t==null)return e.__?L(e.__,e.__i+1):null;for(var o;t<e.__k.length;t++)if((o=e.__k[t])!=null&&o.__e!=null)return o.__e;return typeof e.type=="function"?L(e):null}function jt(e){if(e.__P&&e.__d){var t=e.__v,o=t.__e,n=[],a=[],r=P({},t);r.__v=t.__v+1,S.vnode&&S.vnode(r),Re(e.__P,r,t,e.__n,e.__P.namespaceURI,32&t.__u?[o]:null,n,o??L(t),!!(32&t.__u),a),r.__v=t.__v,r.__.__k[r.__i]=r,mt(n,r,a),t.__e=t.__=null,r.__e!=o&&dt(r)}}function dt(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),dt(e)}function Oe(e){(!e.__d&&(e.__d=!0)&&I.push(e)&&!ne.__r++||Be!=S.debounceRendering)&&((Be=S.debounceRendering)||st)(ne)}function ne(){try{for(var e,t=1;I.length;)I.length>t&&I.sort(it),e=I.shift(),t=I.length,jt(e)}finally{I.length=ne.__r=0}}function ut(e,t,o,n,a,r,i,d,u,c,l){var m,s,f,v,h,g,y=n&&n.__k||oe,_=t.length;for(u=Wt(o,t,y,u,_),m=0;m<_;m++)(f=o.__k[m])!=null&&(s=f.__i!=-1&&y[f.__i]||te,f.__i=m,g=Re(e,f,s,a,r,i,d,u,c,l),v=f.__e,f.ref&&s.ref!=f.ref&&(s.ref&&Me(s.ref,null,f),l.push(f.ref,f.__c||v,f)),h==null&&v!=null&&(h=v),4&f.__u?(u=ft(f,u,e),s.__e&&(s.__e=null)):typeof f.type=="function"&&g!==void 0?u=g:v&&(u=v.nextSibling),f.__u&=-7);return o.__e=h,u}function Wt(e,t,o,n,a){var r,i,d,u,c,l=o.length,m=l,s=0;for(e.__k=new Array(a),r=0;r<a;r++)(i=t[r])!=null&&typeof i!="boolean"&&typeof i!="function"?(typeof i=="string"||typeof i=="number"||typeof i=="bigint"||i.constructor==String?i=e.__k[r]=Q(null,i,null,null,null):le(i)?i=e.__k[r]=Q(O,{children:i},null,null,null):i.constructor===void 0&&i.__b>0?i=e.__k[r]=Q(i.type,i.props,i.key,i.ref?i.ref:null,i.__v):e.__k[r]=i,u=r+s,i.__=e,i.__b=e.__b+1,d=null,(c=i.__i=Gt(i,o,u,m))!=-1&&(m--,(d=o[c])&&(d.__u|=2)),d==null||d.__v==null?(c==-1&&(a>l?s--:a<l&&s++),typeof i.type!="function"&&(i.__u|=4)):c!=u&&(c==u-1?s--:c==u+1?s++:(c>u?s--:s++,i.__u|=4))):e.__k[r]=null;if(m)for(r=0;r<l;r++)(d=o[r])!=null&&!(2&d.__u)&&(d.__e==n&&(n=L(d)),ht(d,d));return n}function ft(e,t,o){var n,a;if(typeof e.type=="function"){for(n=e.__k,a=0;n&&a<n.length;a++)n[a]&&(n[a].__=e,t=ft(n[a],t,o));return t}e.__e!=t&&(t&&e.type&&!t.parentNode&&(t=L(e)),t=o.insertBefore(e.__e,t||null));do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function Gt(e,t,o,n){var a,r,i,d=e.key,u=e.type,c=t[o],l=c!=null&&(2&c.__u)==0;if(c===null&&d==null||l&&d==c.key&&u==c.type)return o;if(n>(l?1:0)){for(a=o-1,r=o+1;a>=0||r<t.length;)if((c=t[i=a>=0?a--:r++])!=null&&!(2&c.__u)&&d==c.key&&u==c.type)return i}return-1}function Ue(e,t,o){t[0]=="-"?e.setProperty(t,o??""):e[t]=o==null?"":typeof o!="number"||Vt.test(t)?o:o+"px"}function X(e,t,o,n,a){var r,i;e:if(t=="style")if(typeof o=="string")e.style.cssText=o;else{if(typeof n=="string"&&(e.style.cssText=n=""),n)for(t in n)o&&t in o||Ue(e.style,t,"");if(o)for(t in o)n&&o[t]==n[t]||Ue(e.style,t,o[t])}else if(t[0]=="o"&&t[1]=="n")r=t!=(t=t.replace(ct,"$1")),i=t.toLowerCase(),t=i in e||t=="onFocusOut"||t=="onFocusIn"?i.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+r]=o,o?n?o[j]=n[j]:(o[j]=Te,e.addEventListener(t,r?we:xe,r)):e.removeEventListener(t,r?we:xe,r);else{if(a=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=o??"";break e}catch{}typeof o=="function"||(o==null||o===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&o==1?"":o))}}function Ve(e){return function(t){if(this.l){var o=this.l[t.type+e];if(t[J]==null)t[J]=Te++;else if(t[J]<o[j])return;return o(S.event?S.event(t):t)}}}function Re(e,t,o,n,a,r,i,d,u,c){var l,m,s,f,v,h,g,y,_,x,N,R,w,k,A,$,q=t.type;if(t.constructor!==void 0)return null;128&o.__u&&(u=!!(32&o.__u),r=[d=t.__e=o.__e]),(l=S.__b)&&l(t);e:if(typeof q=="function"){m=i.length;try{if(_=t.props,x=q.prototype&&q.prototype.render,N=(l=q.contextType)&&n[l.__c],R=l?N?N.props.value:l.__:n,o.__c?y=(s=t.__c=o.__c).__=s.__E:(x?t.__c=s=new q(_,R):(t.__c=s=new Y(_,R),s.constructor=q,s.render=Jt),N&&N.sub(s),s.state||(s.state={}),s.__n=n,f=s.__d=!0,s.__h=[],s._sb=[]),x&&s.__s==null&&(s.__s=s.state),x&&q.getDerivedStateFromProps!=null&&(s.__s==s.state&&(s.__s=P({},s.__s)),P(s.__s,q.getDerivedStateFromProps(_,s.__s))),v=s.props,h=s.state,s.__v=t,f)x&&q.getDerivedStateFromProps==null&&s.componentWillMount!=null&&s.componentWillMount(),x&&s.componentDidMount!=null&&s.__h.push(s.componentDidMount);else{if(x&&q.getDerivedStateFromProps==null&&_!==v&&s.componentWillReceiveProps!=null&&s.componentWillReceiveProps(_,R),t.__v==o.__v||!s.__e&&s.shouldComponentUpdate!=null&&s.shouldComponentUpdate(_,s.__s,R)===!1){t.__v!=o.__v&&(s.props=_,s.state=s.__s,s.__d=!1),t.__e=o.__e,t.__k=o.__k,t.__k.some(function(T){T&&(T.__=t)}),oe.push.apply(s.__h,s._sb),s._sb=[],s.__h.length&&i.push(s),d=L(o);break e}s.componentWillUpdate!=null&&s.componentWillUpdate(_,s.__s,R),x&&s.componentDidUpdate!=null&&s.__h.push(function(){s.componentDidUpdate(v,h,g)})}if(s.context=R,s.props=_,s.__P=e,s.__e=!1,w=S.__r,k=0,x)s.state=s.__s,s.__d=!1,w&&w(t),l=s.render(s.props,s.state,s.context),oe.push.apply(s.__h,s._sb),s._sb=[];else do s.__d=!1,w&&w(t),l=s.render(s.props,s.state,s.context),s.state=s.__s;while(s.__d&&++k<25);s.state=s.__s,s.getChildContext!=null&&(n=P(P({},n),s.getChildContext())),x&&!f&&s.getSnapshotBeforeUpdate!=null&&(g=s.getSnapshotBeforeUpdate(v,h)),A=l!=null&&l.type===O&&l.key==null?_t(l.props.children):l,d=ut(e,le(A)?A:[A],t,o,n,a,r,i,d,u,c),s.base=t.__e,t.__u&=-161,s.__h.length&&i.push(s),y&&(s.__E=s.__=null)}catch(T){if(i.length=m,t.__v=null,u||r!=null){if(T.then){for(t.__u|=u?160:128;d&&d.nodeType==8&&d.nextSibling;)d=d.nextSibling;r!=null&&(r[r.indexOf(d)]=null),t.__e=d}else if(r!=null)for($=r.length;$--;)Ne(r[$])}else t.__e=o.__e;t.__k==null&&(t.__k=o.__k||[]),T.then||pt(t),S.__e(T,t,o)}}else r==null&&t.__v==o.__v?(t.__k=o.__k,t.__e=o.__e):d=t.__e=Xt(o.__e,t,o,n,a,r,i,u,c);return(l=S.diffed)&&l(t),128&t.__u?void 0:d}function pt(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(pt))}function mt(e,t,o){for(var n=0;n<o.length;n++)Me(o[n],o[++n],o[++n]);S.__c&&S.__c(t,e),e.some(function(a){try{e=a.__h,a.__h=[],e.some(function(r){r.call(a)})}catch(r){S.__e(r,a.__v)}})}function _t(e){return typeof e!="object"||e==null||e.__b>0?e:le(e)?e.map(_t):e.constructor!==void 0?null:P({},e)}function Xt(e,t,o,n,a,r,i,d,u){var c,l,m,s,f,v,h,g=o.props||te,y=t.props,_=t.type;if(_=="svg"?a="http://www.w3.org/2000/svg":_=="math"?a="http://www.w3.org/1998/Math/MathML":a||(a="http://www.w3.org/1999/xhtml"),r!=null){for(c=0;c<r.length;c++)if((f=r[c])&&"setAttribute"in f==!!_&&(_?f.localName==_:f.nodeType==3)){e=f,r[c]=null;break}}if(e==null){if(_==null)return document.createTextNode(y);e=document.createElementNS(a,_,y.is&&y),d&&(S.__m&&S.__m(t,r),d=!1),r=null}if(_==null)g===y||d&&e.data==y||(e.data=y);else{if(r=_=="textarea"&&y.defaultValue!=null?null:r&&ce.call(e.childNodes),!d&&r!=null)for(g={},c=0;c<e.attributes.length;c++)g[(f=e.attributes[c]).name]=f.value;for(c in g)f=g[c],c=="dangerouslySetInnerHTML"?m=f:c=="children"||c in y||c=="value"&&"defaultValue"in y||c=="checked"&&"defaultChecked"in y||X(e,c,null,f,a);for(c in y)f=y[c],c=="children"?s=f:c=="dangerouslySetInnerHTML"?l=f:c=="value"?v=f:c=="checked"?h=f:d&&typeof f!="function"||g[c]===f||X(e,c,f,g[c],a);if(l)d||m&&(l.__html==m.__html||l.__html==e.innerHTML)||(e.innerHTML=l.__html),t.__k=[];else if(m&&(e.innerHTML=""),ut(t.type=="template"?e.content:e,le(s)?s:[s],t,o,n,_=="foreignObject"?"http://www.w3.org/1999/xhtml":a,r,i,r?r[0]:o.__k&&L(o,0),d,u),r!=null)for(c=r.length;c--;)Ne(r[c]);d&&_!="textarea"||(c="value",_=="progress"&&v==null?e.removeAttribute("value"):v!=null&&(v!==e[c]||_=="progress"&&!v||_=="option"&&v!=g[c])&&X(e,c,v,g[c],a),c="checked",h!=null&&h!=e[c]&&X(e,c,h,g[c],a))}return e}function Me(e,t,o){try{if(typeof e=="function"){var n=typeof e.__u=="function";n&&e.__u(),n&&t==null||(e.__u=e(t))}else e.current=t}catch(a){S.__e(a,o)}}function ht(e,t,o){var n,a;if(S.unmount&&S.unmount(e),(n=e.ref)&&(n.current&&n.current!=e.__e||Me(n,null,t)),(n=e.__c)!=null){if(n.componentWillUnmount)try{n.componentWillUnmount()}catch(r){S.__e(r,t)}n.base=n.__P=n.__n=null}if(n=e.__k)for(a=0;a<n.length;a++)n[a]&&ht(n[a],t,o||typeof e.type!="function");o||Ne(e.__e),e.__c=e.__=e.__e=void 0}function Jt(e,t,o){return this.constructor(e,o)}function je(e,t,o){var n,a,r,i;t==document&&(t=document.documentElement),S.__&&S.__(e,t),a=(n=!1)?null:t.__k,r=[],i=[],Re(t,e=t.__k=lt(O,null,[e]),a||te,te,t.namespaceURI,a?null:t.firstChild?ce.call(t.childNodes):null,r,a?a.__e:t.firstChild,n,i),mt(r,e,i),e.props.children=null}ce=oe.slice,S={__e:function(e,t,o,n){for(var a,r,i;t=t.__;)if((a=t.__c)&&!a.__)try{if((r=a.constructor)&&r.getDerivedStateFromError!=null&&(a.setState(r.getDerivedStateFromError(e)),i=a.__d),a.componentDidCatch!=null&&(a.componentDidCatch(e,n||{}),i=a.__d),i)return a.__E=a}catch(d){e=d}throw e}},rt=0,Y.prototype.setState=function(e,t){var o;o=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=P({},this.state),typeof e=="function"&&(e=e(P({},o),this.props)),e&&P(o,e),e!=null&&this.__v&&(t&&this._sb.push(t),Oe(this))},Y.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),Oe(this))},Y.prototype.render=O,I=[],st=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,it=function(e,t){return e.__v.__b-t.__v.__b},ne.__r=0,ue=Math.random().toString(8),J="__d"+ue,j="__a"+ue,ct=/(PointerCapture)$|Capture$/i,Te=0,xe=Ve(!1),we=Ve(!0);var Qt=0;function p(e,t,o,n,a,r){t||(t={});var i,d,u=t;if("ref"in u)for(d in u={},t)d=="ref"?i=t[d]:u[d]=t[d];var c={type:e,props:u,key:o,ref:i,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--Qt,__i:-1,__u:0,__source:a,__self:r};if(typeof e=="function"&&(i=e.defaultProps))for(d in i)u[d]===void 0&&(u[d]=i[d]);return S.vnode&&S.vnode(c),c}var W,C,fe,We,G=0,gt=[],E=S,Ge=E.__b,Xe=E.__r,Je=E.diffed,Qe=E.__c,Ye=E.unmount,Ke=E.__;function Pe(e,t){E.__h&&E.__h(C,e,G||t),G=0;var o=C.__H||(C.__H={__:[],__h:[]});return e>=o.__.length&&o.__.push({}),o.__[e]}function V(e){return G=1,Yt(yt,e)}function Yt(e,t,o){var n=Pe(W++,2);if(n.t=e,!n.__c&&(n.__=[yt(void 0,t),function(d){var u=n.__N?n.__N[0]:n.__[0],c=n.t(u,d);u!==c&&(n.__N=[c,n.__[1]],n.__c.setState({}))}],n.__c=C,!C.__f)){var a=function(d,u,c){if(!n.__c.__H)return!0;var l=!1,m=n.__c.props!==d;if(n.__c.__H.__.some(function(f){if(f.__N){l=!0;var v=f.__[0];f.__=f.__N,f.__N=void 0,v!==f.__[0]&&(m=!0)}}),r){var s=r.call(this,d,u,c);return l?s||m:s}return!l||m};C.__f=!0;var r=C.shouldComponentUpdate,i=C.componentWillUpdate;C.componentWillUpdate=function(d,u,c){if(this.__e){var l=r;r=void 0,a(d,u,c),r=l}i&&i.call(this,d,u,c)},C.shouldComponentUpdate=a}return n.__N||n.__}function Kt(e,t){var o=Pe(W++,3);!E.__s&&vt(o.__H,t)&&(o.__=e,o.u=t,C.__H.__h.push(o))}function Zt(e){return G=5,bt(function(){return{current:e}},[])}function bt(e,t){var o=Pe(W++,7);return vt(o.__H,t)&&(o.__=e(),o.__H=t,o.__h=e),o.__}function pe(e,t){return G=8,bt(function(){return e},t)}function eo(){for(var e;e=gt.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(K),t.__h.some(Se),t.__h=[]}catch(o){t.__h=[],E.__e(o,e.__v)}}}E.__b=function(e){C=null,Ge&&Ge(e)},E.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Ke&&Ke(e,t)},E.__r=function(e){Xe&&Xe(e),W=0;var t=(C=e.__c).__H;t&&(fe===C?(t.__h=[],C.__h=[],t.__.some(function(o){o.__N&&(o.__=o.__N),o.u=o.__N=void 0})):(t.__h.some(K),t.__h.some(Se),t.__h=[],W=0)),fe=C},E.diffed=function(e){Je&&Je(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(gt.push(t)!==1&&We===E.requestAnimationFrame||((We=E.requestAnimationFrame)||to)(eo)),t.__H.__.some(function(o){o.u&&(o.__H=o.u,o.u=void 0)})),fe=C=null},E.__c=function(e,t){t.some(function(o){try{o.__h.some(K),o.__h=o.__h.filter(function(n){return!n.__||Se(n)})}catch(n){t.some(function(a){a.__h&&(a.__h=[])}),t=[],E.__e(n,o.__v)}}),Qe&&Qe(e,t)},E.unmount=function(e){Ye&&Ye(e);var t,o=e.__c;o&&o.__H&&(o.__H.__.some(function(n){try{K(n)}catch(a){t=a}}),o.__H=void 0,t&&E.__e(t,o.__v))};var Ze=typeof requestAnimationFrame=="function";function to(e){var t,o=function(){clearTimeout(n),Ze&&cancelAnimationFrame(t),setTimeout(e)},n=setTimeout(o,35);Ze&&(t=requestAnimationFrame(o))}function K(e){var t=C,o=e.__c;typeof o=="function"&&(e.__c=void 0,o()),C=t}function Se(e){var t=C;e.__c=e.__(),C=t}function vt(e,t){return!e||e.length!==t.length||t.some(function(o,n){return o!==e[n]})}function yt(e,t){return typeof t=="function"?t(e):t}function oo(e){return e.includes("Entrar no Sistema")||e.includes("verTelaLogin.do")||e.includes("login.jsf")||e.includes("Sua sessão expirou")||e.includes("sessão expirou")||e.includes("Usuário não autenticado")}function et(e,t){try{const n=new DOMParser().parseFromString(e,"text/html").querySelectorAll("#formMenu a[onclick]");for(const a of n)if(a.textContent?.trim()===t)return(a.getAttribute("onclick")??"").match(/'(formMenu:[^']+)':'(formMenu:[^']+)'/)?.[1]??null}catch{}return null}class no{lastRequestTime=0;consecutiveFailures=0;requestCount=0;aborted=!1;MIN_DELAY_MS=800;MAX_CONSECUTIVE_FAILURES=2;maxRequests;signal;constructor(t){this.signal=t.signal,this.maxRequests=t.maxRequests??40,this.signal.addEventListener("abort",()=>{this.aborted=!0})}get remainingRequests(){return this.maxRequests-this.requestCount}get totalRequests(){return this.requestCount}async fetchPage(t,o){this.checkAbort(),this.checkBudget(),this.checkCircuitBreaker();const n=Date.now()-this.lastRequestTime;n<this.MIN_DELAY_MS&&await this.delay(this.MIN_DELAY_MS-n),this.checkAbort(),this.requestCount++,this.lastRequestTime=Date.now(),b.debugSync(`fetch [${this.requestCount}/${this.maxRequests}]:`,t);try{const a=await fetch(t,{...o,signal:this.signal,credentials:"same-origin"});if(!a.ok&&a.status!==200)throw new Error(`HTTP ${a.status}`);const r=await a.text();if(oo(r))throw new ke;return this.consecutiveFailures=0,r}catch(a){throw a instanceof ke||a instanceof DOMException&&a.name==="AbortError"||(this.consecutiveFailures++,b.debugSync("fetch error (consecutivas:",this.consecutiveFailures,"):",a)),a}}async postJSF(t,o,n,a){const r=new URLSearchParams;r.set(o,o);for(const[u,c]of Object.entries(n))r.set(u,c);r.set("javax.faces.ViewState",a);const i=await this.fetchPage(t,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:r.toString(),redirect:"follow"}),d=B(i);return d||b.debugSync("ViewState não encontrado na resposta do POST"),{html:i,viewState:d??a}}checkAbort(){if(this.aborted||this.signal.aborted)throw new DOMException("Aborted","AbortError")}checkBudget(){if(this.requestCount>=this.maxRequests)throw new xt}checkCircuitBreaker(){if(this.consecutiveFailures>=this.MAX_CONSECUTIVE_FAILURES)throw new wt}delay(t){return new Promise((o,n)=>{const a=setTimeout(o,t);this.signal.addEventListener("abort",()=>{clearTimeout(a),n(new DOMException("Aborted","AbortError"))},{once:!0})})}}class ke extends Error{constructor(){super("SESSION_EXPIRED"),this.name="SessionExpiredError"}}class xt extends Error{constructor(){super("MAX_REQUESTS_EXCEEDED"),this.name="BudgetExceededError"}}class wt extends Error{constructor(){super("CIRCUIT_BREAKER_OPEN"),this.name="CircuitBreakerError"}}function B(e){return e.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/)?.[1]??null}const ao={2:"Seg",3:"Ter",4:"Qua",5:"Qui",6:"Sex",7:"Sáb"},ro={M:"Manhã",T:"Tarde",N:"Noite"};function so(e){const t=e.trim();if(!t)return{codigoOriginal:t,blocos:[],resumo:""};const o=t.split(/\s+/),n=[];for(const r of o){const i=r.match(/^(\d+)([MTN])(\d+)$/i);if(!i)continue;const[,d,u,c]=i,l=u.toUpperCase(),m=[...c].map(Number);for(const s of d){const f=parseInt(s,10);f<2||f>7||n.push({dia:f,diaNome:ao[f]??`Dia${f}`,turno:l,turnoNome:ro[l]??l,aulas:m})}}n.sort((r,i)=>r.dia-i.dia||(r.aulas[0]??0)-(i.aulas[0]??0));const a=n.map(r=>`${r.diaNome} ${r.turnoNome} ${r.aulas.join("-")}`).join(" | ");return{codigoOriginal:t,blocos:n,resumo:a}}function io(e){return[...new DOMParser().parseFromString(e,"text/html").querySelectorAll('form[id^="form_acessarTurmaVirtual"]')].map(n=>{const a=n.querySelector("a[onclick]"),r=a?.getAttribute("onclick")??"",d=r.match(/'frontEndIdTurma':'([0-9A-Fa-f]{40})'/)?.[1]??null,c=r.match(/'([^']+)':'[^']*','frontEndIdTurma'/)?.[1]??null,l=a?.textContent?.trim()??"",m=n.closest("tr"),s=m?[...m.querySelectorAll("td.info")]:[],f=s[0]?.textContent?.trim()||null,v=s[1]?.textContent?.trim()||null,y=m?.nextElementSibling?.querySelector('[id^="linha_"]')?.id?.replace("linha_","")??null;return{nome:l,local:f,horarioCodigo:v,horarioDecodificado:v?so(v):null,frontEndIdTurma:d,idTurma:y,formId:n.id,componentId:c}})}function me(e){const t=e.trim().replace(",",".");if(t==="--"||t===""||t==="-")return null;const o=parseFloat(t);return isNaN(o)?null:o}function co(e,t){const o=new DOMParser().parseFromString(e,"text/html"),n=o.querySelector("table.tabelaRelatorio");if(!n)return null;const a=o.querySelector("h3")?.textContent?.trim()??"",r=o.querySelector("#trAval"),i=[],d=r?[...r.children]:[];let u=0;for(i.push({type:"skip"}),i.push({type:"skip"});u<d.length;){const w=d[u];if(w.tagName==="TH"){const k=w.id;if(k?.startsWith("aval_")){const A=k.replace("aval_",""),$=o.getElementById(`denAval_${A}`),q=o.getElementById(`notaAval_${A}`),T=o.getElementById(`pesoAval_${A}`);i.push({type:"aval",aval:{abreviacao:w.textContent?.trim()??"",denominacao:$?.value??null,notaMaxima:q&&parseFloat(q.value)||null,peso:T&&parseFloat(T.value)||null,nota:null,avalId:A}})}else if(k==="unid"||w.textContent?.trim()==="Nota")i.push({type:"unid"});else if(w.textContent?.trim()===""&&!k){u++;continue}else i.push({type:"skip"})}u++}const c=n.querySelector("thead tr:first-child"),l=c?[...c.querySelectorAll("th")]:[],m=[];let s=2;for(const w of l){const k=w.textContent?.trim()??"";if(k==="Matrícula"||k==="Nome")continue;if(k==="Resultado"||k==="Faltas"||k==="Sit.")break;const A=parseInt(w.getAttribute("colspan")??"1",10);m.push({nome:k,startCol:s,colCount:A}),s+=A}const f=n.querySelector("tbody");if(!f)return null;const v=f.querySelectorAll("tr");let h=null;for(const w of v)if(w.querySelector("td")?.textContent?.trim()===t.trim()){h=w;break}if(!h)return null;const g=[...h.querySelectorAll("td")];for(let w=2;w<i.length&&w<g.length;w++){const k=i[w],A=g[w]?.textContent?.trim()??"";k.type==="aval"&&k.aval&&(k.aval.nota=me(A))}const y=g.slice(-3),_=me(y[0]?.textContent?.trim()??""),x=parseInt(y[1]?.textContent?.trim()??"",10)||null,N=y[2]?.textContent?.trim()||null,R=[];for(const w of m){const A=i.slice(w.startCol,w.startCol+w.colCount).filter(T=>T.type==="aval"&&!!T.aval).map(T=>({...T.aval})),$=g[w.startCol+w.colCount-1],q=me($?.textContent?.trim()??"");R.push({nome:w.nome,avaliacoes:A,nota:q})}return{nomeDisciplina:a,matricula:t.trim(),bimestres:R,resultado:_,faltas:x,situacao:N}}function lo(e){const t=new DOMParser().parseFromString(e,"text/html"),o=t.querySelector("table.listing");if(!o)return null;const n=o.querySelectorAll("tbody tr"),a=[];for(const s of n){const f=s.querySelectorAll("td");if(f.length<2)continue;const v=f[0]?.textContent?.trim()??"",h=f[1]?.textContent?.trim()??"";if(!v)continue;let g="Presente";h.includes("Falta")?g="Falta":(h.includes("Não Registrada")||h.includes("Nao Registrada"))&&(g="Não Registrada"),a.push({data:v,situacao:g})}const i=(t.body?.textContent??"").match(/Total de Faltas:\s*(\d+)/),d=i?parseInt(i[1],10):0,u=a.length,c=a.filter(s=>s.situacao==="Presente").length,l=a.filter(s=>s.situacao!=="Não Registrada").length,m=l>0?c/l*100:100;return{registros:a,totalFaltas:d,totalAulas:u,percentualPresenca:m}}function uo(e){const t=new DOMParser().parseFromString(e,"text/html");let o="";const n=t.querySelectorAll("td");for(let i=0;i<n.length;i++)if((n[i]?.textContent?.trim()??"")==="Matrícula:"){o=n[i+1]?.textContent?.trim()??"";break}return o?{nome:(t.querySelector("span.nome b")??t.querySelector("span.nome small")??t.querySelector("#info-usuario"))?.textContent?.trim()??"",matricula:o}:null}const ae="betterui_cache_v1",St=1,fo=24*60*60*1e3;async function tt(e){const t={data:e,cachedAt:Date.now(),ttl:fo,schemaVersion:St};await chrome.storage.local.set({[ae]:t}),b.debugSync("cache: colecao salva — turmas:",e.turmas.length)}async function Ce(){try{const t=(await chrome.storage.local.get(ae))[ae];return t?t.schemaVersion!==St?(b.debugSync("cache: schema version mudou, invalidando"),await re(),null):Date.now()-t.cachedAt>t.ttl?(b.debugSync("cache: TTL expirado, invalidando"),await re(),null):(b.debugSync("cache: colecao carregada — turmas:",t.data.turmas.length),t.data):null}catch{return null}}async function re(){await chrome.storage.local.remove(ae),b.debugSync("cache: colecao apagada")}async function po(){try{(document.querySelector('form[action*="logar.do"]')!==null||document.querySelector('form[action*="login.jsf"]')!==null||document.title.toLowerCase().includes("login"))&&(await re(),b.debugSync("cache: apagado por logout detectado"))}catch{}}function mo(e){const t=Date.now()-e,o=Math.floor(t/6e4);if(o<1)return"agora mesmo";if(o<60)return`há ${o} min`;const n=Math.floor(o/60);return n<24?`há ${n}h`:"há mais de 24h"}const Ee="https://sig.cefetmg.br/sigaa",se=`${Ee}/portais/discente/discente.jsf`,_o=1;async function ho(e){const{onProgress:t,onError:o,signal:n,matricula:a}=e,r=e.maxRequests??90,i=new no({signal:n,maxRequests:r});t({completed:0,total:1,currentCourseName:"Carregando portal...",phase:"navegando"});const d=await i.fetchPage(se),u=io(d),c=uo(d);let l=B(d)??"";if(!l)throw new Error("ViewState não encontrado no portal");if(u.length===0)throw new Error("Nenhuma turma encontrada no portal");b.debugSync("collect: turmas encontradas:",u.length);const m=await Ce(),s={...m?.notas??{}},f={...m?.frequencia??{}},v=u.length;let h=0;for(const x of u){if(n.aborted)break;h++;const N=!!x.idTurma&&!!s[x.idTurma],R=!!x.idTurma&&!!f[x.idTurma];if(N&&R){b.debugSync("collect: turma completamente cacheada, pulando:",x.nome);continue}if(!x.frontEndIdTurma||!x.componentId||!x.idTurma){b.debugSync("collect: turma sem dados de navegação, pulando:",x.nome),o("Dados de navegação incompletos",x.nome);continue}t({completed:h,total:v,currentCourseName:x.nome,phase:"navegando"});try{l=await go(i,x,l,a,s,f,t,h,v,N,R)}catch(w){if(ot(w))throw await _(),w;o(w.message,x.nome);try{const k=await i.fetchPage(se);l=B(k)??l}catch(k){if(ot(k))throw await _(),k;await _();break}}await _()}const g=y();return await tt(g),g;function y(){return{coletadoEm:Date.now(),matricula:a,nomeAluno:c?.nome??"",turmas:u,notas:s,frequencia:f,versaoSchema:_o}}async function _(){try{await tt(y())}catch{}}}async function go(e,t,o,n,a,r,i,d,u,c,l){const m=await e.postJSF(se,t.formId,{[t.componentId]:t.componentId,frontEndIdTurma:t.frontEndIdTurma},o);let s=m.viewState;const f=bo(m.html,"formMenu")??`${Ee}/ava/index.jsf`,v=c?null:et(m.html,"Ver Notas"),h=l?null:et(m.html,"Frequência");if(v){i({completed:d,total:u,currentCourseName:t.nome,phase:"notas"});const y=await e.postJSF(f,"formMenu",{[v]:v},s);s=y.viewState;let _=y.html;_.includes("tabelaRelatorio")||(_=await e.fetchPage(f),s=B(_)??s);const x=co(_,n);x&&t.idTurma&&(a[t.idTurma]=x,b.debugSync("collect: notas salvas para",t.nome))}else c||b.debugSync('collect: "Ver Notas" não encontrado no menu de',t.nome);if(h){i({completed:d,total:u,currentCourseName:t.nome,phase:"frequencia"});const y=await e.postJSF(f,"formMenu",{[h]:h},s);s=y.viewState;let _=y.html;_.includes("listing")||(_=await e.fetchPage(`${Ee}/ava/FrequenciaAluno/mapa.jsf`),s=B(_)??s);const x=lo(_);x&&t.idTurma&&(r[t.idTurma]=x,b.debugSync("collect: frequência salva para",t.nome))}else l||b.debugSync('collect: "Frequência" não encontrado no menu de',t.nome);const g=await e.fetchPage(se);return B(g)??s}function ot(e){return e instanceof ke||e instanceof xt||e instanceof wt||e instanceof DOMException&&e.name==="AbortError"}function bo(e,t){try{return new DOMParser().parseFromString(e,"text/html").getElementById(t)?.action??null}catch{return null}}const nt=["#014D84","#1971C2"];function vo(e){return nt[e%nt.length]}function _e(e){return e===null?"—":e.toFixed(1).replace(".",",")}function yo(e){return e>=85?"sc-presenca-ok":e>=75?"sc-presenca-warn":"sc-presenca-risk"}function xo({frequencia:e}){if(e.totalAulas===0)return null;const t=Math.floor(e.totalAulas*.25),o=t-e.totalFaltas;if(o<0)return p("div",{class:"sc-freq-limite sc-freq-limite-danger",title:`Limite: ${t} faltas no total`,children:["Reprovado por falta — ",Math.abs(o)," acima do limite"]});const n=o<=2?"sc-freq-limite-warn":"sc-freq-limite-ok";return p("div",{class:`sc-freq-limite ${n}`,title:`Limite: ${t} faltas de ${e.totalAulas} aulas`,children:["Pode faltar mais ",o," vez",o!==1?"es":""]})}function wo({turma:e,notas:t,frequencia:o,index:n}){const a=vo(n),r=e.horarioDecodificado?.resumo??e.horarioCodigo??"",i=t||o,[d,u]=V(!1),c=t&&t.bimestres.some(l=>l.avaliacoes.length>0);return p("div",{class:"sc-card",children:[p("div",{class:"sc-card-accent",style:{background:a},"aria-hidden":"true"}),p("div",{class:"sc-card-body",children:[p("h3",{class:"sc-card-title",title:e.nome,children:e.nome}),p("div",{class:"sc-card-meta",children:[r&&p("span",{class:"sc-card-schedule",title:"Horário",children:r}),e.local&&p("span",{class:"sc-card-room",title:"Sala",children:e.local})]}),t&&p("div",{class:"sc-card-notas",children:[p("div",{class:"sc-notas-bimestres",children:t.bimestres.filter(l=>l.nota!==null).map(l=>p("span",{class:"sc-bimestre",title:l.nome,children:[p("span",{class:"sc-bimestre-label",children:l.nome.replace(/(\d)o\. Bimestre/,"$1B")}),p("span",{class:"sc-bimestre-nota",children:_e(l.nota)})]},l.nome))}),t.resultado!==null&&p("div",{class:"sc-resultado",children:[p("span",{class:"sc-resultado-label",children:"Resultado"}),p("span",{class:"sc-resultado-valor",children:_e(t.resultado)}),t.situacao&&t.situacao!=="--"&&p("span",{class:`sc-situacao ${t.situacao==="APROVADO"?"sc-situacao-ok":"sc-situacao-risk"}`,children:t.situacao})]})]}),o&&p(O,{children:[p("div",{class:`sc-card-freq ${yo(o.percentualPresenca)}`,children:[p("span",{class:"sc-freq-pct",children:[o.percentualPresenca.toFixed(0),"% presença"]}),p("span",{class:"sc-freq-faltas",children:[o.totalFaltas," falta",o.totalFaltas!==1?"s":""]})]}),p(xo,{frequencia:o})]}),c&&p(O,{children:[p("button",{class:"sc-expand-btn",type:"button",onClick:()=>u(l=>!l),"aria-expanded":d,children:[p("span",{class:`sc-expand-icon${d?" sc-expanded":""}`,children:"▼"}),d?"Ocultar atividades":"Ver atividades"]}),d&&p("div",{class:"sc-avaliacoes",children:t.bimestres.map(l=>l.avaliacoes.length===0?null:p("div",{class:"sc-aval-bimestre",children:[p("div",{class:"sc-aval-bimestre-nome",children:l.nome}),l.avaliacoes.map(m=>p("div",{class:"sc-aval-row",children:[p("span",{class:"sc-aval-nome",title:m.denominacao??m.abreviacao,children:m.denominacao??m.abreviacao}),p("span",{class:"sc-aval-nota",children:_e(m.nota)}),m.notaMaxima!==null&&p("span",{class:"sc-aval-max",children:["/",m.notaMaxima%1===0?m.notaMaxima.toFixed(0):m.notaMaxima.toFixed(1)]})]},m.avalId))]},l.nome))})]}),!i&&p("p",{class:"sc-card-no-data",children:"Dados não coletados ainda"})]})]})}function So({info:e}){const t=e.total>0?e.completed/e.total*100:0,o={navegando:"Navegando",notas:"Coletando notas",frequencia:"Coletando frequência"}[e.phase];return p("div",{class:"sc-progress-container",role:"progressbar","aria-valuenow":e.completed,"aria-valuemax":e.total,"aria-label":"Progresso da coleta",children:[p("div",{class:"sc-progress-track",children:p("div",{class:"sc-progress-fill",style:{width:`${t}%`}})}),p("p",{class:"sc-progress-text",children:[o,": ",e.currentCourseName," ",p("span",{class:"sc-progress-count",children:["(",e.completed,"/",e.total,")"]})]})]})}function ko({matricula:e,nomeAlunoInicial:t}){const[o,n]=V(null),[a,r]=V(!1),[i,d]=V(null),[u,c]=V([]),l=Zt(null);Kt(()=>{Ce().then(n)},[]);const m=pe(async()=>{const h=new AbortController;l.current=h,r(!0),c([]);try{const g=await ho({matricula:e,signal:h.signal,onProgress:d,onError:(y,_)=>{c(x=>[...x,`${_}: ${y}`])}});n(g)}catch(g){const y=g.message??"",_=await Ce();if(_&&n(_),y==="SESSION_EXPIRED")c(["Sessão expirada. Recarregue a página e faça login novamente."]);else if(!(g instanceof DOMException&&g.name==="AbortError"))if(y==="MAX_REQUESTS_EXCEEDED"){const x=Object.keys(_?.notas??{}).length,N=_?.turmas.length??0;x<N&&c([`${x} de ${N} turmas coletadas. Clique em "Atualizar dados" novamente para continuar.`])}else c(y==="CIRCUIT_BREAKER_OPEN"?["Muitas falhas seguidas. Verifique sua conexão e tente novamente."]:[`Coleta interrompida: ${y}`])}finally{r(!1),d(null),l.current=null}},[e]),s=pe(()=>{l.current?.abort()},[]),f=pe(async()=>{await re(),n(null)},[]),v=o?.nomeAluno?.split(" ")[0]??t?.split(" ")[0]??"";return p("div",{class:"sc-dashboard",children:[p("div",{class:"sc-dashboard-header",children:[p("div",{class:"sc-greeting-row",children:[p("h2",{class:"sc-greeting",children:["Olá",v?`, ${v}`:"","!"]}),o&&p("span",{class:"sc-cache-age",title:"Última atualização dos dados",children:mo(o.coletadoEm)})]}),p("div",{class:"sc-header-actions",children:[p("button",{class:"sc-btn sc-btn-primary",type:"button",onClick:m,disabled:a,"aria-busy":a,children:a?"Coletando...":"Atualizar dados"}),a&&p("button",{class:"sc-btn sc-btn-cancel",type:"button",onClick:s,children:"Cancelar"}),o&&!a&&p("button",{class:"sc-btn sc-btn-danger",type:"button",onClick:f,title:"Remove todos os dados salvos localmente",children:"Apagar dados locais"})]})]}),a&&i&&p(So,{info:i,onCancel:s}),u.length>0&&p("div",{class:"sc-errors",role:"alert",children:u.map((h,g)=>p("p",{class:"sc-error-item",children:h},g))}),o&&o.turmas.length>0?p("div",{class:"sc-course-grid",role:"list",children:o.turmas.map((h,g)=>p("div",{role:"listitem",children:p(wo,{turma:h,notas:h.idTurma?o.notas[h.idTurma]:void 0,frequencia:h.idTurma?o.frequencia[h.idTurma]:void 0,index:g})},h.idTurma??h.formId))}):a?null:p("div",{class:"sc-empty-state",children:[p("p",{class:"sc-empty-title",children:"Nenhum dado coletado ainda."}),p("p",{class:"sc-empty-sub",children:["Clique em ",p("strong",{children:"Atualizar dados"})," para coletar notas e frequência de todas as turmas do semestre."]}),p("p",{class:"sc-empty-info",children:"A coleta pode demorar alguns minutos — o SIGAA processa uma disciplina por vez."})]}),p("p",{class:"sc-disclaimer",children:"betterUI (não-oficial) — dados da sua sessão ativa no SIGAA, armazenados apenas neste dispositivo."})]})}const Co=`
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
`;let H=null,Ae=null;function Eo(e,t,o=null){qe(),H=document.createElement("div"),H.id="betterui-dashboard-host",H.style.cssText="all: initial; display: block;",e.insertBefore(H,e.firstChild);const n=H.attachShadow({mode:"closed"}),a=document.createElement("style");a.textContent=Co,n.appendChild(a);const r=document.createElement("div");return n.appendChild(r),je(lt(ko,{matricula:t,nomeAlunoInicial:o}),r),Ae=()=>{je(null,r)},qe}function qe(){Ae?.(),Ae=null,H?.remove(),H=null}kt(async()=>{await Ct(),b.debug("betterUI bootstrap — url:",location.href),await po();const e=qt();if(b.debug("rota detectada:",e),e==="unknown"){b.debug("rota desconhecida — extensão inativa nesta página");return}const o=(await chrome.storage.local.get("betterui_enabled")).betterui_enabled!==!1,n=Nt();b.debug("versão do SIGAA:",n);let a=!1;function r(){if(e!=="portal"||n!=="ok")return;const i=qo();if(!i){b.debugSync("dashboard: matrícula não encontrada");return}const d=document.getElementById("main-docente")??F(D.conteudo);if(!d){b.debugSync("dashboard: container não encontrado");return}Eo(d,i,Ao()),a=!0,b.debugSync("dashboard: montado")}Ut(o,n,i=>{i?(ze(e,n),a||r()):(Ot(),qe(),a=!1),chrome.storage.local.set({betterui_enabled:i}).catch(()=>{})}),o&&(ze(e,n),r()),b.debug("bootstrap concluído")});function Ao(){try{const t=F(D.nome_aluno)?.textContent?.trim();return t&&t.length>0?t:null}catch{return null}}function qo(){try{const e=[...document.querySelectorAll("#agenda-docente td"),...document.querySelectorAll("#painel-usuario td"),...document.querySelectorAll("#conteudo td")];for(let t=0;t<e.length;t++)if(e[t]?.textContent?.trim()==="Matrícula:"){const o=e[t+1]?.textContent?.trim();if(o&&o.length>0)return o}}catch{}return null}
})()
