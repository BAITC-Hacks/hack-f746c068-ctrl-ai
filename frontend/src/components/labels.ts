import type { ActivityStatus, ActivityType } from '../types'

export const activityTypeLabel: Record<ActivityType, string> = {
  course: 'Курс',
  mentoring: 'Менторство',
  project: 'Проект',
  workshop: 'Воркшоп',
  certification: 'Сертификация',
  meetup: 'Митап',
  assessment: 'Оценка',
}

export const statusLabel: Record<ActivityStatus, string> = {
  invited: 'Приглашён',
  enrolled: 'Записан',
  completed: 'Выполнено',
  skipped: 'Пропущено',
  declined: 'Отклонено',
}

export const statusTone = {
  invited: 'slate',
  enrolled: 'brand',
  completed: 'green',
  skipped: 'amber',
  declined: 'rose',
} as const

export const MAX_LEVEL = 5

export function formatTenure(months: number) {
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y && `${y} г.`, m && `${m} мес.`].filter(Boolean).join(' ') || 'меньше месяца'
}
