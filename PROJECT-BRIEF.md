# Prompt-Bereshit — Briefing do Produto

## Conceito
Prompt-Bereshit é um ambiente estruturado para desenvolvimento de prompts. Ajuda estudantes, criadores independentes e profissionais a transformar ideias incompletas em requisitos claros e instruções transferíveis para modelos LLM.

O nome faz referência a *Bereshit*, título hebraico de Gênesis e associado à ideia de começo e criação. A metáfora do produto é a criação pela articulação: uma ideia torna-se briefing; o briefing, especificação; e a especificação aprovada, prompt de execução.

## Fluxo central
1. Registrar a ideia inicial sem exigir vocabulário técnico.
2. Selecionar um módulo de domínio.
3. Conduzir uma entrevista adaptativa, orientada pelo domínio.
4. Separar requisitos explícitos, implicações, preferências, decisões em aberto e restrições.
5. Compilar requisitos categorizados com identificadores, prioridades, dependências e critérios de aceitação.
6. Identificar possíveis contradições e solicitar revisão do usuário.
7. Revisar e aprovar a especificação.
8. Gerar um Prompt de Descoberta autossuficiente e um Prompt de Execução separado.
9. Preservar contexto, decisões e histórico de refinamento entre iterações.

## Prompt A — Descoberta
Entrevista o usuário, esclarece ambiguidades, coleta informações ausentes e produz uma especificação estruturada. Não deve iniciar a implementação do projeto.

## Prompt B — Execução
Recebe a especificação aprovada, autossuficiente, e orienta o modelo de destino no planejamento, implementação, testes e entrega.

## Biblioteca de domínios
- Desenvolvimento Web
- UI/UX Design
- Identidade de Marca
- Design Gráfico
- Programação
- Pesquisa
- Documentação
- Análise de Dados
- Escrita Criativa

## Capacidades transversais
- Preservação de contexto
- Detecção de contradições
- Refinamento iterativo
- Priorização de requisitos (P0–P3)
- Critérios de aceitação
- Edição de prompts e histórico de versões
- Exportação de dados do espaço de trabalho

## Público e posicionamento
A experiência deve ser acolhedora para estudantes mais jovens, mantendo credibilidade e utilidade para profissionais. Não deve presumir que a pessoa já conheça termos técnicos. Quando ela não souber responder, o sistema oferece uma recomendação ou permite delegar a decisão.

## Voz e experiência
Clara, cuidadosa, sucinta, acessível e precisa. Fazer apenas perguntas que melhorem materialmente o resultado. Preservar a intenção original e distinguir decisões do usuário de recomendações do modelo.

## Direção visual
A linguagem visual deve ser editorial, discreta e bem acabada: base creme, tons botânicos e terrosos, acentos rosados e lavanda, serifada expressiva para títulos, sans-serif legível para interface e script/display em pequenas doses. A referência é uma aplicação profissional e agradável, não uma interface corporativa genérica nem um scrapbook ornamental.

## Limites do protótipo atual
A entrega inclui entrevistas locais estruturadas, alertas de contradição baseados em regras, compilação de requisitos, geração e edição de prompts, armazenamento local de contexto, versionamento e exportação/importação JSON. Orquestração de modelos ao vivo, backend, persistência na nuvem, contas, colaboração e sincronização são etapas futuras.
