// Хранение сессии в браузере. Обёрнуто в try/catch: хранилище может быть недоступно
// (приватный режим, запрет cookies) — тогда сессия живёт только до перезагрузки.

export type Role = 'employee' | 'hr'

export interface Session {
  token: string
  accountId: string
  role: Role
  employeeId: string | null
  name: string
  email?: string
}

const KEY = 'cq_session'
let memory: Session | null = null

export function getSession(): Session | null {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(KEY)
    memory = raw ? (JSON.parse(raw) as Session) : null
  } catch {
    memory = null
  }
  return memory
}

export function setSession(s: Session | null) {
  memory = s
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* хранилище недоступно — остаёмся в памяти */
  }
  window.dispatchEvent(new Event('cq-session'))
}
