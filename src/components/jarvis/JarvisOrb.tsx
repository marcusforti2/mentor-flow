import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';

interface JarvisOrbProps {
  state: OrbState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: { orb: 48, ring: 56, outer: 64 },
  md: { orb: 72, ring: 84, outer: 96 },
  lg: { orb: 96, ring: 112, outer: 128 },
};

const stateColors: Record<OrbState, { core: string; glow: string; ring: string }> = {
  idle: {
    core: 'from-primary/60 to-primary/30',
    glow: 'shadow-primary/20',
    ring: 'border-primary/20',
  },
  listening: {
    core: 'from-purple-500 to-violet-600',
    glow: 'shadow-purple-500/40',
    ring: 'border-purple-400/40',
  },
  processing: {
    core: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-400/40',
    ring: 'border-amber-400/30',
  },
  speaking: {
    core: 'from-emerald-400 to-teal-500',
    glow: 'shadow-emerald-400/40',
    ring: 'border-emerald-400/40',
  },
};

export function JarvisOrb({ state, size = 'md', className, onClick }: JarvisOrbProps) {
  const dims = sizeMap[size];
  const colors = stateColors[state];

  return (
    <div
      className={cn('relative flex items-center justify-center cursor-pointer select-none', className)}
      style={{ width: dims.outer, height: dims.outer }}
      onClick={onClick}
    >
      {/* Outer pulsing ring */}
      <motion.div
        className={cn('absolute rounded-full border-2', colors.ring)}
        style={{ width: dims.outer, height: dims.outer }}
        animate={
          state === 'listening'
            ? { scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }
            : state === 'speaking'
            ? { scale: [1, 1.12, 1], opacity: [0.4, 0.15, 0.4] }
            : state === 'processing'
            ? { rotate: 360 }
            : { scale: [1, 1.05, 1], opacity: [0.3, 0.15, 0.3] }
        }
        transition={
          state === 'processing'
            ? { duration: 2, repeat: Infinity, ease: 'linear' }
            : { duration: state === 'listening' ? 1.2 : 2.5, repeat: Infinity, ease: 'easeInOut' }
        }
      />

      {/* Middle ring */}
      <AnimatePresence>
        {(state === 'listening' || state === 'speaking') && (
          <motion.div
            className={cn('absolute rounded-full border', colors.ring)}
            style={{ width: dims.ring, height: dims.ring }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.1, 0.4] }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Core orb */}
      <motion.div
        className={cn(
          'rounded-full bg-gradient-to-br backdrop-blur-sm',
          colors.core,
          `shadow-2xl ${colors.glow}`
        )}
        style={{ width: dims.orb, height: dims.orb }}
        animate={
          state === 'listening'
            ? { scale: [1, 1.08, 0.96, 1] }
            : state === 'speaking'
            ? { scale: [1, 1.06, 0.98, 1.04, 1] }
            : state === 'processing'
            ? { scale: [1, 0.95, 1] }
            : { scale: [1, 1.02, 1] }
        }
        transition={{
          duration: state === 'listening' ? 0.8 : state === 'speaking' ? 0.6 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Inner glow */}
      <motion.div
        className="absolute rounded-full bg-white/20 blur-sm"
        style={{
          width: dims.orb * 0.5,
          height: dims.orb * 0.5,
          top: dims.outer / 2 - dims.orb * 0.35,
          left: dims.outer / 2 - dims.orb * 0.15,
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* State label */}
      <motion.div
        className="absolute -bottom-6 text-[10px] font-medium text-muted-foreground whitespace-nowrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={state}
      >
        {state === 'idle' && 'Pronto'}
        {state === 'listening' && '🎤 Escutando...'}
        {state === 'processing' && '⚡ Processando...'}
        {state === 'speaking' && '🔊 Falando...'}
      </motion.div>
    </div>
  );
}
