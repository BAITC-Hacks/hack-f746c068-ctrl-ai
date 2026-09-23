import { useHrStats } from '../hooks/queries'
import { Card, ErrorState, PageHeader, Skeleton } from '../components/ui'
import { TopGapsChart } from '../components/hr/TopGapsChart'
import { StatusFunnel } from '../components/hr/StatusFunnel'
import { GapHeatmap } from '../components/hr/GapHeatmap'
import { UncoveredTable } from '../components/hr/UncoveredTable'
import { ActivityParticipationTable } from '../components/hr/ActivityParticipationTable'

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}

export function HrPage() {
  const { data, isLoading, error, refetch } = useHrStats()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HR-аналитика"
        title={<>Вся команда. <span className="text-gradient">Одним взглядом.</span></>}
        subtitle="Где у команды разрывы в навыках, кто вовлечён в развитие и кому не хватает подходящих активностей."
      />

      {error && <ErrorState error={error} onRetry={refetch} />}
      {isLoading && <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Сотрудников" value={data.totalEmployees} />
            <Kpi label="Средняя готовность" value={data.avgReadiness === null ? '—' : `${data.avgReadiness}%`} hint="к следующему грейду" />
            <Kpi
              label="Completion rate"
              value={`${Math.round((data.statusCounts.completed / Math.max(1, data.statusCounts.completed + data.statusCounts.skipped + data.statusCounts.declined)) * 100)}%`}
              hint="доля выполненных активностей"
            />
            <Kpi label="Без рекомендаций" value={data.uncovered.length} hint="сотрудников" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <TopGapsChart data={data.topGaps} />
            <StatusFunnel counts={data.statusCounts} />
          </div>
          <GapHeatmap data={data.gapsByRole} />
          <ActivityParticipationTable rows={data.activities} />
          <UncoveredTable rows={data.uncovered} />
        </>
      )}
    </div>
  )
}
