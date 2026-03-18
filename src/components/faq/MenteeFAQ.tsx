import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Target,
  BookOpen,
  BarChart3,
  Calendar,
  FolderOpen,
  ListChecks,
  BookMarked,
  Bot,
  MessageSquare,
  FileSignature,
  TrendingUp,
  User,
  Pen,
  FileText,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQSection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  questions: { q: string; a: string }[];
}

const faqSections: FAQSection[] = [
  {
    id: 'geral',
    title: 'Geral',
    icon: HelpCircle,
    color: 'text-primary',
    questions: [
      { q: 'Como funciona a plataforma?', a: 'A plataforma é seu ambiente completo de mentoria. Aqui você acompanha trilhas de aprendizado, gerencia suas prospecções, usa ferramentas de IA para vendas e tem acesso a todo material do seu mentor. Tudo em um só lugar.' },
      { q: 'Como ganho pontos e conquistas?', a: 'Você ganha pontos ao completar ações como finalizar lições, registrar prospecções, usar ferramentas de IA e manter uma sequência diária de atividades. Os pontos desbloqueiam badges e melhoram seu ranking.' },
      { q: 'O que é a sequência (streak)?', a: 'A sequência conta quantos dias consecutivos você realizou pelo menos uma ação na plataforma. Manter a sequência ativa garante pontos bônus e demonstra consistência para o mentor.' },
      { q: 'Como funciona o sistema de notificações?', a: 'Você recebe notificações sobre novos eventos, novas trilhas publicadas, tarefas atribuídas e lembretes. O sino de notificações fica no menu superior.' },
    ],
  },
  {
    id: 'crm',
    title: 'CRM de Prospecções',
    icon: Target,
    color: 'text-accent',
    questions: [
      { q: 'Como adiciono uma nova prospecção?', a: 'Na tela do CRM, clique em "+ Nova Prospecção" para adicionar manualmente. Preencha nome, empresa, telefone/WhatsApp e outras informações do lead. Ele aparecerá no kanban no estágio inicial.' },
      { q: 'Posso mover leads entre estágios?', a: 'Sim! Arraste o card do lead entre as colunas do kanban ou abra o detalhe e altere o estágio. Cada movimentação é registrada no histórico.' },
      { q: 'O que são as análises de IA no CRM?', a: 'Você pode enviar screenshots de perfis de leads e a IA analisa o potencial, sugerindo abordagens personalizadas, temperatura do lead e um score de qualificação.' },
      { q: 'Como funciona a qualificação automática?', a: 'Ao adicionar informações ao lead (empresa, cargo, redes sociais), a IA analisa o perfil automaticamente e atribui uma pontuação de 0-100, classificando o lead como frio, morno ou quente.' },
    ],
  },
  {
    id: 'trilhas',
    title: 'Trilhas de Aprendizado',
    icon: BookOpen,
    color: 'text-emerald-500',
    questions: [
      { q: 'Como acesso as trilhas?', a: 'No menu lateral, clique em "Trilhas". Você verá todas as trilhas publicadas pelo mentor. Clique em uma para ver as lições e começar.' },
      { q: 'Posso retomar uma trilha de onde parei?', a: 'Sim! Seu progresso é salvo automaticamente. Ao abrir a trilha, a próxima lição pendente já aparece destacada.' },
      { q: 'O que acontece quando completo uma trilha?', a: 'Ao completar 100% das lições, você ganha pontos, pode receber um certificado (se configurado pelo mentor) e a trilha aparece como concluída no seu dashboard.' },
      { q: 'As trilhas têm prazo?', a: 'Depende da configuração do mentor. Algumas trilhas são livres e outras podem ter prazos sugeridos. Verifique a descrição de cada trilha.' },
    ],
  },
  {
    id: 'metricas',
    title: 'Métricas',
    icon: BarChart3,
    color: 'text-blue-500',
    questions: [
      { q: 'Quais métricas posso acompanhar?', a: 'Você pode registrar métricas semanais de vendas como: número de abordagens, ligações, reuniões agendadas, propostas enviadas e vendas fechadas. O mentor define quais métricas são relevantes.' },
      { q: 'Com que frequência devo preencher?', a: 'O ideal é atualizar semanalmente, mas você pode preencher a qualquer momento. Dados consistentes permitem que o mentor acompanhe sua evolução e identifique pontos de melhoria.' },
      { q: 'O mentor vê minhas métricas?', a: 'Sim, o mentor tem acesso completo às suas métricas para acompanhar sua evolução e oferecer orientações personalizadas.' },
    ],
  },
  {
    id: 'calendario',
    title: 'Calendário',
    icon: Calendar,
    color: 'text-secondary',
    questions: [
      { q: 'Como vejo os próximos eventos?', a: 'No menu "Calendário" você encontra todos os encontros agendados pelo mentor: grupais, individuais e workshops. Eventos com link de reunião permitem entrar direto pela plataforma.' },
      { q: 'Recebo lembretes dos eventos?', a: 'Sim! Dependendo da configuração do mentor, você pode receber lembretes por e-mail ou WhatsApp antes dos eventos.' },
      { q: 'Posso agendar reuniões com o mentor?', a: 'Se o mentor tiver habilitado o agendamento, você verá um botão para selecionar horários disponíveis e agendar uma sessão individual.' },
    ],
  },
  {
    id: 'arquivos',
    title: 'Meus Arquivos',
    icon: FolderOpen,
    color: 'text-orange-500',
    questions: [
      { q: 'Que tipos de arquivos posso enviar?', a: 'Você pode enviar documentos (PDF, Word, Excel), imagens e outros arquivos relevantes para a mentoria. Há um limite de tamanho por arquivo.' },
      { q: 'O mentor consegue ver meus arquivos?', a: 'Sim, os arquivos ficam acessíveis para o mentor na ficha do seu perfil. É uma boa forma de compartilhar propostas, contratos ou materiais para revisão.' },
      { q: 'Posso organizar meus arquivos?', a: 'Os arquivos são organizados automaticamente por data de envio. Você pode renomear e adicionar descrições para facilitar a localização.' },
    ],
  },
  {
    id: 'tarefas',
    title: 'Minhas Tarefas',
    icon: ListChecks,
    color: 'text-violet-500',
    questions: [
      { q: 'De onde vêm as tarefas?', a: 'As tarefas podem ser criadas pelo mentor durante reuniões, extraídas automaticamente de transcrições de calls ou adicionadas manualmente. Você as encontra no kanban de tarefas.' },
      { q: 'Como marco uma tarefa como concluída?', a: 'Mova o card para a coluna "Concluído" no kanban ou abra o detalhe da tarefa e altere o status. Completar tarefas gera pontos!' },
      { q: 'Posso ver tarefas atrasadas?', a: 'Sim, tarefas com data de vencimento passada aparecem destacadas em vermelho para fácil identificação.' },
    ],
  },
  {
    id: 'playbooks',
    title: 'Playbooks',
    icon: BookMarked,
    color: 'text-rose-500',
    questions: [
      { q: 'O que são playbooks?', a: 'Playbooks são guias práticos e documentos estratégicos criados pelo mentor. Podem conter roteiros de vendas, frameworks de prospecção, scripts de abordagem e muito mais.' },
      { q: 'Posso baixar os playbooks?', a: 'Depende das permissões configuradas pelo mentor. Alguns playbooks são apenas para leitura online, enquanto outros podem ser exportados.' },
      { q: 'Como encontro um playbook específico?', a: 'Na página de Playbooks, use a busca por nome ou navegue pela lista. Playbooks são organizados pelo mentor em categorias.' },
    ],
  },
  {
    id: 'arsenal',
    title: 'Arsenal de Vendas IA',
    icon: Bot,
    color: 'text-primary',
    questions: [
      { q: 'O que é o Arsenal de Vendas IA?', a: 'É um conjunto de 8 ferramentas powered by IA projetadas para turbinar suas vendas. Desde mentor virtual 24/7 até análise de conversão, cada ferramenta ataca um aspecto diferente do processo comercial.' },
      { q: 'As ferramentas são ilimitadas?', a: 'Sim! Todas as 8 ferramentas estão disponíveis sem restrição. Use quantas vezes precisar. O histórico de cada uso fica salvo para consulta futura.' },
      { q: 'O histórico fica salvo?', a: 'Sim, cada análise e geração é salva automaticamente. Você pode acessar o histórico de qualquer ferramenta e restaurar entradas e resultados anteriores.' },
    ],
  },
  {
    id: 'arsenal-mentor',
    title: '🤖 Mentor Virtual 24/7',
    icon: Bot,
    color: 'text-sky-500',
    questions: [
      { q: 'Como funciona o Mentor Virtual?', a: 'É um chatbot de IA treinado no contexto da mentoria. Você pode fazer perguntas sobre vendas, estratégias, objeções e receber orientações a qualquer hora, mesmo fora do horário de mentoria.' },
      { q: 'Ele substitui o mentor humano?', a: 'Não! Ele complementa a mentoria, tirando dúvidas rápidas e oferecendo suporte entre as sessões. Para questões complexas, o mentor humano é insubstituível.' },
    ],
  },
  {
    id: 'arsenal-qualifier',
    title: '🎯 Qualificador de Leads',
    icon: Target,
    color: 'text-red-500',
    questions: [
      { q: 'Como qualificar um lead com IA?', a: 'Cole o perfil do lead (nome, empresa, cargo, redes sociais) ou faça upload de screenshots. A IA analisa os dados e retorna um score de 0-100, temperatura (frio/morno/quente) e sugestões de abordagem.' },
      { q: 'Posso enviar screenshots de perfis?', a: 'Sim! Envie prints do LinkedIn, Instagram ou qualquer rede social. A IA extrai informações automaticamente e gera a qualificação completa.' },
    ],
  },
  {
    id: 'arsenal-communication',
    title: '💬 Hub de Comunicação',
    icon: MessageSquare,
    color: 'text-cyan-500',
    questions: [
      { q: 'O que o Hub de Comunicação faz?', a: 'Gera scripts de vendas, mensagens de follow-up e cold messages personalizadas para diferentes canais: WhatsApp, e-mail, LinkedIn e Instagram. Cada mensagem é adaptada ao perfil do lead.' },
      { q: 'Posso personalizar o tom das mensagens?', a: 'Sim! Você pode definir o tom (formal, casual, consultivo), o canal e o contexto da abordagem. A IA adapta a comunicação ao cenário escolhido.' },
    ],
  },
  {
    id: 'arsenal-roleplay',
    title: '🎭 Simulador de Objeções',
    icon: FileText,
    color: 'text-purple-500',
    questions: [
      { q: 'Como funciona o simulador?', a: 'Você escolhe uma fase da negociação (das 9 fases high ticket) e a IA assume o papel de um cliente difícil. Treine suas respostas a objeções em um ambiente seguro antes de enfrentar o cliente real.' },
      { q: 'Quais fases de negociação estão disponíveis?', a: 'São 9 fases: Diagnóstico Profundo, Ancoragem de Valor, Quebra de Objeção de Preço, Resgate de Leads Frios, entre outras. Cada fase tem contexto comportamental específico para respostas realistas.' },
    ],
  },
  {
    id: 'arsenal-proposal',
    title: '📝 Criador de Propostas',
    icon: FileSignature,
    color: 'text-emerald-500',
    questions: [
      { q: 'Como gerar uma proposta?', a: 'Informe dados do lead (nome, empresa, necessidade, valor) e a IA gera uma proposta comercial completa com estrutura profissional, argumentos de valor e call-to-action.' },
      { q: 'Posso editar a proposta gerada?', a: 'Sim! A proposta é gerada como texto editável. Copie, ajuste o que precisar e envie ao cliente.' },
    ],
  },
  {
    id: 'arsenal-analytics',
    title: '📊 Análise de Conversão',
    icon: TrendingUp,
    color: 'text-amber-500',
    questions: [
      { q: 'O que a Análise de Conversão faz?', a: 'Analisa transcrições de calls, conversas e documentos (PDF/Word/TXT) para identificar onde você está perdendo vendas. Gera um score, pontos fortes, pontos fracos e um plano de ação com prioridades Ouro e Urgente.' },
      { q: 'Que formatos posso enviar?', a: 'Textos colados, transcrições de calls, screenshots e documentos (PDF, Word, TXT). A IA processa qualquer formato e entrega a análise completa.' },
    ],
  },
  {
    id: 'arsenal-bio',
    title: '👤 Gerador de Bio',
    icon: User,
    color: 'text-indigo-500',
    questions: [
      { q: 'Para que serve o Gerador de Bio?', a: 'Cria bios otimizadas para LinkedIn, Instagram e WhatsApp. Basta informar seu nicho, diferencial e público-alvo, e a IA gera textos persuasivos que convertem visitantes em leads.' },
    ],
  },
  {
    id: 'arsenal-content',
    title: '✍️ Gerador de Conteúdo',
    icon: Pen,
    color: 'text-pink-500',
    questions: [
      { q: 'Que tipo de conteúdo posso gerar?', a: 'Posts para redes sociais, carrosséis, stories, threads e legendas. Informe o tema e a IA cria conteúdos que convertem seguidores em clientes, seguindo as melhores práticas de copywriting.' },
      { q: 'O conteúdo é original?', a: 'Sim! Cada conteúdo é gerado do zero com base no seu contexto e nicho. Você pode gerar múltiplas versões até encontrar a ideal.' },
    ],
  },
];

