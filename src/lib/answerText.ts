/** Максимальная длина короткого текстового ответа к заданию. */
export const ANSWER_TEXT_LIMIT = 150

/**
 * Приводит ответ к виду, который хранится в базе: обрезает пробелы по краям,
 * а пустую строку превращает в null.
 */
export function normalizeAnswerText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

/** Возвращает текст ошибки или null, если ответ корректен. */
export function validateAnswerText(value: string | null | undefined): string | null {
  const text = normalizeAnswerText(value)
  if (text && text.length > ANSWER_TEXT_LIMIT) {
    return `Текст ответа должен быть не длиннее ${ANSWER_TEXT_LIMIT} символов`
  }
  return null
}
