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
  normalizeEmoji,
  normalizeFrame,
  normalizePattern,
  patternStyle,
  validateAccent,
  validateBirthday,
  validateEmoji,
  validateFrame,
  validatePattern,
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
const ACCENT_FALLBACK = { color1: '#3b82f6', color2: '#8b5cf6' }

/** Градиентные фоны карточки: превью рисуется той же CSS-переменной, что и профиль. */
const PATTERN_PRESETS = [
  { value: '', label: 'Без фона' },
  { value: 'sunset', label: 'Закат' },
  { value: 'mint', label: 'Мята' },
  { value: 'lavender', label: 'Лаванда' },
  { value: 'sky', label: 'Небо' },
  { value: 'peach', label: 'Персик' },
]

/** Эмодзи для аватара, когда фото не загружено. */
const EMOJI_PRESETS = [
  '🦊', '🐼', '🐸', '🐱', '🐶', '🦉', '🐨', '🦁',
  '🐧', '🐢', '🌸', '⭐', '🚀', '🎓', '🎧', '⚽',
]

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

function splitAccent(value: string | null | undefined): {
  color1: string
  color2: string
  gradient: boolean
  enabled: boolean
} {
  const accent = normalizeAccent(value)
  if (!accent) {
    return { ...ACCENT_FALLBACK, gradient: false, enabled: false }
  }
  const [color1, color2] = accent.split(',')
  return {
    color1,
    color2: color2 ?? ACCENT_FALLBACK.color2,
    gradient: Boolean(color2),
    enabled: true,
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Формы «Акцентный цвет», «Фон карточки», «Эмодзи-аватар», «Рамка аватара»
 * и «День рождения». Каждая форма отправляет только своё поле
 * (updateMine — патч), поэтому они не затирают контакты и описание.
 *
 * `visibleSection` позволяет держать все формы смонтированными, но показывать
 * только выбранную вкладку: так не теряются несохранённые значения.
 */
export function ProfileExtrasForm({
  profile,
  onSaved,
  visibleSection,
}: {
  profile: Profile
  onSaved?: (value: Profile) => void
  visibleSection?: 'main' | 'appearance' | 'none'
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

  const initialAccent = splitAccent(profile.accent_color)
  const [accentColor1, setAccentColor1] = useState(initialAccent.color1)
  const [accentColor2, setAccentColor2] = useState(initialAccent.color2)
  const [accentGradient, setAccentGradient] = useState(initialAccent.gradient)
  const [accentEnabled, setAccentEnabled] = useState(initialAccent.enabled)
  const [accentSaving, setAccentSaving] = useState(false)
  const [accentError, setAccentError] = useState('')

  const [pattern, setPattern] = useState(normalizePattern(profile.card_pattern) ?? '')
  const [patternSaving, setPatternSaving] = useState(false)
  const [patternError, setPatternError] = useState('')

  const [avatarEmoji, setAvatarEmoji] = useState(normalizeEmoji(profile.avatar_emoji) ?? '')
  const [emojiSaving, setEmojiSaving] = useState(false)
  const [emojiError, setEmojiError] = useState('')

  const initialBirthday = /^(\d{2})-(\d{2})$/.exec(profile.birthday_md ?? '')
  const [month, setMonth] = useState(initialBirthday ? initialBirthday[1] : '')
  const [day, setDay] = useState(initialBirthday ? initialBirthday[2] : '')
  const [birthdaySaving, setBirthdaySaving] = useState(false)
  const [birthdayError, setBirthdayError] = useState('')

  const draftFrame = gradient ? `${color1},${color2}` : color1
  const draftAccent = accentGradient ? `${accentColor1},${accentColor2}` : accentColor1
  const showMain = visibleSection === undefined || visibleSection === 'main'
  const showAppearance = visibleSection === undefined || visibleSection === 'appearance'

  const saveAccent = async (event: FormEvent) => {
    event.preventDefault()
    setAccentError('')
    const value = accentEnabled ? draftAccent : null
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

  const savePattern = async (event: FormEvent) => {
    event.preventDefault()
    setPatternError('')
    const value = pattern || null
    const message = validatePattern(value)
    if (message) {
      setPatternError(message)
      return
    }
    setPatternSaving(true)
    try {
      const updated = await backend.profiles.updateMine({ card_pattern: value })
      await refreshProfile()
      onSaved?.(updated)
      toast.success(value ? 'Узор фона сохранён' : 'Узор фона убран')
    } catch (err) {
      setPatternError((err as Error).message)
    } finally {
      setPatternSaving(false)
    }
  }

  const saveEmoji = async (event: FormEvent) => {
    event.preventDefault()
    setEmojiError('')
    const value = avatarEmoji || null
    const message = validateEmoji(value)
    if (message) {
      setEmojiError(message)
      return
    }
    setEmojiSaving(true)
    try {
      const updated = await backend.profiles.updateMine({ avatar_emoji: value })
      await refreshProfile()
      onSaved?.(updated)
      toast.success(value ? 'Эмодзи-аватар сохранён' : 'Эмодзи-аватар убран')
    } catch (err) {
      setEmojiError((err as Error).message)
    } finally {
      setEmojiSaving(false)
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
      <form className="profile-form" onSubmit={saveAccent} hidden={!showAppearance}>
        <div>
          <span className="eyebrow">Оформление</span>
          <h2>Акцентный цвет</h2>
          <p className="muted">
            Цветная полоса в карточке профиля: один цвет или градиент из двух. Акцент виден
            вам, одногруппникам и всем, кто открывает профиль. На журнал и оценки он не влияет.
          </p>
        </div>

        <div
          className={`accent-preview${accentEnabled ? '' : ' accent-preview--none'}`}
          style={accentStyle(accentEnabled ? draftAccent : null)}
        >
          <span className="accent-preview__bar" />
          <span className="accent-preview__label">
            {accentEnabled
              ? 'Так выглядит верх карточки'
              : 'Акцент не выбран — оформление по умолчанию'}
          </span>
        </div>

        <div className="frame-editor__colors">
          <label className="color-well">
            <input
              type="color"
              value={accentColor1}
              onChange={(event) => {
                setAccentColor1(event.target.value)
                setAccentEnabled(true)
              }}
            />
            <span>Цвет 1</span>
          </label>
          <label className="color-well">
            <input
              type="color"
              value={accentColor2}
              disabled={!accentGradient}
              onChange={(event) => {
                setAccentColor2(event.target.value)
                setAccentEnabled(true)
              }}
            />
            <span>Цвет 2</span>
          </label>
          <label className="frame-check">
            <input
              type="checkbox"
              checked={accentGradient}
              onChange={(event) => {
                setAccentGradient(event.target.checked)
                setAccentEnabled(true)
              }}
            />
            Градиент
          </label>
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
              aria-pressed={accentEnabled && accentColor1.toLowerCase() === preset.value}
              onClick={() => {
                setAccentColor1(preset.value)
                setAccentEnabled(true)
              }}
            />
          ))}
          <button
            type="button"
            className="frame-swatch frame-swatch--none"
            aria-label="Без акцента"
            title="Без акцента"
            aria-pressed={!accentEnabled}
            onClick={() => setAccentEnabled(false)}
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

      <form className="profile-form" onSubmit={savePattern} hidden={!showAppearance}>
        <div>
          <span className="eyebrow">Оформление</span>
          <h2>Фон карточки</h2>
          <p className="muted">
            Мягкий градиент для карточки и панели профиля. Цвета подобраны светлыми, поэтому
            текст и контакты остаются читаемыми.
          </p>
        </div>

        <div className="pattern-grid" role="group" aria-label="Градиентный фон карточки">
          {PATTERN_PRESETS.map((preset) => (
            <button
              key={preset.value || 'none'}
              type="button"
              className="pattern-choice"
              style={patternStyle(preset.value)}
              aria-pressed={pattern === preset.value}
              onClick={() => setPattern(preset.value)}
            >
              <span
                className="pattern-choice__preview"
                aria-hidden="true"
                style={preset.value ? undefined : { backgroundImage: 'none' }}
              >
                Aa
              </span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {patternError ? <ErrorBox>{patternError}</ErrorBox> : null}

        <div className="profile-form__actions">
          <button type="submit" className="btn btn--primary" disabled={patternSaving}>
            {patternSaving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Сохранить фон
          </button>
        </div>
      </form>

      <form className="profile-form" onSubmit={saveEmoji} hidden={!showAppearance}>
        <div>
          <span className="eyebrow">Оформление</span>
          <h2>Эмодзи-аватар</h2>
          <p className="muted">
            Показывает эмодзи вместо инициалов, если фотография не загружена. Если фото есть,
            оно остаётся главным — эмодзи появится после его удаления.
          </p>
        </div>

        <div className="emoji-editor">
          <div className="frame-editor__preview">
            <Avatar
              profile={{
                ...profile,
                avatar_url: null,
                avatar_emoji: avatarEmoji || null,
              }}
              size="lg"
            />
          </div>

          <div className="frame-editor__controls">
            <div className="emoji-grid" role="group" aria-label="Эмодзи для аватара">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="emoji-choice"
                  aria-label={`Эмодзи ${emoji}`}
                  aria-pressed={avatarEmoji === emoji}
                  onClick={() => setAvatarEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                className="emoji-choice emoji-choice--none"
                aria-label="Без эмодзи"
                title="Без эмодзи"
                aria-pressed={!avatarEmoji}
                onClick={() => setAvatarEmoji('')}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {emojiError ? <ErrorBox>{emojiError}</ErrorBox> : null}

        <div className="profile-form__actions">
          <button type="submit" className="btn btn--primary" disabled={emojiSaving}>
            {emojiSaving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            Сохранить эмодзи
          </button>
        </div>
      </form>

      <form className="profile-form" onSubmit={saveFrame} hidden={!showAppearance}>
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

      <form className="profile-form" onSubmit={saveBirthday} hidden={!showMain}>
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
