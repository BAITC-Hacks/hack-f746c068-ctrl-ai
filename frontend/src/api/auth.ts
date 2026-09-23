import type { Role, Session } from '../auth/session'
import { ApiError, request } from './client'

// Ответ бэкенда GET /auth/me (backend/api/app.py → Identity)
interface Identity { account_id: string; role: Role; employee_id: string | null }
interface EmployeeIdentityProfile { employee: { name: string } }
// Ответ мок-эндпоинтов /auth/login и /auth/register
interface AuthResponse extends Identity { token: string; name: string; email: string }

export interface DirectoryItem { id: string; name: string; role: string; department: string }

const toSession = (r: AuthResponse): Session => ({
  token: r.token, accountId: r.account_id, role: r.role, employeeId: r.employee_id, name: r.name, email: r.email,
})

export const authApi = {
  login: async (email: string, password: string) =>
    toSession(await request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })),

  register: async (data: { name: string; email: string; password: string; role: Role; employee_id?: string }) =>
    toSession(await request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) })),

  directory: () => request<DirectoryItem[]>('/auth/directory'),

  // Вход по токену доступа — так работает текущий FastAPI (токены в backend/runtime/access.json)
  loginWithToken: async (token: string): Promise<Session> => {
    const headers = { Authorization: `Bearer ${token}` }
    const r = await request<Identity>('/auth/me', { headers })
    if (!r?.role) throw new ApiError(401, 'Недействительный токен')
    const name = r.role === 'hr' || !r.employee_id
      ? 'HR-менеджер'
      : (await request<EmployeeIdentityProfile>(`/employees/${encodeURIComponent(r.employee_id)}`, { headers })).employee.name
    return { token, accountId: r.account_id, role: r.role, employeeId: r.employee_id, name }
  },
}
