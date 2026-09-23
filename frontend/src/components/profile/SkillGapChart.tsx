import type { SkillLevel } from '../../types'
import { MAX_LEVEL } from '../labels'
import { Card, CardTitle, cn } from '../ui'

// Для каждого навыка: 5 сегментов. Заполнено — текущий уровень, штриховка — разрыв до требуемого.
export function SkillGapChart({ skills, nextGrade, highlight }: { skills: SkillLevel[]; nextGrade: string | null; highlight?: string | null }) {
  const sorted = [...skills].sort((a, b) => (b.required - b.current) - (a.required - a.current))
  return (
    <Card>
      <CardTitle hint={nextGrade ? `требования для ${nextGrade}` : undefined}>Навыки</CardTitle>
      <div className="space-y-3">
        {sorted.map((s) => {
          const gap = Math.max(s.required - s.current, 0)
          return (
            <div key={s.skill} className={cn('grid grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-3 rounded-lg px-1 py-0.5 transition-colors duration-700', highlight === s.skill && 'bg-emerald-500/10')}>
              <span className="truncate text-sm text-slate-700" title={s.skill}>{s.skill}</span>
              <div className="flex gap-1">
                {Array.from({ length: MAX_LEVEL }, (_, i) => {
                  const lvl = i + 1
                  const filled = lvl <= s.current
                  const missing = !filled && lvl <= s.required
                  return (
                    <div
                      key={i}
                      className={cn(
                        'h-3 flex-1 rounded-full transition-colors duration-700',
                        filled && (highlight === s.skill && lvl === s.current ? 'bg-gradient-to-r from-[#30d158] to-[#34c759]' : 'bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6]'),
                        missing && 'border border-dashed border-amber-400 bg-amber-100',
                        !filled && !missing && 'bg-black/[0.05]',
                      )}
                    />
                  )
                })}
              </div>
              <span className={cn('text-right text-sm tabular-nums', gap ? 'font-medium text-amber-700' : 'text-slate-500')}>
                {s.current}/{s.required || '—'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-full bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6]" /> текущий уровень</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-full border border-dashed border-amber-400 bg-amber-100" /> разрыв до требования</span>
      </div>
    </Card>
  )
}
