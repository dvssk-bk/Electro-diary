import type { CSSProperties } from 'react'
import type { ProfileInput } from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+()\-\s]{5,30}$/
/** `MM-DD` — без года: 01-01 … 12-31. Допустимость дня месяца проверяем отдельно. */
const BIRTHDAY_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
/** `#RRGGBB` или `#RRGGBB,#RRGGBB` — градиент из двух цветов. */
const FRAME_RE = /^#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?$/

/**
 * Градиенты оформления профиля. Один каталог используется и для фона
 * карточки, и для обложки: так проще добавлять новые варианты.
 */
export const PROFILE_GRADIENTS = [
  {
    value: 'sunset',
    label: 'Закат',
    css: 'linear-gradient(135deg, #ffe7d6 0%, #ffdce8 52%, #ece0ff 100%)',
  },
  {
    value: 'mint',
    label: 'Мята',
    css: 'linear-gradient(135deg, #d9f7e6 0%, #d0f2ef 55%, #ddf5ff 100%)',
  },
  {
    value: 'lavender',
    label: 'Лаванда',
    css: 'linear-gradient(135deg, #e9e0ff 0%, #f5e1fc 55%, #ffe8f5 100%)',
  },
  {
    value: 'sky',
    label: 'Небо',
    css: 'linear-gradient(135deg, #dceeff 0%, #e6f7ff 55%, #e2faf4 100%)',
  },
  {
    value: 'peach',
    label: 'Персик',
    css: 'linear-gradient(135deg, #ffe8cf 0%, #fff3da 55%, #ffebe4 100%)',
  },
  {
    value: 'ocean',
    label: 'Океан',
    css: 'linear-gradient(135deg, #d6f2ff 0%, #c9f7ef 55%, #d7fbef 100%)',
  },
  {
    value: 'forest',
    label: 'Лес',
    css: 'linear-gradient(135deg, #ddf4d9 0%, #d4f2e2 55%, #e7f8dc 100%)',
  },
  {
    value: 'candy',
    label: 'Карамель',
    css: 'linear-gradient(135deg, #ffe0ee 0%, #ffe8f8 55%, #f3e5ff 100%)',
  },
  {
    value: 'sand',
    label: 'Песок',
    css: 'linear-gradient(135deg, #f6ead3 0%, #fdf3df 55%, #f8e8da 100%)',
  },
  {
    value: 'graphite',
    label: 'Графит',
    css: 'linear-gradient(135deg, #445466 0%, #2f3d4d 55%, #53667a 100%)',
  },
  {
    value: 'night',
    label: 'Ночь',
    css: 'linear-gradient(135deg, #2b3a63 0%, #3d2f66 55%, #1f2c49 100%)',
  },
  {
    value: 'berry',
    label: 'Вишня',
    css: 'linear-gradient(135deg, #5f2749 0%, #7d2f59 55%, #4d2140 100%)',
  },
] as const

export type CardPattern = (typeof PROFILE_GRADIENTS)[number]['value']

export const CARD_PATTERNS = PROFILE_GRADIENTS.map((item) => item.value)

export const PROFILE_LIMITS = {
  email: 150,
  phone: 30,
  bio: 1000,
  emoji: 16,
} as const

export const PASSWORD_LIMITS = {
  min: 8,
  max: 72,
} as const

/** Длиннейший день месяца без привязки к году: в феврале 29 — 29 февраля существует. */
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_LIMITS.min) {
    return `Пароль должен содержать минимум ${PASSWORD_LIMITS.min} символов`
  }
  if (password.length > PASSWORD_LIMITS.max) {
    return `Пароль должен быть не длиннее ${PASSWORD_LIMITS.max} символов`
  }
  return null
}

/** Нормализует значение рамки: пустая строка → `null`. */
export function normalizeFrame(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? ''
  if (!trimmed) return null
  const [first, second] = trimmed.split(',')
  if (second) return `${first},${second}`
  return trimmed
}

/** Нормализует акцентный цвет: пустая строка → `null`, одиночный цвет или градиент. */
export function normalizeAccent(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? ''
  if (!trimmed) return null
  const [first, second] = trimmed.split(',')
  if (second) return `${first},${second}`
  return trimmed
}

/** CSS-цвет или градиент акцента; некорректное значение отбрасываем. */
export function accentToCss(accent: string | null | undefined): string | null {
  const value = normalizeAccent(accent)
  if (!value || !FRAME_RE.test(value)) return null
  const [first, second] = value.split(',')
  return second ? `linear-gradient(135deg, ${first}, ${second})` : first
}

/**
 * Инлайн-стиль с CSS-переменной `--profile-accent` для карточки профиля.
 * Если акцент не задан, возвращаем `undefined` — остаётся оформление по умолчанию.
 */
export function accentStyle(accent: string | null | undefined): CSSProperties | undefined {
  const value = accentToCss(accent)
  return value ? ({ '--profile-accent': value } as CSSProperties) : undefined
}

