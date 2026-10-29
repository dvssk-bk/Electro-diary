import { useEffect, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import { FileViewer } from './viewers/FileViewer'
import { backend } from '../lib/api'
import { formatSize } from '../lib/format'

interface ExtraFileDialogProps {
  open: boolean
  onClose: () => void
  path: string | null
  name: string | null
  size: number | null
}

export function ExtraFileDialog({ open, onClose, path, name, size }: ExtraFileDialogProps) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !path) {
      setBlob(null)
      setError('')
      setLoading(false)
      return
    }
    let cancelled = false
    setBlob(null)
    setError('')
    setLoading(true)
    backend.extraFiles
      .blob(path)
      .then((value) => {
        if (!cancelled) setBlob(value)
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
  }, [open, path])

  const download = () => {
    if (!path || !name) return
    void backend.extraFiles.download(path, name)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={name || 'Файл доп. работы'}
      subtitle={size != null ? formatSize(size) : undefined}
      size="full"
      className="extra-file-modal"
    >
      <div className="extra-file-viewer">
        {loading ? (
          <div className="viewer-fallback">
            <Loader2 className="spin" size={28} />
            <h3>Открываем файл…</h3>
          </div>
        ) : error ? (
          <div className="viewer-fallback">
            <FileText size={30} />
            <h3>Не удалось открыть файл</h3>
            <p>{error}</p>
            {path && name ? (
              <button type="button" className="btn btn--secondary" onClick={download}>
                <Download size={16} /> Скачать файл
              </button>
            ) : null}
          </div>
        ) : blob ? (
          <FileViewer
            blob={blob}
            name={name || 'file'}
            size={size}
            annotations={[]}
            markerActive={false}
            onDownload={download}
          />
        ) : (
          <div className="viewer-fallback">
            <FileText size={30} />
            <h3>Файл не прикреплён</h3>
          </div>
        )}
      </div>
    </Modal>
  )
}
