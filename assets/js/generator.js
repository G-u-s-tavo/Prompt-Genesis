import { MODULES, CORE_QUESTIONS } from "./modules.js";

const clean = (value = "") => String(value ?? "").trim();
const list = (items) =>
  items
    .filter(Boolean)
    .map((x) => `- ${x}`)
    .join("\n") || "- Não especificado.";

export function getModule(id) {
  return MODULES.find((m) => m.id === id) || MODULES[0];
}

export function getInterviewQueue(project) {
  const module = getModule(project.moduleId);
  const base = [
    ...CORE_QUESTIONS.map((q, i) => ({
      id: `core-${i}`,
      group: "Descoberta geral",
      title: q[0],
      question: q[1],
      placeholder: q[2],
    })),
    ...module.questions.map((q, i) => ({
      id: `${module.id}-${i}`,
      group: module.name,
      title: q[0],
      question: q[1],
      placeholder: q[2],
    })),
  ];
  // Ramificações locais: perguntas extras aparecem quando a ideia ou respostas revelam uma dependência relevante (ajudando o usuário na sua decisão).
  const corpus = [
    project.brief?.idea,
    project.brief?.goal,
    project.brief?.constraints,
    ...(project.answers || []).map((a) => a?.value),
  ]
    .join(" ")
    .toLowerCase();
  const followUps = [];
  if (
    /\b(api|backend|back-end|database|banco de dados|autentica|login|integração|integrações|integra)\b/.test(
      corpus,
    )
  ) {
    followUps.push({
      id: "adaptive-data",
      group: "Aprofundamento adaptativo",
      title: "Limites de dados e integrações",
      question:
        "Você mencionou uma dependência técnica. Qual parte deverá controlar os dados, as credenciais ou a integração, e o que deve acontecer quando esse serviço estiver indisponível?",
      placeholder:
        "Esclareça se isso será local, no servidor, externo, opcional ou ainda está indefinido.",
    });
  }
  if (
    /\b(brand|branding|marca|identidade visual|paleta|tipografia|fontes|logo|logotipo|referências visuais)\b/.test(
      corpus,
    )
  ) {
    followUps.push({
      id: "adaptive-visual",
      group: "Aprofundamento adaptativo",
      title: "Fidelidade às referências",
      question:
        "Quais partes das referências visuais precisam ser preservadas e quais servem apenas como inspiração?",
      placeholder:
        "Separe decisões exatas, como cores e funções tipográficas, de referências mais amplas de atmosfera e composição.",
    });
  }
  if (
    /\b(equipe|time|comunidade|colaboração|colaboracao|vários usuários|varios usuarios|perfis|administrador|admin)\b/.test(
      corpus,
    )
  ) {
    followUps.push({
      id: "adaptive-roles",
      group: "Aprofundamento adaptativo",
      title: "Papéis e permissões",
      question:
        "Você mencionou várias pessoas ou perfis. Quem poderá criar, visualizar, editar, aprovar ou excluir informações?",
      placeholder:
        "Descreva os papéis e permissões, ou delegue ao modelo a recomendação de uma estrutura simples.",
    });
  }
  if (
    /\b(pagamento|cobrança|cobranca|dados pessoais|informações pessoais|informacoes pessoais|documentos privados|dados sensíveis|dados sensiveis)\b/.test(
      corpus,
    )
  ) {
    followUps.push({
      id: "adaptive-privacy",
      group: "Aprofundamento adaptativo",
      title: "Privacidade e informações sensíveis",
      question:
        "O projeto lida com informações pessoais, privadas ou relacionadas a pagamentos? O que deve ser coletado, protegido ou deliberadamente evitado?",
      placeholder:
        "Descreva o mínimo necessário, os limites de acesso e as expectativas de privacidade.",
    });
  }
  const seen = new Set();
  return [
    ...base,
    ...followUps.filter((q) => !seen.has(q.id) && seen.add(q.id)),
  ];
}

