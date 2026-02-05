import { useState } from 'react';
import { Play, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrailCarousel } from '@/components/trails/TrailCarousel';
import { TrailDetailSheet } from '@/components/trails/TrailDetailSheet';
import { VideoPlayerModal } from '@/components/trails/VideoPlayerModal';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { MockTrail, MockLesson } from '@/data/mockTrails';

export default function Trilhas() {
  const { activeMembership } = useTenant();
  const [selectedTrail, setSelectedTrail] = useState<MockTrail | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<MockLesson | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Buscar trilhas reais do banco de dados
  const { data: trails = [], isLoading } = useQuery({
    queryKey: ['trails', activeMembership?.tenant_id],
    queryFn: async () => {
      if (!activeMembership?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('trails')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          is_published,
          trail_modules (
            id,
            title,
            description,
            order_index,
            trail_lessons (
              id,
              title,
              description,
              duration_minutes,
              content_url,
              order_index
            )
          )
        `)
        .eq('tenant_id', activeMembership.tenant_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transformar para o formato esperado pelos componentes
      return (data || []).map(trail => ({
        id: trail.id,
        title: trail.title,
        description: trail.description || '',
        thumbnail_url: trail.thumbnail_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
        is_featured: false, // Podemos adicionar essa coluna depois
        modules: (trail.trail_modules || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(mod => ({
            id: mod.id,
            title: mod.title,
            description: mod.description || '',
            order_index: mod.order_index,
            lessons: (mod.trail_lessons || [])
              .sort((a, b) => a.order_index - b.order_index)
              .map(les => ({
                id: les.id,
                title: les.title,
                description: les.description || '',
                duration_minutes: les.duration_minutes || 0,
                content_url: les.content_url || '',
                order_index: les.order_index
              }))
          })),
        total_lessons: (trail.trail_modules || []).reduce(
          (acc, mod) => acc + (mod.trail_lessons?.length || 0), 
          0
        ),
        total_duration: (trail.trail_modules || []).reduce(
          (acc, mod) => acc + (mod.trail_lessons || []).reduce(
            (sum, les) => sum + (les.duration_minutes || 0), 
            0
          ), 
          0
        )
      })) as MockTrail[];
    },
    enabled: !!activeMembership?.tenant_id
  });

  // Featured trail (primeiro da lista)
  const featuredTrail = trails[0];
  
  // Trails with progress (continue watching) - TODO: implement real progress
  const continueWatching: MockTrail[] = [];

  const handleTrailClick = (trail: MockTrail) => {
    setSelectedTrail(trail);
    setIsDetailOpen(true);
  };

  const handleLessonClick = (lesson: MockLesson) => {
    setSelectedLesson(lesson);
    setIsDetailOpen(false);
    setIsVideoOpen(true);
  };

  const handleCloseVideo = () => {
    setIsVideoOpen(false);
    setSelectedLesson(null);
  };

  const handleCompleteLesson = () => {
    console.log('Marking lesson as complete:', selectedLesson?.id);
    handleCloseVideo();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Zero state - nenhuma trilha cadastrada
  if (trails.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="max-w-2xl mx-auto mt-20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma trilha disponível</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Seu mentor ainda não criou trilhas de conteúdo. Em breve você terá acesso a conteúdos exclusivos aqui.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>Aguarde novas trilhas serem publicadas</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalHours = featuredTrail ? Math.floor(featuredTrail.total_duration / 60) : 0;

  return (
    <div className="min-h-screen bg-background -mt-16">
      {/* Hero Banner */}
      {featuredTrail && (
        <section 
          className="trail-hero relative"
          style={{ backgroundImage: `url(${featuredTrail.thumbnail_url})` }}
        >
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
          
          {/* Content */}
          <div className="relative h-full flex items-center px-4 md:px-8 lg:px-16">
            <div className="max-w-2xl space-y-6">
              {/* Featured badge */}
              {featuredTrail.is_featured && (
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold text-sm uppercase tracking-wider">
                    Trilha em Destaque
                  </span>
                </div>
              )}

              {/* Title */}
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                {featuredTrail.title}
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                {featuredTrail.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>{featuredTrail.modules.length} módulos</span>
                <span>{featuredTrail.total_lessons} aulas</span>
                {totalHours > 0 && <span>{totalHours}+ horas de conteúdo</span>}
              </div>

              {/* CTA */}
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  className="h-14 px-8 text-lg font-semibold"
                  onClick={() => handleTrailClick(featuredTrail)}
                >
                  <Play className="w-6 h-6 mr-2" fill="currentColor" />
                  Começar Agora
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="h-14 px-8 text-lg font-semibold"
                  onClick={() => handleTrailClick(featuredTrail)}
                >
                  Ver Detalhes
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Carousels */}
      <div className="relative -mt-20 pt-8 space-y-12 pb-24">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <TrailCarousel
            title="Continuar Assistindo"
            trails={continueWatching}
            onTrailClick={handleTrailClick}
            cardSize="large"
          />
        )}

        {/* All Trails */}
        {trails.length > 0 && (
          <TrailCarousel
            title="Todas as Trilhas"
            trails={trails}
            onTrailClick={handleTrailClick}
          />
        )}
      </div>

      {/* Trail Detail Sheet */}
      <TrailDetailSheet
        trail={selectedTrail}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onLessonClick={handleLessonClick}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        lesson={selectedLesson}
        isOpen={isVideoOpen}
        onClose={handleCloseVideo}
        onComplete={handleCompleteLesson}
      />
    </div>
  );
}