import { delay, http, HttpResponse } from 'msw'
import * as engine from './engine'
import { API_URL } from '../client'

// Перехватываем ровно те же URL, что будет обслуживать FastAPI
const url = (path: string) => `${API_URL}${path}`
const notFound = () => HttpResponse.json({ detail: 'Not found' }, { status: 404 })

export const handlers = [
  http.get(url('/employees'), async () => {
    await delay(300)
    return HttpResponse.json(engine.listEmployees())
  }),

  http.get(url('/employees/:id/profile'), async ({ params }) => {
    await delay(350)
    const p = engine.getProfile(params.id as string)
    return p ? HttpResponse.json(p) : notFound()
  }),

  http.get(url('/employees/:id/recommendations'), async ({ params }) => {
    await delay(700) // имитируем работу scoring + LLM
    return HttpResponse.json(engine.getRecommendations(params.id as string))
  }),

  http.get(url('/employees/:id/history'), async ({ params }) => {
    await delay(250)
    return HttpResponse.json(engine.getHistory(params.id as string))
  }),

  http.post(url('/employees/:id/activities/:aid/complete'), async ({ params }) => {
    await delay(600)
    const r = engine.completeActivity(params.id as string, params.aid as string)
    return r ? HttpResponse.json(r) : notFound()
  }),

  http.post(url('/employees/:id/activities/:aid/:action'), async ({ params }) => {
    await delay(300)
    const action = params.action as string
    if (action !== 'skip' && action !== 'decline') return notFound()
    const ok = engine.rejectActivity(params.id as string, params.aid as string, action === 'skip' ? 'skipped' : 'declined')
    return ok ? HttpResponse.json({ ok: true }) : notFound()
  }),

  http.get(url('/hr/stats'), async () => {
    await delay(400)
    return HttpResponse.json(engine.getHrStats())
  }),
]