export function MenteeFAQ() {
  const mainSections = faqSections.filter(s => !s.id.startsWith('arsenal-'));
  const arsenalSubSections = faqSections.filter(s => s.id.startsWith('arsenal-'));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Central de Ajuda</h2>
          <p className="text-sm text-muted-foreground">Tudo o que você precisa saber sobre a plataforma</p>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {mainSections.map((section) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            className="border rounded-xl px-4 bg-card/50 backdrop-blur-sm"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <section.icon className={cn('h-5 w-5', section.color)} />
                <span className="font-semibold text-foreground">{section.title}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {section.questions.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {section.id === 'arsenal' ? (
                <div className="space-y-4">
                  {/* Arsenal main questions */}
                  <Accordion type="multiple" className="space-y-1">
                    {section.questions.map((faq, i) => (
                      <AccordionItem key={i} value={`${section.id}-${i}`} className="border-0 border-b last:border-b-0">
                        <AccordionTrigger className="hover:no-underline text-sm py-3 text-muted-foreground hover:text-foreground">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {/* Arsenal sub-tools */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Ferramentas do Arsenal</span>
                    </div>
                    <Accordion type="multiple" className="space-y-2">
                      {arsenalSubSections.map((sub) => (
                        <AccordionItem
                          key={sub.id}
                          value={sub.id}
                          className="border rounded-lg px-3 bg-muted/30"
                        >
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-2">
                              <sub.icon className={cn('h-4 w-4', sub.color)} />
                              <span className="text-sm font-medium text-foreground">{sub.title}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Accordion type="multiple" className="space-y-0">
                              {sub.questions.map((faq, i) => (
                                <AccordionItem key={i} value={`${sub.id}-${i}`} className="border-0 border-b last:border-b-0">
                                  <AccordionTrigger className="hover:no-underline text-sm py-2.5 text-muted-foreground hover:text-foreground">
                                    {faq.q}
                                  </AccordionTrigger>
                                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                                    {faq.a}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-0">
                  {section.questions.map((faq, i) => (
                    <AccordionItem key={i} value={`${section.id}-${i}`} className="border-0 border-b last:border-b-0">
                      <AccordionTrigger className="hover:no-underline text-sm py-3 text-muted-foreground hover:text-foreground">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
