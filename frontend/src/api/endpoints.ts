import type { EmployeeShort, HistoryItem, HrStats, Profile, ProgressResult, Recommendation } from '../types'
import { request } from './client'

export const api = {
  getEmployees: () => request<EmployeeShort[]>('/employees'),
  getProfile: (id: string) => request<Profile>(`/employees/${id}/profile`),
  getRecommendations: (id: string) => request<Recommendation[]>(`/employees/${id}/recommendations`),
  getHistory: (id: string) => request<HistoryItem[]>(`/employees/${id}/history`),
  completeActivity: (id: string, aid: string) =>
    request<ProgressResult>(`/employees/${id}/activities/${aid}/complete`, { method: 'POST' }),
  skipActivity: (id: string, aid: string) =>
    request<{ ok: boolean }>(`/employees/${id}/activities/${aid}/skip`, { method: 'POST' }),
  declineActivity: (id: string, aid: string) =>
    request<{ ok: boolean }>(`/employees/${id}/activities/${aid}/decline`, { method: 'POST' }),
  getHrStats: () => request<HrStats>('/hr/stats'),
}
