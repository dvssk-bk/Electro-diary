import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Modal } from '../components/Modal'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import { ExtraAssignmentDialog } from '../components/ExtraAssignmentDialog'
import { ExtraFileDialog } from '../components/ExtraFileDialog'
import { ExtraLeaderboard } from '../components/ExtraLeaderboard'
import { useToast } from '../context/ToastContext'
import { backend } from '../lib/api'
import { formatDateTime, formatSize, plural } from '../lib/format'
import type {
  ExtraAssignment,
  ExtraLeaderboardEntry,
  ExtraWorkRow,
} from '../lib/types'

interface ExtraWorksDialogProps {
  open: boolean
  assignment: ExtraAssignment | null
  onClose: () => void
  onChanged: () => void
}

function ExtraWorksDialog({ open, assignment, onClose, onChanged }: ExtraWorksDialogProps) {
  const toast = useToast()
  const [rows, setRows] = useState<ExtraWorkRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [fileTarget, setFileTarget] = useState<ExtraWorkRow | null>(null)

  useEffect(() => {
    if (!open || !assignment) return
    let cancelled = false
    setLoading(true)
    setError('')
    backend.extra
      .works(assignment.id)
      .then((value) => {
        if (cancelled) return
        setRows(value)
        const next: Record<string, string> = {}
        for (const row of value) {
          next[row.submission.id] =
            row.submission.grade != null ? String(row.submission.grade) : ''
        }
        setDrafts(next)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, assignment])

  const saveGrade = async (row: ExtraWorkRow) => {
    const raw = (drafts[row.submission.id] ?? '').trim()
    let grade: number | null = null
    if (raw !== '') {
      const value = Number(raw)
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        toast.error('Баллы должны быть целым числом от 0 до 100')
        return
      }
      grade = value
    }
    setSavingId(row.submission.id)
    setError('')
    try {
      const updated = await backend.extra.setGrade(row.submission.id, grade)
      setRows((list) =>
        list.map((item) =>
          item.submission.id === row.submission.id
            ? { ...item, submission: updated }
            : item,
        ),
      )
      setDrafts((current) => ({
        ...current,
        [row.submission.id]: updated.grade != null ? String(updated.grade) : '',
      }))
      toast.success(grade == null ? 'Баллы сброшены' : `Выставлено ${grade} из 100`)
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  const gradedCount = rows.filter((row) => row.submission.grade != null).length

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          setFileTarget(null)
          onClose()
        }}
        title={assignment ? `Работы · ${assignment.title}` : 'Работы'}
        subtitle={
          assignment
            ? `${rows.length} ${plural(rows.length, ['сдача', 'сдачи', 'сдач'])} · оценено ${gradedCount}`
            : undefined
        }
        size="xl"
      >
        {error ? <ErrorBox>{error}</ErrorBox> : null}
        {loading ? (
          <Spinner label="Загружаем работы…" />
        ) : rows.length ? (
          <div className="works-table-wrap extra-works-table-wrap">
            <table className="works-table extra-works-table">
              <thead>
                <tr>
                  <th>Студент</th>
                  <th>Файл</th>
                  <th>Сдано</th>
                  <th>Баллы</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.submission.id}>
                    <td>
                      <strong>{row.student.full_name}</strong>
                      <span className="muted">
                        группа {row.student.group_name || 'не указана'}
                      </span>
                      <span
                        className={`status-pill ${
                          row.submission.grade != null
                            ? 'status-pill--graded'
                            : 'status-pill--sent'
                        }`}
                      >
                        {row.submission.grade != null ? (
                          <>
                            <CheckCircle2 size={12} /> Проверено
                          </>
                        ) : (
                          <>
                            <Clock3 size={12} /> На проверке
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      {row.submission.file_path ? (
                        <button
                          type="button"
                          className="works-file works-file--button"
                          onClick={() => setFileTarget(row)}
                        >
                          <FolderOpen size={15} />
                          {row.submission.original_name || 'файл'}
                        </button>
                      ) : (
                        <span className="works-file">
                          <FolderOpen size={15} /> без файла
                        </span>
                      )}
                      <span className="muted">{formatSize(row.submission.size)}</span>
                    </td>
                    <td>
                      <span>{formatDateTime(row.submission.submitted_at)}</span>
                    </td>
                    <td>
                      <div className="extra-grade-editor">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          inputMode="numeric"
                          value={drafts[row.submission.id] ?? ''}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [row.submission.id]: event.target.value,
                            }))
                          }
                          placeholder="—"
                          aria-label={`Баллы для ${row.student.full_name}`}
                        />
                        <span>/ 100</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => void saveGrade(row)}
                        disabled={savingId === row.submission.id}
                      >
                        {savingId === row.submission.id ? (
                          <Loader2 className="spin" size={15} />
                        ) : (
                          <Save size={15} />
                        )}
                        Сохранить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardCheck size={30} />}
            title="Работ пока нет"
            text="Студенты увидят задание на вкладке «Доп. задание» и смогут прикрепить файл."
          />
        )}
      </Modal>

      <ExtraFileDialog
        open={Boolean(fileTarget)}
        onClose={() => setFileTarget(null)}
        path={fileTarget?.submission.file_path ?? null}
        name={fileTarget?.submission.original_name ?? null}
        size={fileTarget?.submission.size ?? null}
      />
    </>
  )
}

