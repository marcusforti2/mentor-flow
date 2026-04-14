import { useState, useEffect, useCallback } from 'react';
import type { TourStep } from '@/components/onboarding/GuidedTour';

const TOUR_STORAGE_KEY = 'guided_tour_completed';

export function useGuidedTour(userId: string | undefined) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const local = localStorage.getItem(`${TOUR_STORAGE_KEY}_${userId}`);
    const completed = local === 'true';
    setHasCompleted(completed);

    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  const completeTour = useCallback(() => {
    setIsOpen(false);
    setHasCompleted(true);
    if (userId) localStorage.setItem(`${TOUR_STORAGE_KEY}_${userId}`, 'true');
  }, [userId]);

  const startTour = useCallback(() => setIsOpen(true), []);
  const skipTour = useCallback(() => completeTour(), [completeTour]);

  return { isOpen, hasCompleted, startTour, completeTour, skipTour };
}

export const mentoradoDashboardSteps: TourStep[] = [
  {
    target: '[data-tour="trail-progress"]',
    title: 'Sua Jornada de Aprendizado',
    description: 'Acompanhe o progresso das suas trilhas aqui. Cada trilha tem aulas em vídeo, texto e exercícios práticos.',
    placement: 'right',
  },
  {
    target: '[data-tour="prospections"]',
    title: 'Suas Prospecções',
    description: 'Veja quantas prospecções você fez este mês e seus pontos acumulados. Clique para acessar seu CRM.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="next-meeting"]',
    title: 'Próximo Encontro',
    description: 'Fique por dentro das próximas reuniões com seu mentor. Você receberá lembretes automáticos.',
    placement: 'left',
  },
  {
    target: '[data-tour="badges"]',
    title: 'Suas Conquistas',
    description: 'Ganhe badges completando desafios! Quanto mais ativo você for, mais conquistas desbloqueia.',
    placement: 'left',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Ações Rápidas',
    description: 'Acesse rapidamente: registrar prospecções, ferramentas de IA e seus arquivos.',
    placement: 'top',
  },
  {
    target: '[data-tour="ai-score"]',
    title: 'Nota Média IA',
    description: 'A IA analisa suas interações e treinamentos para gerar uma nota de performance. Use as ferramentas para melhorar!',
    placement: 'top',
  },
];
