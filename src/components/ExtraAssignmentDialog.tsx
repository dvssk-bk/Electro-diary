import { useEffect, useState, type FormEvent } from 'react'
import { Clock3, Loader2, Save, Sparkles } from 'lucide-react'
import { Modal } from './Modal'
import type { ExtraAssignment, NewExtraAssignment } from '../lib/types'
import { backend } from '../lib/api'
import { toDateTimeLocal } from '../lib/grades'
import { useToast } from '../context/ToastContext'

interface ExtraAssignmentDialogProps {
  open: boolean
  assignment: ExtraAssignment | null
  onClose: () => void
  onSaved: (assignment: ExtraAssignment) => void
}

export function ExtraAssignmentDialog({
  open,
  assignment,
  onClose,
  onSaved,
}: ExtraAssignmentDialogProps) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setBusy(false)
    setTitle(assignment?.title ?? '')
    setDescription(assignment?.description ?? '')
    setDueAt(toDateTimeLocal(assignment?.due_at))
  }, [open, assignment])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Введите название доп. задания')
      return
    }
    let dueIso: string | null = null
    if (dueAt) {
      const parsed = new Date(dueAt)
      if (Number.isNaN(parsed.getTime())) {
        setError('Некорректный дедлайн')
        return
      }
      dueIso = parsed.toISOString()
    }
    const payload: NewExtraAssignment = {
      title: title.trim(),
      description: description.trim(),
      due_at: dueIso,
    }
    setBusy(true)
    try {
      const value = assignment
        ? await backend.extra.update(assignment.id, payload)
        : await backend.extra.create(payload)
      toast.success(assignment ? 'Доп. задание обновлено' : 'Доп. задание создано')
      onSaved(value)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose()
      }}
      title={assignment ? 'Редактировать доп. задание' : 'Новое доп. задание'}
      subtitle="Задание увидят студенты всех групп. Оценивание — только 0–100 баллов."
      size="md"
      closeOnBackdrop={!busy}
    >
      <form className="form" onSubmit={submit}>
        {error ? <div className="error-box">{error}</div> : null}
        <div className="extra-dialog-note">
          <span className="extra-dialog-note__icon">
            <Sparkles size={17} />
          </span>
          <span>
            <strong>Общее задание</strong>
            <small>Не привязано к дисциплине и группе</small>
          </span>
        </div>
        <label className="field">
          <span>Название задания</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, Олимпиада по информатике"
            maxLength={200}
            autoFocus
          />
        </label>
        <label className="field">
          <span>Описание и требования</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Что нужно сделать, какие файлы прикрепить…"
          />
        </label>
        <label className="field">
          <span>Дедлайн сдачи — дата и время</span>
          <div className="input-with-icon">
            <Clock3 size={16} />
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>
          <small className="field-hint">
            Можно оставить пустым. После дедлайна несданные работы подсветятся красным.
          </small>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
            {busy ? 'Сохраняем…' : assignment ? 'Сохранить' : 'Создать задание'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
