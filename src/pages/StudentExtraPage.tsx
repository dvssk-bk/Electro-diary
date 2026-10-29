import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  FolderOpen,
  RefreshCw,
  Replace,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import { ExtraFileDialog } from '../components/ExtraFileDialog'
import { ExtraLeaderboard } from '../components/ExtraLeaderboard'
import { ExtraSubmitDialog } from '../components/ExtraSubmitDialog'
import { GradeBadge } from '../components/GradeBadge'
import { useAuth } from '../context/AuthContext'
import { backend } from '../lib/api'
import { formatDateTime, formatSize, plural } from '../lib/format'
import { isOverdue } from '../lib/grades'
import type {
  ExtraAssignment,
  ExtraLeaderboardEntry,
  ExtraSubmission,
} from '../lib/types'

export function StudentExtraPage() {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState<ExtraAssignment[]>([])
  const [submissions, setSubmissions] = useState<ExtraSubmission[]>([])
  const [leaderboard, setLeaderboard] = useState<ExtraLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [submitTarget, setSubmitTarget] = useState<ExtraAssignment | null>(null)
  const [submitExisting, setSubmitExisting] = useState<ExtraSubmission | null>(null)
  const [fileTarget, setFileTarget] = useState<ExtraSubmission | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [assignmentList, mySubmissions, leaders] = await Promise.all([
        backend.extra.list(),
        backend.extra.mine(),
        backend.extra.leaderboard(),
      ])
      setAssignments(assignmentList)
      setSubmissions(mySubmissions)
      setLeaderboard(leaders)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const submissionByAssignment = useMemo(() => {
    const map = new Map<string, ExtraSubmission>()
    for (const submission of submissions) {
      map.set(submission.assignment_id, submission)
    }
    return map
  }, [submissions])

  const graded = submissions.filter((submission) => submission.grade != null)
  const totalPoints = graded.reduce((sum, submission) => sum + (submission.grade ?? 0), 0)

  const openSubmit = (assignment: ExtraAssignment) => {
    setSubmitTarget(assignment)
    setSubmitExisting(submissionByAssignment.get(assignment.id) ?? null)
  }

  return (
    <AppShell role="student">
      <div className="page-head">
        <div>
          <span className="eyebrow">Для всех групп</span>
          <h1>Доп. задание</h1>
          <p>
            Общие дополнительные задания. Их оценивают в баллах 0–100, а лучшие попадают
            в рейтинг «Топ 10».
          </p>
        </div>
        <div className="page-head__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'spin' : ''} size={16} /> Обновить
          </button>
        </div>
      </div>

      <div className="works-stats">
        <div>
          <strong>{assignments.length}</strong>
          <span>{plural(assignments.length, ['задание', 'задания', 'заданий'])}</span>
        </div>
        <div>
          <strong>{submissions.length}</strong>
          <span>сдано</span>
        </div>
        <div>
          <strong>{graded.length}</strong>
          <span>оценено</span>
        </div>
        <div>
          <strong>{totalPoints}</strong>
          <span>{plural(totalPoints, ['балл', 'балла', 'баллов'])} всего</span>
        </div>
      </div>

      {error ? <ErrorBox>{error}</ErrorBox> : null}

      <div className="extra-layout">
        <section className="extra-main">
          <div className="section-head">
            <div>
              <h2>Задания</h2>
              <p>Выберите задание и прикрепите файл. Пока баллы не выставлены, файл можно заменить.</p>
            </div>
            <span className="badge badge--blue">
              <Sparkles size={13} /> 0–100 баллов
            </span>
          </div>

          {loading && !assignments.length ? (
            <Spinner label="Загружаем доп. задания…" />
          ) : assignments.length ? (
            <div className="assignment-grid extra-student-grid">
              {assignments.map((assignment) => {
                const submission = submissionByAssignment.get(assignment.id) ?? null
                const isGraded = submission?.grade != null
                const overdue = !submission && isOverdue(assignment.due_at)
                const statusClass = isGraded
                  ? 'assignment-card--graded'
                  : submission
                    ? 'assignment-card--sent'
                    : overdue
                      ? 'assignment-card--revise'
                      : 'assignment-card--todo'
                return (
                  <article
                    className={`assignment-card extra-student-card ${statusClass}`}
                    key={assignment.id}
                  >
                    <div className="assignment-card__head">
                      <span className="badge badge--blue">
                        <Sparkles size={12} /> Доп. задание
                      </span>
                      <span className="assignment-card__date">
                        {assignment.due_at
                          ? `до ${formatDateTime(assignment.due_at)}`
                          : 'без дедлайна'}
                      </span>
                    </div>
                    <h3>{assignment.title}</h3>
                    <p>{assignment.description || 'Описание не добавлено.'}</p>

                    {submission ? (
                      <div className="assignment-card__file">
                        <FileText size={18} />
                        <div>
                          <strong>{submission.original_name || 'Файл работы'}</strong>
                          <span>
                            {formatSize(submission.size)} · сдано{' '}
                            {formatDateTime(submission.submitted_at)}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="extra-student-card__status">
                      {isGraded ? (
                        <div className="extra-student-grade">
                          <span>
                            <CheckCircle2 size={15} /> Ваш результат
                          </span>
                          <GradeBadge grade={submission?.grade} type="points" size={16} />
                        </div>
                      ) : submission ? (
                        <span className="status-pill status-pill--sent">
                          <Clock3 size={13} /> На проверке
                        </span>
                      ) : overdue ? (
                        <span className="deadline-red">
                          <TriangleAlert size={14} /> Срочно сдать!
                        </span>
                      ) : (
                        <span className="muted">
                          <FileUp size={14} /> Работа ещё не сдана
                        </span>
                      )}
                    </div>

                    <div className="assignment-card__actions">
                      {submission?.file_path ? (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => setFileTarget(submission)}
                        >
                          <FolderOpen size={15} /> Открыть файл
                        </button>
                      ) : null}
                      {!isGraded ? (
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => openSubmit(assignment)}
                        >
                          {submission ? <Replace size={15} /> : <FileUp size={15} />}
                          {submission ? 'Заменить файл' : 'Сдать работу'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles size={30} />}
              title="Доп. заданий пока нет"
              text="Преподаватель ещё не создал дополнительные задания. Загляните позже."
            />
          )}
        </section>

        <aside className="extra-side">
          <ExtraLeaderboard
            entries={leaderboard}
            loading={loading}
            currentStudentId={profile?.id}
          />
        </aside>
      </div>

      <ExtraSubmitDialog
        open={Boolean(submitTarget)}
        assignment={submitTarget}
        submission={submitExisting}
        onClose={() => {
          setSubmitTarget(null)
          setSubmitExisting(null)
        }}
        onUploaded={() => setRefreshKey((value) => value + 1)}
      />

      <ExtraFileDialog
        open={Boolean(fileTarget)}
        onClose={() => setFileTarget(null)}
        path={fileTarget?.file_path ?? null}
        name={fileTarget?.original_name ?? null}
        size={fileTarget?.size ?? null}
      />
    </AppShell>
  )
}