export function scanContradictions(project) {
  const text = [
    project.brief?.idea,
    project.brief?.goal,
    project.brief?.audience,
    project.brief?.constraints,
    ...(project.answers || []).map((a) => a.value),
    ...(project.context || []).map((c) => c.body),
  ]
    .join(" ")
    .toLowerCase();
  const checks = [
    {
      id: "static-persistence",
      title: "Possível conflito entre site estático e dados persistentes",
      test:
        /\b(static|estático|estatica|estático|sem backend|sem servidor|sem api)\b/.test(
          text,
        ) &&
        /\b(login|autentica|conta de usuário|contas de usuário|banco de dados|database|salvar na nuvem|persistência remota|dados persistentes)\b/.test(
          text,
        ),
      detail:
        "O briefing sugere uma solução sem backend, mas também menciona autenticação, contas ou persistência remota. Confirme se uma API ou serviço de backend será necessário.",
    },
    {
      id: "no-animation",
      title: "Possível conflito nas expectativas de movimento",
      test:
        /\b(sem animação|sem animações|no animation|não animar|nao animar)\b/.test(
          text,
        ) &&
        /\b(animação|animações|animado|animated|motion design)\b/.test(text),
      detail:
        "Há referências simultâneas à ausência de animações e ao uso de movimento. Especifique quais elementos podem ou não se mover.",
    },
    {
      id: "no-framework",
      title: "Possível conflito entre restrição de framework e stack",
      test:
        /\b(sem framework|não usar framework|nao usar framework|no frameworks)\b/.test(
          text,
        ) && /\b(react|vue|angular|next\.js|svelte|nuxt)\b/.test(text),
      detail:
        "O texto restringe frameworks, mas também cita uma tecnologia normalmente utilizada como framework ou meta-framework. Confirme a preferência.",
    },
    {
      id: "no-external",
      title:
        "Possível conflito entre ausência de dependências e integração externa",
      test:
        /\b(sem dependências|sem dependencias|sem bibliotecas|zero dependencies|no external libraries)\b/.test(
          text,
        ) &&
        /\b(api externa|biblioteca|library|sdk|integração externa|integração com)\b/.test(
          text,
        ),
      detail:
        "O projeto parece evitar dependências externas, mas também solicita uma integração ou biblioteca. Defina qual requisito tem prioridade.",
    },
    {
      id: "privacy-accounts",
      title: "Revisar anonimato e identificação de usuários",
      test:
        /\b(anônimo|anonimo|anonymous|sem cadastro|sem conta)\b/.test(text) &&
        /\b(perfil pessoal|conta de usuário|contas de usuários|login|histórico individual|historico individual)\b/.test(
          text,
        ),
      detail:
        "O projeto menciona uso anônimo e também recursos associados a uma identidade individual. Esclareça se haverá contas opcionais ou uso sem identificação.",
    },
    {
      id: "offline-online",
      title: "Revisar dependência de conexão",
      test:
        /\b(offline|sem internet|sem conexão|sem conexao)\b/.test(text) &&
        /\b(tempo real|real-time|busca na web|api remota|serviço externo|servico externo)\b/.test(
          text,
        ),
      detail:
        "O briefing combina funcionamento sem conexão com recursos que dependem de serviços remotos. Defina o comportamento offline esperado.",
    },
  ];
  return checks.filter((c) => c.test);
}

export function buildRequirements(project) {
  const brief = project.brief || {};
  const module = getModule(project.moduleId);
  const requirements = [];
  const add = (category, description, priority = "P1", criteria = "") => {
    if (!clean(description)) return;
    requirements.push({
      id: `PB-${String(requirements.length + 1).padStart(3, "0")}`,
      category,
      description: clean(description),
      priority,
      dependencies: [],
      criteria:
        criteria ||
        `O resultado deve contemplar: ${clean(description).toLowerCase()}.`,
    });
  };
  add(
    "Objetivo",
    `Entregar ${clean(brief.title) || "o projeto proposto"}: ${clean(brief.goal) || clean(brief.idea)}`,
    "P0",
    "O resultado final deve responder ao objetivo declarado pelo usuário e manter o escopo acordado.",
  );
  add(
    "Contexto do projeto",
    clean(brief.idea),
    "P0",
    "A solução deve refletir a ideia de origem sem substituir a intenção do usuário por suposições.",
  );
  add(
    "Público",
    clean(brief.audience),
    "P1",
    "Decisões de linguagem, formato e experiência devem considerar o público informado.",
  );
  add(
    "Entregável esperado",
    clean(brief.deliverable),
    "P0",
    "O material entregue deve corresponder ao formato e ao nível de completude solicitado.",
  );
  add(
    "Domínio",
    `Aplicar o módulo ${module.name}: ${module.tone}`,
    "P1",
    `A abordagem deve respeitar as práticas e os critérios próprios de ${module.name}.`,
  );
  add(
    "Restrições",
    clean(brief.constraints),
    "P0",
    "Nenhuma restrição obrigatória deve ser ignorada sem justificativa explícita e aprovação do usuário.",
  );
  const queue = getInterviewQueue(project);
  queue.forEach((q, i) => {
    const a = project.answers?.[i];
    if (a?.delegate || !clean(a?.value)) return;
    add(
      q.title,
      a.value,
      "P1",
      `A especificação deve preservar e atender ao requisito registrado em “${q.title}”.`,
    );
  });
  (project.context || []).forEach((item) =>
    add(
      "Contexto preservado",
      `${item.title}: ${item.body}`,
      item.pinned ? "P0" : "P2",
      `O contexto preservado “${item.title}” deve ser considerado durante a execução.`,
    ),
  );
  return requirements;
}

