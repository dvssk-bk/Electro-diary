export interface NameParts {
  surname: string
  name: string
  patronymic: string
}

const NAME_RE = /^[А-Яа-яЁёA-Za-z\s-]+$/

/** Приводит ФИО к виду «Фамилия Имя Отчество» с одиночными пробелами. */
export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** Проверяет ФИО по тем же правилам, что и регистрация. */
export function validateFullName(value: string): string | null {
  const name = normalizeFullName(value)
  if (name.length < 5 || name.length > 150) {
    return 'Укажите ФИО полностью (от 5 до 150 символов)'
  }
  if (!NAME_RE.test(name)) {
    return 'В ФИО допускаются только буквы, пробелы и дефис'
  }
  if (name.split(' ').length < 2) {
    return 'Укажите фамилию и имя полностью'
  }
  return null
}

/**
 * Разбирает ФИО, хранящееся в формате «Фамилия Имя Отчество».
 * Если частей меньше двух, всё считается фамилией.
 */
export function splitName(fullName: string): NameParts {
  const parts = normalizeFullName(fullName).split(' ').filter(Boolean)
  if (parts.length <= 1) {
    return { surname: parts[0] ?? '', name: '', patronymic: '' }
  }
  return {
    surname: parts[0],
    name: parts[1] ?? '',
    patronymic: parts.slice(2).join(' '),
  }
}

/** Собирает ФИО из частей, пропуская пустые. */
export function joinName(parts: NameParts): string {
  return [parts.surname, parts.name, parts.patronymic]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

/** Главная строка для списков: «Фамилия Имя». */
export function primaryName(fullName: string): string {
  const { surname, name } = splitName(fullName)
  return [surname, name].filter(Boolean).join(' ') || fullName.trim()
}
