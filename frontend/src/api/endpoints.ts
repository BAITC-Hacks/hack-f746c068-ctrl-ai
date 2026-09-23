import type {
  ActivityComparison, ActivitySimulation, DecisionRecommendations, EmployeeShort, HistoryItem, HrStats,
  Profile, ProgressResult, Recommendation,
} from '../types'
import { request } from './client'

export const api = {
  getEmployees: () => request<EmployeeShort[]>('/employees'),
  getProfile: (id: string) => request<Profile>(`/employees/${id}/profile`),
  getRecommendations: (id: string) => request<Recommendation[]>(`/employees/${id}/recommendations`),
  getComparisonOptions: (id: string) =>
    request<DecisionRecommendations>(`/employees/${encodeURIComponent(id)}/comparison-options`),
  simulateActivity: (id: string, eventId: string) =>
    request<ActivitySimulation>(`/employees/${encodeURIComponent(id)}/simulate/${encodeURIComponent(eventId)}`),
  compareActivities: (id: string, firstEventId: string, secondEventId: string) =>
    request<ActivityComparison>(
      `/employees/${encodeURIComponent(id)}/compare?first_event_id=${encodeURIComponent(firstEventId)}&second_event_id=${encodeURIComponent(secondEventId)}`,
    ),
  getHistory: (id: string) => request<HistoryItem[]>(`/employees/${id}/history`),
  completeActivity: (id: string, aid: string) =>
    request<ProgressResult>(`/employees/${id}/activities/${aid}/complete`, { method: 'POST' }),
  skipActivity: (id: string, aid: string) =>
    request<{ ok: boolean }>(`/employees/${id}/activities/${aid}/skip`, { method: 'POST' }),
  declineActivity: (id: string, aid: string) =>
    request<{ ok: boolean }>(`/employees/${id}/activities/${aid}/decline`, { method: 'POST' }),
  getHrStats: () => request<HrStats>('/hr/stats'),
}
