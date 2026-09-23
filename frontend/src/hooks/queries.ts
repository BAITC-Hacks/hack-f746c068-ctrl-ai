import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/endpoints'

export const qk = {
  employees: ['employees'] as const,
  profile: (id: string) => ['profile', id] as const,
  recs: (id: string) => ['recs', id] as const,
  history: (id: string) => ['history', id] as const,
  hr: ['hr'] as const,
}

export const useEmployees = () => useQuery({ queryKey: qk.employees, queryFn: api.getEmployees })
export const useProfile = (id: string) => useQuery({ queryKey: qk.profile(id), queryFn: () => api.getProfile(id) })
export const useRecommendations = (id: string) =>
  useQuery({ queryKey: qk.recs(id), queryFn: () => api.getRecommendations(id) })
export const useHistory = (id: string) => useQuery({ queryKey: qk.history(id), queryFn: () => api.getHistory(id) })
export const useHrStats = () => useQuery({ queryKey: qk.hr, queryFn: api.getHrStats })

// После любого действия с активностью пересчитываем всё, что от него зависит
function useInvalidateEmployee(id: string) {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.profile(id) }),
      qc.invalidateQueries({ queryKey: qk.recs(id) }),
      qc.invalidateQueries({ queryKey: qk.history(id) }),
      qc.invalidateQueries({ queryKey: qk.employees }),
      qc.invalidateQueries({ queryKey: qk.hr }),
    ])
}

export function useCompleteActivity(id: string) {
  const invalidate = useInvalidateEmployee(id)
  return useMutation({ mutationFn: (aid: string) => api.completeActivity(id, aid), onSuccess: invalidate })
}

export function useRejectActivity(id: string) {
  const invalidate = useInvalidateEmployee(id)
  return useMutation({
    mutationFn: ({ aid, action }: { aid: string; action: 'skip' | 'decline' }) =>
      action === 'skip' ? api.skipActivity(id, aid) : api.declineActivity(id, aid),
    onSuccess: invalidate,
  })
}
