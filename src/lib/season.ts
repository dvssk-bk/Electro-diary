/**
 * Сезонные украшения сайта.
 *
 * Снег: с 1 декабря по последний день февраля (28 или 29 — зависит от года).
 * Новогодняя гирлянда: с 26 декабря по 1 января включительно.
 *
 * Даты проверяются в конце года, поэтому «сезон» пересекает границу лета
 * по календарю, а не по году: 31 декабря — гирлянда, 1 января — гирлянда,
 * 2 февраля — только снег.
 */

/** Снег идёт с 1 декабря по конец февраля включительно. */
export function isSnowSeason(date: Date = new Date()): boolean {
  const month = date.getMonth() // 0 — январь, 11 — декабрь
  if (month === 11 || month === 0) return true
  if (month === 1) {
    // Последний день февраля: new Date(year, 2, 0) — это 28-е или 29-е.
    const lastDayOfFebruary = new Date(date.getFullYear(), 2, 0).getDate()
    return date.getDate() <= lastDayOfFebruary
  }
  return false
}

/** Новогодняя гирлянда: с 26 декабря по 1 января включительно. */
export function isNewYearSeason(date: Date = new Date()): boolean {
  const month = date.getMonth()
  const day = date.getDate()
  if (month === 11) return day >= 26
  if (month === 0) return day <= 1
  return false
}

export interface SeasonFlags {
  snow: boolean
  garland: boolean
}

/**
 * Режим украшений с учётом ручного превью через адрес:
 * ?season=snow | newyear | both | off
 *
 * Параметр ищется и в поисковой строке (/?season=both#/), и внутри хеша
 * (#/journal?season=both) — роутер использует HashRouter, поэтому оба
 * варианта встречаются на практике.
 *
 * Без параметра решает календарь. Нужен, чтобы посмотреть оформление
 * в любой день года (например, в ноябре).
 */
export function resolveSeason(href: string = window.location.href): SeasonFlags {
  const url = new URL(href)
  const fromHash = new URLSearchParams(url.hash.split('?')[1] ?? '').get('season')
  const override = url.searchParams.get('season') ?? fromHash
  if (override === 'snow') return { snow: true, garland: false }
  if (override === 'newyear') return { snow: false, garland: true }
  if (override === 'both') return { snow: true, garland: true }
  if (override === 'off') return { snow: false, garland: false }
  return { snow: isSnowSeason(), garland: isNewYearSeason() }
}
