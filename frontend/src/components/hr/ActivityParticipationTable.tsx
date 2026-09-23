import type { ActivityStatus, HrStats } from '../../types'
import { statusLabel, statusTone } from '../labels'
import { Badge, Card, CardTitle, EmptyState } from '../ui'

const STATUSES: ActivityStatus[] = ['invited', 'enrolled', 'completed', 'skipped', 'declined']

export function ActivityParticipationTable({ rows }: { rows: HrStats['activities'] }) {
  const sorted = [...rows].sort((a, b) => b.totalRecords - a.totalRecords || a.title.localeCompare(b.title, 'ru'))
  return (
    <Card>
      <CardTitle hint="записи участия и уникальные сотрудники">Участие по активностям</CardTitle>
      {sorted.length === 0 ? <EmptyState title="Активностей пока нет" /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="pb-2 pr-4 font-medium">Активность</th>
                <th className="pb-2 pr-4 text-right font-medium">Записей</th>
                <th className="pb-2 pr-4 text-right font-medium">Сотрудников</th>
                <th className="pb-2 font-medium">Статусы</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((activity) => (
                <tr key={activity.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-800">{activity.title}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-700">{activity.totalRecords}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-700">{activity.uniqueEmployees}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.filter((status) => activity.statusCounts[status] > 0).map((status) => (
                        <Badge key={status} tone={statusTone[status]}>
                          {statusLabel[status]}: {activity.statusCounts[status]}
                        </Badge>
                      ))}
                      {activity.totalRecords === 0 && <span className="text-xs text-slate-400">нет участия</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
