import { Link } from 'react-router-dom'
import type { HrStats } from '../../types'
import { Badge, Card, CardTitle, EmptyState } from '../ui'

export function UncoveredTable({ rows }: { rows: HrStats['uncovered'] }) {
  return (
    <Card>
      <CardTitle hint="нужна новая активность в каталоге">Сотрудники без релевантной рекомендации</CardTitle>
      {rows.length === 0 ? (
        <EmptyState title="Все сотрудники покрыты рекомендациями" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link to={`/employee/${r.id}`} className="font-medium text-slate-800 hover:text-brand-600">{r.name}</Link>
                <p className="text-sm text-slate-500">{r.reason}</p>
              </div>
              <div className="flex flex-wrap gap-1.5"><Badge>{r.department}</Badge><Badge>{r.role}</Badge><Badge tone="brand">{r.grade}</Badge></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
