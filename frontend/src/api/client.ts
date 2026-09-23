export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

import { getSession, setSession } from '../auth/session'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function createIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi) throw new ApiError(0, 'Браузер не поддерживает безопасную генерацию UUID')
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Запасной путь для мок-режима: если Service Worker не управляет страницей
// (жёсткая перезагрузка Ctrl+F5, «Bypass for network» в DevTools, браузер без SW),
// прогоняем запрос через те же MSW-обработчики прямо в странице.
async function mockFetch(url: string, init?: RequestInit): Promise<Response> {
  const [{ getResponse }, { handlers }] = await Promise.all([import('msw'), import('./mock/handlers')])
  const res = await getResponse(handlers, new Request(url, init))
  return res ?? new Response(JSON.stringify({ detail: `Нет мок-обработчика для ${url}` }), { status: 404 })
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`
  const token = getSession()?.token
  const headers = new Headers(init?.headers)
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  if (init?.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const opts: RequestInit = {
    ...init,
    headers,
  }
  const swActive = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller

  let res: Response
  if (USE_MOCK && !swActive) {
    res = await mockFetch(url, opts)
  } else {
    try {
      res = await fetch(url, opts)
    } catch {
      // В мок-режиме запрос мог пройти мимо Service Worker — отвечаем моками прямо в странице
      if (USE_MOCK) res = await mockFetch(url, opts)
      else throw new ApiError(0, `Бэкенд недоступен по адресу ${API_URL}. Запущен ли FastAPI? Для демо без бэкенда поставьте VITE_USE_MOCK=true.`)
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: unknown; message?: unknown }
    // Токен недействителен — сбрасываем сессию, охрана маршрутов отправит на /login
    if (res.status === 401 && token && !path.startsWith('/auth/')) setSession(null)
    const nestedDetail = typeof body.detail === 'object' && body.detail !== null && 'message' in body.detail
      ? body.detail.message : undefined
    const message = typeof body.message === 'string' ? body.message
      : typeof body.detail === 'string' ? body.detail
        : typeof nestedDetail === 'string' ? nestedDetail : `Ошибка ${res.status}`
    throw new ApiError(res.status, message)
  }
  try {
    return await res.json() as T
  } catch {
    // Для мутаций это неизвестный исход: сервер мог уже зафиксировать действие,
    // а тело ответа оборвалось. ApiError(0) заставит retry сохранить тот же UUID.
    throw new ApiError(0, 'Не удалось полностью прочитать ответ сервера')
  }
}
