import { MODULES, CORE_QUESTIONS, PALETTE, REFERENCES } from "./modules.js";
import {
  getModule,
  getInterviewQueue,
  scanContradictions,
  buildRequirements,
  buildDiscoveryPrompt,
  buildExecutionPrompt,
} from "./generator.js";

const KEY = "prompt-bereshit-workspace-v1";
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmtDate = (d) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(d),
  );
const uuid = () =>
  crypto?.randomUUID?.() ||
  `pb-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn("Could not load espaço local", error);
  }
  return { projects: [], activeProjectId: null, globalNotes: [] };
}
let state = loadState();
let page = "dashboard";
let interviewIndex = 0;
let promptTab = "discovery";
let moduleFilter = "all";
let moduleSearch = "";
let flashTimer = null;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    showToast(
      "O armazenamento local está cheio. Exporte um backup antes de continuar.",
    );
    console.error(error);
  }
}
function activeProject() {
  return state.projects.find((p) => p.id === state.activeProjectId) || null;
}
function touch(project) {
  project.updatedAt = new Date().toISOString();
  persist();
}
function setPage(next) {
  page = next;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showToast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove("visible"), 2600);
}
function moduleLabel(id) {
  return getModule(id).name;
}
function statusLabel(p) {
  return p.approved
    ? "Briefing aprovado"
    : p.requirements?.length
      ? "Em revisão"
      : "Descoberta";
}

function navItem(id, label, icon, active) {
  return `<button class="nav-link ${active === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`;
}
function renderShell() {
  const p = activeProject();
  $("#app").innerHTML = `
    <aside class="sidebar">
      <a href="#" class="brand-lockup" data-page="dashboard" aria-label="Prompt-Bereshit home">
        <span class="brand-mark"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 28 17 41 12 31 23 43 31 29 30 24 44 19 30 5 34 16 23 7 13 20 17Z"/><circle cx="24" cy="24" r="5"/></svg></span>
        <span class="brand-name">prompt<span>bereshit</span><small>ENGENHARIA DE PROMPTS</small></span>
      </a>
      <div class="side-section-label">ESPAÇO DE TRABALHO</div>
      <nav class="main-nav" aria-label="Navegação principal">
        ${navItem("dashboard", "Visão geral", "⌂", page)}
        ${navItem("new", "Nova descoberta", "＋", page)}
        ${navItem("modules", "Biblioteca de módulos", "▦", page)}
        ${navItem("references", "Biblioteca visual", "✳", page)}
      </nav>
      <div class="side-section-label project-nav-label">FERRAMENTAS DO PROJETO</div>
      <nav class="main-nav">
        ${navItem("requirements", "Requisitos", "☷", page)}
        ${navItem("studio", "Estúdio de prompts", "✎", page)}
        ${navItem("context", "Biblioteca de contexto", "◫", page)}
      </nav>
      <div class="sidebar-bottom">
        <div class="local-status"><span class="status-dot"></span><div><strong>Espaço local</strong><small>Salvo neste navegador</small></div></div>
        <button class="nav-link settings-link ${page === "settings" ? "active" : ""}" data-page="settings"><span class="nav-icon">⚙</span><span>Configurações e backup</span></button>
        <div class="sidebar-foot">BERESHIT · CRIAÇÃO COMEÇA COM CLAREZA</div>
      </div>
    </aside>
    <main class="main-area">
      <header class="topbar">
        <div class="breadcrumbs"><span>Espaço de trabalho</span><span class="crumb-slash">/</span><strong>${esc(pageTitle())}</strong></div>
        <div class="topbar-actions">
          ${p ? `<span class="active-project-pill"><span class="tiny-dot"></span>${esc(p.brief.title || "Projeto sem título")}</span>` : ""}
          <button class="quiet-button compact" data-page="new">＋ <span>Novo projeto</span></button>
          <span class="avatar-mark">PB</span>
        </div>
      </header>
      <div id="view" class="view-container">${renderPage()}</div>
      <footer class="app-footer"><span>Prompt-Bereshit</span><span>Ideias ganham estrutura.</span><span>LOCAL-FIRST · 01.0</span></footer>
    </main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
  `;
  bindEvents();
}
function pageTitle() {
  return (
    {
      dashboard: "Visão geral",
      new: "Nova descoberta",
      interview: "Entrevista de descoberta",
      requirements: "Requisitos",
      studio: "Estúdio de prompts",
      context: "Biblioteca de contexto",
      modules: "Biblioteca de módulos",
      references: "Biblioteca visual",
      settings: "Configurações e backup",
    }[page] || "Espaço de trabalho"
  );
}
function render() {
  renderShell();
}

