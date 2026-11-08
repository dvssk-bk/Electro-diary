import type { CSSProperties } from 'react'
import type { ProfileInput } from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+()\-\s]{5,30}$/
/** `MM-DD` — без года: 01-01 … 12-31. Допустимость дня месяца проверяем отдельно. */
const BIRTHDAY_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
/** `#RRGGBB` или `#RRGGBB,#RRGGBB` — градиент из двух цветов. */
const FRAME_RE = /^#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?$/
/** Один цвет `#RRGGBB` — акцент профиля. */
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

export const PROFILE_LIMITS = {
  email: 150,
  phone: 30,
  bio: 1000,
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

/** Нормализует акцентный цвет: пустая строка → `null`, цвет — в нижний регистр. */
export function normalizeAccent(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? ''
  return trimmed || null
}

/** CSS-цвет акцента; некорректное значение отбрасываем. */
export function accentToCss(accent: string | null | undefined): string | null {
  const value = normalizeAccent(accent)
  return value && COLOR_RE.test(value) ? value : null
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
  if (!COLOR_RE.test(value)) return 'Акцентный цвет задан некорректно'
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

  return null
}
