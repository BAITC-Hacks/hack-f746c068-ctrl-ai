import type { Gap } from '../../types'
import { Badge, Card, CardTitle, EmptyState } from '../ui'

export function GapList({ gaps }: { gaps: Gap[] }) {
  return (
    <Card>
      <CardTitle hint="по величине">Skill gaps</CardTitle>
      {gaps.length === 0 ? (
        <EmptyState title="Разрывов нет" text="Сотрудник соответствует требованиям следующего грейда" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {gaps.map((g) => (
            <li key={g.skill} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{g.skill}</p>
                <p className="text-xs text-slate-500">сейчас {g.current} → нужно {g.required}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {g.critical && <Badge tone="rose">критичный</Badge>}
                <span className="w-8 text-right text-sm font-semibold text-amber-700">−{g.gap}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
