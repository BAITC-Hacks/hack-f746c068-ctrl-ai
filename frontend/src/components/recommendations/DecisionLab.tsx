import { useState } from 'react'
import { USE_MOCK } from '../../api/client'
import { useActivityComparison, useActivitySimulation, useComparisonOptions } from '../../hooks/queries'
import type { Recommendation } from '../../types'
import { Badge, Card, ErrorState, ProgressBar, Skeleton } from '../ui'

interface Props {
  employeeId: string
  recommendations: Recommendation[]
  selectedEventId: string
  onSelectEvent: (eventId: string) => void
}

const percent = (value: number | null) => value === null ? '—' : `${Number(value.toFixed(1))}%`
const scoreLabel = (value: number) => USE_MOCK ? String(Math.round(value * 100)) : Number(value.toFixed(3)).toString()

export function DecisionLab({ employeeId, recommendations, selectedEventId, onSelectEvent }: Props) {
  const [alternativeId, setAlternativeId] = useState('')
  const firstId = recommendations.some((item) => item.activityId === selectedEventId)
    ? selectedEventId : recommendations[0]?.activityId ?? ''
  const options = useComparisonOptions(employeeId)
  const alternatives = (options.data?.recommendations ?? recommendations.map((item) => ({ event_id: item.activityId, title: item.title })))
    .filter((item) => item.event_id !== firstId)
  const secondId = alternatives.some((item) => item.event_id === alternativeId)
    ? alternativeId : alternatives[0]?.event_id ?? ''
  const preview = useActivitySimulation(employeeId, firstId)
  const comparison = useActivityComparison(employeeId, firstId, secondId)
  const firstCard = recommendations.find((item) => item.activityId === firstId)
  const secondCard = recommendations.find((item) => item.activityId === secondId)

  if (!firstId) return null

  const readinessBefore = preview.data?.readiness_before.readiness_percent ?? null
  const readinessAfter = preview.data?.readiness_after.readiness_percent ?? null
  const readinessDelta = readinessBefore !== null && readinessAfter !== null
    ? readinessAfter - readinessBefore : null

  return (
    <section id="decision-lab" aria-labelledby="decision-lab-title" className="scroll-mt-6">
      <Card className="border-brand-200 bg-gradient-to-br from-white via-white to-brand-50/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="decision-lab-title" className="text-lg font-semibold text-slate-900">Лаборатория выбора</h2>
            <p className="mt-1 text-sm text-slate-600">Что изменится после активности и почему она выше альтернативы.</p>
          </div>
          <Badge tone="green">Без изменения профиля</Badge>
        </div>
        {USE_MOCK && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Демо-режим: расчёт здесь использует те же локальные правила, что карточки рекомендаций и отметка выполнения.
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Активность для предпросмотра
            <select
              value={firstId}
              onChange={(event) => onSelectEvent(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {recommendations.map((item) => <option key={item.activityId} value={item.activityId}>{item.title}</option>)}
            </select>
          </label>
          {alternatives.length > 0 && (
            <label className="block text-sm font-medium text-slate-700">
              Сравнить с
              <select
                value={secondId}
                onChange={(event) => setAlternativeId(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {alternatives.map((item) => (
                  <option key={item.event_id} value={item.event_id}>{item.title}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {options.error && <p className="mt-2 text-xs text-amber-700">Полный список альтернатив недоступен; показаны только видимые рекомендации.</p>}

        <div className="mt-5 border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">Если выполнить «{firstCard?.title}»</h3>
          {preview.isLoading && <Skeleton className="mt-3 h-36" />}
          {preview.error && <div className="mt-3"><ErrorState error={preview.error} onRetry={() => { void preview.refetch() }} /></div>}
          {preview.data && (
            <div className="mt-3 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Готовность сейчас</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-800">{percent(readinessBefore)}</p>
                  <ProgressBar value={readinessBefore ?? 0} className="mt-2" />
                </div>
                <span className="hidden text-slate-400 sm:block">→</span>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">После активности</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">
                    {percent(readinessAfter)}
                    {readinessDelta !== null && <span className="ml-2 text-sm font-medium">(+{Number(readinessDelta.toFixed(1))} п.п.)</span>}
                  </p>
                  <ProgressBar value={readinessAfter ?? 0} tone="green" className="mt-2" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">Изменение навыков</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                    {preview.data.skill_changes.map((change) => (
                      <li key={change.skill_id}>
                        <span className="font-medium">{change.skill_id}</span>: {change.before} → <span className="font-semibold text-emerald-700">{change.after}</span>
                        <span className="ml-1 text-xs text-slate-500">(прирост +{change.applied_gain} из +{change.gain}; max_level {change.max_level})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">Траектория</p>
                  <p className="mt-2 text-sm text-slate-800">
                    Разрывов до: <b>{preview.data.gaps_before.skills_with_gap}</b> → после: <b>{preview.data.gaps_after.skills_with_gap}</b>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Следующие шаги: {preview.data.recommendations_after.recommendations.length
                      ? preview.data.recommendations_after.recommendations.map((item) => item.title).join('; ')
                      : 'нет подходящих активностей'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {secondId && (
          <div className="mt-5 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Почему одна активность выше другой?</h3>
            {comparison.isLoading && <Skeleton className="mt-3 h-40" />}
            {comparison.error && <div className="mt-3"><ErrorState error={comparison.error} onRetry={() => { void comparison.refetch() }} /></div>}
            {comparison.data && (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[comparison.data.first, comparison.data.second].map((item, index) => (
                    <div key={item.event_id} className={`rounded-xl border p-3 ${item.event_id === comparison.data?.preferred_event_id ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 bg-white'}`}>
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="text-xs text-slate-500">score {USE_MOCK ? 'из 100' : ''}</span>
                        <span className="text-xl font-semibold tabular-nums text-slate-900">{scoreLabel(item.score)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Готовность после: {percent(index === 0
                          ? comparison.data?.readiness_after_first.readiness_percent ?? null
                          : comparison.data?.readiness_after_second.readiness_percent ?? null)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{comparison.data.explanation}</p>
                {USE_MOCK && firstCard && secondCard ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-medium text-slate-600">Вклад факторов в score карточек (вес × значение)</p>
                    <table className="w-full text-left text-xs">
                      <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-1 pr-3 font-medium">Фактор</th><th className="py-1 pr-3 font-medium">Первая</th><th className="py-1 font-medium">Вторая</th></tr></thead>
                      <tbody>
                        {firstCard.factors.map((factor) => {
                          const other = secondCard.factors.find((item) => item.key === factor.key)
                          return <tr key={factor.key} className="border-b border-slate-100 last:border-0">
                            <td className="py-1.5 pr-3 text-slate-700">{factor.name}</td>
                            <td className="py-1.5 pr-3 tabular-nums text-slate-800">{(factor.weight * factor.value).toFixed(2)}</td>
                            <td className="py-1.5 tabular-nums text-slate-800">{other ? (other.weight * other.value).toFixed(2) : '—'}</td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : USE_MOCK ? (
                  <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs sm:grid-cols-2">
                    {[comparison.data.first, comparison.data.second].map((item) => (
                      <div key={item.event_id}>
                        <p className="font-medium text-slate-800">{item.title}</p>
                        {item.skill_impact.map((impact) => (
                          <p key={impact.skill_id} className="mt-1 text-slate-600">{impact.skill_id}: {impact.current}/{impact.required} → {impact.projected}/{impact.required} (разрыв −{impact.gap_reduction})</p>
                        ))}
                        <p className="text-slate-600">Участие: {item.participation.completed} завершено, {item.participation.skipped} пропущено, {item.participation.declined} отказов</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs sm:grid-cols-2">
                    {[comparison.data.first, comparison.data.second].map((item) => (
                      <div key={item.event_id}>
                        <p className="font-medium text-slate-800">{item.title}</p>
                        <p className="mt-1 text-slate-600">Сокращение разрыва: {item.grade_gap_benefit.toFixed(3)} × история: {item.history_multiplier.toFixed(2)}</p>
                        <p className="text-slate-600">Участие: {item.participation.completed} завершено, {item.participation.skipped} пропущено, {item.participation.declined} отказов</p>
                        {item.skill_impact.map((impact) => (
                          <p key={impact.skill_id} className="text-slate-600">{impact.skill_id}: {impact.current}/{impact.required} → {impact.projected}/{impact.required} (разрыв −{impact.gap_reduction})</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  )
}
