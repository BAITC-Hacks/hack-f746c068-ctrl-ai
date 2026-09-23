import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/endpoints'
import { ApiError, createIdempotencyKey } from '../api/client'

export const qk = {
  employees: ['employees'] as const,
  profile: (id: string) => ['profile', id] as const,
  recs: (id: string) => ['recs', id] as const,
  comparisonOptions: (id: string) => ['comparison-options', id] as const,
  simulation: (id: string, eventId: string) => ['simulation', id, eventId] as const,
  comparison: (id: string, firstEventId: string, secondEventId: string) =>
    ['comparison', id, firstEventId, secondEventId] as const,
  history: (id: string) => ['history', id] as const,
  hr: ['hr'] as const,
}

export const useEmployees = () => useQuery({ queryKey: qk.employees, queryFn: api.getEmployees })
export const useProfile = (id: string) => useQuery({ queryKey: qk.profile(id), queryFn: () => api.getProfile(id) })
export const useRecommendations = (id: string) =>
  useQuery({ queryKey: qk.recs(id), queryFn: () => api.getRecommendations(id) })
export const useComparisonOptions = (id: string) =>
  useQuery({ queryKey: qk.comparisonOptions(id), queryFn: () => api.getComparisonOptions(id), enabled: Boolean(id) })
export const useActivitySimulation = (id: string, eventId: string) =>
  useQuery({
    queryKey: qk.simulation(id, eventId),
    queryFn: () => api.simulateActivity(id, eventId),
    enabled: Boolean(id && eventId),
  })
export const useActivityComparison = (id: string, firstEventId: string, secondEventId: string) =>
  useQuery({
    queryKey: qk.comparison(id, firstEventId, secondEventId),
    queryFn: () => api.compareActivities(id, firstEventId, secondEventId),
    enabled: Boolean(id && firstEventId && secondEventId && firstEventId !== secondEventId),
  })
export const useHistory = (id: string) => useQuery({ queryKey: qk.history(id), queryFn: () => api.getHistory(id) })
export const useHrStats = () => useQuery({ queryKey: qk.hr, queryFn: api.getHrStats })

// После любого действия с активностью пересчитываем всё, что от него зависит
function useInvalidateEmployee(id: string) {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.profile(id) }),
      qc.invalidateQueries({ queryKey: qk.recs(id) }),
      qc.invalidateQueries({ queryKey: qk.comparisonOptions(id) }),
      qc.invalidateQueries({ queryKey: ['simulation', id] }),
      qc.invalidateQueries({ queryKey: ['comparison', id] }),
      qc.invalidateQueries({ queryKey: qk.history(id) }),
      qc.invalidateQueries({ queryKey: qk.employees }),
      qc.invalidateQueries({ queryKey: qk.hr }),
    ])
}

export function useCompleteActivity(id: string) {
  const invalidate = useInvalidateEmployee(id)
  return useMutation({
    mutationFn: ({ aid, idempotencyKey }: { aid: string; idempotencyKey: string }) =>
      api.completeActivity(id, aid, idempotencyKey),
    onSuccess: invalidate,
    // React Query повторно передаёт те же variables, поэтому transport-retry
    // использует тот же UUID и не начисляет gain второй раз.
    retry: (failureCount, error) => failureCount < 1
      && error instanceof ApiError
      && (error.status === 0 || error.status >= 500),
  })
}

export const completeAttempt = (aid: string, idempotencyKey = createIdempotencyKey()) => ({ aid, idempotencyKey })

export function useRejectActivity(id: string) {
  const invalidate = useInvalidateEmployee(id)
  return useMutation({
    mutationFn: ({ aid, action }: { aid: string; action: 'skip' | 'decline' }) =>
      action === 'skip' ? api.skipActivity(id, aid) : api.declineActivity(id, aid),
    onSuccess: invalidate,
  })
}
