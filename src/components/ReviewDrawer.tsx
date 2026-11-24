import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  BookOpen,
  Check,
  Download,
  FileText,
  FileX,
  History,
  Info,
  Loader2,
  Highlighter,
  MessageSquare,
  MessageSquareWarning,
  PencilLine,
  Save,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { Modal } from './Modal'
import { Stars } from './Stars'
import { GradeBadge } from './GradeBadge'
import { FileViewer } from './viewers/FileViewer'
import { backend } from '../lib/api'
import { editingEnabled } from '../lib/supabase'
import type {
  Annotation,
  AnnotationRect,
  GradeType,
  GradeAppeal,
  Submission,
  SubmissionVersion,
} from '../lib/types'
import type { SubmissionSticker } from '../lib/types'
import { formatDateTime, formatSize } from '../lib/format'
import { gradeLabel, gradeTypeLabel, normalizeGradeType, validateGrade } from '../lib/grades'
import { fileKind } from '../lib/fileTypes'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { StickerBurst } from './StickerBurst'
import {
  STICKER_OPTIONS,
  stickerLabel,
  stickerTone,
  type StickerOption,
  type StickerTone,
} from '../lib/stickers'

export interface ReviewMeta {
  studentName?: string
  assignmentTitle?: string
  groupName?: string
  gradeType?: GradeType
}

interface ReviewDrawerProps {
  open: boolean
  submissionId: string | null
  mode: 'student' | 'admin'
  meta?: ReviewMeta
  onClose: () => void
  onChanged?: () => void
}

type Draft =
  | { kind: 'pdf'; page: number; rects: AnnotationRect[] }
  | { kind: 'text'; range: { start: number; end: number; text: string } }

const COLORS = [
  { value: '#f2b705', label: 'жёлтый' },
  { value: '#e05252', label: 'красный' },
  { value: '#2e9b6b', label: 'зелёный' },
  { value: '#4f7fd6', label: 'синий' },
]

function CommentComposer({
  draft,
  saving,
  onSave,
  onCancel,
}: {
  draft: Draft
  saving: boolean
  onSave: (comment: string, color: string) => void
  onCancel: () => void
}) {
  const [comment, setComment] = useState('')
  const [color, setColor] = useState(COLORS[0].value)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Фокус ставится ОДИН раз при появлении формы. Ввод хранится локально,
  // поэтому каждая буква не перерисовывает родителя и не сбрасывает фокус.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    if (!comment.trim() || saving) return
    onSave(comment.trim(), color)
  }

  return (
    <form
      className="annotation-composer"
      data-testid="annotation-composer"
      onMouseDown={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="annotation-composer__head">
        <span className="annotation-composer__icon">
          <Highlighter size={17} />
        </span>
        <div>
          <strong>Новое замечание</strong>
          <span>
            {draft.kind === 'pdf'
              ? `Прямоугольник на странице ${draft.page}`
              : `Выделенный текст: «${draft.range.text.slice(0, 80)}${
                  draft.range.text.length > 80 ? '…' : ''
                }»`}
          </span>
        </div>
        <button type="button" className="icon-btn" aria-label="Отменить замечание" onClick={onCancel}>
          <X size={17} />
        </button>
      </div>
      <textarea
        ref={inputRef}
        className="annotation-input"
        rows={3}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
        placeholder="Коротко опишите ошибку или замечание…"
        data-testid="annotation-comment"
      />
      <div className="annotation-composer__colors" role="group" aria-label="Цвет выделения">
        {COLORS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`color-dot ${color === item.value ? 'is-active' : ''}`}
            style={{ backgroundColor: item.value }}
            onClick={() => setColor(item.value)}
            aria-label={`Цвет ${item.label}`}
            title={item.label}
          />
        ))}
        <span className="annotation-composer__hint">Ctrl+Enter — сохранить</span>
      </div>
      <div className="annotation-composer__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={saving}>
          Отмена
        </button>
        <button
          type="submit"
          className="btn btn--primary btn--sm"
          disabled={!comment.trim() || saving}
          data-testid="annotation-save"
        >
          {saving ? <Loader2 className="spin" size={15} /> : <Check size={15} />}
          Сохранить
        </button>
      </div>
    </form>
  )
}

const APPEAL_STATUS_LABELS: Record<GradeAppeal['status'], string> = {
  pending: 'На рассмотрении',
  accepted: 'Принята',
  rejected: 'Отклонена',
  cancelled: 'Отозвана',
}

