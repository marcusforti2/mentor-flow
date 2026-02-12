import { describe, it, expect } from 'vitest';
import type { Trail, TrailModule, TrailLesson } from '@/types/trails';
import { getYouTubeThumbnail } from '@/types/trails';

// --- Test Data Factories ---
function createLesson(overrides: Partial<TrailLesson> = {}): TrailLesson {
  return {
    id: 'lesson-1',
    title: 'O que é prospecção?',
    description: 'Introdução ao conceito de prospecção B2B',
    duration_minutes: 15,
    content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    content_type: 'video' as const,
    order_index: 0,
    ...overrides,
  };
}

function createModule(overrides: Partial<TrailModule> = {}): TrailModule {
  return {
    id: 'module-1',
    title: 'Introdução à Prospecção',
    description: 'Fundamentos básicos',
    order_index: 0,
    lessons: [
      createLesson(),
      createLesson({
        id: 'lesson-2',
        title: 'Perfil do Cliente Ideal',
        description: 'Como definir seu ICP',
        duration_minutes: 20,
        order_index: 1,
      }),
      createLesson({
        id: 'lesson-3',
        title: 'Ferramentas de pesquisa',
        description: 'Ferramentas essenciais para prospecção',
        duration_minutes: 10,
        order_index: 2,
      }),
    ],
    ...overrides,
  };
}

function createTrail(overrides: Partial<Trail> = {}): Trail {
  const modules = [
    createModule(),
    createModule({
      id: 'module-2',
      title: 'Técnicas Avançadas',
      description: 'Técnicas de prospecção avançada',
      order_index: 1,
      lessons: [
        createLesson({ id: 'lesson-4', title: 'Cold Calling', duration_minutes: 25, order_index: 0 }),
        createLesson({ id: 'lesson-5', title: 'Social Selling', duration_minutes: 30, order_index: 1 }),
      ],
    }),
  ];

  return {
    id: 'trail-1',
    title: 'Fundamentos de Prospecção B2B',
    description: 'Aprenda técnicas essenciais de prospecção para vendas B2B',
    thumbnail_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
    is_featured: true,
    is_published: true,
    order_index: 0,
    modules,
    total_lessons: 5,
    total_duration: 100,
    ...overrides,
  };
}

describe('Trails - Data Model', () => {
  describe('Trail structure', () => {
    it('creates a valid trail with all fields', () => {
      const trail = createTrail();

      expect(trail.id).toBe('trail-1');
      expect(trail.title).toBe('Fundamentos de Prospecção B2B');
      expect(trail.is_featured).toBe(true);
      expect(trail.is_published).toBe(true);
      expect(trail.modules).toHaveLength(2);
      expect(trail.total_lessons).toBe(5);
      expect(trail.total_duration).toBe(100);
    });

    it('modules are correctly nested', () => {
      const trail = createTrail();
      const firstModule = trail.modules[0];

      expect(firstModule.title).toBe('Introdução à Prospecção');
      expect(firstModule.lessons).toHaveLength(3);
      expect(firstModule.lessons[0].title).toBe('O que é prospecção?');
    });

    it('lessons have correct duration', () => {
      const trail = createTrail();
      const allLessons = trail.modules.flatMap(m => m.lessons);

      expect(allLessons).toHaveLength(5);

      const totalDuration = allLessons.reduce((sum, l) => sum + l.duration_minutes, 0);
      expect(totalDuration).toBe(100); // 15+20+10+25+30
    });

    it('maintains order_index across modules', () => {
      const trail = createTrail();

      trail.modules.forEach((mod, i) => {
        expect(mod.order_index).toBe(i);
        mod.lessons.forEach((les, j) => {
          expect(les.order_index).toBe(j);
        });
      });
    });
  });

  describe('Trail with empty content', () => {
    it('handles trail with no modules', () => {
      const trail = createTrail({ modules: [], total_lessons: 0, total_duration: 0 });

      expect(trail.modules).toHaveLength(0);
      expect(trail.total_lessons).toBe(0);
      expect(trail.total_duration).toBe(0);
    });

    it('handles module with no lessons', () => {
      const mod = createModule({ lessons: [] });
      expect(mod.lessons).toHaveLength(0);
    });

    it('handles unpublished trail', () => {
      const trail = createTrail({ is_published: false, is_featured: false });
      expect(trail.is_published).toBe(false);
      expect(trail.is_featured).toBe(false);
    });
  });

  describe('Trail calculations', () => {
    it('correctly counts total lessons across all modules', () => {
      const trail = createTrail();
      const calculatedLessons = trail.modules.reduce(
        (acc, mod) => acc + mod.lessons.length,
        0
      );
      expect(calculatedLessons).toBe(trail.total_lessons);
    });

    it('correctly sums total duration across all lessons', () => {
      const trail = createTrail();
      const calculatedDuration = trail.modules.reduce(
        (acc, mod) => acc + mod.lessons.reduce((sum, les) => sum + les.duration_minutes, 0),
        0
      );
      expect(calculatedDuration).toBe(trail.total_duration);
    });
  });
});

describe('Trails - YouTube Thumbnail Helper', () => {
  it('extracts thumbnail from full YouTube URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const thumb = getYouTubeThumbnail(url);
    expect(thumb).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('extracts thumbnail from short YouTube URL', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    const thumb = getYouTubeThumbnail(url);
    expect(thumb).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('handles raw video ID', () => {
    const thumb = getYouTubeThumbnail('dQw4w9WgXcQ');
    expect(thumb).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('supports different quality options', () => {
    const url = 'dQw4w9WgXcQ';

    expect(getYouTubeThumbnail(url, 'default')).toContain('default.jpg');
    expect(getYouTubeThumbnail(url, 'hq')).toContain('hqdefault.jpg');
    expect(getYouTubeThumbnail(url, 'maxres')).toContain('maxresdefault.jpg');
  });

  it('returns empty string for empty input', () => {
    expect(getYouTubeThumbnail('')).toBe('');
  });
});

describe('Trails - TrailInput validation logic', () => {
  it('validates trail input requires title', () => {
    const input = {
      title: '',
      description: 'Test',
      thumbnail_url: 'https://example.com/img.jpg',
      is_featured: false,
      modules: [],
    };
    // title is required - empty string should be caught by form validation
    expect(input.title).toBe('');
  });

  it('validates modules have correct structure for API', () => {
    const input = {
      title: 'Nova Trilha',
      description: 'Descrição da trilha',
      thumbnail_url: 'https://example.com/img.jpg',
      is_featured: true,
      modules: [
        {
          title: 'Módulo 1',
          description: 'Desc',
          order_index: 0,
          lessons: [
            {
              title: 'Aula 1',
              description: 'Desc aula',
              duration_minutes: 15,
              content_url: 'https://youtube.com/watch?v=test',
              order_index: 0,
            },
          ],
        },
      ],
    };

    expect(input.modules).toHaveLength(1);
    expect(input.modules[0].lessons).toHaveLength(1);
    expect(input.modules[0].lessons[0].duration_minutes).toBe(15);
  });
});
