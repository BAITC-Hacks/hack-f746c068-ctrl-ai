import { Link } from 'react-router-dom'
import type { Profile } from '../../types'
import { formatTenure } from '../labels'
import { Avatar, Badge, Card, ProgressBar } from '../ui'

export function ProfileHeader({ profile }: { profile: Profile }) {
  const p = profile
  return (
    <Card className="flex flex-col gap-5 md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <Avatar name={p.name} size="lg" />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{p.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{p.department} · {p.role}</span>
            <Badge tone="brand">{p.grade}</Badge>
            <span className="text-slate-400">·</span>
            <span>стаж {formatTenure(p.tenureMonths)}</span>
            <span className="text-slate-400">·</span>
            <Link to={`/employee/${p.id}/history`} className="text-brand-600 hover:underline">
              выполнено активностей: {p.completedCount}
            </Link>
          </div>
        </div>
      </div>
      <div className="md:ml-auto md:w-72">
        {p.nextGrade ? (
          <>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="text-slate-600">Готовность к <b className="text-slate-900">{p.nextGrade}</b></span>
              <span className="text-lg font-semibold text-slate-900">{p.readiness}%</span>
            </div>
            <ProgressBar value={p.readiness} tone={p.readiness >= 100 ? 'green' : 'brand'} className="h-2.5" />
            <p className="mt-1.5 text-xs text-slate-500">
              {p.gaps.length ? `Осталось закрыть разрывов: ${p.gaps.length}` : 'Все требования выполнены'}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">Максимальный грейд в карьерном треке</p>
        )}
      </div>
    </Card>
  )
}