function formatAnswers(project) {
  const queue = getInterviewQueue(project);
  return queue
    .map((q, i) => {
      const a = project.answers?.[i];
      const value = a?.delegate
        ? "Decisão delegada ao LLM de destino. Recomende uma opção e explique as compensações."
        : clean(a?.value) ||
          "Não especificado; não invente. Pergunte apenas se isso afetar materialmente o resultado.";
      return `### ${q.title}\n${q.question}\nResposta: ${value}`;
    })
    .join("\n\n");
}

export function buildDiscoveryPrompt(project) {
  const b = project.brief || {};
  const m = getModule(project.moduleId);
  const conflicts = scanContradictions(project);
  return `# PROMPT-BERESHIT / PROMPT DE DESCOBERTA\n\n## 1. Papel\nAtue como Engenheiro(a) de Prompts Sênior, Analista de Requisitos e Consultor(a) especializado(a) em ${m.name}. Sua tarefa é entrevistar o usuário, compreender a ideia inicial, identificar informações ausentes e produzir uma especificação de requisitos aprovada. Você ainda não deve executar o projeto.\n\n## 2. Semente do projeto\n- Título provisório: ${clean(b.title) || "Projeto sem título"}\n- Módulo de domínio: ${m.name}\n- Ideia inicial: ${clean(b.idea) || "Não fornecida."}\n- Resultado pretendido: ${clean(b.goal) || "Não especificado."}\n- Público: ${clean(b.audience) || "Não especificado."}\n- Entregável esperado: ${clean(b.deliverable) || "Não especificado."}\n- Restrições conhecidas: ${clean(b.constraints) || "Não especificadas."}\n\n## 3. Regras da entrevista\n1. Comece resumindo, em um parágrafo breve, o que você compreendeu.\n2. Separe requisitos explícitos, implicações razoáveis, preferências opcionais, decisões indefinidas e restrições. Nunca apresente suposições como decisões do usuário.\n3. Faça uma pergunta por vez quando a resposta influenciar a pergunta seguinte. Agrupe perguntas independentes somente quando isso for claramente mais eficiente.\n4. Utilize as respostas registradas abaixo. Não peça ao usuário que repita informações.\n5. Quando o usuário não souber responder, apresente poucas alternativas ou recomende um padrão proporcional à necessidade. Permita que decisões sejam delegadas.\n6. Priorize perguntas que alterem materialmente escopo, arquitetura, qualidade ou entrega. Evite investigar detalhes que podem ser decididos mais tarde.\n7. Identifique contradições, explique por que importam e peça que o usuário as resolva. Não harmonize conflitos silenciosamente.\n8. Adapte as perguntas seguintes ao domínio ${m.name}.\n\n## 4. Registro atual da entrevista\n${formatAnswers(project)}\n\n## 5. Contexto preservado do projeto\n${(project.context || []).map((c) => `- ${c.title}: ${c.body}${c.pinned ? " [FIXADO]" : ""}`).join("\n") || "- Nenhuma nota de contexto adicional."}\n\n## 6. Direções de refinamento já registradas\n${(project.refinements || []).map((r, i) => `${i + 1}. ${r}`).join("\n") || "- Nenhum refinamento registrado."}\n\n## 7. Possíveis contradições identificadas pelo workspace\n${conflicts.length ? list(conflicts.map((c) => `${c.title}: ${c.detail}`)) : "- Nenhuma contradição detectada pelas regras locais. Isso não prova que o briefing esteja livre de conflitos."}\n\n## 8. Especificação obrigatória\nDepois da entrevista, produza: (A) compreensão do projeto; (B) requisitos separados, quando aplicável, em funcionais, não funcionais, técnicos, conteúdo/ativos e visuais/comunicacionais; (C) requisitos com identificadores, prioridades P0–P3, dependências e critérios de aceitação verificáveis; (D) decisões e suposições claramente diferenciadas; (E) perguntas em aberto e riscos; (F) sequência de execução recomendada; e (G) uma etapa explícita de aprovação pelo usuário.\n\n## 9. Foco do domínio: ${m.name}\n${m.tone}\n\n## 10. Limites operacionais\nNão implemente o projeto durante a descoberta. Não invente ativos, preferências, fatos, integrações ou aprovações técnicas. A especificação deve ser autossuficiente e transferível para um prompt de execução separado.`;
}

