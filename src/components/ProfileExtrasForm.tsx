import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Avatar } from './Avatar'
import { ErrorBox } from './Feedback'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { backend } from '../lib/api'
import { MONTHS_NOM, daysInMonth, formatBirthday } from '../lib/birthday'
import {
  accentStyle,
  normalizeAccent,
  normalizeFrame,
  validateAccent,
  validateBirthday,
  validateFrame,
} from '../lib/profile'
import type { Profile } from '../lib/types'

/** Готовые цвета рамки: клик — и цвет выбран, как из палитры. */
const FRAME_PRESETS = [
  '#ff5f6d',
  '#ffd452',
  '#4fd18a',
  '#58a6ff',
  '#c77dff',
  '#ffa94d',
  '#1f7fa8',
  '#243b55',
]
/** Спокойные акценты, которые хорошо смотрятся на светлой карточке профиля. */
const ACCENT_PRESETS = [
  { value: '#3b82f6', label: 'Синий' },
  { value: '#0ea5e9', label: 'Небесный' },
  { value: '#10b981', label: 'Изумрудный' },
  { value: '#84cc16', label: 'Лаймовый' },
  { value: '#f59e0b', label: 'Янтарный' },
  { value: '#f97316', label: 'Оранжевый' },
  { value: '#ef4444', label: 'Красный' },
  { value: '#ec4899', label: 'Розовый' },
  { value: '#8b5cf6', label: 'Фиолетовый' },
  { value: '#64748b', label: 'Графитовый' },
]
const FALLBACK_COLORS = { color1: '#58a6ff', color2: '#c77dff' }

