import { useMutation } from '@tanstack/react-query'
import { request } from '../../api/client'
import type { DecisionRecommendations } from '../../types'
import { Badge, Button, Card, ErrorState } from '../ui'

interface AiResult extends DecisionRecommendations {
  source: 'gpt' | 'rules'
  selected_event_id: string | null
  selection_explanation: string
  fallback_reason: 'not_configured' | 'provider_unavailable' | 'invalid_response' | null
  considered_count: number
}

const fallbackMessage = {
  not_configured: 'GPT пока не настроен. Показан результат расчёта по навыкам и истории.',
  provider_unavailable: 'GPT сейчас недоступен. Показан результат расчёта по навыкам и истории.',
  invalid_response: 'Ответ GPT не прошёл проверку. Показан результат расчёта по навыкам и истории.',
}

export function AiRecommendation({ employeeId, disabled, onPreview, onComplete }: {
  employeeId: string
  disabled: boolean
  onPreview: (eventId: string) => void
  onComplete: (eventId: string) => void
}) {
  // This explicit action is the only place that initiates a paid provider request.
  const selection = useMutation({
    mutationFn: () => request<AiResult>(`/employees/${encodeURIComponent(employeeId)}/ai/recommendations`, { method: 'POST' }),
    retry: false,
  })
  const result = selection.data
  const selected = result?.recommendations.find((item) => item.event_id === result.selected_event_id)

  return (
    <Card className="mb-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Выбор карьерного шага с GPT</h3>
          <p className="mt-1 text-sm text-slate-600">Сравнить подходящие активности с учётом грейда, навыков и истории участия.</p>
        </div>
        <Button variant="ghost" onClick={() => selection.mutate()} loading={selection.isPending} disabled={disabled || selection.isPending}>
          {result ? 'Подобрать ещё раз' : 'Подобрать с GPT'}
        </Button>
      </div>
      {selection.error && <ErrorState error={selection.error} />}
      {result && (
        <div className="space-y-3 rounded-2xl bg-brand-500/[0.07] p-4 ring-1 ring-brand-500/15" aria-live="polite">
          <Badge tone={result.source === 'gpt' ? 'brand' : 'amber'}>
            {result.source === 'gpt' ? 'Выбрано GPT' : 'Расчёт по правилам'}
          </Badge>
          {result.fallback_reason && <p className="text-sm text-slate-600">{fallbackMessage[result.fallback_reason]}</p>}
          {selected && <h4 className="font-semibold text-slate-900">{selected.title}</h4>}
          <p className="text-sm leading-relaxed text-slate-700">{result.selection_explanation}</p>
          {selected && (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" disabled={disabled} onClick={() => onPreview(selected.event_id)}>Посмотреть прогноз</Button>
              <Button disabled={disabled} onClick={() => onComplete(selected.event_id)}>Выполнить этот шаг</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
