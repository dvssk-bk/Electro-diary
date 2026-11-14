import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Trophy, Users } from 'lucide-react'
import type { ExtraLeaderboardEntry } from '../lib/types'
import { plural } from '../lib/format'
import { Avatar } from './Avatar'
import { EmptyState, Spinner } from './Feedback'

interface ExtraLeaderboardProps {
  entries: ExtraLeaderboardEntry[]
  loading?: boolean
  currentStudentId?: string
}

export function ExtraLeaderboard({
  entries,
  loading = false,
  currentStudentId,
}: ExtraLeaderboardProps) {
  const location = useLocation()
  const from = location.pathname

  return (
    <section className="extra-leaderboard" aria-labelledby="extra-leaderboard-title">
      <header className="extra-leaderboard__head">
        <span className="extra-leaderboard__icon">
          <Trophy size={20} />
        </span>
        <div>
          <span className="eyebrow">Рейтинг</span>
          <h2 id="extra-leaderboard-title">Топ 10</h2>
        </div>
      </header>
      <p className="extra-leaderboard__note">
        По сумме баллов за все оценённые доп. задания среди всех групп.
      </p>

      {loading ? (
        <Spinner label="Считаем рейтинг…" />
      ) : entries.length ? (
        <ol className="extra-leaderboard__list">
          {entries.map((entry, index) => (
            <li
              key={entry.student_id}
              className={entry.student_id === currentStudentId ? 'is-me' : ''}
            >
              <Link
                to={`/student/${entry.student_id}?from=${encodeURIComponent(from)}`}
                className="extra-leaderboard__row"
                aria-label={`Открыть профиль: ${entry.full_name}`}
              >
                <span className={`extra-rank extra-rank--${index + 1}`}>{index + 1}</span>
                <span className="extra-leaderboard__avatar">
                  <Avatar profile={entry} size="sm" />
                </span>
                <span className="extra-leaderboard__student">
                  <strong>{entry.full_name}</strong>
                  <small>
                    <Users size={11} /> группа {entry.group_name || 'не указана'}
                  </small>
                </span>
                <span className="extra-leaderboard__score">
                  <strong>{entry.total_points}</strong>
                  <small>
                    {plural(entry.total_points, ['балл', 'балла', 'баллов'])}
                  </small>
                </span>
                <ChevronRight size={15} className="extra-leaderboard__chevron" />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={<Trophy size={26} />}
          title="Рейтинг пока пуст"
          text="Он появится, когда преподаватель выставит первые баллы за доп. задания."
        />
      )}
    </section>
  )
}