function projectCard(p) {
  const mod = getModule(p.moduleId);
  return `<article class="project-card">
    <div class="project-card-top"><span class="project-icon">${mod.icon}</span><span class="status-chip ${p.approved ? "approved" : ""}">${statusLabel(p)}</span></div>
    <button class="project-title-button" data-action="open-project" data-id="${p.id}">${esc(p.brief.title || "Projeto sem título")}</button>
    <p>${esc((p.brief.idea || "Nenhum resumo adicionado ainda.").slice(0, 125))}${(p.brief.idea || "").length > 125 ? "…" : ""}</p>
    <div class="project-card-meta"><span>${esc(mod.short)}</span><span>${fmtDate(p.updatedAt)}</span></div>
    <div class="project-card-bottom"><button class="text-link" data-action="open-project" data-id="${p.id}">Abrir projeto <span>↗</span></button><button class="icon-button small" title="Excluir projeto" data-action="delete-project" data-id="${p.id}">×</button></div>
  </article>`;
}
function renderDashboard() {
  const projects = [...state.projects].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  );
  const complete = projects.filter((p) => p.approved).length;
  const inProgress = projects.length - complete;
  return `
    <section class="welcome-row">
      <div><div class="eyebrow"><span class="eyebrow-star">✳</span> UM ESPAÇO PARA PENSAR COM CLAREZA</div><h1>Todo bom prompt<br>começa <em>em algum lugar.</em></h1><p class="welcome-copy">Transforme a primeira faísca de uma ideia em um briefing cuidadoso, uma especificação clara e um prompt pronto para uso.</p><div class="welcome-actions"><button class="primary-button" data-page="new">Começar uma descoberta <span>↗</span></button><button class="quiet-button" data-page="modules">Explorar módulos</button></div></div>
      <div class="welcome-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-sun">✳</div><div class="art-note note-one">ideia</div><div class="art-note note-two">estrutura</div><div class="art-note note-three">prompt</div><span class="art-script">comece aqui</span></div>
    </section>
    <section class="stats-row">
      <div class="stat-item"><span class="stat-label">PROJETOS</span><strong>${projects.length.toString().padStart(2, "0")}</strong><small>No seu espaço de trabalho</small></div>
      <div class="stat-item"><span class="stat-label">EM DESCOBERTA</span><strong>${inProgress.toString().padStart(2, "0")}</strong><small>Em desenvolvimento</small></div>
      <div class="stat-item"><span class="stat-label">ESPECIFICAÇÕES APROVADAS</span><strong>${complete.toString().padStart(2, "0")}</strong><small>Prontas para execução</small></div>
      <div class="stat-note"><span class="tiny-star">✳</span><p>Um bom prompt não depende de dizer mais. Depende de deixar o que importa bem definido.</p></div>
    </section>
    <section class="section-block"><div class="section-heading"><div><div class="eyebrow">SUA ÁREA DE TRABALHO</div><h2>Projetos recentes</h2></div><button class="text-link" data-page="new">Criar projeto <span>↗</span></button></div>
      ${projects.length ? `<div class="project-grid">${projects.slice(0, 6).map(projectCard).join("")}</div>` : `<div class="empty-state"><div class="empty-illustration">✳</div><h3>Sua primeira ideia começa aqui.</h3><p>Crie um projeto para começar a reunir contexto, requisitos e decisões.</p><button class="primary-button" data-page="new">Criar meu primeiro projeto <span>↗</span></button></div>`}
    </section>
    <section class="section-block module-preview-block"><div class="section-heading"><div><div class="eyebrow">PENSAMENTO ESPECIALIZADO</div><h2>Escolha um ponto de partida</h2><p class="section-subtitle">Uma perspectiva de descoberta diferente para cada tipo de trabalho.</p></div><button class="text-link" data-page="modules">Todos os módulos <span>↗</span></button></div><div class="module-preview-grid">${MODULES.slice(
      0,
      4,
    )
      .map(
        (m) =>
          `<button class="module-mini" data-action="new-with-module" data-module="${m.id}"><span class="mini-icon">${m.icon}</span><strong>${m.name}</strong><small>${m.category}</small><span class="mini-arrow">↗</span></button>`,
      )
      .join("")}</div></section>
    <section class="quote-strip"><span class="quote-flower">✳</span><p>“Bereshit” — toda criação começa quando uma ideia ganha forma.</p><span class="quote-source">UM NOME PARA O PROCESSO</span></section>
  `;
}

function renderNew() {
  const values = window.newDraft || {};
  return `
    <section class="page-intro"><div class="eyebrow"><span class="eyebrow-star">01 / DESCOBERTA</span></div><h1>Dê à ideia<br><em>um lugar para começar.</em></h1><p>Comece pelo que você já sabe. Pode estar incompleto, desorganizado ou ainda tomando forma. A descoberta ajudará a estruturar tudo.</p></section>
    <div class="form-layout">
      <form id="new-project-form" class="form-panel">
        <div class="form-panel-head"><div><span class="step-count">01</span><h2>A semente do projeto</h2><p>Conte o que você está tentando criar.</p></div><span class="required-note">* Obrigatório</span></div>
        <div class="field"><label for="project-title">Título provisório <span>*</span></label><input id="project-title" name="title" required maxlength="90" placeholder="Ex.: uma plataforma pessoal de conhecimento" value="${esc(values.title || "")}"/><small>Um nome temporário funciona perfeitamente.</small></div>
        <div class="field-row"><div class="field"><label for="project-module">Domínio principal <span>*</span></label><select id="project-module" name="moduleId" required>${MODULES.map((m) => `<option value="${m.id}" ${values.moduleId === m.id ? "selected" : ""}>${m.name}</option>`).join("")}</select></div><div class="field"><label for="project-deliverable">Entregável esperado</label><select id="project-deliverable" name="deliverable"><option value="">Ainda não definido</option>${["Um site ou aplicação completos", "Um protótipo de alta fidelidade", "Um sistema visual ou brand book", "Uma implementação de software", "Um relatório de pesquisa", "Um documento estruturado", "Uma análise de dados", "Um texto criativo", "Um prompt ou fluxo reutilizável", "Outro / deixe o modelo recomendar"].map((v) => `<option ${values.deliverable === v ? "selected" : ""}>${v}</option>`).join("")}</select></div></div>
        <div class="field"><label for="project-idea">Descreva a ideia <span>*</span></label><textarea id="project-idea" name="idea" required rows="5" placeholder="Escreva livremente. O que despertou essa ideia? O que deve existir ao final? O que você já sabe?">${esc(values.idea || "")}</textarea><small>Você não precisa conhecer a linguagem técnica. Descreva sua intenção com suas próprias palavras.</small></div>
        <div class="field"><label for="project-goal">O que este trabalho deve possibilitar?</label><textarea id="project-goal" name="goal" rows="2" placeholder="O principal resultado ou mudança que você deseja alcançar">${esc(values.goal || "")}</textarea></div>
        <div class="field"><label for="project-audience">Para quem é este projeto?</label><input id="project-audience" name="audience" placeholder="Ex.: estudantes, criadores independentes, equipes de pesquisa" value="${esc(values.audience || "")}"/></div>
        <div class="field"><label for="project-constraints">Restrições conhecidas ou coisas a evitar</label><textarea id="project-constraints" name="constraints" rows="3" placeholder="Tecnologias, orçamento, exclusões visuais, decisões que precisam ser preservadas...">${esc(values.constraints || "")}</textarea></div>
        <div class="form-actions"><button class="primary-button" type="submit">Continuar para a descoberta <span>↗</span></button><span class="form-footnote">Você poderá revisar estas informações depois.</span></div>
      </form>
      <aside class="form-aside"><div class="aside-note"><span class="aside-ornament">✳</span><span class="eyebrow">UM PEQUENO LEMBRETE</span><h3>Você não precisa de um briefing perfeito para começar.</h3><p>A descoberta existe para identificar o que falta. Comece pela ideia, não pela resposta pronta.</p></div><div class="aside-steps"><div class="aside-step active"><span>01</span><div><strong>Semente do projeto</strong><small>Sua ideia inicial</small></div></div><div class="aside-step"><span>02</span><div><strong>Entrevista adaptativa</strong><small>Perguntas orientadas pelo domínio</small></div></div><div class="aside-step"><span>03</span><div><strong>Requisitos</strong><small>Uma especificação para revisar</small></div></div><div class="aside-step"><span>04</span><div><strong>Estúdio de prompts</strong><small>Prompts de descoberta e execução</small></div></div></div></aside>
    </div>`;
}

