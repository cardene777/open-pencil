import { AbsoluteFill } from 'remotion'

/**
 * Vignette — 映画的な周辺減光。 中央が明るく、 周辺が暗く落ちる。
 */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 110%)`
    }}
  />
)
