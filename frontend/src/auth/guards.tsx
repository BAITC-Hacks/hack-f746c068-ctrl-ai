import type { ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Role } from './session'

// Пускает только авторизованных; при необходимости — только нужную роль
export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (role && session.role !== role) return <Navigate to={homePath(session.role, session.employeeId)} replace />
  return <>{children}</>
}

// Сотрудник видит только свой профиль и историю
export function RequireOwnProfile({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { id } = useParams()
  if (session && session.role === 'employee' && session.employeeId !== id) {
    return <Navigate to={homePath('employee', session.employeeId)} replace />
  }
  return <>{children}</>
}

export function homePath(role: Role, employeeId: string | null) {
  return role === 'hr' ? '/' : `/employee/${employeeId}`
}
