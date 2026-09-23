import { Link, useParams } from 'react-router-dom'
import { useHistory, useProfile } from '../hooks/queries'
import { statusLabel, statusTone } from '../components/labels'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui'

const dotColor = {
  invited: 'bg-[#64748b]',
  enrolled: 'bg-[#5856d6]',
  completed: 'bg-[#00815f]',
  skipped: 'bg-[#a1a1a6]',
  declined: 'bg-[#ff375f]',
}

function formatHistoryDate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function HistoryPage() {
  const { id = '' } = useParams()
  const profile = useProfile(id)
  const history = useHistory(id)

  return (
    <div className="space-y-6">
      <Link to={`/employee/${id}`} className="inline-flex rounded-full bg-white/60 px-4 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-black/5 backdrop-blur transition hover:bg-white hover:text-slate-900">← Профиль</Link>
      <PageHeader eyebrow="История активностей" title={profile.data?.name ?? "…"} subtitle="Приглашения, записи, завершения, пропуски и отказы сотрудника." />

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
                  {formatHistoryDate(h.date)}
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
