import { Fragment, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { StickerBurst } from '../components/StickerBurst'
import { isDemoMode } from '../lib/supabase'
import {
  STICKER_OPTIONS,
  stickerLabel,
  stickerTone,
  type StickerOption,
  type StickerTone,
} from '../lib/stickers'

interface PlayReaction {
  id: string
  emoji: string
}

interface EffectState {
  emoji: string
  tone: StickerTone
  id: number
}

let reactionSeq = 0

export function StickerPlaygroundPage() {
  const [reactions, setReactions] = useState<PlayReaction[]>([])
  const [effect, setEffect] = useState<EffectState | null>(null)
  const [hits, setHits] = useState(0)

  useEffect(() => {
    if (!effect) return
    const timer = window.setTimeout(() => setEffect(null), 1000)
    return () => window.clearTimeout(timer)
  }, [effect])

  if (!isDemoMode) return <Navigate to="/" replace />

  const pick = (option: StickerOption) => {
    const existing = reactions.find((reaction) => reaction.emoji === option.emoji)
    if (existing) {
      setReactions((prev) => prev.filter((reaction) => reaction.id !== existing.id))
      return
    }
    reactionSeq += 1
    setReactions((prev) => [...prev, { id: `play-${reactionSeq}`, emoji: option.emoji }])
    setEffect({ emoji: option.emoji, tone: option.tone, id: Date.now() })
    if (option.tone === 'negative') setHits((value) => value + 1)
  }

  const clear = () => {
    setReactions([])
    setEffect(null)
  }

  const firstNegativeIndex = STICKER_OPTIONS.findIndex((option) => option.tone === 'negative')

  return (
    <div className="sticker-playground">
      <div className={`sticker-playground__card ${effect?.tone === 'negative' ? 'is-hit' : ''}`}>
        <div className="sticker-playground__head">
          <span className="sticker-playground__badge">Песочница реакций</span>
          <h1>Дайте волю эмоциям</h1>
          <p>
            Так реакции выглядят в окне проверки работы. Нажмите на эмодзи — появится эффект,
            повторное нажатие убирает реакцию. Студент увидит те же значки, но без панели выбора.
          </p>
        </div>

        <div className="sticker-row sticker-row--playground" data-testid="playground-sticker-row">
          {STICKER_OPTIONS.map((option, index) => (
            <Fragment key={option.emoji}>
              {index === firstNegativeIndex ? (
                <span className="sticker-divider" aria-hidden="true" />
              ) : null}
              <button
                type="button"
                className={`sticker-btn sticker-btn--${option.tone} ${
                  reactions.some((reaction) => reaction.emoji === option.emoji) ? 'is-active' : ''
                }`}
                onClick={() => pick(option)}
                aria-pressed={reactions.some((reaction) => reaction.emoji === option.emoji)}
                aria-label={`${option.label}: ${option.hint}`}
                title={`${option.label} — ${option.hint}`}
              >
                <span className="sticker-btn__emoji">{option.emoji}</span>
              </button>
            </Fragment>
          ))}
        </div>

        <div className="sticker-playground__result">
          <div className="sticker-list sticker-list--playground">
            {reactions.length ? (
              reactions.map((reaction) => (
                <button
                  key={reaction.id}
                  type="button"
                  className={`sticker-chip sticker-chip--${stickerTone(reaction.emoji)} sticker-chip--action`}
                  onClick={() => {
                    const option = STICKER_OPTIONS.find((item) => item.emoji === reaction.emoji)
                    if (option) pick(option)
                  }}
                  title={`Убрать реакцию «${stickerLabel(reaction.emoji)}»`}
                >
                  {reaction.emoji}
                </button>
              ))
            ) : (
              <span className="sticker-playground__empty">Пока ни одной реакции</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={clear}
            disabled={!reactions.length}
          >
            <Trash2 size={14} /> Очистить
          </button>
        </div>

        <div className="sticker-playground__stats">
          <span>Негативных реакций: {hits}</span>
          <span>Всего на панели: {reactions.length}</span>
        </div>
      </div>

      <a className="sticker-playground__back" href="#/">
        Вернуться в дневник
      </a>

      {effect ? <StickerBurst emoji={effect.emoji} tone={effect.tone} burstId={effect.id} /> : null}
    </div>
  )
}