function createProject(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const p = {
    id: uuid(),
    moduleId: data.moduleId,
    brief: {
      title: data.title,
      idea: data.idea,
      goal: data.goal,
      audience: data.audience,
      deliverable: data.deliverable,
      constraints: data.constraints,
    },
    answers: [],
    requirements: [],
    approved: false,
    decisions: [],
    assumptions: [],
    context: [],
    refinements: [],
    prompts: { discovery: "", execution: "" },
    promptHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.projects.unshift(p);
  state.activeProjectId = p.id;
  persist();
  interviewIndex = 0;
  page = "interview";
  render();
}

function renderInterview() {
  const p = activeProject();
  if (!p) return renderNoProject("Comece criando a semente de um projeto.");
  const queue = getInterviewQueue(p);
  const q = queue[interviewIndex];
  const answer = p.answers[interviewIndex] || { value: "", delegate: false };
  const progress = Math.round(((interviewIndex + 1) / queue.length) * 100);
  return `
    <section class="page-intro compact-intro"><div class="eyebrow">02 / DESCOBERTA ADAPTATIVA <span class="eyebrow-dot">·</span> ${esc(moduleLabel(p.moduleId).toUpperCase())}</div><h1>Vamos tornar<br><em>o implícito visível.</em></h1><p>Responda ao que souber. Deixe decisões em aberto quando houver dúvida; a especificação final manterá essas incertezas visíveis.</p></section>
    <div class="interview-layout"><aside class="interview-rail"><div class="rail-head"><span class="eyebrow">MAPA DA DESCOBERTA</span><strong>${String(interviewIndex + 1).padStart(2, "0")} <small>/ ${queue.length}</small></strong></div><div class="progress-track"><span style="width:${progress}%"></span></div><div class="question-list">${queue.map((item, i) => `<button class="question-nav ${i === interviewIndex ? "current" : ""} ${p.answers[i]?.value || p.answers[i]?.delegate ? "answered" : ""}" data-action="jump-question" data-index="${i}"><span class="question-nav-num">${String(i + 1).padStart(2, "0")}</span><span>${esc(item.title)}</span><span class="q-check">${p.answers[i]?.value || p.answers[i]?.delegate ? "✓" : ""}</span></button>`).join("")}</div><div class="rail-tip"><span>✳</span><p>Pule quando necessário. Uma resposta ausente será um ponto em aberto, nunca uma decisão inventada.</p></div></aside>
    <section class="interview-card"><div class="interview-card-top"><span class="question-kicker">${esc(q.group)}</span><span class="question-counter">PERGUNTA ${String(interviewIndex + 1).padStart(2, "0")}</span></div><span class="question-step-label">${esc(q.title)}</span><h2>${esc(q.question)}</h2><p class="question-hint">${esc(q.placeholder)}</p><textarea id="interview-answer" rows="7" placeholder="Escreva sua resposta aqui...">${esc(answer.value || "")}</textarea><label class="delegate-option"><input type="checkbox" id="delegate-answer" ${answer.delegate ? "checked" : ""}/><span class="custom-check"></span><span><strong>Deixe o modelo recomendar</strong><small>Ainda não tenho uma decisão. Peça ao LLM de destino que sugira uma opção e explique as vantagens e limitações.</small></span></label><div class="interview-actions"><button class="quiet-button" data-action="prev-question" ${interviewIndex === 0 ? "disabled" : ""}>← Anterior</button><div class="interview-next-group"><button class="text-link" data-action="skip-question">Pular por enquanto</button>${interviewIndex === queue.length - 1 ? `<button class="primary-button" data-action="finish-interview">Construir minha especificação <span>↗</span></button>` : `<button class="primary-button" data-action="next-question">Próxima pergunta <span>→</span></button>`}</div></div></section></div>`;
}

function renderNoProject(message) {
  return `<div class="empty-state"><div class="empty-illustration">✳</div><h3>Nenhum projeto ativo ainda.</h3><p>${esc(message)}</p><button class="primary-button" data-page="new">Começar nova descoberta <span>↗</span></button></div>`;
}

function renderRequisitos() {
  const p = activeProject();
  if (!p)
    return renderNoProject(
      "Crie ou abra um projeto para revisar sua especificação.",
    );
  if (!p.requirements?.length)
    return `<section class="page-intro"><div class="eyebrow">03 / REQUISITOS</div><h1>Das ideias a<br><em>critérios claros.</em></h1><p>Suas respostas estão prontas para serem organizadas em uma especificação revisável.</p></section><div class="empty-state"><div class="empty-illustration">☷</div><h3>Ainda não há especificação.</h3><p>Conclua a entrevista de descoberta para organizar requisitos e verificar possíveis conflitos.</p><button class="primary-button" data-page="interview">Continuar descoberta <span>↗</span></button></div>`;
  const conflicts = scanContradictions(p);
  const reqs = p.requirements;
  const queue = getInterviewQueue(p);
  const explicitFields =
    ["title", "idea", "goal", "audience", "deliverable", "constraints"].filter(
      (k) => String(p.brief?.[k] || "").trim(),
    ).length +
    (p.answers || []).filter((a) => String(a?.value || "").trim()).length;
  const delegatedCount = (p.answers || []).filter((a) => a?.delegate).length;
  const answeredCount = (p.answers || []).filter(
    (a) => String(a?.value || "").trim() || a?.delegate,
  ).length;
  const openCount = Math.max(0, queue.length - answeredCount);
  const groups = [...new Set(reqs.map((r) => r.category))];
  return `<section class="page-intro compact-intro"><div class="eyebrow">03 / REQUISITOS STUDIO</div><h1>Um briefing com<br><em>limites bem definidos.</em></h1><p>Revise o que está explícito, o que permanece em aberto e quais condições definirão um resultado satisfatório.</p></section>
    <div class="spec-header"><div><span class="project-overline">${esc(moduleLabel(p.moduleId))} · ${fmtDate(p.updatedAt)}</span><h2>${esc(p.brief.title)}</h2><p>${esc(p.brief.goal || p.brief.idea)}</p></div><span class="status-chip ${p.approved ? "approved" : ""}">${p.approved ? "Aprovado" : "Em revisão"}</span></div>
    ${conflicts.length ? `<section class="conflict-panel"><div class="conflict-head"><span class="conflict-icon">!</span><div><strong>${conflicts.length} possível contradição${conflicts.length > 1 ? "s" : ""} para revisar</strong><small>Verificações baseadas em regras. São sinais para revisão, não erros definitivos.</small></div></div>${conflicts.map((c) => `<div class="conflict-item"><strong>${esc(c.title)}</strong><p>${esc(c.detail)}</p></div>`).join("")}</section>` : `<div class="clean-review-note"><span>✓</span><div><strong>Nenhum conflito detectado pelas regras locais.</strong><small>Isso não garante que todos os requisitos sejam compatíveis. Revise a especificação antes de aprová-la.</small></div></div>`}
    <div class="information-map"><div class="information-map-head"><div><span class="eyebrow">CLASSIFICAÇÃO DAS INFORMAÇÕES</span><strong>O que está definido, delegado ou em aberto?</strong></div><span class="classification-note">Nenhuma suposição é tratada como decisão do usuário.</span></div><div class="classification-grid"><div><span class="classification-number">${String(explicitFields).padStart(2, "0")}</span><strong>Entradas explícitas</strong><small>Informações fornecidas diretamente no briefing ou na entrevista.</small></div><div><span class="classification-number">${String(delegatedCount).padStart(2, "0")}</span><strong>Decisões delegadas</strong><small>Questões em que o LLM de destino poderá recomendar uma solução.</small></div><div><span class="classification-number">${String(openCount).padStart(2, "0")}</span><strong>Pontos em aberto</strong><small>Ainda sem resposta; o LLM de destino não deverá inventá-las.</small></div></div><p>Requisitos implícitos e preferências opcionais devem ser propostos separadamente pelo LLM de destino, explicados e confirmados quando afetarem materialmente o projeto.</p></div>
    <div class="requirements-summary"><div><span class="eyebrow">INVENTÁRIO DE REQUISITOS</span><strong>${String(reqs.length).padStart(2, "0")}</strong><small>Itens registrados e derivados</small></div><div class="priority-summary"><span class="priority-dot p0"></span><strong>${reqs.filter((r) => r.priority === "P0").length}</strong><small>Obrigatório</small></div><div class="priority-summary"><span class="priority-dot p1"></span><strong>${reqs.filter((r) => r.priority === "P1").length}</strong><small>Importante</small></div><div class="priority-summary"><span class="priority-dot p2"></span><strong>${reqs.filter((r) => r.priority === "P2").length}</strong><small>Recomendado</small></div><div class="priority-summary"><span class="priority-dot p3"></span><strong>${reqs.filter((r) => r.priority === "P3").length}</strong><small>Opcional</small></div></div>
    <section class="section-block"><div class="section-heading"><div><div class="eyebrow">ESPECIFICAÇÃO</div><h2>Requisitos</h2><p class="section-subtitle">Edite as prioridades quando necessário. Os identificadores permanecem estáveis nesta especificação.</p></div><button class="quiet-button compact" data-action="rebuild-requirements">↻ Reconstruir a partir das respostas</button></div>
    <div class="requirements-list">${groups
      .map(
        (g) =>
          `<div class="requirement-group"><div class="requirement-group-title">${esc(g)}</div>${reqs
            .filter((r) => r.category === g)
            .map(
              (r) =>
                `<article class="requirement-row"><div class="req-id">${esc(r.id)}</div><div class="req-content"><strong>${esc(r.description)}</strong><small>Critério de aceitação: ${esc(r.criteria)}</small></div><select class="priority-select ${r.priority.toLowerCase()}" aria-label="Prioridade de ${r.id}" data-priority-id="${r.id}">${["P0", "P1", "P2", "P3"].map((v) => `<option ${r.priority === v ? "selected" : ""}>${v}</option>`).join("")}</select></article>`,
            )
            .join("")}</div>`,
      )
      .join("")}</div></section>
    <section class="review-columns"><div class="review-note-card"><span class="eyebrow">RESTRIÇÕES CONHECIDAS</span><p>${esc(p.brief.constraints || "Nenhuma restrição explícita foi informada.")}</p></div><div class="review-note-card"><span class="eyebrow">DECISÕES EM ABERTO</span><p>${p.answers.filter((a) => !a.value && !a.delegate).length} itens permanecem sem resposta. O prompt de execução orientará o LLM a não inventá-los.</p></div></section>
    <div class="approval-bar"><div><span class="approval-mark">✳</span><div><strong>${p.approved ? "Especificação aprovada" : "Pronto para sua aprovação?"}</strong><small>${p.approved ? "O prompt de execução está liberado. Você ainda pode refinar esta especificação." : "Aprove somente depois de revisar prioridades, suposições e possíveis conflitos."}</small></div></div><button class="primary-button" data-action="approve-spec">${p.approved ? "Abrir Estúdio de Prompts" : "Aprovar especificação"} <span>↗</span></button></div>`;
}

function ensurePrompt(p, tab) {
  if (!p.prompts) p.prompts = { discovery: "", execution: "" };
  if (!p.prompts[tab])
    p.prompts[tab] =
      tab === "discovery" ? buildDiscoveryPrompt(p) : buildExecutionPrompt(p);
  return p.prompts[tab];
}
function renderStudio() {
  const p = activeProject();
  if (!p) return renderNoProject("Crie um projeto para gerar um prompt.");
  if (!p.requirements?.length)
    return `<section class="page-intro"><div class="eyebrow">04 / ESTÚDIO DE PROMPTS</div><h1>Prepare o prompt<br><em>para seguir adiante.</em></h1><p>O estúdio mantém descoberta e execução separadas, para que o modelo não comece a implementar antes da aprovação do briefing.</p></section><div class="empty-state"><div class="empty-illustration">✎</div><h3>Os requisitos vêm primeiro.</h3><p>Conclua a descoberta e revise a especificação antes de preparar o prompt de execução.</p><button class="primary-button" data-page="interview">Continuar descoberta <span>↗</span></button></div>`;
  const discovery = ensurePrompt(p, "discovery");
  const execution = p.approved ? ensurePrompt(p, "execution") : "";
  const current = promptTab === "execution" ? execution : discovery;
  const versions = (p.promptHistory || []).filter(
    (h) => h.type === promptTab,
  ).length;
  return `<section class="page-intro compact-intro"><div class="eyebrow">04 / ESTÚDIO DE PROMPTS</div><h1>Dois prompts.<br><em>Uma direção clara.</em></h1><p>A descoberta inicia a conversa e produz uma especificação. A execução recebe a especificação aprovada e orienta o trabalho.</p></section>
    <div class="prompt-project-strip"><div><span class="project-overline">PROJETO ATUAL</span><strong>${esc(p.brief.title)}</strong></div><span class="status-chip ${p.approved ? "approved" : ""}">${p.approved ? "Especificação aprovada" : "Aprovação necessária"}</span></div>
    <div class="prompt-tabs"><button class="prompt-tab ${promptTab === "discovery" ? "active" : ""}" data-action="prompt-tab" data-tab="discovery"><span class="tab-number">A</span><span><strong>Prompt de descoberta</strong><small>Entrevistar · Esclarecer · Especificar</small></span><span class="tab-open">↗</span></button><button class="prompt-tab ${promptTab === "execution" ? "active" : ""} ${!p.approved ? "locked" : ""}" data-action="prompt-tab" data-tab="execution" ${!p.approved ? "disabled" : ""}><span class="tab-number">B</span><span><strong>Prompt de execução</strong><small>Implementar · Validar · Entregar</small></span><span class="tab-open">${p.approved ? "↗" : "▣"}</span></button></div>
    ${!p.approved ? `<div class="approval-required-note"><span>▣</span><div><strong>A execução está bloqueada até a aprovação.</strong><small>Revise os requisitos e aprove a especificação para liberar o Prompt B.</small></div><button class="text-link" data-page="requirements">Revisar especificação ↗</button></div>` : ""}
    <div class="prompt-editor-heading"><div><span class="eyebrow">${promptTab === "discovery" ? "PROMPT A · DESCOBERTA" : "PROMPT B · EXECUÇÃO"}</span><h2>${promptTab === "discovery" ? "O entrevistador" : "O briefing de execução"}</h2><p>${promptTab === "discovery" ? "Cole este prompt no LLM de destino para continuar a entrevista adaptativa." : "Uma instrução autossuficiente construída a partir dos requisitos aprovados."}</p></div><div class="editor-tools"><span class="version-count">${versions} versões salvas</span><button class="quiet-button compact" data-action="regenerate-prompt">↻ Regenerar</button></div></div>
    <div class="editor-shell"><div class="editor-topline"><span><i></i><i></i><i></i></span><small>${promptTab === "discovery" ? "discovery.prompt.md" : "execution.prompt.md"}</small><span class="editor-language">MARKDOWN</span></div><textarea id="prompt-editor" spellcheck="false" aria-label="Editable generated prompt">${esc(current)}</textarea><div class="editor-footer"><span>${current.length.toLocaleString("en-US")} characters</span><span>Editável · Alterações salvas localmente</span></div></div>
    <div class="prompt-actions"><button class="primary-button" data-action="copy-prompt">Copiar prompt <span>↗</span></button><button class="quiet-button" data-action="download-prompt">Baixar .md</button><button class="quiet-button" data-action="save-prompt-version">Salvar versão</button></div>
    <section class="refinement-panel"><div class="refinement-heading"><span class="refinement-icon">✳</span><div><div class="eyebrow">REFINAMENTO ITERATIVO</div><h3>Dê mais uma lapidada no prompt.</h3><p>Registre uma nova direção ou ajuste. A informação será preservada no projeto e incluída no prompt de execução regenerado.</p></div></div><textarea id="refinement-input" rows="3" placeholder="e.g. Prioritize mobile usability, preserve the existing palette and add measurable acceptance criteria for the onboarding flow."></textarea><div class="refinement-bottom"><small>${(p.refinements || []).length} notas de refinamento preservadas</small><button class="quiet-button compact" data-action="apply-refinement">Adicionar refinamento ↗</button></div>${p.refinements?.length ? `<div class="refinement-log">${p.refinements.map((r, i) => `<div><span>${String(i + 1).padStart(2, "0")}</span><p>${esc(r)}</p><button class="icon-button small" data-action="remove-refinement" data-index="${i}" title="Remover refinamento">×</button></div>`).join("")}</div>` : ""}</section>`;
}

function renderContext() {
  const p = activeProject();
  if (!p)
    return renderNoProject(
      "Crie ou abra um projeto para preservar seu contexto.",
    );
  p.context ||= [];
  return `<section class="page-intro compact-intro"><div class="eyebrow">MEMÓRIA DO PROJETO / PRESERVAÇÃO DE CONTEXTO</div><h1>Mantenha o que importa<br><em>sempre por perto.</em></h1><p>Armazene decisões, definições, notas de referência e restrições que devem sobreviver entre iterações do prompt.</p></section>
    <div class="context-project"><span class="context-project-mark">◫</span><div><small>PROJETO ATIVO</small><strong>${esc(p.brief.title)}</strong><span>${p.context.length} notas preservadas</span></div><span class="context-local-label">LOCAL A ESTE PROJETO</span></div>
    <div class="context-layout"><section class="context-main"><div class="section-heading"><div><div class="eyebrow">NOTAS PRESERVADAS</div><h2>Prateleira de contexto</h2></div><span class="small-count">${String(p.context.length).padStart(2, "0")} NOTAS</span></div>${p.context.length ? `<div class="context-list">${p.context.map((n, i) => `<article class="context-item ${n.pinned ? "pinned" : ""}"><div class="context-item-top"><span class="context-note-tag">${n.pinned ? "CONTEXTO FIXADO" : "NOTA DO PROJETO"}</span><div><button class="icon-button small" data-action="toggle-pin-note" data-index="${i}" title="Alternar fixação">${n.pinned ? "★" : "☆"}</button><button class="icon-button small" data-action="delete-context-note" data-index="${i}" title="Excluir nota">×</button></div></div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>Adicionada em ${fmtDate(n.createdAt)}</small></article>`).join("")}</div>` : `<div class="empty-state compact-empty"><div class="empty-illustration">◫</div><h3>A prateleira ainda está vazia.</h3><p>Adicione uma decisão importante ou detalhe do projeto. Notas fixadas recebem destaque no prompt de execução.</p></div>`}</section>
    <aside class="context-add-panel"><span class="eyebrow">ADICIONAR AO CONTEXTO</span><h3>Preserve um detalhe.</h3><form id="context-form"><div class="field"><label for="context-title">Título da nota</label><input id="context-title" name="title" required maxlength="80" placeholder="e.g. Brand voice decision"/></div><div class="field"><label for="context-body">O que o modelo deve lembrar?</label><textarea id="context-body" name="body" required rows="6" placeholder="Escreva a decisão, definição, fonte, restrição ou contexto relevante..."></textarea></div><label class="delegate-option pin-option"><input type="checkbox" name="pinned"/><span class="custom-check"></span><span><strong>Fixar esta nota</strong><small>Marcar como contexto especialmente importante.</small></span></label><button class="primary-button full-width" type="submit">Salvar nota de contexto <span>↗</span></button></form></aside></div>
    <div class="context-footnote"><span>ⓘ</span> As notas são armazenadas neste navegador e incluídas na geração dos prompts. Exporte um backup do projeto antes de migrar para outro dispositivo.</div>`;
}

function renderModules() {
  const categories = ["all", ...new Set(MODULES.map((m) => m.category))];
  const filtered = MODULES.filter(
    (m) =>
      (moduleFilter === "all" || m.category === moduleFilter) &&
      `${m.name} ${m.description}`
        .toLowerCase()
        .includes(moduleSearch.toLowerCase()),
  );
  return `<section class="page-intro compact-intro"><div class="eyebrow">MÓDULOS DE DOMÍNIO / DESCOBERTA ESPECIALIZADA</div><h1>Trabalhos diferentes,<br><em>perguntas diferentes.</em></h1><p>Cada módulo possui uma perspectiva própria de descoberta. Selecione um domínio para iniciar um projeto com suas perguntas preparadas.</p></section>
    <div class="module-toolbar"><div class="filter-chips">${categories.map((c) => `<button class="filter-chip ${moduleFilter === c ? "active" : ""}" data-action="module-filter" data-filter="${esc(c)}">${c === "all" ? "Todos os módulos" : esc(c)}</button>`).join("")}</div><input id="module-search" class="search-input" type="search" placeholder="Buscar módulos..." value="${esc(moduleSearch)}"/></div>
    <div class="module-library-grid">${filtered.map((m, i) => `<article class="module-card"><div class="module-card-top"><span class="module-card-icon">${m.icon}</span><span class="module-card-num">${String(i + 1).padStart(2, "0")}</span></div><span class="module-category">${esc(m.category)}</span><h3>${esc(m.name)}</h3><p>${esc(m.description)}</p><div class="module-card-bottom"><span>${m.questions.length + CORE_QUESTIONS.length} perguntas de descoberta</span><button class="text-link" data-action="new-with-module" data-module="${m.id}">Usar módulo ↗</button></div><details class="module-details"><summary>Ver foco da descoberta</summary><ol>${m.questions.map((q) => `<li><strong>${esc(q[0])}</strong><span>${esc(q[1])}</span></li>`).join("")}</ol></details></article>`).join("") || '<div class="empty-state"><h3>Nenhum módulo encontrado.</h3><p>Tente outro termo ou categoria.</p></div>'}</div>
    <div class="module-library-note"><span class="tiny-star">✳</span><p>Os módulos são estruturas iniciais, não formulários rígidos. Campos sem resposta podem permanecer em aberto, e o LLM de destino recebe a orientação de perguntar apenas o que afeta materialmente o resultado.</p></div>`;
}

function renderReferences() {
  return `<section class="page-intro compact-intro"><div class="eyebrow">DIREÇÃO DE ARTE / ARQUIVO DE REFERÊNCIAS</div><h1>Um sistema delicado<br><em>para trabalhos sérios.</em></h1><p>A biblioteca visual mantém as referências fornecidas disponíveis como material de direção. Elas orientam tom, tipografia, cor e composição.</p></section>
    <section class="palette-panel"><div class="section-heading"><div><div class="eyebrow">SISTEMA DE CORES</div><h2>Paleta Daze Social</h2><p class="section-subtitle">Extraída da prancha de identidade fornecida.</p></div><span class="small-count">09 CORES</span></div><div class="palette-grid">${PALETTE.map((c) => `<button class="palette-swatch" data-action="copy-color" data-color="${c.hex}" title="Copiar ${c.hex}"><span style="background:${c.hex}"></span><strong>${c.name}</strong><small>${c.hex}</small></button>`).join("")}</div></section>
    <section class="type-panel"><div class="section-heading"><div><div class="eyebrow">DIREÇÃO TIPOGRÁFICA</div><h2>Quatro vozes, um sistema</h2><p class="section-subtitle">Combinações de fontes para web inspiradas nos espécimes enviados.</p></div></div><div class="type-grid"><div class="type-specimen serif-spec"><small>SERIFADA EDITORIAL / INSPIRADA EM MINYA</small><strong>Ideias ganham forma.</strong><p>Títulos, momentos editoriais e declarações.</p></div><div class="type-specimen sans-spec"><small>SANS-SERIF FUNCIONAL / INTERFACE</small><strong>Torne a próxima decisão clara.</strong><p>Navegação, formulários, textos explicativos e controles.</p></div><div class="type-specimen script-spec"><small>SCRIPT ORNAMENTAL / INSPIRADO EM FAIRY GARDEN</small><strong>comece com uma ideia</strong><p>Pequenos acentos, assinaturas e etiquetas expressivas.</p></div><div class="type-specimen display-spec"><small>DISPLAY / LUCKIEST GUY</small><strong>MAKE IT CLEAR</strong><p>Etiquetas curtas e pequenos momentos expressivos.</p></div></div><p class="font-note">O ZIP contém imagens de espécimes, não arquivos de fontes instaláveis. Minya, Jerencia e Fairy Garden são representadas neste protótipo por alternativas compatíveis com a web; os arquivos originais poderão substituí-las quando forem fornecidos com direitos adequados de uso web.</p></section>
    <section class="section-block"><div class="section-heading"><div><div class="eyebrow">MATERIAIS FORNECIDOS</div><h2>Arquivo de referências</h2><p class="section-subtitle">As imagens originais foram preservadas nos arquivos do projeto.</p></div><span class="small-count">07 REFERÊNCIAS</span></div><div class="reference-grid">${REFERENCES.map((r) => `<article class="reference-card"><div class="reference-image"><img src="assets/references/${r.file}" alt="${esc(r.title)} reference" loading="lazy"/></div><div class="reference-caption"><strong>${esc(r.title)}</strong><p>${esc(r.caption)}</p></div></article>`).join("")}</div></section>`;
}

function renderSettings() {
  return `<section class="page-intro compact-intro"><div class="eyebrow">PREFERÊNCIAS DO ESPAÇO</div><h1>Seu trabalho,<br><em>sob seu controle.</em></h1><p>O Prompt-Bereshit funciona, nesta versão, como um protótipo local-first. Gerencie backups e entenda onde as informações são armazenadas.</p></section>
    <div class="settings-grid"><section class="settings-card"><span class="settings-icon">⇧</span><div class="eyebrow">BACKUP E PORTABILIDADE</div><h3>Exporte seu espaço de trabalho</h3><p>Baixe todos os projetos, especificações, prompts salvos, notas de refinamento e contextos em um backup JSON.</p><button class="primary-button" data-action="export-workspace">Exportar workspace JSON ↗</button><button class="quiet-button" data-action="import-workspace">Importar um backup</button></section><section class="settings-card"><span class="settings-icon">⌂</span><div class="eyebrow">ARMAZENAMENTO LOCAL</div><h3>Onde seu trabalho fica salvo</h3><p>Os projetos ficam salvos neste navegador usando localStorage. Eles não são enviados a um servidor nem compartilhados automaticamente entre dispositivos.</p><div class="privacy-points"><span>✓ Sem necessidade de conta</span><span>✓ Nenhuma chave de API armazenada</span><span>✓ Dados de projeto exportáveis</span></div></section><section class="settings-card"><span class="settings-icon">✳</span><div class="eyebrow">ENVIO PARA O LLM</div><h3>Pronto para trabalhar com seu modelo</h3><p>O espaço cria prompts autossuficientes que podem ser copiados para o LLM de sua preferência. O chat de IA ao vivo ainda não está conectado nesta versão.</p><div class="integration-badge"><span class="status-dot"></span>Geração de prompts disponível localmente</div></section><section class="settings-card danger-card"><span class="settings-icon">⌫</span><div class="eyebrow">CONTROLE DE DADOS</div><h3>Limpar o espaço deste navegador</h3><p>Esta ação remove projetos e notas do navegador atual. Exporte um backup antes caso precise preservá-los.</p><button class="danger-button" data-action="clear-workspace">Excluir espaço local</button></section></div>
    <div class="settings-footnote"><strong>Limites do protótipo:</strong> orientação estruturada de descoberta, verificações de contradição baseadas em regras e montagem de prompts funcionam localmente. Entrevista semântica por IA, reescrita com modelo, sincronização em nuvem, autenticação e colaboração exigem backend e integração com LLM, ainda não incluídos nesta versão.</div>`;
}

function renderPage() {
  switch (page) {
    case "new":
      return renderNew();
    case "interview":
      return renderInterview();
    case "requirements":
      return renderRequisitos();
    case "studio":
      return renderStudio();
    case "context":
      return renderContext();
    case "modules":
      return renderModules();
    case "references":
      return renderReferences();
    case "settings":
      return renderSettings();
    default:
      return renderDashboard();
  }
}

function saveInterviewAnswer() {
  const p = activeProject();
  if (!p) return;
  const queue = getInterviewQueue(p);
  const q = queue[interviewIndex];
  p.answers[interviewIndex] = {
    id: q.id,
    value: $("#interview-answer")?.value || "",
    delegate: $("#delegate-answer")?.checked || false,
  };
  touch(p);
}
function finishInterview() {
  saveInterviewAnswer();
  const p = activeProject();
  const latestQueue = getInterviewQueue(p);
  if (interviewIndex < latestQueue.length - 1) {
    interviewIndex++;
    setPage("interview");
    return;
  }
  p.requirements = buildRequirements(p);
  p.approved = false;
  p.prompts = { discovery: buildDiscoveryPrompt(p), execution: "" };
  touch(p);
  setPage("requirements");
}
function downloadFile(name, content, type = "text/markdown;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copiado para a área de transferência.");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    showToast(
      ok
        ? "Copiado para a área de transferência."
        : "Não foi possível copiar. Selecione e copie o texto manualmente.",
    );
  }
}

