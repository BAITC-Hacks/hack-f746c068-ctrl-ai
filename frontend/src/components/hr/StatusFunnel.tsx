import type { ActivityStatus } from '../../types'
import { statusLabel } from '../labels'
import { Card, CardTitle } from '../ui'

const colors: Record<ActivityStatus, string> = { completed: 'bg-[#34c759]', skipped: 'bg-[#ff9f0a]', declined: 'bg-[#ff375f]' }

export function StatusFunnel({ counts }: { counts: Record<ActivityStatus, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  const keys: ActivityStatus[] = ['completed', 'skipped', 'declined']
  return (
    <Card>
      <CardTitle hint={`всего ${total}`}>Статусы активностей</CardTitle>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {keys.map((k) => <div key={k} className={colors[k]} style={{ width: `${(counts[k] / total) * 100}%` }} />)}
      </div>
      <div className="mt-4 space-y-2">
        {keys.map((k) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600"><i className={`h-2.5 w-2.5 rounded-full ${colors[k]}`} />{statusLabel[k]}</span>
            <span className="tabular-nums text-slate-800"><b>{counts[k]}</b> <span className="text-slate-400">· {Math.round((counts[k] / total) * 100)}%</span></span>
          </div>
        ))}
      </div>
    </Card>
  )
}
