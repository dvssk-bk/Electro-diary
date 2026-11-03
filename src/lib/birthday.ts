/**
 * День рождения без года: в профиле хранится только `MM-DD`
 * (см. profiles.birthday_md), поэтому возраст не считается и год не показывается.
 */

export const MONTHS_NOM = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
] as const

export const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const

/** Разрешённые дни месяца: в феврале до 29, чтобы 29 февраля не отбрасывался. */
export function daysInMonth(month: number): number {
  const table = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return table[month - 1] ?? 0
}

/** `11-03` → `3 ноября`; неверное значение → `null`. */
export function formatBirthday(value: string | null | undefined): string | null {
  if (!value) return null
  const match = /^(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month)) return null
  return `${day} ${MONTHS_GEN[month - 1]}`
}

/** Совпадает ли `MM-DD` с сегодняшней датой (время берётся локальное). */
export function isBirthdayToday(
  value: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!value) return false
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return value === `${month}-${day}`
}

/** «Тестовый Тест Тестович» → «Тест» — для поздравления по имени. */
export function firstNameOf(fullName: string): string {
  return fullName.split(/\s+/).filter(Boolean)[0] ?? ''
}
