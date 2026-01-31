import { useRef, useState, useCallback, useEffect, RefObject } from 'react';

interface TiltOptions {
  max?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
  maxGlare?: number;
}

interface TiltState {
  x: number;
  y: number;
  glareX: number;
  glareY: number;
}

export function useTilt(options: TiltOptions = {}): [RefObject<HTMLDivElement>, TiltState] {
  const {
    max = 15,
    scale = 1.02,
    speed = 300,
    glare = true,
    maxGlare = 0.3,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TiltState>({ x: 0, y: 0, glareX: 50, glareY: 50 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = rect.left + width / 2;
    const centerY = rect.top + height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (-mouseY / (height / 2)) * max;
    const rotateY = (mouseX / (width / 2)) * max;

    const glareX = ((e.clientX - rect.left) / width) * 100;
    const glareY = ((e.clientY - rect.top) / height) * 100;

    setState({ x: rotateX, y: rotateY, glareX, glareY });

    ref.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
    ref.current.style.transition = `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
  }, [max, scale, speed]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    setState({ x: 0, y: 0, glareX: 50, glareY: 50 });
    ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return [ref, state];
}