function AppealResolveForm({
  busy,
  onResolve,
}: {
  busy: boolean
  onResolve: (status: 'accepted' | 'rejected', comment: string | null) => void
}) {
  const [comment, setComment] = useState('')

  return (
    <div className="appeal-resolve">
      <textarea
        rows={2}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Комментарий студенту (необязательно)"
        maxLength={1000}
        data-testid="appeal-teacher-comment"
      />
      <div className="appeal-resolve__actions">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={busy}
          onClick={() => onResolve('accepted', comment.trim() || null)}
          data-testid="appeal-accept"
        >
          <Check size={15} /> Принять
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={busy}
          onClick={() => onResolve('rejected', comment.trim() || null)}
          data-testid="appeal-reject"
        >
          <X size={15} /> Отклонить
        </button>
      </div>
    </div>
  )
}

export function ReviewDrawer({
  open,
  submissionId,
  mode,
  meta,
  onClose,
  onChanged,
}: ReviewDrawerProps) {
  const toast = useToast()
  const { profile } = useAuth()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [appeals, setAppeals] = useState<GradeAppeal[]>([])
  const [appealText, setAppealText] = useState('')
  const [appealError, setAppealError] = useState('')
  const [appealBusy, setAppealBusy] = useState(false)
  const [versions, setVersions] = useState<SubmissionVersion[]>([])
  const [blob, setBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileError, setFileError] = useState('')
  const [error, setError] = useState('')
  const [markerActive, setMarkerActive] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftKey, setDraftKey] = useState(0)
  const [savingAnnotation, setSavingAnnotation] = useState(false)
  const [gradeBusy, setGradeBusy] = useState(false)
  const [gradeConfirm, setGradeConfirm] = useState<number | null>(null)
  const [pointsDraft, setPointsDraft] = useState('')
  const [removing, setRemoving] = useState(false)
  const [editingText, setEditingText] = useState(false)
  const [textValue, setTextValue] = useState('')
  const [savingText, setSavingText] = useState(false)
  const [stickers, setStickers] = useState<SubmissionSticker[]>([])
  const [stickerEffect, setStickerEffect] = useState<{
    emoji: string
    tone: StickerTone
    id: number
  } | null>(null)
  const composerWrapRef = useRef<HTMLDivElement>(null)

  const loadAnnotations = useCallback(async (id: string) => {
    const value = await backend.annotations.list(id)
    setAnnotations(value)
  }, [])

  const loadBlob = useCallback(async (path: string | null) => {
    if (!path) {
      setBlob(null)
      setFileError('')
      return
    }
    try {
      const value = await backend.files.blob(path)
      setBlob(value)
      setFileError('')
    } catch (err) {
      setBlob(null)
      setFileError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    if (!open || !submissionId) return
    let cancelled = false
    setLoading(true)
    setError('')
    setMarkerActive(false)
    setDraft(null)
    setGradeConfirm(null)
    setEditingText(false)
    setTextValue('')
    setBlob(null)
    setFileError('')
    setAppeals([])
    setAppealText('')
    setAppealError('')
    setStickers([])
    setStickerEffect(null)

    const load = async () => {
      try {
        const [submissionValue, annotationValue, versionValue, appealValue, stickerValue] =
          await Promise.all([
            backend.submissions.get(submissionId),
            backend.annotations.list(submissionId),
            backend.submissions.versions(submissionId),
            backend.gradeAppeals.list(submissionId),
            backend.submissions.stickers.list(submissionId),
          ])
        if (cancelled) return
        setSubmission(submissionValue)
        setAnnotations(annotationValue)
        setVersions(versionValue)
        setAppeals(appealValue)
        setStickers(stickerValue)
        setLoading(false)
        await loadBlob(submissionValue.file_path)
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message)
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, submissionId, loadBlob])

  useEffect(() => {
    if (!open || !submission) return
    setPointsDraft(submission.grade != null ? String(submission.grade) : '')
  }, [open, submission?.id, submission?.grade])

  useEffect(() => {
    if (!stickerEffect) return
    const timer = window.setTimeout(() => setStickerEffect(null), 1000)
    return () => window.clearTimeout(timer)
  }, [stickerEffect])

  const gradeType = normalizeGradeType(meta?.gradeType)
  const latestVersionAt = versions.reduce((latest, version) => {
    const time = new Date(version.created_at).getTime()
    return Number.isNaN(time) ? latest : Math.max(latest, time)
  }, 0)
  const activeAnnotations = annotations.filter((annotation) => {
    const time = new Date(annotation.created_at).getTime()
    return Number.isNaN(time) || time > latestVersionAt
  })
  const gradeLockedByRemarks =
    mode === 'admin' && submission?.grade == null && activeAnnotations.length > 0
  const kind = submission ? fileKind(submission.original_name ?? '') : null
  const pendingAppeal = appeals.find((appeal) => appeal.status === 'pending') ?? null
  const fileDeleted = Boolean(
    submission &&
      (submission.file_deleted_at ||
        (!submission.file_path && Boolean(submission.original_name))),
  )
  const hasStoredFiles = Boolean(
    submission && (submission.file_path || versions.some((version) => version.file_path)),
  )
  const visibleStickers = stickers.filter((sticker) =>
    mode === 'admin' ? sticker.teacher_id === profile?.id : true,
  )
  const activeSticker = mode === 'admin' ? visibleStickers[visibleStickers.length - 1]?.emoji ?? null : null
  const firstNegativeIndex = STICKER_OPTIONS.findIndex((option) => option.tone === 'negative')
  const canMark =
    mode === 'admin' && !fileDeleted && kind && ['pdf', 'docx', 'txt'].includes(kind.preview)

  const pickRect = (page: number, rect: AnnotationRect) => {
    setDraft({ kind: 'pdf', page, rects: [rect] })
    setDraftKey((value) => value + 1)
    window.setTimeout(() => {
      if (window.innerWidth < 900) composerWrapRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 60)
  }

  const pickRange = (range: { start: number; end: number; text: string }) => {
    setDraft({ kind: 'text', range })
    setDraftKey((value) => value + 1)
    window.setTimeout(() => {
      if (window.innerWidth < 900) composerWrapRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 60)
    window.getSelection()?.removeAllRanges()
  }

  const saveAnnotation = async (comment: string, color: string) => {
    if (!submission || !draft) return
    setSavingAnnotation(true)
    try {
      await backend.annotations.create({
        submission_id: submission.id,
        kind: draft.kind,
        page: draft.kind === 'pdf' ? draft.page : null,
        rects: draft.kind === 'pdf' ? draft.rects : null,
        range: draft.kind === 'text' ? draft.range : null,
        color,
        comment,
      })
      setDraft(null)
      await loadAnnotations(submission.id)
      toast.success('Замечание сохранено')
      onChanged?.()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSavingAnnotation(false)
    }
  }

  const deleteAnnotation = async (annotation: Annotation) => {
    if (!submission) return
    if (!window.confirm('Удалить это замечание?')) return
    try {
      await backend.annotations.remove(annotation.id)
      await loadAnnotations(submission.id)
      toast.success('Замечание удалено')
      onChanged?.()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const submitAppeal = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!submission || appealBusy) return
    setAppealError('')
    if (appealText.trim().length < 5) {
      setAppealError('Опишите причину апелляции подробнее')
      return
    }
    setAppealBusy(true)
    try {
      await backend.gradeAppeals.create(submission.id, appealText.trim())
      setAppealText('')
      setAppeals(await backend.gradeAppeals.list(submission.id))
      toast.success('Апелляция отправлена преподавателю')
      onChanged?.()
    } catch (err) {
      setAppealError((err as Error).message)
    } finally {
      setAppealBusy(false)
    }
  }

  const cancelAppeal = async (appeal: GradeAppeal) => {
    if (!submission || appealBusy) return
    setAppealBusy(true)
    setAppealError('')
    try {
      await backend.gradeAppeals.cancel(appeal.id)
      setAppeals(await backend.gradeAppeals.list(submission.id))
      toast.success('Апелляция отозвана')
      onChanged?.()
    } catch (err) {
      setAppealError((err as Error).message)
    } finally {
      setAppealBusy(false)
    }
  }

  const resolveAppeal = async (
    appeal: GradeAppeal,
    status: 'accepted' | 'rejected',
    comment: string | null,
  ) => {
    if (!submission || appealBusy) return
    setAppealBusy(true)
    setAppealError('')
    try {
      await backend.gradeAppeals.resolve(appeal.id, status, comment)
      setAppeals(await backend.gradeAppeals.list(submission.id))
      toast.success(status === 'accepted' ? 'Апелляция принята' : 'Апелляция отклонена')
      onChanged?.()
    } catch (err) {
      setAppealError((err as Error).message)
    } finally {
      setAppealBusy(false)
    }
  }

  const commitGrade = async (grade: number | null, deleteFiles: boolean) => {
    if (!submission || gradeBusy) return
    if (gradeLockedByRemarks && grade != null) {
      toast.error('Сначала исправьте замечания: пока они активны, оценку ставить нельзя')
      return
    }
    const message = validateGrade(gradeType, grade)
    if (message) {
      toast.error(message)
      return
    }
    setGradeBusy(true)
    try {
      const updated = await backend.submissions.setGrade(submission.id, grade, {
        deleteFiles,
      })
      setSubmission(updated)
      if (deleteFiles) {
        setBlob(null)
        const nextVersions = await backend.submissions.versions(submission.id)
        setVersions(nextVersions)
      }
      toast.success(
        grade != null ? `Оценка: ${gradeLabel(gradeType, grade)}` : 'Оценка снята',
      )
      if (deleteFiles) {
        toast.notify('Файл и прошлые версии удалены из хранилища')
      }
      onChanged?.()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setGradeBusy(false)
    }
  }

  const requestGrade = (grade: number | null) => {
    if (!submission || gradeBusy) return
    if (gradeLockedByRemarks && grade != null) {
      toast.error('Сначала исправьте замечания: пока они активны, оценку ставить нельзя')
      return
    }
    const message = validateGrade(gradeType, grade)
    if (message) {
      toast.error(message)
      return
    }
    if (grade != null && hasStoredFiles) {
      setGradeConfirm(grade)
      return
    }
    void commitGrade(grade, false)
  }

  const savePointsGrade = () => {
    if (!pointsDraft.trim()) {
      toast.error('Введите балл от 0 до 100')
      return
    }
    const value = Number(pointsDraft)
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      toast.error('Балл должен быть целым числом от 0 до 100')
      return
    }
    requestGrade(value)
  }

  const removeSubmission = async () => {
    if (!submission) return
    if (
      !window.confirm(
        'Снять отметку о сдаче? Работа и её файл будут удалены из журнала и хранилища.',
      )
    ) {
      return
    }
    setRemoving(true)
    try {
      await backend.submissions.remove(submission.id)
      toast.success('Отметка снята')
      onChanged?.()
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRemoving(false)
    }
  }

  const download = async () => {
    if (!submission?.file_path) return
    try {
      await backend.files.download(
        submission.file_path,
        submission.original_name || 'работа',
      )
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const downloadVersion = async (version: SubmissionVersion) => {
    if (!version.file_path) return
    try {
      await backend.files.download(
        version.file_path,
        version.original_name || `версия-${version.version}`,
      )
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const startTextEditing = () => {
    if (!blob) return
    blob
      .text()
      .then((value) => {
        setTextValue(value)
        setEditingText(true)
      })
      .catch((err: Error) => toast.error(err.message))
  }

  const saveText = async () => {
    if (!submission) return
    setSavingText(true)
    try {
      const updated = await backend.submissions.saveText(submission.id, textValue)
      setSubmission(updated)
      setEditingText(false)
      await Promise.all([loadBlob(updated.file_path), loadAnnotations(updated.id)])
      const nextVersions = await backend.submissions.versions(updated.id)
      setVersions(nextVersions)
      toast.success('Новая версия TXT сохранена')
      onChanged?.()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSavingText(false)
    }
  }

  const addSticker = async (option: StickerOption) => {
    if (!submission) return
    const own = stickers.find(
      (sticker) => sticker.teacher_id === profile?.id && sticker.emoji === option.emoji,
    )
    if (own) {
      await removeSticker(own)
      return
    }
    setStickerEffect({ emoji: option.emoji, tone: option.tone, id: Date.now() })
    try {
      const created = await backend.submissions.stickers.add(submission.id, option.emoji)
      setStickers((prev) => [...prev, created])
    } catch (err) {
      setStickerEffect(null)
      toast.error((err as Error).message)
    }
  }

  const removeSticker = async (sticker: SubmissionSticker) => {
    try {
      await backend.submissions.stickers.remove(sticker.id)
      setStickers((prev) => prev.filter((item) => item.id !== sticker.id))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (!open || !submissionId) return null

  const title = submission?.original_name || meta?.assignmentTitle || 'Работа студента'
  const subtitle = [
    meta?.studentName || (mode === 'student' ? 'Моя работа' : 'Студент'),
    meta?.assignmentTitle,
    meta?.groupName ? `группа ${meta.groupName}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        size="full"
        className="review-modal"
        closeOnBackdrop={false}
      >
      {loading ? (
        <div className="viewer-loading viewer-loading--page">
          <Loader2 className="spin" size={26} /> Загружаем работу…
        </div>
      ) : error ? (
        <div className="viewer-fallback viewer-fallback--page">
          <MessageSquareWarning size={32} />
          <h3>Работа недоступна</h3>
          <p>{error}</p>
        </div>
      ) : submission ? (
        <div className={`review-layout ${stickerEffect?.tone === 'negative' ? 'is-hit' : ''}`}>
          <section className="review-main">
            <div className="review-toolbar">
              <div className="review-toolbar__file">
                {kind ? <span className="file-kind">{kind.label}</span> : null}
                <span title={submission.original_name ?? undefined}>
                  {submission.original_name ||
                    (submission.answer_text ? 'Ответ текстом' : 'Файл не прикреплён')}
                </span>
                {submission.size ? (
                  <span className="muted">{formatSize(submission.size)}</span>
                ) : null}
                {fileDeleted ? (
                  <span className="file-deleted-note">удалён после проверки</span>
                ) : null}
              </div>
              <div className="review-toolbar__actions">
                {submission.file_path && !fileDeleted ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={download}>
                    <Download size={16} /> Скачать
                  </button>
                ) : null}
                {mode === 'admin' && canMark ? (
                  <button
                    type="button"
                    className={`btn btn--sm ${markerActive ? 'btn--marker-active' : 'btn--secondary'}`}
                    onClick={() => {
                      setMarkerActive((value) => !value)
                      setDraft(null)
                    }}
                    data-testid="marker-toggle"
                  >
                    <Highlighter size={16} /> {markerActive ? 'Маркер включён' : 'Маркер'}
                  </button>
                ) : null}
              </div>
            </div>

            {markerActive ? (
              <div className="marker-banner">
                <Highlighter size={16} />
                <span>
                  {kind?.preview === 'pdf'
                    ? 'Зажмите и протяните прямоугольник вокруг ошибки на странице.'
                    : 'Выделите мышью фрагмент текста с ошибкой.'}{' '}
                  Комментарий появится в панели справа.
                </span>
              </div>
            ) : null}

            {mode === 'admin' && submission ? (
              <div className="sticker-row" data-testid="sticker-row">
                {STICKER_OPTIONS.map((option, index) => (
                  <Fragment key={option.emoji}>
                    {index === firstNegativeIndex ? (
                      <span className="sticker-divider" aria-hidden="true" />
                    ) : null}
                    <button
                      type="button"
                      className={`sticker-btn sticker-btn--${option.tone} ${
                        activeSticker === option.emoji ? 'is-active' : ''
                      }`}
                      onClick={() => void addSticker(option)}
                      aria-label={`${option.label}: ${option.hint}`}
                      aria-pressed={activeSticker === option.emoji}
                      title={`${option.label} — ${option.hint}`}
                      data-testid={`sticker-${option.emoji}`}
                    >
                      <span className="sticker-btn__emoji">{option.emoji}</span>
                    </button>
                  </Fragment>
                ))}
              </div>
            ) : null}

            {submission && visibleStickers.length ? (
              <div className="sticker-list" data-testid="sticker-list">
                {visibleStickers.map((sticker) =>
                  mode === 'admin' ? (
                    <button
                      key={sticker.id}
                      type="button"
                      className={`sticker-chip sticker-chip--${stickerTone(sticker.emoji)} sticker-chip--action`}
                      onClick={() => void removeSticker(sticker)}
                      title={`Убрать реакцию «${stickerLabel(sticker.emoji)}»`}
                      aria-label={`Убрать реакцию ${stickerLabel(sticker.emoji)}`}
                      data-testid="sticker-chip"
                    >
                      {sticker.emoji}
                    </button>
                  ) : (
                    <span
                      key={sticker.id}
                      className={`sticker-chip sticker-chip--${stickerTone(sticker.emoji)}`}
                      title={stickerLabel(sticker.emoji)}
                      data-testid="sticker-chip"
                    >
                      {sticker.emoji}
                    </span>
                  ),
                )}
              </div>
            ) : null}

            {submission.answer_text ? (
              <div className="review-answer" data-testid="review-answer-text">
                <div className="review-answer__head">
                  <MessageSquare size={15} /> Ответ студента
                </div>
                <p>{submission.answer_text}</p>
              </div>
            ) : null}

            <div className="review-viewer">
              {fileError ? (
                <div className="viewer-fallback">
                  <FileText size={30} />
                  <h3>Не удалось загрузить файл</h3>
                  <p>{fileError}</p>
                  <button type="button" className="btn btn--secondary" onClick={download}>
                    <Download size={16} /> Скачать файл
                  </button>
                </div>
              ) : fileDeleted ? (
                <div className="viewer-fallback viewer-fallback--deleted">
                  <FileX size={30} />
                  <h3>Файл удалён после проверки</h3>
                  <p>
                    Файл и его прошлые версии удалены из хранилища сразу после подтверждения
                    проверки. Оценка, замечания и данные о работе сохранены.
                  </p>
                </div>
              ) : !submission.file_path ? (
                <div className="viewer-fallback">
                  <Info size={30} />
                  <h3>
                    {submission.answer_text ? 'Работа сдана текстом' : 'Файл не прикреплён'}
                  </h3>
                  <p>
                    {submission.answer_text
                      ? 'Файл не прикреплён — преподаватель увидит текстовый ответ выше.'
                      : 'Преподаватель отметил сдачу вручную. Студент может прикрепить файл из вкладки «Задания», пока оценка не выставлена.'}
                  </p>
                </div>
              ) : !blob ? (
                <div className="viewer-loading viewer-loading--page">
                  <Loader2 className="spin" size={24} /> Скачиваем файл…
                </div>
              ) : editingText ? (
                <div className="text-editor">
                  <textarea
                    value={textValue}
                    onChange={(event) => setTextValue(event.target.value)}
                    className="text-editor__area"
                    spellCheck={false}
                    data-testid="text-editor"
                  />
                  <div className="text-editor__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setEditingText(false)}
                      disabled={savingText}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={saveText}
                      disabled={savingText}
                    >
                      {savingText ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                      Сохранить новую версию
                    </button>
                  </div>
                </div>
              ) : (
                <FileViewer
                  blob={blob}
                  name={submission.original_name ?? ''}
                  size={submission.size}
                  annotations={annotations}
                  markerActive={markerActive}
                  onPickRect={pickRect}
                  onPickRange={pickRange}
                  onDownload={download}
                />
              )}
            </div>
          </section>

          <aside className="review-side">
            <div className="review-info">
              <div className="review-info__row">
                <UserRound size={15} />
                <span>{meta?.studentName || (mode === 'student' ? 'Моя работа' : '—')}</span>
              </div>
              <div className="review-info__row">
                <BookOpen size={15} />
                <span>{meta?.assignmentTitle || 'Задание'}</span>
              </div>
              <div className="review-info__row">
                <History size={15} />
                <span>Сдано {formatDateTime(submission.submitted_at)}</span>
              </div>
              <div className="review-info__meta">
                <span
                  className={`status-pill status-pill--${
                    submission.grade != null ? 'graded' : 'sent'
                  }`}
                >
                  {submission.grade != null ? 'Оценено' : 'На проверке'}
                </span>
                <span className="muted">версия {submission.version}</span>
              </div>
            </div>

            <div className="grade-card">
              <div className="grade-card__head">
                <strong>Оценка</strong>
                <span className="muted">
                  {mode === 'admin' ? gradeTypeLabel(gradeType) : 'преподаватель'}
                </span>
              </div>

              {gradeLockedByRemarks ? (
                <div className="grade-lock-note" data-testid="grade-lock-remarks">
                  <MessageSquareWarning size={15} />
                  <span>
                    Пока есть активные замечания, оценку ставить нельзя. Сначала студент
                    должен загрузить исправленную версию.
                  </span>
                </div>
              ) : null}

              {gradeType === 'pass_fail' ? (
                <div className="grade-choice">
                  {mode === 'admin' ? (
                    <>
                      <button
                        type="button"
                        className={`grade-choice__btn grade-choice__btn--pass ${
                          submission.grade === 1 ? 'is-active' : ''
                        }`}
                        onClick={() => requestGrade(1)}
                        disabled={gradeBusy || gradeLockedByRemarks}
                        data-testid="grade-pass"
                      >
                        <Check size={17} /> Зачёт
                      </button>
                      <button
                        type="button"
                        className={`grade-choice__btn grade-choice__btn--fail ${
                          submission.grade === 0 ? 'is-active' : ''
                        }`}
                        onClick={() => requestGrade(0)}
                        disabled={gradeBusy || gradeLockedByRemarks}
                        data-testid="grade-fail"
                      >
                        <X size={17} /> Незачёт
                      </button>
                      {submission.grade != null ? (
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => requestGrade(null)}
                          disabled={gradeBusy}
                        >
                          Снять
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <GradeBadge grade={submission.grade} type="pass_fail" />
                  )}
                </div>
              ) : gradeType === 'points' ? (
                <div className="grade-points-editor">
                  {mode === 'admin' ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={pointsDraft}
                        onChange={(event) => setPointsDraft(event.target.value)}
                        placeholder="0–100"
                        disabled={gradeBusy || gradeLockedByRemarks}
                        data-testid="points-grade-input"
                      />
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={savePointsGrade}
                        disabled={gradeBusy || gradeLockedByRemarks}
                        data-testid="save-points-grade"
                      >
                        {gradeBusy ? (
                          <Loader2 className="spin" size={15} />
                        ) : (
                          <Save size={15} />
                        )}
                        Сохранить
                      </button>
                      {submission.grade != null ? (
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => requestGrade(null)}
                          disabled={gradeBusy}
                        >
                          Снять
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <GradeBadge grade={submission.grade} type="points" size={20} />
                  )}
                </div>
              ) : (
                <div className="grade-card__stars">
                  <Stars
                    value={submission.grade}
                    onChange={
                      mode === 'admin' && !gradeLockedByRemarks ? requestGrade : undefined
                    }
                    size={24}
                    showEmpty
                    label={
                      submission.grade != null
                        ? `Оценка ${submission.grade} из 5`
                        : 'Оценки пока нет'
                    }
                  />
                  {submission.grade != null ? (
                    <b className="grade-card__num">{submission.grade}</b>
                  ) : null}
                </div>
              )}

              {mode === 'admin' ? (
                <p className="grade-card__hint">
                  {gradeLockedByRemarks
                    ? 'Оценка станет доступна после загрузки студентом новой версии или после удаления замечаний.'
                    : gradeType === 'pass_fail'
                      ? 'Выберите «Зачёт» или «Незачёт». Перед сохранением подтвердите проверку — файл удалится сразу, оценка останется.'
                      : gradeType === 'points'
                        ? 'Введите целое число от 0 до 100 и нажмите «Сохранить». Перед сохранением подтвердите проверку — файл удалится сразу.'
                        : 'Нажмите на звезду, чтобы выставить оценку. Перед сохранением подтвердите проверку — файл удалится сразу. Повторное нажатие снимает оценку.'}
                </p>
              ) : (
                <p className="grade-card__hint">
                  {submission.grade != null
                    ? fileDeleted
                      ? `Ваша оценка: ${gradeLabel(
                          gradeType,
                          submission.grade,
                        )}. Файл удалён из хранилища после проверки.`
                      : `Ваша оценка: ${gradeLabel(
                          gradeType,
                          submission.grade,
                        )}. Замена файла больше недоступна.`
                    : 'Пока оценки нет — файл можно заменить в разделе «Задания».'}
                </p>
              )}

              {mode === 'admin' ? (
                <button
                  type="button"
                  className="text-btn text-btn--danger"
                  onClick={removeSubmission}
                  disabled={removing}
                >
                  {removing ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                  Снять отметку о сдаче
                </button>
              ) : null}
            </div>

            <div className="appeal-card" data-testid="appeal-card">
              <div className="annotations-card__head">
                <strong>
                  <MessageSquareWarning size={16} /> Апелляция оценки
                </strong>
                {pendingAppeal ? <span className="badge">ждёт ответа</span> : null}
              </div>

              {mode === 'student' ? (
                submission.grade == null ? (
                  <p className="annotations-empty">
                    Апелляцию можно подать после того, как преподаватель выставит оценку.
                  </p>
                ) : pendingAppeal ? (
                  <div className="appeal-pending">
                    <p>Апелляция отправлена. Преподаватель ещё не ответил.</p>
                    <button
                      type="button"
                      className="text-btn text-btn--danger"
                      onClick={() => cancelAppeal(pendingAppeal)}
                      disabled={appealBusy}
                    >
                      {appealBusy ? <Loader2 className="spin" size={14} /> : <X size={14} />}
                      Отозвать апелляцию
                    </button>
                  </div>
                ) : (
                  <form className="appeal-form" onSubmit={submitAppeal}>
                    <p className="annotations-note">
                      Если вы считаете оценку несправедливой, опишите причину — преподаватель
                      пересмотрит работу и ответит здесь.
                    </p>
                    <textarea
                      rows={3}
                      value={appealText}
                      onChange={(event) => setAppealText(event.target.value)}
                      placeholder="Например: задание выполнено по всем критериям, прошу пересмотреть балл…"
                      maxLength={1000}
                      data-testid="appeal-message"
                    />
                    <div className="appeal-form__actions">
                      <span className="muted">{appealText.length} / 1000</span>
                      <button
                        type="submit"
                        className="btn btn--primary btn--sm"
                        disabled={appealBusy}
                        data-testid="appeal-submit"
                      >
                        {appealBusy ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                        Отправить апелляцию
                      </button>
                    </div>
                  </form>
                )
              ) : pendingAppeal ? (
                <div className="appeal-pending">
                  <p className="appeal-message">{pendingAppeal.message}</p>
                  <AppealResolveForm
                    busy={appealBusy}
                    onResolve={(status, comment) => resolveAppeal(pendingAppeal, status, comment)}
                  />
                </div>
              ) : (
                <p className="annotations-empty">
                  Апелляций на рассмотрении нет. Студент может подать её после выставления оценки.
                </p>
              )}

              {appealError ? <p className="appeal-error">{appealError}</p> : null}

              {appeals.length ? (
                <ul className="appeal-list">
                  {appeals.map((appeal) => (
                    <li key={appeal.id} className={`appeal-item appeal-item--${appeal.status}`}>
                      <div className="appeal-item__head">
                        <span>{APPEAL_STATUS_LABELS[appeal.status]}</span>
                        <span className="muted">{formatDateTime(appeal.created_at)}</span>
                      </div>
                      <p>{appeal.message}</p>
                      {appeal.teacher_comment ? (
                        <p className="appeal-item__answer">
                          <strong>Ответ преподавателя:</strong> {appeal.teacher_comment}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="annotations-card">
              <div className="annotations-card__head">
                <strong>
                  <MessageSquareWarning size={16} /> Замечания
                </strong>
                <span className="badge">{annotations.length}</span>
              </div>

              <div ref={composerWrapRef}>
                {draft ? (
                  <CommentComposer
                    key={draftKey}
                    draft={draft}
                    saving={savingAnnotation}
                    onSave={saveAnnotation}
                    onCancel={() => setDraft(null)}
                  />
                ) : null}
              </div>

              {annotations.length ? (
                <ul className="annotation-list">
                  {annotations.map((annotation) => (
                    <li key={annotation.id} className="annotation-item">
                      <span
                        className="annotation-item__dot"
                        style={{ backgroundColor: annotation.color }}
                      />
                      <div className="annotation-item__body">
                        <p>{annotation.comment}</p>
                        <span>
                          {annotation.kind === 'pdf'
                            ? `стр. ${annotation.page ?? 1}`
                            : `«${(annotation.range?.text ?? '').slice(0, 42)}${
                                (annotation.range?.text.length ?? 0) > 42 ? '…' : ''
                              }»`}
                        </span>
                      </div>
                      {mode === 'admin' ? (
                        <button
                          type="button"
                          className="mini-icon-btn mini-icon-btn--danger"
                          onClick={() => deleteAnnotation(annotation)}
                          aria-label="Удалить замечание"
                          title="Удалить замечание"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="annotations-empty">
                  {mode === 'admin'
                    ? 'Замечаний пока нет. Включите «Маркер» и выделите ошибку.'
                    : 'Преподаватель пока не оставил замечаний.'}
                </p>
              )}

              {mode === 'student' ? (
                <p className="annotations-note">
                  Замечания не меняют ваш файл — они хранятся отдельно и видны только вам и
                  преподавателю.
                </p>
              ) : null}
            </div>

            {mode === 'student' &&
            editingEnabled &&
            kind?.preview === 'txt' &&
            submission.grade == null &&
            blob ? (
              <div className="edit-card">
                <strong>
                  <PencilLine size={16} /> Онлайн-редактирование
                </strong>
                <p>Можно исправить текст и сохранить новую версию. Старая версия останется в истории.</p>
                <button type="button" className="btn btn--secondary btn--sm" onClick={startTextEditing}>
                  <PencilLine size={15} /> Редактировать текст
                </button>
              </div>
            ) : null}

            {versions.length ? (
              <details className="versions-card">
                <summary>
                  <History size={16} /> История версий ({versions.length})
                </summary>
                <ul>
                  {versions.map((version) => {
                    const deleted = Boolean(version.file_deleted_at || !version.file_path)
                    return (
                      <li key={version.id}>
                        <div>
                          <strong>Версия {version.version}</strong>
                          <span>
                            {formatDateTime(version.created_at)} · {formatSize(version.size)}
                          </span>
                        </div>
                        {deleted ? (
                          <span className="version-deleted">файл удалён</span>
                        ) : (
                          <button
                            type="button"
                            className="mini-icon-btn"
                            onClick={() => downloadVersion(version)}
                            title="Скачать версию"
                            aria-label={`Скачать версию ${version.version}`}
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </details>
            ) : null}

            {mode === 'student' && !editingEnabled ? (
              <p className="review-side__hint">
                Чтобы исправить работу: скачайте файл, отредактируйте его и загрузите новую версию
                в разделе «Задания» — пока оценка не выставлена.
              </p>
            ) : null}
          </aside>
        </div>
      ) : null}
      </Modal>

      <Modal
        open={gradeConfirm !== null}
        onClose={() => setGradeConfirm(null)}
        title="Вы точно проверили задание полностью?"
        subtitle="Это подтверждение нужно перед выставлением оценки"
        size="sm"
        closeOnBackdrop={false}
      >
        <div className="grade-confirm">
          <p>
            После подтверждения файл работы и все прошлые версии будут <strong>сразу удалены</strong>{' '}
            из хранилища. Оценка, замечания и данные о сдаче останутся в журнале.
          </p>
          <div className="grade-confirm__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setGradeConfirm(null)}
              disabled={gradeBusy}
            >
              Нет
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                if (gradeConfirm === null) return
                const value = gradeConfirm
                setGradeConfirm(null)
                void commitGrade(value, true)
              }}
              disabled={gradeBusy}
              data-testid="grade-confirm-delete"
            >
              {gradeBusy ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
              Проверено
            </button>
          </div>
        </div>
      </Modal>
      {stickerEffect ? (
        <StickerBurst
          emoji={stickerEffect.emoji}
          tone={stickerEffect.tone}
          burstId={stickerEffect.id}
        />
      ) : null}
    </>
  )
}

