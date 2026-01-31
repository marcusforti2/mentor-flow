// Mock data for trails - High Ticket Education Business

export interface MockLesson {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  content_url: string; // YouTube video ID
  order_index: number;
}

export interface MockModule {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: MockLesson[];
}

export interface MockTrail {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  modules: MockModule[];
  total_lessons: number;
  total_duration: number;
  is_featured?: boolean;
}

// Real YouTube video IDs about business, mentoring, sales
const youtubeVideos = [
  'dQw4w9WgXcQ', // Placeholder - replace with real business videos
  'jNQXAC9IVRw',
  'kJQP7kiw5Fk',
  '9bZkp7q19f0',
  'JGwWNGJdvx8',
  'OPf0YbXqDm0',
  'RgKAFK5djSk',
  'fJ9rUzIMcZQ',
  'CevxZvSJLk8',
  'hT_nvWreIhg',
];

export const mockTrails: MockTrail[] = [
  {
    id: 'trail-1',
    title: 'Fundamentos do High Ticket',
    description: 'Aprenda os pilares essenciais para criar e vender ofertas de alto valor. Do mindset à execução prática.',
    thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
    is_featured: true,
    total_lessons: 16,
    total_duration: 480,
    modules: [
      {
        id: 'mod-1-1',
        title: 'Mindset High Ticket',
        description: 'A mentalidade necessária para vender alto valor',
        order_index: 0,
        lessons: [
          { id: 'les-1-1-1', title: 'O que é High Ticket e Por Que Funciona', description: 'Introdução ao conceito', duration_minutes: 25, content_url: youtubeVideos[0], order_index: 0 },
          { id: 'les-1-1-2', title: 'Mudando seu Paradigma de Preço', description: 'Como pensar em valor, não preço', duration_minutes: 30, content_url: youtubeVideos[1], order_index: 1 },
          { id: 'les-1-1-3', title: 'Posicionamento Premium', description: 'Como se posicionar como autoridade', duration_minutes: 35, content_url: youtubeVideos[2], order_index: 2 },
          { id: 'les-1-1-4', title: 'Criando Escassez Real', description: 'Estratégias de exclusividade', duration_minutes: 28, content_url: youtubeVideos[3], order_index: 3 },
        ]
      },
      {
        id: 'mod-1-2',
        title: 'Estruturação da Oferta',
        description: 'Como criar uma oferta irresistível',
        order_index: 1,
        lessons: [
          { id: 'les-1-2-1', title: 'Anatomia de uma Oferta High Ticket', description: 'Os componentes essenciais', duration_minutes: 40, content_url: youtubeVideos[4], order_index: 0 },
          { id: 'les-1-2-2', title: 'Definindo sua Transformação', description: 'O resultado que você entrega', duration_minutes: 32, content_url: youtubeVideos[5], order_index: 1 },
          { id: 'les-1-2-3', title: 'Precificação Estratégica', description: 'Como definir o preço ideal', duration_minutes: 45, content_url: youtubeVideos[6], order_index: 2 },
          { id: 'les-1-2-4', title: 'Bônus e Stack de Valor', description: 'Aumentando o valor percebido', duration_minutes: 38, content_url: youtubeVideos[7], order_index: 3 },
        ]
      },
      {
        id: 'mod-1-3',
        title: 'Entrega Premium',
        description: 'Como entregar uma experiência excepcional',
        order_index: 2,
        lessons: [
          { id: 'les-1-3-1', title: 'Onboarding do Cliente', description: 'Primeiros passos do cliente', duration_minutes: 30, content_url: youtubeVideos[8], order_index: 0 },
          { id: 'les-1-3-2', title: 'Estrutura de Acompanhamento', description: 'Sessões e checkpoints', duration_minutes: 35, content_url: youtubeVideos[9], order_index: 1 },
          { id: 'les-1-3-3', title: 'Criando Resultados Rápidos', description: 'Quick wins para o cliente', duration_minutes: 28, content_url: youtubeVideos[0], order_index: 2 },
          { id: 'les-1-3-4', title: 'Upsell e Continuidade', description: 'Mantendo o cliente a longo prazo', duration_minutes: 42, content_url: youtubeVideos[1], order_index: 3 },
        ]
      },
      {
        id: 'mod-1-4',
        title: 'Cases e Implementação',
        description: 'Exemplos práticos e exercícios',
        order_index: 3,
        lessons: [
          { id: 'les-1-4-1', title: 'Case: Mentoria de R$30k', description: 'Análise completa de um caso real', duration_minutes: 50, content_url: youtubeVideos[2], order_index: 0 },
          { id: 'les-1-4-2', title: 'Case: Consultoria Empresarial', description: 'B2B high ticket', duration_minutes: 45, content_url: youtubeVideos[3], order_index: 1 },
          { id: 'les-1-4-3', title: 'Exercício: Sua Oferta', description: 'Monte sua oferta passo a passo', duration_minutes: 60, content_url: youtubeVideos[4], order_index: 2 },
          { id: 'les-1-4-4', title: 'Próximos Passos', description: 'Plano de ação personalizado', duration_minutes: 25, content_url: youtubeVideos[5], order_index: 3 },
        ]
      }
    ]
  },
  {
    id: 'trail-2',
    title: 'Prospecção de Clientes Premium',
    description: 'Estratégias avançadas para atrair e qualificar clientes dispostos a investir alto.',
    thumbnail_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=450&fit=crop',
    total_lessons: 12,
    total_duration: 360,
    modules: [
      {
        id: 'mod-2-1',
        title: 'Avatar Premium',
        description: 'Definindo seu cliente ideal high ticket',
        order_index: 0,
        lessons: [
          { id: 'les-2-1-1', title: 'Quem Compra High Ticket', description: 'Perfil do comprador premium', duration_minutes: 30, content_url: youtubeVideos[6], order_index: 0 },
          { id: 'les-2-1-2', title: 'Dores vs Aspirações', description: 'O que move seu cliente', duration_minutes: 35, content_url: youtubeVideos[7], order_index: 1 },
          { id: 'les-2-1-3', title: 'Onde Encontrar Seu Avatar', description: 'Canais de aquisição', duration_minutes: 28, content_url: youtubeVideos[8], order_index: 2 },
          { id: 'les-2-1-4', title: 'Qualificação Avançada', description: 'Filtros para leads premium', duration_minutes: 32, content_url: youtubeVideos[9], order_index: 3 },
        ]
      },
      {
        id: 'mod-2-2',
        title: 'Outbound Premium',
        description: 'Prospecção ativa de alto nível',
        order_index: 1,
        lessons: [
          { id: 'les-2-2-1', title: 'LinkedIn para High Ticket', description: 'Estratégias de abordagem', duration_minutes: 40, content_url: youtubeVideos[0], order_index: 0 },
          { id: 'les-2-2-2', title: 'Cold Email que Converte', description: 'Templates e sequências', duration_minutes: 35, content_url: youtubeVideos[1], order_index: 1 },
          { id: 'les-2-2-3', title: 'Networking Estratégico', description: 'Eventos e conexões', duration_minutes: 30, content_url: youtubeVideos[2], order_index: 2 },
          { id: 'les-2-2-4', title: 'Indicações Premium', description: 'Sistema de referrals', duration_minutes: 38, content_url: youtubeVideos[3], order_index: 3 },
        ]
      },
      {
        id: 'mod-2-3',
        title: 'Inbound Premium',
        description: 'Atraindo clientes qualificados',
        order_index: 2,
        lessons: [
          { id: 'les-2-3-1', title: 'Conteúdo de Autoridade', description: 'Posicionamento orgânico', duration_minutes: 45, content_url: youtubeVideos[4], order_index: 0 },
          { id: 'les-2-3-2', title: 'Webinars High Ticket', description: 'Eventos de conversão', duration_minutes: 50, content_url: youtubeVideos[5], order_index: 1 },
          { id: 'les-2-3-3', title: 'Funil de Aplicação', description: 'Filtrando automaticamente', duration_minutes: 35, content_url: youtubeVideos[6], order_index: 2 },
          { id: 'les-2-3-4', title: 'Tráfego Pago Premium', description: 'Anúncios para alto valor', duration_minutes: 42, content_url: youtubeVideos[7], order_index: 3 },
        ]
      }
    ]
  },
  {
    id: 'trail-3',
    title: 'Fechamento de Vendas Consultivas',
    description: 'Domine a arte de conduzir conversas de venda que convertem em vendas de alto valor.',
    thumbnail_url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=450&fit=crop',
    total_lessons: 10,
    total_duration: 320,
    modules: [
      {
        id: 'mod-3-1',
        title: 'Call de Diagnóstico',
        description: 'A primeira conversa com o prospect',
        order_index: 0,
        lessons: [
          { id: 'les-3-1-1', title: 'Script de Abertura', description: 'Como começar a call', duration_minutes: 25, content_url: youtubeVideos[8], order_index: 0 },
          { id: 'les-3-1-2', title: 'Perguntas de Descoberta', description: 'Entendendo a situação', duration_minutes: 35, content_url: youtubeVideos[9], order_index: 1 },
          { id: 'les-3-1-3', title: 'Identificando a Dor Real', description: 'Além do superficial', duration_minutes: 40, content_url: youtubeVideos[0], order_index: 2 },
        ]
      },
      {
        id: 'mod-3-2',
        title: 'Apresentação da Solução',
        description: 'Como apresentar sua oferta',
        order_index: 1,
        lessons: [
          { id: 'les-3-2-1', title: 'Transição para a Oferta', description: 'Do diagnóstico à solução', duration_minutes: 30, content_url: youtubeVideos[1], order_index: 0 },
          { id: 'les-3-2-2', title: 'Apresentando o Preço', description: 'Técnicas de ancoragem', duration_minutes: 35, content_url: youtubeVideos[2], order_index: 1 },
          { id: 'les-3-2-3', title: 'Criando Urgência Ética', description: 'Escassez real', duration_minutes: 28, content_url: youtubeVideos[3], order_index: 2 },
        ]
      },
      {
        id: 'mod-3-3',
        title: 'Objeções e Fechamento',
        description: 'Lidando com resistências',
        order_index: 2,
        lessons: [
          { id: 'les-3-3-1', title: 'As 7 Objeções Principais', description: 'Como responder cada uma', duration_minutes: 45, content_url: youtubeVideos[4], order_index: 0 },
          { id: 'les-3-3-2', title: 'Técnicas de Fechamento', description: 'Pedindo a venda', duration_minutes: 40, content_url: youtubeVideos[5], order_index: 1 },
          { id: 'les-3-3-3', title: 'Pós-Venda Imediato', description: 'Confirmando a decisão', duration_minutes: 25, content_url: youtubeVideos[6], order_index: 2 },
          { id: 'les-3-3-4', title: 'Análise de Calls Reais', description: 'Aprendendo com exemplos', duration_minutes: 55, content_url: youtubeVideos[7], order_index: 3 },
        ]
      }
    ]
  },
  {
    id: 'trail-4',
    title: 'Estruturando sua Mentoria',
    description: 'O guia completo para criar um programa de mentoria lucrativo e escalável.',
    thumbnail_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=450&fit=crop',
    total_lessons: 14,
    total_duration: 420,
    modules: [
      {
        id: 'mod-4-1',
        title: 'Modelagem do Programa',
        description: 'Desenhando sua mentoria',
        order_index: 0,
        lessons: [
          { id: 'les-4-1-1', title: 'Tipos de Mentoria', description: '1:1, grupo, híbrida', duration_minutes: 30, content_url: youtubeVideos[8], order_index: 0 },
          { id: 'les-4-1-2', title: 'Definindo a Jornada', description: 'Do início ao resultado', duration_minutes: 40, content_url: youtubeVideos[9], order_index: 1 },
          { id: 'les-4-1-3', title: 'Materiais de Apoio', description: 'O que entregar', duration_minutes: 35, content_url: youtubeVideos[0], order_index: 2 },
        ]
      },
      {
        id: 'mod-4-2',
        title: 'Metodologia',
        description: 'Criando seu método único',
        order_index: 1,
        lessons: [
          { id: 'les-4-2-1', title: 'Seu Framework Proprietário', description: 'Metodologia única', duration_minutes: 45, content_url: youtubeVideos[1], order_index: 0 },
          { id: 'les-4-2-2', title: 'Ferramentas e Templates', description: 'Assets para o mentorado', duration_minutes: 35, content_url: youtubeVideos[2], order_index: 1 },
          { id: 'les-4-2-3', title: 'Certificação', description: 'Credenciamento do programa', duration_minutes: 28, content_url: youtubeVideos[3], order_index: 2 },
          { id: 'les-4-2-4', title: 'Comunidade', description: 'Criando o ambiente', duration_minutes: 32, content_url: youtubeVideos[4], order_index: 3 },
        ]
      },
      {
        id: 'mod-4-3',
        title: 'Operação',
        description: 'Rodando a mentoria no dia a dia',
        order_index: 2,
        lessons: [
          { id: 'les-4-3-1', title: 'Plataformas e Ferramentas', description: 'Stack tecnológico', duration_minutes: 30, content_url: youtubeVideos[5], order_index: 0 },
          { id: 'les-4-3-2', title: 'Rotina de Entregas', description: 'Calendário de atividades', duration_minutes: 35, content_url: youtubeVideos[6], order_index: 1 },
          { id: 'les-4-3-3', title: 'Gestão de Mentorados', description: 'Acompanhamento', duration_minutes: 40, content_url: youtubeVideos[7], order_index: 2 },
        ]
      },
      {
        id: 'mod-4-4',
        title: 'Escala',
        description: 'Crescendo o programa',
        order_index: 3,
        lessons: [
          { id: 'les-4-4-1', title: 'De 1:1 para Grupo', description: 'Transição de modelo', duration_minutes: 38, content_url: youtubeVideos[8], order_index: 0 },
          { id: 'les-4-4-2', title: 'Contratando Equipe', description: 'Quando e quem', duration_minutes: 35, content_url: youtubeVideos[9], order_index: 1 },
          { id: 'les-4-4-3', title: 'Mentores Licenciados', description: 'Multiplicando através de outros', duration_minutes: 45, content_url: youtubeVideos[0], order_index: 2 },
          { id: 'les-4-4-4', title: 'Roadmap de Crescimento', description: 'Plano para 7 dígitos', duration_minutes: 50, content_url: youtubeVideos[1], order_index: 3 },
        ]
      }
    ]
  },
  {
    id: 'trail-5',
    title: 'Posicionamento e Autoridade',
    description: 'Torne-se a referência do seu mercado e atraia clientes premium naturalmente.',
    thumbnail_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=450&fit=crop',
    total_lessons: 9,
    total_duration: 270,
    modules: [
      {
        id: 'mod-5-1',
        title: 'Marca Pessoal Premium',
        description: 'Construindo sua imagem',
        order_index: 0,
        lessons: [
          { id: 'les-5-1-1', title: 'Sua História de Transformação', description: 'Narrativa pessoal', duration_minutes: 35, content_url: youtubeVideos[2], order_index: 0 },
          { id: 'les-5-1-2', title: 'Identidade Visual Premium', description: 'Branding profissional', duration_minutes: 30, content_url: youtubeVideos[3], order_index: 1 },
          { id: 'les-5-1-3', title: 'Bio e Posicionamento', description: 'Como se apresentar', duration_minutes: 28, content_url: youtubeVideos[4], order_index: 2 },
        ]
      },
      {
        id: 'mod-5-2',
        title: 'Presença Digital',
        description: 'Dominando os canais online',
        order_index: 1,
        lessons: [
          { id: 'les-5-2-1', title: 'LinkedIn para Autoridade', description: 'Perfil e conteúdo', duration_minutes: 40, content_url: youtubeVideos[5], order_index: 0 },
          { id: 'les-5-2-2', title: 'Instagram Premium', description: 'Estética e estratégia', duration_minutes: 35, content_url: youtubeVideos[6], order_index: 1 },
          { id: 'les-5-2-3', title: 'YouTube e Podcast', description: 'Conteúdo longo', duration_minutes: 45, content_url: youtubeVideos[7], order_index: 2 },
        ]
      },
      {
        id: 'mod-5-3',
        title: 'Autoridade Offline',
        description: 'Presença no mundo real',
        order_index: 2,
        lessons: [
          { id: 'les-5-3-1', title: 'Palestras e Eventos', description: 'Sendo convidado', duration_minutes: 32, content_url: youtubeVideos[8], order_index: 0 },
          { id: 'les-5-3-2', title: 'Livro e Publicações', description: 'Autoridade impressa', duration_minutes: 38, content_url: youtubeVideos[9], order_index: 1 },
          { id: 'les-5-3-3', title: 'PR e Mídia', description: 'Aparições estratégicas', duration_minutes: 30, content_url: youtubeVideos[0], order_index: 2 },
        ]
      }
    ]
  }
];

// Helper to get YouTube thumbnail
export const getYouTubeThumbnail = (videoId: string, quality: 'default' | 'hq' | 'maxres' = 'hq'): string => {
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    maxres: 'maxresdefault'
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
};

// Simulated progress data
export const mockProgress: Record<string, { lessonId: string; progress: number; completed: boolean }[]> = {
  'trail-1': [
    { lessonId: 'les-1-1-1', progress: 100, completed: true },
    { lessonId: 'les-1-1-2', progress: 100, completed: true },
    { lessonId: 'les-1-1-3', progress: 65, completed: false },
  ],
  'trail-2': [
    { lessonId: 'les-2-1-1', progress: 100, completed: true },
    { lessonId: 'les-2-1-2', progress: 30, completed: false },
  ],
};

export const calculateTrailProgress = (trailId: string): number => {
  const trail = mockTrails.find(t => t.id === trailId);
  if (!trail) return 0;
  
  const progress = mockProgress[trailId];
  if (!progress) return 0;
  
  const completedLessons = progress.filter(p => p.completed).length;
  return Math.round((completedLessons / trail.total_lessons) * 100);
};
