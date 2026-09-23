import type { ProgressResult } from '../../types'
import { MAX_LEVEL } from '../labels'
import { Button, Modal, ProgressBar, cn } from '../ui'

function LevelDots({ level, highlightFrom }: { level: number; highlightFrom?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: MAX_LEVEL }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 w-7 rounded-full',
            i < level ? (highlightFrom !== undefined && i >= highlightFrom ? 'bg-gradient-to-r from-[#ffc629] to-[#f1a400]' : 'bg-gradient-to-r from-[#1fae7a] to-[#00815f]') : 'bg-black/[0.05]',
          )}
        />
      ))}
    </div>
  )
}

export function CompleteModal({ result, onClose }: { result: ProgressResult | null; onClose: () => void }) {
  const r = result
  return (
    <Modal open={!!r} onClose={onClose}>
      {r && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-600">✓</div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Активность выполнена</h2>
              <p className="text-sm text-slate-500">Навыки и рекомендации пересчитаны</p>
            </div>
          </div>

          <div className="mt-5 tile p-4">
            <p className="text-sm font-medium text-slate-700">{r.skill}</p>
            <div className="mt-3 grid grid-cols-[3rem_1fr] items-center gap-y-2 text-sm">
              <span className="text-slate-500">было</span>
              <LevelDots level={r.before} />
              <span className="text-slate-500">стало</span>
              <LevelDots level={r.after} highlightFrom={r.before} />
            </div>
            <p className="mt-3 rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-600">
              new_skill = min({r.before} + {r.gain}, {r.maxLevel}) = <b className="text-emerald-600">{r.after}</b>
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-slate-600">Готовность к следующему грейду</span>
              <span className="font-semibold">
                {r.readinessBefore}% → <span className="text-emerald-600">{r.readinessAfter}%</span>
              </span>
            </div>
            <ProgressBar value={r.readinessAfter} tone="green" className="h-2.5" />
          </div>

          {r.gradeUnlocked && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              🎉 Все требования следующего грейда закрыты — можно выходить на ревью.
            </p>
          )}

          {r.newRecommendations[0] && (
            <p className="mt-4 text-sm text-slate-600">
              Следующая рекомендация: <b className="text-slate-800">{r.newRecommendations[0].title}</b>
            </p>
          )}

          <Button className="mt-5 w-full" onClick={onClose}>Смотреть обновлённый профиль</Button>
        </>
      )}
    </Modal>
  )
}
