import { useEffect, useRef, useState, type DragEvent } from 'react'
import {
  FileUp,
  Info,
  Loader2,
  MessageSquare,
  Paperclip,
  Replace,
  TriangleAlert,
  UploadCloud,
  X,
} from 'lucide-react'
import { Modal } from './Modal'
import type { Assignment, Submission } from '../lib/types'
import { backend } from '../lib/api'
import {
  ACCEPT_ATTR,
  fileKind,
  isAcceptedFile,
  validateFile,
} from '../lib/fileTypes'
import { formatSize } from '../lib/format'
import { uploadLimitBytes } from '../lib/supabase'
import { ANSWER_TEXT_LIMIT, validateAnswerText } from '../lib/answerText'
import { useToast } from '../context/ToastContext'

interface SubmitDialogProps {
  open: boolean
  onClose: () => void
  assignment: Assignment | null
  submission?: Submission | null
  onUploaded: (submission: Submission) => void
}

export function SubmitDialog({
  open,
  onClose,
  assignment,
  submission,
  onUploaded,
}: SubmitDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setFile(null)
    setAnswerText(submission?.answer_text ?? '')
    setError('')
    setProgress(0)
  }, [open, assignment?.id, submission?.id, submission?.answer_text])

  const handleClose = () => {
    if (busy) return
    setFile(null)
    setAnswerText('')
    setError('')
    setProgress(0)
    onClose()
  }

  const pickFile = (value: File | null | undefined) => {
    if (!value) return
    if (!isAcceptedFile(value)) {
      setError('Неподдерживаемый формат файла. Выберите Office, PDF, TXT, ZIP, RAR или MP4.')
      setFile(null)
      return
    }
    const validation = validateFile(value, uploadLimitBytes)
    if (validation) {
      setError(validation)
      setFile(null)
      return
    }
    setError('')
    setFile(value)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    pickFile(event.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    if (!assignment) return
    const textError = validateAnswerText(answerText)
    if (textError) {
      setError(textError)
      return
    }
    const text = answerText.trim()
    if (!file && !text) {
      setError('Прикрепите файл или напишите текст ответа')
      return
    }
    setBusy(true)
    setError('')
    if (file) setProgress(1)
    try {
      const result = file
        ? submission
          ? await backend.submissions.replace(submission.id, file, setProgress, text || null)
          : await backend.submissions.upload(assignment.id, file, setProgress, text || null)
        : await backend.submissions.submitText(assignment.id, text)
      if (file) setProgress(100)
      toast.success(
        file
          ? submission
            ? 'Новая версия работы загружена'
            : 'Работа сдана! Отметка «+» появилась в журнале'
          : 'Текстовый ответ сохранён',
      )
      onUploaded(result)
      setFile(null)
      setAnswerText('')
      setProgress(0)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!assignment) return null
  const kind = file ? fileKind(file.name) : null
  const isVideo = file?.name.toLowerCase().endsWith('.mp4')

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={submission ? 'Дополнить работу' : 'Сдать работу'}
      subtitle={assignment.title}
      size="md"
      closeOnBackdrop={!busy}
    >
      <div className="submit-dialog">
        {submission?.original_name ? (
          <div className="current-file">
            <Paperclip size={16} />
            <div>
              <strong>Текущий файл</strong>
              <span>
                {submission.original_name}
                {submission.file_deleted_at
                  ? ' · файл удалён после проверки'
                  : ` · ${formatSize(submission.size)}`}
              </span>
            </div>
          </div>
        ) : null}

        <div className="submit-text">
          <div className="submit-text__head">
            <span>
              <MessageSquare size={16} /> Ответ текстом
            </span>
            <small
              className={
                answerText.length >= ANSWER_TEXT_LIMIT ? 'submit-text__count is-limit' : 'submit-text__count'
              }
            >
              {answerText.length}/{ANSWER_TEXT_LIMIT}
            </small>
          </div>
          <textarea
            className="submit-text__area"
            rows={3}
            maxLength={ANSWER_TEXT_LIMIT}
            value={answerText}
            onChange={(event) => {
              setAnswerText(event.target.value)
              setError('')
            }}
            placeholder="Напишите короткий ответ, если задание не требует файла"
            disabled={busy}
            data-testid="answer-text"
          />
          <span className="submit-text__hint">
            Необязательно. Можно сдать только текстом, только файлом или приложить и то, и другое.
          </span>
        </div>

        <div
          className={`dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            hidden
            data-testid="file-input"
            onChange={(event) => {
              pickFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          {file ? (
            <div className="dropzone__selected">
              <span className="file-kind">{kind?.label}</span>
              <div className="dropzone__file-text">
                <strong>{file.name}</strong>
                <span>
                  {formatSize(file.size)} · нажмите, чтобы выбрать другой файл
                </span>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Убрать файл"
                onClick={(event) => {
                  event.stopPropagation()
                  setFile(null)
                  setError('')
                }}
              >
                <X size={17} />
              </button>
            </div>
          ) : (
            <div className="dropzone__empty">
              <span className="dropzone__icon">
                <UploadCloud size={28} />
              </span>
              <strong>Перетащите файл сюда</strong>
              <span>или нажмите, чтобы выбрать на устройстве</span>
              <small>
                Office, PDF, TXT, ZIP, RAR, MP4 · до {Math.round(uploadLimitBytes / 1024 / 1024)} МБ
              </small>
            </div>
          )}
        </div>

        {isVideo ? (
          <div className="hint hint--amber">
            <TriangleAlert size={16} />
            <span>
              Видео MP4 может быть большим. Лимит Supabase — 50 МБ: если файл не проходит,
              сожмите видео или прикрепите ссылку внутри архива.
            </span>
          </div>
        ) : (
          <div className="hint">
            <Info size={16} />
            <span>
              Текст ответа и файл привяжутся к заданию и вашему профилю. Изменить ответ можно,
              пока преподаватель не поставил оценку.
            </span>
          </div>
        )}

        {error ? (
          <div className="error-box" data-testid="submit-error">
            {error}
          </div>
        ) : null}

        {file && (busy || progress > 0) ? (
          <div className="progress-wrap" data-testid="upload-progress">
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress >= 100 ? 'Готово' : `Загрузка… ${progress}%`}</span>
          </div>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={busy}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={busy || (!file && !answerText.trim())}
            data-testid="submit-upload"
          >
            {busy ? (
              <Loader2 className="spin" size={17} />
            ) : !file ? (
              <MessageSquare size={17} />
            ) : submission ? (
              <Replace size={17} />
            ) : (
              <FileUp size={17} />
            )}
            {busy
              ? file
                ? 'Загружаем…'
                : 'Сохраняем…'
              : !file
                ? 'Сохранить ответ'
                : submission
                  ? 'Загрузить новую версию'
                  : 'Сдать работу'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
