import { useState } from 'react'
import { Download, Loader2, Paperclip } from 'lucide-react'
import { backend } from '../lib/api'
import { formatSize } from '../lib/format'
import type { AssignmentAttachment } from '../lib/types'

interface AssignmentAttachmentsProps {
  attachments: AssignmentAttachment[] | undefined
  title?: string
}

export function AssignmentAttachments({
  attachments,
  title = 'Файлы задания',
}: AssignmentAttachmentsProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const files = attachments ?? []
  if (!files.length) return null

  const download = async (attachment: AssignmentAttachment) => {
    setBusyId(attachment.id)
    setError('')
    try {
      await backend.assignmentFiles.download(attachment.file_path, attachment.original_name)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="assignment-attachments">
      <span className="assignment-attachments__title">
        <Paperclip size={14} /> {title}
      </span>
      <ul>
        {files.map((attachment) => (
          <li key={attachment.id}>
            <button
              type="button"
              className="assignment-attachments__file"
              onClick={() => void download(attachment)}
              disabled={busyId === attachment.id}
              title={`Скачать ${attachment.original_name}`}
            >
              {busyId === attachment.id ? (
                <Loader2 className="spin" size={14} />
              ) : (
                <Download size={14} />
              )}
              <span>{attachment.original_name}</span>
              <small>{formatSize(attachment.size)}</small>
            </button>
          </li>
        ))}
      </ul>
      {error ? <span className="assignment-attachments__error">{error}</span> : null}
    </div>
  )
}