export function validateAccent(accent: string | null | undefined): string | null {
  const value = normalizeAccent(accent)
  if (!value) return null
  if (!FRAME_RE.test(value)) return 'Акцентный цвет задан некорректно'
  return null
}

/** Ищет градиент по значению; неизвестное/устаревшее значение → `undefined`. */
function findGradient(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase() ?? ''
  if (!trimmed) return undefined
  return PROFILE_GRADIENTS.find((item) => item.value === trimmed)
}

/**
 * Средняя яркость градиента (0…1) по всем цветам, из которых он собран.
 * Нужна, чтобы автоматически выбрать тёмный или светлый текст.
 */
function averageLuminance(css: string): number {
  const hexes = css.match(/#[0-9a-fA-F]{6}/g) ?? []
  if (!hexes.length) return 1

  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  const total = hexes.reduce((sum, hex) => {
    const red = parseInt(hex.slice(1, 3), 16)
    const green = parseInt(hex.slice(3, 5), 16)
    const blue = parseInt(hex.slice(5, 7), 16)
    return sum + 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  }, 0)

  return total / hexes.length
}

/** CSS-переменные текста, подобранные под яркость градиента. */
function gradientTextStyle(css: string): CSSProperties {
  const darkBackground = averageLuminance(css) < 0.5
  return darkBackground
    ? ({
        '--profile-text': '#ffffff',
        '--profile-text-soft': '#dce7f2',
        '--profile-link': '#b9ddff',
        '--profile-line': 'rgba(255, 255, 255, 0.24)',
        '--profile-tabs-bg': 'rgba(255, 255, 255, 0.1)',
        '--profile-tab-hover-bg': 'rgba(255, 255, 255, 0.14)',
        '--profile-tab-active-bg': 'rgba(255, 255, 255, 0.2)',
        '--profile-surface': 'rgba(255, 255, 255, 0.12)',
        '--profile-surface-strong': 'rgba(255, 255, 255, 0.86)',
        '--profile-surface-active': 'rgba(255, 255, 255, 0.26)',
        '--profile-border': 'rgba(255, 255, 255, 0.3)',
        '--profile-focus': '#ffffff',
      } as CSSProperties)
    : ({
        '--profile-text': '#14253d',
        '--profile-text-soft': '#4f6072',
        '--profile-link': '#1f5d8f',
        '--profile-line': '#eee6d7',
        '--profile-tabs-bg': 'rgba(255, 253, 248, 0.7)',
        '--profile-tab-hover-bg': 'rgba(255, 255, 255, 0.85)',
        '--profile-tab-active-bg': '#fffdf8',
        '--profile-surface': 'rgba(255, 253, 248, 0.72)',
        '--profile-surface-strong': '#ffffff',
        '--profile-surface-active': '#fffdf8',
        '--profile-border': 'rgba(20, 37, 61, 0.16)',
        '--profile-focus': '#1e2d40',
      } as CSSProperties)
}

/** Нормализует фон карточки; пустое или устаревшее значение → `null`. */
export function normalizePattern(value: string | null | undefined): CardPattern | null {
  return findGradient(value)?.value ?? null
}

export function validatePattern(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (!normalizePattern(trimmed)) return 'Фон карточки задан некорректно'
  return null
}

/** Нормализует обложку профиля; пустое значение → `null`. */
export function normalizeCover(value: string | null | undefined): CardPattern | null {
  return findGradient(value)?.value ?? null
}

export function validateCover(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (!normalizeCover(trimmed)) return 'Обложка задана некорректно'
  return null
}

/**
 * CSS-переменные фона карточки и автоматического контраста текста.
 * Светлые градиенты получают тёмный текст, насыщенные и тёмные — светлый.
 */
export function patternStyle(pattern: string | null | undefined): CSSProperties | undefined {
  const gradient = findGradient(pattern)
  if (!gradient) return undefined
  return {
    '--profile-bg': gradient.css,
    ...gradientTextStyle(gradient.css),
  } as CSSProperties
}

/**
 * CSS-переменная обложки профиля: своя картинка важнее градиента.
 * Путь экранируем, чтобы кавычки в URL не ломали CSS.
 */
export function coverStyle(
  cover: string | null | undefined,
  imageUrl?: string | null,
): CSSProperties | undefined {
  if (imageUrl) {
    const safe = imageUrl.replace(/["\\]/g, '\\$&')
    return { '--profile-cover': `url("${safe}")` } as CSSProperties
  }
  const gradient = findGradient(cover)
  return gradient ? ({ '--profile-cover': gradient.css } as CSSProperties) : undefined
}

/** Общий стиль карточки: акцентная полоса и градиентный фон. */
export function profileCardStyle(
  accent: string | null | undefined,
  pattern: string | null | undefined,
): CSSProperties | undefined {
  const style = { ...(accentStyle(accent) ?? {}), ...(patternStyle(pattern) ?? {}) }
  return Object.keys(style).length ? style : undefined
}

/** Нормализует эмодзи-аватар; пустое значение → `null`. */
export function normalizeEmoji(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed || null
}

export function validateEmoji(value: string | null | undefined): string | null {
  const emoji = normalizeEmoji(value)
  if (!emoji) return null
  if (emoji.length > PROFILE_LIMITS.emoji) return 'Эмодзи слишком длинный'
  if (/[\u0000-\u001f\u007f]/.test(emoji)) return 'Эмодзи задан некорректно'
  return null
}

/** Нормализует день рождения `MM-DD`; пустое значение → `null`. */
export function normalizeBirthday(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  return trimmed
}

/**
 * CSS для рамки аватара: сплошной цвет или градиент.
 * Значение приходит из БД уже проверенным ограничением `profiles_avatar_frame_check`,
 * но на всякий случай отбрасываем всё, что не похоже на цвет.
 */
export function frameToCss(frame: string | null | undefined): string | null {
  const value = normalizeFrame(frame)
  if (!value || !FRAME_RE.test(value)) return null
  const [first, second] = value.split(',')
  return second ? `linear-gradient(135deg, ${first}, ${second})` : value
}

export function validateFrame(frame: string | null | undefined): string | null {
  const value = normalizeFrame(frame)
  if (!value) return null
  if (!FRAME_RE.test(value)) return 'Рамка задана некорректно'
  return null
}

export function validateBirthday(birthday: string | null | undefined): string | null {
  const value = normalizeBirthday(birthday)
  if (!value) return null
  if (!BIRTHDAY_RE.test(value)) return 'День рождения задан некорректно'
  const month = Number(value.slice(0, 2))
  const day = Number(value.slice(3, 5))
  if (day > MONTH_DAYS[month - 1]) {
    return 'В этом месяце такого дня нет'
  }
  return null
}

/** Нормализует переданные поля патча профиля. */
export function normalizeProfile(input: ProfileInput): ProfileInput {
  const value: ProfileInput = {}
  if (input.contact_email !== undefined) value.contact_email = input.contact_email?.trim() || null
  if (input.phone !== undefined) value.phone = input.phone?.trim() || null
  if (input.bio !== undefined) value.bio = input.bio?.trim() || null
  if (input.birthday_md !== undefined) value.birthday_md = normalizeBirthday(input.birthday_md)
  if (input.avatar_frame !== undefined) value.avatar_frame = normalizeFrame(input.avatar_frame)
  if (input.accent_color !== undefined) value.accent_color = normalizeAccent(input.accent_color)
  if (input.avatar_emoji !== undefined) value.avatar_emoji = normalizeEmoji(input.avatar_emoji)
  if (input.card_pattern !== undefined) value.card_pattern = normalizePattern(input.card_pattern)
  if (input.profile_cover !== undefined) value.profile_cover = normalizeCover(input.profile_cover)
  return value
}

/** Проверяет только те поля, которые есть в патче. */
export function validateProfile(input: ProfileInput): string | null {
  const value = normalizeProfile(input)

  if (value.contact_email !== undefined && value.contact_email) {
    if (value.contact_email.length > PROFILE_LIMITS.email) {
      return `Почта должна быть не длиннее ${PROFILE_LIMITS.email} символов`
    }
    if (!EMAIL_RE.test(value.contact_email)) {
      return 'Укажите корректный адрес почты'
    }
  }

  if (value.phone !== undefined && value.phone) {
    if (value.phone.length > PROFILE_LIMITS.phone) {
      return `Телефон должен быть не длиннее ${PROFILE_LIMITS.phone} символов`
    }
    if (!PHONE_RE.test(value.phone)) {
      return 'Телефон может содержать цифры, пробелы, скобки, «+» и дефис'
    }
  }

  if (value.bio !== undefined && value.bio && value.bio.length > PROFILE_LIMITS.bio) {
    return `Описание должно быть не длиннее ${PROFILE_LIMITS.bio} символов`
  }

  if (value.birthday_md !== undefined) {
    const birthdayError = validateBirthday(value.birthday_md)
    if (birthdayError) return birthdayError
  }

  if (value.avatar_frame !== undefined) {
    const frameError = validateFrame(value.avatar_frame)
    if (frameError) return frameError
  }

  if (value.accent_color !== undefined) {
    const accentError = validateAccent(value.accent_color)
    if (accentError) return accentError
  }

  if (value.avatar_emoji !== undefined) {
    const emojiError = validateEmoji(value.avatar_emoji)
    if (emojiError) return emojiError
  }

  if (value.card_pattern !== undefined) {
    const patternError = validatePattern(value.card_pattern)
    if (patternError) return patternError
  }

  if (value.profile_cover !== undefined) {
    const coverError = validateCover(value.profile_cover)
    if (coverError) return coverError
  }

  return null
}
