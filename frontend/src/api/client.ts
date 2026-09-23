export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
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
  const opts: RequestInit = { headers: { 'Content-Type': 'application/json' }, ...init }
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
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.detail ?? `Ошибка ${res.status}`)
  }
  return res.json() as Promise<T>
}