function bindEvents() {
  $("#view")?.addEventListener("click", handleClick);
  $("#view")?.addEventListener("submit", handleSubmit);
  $("#view")?.addEventListener("change", handleChange);
  $("#view")?.addEventListener("input", handleInput);
  $$("[data-page]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const next = el.dataset.page;
      if (next === "requirements" || next === "studio" || next === "context") {
        if (!activeProject()) {
          showToast("Abra ou crie um projeto primeiro.");
          return;
        }
      }
      setPage(next);
    }),
  );
  $("#import-file")?.addEventListener("change", handleImport);
}

function handleClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "open-project") {
    state.activeProjectId = btn.dataset.id;
    persist();
    interviewIndex = 0;
    promptTab = "discovery";
    setPage("requirements");
    return;
  }
  if (action === "delete-project") {
    const p = state.projects.find((x) => x.id === btn.dataset.id);
    if (!p) return;
    if (!confirm(`Excluir “${p.brief.title}” deste navegador?`)) return;
    state.projects = state.projects.filter((x) => x.id !== p.id);
    if (state.activeProjectId === p.id) state.activeProjectId = null;
    persist();
    render();
    showToast("Projeto excluído.");
    return;
  }
  if (action === "new-with-module") {
    window.newDraft = { moduleId: btn.dataset.module };
    setPage("new");
    const sel = $("#project-module");
    if (sel) sel.value = btn.dataset.module;
    return;
  }
  if (action === "jump-question") {
    saveInterviewAnswer();
    interviewIndex = Number(btn.dataset.index);
    setPage("interview");
    return;
  }
  if (action === "prev-question") {
    saveInterviewAnswer();
    interviewIndex = Math.max(0, interviewIndex - 1);
    setPage("interview");
    return;
  }
  if (action === "next-question") {
    saveInterviewAnswer();
    interviewIndex = Math.min(
      getInterviewQueue(activeProject()).length - 1,
      interviewIndex + 1,
    );
    setPage("interview");
    return;
  }
  if (action === "skip-question") {
    saveInterviewAnswer();
    interviewIndex = Math.min(
      getInterviewQueue(activeProject()).length - 1,
      interviewIndex + 1,
    );
    setPage("interview");
    return;
  }
  if (action === "finish-interview") {
    finishInterview();
    return;
  }
  if (action === "rebuild-requirements") {
    const p = activeProject();
    if (!p) return;
    const priorities = Object.fromEntries(
      (p.requirements || []).map((r) => [
        r.category + "|" + r.description,
        r.priority,
      ]),
    );
    p.requirements = buildRequirements(p).map((r) => ({
      ...r,
      priority: priorities[r.category + "|" + r.description] || r.priority,
    }));
    p.approved = false;
    p.prompts.execution = "";
    touch(p);
    render();
    showToast("Requisitos reconstruídos a partir das respostas mais recentes.");
    return;
  }
  if (action === "approve-spec") {
    const p = activeProject();
    if (!p) return;
    const conflicts = scanContradictions(p);
    if (
      conflicts.length &&
      !confirm(
        "Há possíveis contradições nesta especificação. Deseja aprová-la mesmo assim e manter os avisos no prompt de execução?",
      )
    )
      return;
    p.approved = true;
    p.prompts.execution = buildExecutionPrompt(p);
    touch(p);
    promptTab = "execution";
    setPage("studio");
    return;
  }
  if (action === "prompt-tab") {
    if (btn.dataset.tab === "execution" && !activeProject()?.approved) {
      showToast("Aprove a especificação antes de abrir o prompt de execução.");
      return;
    }
    savePromptEditor();
    promptTab = btn.dataset.tab;
    render();
    return;
  }
  if (action === "regenerate-prompt") {
    const p = activeProject();
    p.prompts[promptTab] =
      promptTab === "discovery"
        ? buildDiscoveryPrompt(p)
        : buildExecutionPrompt(p);
    touch(p);
    render();
    showToast("Prompt regenerado com o contexto atual do projeto.");
    return;
  }
  if (action === "copy-prompt") {
    const p = activeProject();
    savePromptEditor();
    copyText(p.prompts[promptTab] || "");
    return;
  }
  if (action === "download-prompt") {
    const p = activeProject();
    savePromptEditor();
    downloadFile(
      `${slug(p.brief.title)}-${promptTab}.md`,
      p.prompts[promptTab] || "",
    );
    return;
  }
  if (action === "save-prompt-version") {
    const p = activeProject();
    savePromptEditor();
    p.promptHistory ||= [];
    p.promptHistory.unshift({
      type: promptTab,
      content: p.prompts[promptTab],
      createdAt: new Date().toISOString(),
    });
    touch(p);
    render();
    showToast("Versão do prompt salva.");
    return;
  }
  if (action === "apply-refinement") {
    const p = activeProject();
    const note = $("#refinement-input")?.value.trim();
    if (!note) {
      showToast("Escreva primeiro uma direção de refinamento.");
      return;
    }
    p.refinements ||= [];
    p.refinements.push(note);
    p.prompts.execution = buildExecutionPrompt(p);
    p.prompts.discovery =
      buildDiscoveryPrompt(p) +
      `\n\n## Additional refinement direction\n${note}`;
    touch(p);
    render();
    showToast("Refinamento preservado e incluído nos prompts regenerados.");
    return;
  }
  if (action === "remove-refinement") {
    const p = activeProject();
    p.refinements.splice(Number(btn.dataset.index), 1);
    p.prompts.execution = buildExecutionPrompt(p);
    touch(p);
    render();
    return;
  }
  if (action === "toggle-pin-note") {
    const p = activeProject();
    const n = p.context[Number(btn.dataset.index)];
    n.pinned = !n.pinned;
    touch(p);
    render();
    return;
  }
  if (action === "delete-context-note") {
    const p = activeProject();
    p.context.splice(Number(btn.dataset.index), 1);
    touch(p);
    render();
    return;
  }
  if (action === "module-filter") {
    moduleFilter = btn.dataset.filter;
    render();
    return;
  }
  if (action === "copy-color") {
    copyText(btn.dataset.color);
    return;
  }
  if (action === "export-workspace") {
    downloadFile(
      "prompt-bereshit-workspace.json",
      JSON.stringify(state, null, 2),
      "application/json",
    );
    showToast("Backup do workspace exportado.");
    return;
  }
  if (action === "import-workspace") {
    $("#import-file").click();
    return;
  }
  if (action === "clear-workspace") {
    if (
      !confirm(
        "Excluir todos os projetos e notas armazenados neste navegador? Essa ação não poderá ser desfeita.",
      )
    )
      return;
    localStorage.removeItem(KEY);
    state = { projects: [], activeProjectId: null, globalNotes: [] };
    page = "dashboard";
    render();
    showToast("Espaço local limpo.");
    return;
  }
}
function slug(v = "project") {
  return (
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}
function savePromptEditor() {
  const p = activeProject();
  const editor = $("#prompt-editor");
  if (p && editor) {
    p.prompts[promptTab] = editor.value;
    touch(p);
  }
}
function handleSubmit(e) {
  if (e.target.id === "new-project-form") {
    e.preventDefault();
    window.newDraft = null;
    createProject(e.target);
    return;
  }
  if (e.target.id === "context-form") {
    e.preventDefault();
    const p = activeProject();
    const d = Object.fromEntries(new FormData(e.target).entries());
    p.context ||= [];
    p.context.push({
      id: uuid(),
      title: d.title,
      body: d.body,
      pinned: d.pinned === "on",
      createdAt: new Date().toISOString(),
    });
    touch(p);
    render();
    showToast("Nota de contexto salva.");
  }
}
function handleChange(e) {
  if (e.target.matches("[data-priority-id]")) {
    const p = activeProject();
    const r = p.requirements.find((x) => x.id === e.target.dataset.priorityId);
    if (r) {
      r.priority = e.target.value;
      p.approved = false;
      touch(p);
      showToast(
        `${r.id}: prioridade atualizada. Aprove novamente a especificação para atualizar o Prompt B.`,
      );
    }
  }
}
function handleInput(e) {
  if (e.target.id === "prompt-editor") {
    const p = activeProject();
    if (p) {
      p.prompts[promptTab] = e.target.value;
      touch(p);
    }
  }
  if (e.target.id === "module-search") {
    moduleSearch = e.target.value;
    const pos = e.target.selectionStart;
    const view = $("#view");
    const oldScroll = window.scrollY;
    view.innerHTML = renderModules();
    const inp = $("#module-search");
    inp.focus();
    inp.setSelectionRange(pos, pos);
    window.scrollTo(0, oldScroll);
  }
}
function bindViewOnly() {
  $("#view")?.addEventListener("click", handleClick);
  $("#view")?.addEventListener("submit", handleSubmit);
  $("#view")?.addEventListener("change", handleChange);
  $("#view")?.addEventListener("input", handleInput);
}
function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!Array.isArray(incoming.projects))
        throw new Error("Arquivo de backup inválido");
      if (
        !confirm(
          `Importar ${incoming.projects.length} projeto(s)? Os projetos existentes serão mantidos e os novos serão adicionados.`,
        )
      )
        return;
      const ids = new Set(state.projects.map((p) => p.id));
      for (const p of incoming.projects) {
        if (ids.has(p.id)) p.id = uuid();
        state.projects.push(p);
      }
      state.globalNotes = [
        ...(state.globalNotes || []),
        ...(incoming.globalNotes || []),
      ];
      if (!state.activeProjectId && state.projects[0])
        state.activeProjectId = state.projects[0].id;
      persist();
      page = "dashboard";
      render();
      showToast("Backup do workspace importado.");
    } catch (err) {
      showToast(`Falha na importação: ${err.message}`);
    }
    e.target.value = "";
  };
  reader.readAsText(file);
}

render();
