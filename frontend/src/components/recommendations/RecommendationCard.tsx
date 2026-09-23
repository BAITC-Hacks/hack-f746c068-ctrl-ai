import { useState } from 'react'
import type { Recommendation } from '../../types'
import { activityTypeLabel } from '../labels'
import { Badge, Button, Card, cn } from '../ui'
import { ScoreBreakdown } from './ScoreBreakdown'

interface Props {
  rec: Recommendation
  rank: number
  busy: 'complete' | 'skip' | 'decline' | null
  disabled: boolean
  onComplete: () => void
  onSkip: () => void
  onDecline: () => void
}

export function RecommendationCard({ rec, rank, busy, disabled, onComplete, onSkip, onDecline }: Props) {
  const [open, setOpen] = useState(rank === 1)
  const after = Math.min(rec.currentLevel + rec.gain, rec.maxLevel)
  const capped = rec.currentLevel + rec.gain > rec.maxLevel

  return (
    <Card className={cn('animate-[fadein_.35s_ease-out]', rank === 1 && 'ring-2 ring-brand-500/30')}>
      <div className="flex gap-4">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold', rank === 1 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">{rec.title}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone="brand">{rec.skill}</Badge>
                <Badge>{activityTypeLabel[rec.type]}</Badge>
                <Badge>{rec.durationHours} ч</Badge>
              </div>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{Math.round(rec.score * 100)}</p>
              <p className="text-xs text-slate-500">score</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Навык</p>
              <p className="font-medium text-slate-800">
                {rec.currentLevel} → <span className="text-emerald-600">{after}</span>
                <span className="ml-1 text-xs font-normal text-slate-500">(+{rec.gain}{capped ? `, cap ${rec.maxLevel}` : ''})</span>
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">max_level</p>
              <p className="font-medium text-slate-800">{rec.maxLevel}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2 sm:col-span-1">
              <p className="text-xs text-slate-500">Готовность после</p>
              <p className="font-medium text-emerald-600">{rec.readinessAfter}%</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">Почему это подходит · AI</p>
            <p className="text-sm leading-relaxed text-slate-700">{rec.explanation}</p>
          </div>

          <button onClick={() => setOpen((v) => !v)} className="mt-3 text-sm font-medium text-brand-600 hover:underline">
            {open ? 'Скрыть расчёт score' : 'Как посчитан score?'}
          </button>
          {open && <div className="mt-3"><ScoreBreakdown factors={rec.factors} score={rec.score} /></div>}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onComplete} loading={busy === 'complete'} disabled={disabled}>Выполнить активность</Button>
            <Button variant="ghost" onClick={onSkip} loading={busy === 'skip'} disabled={disabled}>Пропустить</Button>
            <Button variant="danger" onClick={onDecline} loading={busy === 'decline'} disabled={disabled}>Отказаться</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