export function AdminExtraPage() {
  const toast = useToast()
  const [assignments, setAssignments] = useState<ExtraAssignment[]>([])
  const [works, setWorks] = useState<ExtraWorkRow[]>([])
  const [leaderboard, setLeaderboard] = useState<ExtraLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ExtraAssignment | null>(null)
  const [worksTarget, setWorksTarget] = useState<ExtraAssignment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExtraAssignment | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [expandedExtraId, setExpandedExtraId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [assignmentList, workList, leaders] = await Promise.all([
        backend.extra.list(),
        backend.extra.works(),
        backend.extra.leaderboard(),
      ])
      setAssignments(assignmentList)
      setWorks(workList)
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

  const statsByAssignment = useMemo(() => {
    const map = new Map<string, { total: number; graded: number }>()
    for (const row of works) {
      const current = map.get(row.assignment.id) ?? { total: 0, graded: 0 }
      current.total += 1
      if (row.submission.grade != null) current.graded += 1
      map.set(row.assignment.id, current)
    }
    return map
  }, [works])

  const gradedCount = works.filter((row) => row.submission.grade != null).length
  const studentCount = new Set(works.map((row) => row.student.id)).size

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (assignment: ExtraAssignment) => {
    setEditing(assignment)
    setDialogOpen(true)
  }

  const removeAssignment = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await backend.extra.remove(deleteTarget.id)
      toast.success('Доп. задание удалено')
      setDeleteTarget(null)
      setRefreshKey((value) => value + 1)
    } catch (err) {
      setDeleteError((err as Error).message)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <AppShell role="admin">
      <div className="page-head">
        <div>
          <span className="eyebrow">Для всех групп</span>
          <h1>Доп. задание</h1>
          <p>
            Общие задания без привязки к дисциплине. Все работы оцениваются только в баллах
            0–100.
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
          <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
            <Plus size={16} /> Новое задание
          </button>
        </div>
      </div>

      <div className="works-stats">
        <div>
          <strong>{assignments.length}</strong>
          <span>{plural(assignments.length, ['задание', 'задания', 'заданий'])}</span>
        </div>
        <div>
          <strong>{works.length}</strong>
          <span>{plural(works.length, ['работа', 'работы', 'работ'])}</span>
        </div>
        <div>
          <strong>{gradedCount}</strong>
          <span>оценено</span>
        </div>
        <div>
          <strong>{studentCount}</strong>
          <span>{plural(studentCount, ['участник', 'участника', 'участников'])}</span>
        </div>
      </div>

      {error ? <ErrorBox>{error}</ErrorBox> : null}

      <div className="extra-layout">
        <section className="extra-main">
          <div className="section-head">
            <div>
              <h2>Задания</h2>
              <p>Создавайте олимпиады, проекты и дополнительные работы для всех групп.</p>
            </div>
            <span className="badge badge--blue">
              <Sparkles size={13} /> 0–100 баллов
            </span>
          </div>

          {loading && !assignments.length ? (
            <Spinner label="Загружаем доп. задания…" />
          ) : assignments.length ? (
            <div className="extra-admin-grid">
              {assignments.map((assignment) => {
                const stats = statsByAssignment.get(assignment.id) ?? {
                  total: 0,
                  graded: 0,
                }
                return (
                  <article className="extra-admin-card" key={assignment.id}>
                    <div className="extra-admin-card__top">
                      <span className="badge badge--blue">
                        <Sparkles size={12} /> Доп. задание
                      </span>
                      <span className="muted">
                        {assignment.due_at
                          ? `до ${formatDateTime(assignment.due_at)}`
                          : 'без дедлайна'}
                      </span>
                    </div>
                    <h3>{assignment.title}</h3>
                    <p
                      className={`${assignment.description ? '' : 'muted'}${
                        expandedExtraId === assignment.id ? ' is-open' : ''
                      }`}
                    >
                      {assignment.description || 'Описание не добавлено.'}
                    </p>
                    {assignment.description ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() =>
                          setExpandedExtraId((current) =>
                            current === assignment.id ? null : assignment.id,
                          )
                        }
                        aria-expanded={expandedExtraId === assignment.id}
                        data-testid={`read-extra-assignment-${assignment.id}`}
                      >
                        {expandedExtraId === assignment.id ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                        {expandedExtraId === assignment.id ? 'Скрыть' : 'Читать полное задание'}
                      </button>
                    ) : null}
                    <div className="extra-admin-card__meta">
                      <span>
                        <Users size={14} /> {stats.total}{' '}
                        {plural(stats.total, ['сдача', 'сдачи', 'сдач'])}
                      </span>
                      <span>
                        <CheckCircle2 size={14} /> {stats.graded} оценено
                      </span>
                    </div>
                    <div className="extra-admin-card__actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setWorksTarget(assignment)}
                      >
                        <ClipboardCheck size={15} /> Работы ({stats.total})
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Редактировать задание"
                        aria-label="Редактировать задание"
                        onClick={() => openEdit(assignment)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        title="Удалить задание"
                        aria-label="Удалить задание"
                        onClick={() => {
                          setDeleteError('')
                          setDeleteTarget(assignment)
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles size={30} />}
              title="Доп. заданий пока нет"
              text="Создайте первое задание — его увидят студенты всех групп."
              action={
                <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
                  <Plus size={16} /> Создать задание
                </button>
              }
            />
          )}
        </section>

        <aside className="extra-side">
          <ExtraLeaderboard entries={leaderboard} loading={loading} />
        </aside>
      </div>

      <ExtraAssignmentDialog
        open={dialogOpen}
        assignment={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => setRefreshKey((value) => value + 1)}
      />

      <ExtraWorksDialog
        open={Boolean(worksTarget)}
        assignment={worksTarget}
        onClose={() => setWorksTarget(null)}
        onChanged={() => setRefreshKey((value) => value + 1)}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null)
        }}
        title="Удалить доп. задание?"
        size="sm"
      >
        <div className="confirm-box">
          <p>
            Задание <strong>«{deleteTarget?.title}»</strong> будет удалено вместе со всеми
            сдачами и файлами. Это действие нельзя отменить.
          </p>
          {deleteError ? <div className="error-box">{deleteError}</div> : null}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteBusy}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => void removeAssignment()}
              disabled={deleteBusy}
            >
              {deleteBusy ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
              Удалить задание
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
