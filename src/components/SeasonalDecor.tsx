import { useEffect, useMemo } from 'react'
import { resolveSeason } from '../lib/season'

interface Flake {
  left: number
  size: number
  duration: number
  delay: number
  drift: number
  opacity: number
}

/** Лампы гирлянды: цвет и положение вдоль провисающего провода. */
const BULB_COLORS = ['#ff5f6d', '#ffd452', '#4fd18a', '#58a6ff', '#c77dff', '#ffa94d']
const SEGMENTS = 12
/** Саги, на которых висят вместо лампы новогодние шары. */
const ORNAMENT_SEGMENTS = [3, 8]
const FLAKE_COUNT = 42

/** Провод: 12 одинаковых провисов по ширине экрана. */
function buildWirePath(): string {
  const width = 1200
  const segmentWidth = width / SEGMENTS
  let path = 'M0 3'
  for (let index = 0; index < SEGMENTS; index++) {
    const startX = index * segmentWidth
    // Контрольная точка ниже линии: самая низкая точка дуги — 21.5 при viewBox 36.
    path += ` Q ${startX + segmentWidth / 2} 40 ${startX + segmentWidth} 3`
  }
  return path
}

function makeFlakes(count: number): Flake[] {
  return Array.from({ length: count }, () => {
    const size = 3 + Math.random() * 6
    return {
      left: Math.random() * 100,
      size,
      duration: 13 + Math.random() * 17,
      delay: -Math.random() * 30,
      drift: (Math.random() * 2 - 1) * 70,
      opacity: size > 7 ? 0.35 + Math.random() * 0.2 : 0.55 + Math.random() * 0.4,
    }
  })
}

/**
 * Сезонный слой поверх всего интерфейса: снег с 1 декабря по конец февраля
 * и новогодняя гирлянда с 26 декабря по 1 января. Решение о показе — в
 * src/lib/season.ts; принудительно посмотреть можно через ?season=snow|newyear|both|off.
 */
export function SeasonalDecor() {
  const { snow, garland } = useMemo(() => resolveSeason(), [])
  const flakes = useMemo(() => (snow ? makeFlakes(FLAKE_COUNT) : []), [snow])
  const wirePath = useMemo(() => buildWirePath(), [])

  useEffect(() => {
    if (!garland) return
    document.body.classList.add('has-season-garland')
    return () => document.body.classList.remove('has-season-garland')
  }, [garland])

  if (!snow && !garland) return null

  return (
    <>
      {snow ? (
        <div className="seasonal-snow" aria-hidden="true">
          {flakes.map((flake, index) => (
            <span
              key={index}
              className="seasonal-flake"
              style={
                {
                  left: `${flake.left}%`,
                  width: flake.size,
                  height: flake.size,
                  opacity: flake.opacity,
                  animationDuration: `${flake.duration}s`,
                  animationDelay: `${flake.delay}s`,
                  '--flake-drift': `${flake.drift}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ) : null}

      {garland ? (
        <div className="seasonal-garland" aria-hidden="true">
          <svg className="seasonal-garland__wire" viewBox="0 0 1200 36" preserveAspectRatio="none">
            <path d={wirePath} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="seasonal-star" />
          {Array.from({ length: SEGMENTS }, (_, index) => {
            const center = ((index + 0.5) / SEGMENTS) * 100
            if (ORNAMENT_SEGMENTS.includes(index)) {
              return (
                <span
                  key={index}
                  className="seasonal-ornament"
                  style={
                    {
                      left: `${center}%`,
                      '--ornament-color':
                        index === 3 ? 'linear-gradient(145deg, #ff8a8a, #d62828)' : 'linear-gradient(145deg, #9be7ff, #1f7fa8)',
                      animationDelay: `${index * 0.4}s`,
                    } as React.CSSProperties
                  }
                >
                  <i className="seasonal-ornament__cap" />
                  <i className="seasonal-ornament__ball" />
                </span>
              )
            }
            return (
              <span
                key={index}
                className="seasonal-bulb"
                style={
                  {
                    left: `${center}%`,
                    color: BULB_COLORS[index % BULB_COLORS.length],
                    animationDelay: `${(index % 6) * 0.28}s`,
                  } as React.CSSProperties
                }
              >
                <i />
              </span>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
