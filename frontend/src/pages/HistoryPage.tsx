import { Link, useParams } from 'react-router-dom'
import { useHistory, useProfile } from '../hooks/queries'
import { statusLabel, statusTone } from '../components/labels'
import { Badge, Card, EmptyState, ErrorState, Skeleton } from '../components/ui'

const dotColor = { completed: 'bg-emerald-500', skipped: 'bg-amber-400', declined: 'bg-rose-500' }

export function HistoryPage() {
  const { id = '' } = useParams()
  const profile = useProfile(id)
  const history = useHistory(id)

  return (
    <div className="space-y-6">
      <Link to={`/employee/${id}`} className="text-sm text-slate-500 hover:text-slate-800">← Профиль</Link>
      <h1 className="text-2xl font-semibold text-slate-900">История активностей{profile.data && `: ${profile.data.name}`}</h1>

      {history.error && <ErrorState error={history.error} onRetry={history.refetch} />}
      {history.isLoading && <Skeleton className="h-64" />}
      {history.data?.length === 0 && <EmptyState title="Пока нет активностей" />}

      {!!history.data?.length && (
        <Card>
          <ol className="relative ml-2 border-l border-slate-200">
            {history.data.map((h, i) => (
              <li key={`${h.activityId}-${i}`} className="mb-6 ml-5 last:mb-0">
                <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${dotColor[h.status]}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-800">{h.title}</p>
                  <Badge tone={statusTone[h.status]}>{statusLabel[h.status]}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {new Date(h.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}{h.skill}
                  {h.delta && <> · уровень {h.delta.before} → <b className="text-emerald-600">{h.delta.after}</b></>}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  )
}
