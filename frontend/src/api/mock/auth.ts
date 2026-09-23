// ============================================================
// Мок-авторизация: аккаунты, вход, регистрация, проверка токена.
// Аккаунты хранятся в localStorage, чтобы регистрация переживала перезагрузку.
// Только для демо — в реальном режиме всё это делает бэкенд.
// ============================================================
import type { Role } from '../../auth/session'

export interface MockAccount {
  accountId: string
  name: string
  email: string
  passwordHash: string
  role: Role
  employeeId: string | null
  tokens: string[]
}

const KEY = 'cq_mock_accounts'

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const hashPassword = (password: string) => sha256(`cq-demo:${password}`)

// Демо-аккаунты (пароль у обоих: demo1234)
const DEMO_HASH = 'pending'
const seed = (): MockAccount[] => [
  { accountId: 'hr', name: 'Жанар Ахметова', email: 'hr@careerquest.kz', passwordHash: DEMO_HASH, role: 'hr', employeeId: null, tokens: [] },
  { accountId: 'e1', name: 'Иван Петров', email: 'ivan.petrov@careerquest.kz', passwordHash: DEMO_HASH, role: 'employee', employeeId: 'e1', tokens: [] },
]

let cache: MockAccount[] | null = null

async function load(): Promise<MockAccount[]> {
  if (cache) return cache
  let list: MockAccount[] | null = null
  try {
    const raw = localStorage.getItem(KEY)
    list = raw ? JSON.parse(raw) : null
  } catch {
    list = null
  }
  if (!list) list = seed()
  const demo = await hashPassword('demo1234')
  list.forEach((a) => { if (a.passwordHash === DEMO_HASH) a.passwordHash = demo })
  cache = list
  save()
  return list
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* только в памяти */ }
}

const newToken = () => `cq_${crypto.randomUUID().replace(/-/g, '')}`

export const publicAccount = (a: MockAccount, token: string) => ({
  token, account_id: a.accountId, role: a.role, employee_id: a.employeeId, name: a.name, email: a.email,
})

export async function login(email: string, password: string) {
  const list = await load()
  const acc = list.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
  if (!acc || acc.passwordHash !== (await hashPassword(password))) return null
  const token = newToken()
  acc.tokens = [...acc.tokens.slice(-4), token]
  save()
  return publicAccount(acc, token)
}

export async function register(data: { name: string; email: string; password: string; role: Role; employee_id?: string }) {
  const list = await load()
  const email = data.email.trim().toLowerCase()
  if (list.some((a) => a.email.toLowerCase() === email)) return { error: 'Пользователь с такой почтой уже зарегистрирован' as const }
  if (data.role === 'employee' && !data.employee_id) return { error: 'Выберите свой профиль сотрудника' as const }
  const token = newToken()
  const acc: MockAccount = {
    accountId: `acc_${crypto.randomUUID().slice(0, 8)}`,
    name: data.name.trim(),
    email,
    passwordHash: await hashPassword(data.password),
    role: data.role,
    employeeId: data.role === 'employee' ? data.employee_id! : null,
    tokens: [token],
  }
  list.push(acc)
  save()
  return { account: publicAccount(acc, token) }
}

export async function accountByRequest(request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  const list = await load()
  return list.find((a) => a.tokens.includes(token)) ?? null
}