function splitFrame(value: string | null | undefined): {
  color1: string
  color2: string
  gradient: boolean
  enabled: boolean
} {
  const frame = normalizeFrame(value)
  if (!frame) {
    return { ...FALLBACK_COLORS, gradient: false, enabled: false }
  }
  const [color1, color2] = frame.split(',')
  return {
    color1,
    color2: color2 ?? FALLBACK_COLORS.color2,
    gradient: Boolean(color2),
    enabled: true,
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Формы «Акцентный цвет», «Рамка аватара» и «День рождения» для собственного профиля.
 * Каждая форма отправляет только своё поле (updateMine — патч), поэтому
 * они не затирают контакты и описание.
 */
export function ProfileExtrasForm({
  profile,
  onSaved,
}: {
  profile: Profile
  onSaved?: (value: Profile) => void
}) {
  const toast = useToast()
  const { refreshProfile } = useAuth()

  const initialFrame = splitFrame(profile.avatar_frame)
  const [color1, setColor1] = useState(initialFrame.color1)
  const [color2, setColor2] = useState(initialFrame.color2)
  const [gradient, setGradient] = useState(initialFrame.gradient)
  const [frameEnabled, setFrameEnabled] = useState(initialFrame.enabled)
  const [frameSaving, setFrameSaving] = useState(false)
  const [frameError, setFrameError] = useState('')

  const [accent, setAccent] = useState(normalizeAccent(profile.accent_color) ?? '')
  const [accentSaving, setAccentSaving] = useState(false)
  const [accentError, setAccentError] = useState('')

  const initialBirthday = /^(\d{2})-(\d{2})$/.exec(profile.birthday_md ?? '')
  const [month, setMonth] = useState(initialBirthday ? initialBirthday[1] : '')
  const [day, setDay] = useState(initialBirthday ? initialBirthday[2] : '')
  const [birthdaySaving, setBirthdaySaving] = useState(false)
  const [birthdayError, setBirthdayError] = useState('')

  const draftFrame = gradient ? `${color1},${color2}` : color1

  const saveAccent = async (event: FormEvent) => {
    event.preventDefault()
    setAccentError('')
    const value = accent || null
    const message = validateAccent(value)
    if (message) {
      setAccentError(message)
      return
    }
    setAccentSaving(true)
    try {
      const updated = await backend.profiles.updateMine({ accent_color: value })
      await refreshProfile()
      onSaved?.(updated)
      toast.success(value ? 'Акцентный цвет сохранён' : 'Акцентный цвет убран')
    } catch (err) {
      setAccentError((err as Error).message)
    } finally {
      setAccentSaving(false)
    }
  }

  const saveFrame = async (event: FormEvent) => {
    event.preventDefault()
    setFrameError('')
    const value = frameEnabled ? draftFrame : null
    const message = validateFrame(value)
    if (message) {
      setFrameError(message)
      return
    }
    setFrameSaving(true)
    try {
      const updated = await backend.profiles.updateMine({ avatar_frame: value })
      await refreshProfile()
      onSaved?.(updated)
      toast.success(value ? 'Рамка сохранена' : 'Рамка снята')
    } catch (err) {
      setFrameError((err as Error).message)
    } finally {
      setFrameSaving(false)
    }
  }

  const saveBirthday = async (event: FormEvent) => {
    event.preventDefault()
    setBirthdayError('')
    const value = month && day ? `${month}-${day}` : null
    const message = validateBirthday(value)
    if (message) {
      setBirthdayError(message)
      return
    }
    setBirthdaySaving(true)
    try {
      const updated = await backend.profiles.updateMine({ birthday_md: value })
      await refreshProfile()
      onSaved?.(updated)
      toast.success(value ? `День рождения: ${formatBirthday(value)}` : 'День рождения скрыт')
    } catch (err) {
      setBirthdayError((err as Error).message)
    } finally {
      setBirthdaySaving(false)
    }
  }

  const changeMonth = (value: string) => {
    setMonth(value)
    if (value && day && Number(day) > daysInMonth(Number(value))) {
      setDay('')
    }
  }

  const dayOptions = month
    ? Array.from({ length: daysInMonth(Number(month)) }, (_, index) => index + 1)
    : []

  return (
    <>
      <form className="profile-form" onSubmit={saveAccent}>
        <div>
          <span className="eyebrow">Оформление</span>
          <h2>Акцентный цвет</h2>
          <p className="muted">
            Цветная полоса в карточке профиля. Акцент виден вам, одногруппникам и всем, кто
            открывает профиль. На журнал и оценки он не влияет.
          </p>
        </div>

        <div
          className={`accent-preview${accent ? '' : ' accent-preview--none'}`}
          style={accentStyle(accent)}
        >
          <span className="accent-preview__bar" />
          <span className="accent-preview__label">
            {accent ? 'Так выглядит верх карточки' : 'Акцент не выбран — оформление по умолчанию'}
          </span>
        </div>

        <div className="frame-swatches" role="group" aria-label="Акцентные цвета">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="frame-swatch"
              style={{ background: preset.value }}
              aria-label={preset.label}
              title={preset.label}
              aria-pressed={accent.toLowerCase() === preset.value}
              onClick={() => setAccent(preset.value)}
            />
          ))}
          <button
            type="button"
            className="frame-swatch frame-swatch--none"
            aria-label="Без акцента"
            title="Без акцента"
            aria-pressed={!accent}
            onClick={() => setAccent('')}
          >
            ✕
          </button>
        </div>

        {accentError ? <ErrorBox>{accentError}</ErrorBox> : null}

        <div className="profile-form__actions">
          <button type="submit" className="btn btn--primary" disabled={accentSaving}>
            {accentSaving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Сохранить акцент
          </button>
        </div>
      </form>

      <form className="profile-form" onSubmit={saveFrame}>
        <div>
          <span className="eyebrow">Оформление</span>
          <h2>Рамка аватара</h2>
          <p className="muted">
            Один цвет или градиент из двух. Рамка видна в журнале, списках группы, профилях и
            шапке.
          </p>
        </div>

        <div className="frame-editor">
          <div className="frame-editor__preview">
            <Avatar
              profile={{ ...profile, avatar_frame: frameEnabled ? draftFrame : null }}
              size="lg"
            />
          </div>

          <div className="frame-editor__controls">
            <div className="frame-editor__colors">
              <label className="color-well">
                <input
                  type="color"
                  value={color1}
                  onChange={(event) => {
                    setColor1(event.target.value)
                    setFrameEnabled(true)
                  }}
                />
                <span>Цвет 1</span>
              </label>
              <label className="color-well">
                <input
                  type="color"
                  value={color2}
                  disabled={!gradient}
                  onChange={(event) => {
                    setColor2(event.target.value)
                    setFrameEnabled(true)
                  }}
                />
                <span>Цвет 2</span>
              </label>
              <label className="frame-check">
                <input
                  type="checkbox"
                  checked={gradient}
                  onChange={(event) => {
                    setGradient(event.target.checked)
                    setFrameEnabled(true)
                  }}
                />
                Градиент
              </label>
            </div>

            <div className="frame-swatches">
              {FRAME_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="frame-swatch"
                  style={{ background: color }}
                  aria-label={`Цвет ${color}`}
                  aria-pressed={frameEnabled && color1.toLowerCase() === color}
                  onClick={() => {
                    setColor1(color)
                    setFrameEnabled(true)
                  }}
                />
              ))}
              <button
                type="button"
                className="frame-swatch frame-swatch--none"
                aria-label="Без рамки"
                aria-pressed={!frameEnabled}
                onClick={() => setFrameEnabled(false)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {frameError ? <ErrorBox>{frameError}</ErrorBox> : null}

        <div className="profile-form__actions">
          <button type="submit" className="btn btn--primary" disabled={frameSaving}>
            {frameSaving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Сохранить рамку
          </button>
        </div>
      </form>

      <form className="profile-form" onSubmit={saveBirthday}>
        <div>
          <span className="eyebrow">О вас</span>
          <h2>День рождения</h2>
          <p className="muted">
            Только день и месяц: год не хранится и нигде не показывается. В сам день рождения
            дневник украсится лично для вас.
          </p>
        </div>

        <div className="form-row form-row--two">
          <label className="field">
            <span>Месяц</span>
            <select value={month} onChange={(event) => changeMonth(event.target.value)}>
              <option value="">Не указывать</option>
              {MONTHS_NOM.map((name, index) => (
                <option key={name} value={pad2(index + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>День</span>
            <select
              value={day}
              disabled={!month}
              onChange={(event) => setDay(event.target.value)}
            >
              <option value="">{month ? '—' : 'сначала месяц'}</option>
              {dayOptions.map((value) => (
                <option key={value} value={pad2(value)}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <small className="field__hint">
          {profile.birthday_md ? (
            <>
              Сейчас в профилях отображается «{formatBirthday(profile.birthday_md)}».
            </>
          ) : (
            <>Например: «3 ноября» — так дата выглядит в профилях.</>
          )}
        </small>

        {birthdayError ? <ErrorBox>{birthdayError}</ErrorBox> : null}

        <div className="profile-form__actions">
          <button type="submit" className="btn btn--primary" disabled={birthdaySaving}>
            {birthdaySaving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Сохранить дату
          </button>
        </div>
      </form>
    </>
  )
}
