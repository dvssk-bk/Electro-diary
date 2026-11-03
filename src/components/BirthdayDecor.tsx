import { useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { firstNameOf, isBirthdayToday } from '../lib/birthday'

const CONFETTI_COLORS = [
  '#ff5f6d',
  '#ffd452',
  '#4fd18a',
  '#58a6ff',
  '#c77dff',
  '#ffa94d',
  '#ff8fab',
]
const PIECE_COUNT = 46

interface Piece {
  left: number
  size: number
  color: string
  duration: number
  delay: number
  drift: number
  round: boolean
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    left: Math.random() * 100,
    size: 5 + Math.random() * 5,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    duration: 10 + Math.random() * 12,
    delay: -Math.random() * 22,
    drift: (Math.random() * 2 - 1) * 60,
    round: Math.random() < 0.35,
  }))
}

/**
 * Личная тема дня рождения: видна только самому человеку и только
 * в его день рождения (день и месяц совпали с сегодняшней датой).
 *
 * Состав: конфетти поверх страницы, поздравительная полоса над шапкой
 * и тёплый фон. Дата рождения хранится без года — см. src/lib/birthday.ts.
 */
export function BirthdayDecor() {
  const { profile } = useAuth()
  const today = isBirthdayToday(profile?.birthday_md)
  const pieces = useMemo(() => (today ? makePieces() : []), [today])

  useEffect(() => {
    if (!today) return
    document.body.classList.add('has-birthday')
    return () => document.body.classList.remove('has-birthday')
  }, [today])

  if (!today || !profile) return null

  const name = firstNameOf(profile.full_name)

  return (
    <>
      <div className="birthday-confetti" aria-hidden="true">
        {pieces.map((piece, index) => (
          <span
            key={index}
            className={`birthday-piece${piece.round ? ' birthday-piece--round' : ''}`}
            style={
              {
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.round ? piece.size : piece.size * 1.8,
                background: piece.color,
                animationDuration: `${piece.duration}s`,
                animationDelay: `${piece.delay}s`,
                '--piece-drift': `${piece.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="birthday-bar" role="status">
        <span className="birthday-bar__cake" aria-hidden="true">
          🎂
        </span>
        <span className="birthday-bar__text">
          <strong>С днём рождения{name ? `, ${name}` : ''}!</strong>{' '}
          Пусть в этом году все сдачи приходят вовремя, а в журнале случаются только хорошие
          новости.
        </span>
      </div>
    </>
  )
}
