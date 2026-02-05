import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrailCard } from './TrailCard';
import type { Trail } from '@/types/trails';

interface TrailCarouselProps {
  title: string;
  trails: Trail[];
  onTrailClick: (trail: Trail) => void;
  cardSize?: 'default' | 'large';
}

export function TrailCarousel({ title, trails, onTrailClick, cardSize = 'default' }: TrailCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = direction === 'left' ? -400 : 400;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (trails.length === 0) return null;

  return (
    <section className="relative group/carousel">
      {/* Title */}
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-4 px-4 md:px-8">
        {title}
      </h2>

      {/* Carousel container */}
      <div className="relative">
        {/* Left arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity hidden md:flex"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          className="trail-carousel flex gap-4 overflow-x-auto px-4 md:px-8 pb-4 scroll-smooth"
        >
          {trails.map((trail) => (
            <TrailCard
              key={trail.id}
              trail={trail}
              onClick={() => onTrailClick(trail)}
              size={cardSize}
            />
          ))}
        </div>

        {/* Right arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity hidden md:flex"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
    </section>
  );
}
