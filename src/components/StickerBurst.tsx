import { useMemo, type CSSProperties } from 'react'
import { stickerTone, type StickerTone } from '../lib/stickers'

const PARTICLE_COUNT = 14

interface StickerBurstProps {
  emoji: string
  tone?: StickerTone
  burstId: number
}

/**
 * Короткий эффект при выборе реакции: вспышка и разлетающиеся эмодзи.
 * Для негативных реакций эффект зеленоватый и «липкий», для позитивных — тёплый.
 */
export function StickerBurst({ emoji, tone = stickerTone(emoji), burstId }: StickerBurstProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const angle = (Math.PI * 2 * index) / PARTICLE_COUNT + ((burstId % 9) * Math.PI) / 36
        const distance = 72 + ((index * 37 + burstId * 17) % 86)
        const size =
          tone === 'negative' ? 17 + ((index * 7) % 12) : 16 + ((index * 5) % 14)
        const rotate = (index % 2 === 0 ? 1 : -1) * (20 + ((index * 13) % 60))
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - 10,
          size,
          rotate,
          delay: (index % 6) * 18,
        }
      }),
    [burstId, tone],
  )

  return (
    <div className={`sticker-burst sticker-burst--${tone}`} key={burstId} aria-hidden="true">
      <span className="sticker-burst__halo" />
      <span className="sticker-burst__core">{emoji}</span>
      {particles.map((particle, index) => (
        <span
          key={index}
          className="sticker-burst__particle"
          style={
            {
              '--dx': `${particle.dx}px`,
              '--dy': `${particle.dy}px`,
              '--rot': `${particle.rotate}deg`,
              fontSize: `${particle.size}px`,
              animationDelay: `${particle.delay}ms`,
            } as CSSProperties
          }
        >
          {emoji}
        </span>
      ))}
    </div>
  )
}