export function buildExecutionPrompt(project) {
  const b = project.brief || {};
  const m = getModule(project.moduleId);
  const requirements = project.requirements?.length
    ? project.requirements
    : buildRequirements(project);
  const conflicts = scanContradictions(project);
  const requirementBlock = requirements
    .map(
      (r) =>
        `[${r.id}] [${r.priority}] ${r.category}: ${r.description}\nDependências: ${(r.dependencies || []).join(", ") || "Não identificadas nesta etapa; verifique relações necessárias."}\nCritério de aceitação: ${r.criteria}`,
    )
    .join("\n\n");
  const contextBlock =
    (project.context || [])
      .map((c) => `- ${c.title}: ${c.body}${c.pinned ? " [FIXADO]" : ""}`)
      .join("\n") || "Nenhuma nota de contexto adicional.";
  const decisions = project.decisions?.length
    ? list(project.decisions)
    : "- Nenhuma decisão adicional foi registrada além do briefing e das respostas da entrevista.";
  const assumptions = project.assumptions?.length
    ? list(project.assumptions)
    : "- Não crie suposições sem necessidade. Identifique qualquer suposição necessária e explique seu impacto.";
  const refinement = project.refinements?.length
    ? project.refinements.map((r, i) => `${i + 1}. ${r}`).join("\n")
    : "Nenhum refinamento registrado.";
  return `# PROMPT-BERESHIT / PROMPT DE EXECUÇÃO\n\n## 1. Papel\nAtue como profissional sênior de ${m.name}, responsável pela execução e pela revisão de qualidade. Utilize julgamento profissional, mas preserve a intenção aprovada pelo usuário.\n\n## 2. Contexto do projeto\n- Projeto: ${clean(b.title) || "Projeto sem título"}\n- Domínio: ${m.name}\n- Público: ${clean(b.audience) || "Não especificado."}\n- Contexto e ideia inicial: ${clean(b.idea) || "Não fornecidos."}\n- Por que este trabalho importa: ${clean(b.goal) || "Não especificado."}\n\n## 3. Objetivo\n${clean(b.goal) || clean(b.deliverable) || "Entregar o projeto descrito na especificação aprovada."}\n\n## 4. Escopo e entregável\n${clean(b.deliverable) || "Utilize os requisitos aprovados para determinar o entregável exato."}\n\n## 5. Requisitos aprovados\n${requirementBlock}\n\n## 6. Registro da entrevista\n${formatAnswers(project)}\n\n## 7. Contexto preservado\n${contextBlock}\n\n## 8. Decisões\n${decisions}\n\n## 9. Suposições e pontos em aberto\n${assumptions}\n\n## 10. Restrições\n${clean(b.constraints) || "Nenhuma restrição adicional foi especificada. Não invente proibições que não foram declaradas."}\n\n## 11. Revisão de riscos e contradições\n${conflicts.length ? list(conflicts.map((c) => `${c.title}: ${c.detail} Resolva antes da implementação se o conflito alterar escopo ou correção.`)) : "- Não há contradições conhecidas pelas regras locais. Revise a especificação independentemente antes da execução."}\n\n## 12. Histórico de refinamento\n${refinement}\n\n## 13. Fluxo de trabalho\n1. Releia a especificação e informe ambiguidades relevantes antes de agir.\n2. Planeje o trabalho de acordo com sua complexidade. Identifique dependências e a menor sequência coerente de implementação.\n3. Execute em etapas. Preserve decisões e ativos já aprovados.\n4. Valide cada requisito importante de acordo com seu critério de aceitação.\n5. Informe o que foi implementado, o que foi testado, o que permanece incompleto e por quê.\n\n## 14. Qualidade e aceitação\n- Cumpra todos os requisitos P0.\n- Atenda aos requisitos P1 ou explique qualquer omissão.\n- Mantenha requisitos funcionais, técnicos, visuais e de conteúdo diferenciados.\n- Prefira soluções proporcionais e fáceis de manter à complexidade desnecessária.\n- Não invente fatos externos, ativos, credenciais, APIs ou resultados de testes.\n- Não afirme que algo funciona sem que tenha sido implementado e verificado.\n- Se um requisito não puder ser cumprido no ambiente disponível, explique a limitação e ofereça a alternativa viável mais útil.\n\n## 15. Comunicação e entrega final\nExplique decisões relevantes e compensações técnicas em linguagem acessível. Entregue os artefatos solicitados, instruções de uso/execução e um relatório conciso de validação. O resultado final deve ser compreensível sem acesso à conversa original de descoberta.\n\n## 16. Restrições explícitas do usuário\n${clean(b.constraints) || "Nenhuma especificada."}\n\n## 17. Condição final de sucesso\nO resultado só será satisfatório quando atender ao objetivo aprovado, respeitar os requisitos e restrições acima e apresentar evidências de validação adequadas ao tipo de trabalho.`;
}
