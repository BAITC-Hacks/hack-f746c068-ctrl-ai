import type { ScoreFactor } from '../../types'

// Прозрачный скоринг: score = Σ weight × value. Показываем вклад каждого фактора.
export function ScoreBreakdown({
  factors,
  score,
  gradeGapBenefit,
  historyMultiplier,
}: {
  factors: ScoreFactor[]
  score: number
  gradeGapBenefit?: number
  historyMultiplier?: number
}) {
  const hasBackendFormula = gradeGapBenefit !== undefined && historyMultiplier !== undefined
  const sorted = [...factors].sort((a, b) => b.weight * b.value - a.weight * a.value)

  if (hasBackendFormula) {
    return (
      <div className="tile p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Формула backend</p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Сокращение разрыва</p>
            <p className="font-semibold tabular-nums text-slate-800">{gradeGapBenefit.toFixed(3)}</p>
          </div>
          <span className="hidden text-slate-400 sm:block">×</span>
          <div className="rounded-lg bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Коэффициент истории</p>
            <p className="font-semibold tabular-nums text-slate-800">{historyMultiplier.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm">
          <span className="font-medium text-slate-700">Итоговый score</span>
          <span className="font-semibold tabular-nums text-slate-900">{score.toFixed(3)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="tile p-4">
      <div className="mb-3 flex items-baseline justify-between text-xs text-slate-500">
        <span>Фактор</span>
        <span>вес × значение = вклад</span>
      </div>
      <div className="space-y-2.5">
        {sorted.map((f) => {
          const contrib = f.weight * f.value
          return (
            <div key={f.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-slate-700">{f.name}</span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {f.weight.toFixed(2)} × {f.value.toFixed(2)} = <b className="text-slate-800">{contrib.toFixed(2)}</b>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                {/* ширина = значение фактора 0..1 */}
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${f.value * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm">
        <span className="font-medium text-slate-700">Итоговый score</span>
        <span className="font-semibold tabular-nums text-slate-900">{score.toFixed(2)}</span>
      </div>
    </div>
  )
}
