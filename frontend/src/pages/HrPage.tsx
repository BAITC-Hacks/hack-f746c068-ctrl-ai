import { useHrStats } from '../hooks/queries'
import { Card, ErrorState, Skeleton } from '../components/ui'
import { TopGapsChart } from '../components/hr/TopGapsChart'
import { StatusFunnel } from '../components/hr/StatusFunnel'
import { GapHeatmap } from '../components/hr/GapHeatmap'
import { UncoveredTable } from '../components/hr/UncoveredTable'

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}

export function HrPage() {
  const { data, isLoading, error, refetch } = useHrStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">HR-аналитика</h1>
        <p className="mt-1 text-sm text-slate-500">Агрегированная картина по разрывам и вовлечённости</p>
      </div>

      {error && <ErrorState error={error} onRetry={refetch} />}
      {isLoading && <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Сотрудников" value={data.totalEmployees} />
            <Kpi label="Средняя готовность" value={`${data.avgReadiness}%`} hint="к следующему грейду" />
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
          <UncoveredTable rows={data.uncovered} />
        </>
      )}
    </div>
  )
}
