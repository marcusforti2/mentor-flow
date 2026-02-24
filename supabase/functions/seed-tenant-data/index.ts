import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const TENANT_ID = "860aaf1b-9172-4ff6-aa71-8958721e4968";
    const MENTOR_MEMBERSHIP_ID = "9b50abd1-1fa2-4fd2-bef7-705497cc1c59";
    const MENTOR_USER_ID = "31e81151-c678-4139-bc44-dfc020a1a560";
    const EXISTING_MENTEE_MEMBERSHIP_ID = "ca7505d6-318b-49aa-a0b7-c5c7412e3b45";

    const results: string[] = [];

    // ========== 1. CREATE 3 MENTEES ==========
    const mentees = [
      { email: "lucas.ferreira.demo@lbvpreview.com", name: "Lucas Ferreira", phone: "+5511999001001", instagram: "@lucasferreira.mkt", linkedin: "linkedin.com/in/lucasferreira", business: "LF Marketing Digital" },
      { email: "mariana.costa.demo@lbvpreview.com", name: "Mariana Costa", phone: "+5521988002002", instagram: "@marianacosta.vendas", linkedin: "linkedin.com/in/marianacosta", business: "MC Consultoria de Vendas" },
      { email: "rafael.oliveira.demo@lbvpreview.com", name: "Rafael Oliveira", phone: "+5531977003003", instagram: "@rafaoliveira.auto", linkedin: "linkedin.com/in/rafaeloliveira", business: "RO Automação Comercial" },
    ];

    const newMembershipIds: string[] = [];

    for (const m of mentees) {
      // Create auth user
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: m.email,
        password: "demo123456",
        email_confirm: true,
        user_metadata: { full_name: m.name, phone: m.phone },
      });
      if (authErr) {
        results.push(`⚠️ Auth user ${m.email}: ${authErr.message}`);
        continue;
      }
      const userId = authUser.user.id;

      // Update profile with extra fields
      await supabaseAdmin.from("profiles").update({
        instagram: m.instagram,
        linkedin: m.linkedin,
      }).eq("user_id", userId);

      // Create membership
      const { data: membership, error: memErr } = await supabaseAdmin.from("memberships").insert({
        user_id: userId,
        tenant_id: TENANT_ID,
        role: "mentee",
        status: "active",
      }).select("id").single();
      if (memErr) { results.push(`⚠️ Membership ${m.email}: ${memErr.message}`); continue; }

      const membershipId = membership.id;
      newMembershipIds.push(membershipId);

      // Mentee profile
      await supabaseAdmin.from("mentee_profiles").insert({
        membership_id: membershipId,
        business_name: m.business,
        onboarding_completed: true,
        onboarding_step: 5,
        joined_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
        business_profile: { segment: "vendas", stage: "crescimento", team_size: Math.floor(Math.random() * 5) + 1 },
      });

      // Assignment to mentor
      await supabaseAdmin.from("mentor_mentee_assignments").insert({
        mentor_membership_id: MENTOR_MEMBERSHIP_ID,
        mentee_membership_id: membershipId,
        tenant_id: TENANT_ID,
        status: "active",
        created_by_membership_id: MENTOR_MEMBERSHIP_ID,
      });

      // Invite (accepted)
      await supabaseAdmin.from("invites").insert({
        email: m.email,
        tenant_id: TENANT_ID,
        role: "mentee",
        status: "accepted",
        accepted_at: new Date().toISOString(),
        created_by_membership_id: MENTOR_MEMBERSHIP_ID,
        metadata: { full_name: m.name, phone: m.phone },
      });

      results.push(`✅ Mentorado criado: ${m.name} (${membershipId})`);
    }

    // All 4 mentee membership IDs
    const allMenteeIds = [EXISTING_MENTEE_MEMBERSHIP_ID, ...newMembershipIds];

    // ========== 2. METRICS DATA ==========
    const activityTypes = ["msg_enviada", "ligacao", "followup", "reuniao", "proposta"];
    const dealStages = ["lead", "conversa", "reuniao_marcada", "reuniao_feita", "proposta", "fechado", "perdido"];
    const dealSources = ["indicacao", "instagram", "linkedin", "cold_call", "evento"];
    const dealNames = [
      "Consultoria Empresarial", "Pacote Premium", "Treinamento Equipe", "Projeto Digital",
      "Mentoria Individual", "Workshop Vendas", "Análise Comercial", "Plano Anual",
    ];

    for (const mid of allMenteeIds) {
      // Activities (25 per mentee, last 30 days)
      const activities = [];
      for (let i = 0; i < 25; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const date = new Date(Date.now() - daysAgo * 86400000);
        activities.push({
          membership_id: mid,
          tenant_id: TENANT_ID,
          type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
          activity_date: date.toISOString().split("T")[0],
          count: Math.floor(Math.random() * 5) + 1,
        });
      }
      await supabaseAdmin.from("mentee_activities").insert(activities);

      // Deals (6 per mentee)
      const deals = [];
      for (let i = 0; i < 6; i++) {
        const stage = dealStages[Math.floor(Math.random() * dealStages.length)];
        const closed = (stage === "fechado" || stage === "perdido") ? new Date(Date.now() - Math.random() * 20 * 86400000).toISOString() : null;
        deals.push({
          membership_id: mid,
          tenant_id: TENANT_ID,
          deal_name: dealNames[Math.floor(Math.random() * dealNames.length)],
          value_cents: (Math.floor(Math.random() * 50) + 5) * 10000, // R$500 - R$5.500
          stage,
          source: dealSources[Math.floor(Math.random() * dealSources.length)],
          closed_at: closed,
          lost_reason: stage === "perdido" ? "Preço fora do orçamento" : null,
        });
      }
      await supabaseAdmin.from("mentee_deals").insert(deals);

      // Payments (4 per mentee)
      const paymentStatuses = ["recebido", "recebido", "recebido", "pendente"];
      const payments = [];
      for (let i = 0; i < 4; i++) {
        const monthsAgo = i;
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() - monthsAgo);
        const status = paymentStatuses[i];
        payments.push({
          membership_id: mid,
          tenant_id: TENANT_ID,
          amount_cents: 150000, // R$1.500
          status,
          due_date: dueDate.toISOString().split("T")[0],
          paid_at: status === "recebido" ? dueDate.toISOString() : null,
          description: `Mensalidade ${dueDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}`,
        });
      }
      await supabaseAdmin.from("mentee_payments").insert(payments);

      // Program Investment
      await supabaseAdmin.from("program_investments").insert({
        membership_id: mid,
        tenant_id: TENANT_ID,
        investment_amount_cents: 1800000, // R$18.000
        annual_program_value_cents: 1800000,
        monthly_team_cost_cents: 500000,
        monthly_ads_cost_cents: 200000,
        monthly_other_cost_cents: 100000,
        start_date: new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0],
        onboarding_date: new Date(Date.now() - 55 * 86400000).toISOString().split("T")[0],
      });

      results.push(`✅ Métricas populadas para membership: ${mid}`);
    }

    // ========== 3. MENTORADO FILES (notes/links, no actual file upload) ==========
    const fileTemplates = [
      { type: "note", title: "Plano de Ação Semanal", content: "## Metas da semana\n- 20 ligações\n- 5 reuniões\n- 2 propostas\n\n## Resultados\nEm andamento..." },
      { type: "note", title: "Análise de Concorrentes", content: "## Principais concorrentes\n1. Empresa A - foco em preço\n2. Empresa B - foco em qualidade\n\n## Nosso diferencial\nAtendimento personalizado + metodologia exclusiva" },
      { type: "link", title: "Planilha de Metas", url: "https://docs.google.com/spreadsheets/d/example" },
      { type: "link", title: "Apresentação Comercial", url: "https://docs.google.com/presentation/d/example" },
      { type: "note", title: "Roteiro de Ligação", content: "## Abertura\nOlá [nome], tudo bem? Aqui é [meu nome] da [empresa].\n\n## Qualificação\n- Qual seu principal desafio em vendas?\n- Quantos vendedores tem na equipe?\n\n## Próximos passos\nAgendar reunião de diagnóstico" },
    ];

    for (const mid of allMenteeIds) {
      const files = fileTemplates.map((f, i) => ({
        owner_membership_id: mid,
        uploaded_by_membership_id: MENTOR_MEMBERSHIP_ID,
        tenant_id: TENANT_ID,
        file_type: f.type,
        note_title: f.type === "note" ? f.title : null,
        note_content: f.type === "note" ? f.content : null,
        link_title: f.type === "link" ? f.title : null,
        link_url: f.type === "link" ? (f as any).url : null,
        tags: ["vendas", "gestão"],
        description: `Arquivo de apoio #${i + 1}`,
      }));
      await supabaseAdmin.from("mentorado_files").insert(files);
    }
    results.push("✅ Arquivos populados para todos os mentorados");

    // ========== 4. PLAYBOOKS ==========
    const playbooks = [
      {
        title: "Guia de Prospecção Ativa",
        description: "Técnicas de prospecção outbound para encontrar e abordar clientes ideais",
        tags: ["prospecção", "outbound", "vendas"],
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Guia de Prospecção Ativa" }] },
            { type: "paragraph", content: [{ type: "text", text: "A prospecção ativa é o motor de qualquer operação comercial de alta performance. Este guia apresenta as melhores práticas para encontrar e abordar seus clientes ideais." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Definição do ICP (Perfil de Cliente Ideal)" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Segmento de mercado e porte da empresa" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Cargo do decisor e influenciadores" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Dores e necessidades específicas" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Budget disponível e ciclo de compra" }] }] },
            ] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "2. Canais de Prospecção" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "LinkedIn: pesquisa avançada + InMail personalizado" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Cold Call: roteiro estruturado com gatilhos mentais" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Email frio: cadência de 5-7 touchpoints" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Instagram DM: abordagem social selling" }] }] },
            ] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "3. Métricas de Prospecção" }] },
            { type: "paragraph", content: [{ type: "text", text: "Meta diária: 20 abordagens → 5 conversas → 2 reuniões agendadas. Taxa de conversão esperada: 10-15% de abordagem para reunião." }] },
          ],
        },
      },
      {
        title: "Roteiro de Ligação de Vendas",
        description: "Scripts e frameworks para calls de vendas que convertem",
        tags: ["ligação", "script", "vendas"],
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Roteiro de Ligação de Vendas" }] },
            { type: "paragraph", content: [{ type: "text", text: "Frameworks testados para conduzir ligações de vendas que geram resultados previsíveis." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Fase 1: Abertura (30 segundos)" }] },
            { type: "paragraph", content: [{ type: "text", text: "\"Olá [nome], aqui é [seu nome] da [empresa]. Eu vi que você [contexto personalizado]. Tenho uma ideia que pode ajudar com [dor específica]. Faz sentido conversarmos 2 minutos?\"" }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Fase 2: Qualificação (3-5 minutos)" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Qual o principal desafio em vendas hoje?" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Quantos vendedores na equipe?" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Qual a meta mensal de faturamento?" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Já tentaram alguma solução antes?" }] }] },
            ] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Fase 3: Apresentação de Valor" }] },
            { type: "paragraph", content: [{ type: "text", text: "Conecte cada dor identificada com um benefício específico. Use casos de sucesso com números reais: \"O cliente X aumentou em 40% as vendas em 3 meses.\"" }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Fase 4: Próximos Passos" }] },
            { type: "paragraph", content: [{ type: "text", text: "\"Baseado no que conversamos, faz sentido agendarmos uma reunião de 30 minutos para eu apresentar como podemos resolver [dor]? Tenho disponibilidade [data/hora].\"" }] },
          ],
        },
      },
      {
        title: "Playbook de Objeções",
        description: "Como contornar as 20 objeções mais comuns em vendas",
        tags: ["objeções", "negociação", "vendas"],
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Playbook de Objeções" }] },
            { type: "paragraph", content: [{ type: "text", text: "As objeções são sinais de interesse. Aprenda a transformá-las em oportunidades de fechamento." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "\"Está caro\"" }] },
            { type: "paragraph", content: [{ type: "text", text: "Resposta: \"Entendo sua preocupação. Vamos analisar o retorno: se você fechar apenas 2 clientes extras por mês, o investimento já se paga. Qual o valor médio do seu ticket?\"" }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "\"Preciso pensar\"" }] },
            { type: "paragraph", content: [{ type: "text", text: "Resposta: \"Claro! Para te ajudar a pensar melhor, o que exatamente precisa avaliar? É o investimento, o prazo ou o formato? Assim posso te enviar informações específicas.\"" }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "\"Já tenho fornecedor\"" }] },
            { type: "paragraph", content: [{ type: "text", text: "Resposta: \"Ótimo! Isso mostra que você valoriza esse tipo de serviço. Muitos dos nossos clientes também tinham fornecedor antes. O que os fez mudar foi [diferencial específico].\"" }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "\"Não é o momento\"" }] },
            { type: "paragraph", content: [{ type: "text", text: "Resposta: \"Compreendo. Qual seria o momento ideal? Enquanto isso, posso compartilhar [conteúdo de valor] que vai te ajudar quando decidir avançar.\"" }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "\"Preciso falar com meu sócio\"" }] },
            { type: "paragraph", content: [{ type: "text", text: "Resposta: \"Perfeito! Que tal agendarmos uma reunião rápida com vocês dois? Assim posso tirar as dúvidas dele também e agilizar a decisão.\"" }] },
          ],
        },
      },
      {
        title: "Manual de Follow-up Eficiente",
        description: "Cadência e timing de follow-up que geram resultados",
        tags: ["follow-up", "cadência", "vendas"],
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Manual de Follow-up Eficiente" }] },
            { type: "paragraph", content: [{ type: "text", text: "80% das vendas acontecem entre o 5º e 12º follow-up. A maioria dos vendedores desiste no 2º." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Cadência Recomendada" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Dia 1: Email de recapitulação após reunião" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Dia 3: WhatsApp com conteúdo de valor relacionado" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Dia 7: Ligação para tirar dúvidas" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Dia 14: Email com caso de sucesso" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Dia 21: Ligação com proposta especial" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Dia 30: Último contato, criar urgência" }] }] },
            ] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Regras de Ouro" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Sempre agregue valor em cada contato" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Varie os canais (email, WhatsApp, ligação, LinkedIn)" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Personalize cada mensagem" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Registre tudo no CRM" }] }] },
            ] },
          ],
        },
      },
      {
        title: "Checklist de Fechamento",
        description: "Processo passo-a-passo para fechar deals com confiança",
        tags: ["fechamento", "processo", "vendas"],
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Checklist de Fechamento" }] },
            { type: "paragraph", content: [{ type: "text", text: "Um processo estruturado de fechamento aumenta a taxa de conversão em até 30%." }] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Antes da Reunião de Fechamento" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Proposta comercial revisada e personalizada" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Todas as objeções mapeadas e respostas preparadas" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Decisor confirmado na reunião" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Caso de sucesso similar preparado" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Condições especiais aprovadas internamente" }] }] },
            ] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Durante a Reunião" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Recapitular dores e necessidades identificadas" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Apresentar solução conectada às dores" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Mostrar ROI projetado com números" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "✅ Pedir o fechamento de forma direta" }] }] },
            ] },
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Técnicas de Fechamento" }] },
            { type: "paragraph", content: [{ type: "text", text: "1. Fechamento por alternativa: \"Prefere começar com o plano mensal ou trimestral?\"\n2. Fechamento por escassez: \"Essa condição é válida até sexta-feira.\"\n3. Fechamento por resumo: \"Então, recapitulando: você precisa de X, Y e Z. Nossa solução entrega tudo isso por R$X/mês. Faz sentido avançarmos?\"" }] },
          ],
        },
      },
    ];

    for (let i = 0; i < playbooks.length; i++) {
      const pb = playbooks[i];
      await supabaseAdmin.from("playbooks").insert({
        title: pb.title,
        description: pb.description,
        content: pb.content,
        tags: pb.tags,
        tenant_id: TENANT_ID,
        created_by_membership_id: MENTOR_MEMBERSHIP_ID,
        visibility: "all_mentees",
        position: i,
        is_pinned: i === 0,
      });
    }
    results.push("✅ 5 playbooks criados");

    // ========== 5. TRAILS ==========
    const trailsData = [
      {
        title: "Fundamentos de Vendas",
        description: "Construa uma base sólida de conhecimento em vendas consultivas",
        thumbnail_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1280&h=720&fit=crop",
        modules: [
          {
            title: "Mindset de Vendedor",
            description: "Desenvolva a mentalidade de alta performance em vendas",
            lessons: [
              { title: "A mentalidade do vendedor de sucesso", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 15 },
              { title: "Superando o medo da rejeição", type: "text", text: "## Superando o Medo da Rejeição\n\nA rejeição é parte natural do processo de vendas. Em média, um vendedor ouve \"não\" 9 vezes antes de ouvir \"sim\".\n\n### Estratégias práticas:\n1. **Reframing**: Cada \"não\" te aproxima do próximo \"sim\"\n2. **Desapego emocional**: Separe sua identidade do resultado\n3. **Aprendizado contínuo**: Analise cada rejeição como feedback\n4. **Volume**: Quanto mais tentativas, menor o impacto individual\n\n### Exercício diário:\nFaça 3 pedidos \"impossíveis\" por dia para dessensibilizar o medo da rejeição.", duration: 10 },
              { title: "Rotina de alta performance", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 12 },
            ],
          },
          {
            title: "Comunicação Persuasiva",
            description: "Domine as técnicas de comunicação que vendem",
            lessons: [
              { title: "Escuta ativa em vendas", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 18 },
              { title: "Storytelling para vendedores", type: "text", text: "## Storytelling para Vendedores\n\nHistórias vendem mais que argumentos lógicos. O cérebro humano retém 22x mais informação quando apresentada em formato de história.\n\n### Framework STAR para vendas:\n- **Situação**: Contexto do cliente (\"O João tinha uma loja de roupas com vendas estagnadas...\")\n- **Tarefa**: O desafio enfrentado\n- **Ação**: A solução aplicada\n- **Resultado**: Números concretos\n\n### 3 Tipos de histórias essenciais:\n1. História de origem (por que você faz o que faz)\n2. História de transformação (caso de sucesso)\n3. História de visão (futuro do cliente com sua solução)", duration: 12 },
              { title: "Linguagem corporal nas reuniões", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 14 },
            ],
          },
        ],
      },
      {
        title: "Prospecção e Qualificação",
        description: "Encontre e qualifique leads com eficiência máxima",
        thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1280&h=720&fit=crop",
        modules: [
          {
            title: "Encontrando Leads",
            description: "Técnicas avançadas para encontrar leads qualificados",
            lessons: [
              { title: "Prospecção via LinkedIn", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 20 },
              { title: "Construindo listas de prospecção", type: "text", text: "## Construindo Listas de Prospecção\n\n### Fontes de leads:\n1. **LinkedIn Sales Navigator**: Filtros avançados por cargo, empresa, localização\n2. **Google Maps**: Negócios locais por nicho\n3. **Instagram**: Hashtags e perfis de concorrentes\n4. **Eventos**: Participantes de webinars e conferências\n5. **Indicações**: Programa estruturado de referral\n\n### Critérios de qualidade:\n- ✅ Empresa com 10+ funcionários\n- ✅ Decisor identificado\n- ✅ Budget compatível\n- ✅ Timing adequado\n- ✅ Dor mapeada\n\n### Meta: 50 novos leads qualificados por semana", duration: 15 },
              { title: "Cold calling que funciona", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 16 },
            ],
          },
          {
            title: "Qualificando Oportunidades",
            description: "Frameworks para qualificar leads e priorizar esforço",
            lessons: [
              { title: "Framework BANT na prática", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 14 },
              { title: "Perguntas de qualificação", type: "text", text: "## Perguntas Poderosas de Qualificação\n\n### Budget (Orçamento):\n- Qual o investimento previsto para resolver esse problema?\n- Existe verba alocada para este projeto?\n\n### Authority (Autoridade):\n- Quem mais participa da decisão?\n- Como funciona o processo de aprovação na empresa?\n\n### Need (Necessidade):\n- Qual o impacto financeiro desse problema hoje?\n- O que acontece se nada mudar nos próximos 6 meses?\n\n### Timeline (Prazo):\n- Quando precisam da solução implementada?\n- Existe algum evento ou deadline que acelera a decisão?\n\n### Dica: Nunca faça mais de 3 perguntas seguidas sem dar algo de valor em troca.", duration: 10 },
              { title: "Scoring de leads", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 12 },
            ],
          },
        ],
      },
      {
        title: "Reuniões que Convertem",
        description: "Conduza reuniões de vendas com maestria e feche mais negócios",
        thumbnail_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1280&h=720&fit=crop",
        modules: [
          {
            title: "Preparação",
            description: "Como se preparar para reuniões de alto impacto",
            lessons: [
              { title: "Pesquisa pré-reunião", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 10 },
              { title: "Checklist de preparação", type: "text", text: "## Checklist de Preparação para Reuniões\n\n### 24h antes:\n- [ ] Pesquisar empresa no LinkedIn, site e redes sociais\n- [ ] Identificar notícias recentes sobre o prospect\n- [ ] Preparar 5 perguntas personalizadas\n- [ ] Revisar caso de sucesso similar\n- [ ] Testar link da reunião virtual\n\n### 1h antes:\n- [ ] Reler anotações de interações anteriores\n- [ ] Preparar demo/apresentação personalizada\n- [ ] Definir objetivo claro da reunião\n- [ ] Preparar proposta de próximos passos\n\n### Objetivo: Sair de cada reunião com um compromisso claro", duration: 8 },
              { title: "Montando sua apresentação", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 15 },
            ],
          },
          {
            title: "Condução e Fechamento",
            description: "Técnicas para conduzir reuniões e fechar na hora certa",
            lessons: [
              { title: "Estrutura da reunião perfeita", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 20 },
              { title: "Sinais de compra", type: "text", text: "## Identificando Sinais de Compra\n\nReconhecer sinais de compra permite fechar no momento certo.\n\n### Sinais verbais:\n- \"Como funciona o contrato?\"\n- \"Vocês aceitam parcelamento?\"\n- \"Quando podemos começar?\"\n- \"O que está incluso no pacote?\"\n- Perguntas sobre detalhes de implementação\n\n### Sinais não-verbais:\n- Inclinação para frente\n- Aceno positivo com a cabeça\n- Toma notas\n- Olha para o decisor buscando aprovação\n\n### Ao identificar um sinal:\n1. Pare de vender\n2. Confirme o interesse\n3. Apresente próximos passos claros\n4. Peça o fechamento", duration: 10 },
              { title: "Técnicas de fechamento", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 18 },
            ],
          },
        ],
      },
      {
        title: "Follow-up e Cadência",
        description: "Nunca perca uma venda por falta de follow-up estruturado",
        thumbnail_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1280&h=720&fit=crop",
        modules: [
          {
            title: "Frequência e Timing",
            description: "Quando e com que frequência fazer follow-up",
            lessons: [
              { title: "A ciência do timing", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 12 },
              { title: "Cadência multicanal", type: "text", text: "## Cadência Multicanal de Follow-up\n\n### Semana 1:\n- Dia 1: Email de recapitulação (pós-reunião)\n- Dia 2: Conexão LinkedIn + comentário em post\n- Dia 3: WhatsApp com artigo relevante\n- Dia 5: Ligação rápida (2 min)\n\n### Semana 2:\n- Dia 8: Email com caso de sucesso\n- Dia 10: WhatsApp perguntando sobre dor discutida\n- Dia 12: Ligação com nova informação\n\n### Semana 3-4:\n- Dia 15: Email com proposta revisada\n- Dia 18: WhatsApp vídeo personalizado\n- Dia 21: Ligação final com condição especial\n\n### Regra de ouro: cada contato deve agregar valor único", duration: 15 },
              { title: "Ferramentas de automação", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 14 },
            ],
          },
          {
            title: "Templates e Automação",
            description: "Templates prontos e automações para escalar",
            lessons: [
              { title: "Templates de email que convertem", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 16 },
              { title: "Mensagens de WhatsApp", type: "text", text: "## Templates de WhatsApp para Vendas\n\n### Pós-reunião:\n\"Oi [nome]! Foi ótimo conversar com você. Segue o resumo do que discutimos: [pontos]. Alguma dúvida? 😊\"\n\n### Follow-up de valor:\n\"[nome], vi esse artigo sobre [tema discutido] e lembrei da nossa conversa. Acho que pode te ajudar: [link]\"\n\n### Reativação:\n\"[nome], como estão as coisas por aí? Lembrei que você mencionou [dor]. Tivemos um caso recente muito parecido com resultado incrível. Quer que eu compartilhe?\"\n\n### Urgência:\n\"[nome], passando para avisar que a condição que conversamos é válida até [data]. Quer que eu reserve pra você?\"\n\n### Dica: Personalize SEMPRE. Templates são ponto de partida, não destino.", duration: 10 },
              { title: "CRM e pipeline organizado", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 13 },
            ],
          },
        ],
      },
      {
        title: "Gestão de Pipeline",
        description: "Organize seu funil de vendas e tome decisões baseadas em dados",
        thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1280&h=720&fit=crop",
        modules: [
          {
            title: "Organização do Funil",
            description: "Estruture seu pipeline para máxima eficiência",
            lessons: [
              { title: "Etapas do funil de vendas", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 18 },
              { title: "Critérios de movimentação", type: "text", text: "## Critérios de Movimentação no Pipeline\n\n### Prospecção → Qualificação:\n- ✅ Contato realizado e respondido\n- ✅ Interesse demonstrado\n- ✅ Necessidade identificada\n\n### Qualificação → Proposta:\n- ✅ BANT confirmado\n- ✅ Reunião realizada com decisor\n- ✅ Dores e necessidades mapeadas\n- ✅ Budget compatível confirmado\n\n### Proposta → Negociação:\n- ✅ Proposta enviada e recebida\n- ✅ Feedback positivo sobre valores\n- ✅ Timeline de decisão definida\n\n### Negociação → Fechado Ganho:\n- ✅ Contrato assinado\n- ✅ Pagamento confirmado ou agendado\n\n### Regra: Mova para trás se critérios não forem mais atendidos", duration: 12 },
              { title: "Limpeza semanal do pipeline", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 10 },
            ],
          },
          {
            title: "Métricas de Vendas",
            description: "KPIs essenciais para gestão de vendas",
            lessons: [
              { title: "Dashboard de vendas essencial", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 15 },
              { title: "Calculando previsibilidade", type: "text", text: "## Calculando Previsibilidade de Vendas\n\n### Métricas fundamentais:\n1. **Taxa de conversão por etapa**: % que avança em cada stage\n2. **Ciclo médio de vendas**: Dias entre primeiro contato e fechamento\n3. **Ticket médio**: Valor médio por deal fechado\n4. **Velocity**: Velocidade do pipeline (deals × ticket × taxa ÷ ciclo)\n\n### Fórmula de previsão:\n```\nReceita prevista = Σ (valor do deal × probabilidade da etapa)\n```\n\n### Probabilidades por etapa:\n- Prospecção: 10%\n- Qualificação: 25%\n- Proposta: 50%\n- Negociação: 75%\n- Verbal: 90%\n\n### Análise semanal:\n- Pipeline total vs meta\n- Deals parados há mais de 2x o ciclo médio\n- Distribuição por etapa (funil saudável)", duration: 15 },
              { title: "Revisão de pipeline semanal", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 12 },
            ],
          },
        ],
      },
    ];

    for (let t = 0; t < trailsData.length; t++) {
      const trail = trailsData[t];
      const { data: trailRow, error: trailErr } = await supabaseAdmin.from("trails").insert({
        title: trail.title,
        description: trail.description,
        thumbnail_url: trail.thumbnail_url,
        tenant_id: TENANT_ID,
        creator_membership_id: MENTOR_MEMBERSHIP_ID,
        is_published: true,
        is_featured: t < 2,
        order_index: t,
      }).select("id").single();

      if (trailErr) { results.push(`⚠️ Trail ${trail.title}: ${trailErr.message}`); continue; }

      for (let m = 0; m < trail.modules.length; m++) {
        const mod = trail.modules[m];
        const { data: modRow, error: modErr } = await supabaseAdmin.from("trail_modules").insert({
          trail_id: trailRow.id,
          title: mod.title,
          description: mod.description,
          order_index: m,
        }).select("id").single();

        if (modErr) { results.push(`⚠️ Module ${mod.title}: ${modErr.message}`); continue; }

        for (let l = 0; l < mod.lessons.length; l++) {
          const lesson = mod.lessons[l];
          await supabaseAdmin.from("trail_lessons").insert({
            module_id: modRow.id,
            title: lesson.title,
            description: `Aula ${l + 1} do módulo ${mod.title}`,
            order_index: l,
            content_type: lesson.type,
            content_url: lesson.type === "video" ? lesson.url : null,
            text_content: lesson.type === "text" ? lesson.text : null,
            duration_minutes: lesson.duration,
          });
        }
      }
      results.push(`✅ Trilha criada: ${trail.title}`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
