import { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrailCarousel } from '@/components/trails/TrailCarousel';
import { TrailDetailSheet } from '@/components/trails/TrailDetailSheet';
import { VideoPlayerModal } from '@/components/trails/VideoPlayerModal';
import { mockTrails, calculateTrailProgress, type MockTrail, type MockLesson } from '@/data/mockTrails';

export default function Trilhas() {
  const [selectedTrail, setSelectedTrail] = useState<MockTrail | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<MockLesson | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Featured trail (first one with is_featured)
  const featuredTrail = mockTrails.find(t => t.is_featured) || mockTrails[0];
  
  // Trails with progress (continue watching)
  const continueWatching = mockTrails.filter(t => {
    const progress = calculateTrailProgress(t.id);
    return progress > 0 && progress < 100;
  });

  // All trails
  const allTrails = mockTrails;

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
    // Here you would update the progress in Supabase
    console.log('Marking lesson as complete:', selectedLesson?.id);
    handleCloseVideo();
  };

  const totalHours = Math.floor(featuredTrail.total_duration / 60);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
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
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold text-sm uppercase tracking-wider">
                Trilha em Destaque
              </span>
            </div>

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
              <span>{totalHours}+ horas de conteúdo</span>
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
        <TrailCarousel
          title="Todas as Trilhas"
          trails={allTrails}
          onTrailClick={handleTrailClick}
        />

        {/* By Category - Example groupings */}
        <TrailCarousel
          title="Vendas e Fechamento"
          trails={allTrails.filter(t => 
            t.title.includes('Prospecção') || 
            t.title.includes('Fechamento') ||
            t.title.includes('Vendas')
          )}
          onTrailClick={handleTrailClick}
        />

        <TrailCarousel
          title="Estruturação de Negócio"
          trails={allTrails.filter(t => 
            t.title.includes('Estruturando') || 
            t.title.includes('Fundamentos') ||
            t.title.includes('Posicionamento')
          )}
          onTrailClick={handleTrailClick}
        />
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
