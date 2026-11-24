export type StickerTone = 'positive' | 'negative'

export interface StickerOption {
  emoji: string
  tone: StickerTone
  label: string
  hint: string
}

/**
 * Набор реакций преподавателя на сдачу. Первая группа — поддержка и похвала,
 * вторая — мягкие негативные реакции. Порядок фиксирован: по нему строится
 * панель в окне проверки и в песочнице реакций.
 */
export const STICKER_OPTIONS: StickerOption[] = [
  { emoji: '👍', tone: 'positive', label: 'Класс', hint: 'Хорошая работа' },
  { emoji: '🔥', tone: 'positive', label: 'Огонь', hint: 'Очень сильно' },
  { emoji: '📚', tone: 'positive', label: 'Старание', hint: 'Видно подготовку' },
  { emoji: '🎯', tone: 'positive', label: 'В точку', hint: 'Задание раскрыто' },
  { emoji: '💡', tone: 'positive', label: 'Идея', hint: 'Интересное решение' },
  { emoji: '✅', tone: 'positive', label: 'Принято', hint: 'Всё в порядке' },
  { emoji: '😄', tone: 'positive', label: 'Бодро', hint: 'Приятно читать' },
  { emoji: '🤔', tone: 'positive', label: 'Вопрос', hint: 'Есть что обсудить' },
  { emoji: '💩', tone: 'negative', label: 'Слабо', hint: 'Работа так себе' },
  { emoji: '👎', tone: 'negative', label: 'Не очень', hint: 'Не дотянуто' },
  { emoji: '🤢', tone: 'negative', label: 'Фу', hint: 'Совсем не то' },
]

const NEGATIVE = new Set(
  STICKER_OPTIONS.filter((option) => option.tone === 'negative').map((option) => option.emoji),
)

export function stickerTone(emoji: string): StickerTone {
  return NEGATIVE.has(emoji) ? 'negative' : 'positive'
}

export function stickerLabel(emoji: string): string {
  return STICKER_OPTIONS.find((option) => option.emoji === emoji)?.label ?? 'Реакция'
}
