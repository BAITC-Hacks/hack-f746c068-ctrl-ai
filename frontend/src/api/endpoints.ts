import type {
  ActivityComparison,
  ActivitySimulation,
  DecisionRecommendations,
  EmployeeShort,
  HistoryItem,
  HrStats,
  Profile,
  ProgressResult,
  Recommendation,
} from '../types'
import {
  recommendationsFromProfile,
  toEmployeeShort,
  toHistory,
  toHrStats,
  toProfile,
  toProgress,
  type BackendCompletion,
  type BackendEmployeeSummary,
  type BackendEvent,
  type BackendHrDashboard,
  type BackendProfile,
} from './adapters'
import { ApiError, request, USE_MOCK } from './client'

const employeePath = (id: string) => `/employees/${encodeURIComponent(id)}`
const activityPath = (employeeId: string, eventId: string) =>
  `${employeePath(employeeId)}/activities/${encodeURIComponent(eventId)}`

const getBackendProfile = (id: string) => request<BackendProfile>(employeePath(id))
const getBackendEvents = () => request<BackendEvent[]>('/events')

async function mapConcurrent<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const result = new Array<R>(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++
      result[index] = await mapper(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return result
}

export const api = {
  getEmployees: async (): Promise<EmployeeShort[]> => {
    if (USE_MOCK) return request<EmployeeShort[]>('/employees')

    const employees = await request<BackendEmployeeSummary[]>('/employees')
    // Summary не содержит readiness/target grade. Дотягиваем агрегированный профиль
    // с ограниченной параллельностью, чтобы карточки не показывали выдуманные значения.
    return mapConcurrent(employees, 8, async (employee) =>
      toEmployeeShort(await getBackendProfile(employee.employee_id)))
  },

  getProfile: async (id: string): Promise<Profile> => {
    if (USE_MOCK) return request<Profile>(`${employeePath(id)}/profile`)
    return toProfile(await getBackendProfile(id))
  },

  getRecommendations: async (id: string): Promise<Recommendation[]> => {
    if (USE_MOCK) return request<Recommendation[]>(`${employeePath(id)}/recommendations`)
    const [recommendations, profile, events] = await Promise.all([
      request<DecisionRecommendations>(`${employeePath(id)}/recommendations`),
      getBackendProfile(id),
      getBackendEvents(),
    ])
    return recommendationsFromProfile(recommendations, profile, events)
  },

  getComparisonOptions: (id: string) =>
    request<DecisionRecommendations>(`${employeePath(id)}/comparison-options`),

  simulateActivity: (id: string, eventId: string) =>
    request<ActivitySimulation>(`${employeePath(id)}/simulate/${encodeURIComponent(eventId)}`),

  compareActivities: (id: string, firstEventId: string, secondEventId: string) =>
    request<ActivityComparison>(
      `${employeePath(id)}/compare?first_event_id=${encodeURIComponent(firstEventId)}&second_event_id=${encodeURIComponent(secondEventId)}`,
    ),

  getHistory: async (id: string): Promise<HistoryItem[]> => {
    if (USE_MOCK) return request<HistoryItem[]>(`${employeePath(id)}/history`)
    const [profile, events] = await Promise.all([getBackendProfile(id), getBackendEvents()])
    return toHistory(profile, events)
  },

  completeActivity: async (id: string, eventId: string, idempotencyKey: string): Promise<ProgressResult> => {
    const path = `${activityPath(id, eventId)}/complete`
    const init: RequestInit = { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } }
    if (USE_MOCK) return request<ProgressResult>(path, init)

    // Метаданные нужны для названий навыков и configured gain/max_level, которых
    // CompletionResponse намеренно не дублирует. Загружаем их до мутации.
    const [profile, events] = await Promise.all([getBackendProfile(id), getBackendEvents()])
    const completion = await request<BackendCompletion>(path, init)
    return toProgress(completion, profile, events)
  },

  skipActivity: (id: string, eventId: string) => {
    if (!USE_MOCK) throw new ApiError(405, 'FastAPI пока не поддерживает отметку «пропустить»')
    return request<{ ok: boolean }>(`${activityPath(id, eventId)}/skip`, { method: 'POST' })
  },

  declineActivity: (id: string, eventId: string) => {
    if (!USE_MOCK) throw new ApiError(405, 'FastAPI пока не поддерживает отметку «отказаться»')
    return request<{ ok: boolean }>(`${activityPath(id, eventId)}/decline`, { method: 'POST' })
  },

  getHrStats: async (): Promise<HrStats> => {
    if (USE_MOCK) return request<HrStats>('/hr/stats')
    return toHrStats(await request<BackendHrDashboard>('/hr/dashboard'))
  },
}
