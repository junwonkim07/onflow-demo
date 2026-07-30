import type { Transition } from 'framer-motion'

/**
 * M3 Expressive 모션 스펙
 * - spatial: 위치·크기 변화 (오버슈트 허용)
 * - effect: 색·투명도 변화 (바운스 금지)
 * https://m3.material.io/styles/motion/
 */
export const spatial: Transition = { type: 'spring', stiffness: 380, damping: 30 }
export const spatialExpressive: Transition = { type: 'spring', stiffness: 420, damping: 24 }
export const effect: Transition = { duration: 0.18, ease: [0.2, 0, 0, 1] }
