# Prompt-Bereshit

**Ideias ganham estrutura.** Um ambiente local para transformar uma ideia inicial em uma especificação de requisitos e em dois prompts reutilizáveis e independentes: Descoberta e Execução.

## Como executar

O projeto utiliza HTML, CSS e módulos JavaScript nativos. Não exige instalação de pacotes nem etapa de compilação.

1. Extraia o ZIP.
2. Abra um terminal dentro da pasta `prompt-bereshit`.
3. Inicie um servidor local simples:

   ```bash
   python -m http.server 8000
   ```

4. Acesse `http://localhost:8000` no navegador.

Abrir `index.html` diretamente pode ser bloqueado por alguns navegadores porque o projeto carrega módulos JavaScript separados. Utilize o servidor local indicado acima.

## Ambientes incluídos

- **Visão geral:** projetos, estados e atalhos de criação.
- **Nova descoberta:** registra título, domínio, ideia original, objetivo, público, entregável e restrições.
- **Entrevista adaptativa:** combina perguntas gerais com seis perguntas especializadas no domínio selecionado. É possível pular perguntas ou delegar decisões ao LLM de destino.
- **Estúdio de requisitos:** organiza as respostas em requisitos categorizados, prioridades P0–P3 e critérios de aceitação. As prioridades podem ser alteradas e a especificação pode ser reconstruída.
- **Revisão de contradições:** identifica alguns conflitos comuns por meio de regras locais. Os alertas servem para revisão humana, não são raciocínio semântico nem prova de que o briefing esteja livre de conflitos.
- **Estúdio de prompts:** gera um Prompt de Descoberta autossuficiente e, após a aprovação, um Prompt de Execução separado. Os prompts podem ser editados, copiados, baixados em Markdown e salvos como versões locais.
- **Refinamento iterativo:** guarda orientações de refinamento e as incorpora aos prompts.
- **Biblioteca de contexto:** armazena decisões e notas do projeto. Notas fixadas são destacadas no Prompt de Execução.
- **Biblioteca de módulos:** Desenvolvimento Web, UI/UX Design, Identidade de Marca, Design Gráfico, Programação, Pesquisa, Documentação, Análise de Dados e Escrita Criativa.
- **Biblioteca visual:** reúne as imagens de referência fornecidas, a paleta extraída e a direção tipográfica.
- **Configurações e backup:** exporta/importa o espaço de trabalho em JSON e permite apagar os dados locais.

## Estrutura técnica

```text
index.html
assets/
  css/main.css
  js/app.js
  js/modules.js
  js/generator.js
  references/*.jpg
```

- `modules.js` contém os nove módulos, perguntas de descoberta, paleta e metadados das referências.
- `generator.js` monta a sequência de entrevista, verifica contradições por regras, compila requisitos e gera os dois prompts.
- `app.js` gerencia navegação, renderização, estado local, persistência, importação/exportação e interações.
- `main.css` contém o sistema visual e os ajustes responsivos.

## Direção visual

A paleta foi transcrita do painel de referência Daze Social enviado no ZIP:

| Cor | Código |
|---|---|
| Cloud | `#F4EFE6` |
| Peony | `#F7DDD5` |
| Dusty Rose | `#D8A4AF` |
| Sky | `#AFB8CD` |
| Lavender | `#CCC3D1` |
| Cacao | `#6B403B` |
| Jungle | `#65613F` |
| Grass | `#8D8B4C` |
| Leaf | `#C1BC77` |

A tipografia utiliza alternativas web hospedadas: DM Serif Display, DM Sans, Ballet e Luckiest Guy. O ZIP contém imagens de espécimes tipográficos, não os arquivos de fontes instaláveis. Minya, Jerencia e Fairy Garden foram tratadas como referências direcionais, não como fontes incluídas no projeto. A página carrega as fontes selecionadas do Google Fonts quando há conexão; as pilhas CSS possuem fontes alternativas locais.

## Dados e limites de integração

Esta entrega é um protótipo funcional de frontend, não um agente de IA conectado nem um serviço multiusuário.

- Os projetos são salvos no `localStorage` do navegador atual.
- Não há sincronização automática entre navegadores ou dispositivos. Utilize a exportação/importação JSON para transportar um espaço de trabalho.
- As entrevistas deste protótipo são formulários estruturados com perguntas que variam conforme o módulo selecionado. Elas não fazem chamadas a um LLM.
- A detecção de contradições é determinística e limitada às regras em `generator.js`.
- A montagem dos prompts ocorre localmente. Copie o resultado para o LLM de sua preferência.
- Esta versão não possui backend, contas, banco de dados compartilhado, chat de IA ao vivo, armazenamento de arquivos em nuvem ou gerenciamento de chaves de API.

## Próximas etapas para uma versão de produção

Para uso profissional por estudantes e equipes, a próxima camada arquitetural deverá incluir:

1. API de backend para proteger credenciais e orquestrar chamadas aos modelos.
2. Adaptadores de provedores LLM para entrevistas, extração estruturada e refinamento semântico.
3. Persistência com contas, projetos, versões, permissões e controles de acesso.
4. Análise de conflitos mais robusta, com explicações e resolução confirmada pelo usuário.
5. Ingestão de arquivos e referências com metadados de origem e permissões.
6. Testes automatizados para geração de prompts, persistência, importação/exportação e acessibilidade.
7. Política clara de privacidade, retenção e exclusão antes de habilitar uso multiusuário.

## Princípios do briefing original

O briefing HTML enviado define o produto como um sistema que transforma ideias iniciais ou incompletas em prompts autossuficientes, estruturados e executáveis. Ele pede descoberta adaptativa; separação entre requisitos explícitos, implicações, preferências, decisões não resolvidas e restrições; módulos especializados; requisitos com identificadores, prioridades, dependências e critérios de aceitação; uma arquitetura de prompt com papel, contexto, objetivo, escopo, requisitos, referências, instruções técnicas, fluxo de trabalho, entregáveis, validação, restrições e comunicação; e uma auditoria antes da entrega.

O briefing também define P0 (obrigatório), P1 (importante), P2 (recomendado) e P3 (opcional). Ele determina que o sistema não invente preferências do usuário nem comece a implementação enquanto requisitos críticos estiverem indefinidos. Esses princípios orientam o fluxo e os modelos de prompt desta versão.
