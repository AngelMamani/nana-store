export type OrderPeriodMode = "day" | "week" | "month"

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function startOfWeekMonday(date: Date) {
  const start = startOfLocalDay(date)
  const weekday = start.getDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  return addDays(start, offset)
}

export function periodRange(mode: OrderPeriodMode, anchor: Date) {
  const day = startOfLocalDay(anchor)
  if (mode === "day") return { start: day, end: addDays(day, 1) }
  if (mode === "week") {
    const start = startOfWeekMonday(day)
    return { start, end: addDays(start, 7) }
  }
  const start = new Date(day.getFullYear(), day.getMonth(), 1)
  return { start, end: new Date(day.getFullYear(), day.getMonth() + 1, 1) }
}

export function shiftPeriod(mode: OrderPeriodMode, anchor: Date, direction: -1 | 1) {
  const day = startOfLocalDay(anchor)
  if (mode === "day") return addDays(day, direction)
  if (mode === "week") return addDays(startOfWeekMonday(day), direction * 7)
  return new Date(day.getFullYear(), day.getMonth() + direction, 1)
}

export function isInPeriod(value: string | undefined, start: Date, end: Date) {
  if (!value) return false
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return false
  return time >= start.getTime() && time < end.getTime()
}

export function formatPeriodLabel(mode: OrderPeriodMode, anchor: Date, locale = "es-PE") {
  const { start, end } = periodRange(mode, anchor)
  if (mode === "day") {
    return start.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
  }
  if (mode === "week") {
    const last = addDays(end, -1)
    return `${start.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })} – ${last.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}`
  }
  return start.toLocaleDateString(locale, { month: "long", year: "numeric" })
}

export function periodHint(mode: OrderPeriodMode) {
  if (mode === "week") return "de la semana"
  if (mode === "month") return "del mes"
  return "del día"
}

export function msUntilNextLocalDay(now = new Date()) {
  return Math.max(1000, startOfLocalDay(addDays(now, 1)).getTime() - now.getTime())
}
